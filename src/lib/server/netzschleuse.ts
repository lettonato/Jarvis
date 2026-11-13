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

const VERBINDEN_MS = 15_000;
// Kopfzeilen, die nur zwischen Chrome und der Schleuse gelten und nicht weitergereicht werden.
const NUR_BIS_HIER = /^(proxy-authorization|proxy-connection|proxy-authenticate)$/i;

const gleich = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

// Schreibweise für die Erlaubt-Liste: wie URL.host, also ohne Port bei 80 und mit eckigen Klammern bei IPv6.
const zielName = (host: string, port: number) => `${host.includes(":") ? `[${host}]` : host}:${port}`;

// Prüft ein Ziel und gibt die Adresse zurück, zu der verbunden werden darf. Wirft mit dem Grund, wenn nicht.
export async function pruefeZiel(hostRoh: string, port: number, { lookup = systemLookup, erlaubt = [] }: Pick<SchleusenOptionen, "lookup" | "erlaubt"> = {}): Promise<string> {
  const host = hostRoh.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new ZielSperre("ungültiges Ziel", false);
  const klammer = host.includes(":") ? `[${host}]` : host;
  if (erlaubt.includes(zielName(host, port)) || ((port === 80 || port === 443) && erlaubt.includes(klammer))) return host;
  if (privateName(host)) throw new ZielSperre("Ziel im Heimnetz", true);
  if (isIpLiteral(host)) return host;
  let adressen;
  try {
    adressen = await lookup(host);
  } catch {
    throw new ZielSperre("Name nicht auflösbar", false);
  }
  // Schon eine einzige interne Adresse sperrt den Namen: So nützt es nichts, eine öffentliche davorzustellen.
  if (!adressen.length) throw new ZielSperre("Name nicht auflösbar", false);
  if (adressen.some((a) => privateAddress(a.address))) throw new ZielSperre("Name zeigt ins Heimnetz", true);
  return adressen[0].address;
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
    pruefeZiel(host, port, opts).then(
      (adresse) => {
        if (client.destroyed) return;
        const ziel = verbinde(port, adresse);
        merke(ziel);
        ziel.setTimeout(VERBINDEN_MS, () => ziel.destroy());
        ziel.on("error", () => {
          absage(client, 502, "Bad Gateway");
          ziel.destroy();
        });
        ziel.on("connect", () => {
          ziel.setTimeout(0);
          client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          if (head.length) ziel.write(head);
          ziel.pipe(client);
          client.pipe(ziel);
        });
        client.on("close", () => ziel.destroy());
        ziel.on("close", () => client.destroy());
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
    pruefeZiel(url.hostname, port, opts).then(
      (adresse) => {
        const headers: http.OutgoingHttpHeaders = {};
        for (const [k, v] of Object.entries(req.headers)) if (v !== undefined && !NUR_BIS_HIER.test(k)) headers[k] = v;
        headers.host = url.host;
        const weiter = http.request(
          // Ohne Agent: Node nimmt dann genau diese eine Verbindung und verwendet nie eine für ein anderes Ziel wieder.
          { method: req.method, path: `${url.pathname}${url.search}`, headers, timeout: VERBINDEN_MS, createConnection: () => verbinde(port, adresse) },
          (antwort) => {
            res.writeHead(antwort.statusCode ?? 502, antwort.headers);
            antwort.pipe(res);
          },
        );
        weiter.on("timeout", () => weiter.destroy());
        weiter.on("error", () => {
          if (!res.headersSent) nein(502);
          else res.destroy();
        });
        req.pipe(weiter);
        res.on("close", () => weiter.destroy());
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
