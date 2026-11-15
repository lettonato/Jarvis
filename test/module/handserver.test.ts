// Start und Stopp des Servers für die Handprüfungen (test/helfer/server.ts). Geprüft mit kleinen Programmen
// statt mit dem gebauten JARVIS: Es geht um das Warten, das Erkennen eines fremden Servers auf dem Port und das
// sichere Beenden. (Windows kennt keine Prozessgruppen; die Handprüfungen und diese Tests gibt es dort nicht.)

import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, test } from "node:test";
import { gruppeLebt } from "../helfer/prozessgruppe";
import { starteDienst, starteNext, type Dienst, type Umgebung } from "../helfer/server";

// Ein Server, der nach `nach` Millisekunden auf dem Port antwortet und SIGTERM übergeht, wenn `zaeh`.
// Mit `gutAb`: Bis dahin (Millisekunden nach dem Start) antwortet er mit 503, erst danach mit 200.
const SERVER = (port: number, nach: number, zaeh: boolean, gutAb = 0) =>
  `${zaeh ? `process.on("SIGTERM", () => {});` : ""} const t0 = Date.now(); setTimeout(() => require("node:http").createServer((q, a) => { a.statusCode = Date.now() - t0 < ${gutAb} ? 503 : 200; a.end("ok"); }).listen(${port}, "127.0.0.1"), ${nach}); setInterval(() => {}, 1000);`;

// Für Tests, in denen es nicht um die Bestätigung nach der ersten guten Antwort geht.
const SCHNELL = { schrittMs: 50, bestaetigeMs: 50 };

const dienste: Dienst[] = [];
const fremde: Server[] = [];
afterEach(async () => {
  for (const d of dienste.splice(0)) {
    try {
      process.kill(-d.pid, "SIGKILL");
    } catch {}
  }
  for (const s of fremde.splice(0)) await new Promise((r) => s.close(r));
});

// Ein freier Port: kurz belegen, Nummer merken, wieder freigeben.
async function freierPort(): Promise<number> {
  const s = createServer();
  await new Promise<void>((r) => s.listen(0, "127.0.0.1", r));
  const port = (s.address() as AddressInfo).port;
  await new Promise((r) => s.close(r));
  return port;
}

// Alles, was startet, wird nach dem Test hart beendet, auch wenn es gar nicht hätte starten dürfen.
const starte = async (code: string, env: Umgebung = {}, port?: number) => {
  const d = await starteDienst(process.execPath, ["-e", code], env, { port });
  dienste.push(d);
  return d;
};

if (process.platform !== "win32")
  describe("Server einer Handprüfung starten und beenden", () => {
    test("wartet, bis der Server antwortet", async () => {
      const port = await freierPort();
      const d = await starte(SERVER(port, 300, false), {}, port);
      await d.bereit(`http://127.0.0.1:${port}/`, SCHNELL);
      assert.equal(await fetch(`http://127.0.0.1:${port}/`).then((r) => r.text()), "ok");
    });

    test("eine Fehlerantwort gilt noch nicht als bereit", async () => {
      const port = await freierPort();
      const d = await starte(SERVER(port, 0, false, 700));
      await d.bereit(`http://127.0.0.1:${port}/`, SCHNELL);
      assert.equal((await fetch(`http://127.0.0.1:${port}/`)).status, 200);
    });

    test("endet das Programm, bevor es antwortet, wird nicht die volle Zeit gewartet", async () => {
      const port = await freierPort();
      const d = await starte(`process.exit(3)`);
      const start = Date.now();
      await assert.rejects(d.bereit(`http://127.0.0.1:${port}/`, SCHNELL), /Der Server hat sich beendet \(Code 3\)/);
      assert.ok(Date.now() - start < 5000);
    });

    test("ist der Port schon belegt, wird gar nicht erst gestartet", async () => {
      const fremd = createServer((q, a) => a.end("fremd"));
      await new Promise<void>((r) => fremd.listen(0, "127.0.0.1", r));
      fremde.push(fremd);
      const port = (fremd.address() as AddressInfo).port;
      // Sonst antwortete der fremde Server (etwa ein liegen gebliebener eines früheren Laufs), noch bevor der
      // eigene am belegten Port scheitert, und die Prüfung liefe gegen den falschen Stand.
      await assert.rejects(starte(SERVER(port, 0, false), {}, port), new RegExp(`Auf Port ${port} antwortet schon ein Server`));
      // Auch der gebaute JARVIS wird über diese Prüfung gestartet.
      await assert.rejects(starteNext(port).then((d) => dienste.push(d)), new RegExp(`Auf Port ${port} antwortet schon ein Server`));
    });

    test("endet das Programm, nachdem ein anderer schon geantwortet hat, gilt das nicht als bereit", async () => {
      const port = await freierPort();
      const d = await starte(`setTimeout(() => process.exit(1), 150)`);
      const fremd = createServer((q, a) => setTimeout(() => a.end("fremd"), 400));
      await new Promise<void>((r) => fremd.listen(port, "127.0.0.1", r));
      fremde.push(fremd);
      await assert.rejects(d.bereit(`http://127.0.0.1:${port}/`, SCHNELL), /Der Server hat sich beendet \(Code 1\)/);
    });

    test("antwortet nie jemand, endet das Warten mit einer klaren Meldung", async () => {
      const port = await freierPort();
      const d = await starte(`setInterval(() => {}, 1000)`);
      await assert.rejects(d.bereit(`http://127.0.0.1:${port}/`, { schrittMs: 20, versuche: 5 }), /Der Server ist nicht gestartet\./);
    });

    test("stop kommt erst zurück, wenn nichts mehr läuft, auch wenn das Programm das Signal übergeht", async () => {
      const port = await freierPort();
      const d = await starte(SERVER(port, 0, true));
      await d.bereit(`http://127.0.0.1:${port}/`, SCHNELL);
      await d.stop({ fristMs: 200 });
      assert.equal(gruppeLebt(d.pid), false);
      await assert.rejects(fetch(`http://127.0.0.1:${port}/`));
      await d.stop({ fristMs: 200 });
    });

    test("bindet ein anderer den Port, kurz nachdem er noch frei war, gilt dessen Antwort nicht als bereit", async () => {
      const port = await freierPort();
      // Der Port ist beim Start frei; das eigene Programm scheitert (wie next start am belegten Port) erst kurz darauf.
      const d = await starte(`setTimeout(() => process.exit(1), 700)`, {}, port);
      const fremd = createServer((q, a) => a.end("fremd"));
      await new Promise<void>((r) => fremd.listen(port, "127.0.0.1", r));
      fremde.push(fremd);
      await assert.rejects(d.bereit(`http://127.0.0.1:${port}/`, { schrittMs: 50 }), /Der Server hat sich beendet \(Code 1\)/);
    });

    test("nimmt jemand die Verbindung an und antwortet nie, hängt das Warten nicht", { timeout: 15_000 }, async () => {
      const port = await freierPort();
      const d = await starte(`require("node:http").createServer(() => {}).listen(${port}, "127.0.0.1");`);
      const start = Date.now();
      await assert.rejects(d.bereit(`http://127.0.0.1:${port}/`, { schrittMs: 20, versuche: 2, antwortMs: 300 }), /Der Server ist nicht gestartet\./);
      assert.ok(Date.now() - start < 5000);
    });

    test("ein Programm, das es nicht gibt, wird beim Start gemeldet", async () => {
      await assert.rejects(starteDienst("/gibt/es/nicht/jarvis-programm", []), /jarvis-programm ließ sich nicht starten/);
    });

    test("stopLeise beendet wie stop, meldet einen Fehler aber nur, statt zu werfen", async () => {
      const port = await freierPort();
      const d = await starte(SERVER(port, 0, false));
      await d.bereit(`http://127.0.0.1:${port}/`, SCHNELL);
      assert.equal(await d.stopLeise(), true);
      assert.equal(gruppeLebt(d.pid), false);
      // Lässt sich die Gruppe nicht beenden, soll das den eigentlichen Fehler einer Prüfung nicht verdecken.
      const gemeldet: string[] = [];
      const alt = console.error;
      console.error = (...a: unknown[]) => void gemeldet.push(a.join(" "));
      try {
        d.stop = async () => {
          throw new Error("Die Prozessgruppe ließ sich nicht beenden.");
        };
        assert.equal(await d.stopLeise(), false);
      } finally {
        console.error = alt;
      }
      assert.match(gemeldet.join("\n"), /ließ sich nicht beenden/);
    });

    test("das Programm bekommt die zusätzliche Umgebung, die übrige bleibt", async () => {
      const port = await freierPort();
      const code = `require("node:http").createServer((q, a) => a.end(process.env.JARVIS_TEST_EXTRA + "|" + (process.env.PATH ? "pfad" : "leer"))).listen(${port}, "127.0.0.1");`;
      const d = await starte(code, { JARVIS_TEST_EXTRA: "da" });
      await d.bereit(`http://127.0.0.1:${port}/`, SCHNELL);
      assert.equal(await fetch(`http://127.0.0.1:${port}/`).then((r) => r.text()), "da|pfad");
    });
  });
