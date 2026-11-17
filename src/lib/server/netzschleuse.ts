import { randomBytes, timingSafeEqual } from "node:crypto";
import http from "node:http";
import net from "node:net";
import type { Duplex } from "node:stream";
import { isIpLiteral, privateAddress, privateName } from "../netzregeln";
import { systemLookup, type Lookup } from "./netz";

// Die Netzschleuse: ein kleiner Zwischenrechner (Proxy) nur auf diesem Mac, über den das Chrome des
// Browser-Agenten jede Verbindung aufbaut. Chrome löst dadurch keinen Namen mehr selbst auf. Die Schleuse
// löst auf, prüft jede Adresse nach den gemeinsamen Netzregeln und verbindet genau zu der geprüften
// Adresse. Damit ist die letzte Lücke aus R-04 geschlossen: Ein Angreifer kann zwischen Prüfung und
// Verbindung nicht mehr auf eine Adresse im Heimnetz umschalten (DNS-Rebinding), und auch WebSockets,
// Weiterleitungen und Unterseiten kommen an der Prüfung nicht vorbei.
// Die Schleuse verlangt ein Kennwort, das bei jedem Start neu gewürfelt wird und das nur Chrome bekommt.
// Andere Programme auf dem Mac können sie deshalb nicht als Durchgang benutzen.

// intern: Das Ziel liegt im Heimnetz oder auf diesem Rechner (ein Sicherheitsereignis). Sonst war nur der Name
// nicht auflösbar oder das Ziel ungültig.
export type SchleusenSperre = { host: string; port: number; grund: string; intern: boolean };

class ZielSperre extends Error {
  constructor(
    grund: string,
    readonly intern: boolean,
  ) {
    super(grund);
  }
}

export type SchleusenOptionen = {
  lookup?: Lookup;
  // Nur für Tests: einzelne lokale Ziele (Host mit Port, z. B. "127.0.0.1:4050").
  erlaubt?: string[];
  // Nur für Tests: wie verbunden wird. So lässt sich prüfen, zu welcher Adresse die Schleuse verbindet.
  verbinde?: (port: number, adresse: string) => net.Socket;
  // Nur für Tests: kürzere Wartezeiten in Millisekunden (verbinden insgesamt, höchstens je Versuch).
  zeiten?: { verbinden?: number; versuch?: number };
  gesperrt?: (sperre: SchleusenSperre) => void;
};

export type Schleuse = {
  server: string;
  port: number;
  username: string;
  password: string;
  sperren: () => number;
  stop: () => Promise<void>;
};

// So lange darf der Verbindungsaufbau insgesamt dauern, über alle Adressen eines Namens. Dieselbe Zeit gilt
// beim unverschlüsselten Abruf als Grenze für Funkstille auf der Leitung.
const VERBINDEN_MS = 15_000;
// Hat ein Name mehrere Adressen, wartet die Schleuse auf jede außer der letzten höchstens so lange.
const VERSUCH_MS = 5_000;
const MAX_ADRESSEN = 4;
// So lange merkt sich die Schleuse je Ziel, welche Adresse zuletzt geantwortet hat.
const MERKEN_MS = 60_000;
const MERKEN_MAX = 200;
// Kopfzeilen, die nur zwischen Chrome und der Schleuse gelten und nicht weitergereicht werden.
const NUR_BIS_HIER = /^(proxy-authorization|proxy-connection|proxy-authenticate)$/i;

const gleich = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// Schreibweise für die Erlaubt-Liste: wie URL.host, also ohne Port bei 80 und mit eckigen Klammern bei IPv6.
const zielName = (host: string, port: number) => `${host.includes(":") ? `[${host}]` : host}:${port}`;

// Prüft ein Ziel und gibt die Adressen zurück, zu denen verbunden werden darf, in der Reihenfolge der
// Auflösung. Alle stammen aus derselben einen Auflösung und sind alle geprüft. Wirft mit dem Grund, wenn nicht.
export async function pruefeZiele(hostRoh: string, port: number, { lookup = systemLookup, erlaubt = [] }: Pick<SchleusenOptionen, "lookup" | "erlaubt"> = {}): Promise<string[]> {
  const host = hostRoh.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new ZielSperre("ungültiges Ziel", false);
  const klammer = host.includes(":") ? `[${host}]` : host;
  if (erlaubt.includes(zielName(host, port)) || ((port === 80 || port === 443) && erlaubt.includes(klammer))) return [host];
  if (privateName(host)) throw new ZielSperre("Ziel im Heimnetz", true);
  if (isIpLiteral(host)) return [host];
  let adressen;
  try {
    adressen = await lookup(host);
  } catch {
    throw new ZielSperre("Name nicht auflösbar", false);
  }
  // Schon eine einzige interne Adresse sperrt den Namen: So nützt es nichts, eine öffentliche davorzustellen.
  if (!adressen.length) throw new ZielSperre("Name nicht auflösbar", false);
  if (adressen.some((a) => privateAddress(a.address))) throw new ZielSperre("Name zeigt ins Heimnetz", true);
  // Die Auflösung liefert oft erst viele IPv6- und dann die IPv4-Adressen. Damit unter den wenigen Versuchen
  // beide Arten bleiben, wechseln sie sich ab; innerhalb einer Art bleibt die Reihenfolge der Auflösung.
  const alle = [...new Set(adressen.map((a) => a.address))];
  const erste = alle[0].includes(":");
  const a = alle.filter((x) => x.includes(":") === erste);
  const b = alle.filter((x) => x.includes(":") !== erste);
  const gemischt: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) gemischt.push(a[i]);
    if (i < b.length) gemischt.push(b[i]);
  }
  return gemischt.slice(0, MAX_ADRESSEN);
}

// Verbindet zur ersten Adresse, die antwortet. Versucht wird nacheinander und nur zu den geprüften Adressen;
// aufgelöst wird dabei nichts mehr. Alle Versuche zusammen dauern höchstens gesamtMs: Jede Adresse außer der
// letzten bekommt ihren Anteil daran (höchstens versuchMs), die letzte den ganzen Rest. abbrechen() beendet den
// laufenden Versuch oder die stehende Verbindung und nimmt keine weitere Adresse.
function verbindeNacheinander(
  port: number,
  adressen: string[],
  verbinde: (port: number, adresse: string) => net.Socket,
  merke: (s: Duplex) => void,
  gesamtMs: number,
  versuchMs: number,
): { fertig: Promise<{ ziel: net.Socket; adresse: string }>; abbrechen: () => void } {
  let laufend: net.Socket | null = null;
  let abgebrochen = false;
  const ende = Date.now() + gesamtMs;
  const fertig = (async () => {
    for (let i = 0; i < adressen.length; i++) {
      const rest = ende - Date.now();
      if (abgebrochen || rest <= 0) break;
      const uebrig = adressen.length - i;
      const warten = uebrig === 1 ? rest : Math.min(versuchMs, rest / uebrig);
      const ziel = verbinde(port, adressen[i]);
      laufend = ziel;
      merke(ziel);
      const ok = await new Promise<boolean>((resolve) => {
        const zuSpaet = setTimeout(() => resolve(false), warten);
        const fertigMit = (wert: boolean) => {
          clearTimeout(zuSpaet);
          resolve(wert);
        };
        ziel.once("connect", () => fertigMit(true));
        ziel.once("error", () => fertigMit(false));
        ziel.once("close", () => fertigMit(false));
      });
      if (ok && !abgebrochen) return { ziel, adresse: adressen[i] };
      ziel.destroy();
    }
    throw new Error(abgebrochen ? "abgebrochen" : "keine Adresse erreichbar");
  })();
  return {
    fertig,
    abbrechen: () => {
      abgebrochen = true;
      laufend?.destroy();
    },
  };
}

const absage = (socket: Duplex, status: number, text: string, extra = "") => {
  if (socket.destroyed) return;
  socket.end(`HTTP/1.1 ${status} ${text}\r\n${extra}Connection: close\r\nContent-Length: 0\r\n\r\n`);
};

export async function starteSchleuse(opts: SchleusenOptionen = {}): Promise<Schleuse> {
  const username = "jarvis";
  const password = randomBytes(24).toString("base64url");
  const erwartet = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  const verbinde = opts.verbinde ?? ((port, adresse) => net.connect({ port, host: adresse }));
  const offen = new Set<Duplex>();
  let sperren = 0;
  const gesamtMs = opts.zeiten?.verbinden ?? VERBINDEN_MS;
  const versuchMs = opts.zeiten?.versuch ?? VERSUCH_MS;
  // Welche Adresse eines Ziels zuletzt geantwortet hat. Das ändert nur die Reihenfolge der Versuche: Verbunden
  // wird weiter ausschließlich zu Adressen, die die jetzige Auflösung liefert und die jetzt geprüft sind.
  const zuletztGut = new Map<string, { adresse: string; bis: number }>();
  const sortiere = (ziel: string, adressen: string[]) => {
    const g = zuletztGut.get(ziel);
    if (!g || g.bis < Date.now() || !adressen.includes(g.adresse)) return adressen;
    return [g.adresse, ...adressen.filter((a) => a !== g.adresse)];
  };
  const merkeGut = (ziel: string, adresse: string) => {
    zuletztGut.delete(ziel);
    if (zuletztGut.size >= MERKEN_MAX) zuletztGut.delete(zuletztGut.keys().next().value as string);
    zuletztGut.set(ziel, { adresse, bis: Date.now() + MERKEN_MS });
  };

  const darf = (kopf: http.IncomingHttpHeaders) => gleich(String(kopf["proxy-authorization"] ?? ""), erwartet);
  const melde = (host: string, port: number, e: Error) => {
    sperren += 1;
    try {
      opts.gesperrt?.({ host, port, grund: e.message, intern: e instanceof ZielSperre && e.intern });
    } catch {
      // Eine Meldung darf die Schleuse nie aufhalten.
    }
  };
  const merke = (s: Duplex) => {
    offen.add(s);
    s.on("close", () => offen.delete(s));
  };

  const server = http.createServer();

  // https und WebSockets: Chrome bittet um einen Tunnel („CONNECT host:port“).
  server.on("connect", (req, client: Duplex, head: Buffer) => {
    merke(client);
    client.on("error", () => client.destroy());
    if (!darf(req.headers)) return absage(client, 407, "Proxy Authentication Required", 'Proxy-Authenticate: Basic realm="JARVIS"\r\n');
    const m = /^(\[[0-9a-fA-F:.]+\]|[^:]+):(\d{1,5})$/.exec(req.url ?? "");
    if (!m) return absage(client, 400, "Bad Request");
    const host = m[1];
    const port = Number(m[2]);
    pruefeZiele(host, port, opts).then(
      (adressen) => {
        if (client.destroyed) return;
        const name = zielName(host.replace(/^\[|\]$/g, "").toLowerCase(), port);
        const versuch = verbindeNacheinander(port, sortiere(name, adressen), verbinde, merke, gesamtMs, versuchMs);
        // Geht Chrome, endet auch der laufende Versuch oder die stehende Verbindung zum Ziel.
        client.on("close", versuch.abbrechen);
        versuch.fertig.then(
          ({ ziel, adresse }) => {
            if (client.destroyed) return ziel.destroy();
            merkeGut(name, adresse);
            ziel.on("error", () => ziel.destroy());
            client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
            if (head.length) ziel.write(head);
            ziel.pipe(client);
            client.pipe(ziel);
            ziel.on("close", () => client.destroy());
          },
          () => absage(client, 502, "Bad Gateway"),
        );
      },
      (e: Error) => {
        melde(host, port, e);
        absage(client, 403, "Forbidden");
      },
    );
  });

  // Unverschlüsselte Seiten: Chrome schickt die ganze Adresse („GET http://host/pfad“).
  server.on("request", (req, res) => {
    const nein = (status: number, extra: http.OutgoingHttpHeaders = {}) => {
      res.writeHead(status, { ...extra, connection: "close", "content-length": 0 });
      res.end();
    };
    if (!darf(req.headers)) return nein(407, { "proxy-authenticate": 'Basic realm="JARVIS"' });
    let url: URL;
    try {
      url = new URL(req.url ?? "");
    } catch {
      return nein(400);
    }
    if (url.protocol !== "http:" || url.username || url.password) return nein(400);
    const port = Number(url.port || 80);
    pruefeZiele(url.hostname, port, opts).then(
      (adressen) => {
        const name = zielName(url.hostname.replace(/^\[|\]$/g, "").toLowerCase(), port);
        const versuch = verbindeNacheinander(port, sortiere(name, adressen), verbinde, merke, gesamtMs, versuchMs);
        // Geht Chrome, endet auch der laufende Versuch oder die stehende Verbindung zum Ziel und damit der Abruf.
        res.on("close", versuch.abbrechen);
        versuch.fertig.then(
          ({ ziel, adresse }) => {
            if (res.destroyed) return ziel.destroy();
            merkeGut(name, adresse);
            // Funkstille: Kommt so lange nichts vom Ziel, endet der Abruf, statt zu hängen, bis Chrome aufgibt.
            ziel.setTimeout(gesamtMs, () => ziel.destroy());
            const headers: http.OutgoingHttpHeaders = {};
            for (const [k, v] of Object.entries(req.headers)) if (v !== undefined && !NUR_BIS_HIER.test(k)) headers[k] = v;
            headers.host = url.host;
            const weiter = http.request(
              // Ohne Agent: Node nimmt genau diese eine, schon stehende Verbindung und verwendet nie eine für ein anderes Ziel wieder.
              { method: req.method, path: `${url.pathname}${url.search}`, headers, createConnection: () => ziel },
              (antwort) => {
                res.writeHead(antwort.statusCode ?? 502, antwort.headers);
                antwort.pipe(res);
              },
            );
            weiter.on("error", () => {
              if (!res.headersSent) nein(502);
              else res.destroy();
            });
            req.pipe(weiter);
          },
          () => nein(502),
        );
      },
      (e: Error) => {
        melde(url.hostname, port, e);
        nein(403);
      },
    );
  });
  server.on("connection", merke);
  server.on("clientError", (_e, socket) => socket.destroy());

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    // Nur auf diesem Rechner erreichbar, der Port wird frei gewählt.
    server.listen(0, "127.0.0.1", () => resolve());
  });
  server.unref();
  const port = (server.address() as net.AddressInfo).port;

  return {
    server: `http://127.0.0.1:${port}`,
    port,
    username,
    password,
    sperren: () => sperren,
    stop: () =>
      new Promise<void>((resolve) => {
        for (const s of offen) s.destroy();
        server.close(() => resolve());
      }),
  };
}
