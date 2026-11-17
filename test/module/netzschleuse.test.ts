// Die Netzschleuse (Rest von R-04): Chrome verbindet nur über sie. Geprüft wird, dass sie ohne Kennwort
// niemanden durchlässt, kein internes Ziel erreicht (auch nicht über Namen, gemischte Antworten oder
// IPv6-Schreibweisen), genau zur geprüften Adresse verbindet (DNS-Rebinding) und sonst sauber durchreicht.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { after, before, describe, test } from "node:test";
import { pruefeZiele, starteSchleuse, type Schleuse, type SchleusenSperre } from "../../src/lib/server/netzschleuse";

const OEFFENTLICH = "93.184.216.34";
// Öffentliche Adressen, hinter denen im Test nichts antwortet (die Verbindung wird sofort abgewiesen).
// Sonderfälle für den Test: eine Adresse, die nie antwortet, eine, die erst nach 300 ms verbindet, und eine,
// die verbindet, aber dann schweigt.
const LOCH = "93.184.216.60";
const LANGSAM = "93.184.216.61";
const STUMM = "93.184.216.62";
let stumm: net.Server;
let stummPort = 0;
const TOT = ["93.184.216.40", "93.184.216.41", "93.184.216.42", "93.184.216.43", "93.184.216.44", "93.184.216.45"];
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
  // Ein Name mit zwei Adressen, die erste ist gerade nicht erreichbar.
  if (host === "zwei.example") return [{ address: TOT[0], family: 4 }, { address: OEFFENTLICH, family: 4 }];
  if (host === "tot.example") return [{ address: TOT[0], family: 4 }, { address: TOT[1], family: 4 }];
  if (host === "viele.example") return TOT.map((address) => ({ address, family: 4 }));
  if (host === "langsam.example") return [{ address: LOCH, family: 4 }, { address: LANGSAM, family: 4 }];
  if (host === "stumm.example") return [{ address: STUMM, family: 4 }];
  // Viele IPv6-Adressen vor den IPv4-Adressen, wie es der Mac bei großen Anbietern liefert.
  if (host === "dual.example") return [...["2606:2800:220:1::1", "2606:2800:220:1::2", "2606:2800:220:1::3", "2606:2800:220:1::4", "2606:2800:220:1::5"].map((address) => ({ address, family: 6 })), { address: OEFFENTLICH, family: 4 }, { address: TOT[0], family: 4 }];
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
  stumm = net.createServer(() => {});
  await new Promise<void>((r) => stumm.listen(0, "127.0.0.1", () => r()));
  stummPort = (stumm.address() as net.AddressInfo).port;
  schleuse = await starteSchleuse({
    lookup,
    // Kurze Wartezeiten, damit die Tests nicht Sekunden warten: 600 ms insgesamt, höchstens 100 ms je Versuch.
    zeiten: { verbinden: 600, versuch: 100 },
    gesperrt: (s) => sperren.push(s),
    // Statt ins Internet geht jede erlaubte Verbindung an den Testserver; gemerkt wird, wohin sie hätte gehen sollen.
    verbinde: (port, adresse) => {
      verbunden.push({ port, adresse });
      if (adresse === LOCH) return new net.Socket();
      if (adresse === LANGSAM) {
        const s = new net.Socket();
        setTimeout(() => !s.destroyed && s.connect(zielPort, "127.0.0.1"), 300);
        return s;
      }
      if (adresse === STUMM) return net.connect(stummPort, "127.0.0.1");
      // Port 1 auf diesem Rechner nimmt nichts an: So sieht eine Adresse aus, die gerade nicht antwortet.
      return net.connect(TOT.includes(adresse) ? 1 : zielPort, "127.0.0.1");
    },
  });
});

after(async () => {
  await schleuse.stop();
  await new Promise((r) => ziel.close(r));
  await new Promise((r) => stumm.close(r));
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

describe("Netzschleuse: weicht auf die nächste geprüfte Adresse aus", () => {
  test("Tunnel: antwortet die erste Adresse nicht, nimmt die Schleuse die zweite, ohne neu aufzulösen", async () => {
    auflösungen.length = 0;
    verbunden.length = 0;
    const t = await tunnel("zwei.example:443");
    assert.equal(t.status, 200);
    assert.deepEqual(verbunden, [{ port: 443, adresse: TOT[0] }, { port: 443, adresse: OEFFENTLICH }]);
    assert.equal(auflösungen.filter((h) => h === "zwei.example").length, 1, "beide Adressen stammen aus derselben geprüften Auflösung");
    t.socket.destroy();
  });

  test("Abruf: dasselbe für unverschlüsselte Seiten, und die Seite kommt an", async () => {
    verbunden.length = 0;
    const r = await hole("http://zwei.example/seite");
    assert.equal(r.status, 200);
    assert.equal((JSON.parse(r.body) as { pfad: string }).pfad, "/seite");
    assert.deepEqual(verbunden, [{ port: 80, adresse: TOT[0] }, { port: 80, adresse: OEFFENTLICH }]);
  });

  test("antwortet keine Adresse, gibt es einen Fehler und keine Sperrmeldung", async () => {
    verbunden.length = 0;
    const vorher = sperren.length;
    const t = await tunnel("tot.example:443");
    assert.equal(t.status, 502);
    t.socket.destroy();
    assert.equal((await hole("http://tot.example/")).status, 502);
    assert.deepEqual(verbunden.map((v) => v.adresse), [TOT[0], TOT[1], TOT[0], TOT[1]]);
    assert.equal(sperren.length, vorher, "nicht erreichbar ist kein Sicherheitsereignis");
  });

  test("höchstens vier Adressen werden versucht", async () => {
    verbunden.length = 0;
    const t = await tunnel("viele.example:443");
    assert.equal(t.status, 502);
    t.socket.destroy();
    assert.deepEqual(verbunden.map((v) => v.adresse), TOT.slice(0, 4));
  });

  test("pruefeZiele gibt nur geprüfte Adressen zurück; schon eine interne sperrt den ganzen Namen", async () => {
    assert.deepEqual(await pruefeZiele("zwei.example", 443, { lookup }), [TOT[0], OEFFENTLICH]);
    assert.deepEqual(await pruefeZiele("viele.example", 443, { lookup }), TOT.slice(0, 4));
    assert.deepEqual(await pruefeZiele(OEFFENTLICH, 443, { lookup }), [OEFFENTLICH]);
    await assert.rejects(pruefeZiele("gemischt.example", 443, { lookup }), /Heimnetz/);
  });

  test("bei vielen IPv6-Adressen bleiben IPv4-Adressen unter den vier Versuchen (abwechselnd, in der Reihenfolge der Auflösung)", async () => {
    assert.deepEqual(await pruefeZiele("dual.example", 443, { lookup }), ["2606:2800:220:1::1", OEFFENTLICH, "2606:2800:220:1::2", TOT[0]]);
  });

  test("die Schleuse merkt sich je Ziel kurz, welche Adresse geantwortet hat, und nimmt sie beim nächsten Mal zuerst", async () => {
    verbunden.length = 0;
    const t = await tunnel("zwei.example:443");
    assert.equal(t.status, 200);
    t.socket.destroy();
    assert.deepEqual(verbunden, [{ port: 443, adresse: OEFFENTLICH }], "kein zweites Warten auf die Adresse, die nicht antwortet");
    // Gemerkt wird nur die Reihenfolge: Zeigt der Name inzwischen nach innen, bleibt er gesperrt.
    wechsel = 0;
    (await tunnel("wechsel.example:443")).socket.destroy();
    const innen = await tunnel("wechsel.example:443");
    assert.equal(innen.status, 403);
    innen.socket.destroy();
  });

  test("die letzte Adresse bekommt die restliche Wartezeit: Ein langsamer Server wird noch erreicht", async () => {
    verbunden.length = 0;
    const t = await tunnel("langsam.example:443");
    assert.equal(t.status, 200, "die erste Adresse schweigt 100 ms lang, die zweite verbindet nach 300 ms");
    assert.deepEqual(verbunden.map((v) => v.adresse), [LOCH, LANGSAM]);
    t.socket.destroy();
  });

  test("verbindet ein Server, antwortet dann aber nicht, endet der Abruf nach der Wartezeit mit einem Fehler", async () => {
    const start = Date.now();
    const r = await hole("http://stumm.example/");
    assert.equal(r.status, 502);
    assert.ok(Date.now() - start < 3_000, "hängt nicht, bis Chrome aufgibt");
  });
});

describe("Netzschleuse: Regeln", () => {
  test("pruefeZiele: erlaubte lokale Testziele nur mit genauem Host und Port", async () => {
    assert.deepEqual(await pruefeZiele("127.0.0.1", 4050, { lookup, erlaubt: ["127.0.0.1:4050"] }), ["127.0.0.1"]);
    await assert.rejects(pruefeZiele("127.0.0.1", 4051, { lookup, erlaubt: ["127.0.0.1:4050"] }));
    await assert.rejects(pruefeZiele("127.0.0.1", 4050, { lookup }));
    await assert.rejects(pruefeZiele("gut.example", 0, { lookup }));
    await assert.rejects(pruefeZiele("gut.example", 70000, { lookup }));
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
