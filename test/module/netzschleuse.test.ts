// Die Netzschleuse (Rest von R-04): Chrome verbindet nur über sie. Geprüft wird, dass sie ohne Kennwort
// niemanden durchlässt, kein internes Ziel erreicht (auch nicht über Namen, gemischte Antworten oder
// IPv6-Schreibweisen), genau zur geprüften Adresse verbindet (DNS-Rebinding) und sonst sauber durchreicht.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { after, before, describe, test } from "node:test";
import { pruefeZiel, starteSchleuse, type Schleuse, type SchleusenSperre } from "../../src/lib/server/netzschleuse";

const OEFFENTLICH = "93.184.216.34";
let ziel: http.Server;
let zielPort = 0;
let schleuse: Schleuse;
const verbunden: { port: number; adresse: string }[] = [];
const sperren: SchleusenSperre[] = [];
const auflösungen: string[] = [];
let wechsel = 0;

const lookup = async (host: string) => {
  auflösungen.push(host);
  if (host === "gut.example") return [{ address: OEFFENTLICH, family: 4 }];
  if (host === "intern.example") return [{ address: "192.168.178.1", family: 4 }];
  if (host === "gemischt.example") return [{ address: OEFFENTLICH, family: 4 }, { address: "10.0.0.5", family: 4 }];
  if (host === "metadaten.example") return [{ address: "169.254.169.254", family: 4 }];
  if (host === "v6.example") return [{ address: "::ffff:127.0.0.1", family: 6 }];
  // Erst öffentlich, bei jeder weiteren Frage intern: der Trick beim DNS-Rebinding.
  if (host === "wechsel.example") return [{ address: wechsel++ === 0 ? OEFFENTLICH : "127.0.0.1", family: 4 }];
  throw new Error("ENOTFOUND");
};

const auth = () => `Basic ${Buffer.from(`${schleuse.username}:${schleuse.password}`).toString("base64")}`;

// Bittet die Schleuse um einen Tunnel und gibt die erste Antwortzeile und die Verbindung zurück.
function tunnel(zielText: string, kopf: Record<string, string> = { "proxy-authorization": auth() }): Promise<{ status: number; socket: net.Socket }> {
  return new Promise((resolve, reject) => {
    const socket = net.connect(schleuse.port, "127.0.0.1");
    let roh = "";
    socket.on("error", reject);
    socket.on("connect", () => socket.write(`CONNECT ${zielText} HTTP/1.1\r\nHost: ${zielText}\r\n${Object.entries(kopf).map(([k, v]) => `${k}: ${v}\r\n`).join("")}\r\n`));
    const lies = (c: Buffer) => {
      roh += c.toString("latin1");
      if (!roh.includes("\r\n\r\n")) return;
      socket.off("data", lies);
      resolve({ status: Number(roh.split(" ")[1]), socket });
    };
    socket.on("data", lies);
  });
}

function hole(url: string, kopf: Record<string, string> = { "proxy-authorization": auth() }): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port: schleuse.port, path: url, headers: { host: new URL(url).host, ...kopf } }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

before(async () => {
  // Der „Server im Internet“: gibt zurück, welche Kopfzeilen bei ihm ankommen.
  ziel = http.createServer((req, res) => res.end(JSON.stringify({ pfad: req.url, host: req.headers.host, proxyKopf: Object.keys(req.headers).filter((k) => k.startsWith("proxy-")) })));
  await new Promise<void>((r) => ziel.listen(0, "127.0.0.1", () => r()));
  zielPort = (ziel.address() as net.AddressInfo).port;
  schleuse = await starteSchleuse({
    lookup,
    gesperrt: (s) => sperren.push(s),
    // Statt ins Internet geht jede erlaubte Verbindung an den Testserver; gemerkt wird, wohin sie hätte gehen sollen.
    verbinde: (port, adresse) => {
      verbunden.push({ port, adresse });
      return net.connect(zielPort, "127.0.0.1");
    },
  });
});

after(async () => {
  await schleuse.stop();
  await new Promise((r) => ziel.close(r));
});

describe("Netzschleuse: Zugang", () => {
  test("lauscht nur auf diesem Rechner", () => {
    assert.match(schleuse.server, /^http:\/\/127\.0\.0\.1:\d+$/);
  });

  test("ohne Kennwort kommt niemand durch (Tunnel und Abruf)", async () => {
    const vorher = verbunden.length;
    const t = await tunnel("gut.example:443", {});
    assert.equal(t.status, 407);
    t.socket.destroy();
    const falsch = await tunnel("gut.example:443", { "proxy-authorization": `Basic ${Buffer.from("jarvis:falsch").toString("base64")}` });
    assert.equal(falsch.status, 407);
    falsch.socket.destroy();
    assert.equal((await hole("http://gut.example/", {})).status, 407);
    assert.equal(verbunden.length, vorher, "keine Verbindung nach außen");
  });

  test("das Kennwort ist bei jedem Start neu", async () => {
    const zweite = await starteSchleuse({ lookup });
    assert.notEqual(zweite.password, schleuse.password);
    assert.ok(zweite.password.length >= 24);
    await zweite.stop();
  });
});

describe("Netzschleuse: interne Ziele bleiben gesperrt", () => {
  const INTERN = [
    "127.0.0.1:3000",
    "localhost:3000",
    "192.168.178.1:80",
    "10.0.0.5:443",
    "169.254.169.254:80",
    "168.63.129.16:80",
    "[::1]:3000",
    "[::ffff:127.0.0.1]:3000",
    "[64:ff9b::a00:5]:443",
    "fritz.box:80",
    "intern.example:443",
    "gemischt.example:443",
    "metadaten.example:80",
    "v6.example:443",
    "gibtesnicht.example:443",
  ];
  for (const z of INTERN) {
    test(`Tunnel zu ${z} wird abgelehnt`, async () => {
      const vorher = verbunden.length;
      const t = await tunnel(z);
      assert.equal(t.status, 403);
      t.socket.destroy();
      assert.equal(verbunden.length, vorher, "keine Verbindung aufgebaut");
    });
  }

  test("auch der unverschlüsselte Abruf interner Ziele wird abgelehnt", async () => {
    const vorher = verbunden.length;
    for (const url of ["http://127.0.0.1:3000/api/einstellungen", "http://intern.example/", "http://169.254.169.254/latest/meta-data/", "http://gemischt.example/"]) {
      assert.equal((await hole(url)).status, 403, url);
    }
    assert.equal(verbunden.length, vorher);
  });

  test("jede Sperre wird gemeldet, mit Ziel und Grund", () => {
    const s = sperren.find((x) => x.host === "gemischt.example");
    assert.ok(s);
    assert.match(s.grund, /Heimnetz/);
    assert.equal(s.intern, true);
    // Ein Name, den es nicht gibt, ist gesperrt, aber kein Sicherheitsereignis.
    assert.equal(sperren.find((x) => x.host === "gibtesnicht.example")?.intern, false);
    assert.ok(schleuse.sperren() >= sperren.length);
  });

  test("nur https, kein ftp oder Ähnliches über den Abruf", async () => {
    assert.equal((await hole("ftp://gut.example/")).status, 400);
  });
});

describe("Netzschleuse: verbindet genau zur geprüften Adresse", () => {
  test("DNS-Rebinding: Der Name wird einmal aufgelöst, verbunden wird zu dieser Adresse", async () => {
    wechsel = 0;
    auflösungen.length = 0;
    verbunden.length = 0;
    const t = await tunnel("wechsel.example:443");
    assert.equal(t.status, 200);
    assert.deepEqual(verbunden, [{ port: 443, adresse: OEFFENTLICH }]);
    assert.equal(auflösungen.filter((h) => h === "wechsel.example").length, 1, "nur eine Auflösung je Verbindung");
    t.socket.destroy();
    // Beim nächsten Mal zeigt der Name nach innen: gesperrt, keine Verbindung.
    const zweite = await tunnel("wechsel.example:443");
    assert.equal(zweite.status, 403);
    zweite.socket.destroy();
    assert.equal(verbunden.length, 1);
  });

  test("ein erlaubter Tunnel reicht Daten in beide Richtungen durch", async () => {
    const t = await tunnel("gut.example:443");
    assert.equal(t.status, 200);
    const antwort = await new Promise<string>((resolve) => {
      let roh = "";
      t.socket.on("data", (c) => {
        roh += c;
        if (roh.includes("}")) resolve(roh);
      });
      t.socket.write("GET /durch HTTP/1.1\r\nHost: gut.example\r\nConnection: close\r\n\r\n");
    });
    assert.match(antwort, /"pfad":"\/durch"/);
    t.socket.destroy();
  });

  test("ein erlaubter Abruf kommt an, ohne das Kennwort der Schleuse weiterzugeben", async () => {
    verbunden.length = 0;
    const r = await hole("http://gut.example/seite?x=1");
    assert.equal(r.status, 200);
    const gesehen = JSON.parse(r.body) as { pfad: string; host: string; proxyKopf: string[] };
    assert.equal(gesehen.pfad, "/seite?x=1");
    assert.equal(gesehen.host, "gut.example");
    assert.deepEqual(gesehen.proxyKopf, []);
    assert.deepEqual(verbunden, [{ port: 80, adresse: OEFFENTLICH }]);
  });
});

describe("Netzschleuse: Regeln", () => {
  test("pruefeZiel: erlaubte lokale Testziele nur mit genauem Host und Port", async () => {
    assert.equal(await pruefeZiel("127.0.0.1", 4050, { lookup, erlaubt: ["127.0.0.1:4050"] }), "127.0.0.1");
    await assert.rejects(pruefeZiel("127.0.0.1", 4051, { lookup, erlaubt: ["127.0.0.1:4050"] }));
    await assert.rejects(pruefeZiel("127.0.0.1", 4050, { lookup }));
    await assert.rejects(pruefeZiel("gut.example", 0, { lookup }));
    await assert.rejects(pruefeZiel("gut.example", 70000, { lookup }));
  });

  test("der Browser-Agent startet Chrome nur über die Schleuse und ohne eigene Namensauflösung", () => {
    const quelle = readFileSync("src/lib/server/browser.ts", "utf8");
    assert.match(quelle, /proxy: \{ server: proxy\.server, username: proxy\.username, password: proxy\.password, bypass: "<-loopback>" \}/);
    assert.match(quelle, /--host-resolver-rules=MAP \* ~NOTFOUND/);
    assert.match(quelle, /const proxy = await schleuse\(\);/);
    assert.match(quelle, /disable_non_proxied_udp/);
    // Es gibt genau einen Ort, an dem Chrome gestartet wird.
    assert.equal(quelle.match(/launchPersistentContext\(/g)?.length, 1);
  });
});
