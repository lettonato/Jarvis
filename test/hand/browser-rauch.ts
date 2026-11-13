// Handprüfung des Browser-Agenten mit echtem Chrome und nachgebautem Claude (nicht Teil von npm test):
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/browser-rauch.ts
// Der Agent öffnet eine erlaubte Testseite. Die Seite versucht per Bild, fetch und WebSocket, einen
// internen Dienst auf diesem Rechner zu erreichen. Erwartet: Der Agent liest die Seite, internHits bleibt 0,
// und die Sperren stehen im Audit-Log.

import http from "node:http";
import { sichereUmgebung } from "../helfer/umgebung";
import { starteClaudeMock } from "../mocks/claude-mock";

const listen = (h: http.RequestListener, port = 0) =>
  new Promise<{ s: http.Server; port: number }>((r) => {
    const s = http.createServer(h);
    s.listen(port, "127.0.0.1", () => r({ s, port: (s.address() as { port: number }).port }));
  });

(async () => {
  sichereUmgebung("browser-rauch");
  let internHits = 0;
  const intern = await listen((_q, r) => {
    internHits++;
    r.end("GEHEIM-INTERN");
  });
  intern.s.on("upgrade", (_q, sock) => {
    internHits++;
    sock.destroy();
  });
  const seite = await listen((_q, r) => {
    r.setHeader("content-type", "text/html; charset=utf-8");
    r.end(`<html><body><h1>Testseite Winterreifen</h1><p>Angebot A kostet 89 Euro.</p>
      <img src="http://127.0.0.1:${intern.port}/bild.png">
      <script>
        fetch("http://127.0.0.1:${intern.port}/api", { mode: "no-cors" }).catch(() => {});
        fetch("http://localhost:${intern.port}/api", { mode: "no-cors" }).catch(() => {});
        try { new WebSocket("ws://127.0.0.1:${intern.port}/ws"); } catch (e) {}
      </script></body></html>`);
  });
  const claude = await starteClaudeMock();
  Object.assign(process.env, { ANTHROPIC_BASE_URL: claude.url, JARVIS_BROWSER_LOCAL: `127.0.0.1:${seite.port}`, JARVIS_BROWSER_HEADLESS: "1" });
  const browser = await import("../../src/lib/server/browser");
  const audit = await import("../../src/lib/server/gateway/audit");
  const config = await import("../../src/lib/server/config");
  claude.drehbuch([
    { werkzeug: "seite_oeffnen", eingabe: { adresse: `http://127.0.0.1:${seite.port}/` } },
    { werkzeug: "seite_oeffnen", eingabe: { adresse: `http://127.0.0.1:${intern.port}/` } },
    { text: "Angebot A kostet 89 Euro." },
  ]);
  const schritte: string[] = [];
  const ergebnis = await browser.runBrowserTask(await config.readConfig(), "test", "Lies die Testseite", { from: "mac", onStep: (s) => schritte.push(s.text) });
  await new Promise((r) => setTimeout(r, 1500));
  const log = await audit.leseAudit(50);
  const { werkzeugErgebnisse } = await import("../mocks/claude-mock");
  const letzte = werkzeugErgebnisse(claude.anfragen.at(-1)!);
  console.log(
    JSON.stringify(
      {
        ergebnis,
        schritte,
        seiteGelesen: letzte.some((e) => e.content.includes("Winterreifen")),
        interneSeiteAbgelehnt: letzte.some((e) => /Heimnetz/.test(e.content)),
        internHits,
        netzSperrenImAudit: log.filter((e) => e.art === "netz").map((e) => ({ grund: e.grund, daten: e.daten })),
        auditKette: (await audit.pruefeAudit()).ok,
        anfragen: claude.anfragen.length,
        werkzeugErgebnisse: letzte.map((e) => e.content.slice(0, 200)),
        audit: log.map((e) => `${e.art} ${e.was} ${e.ergebnis} ${e.grund ?? ""}`),
      },
      null,
      1,
    ),
  );
  await browser.closeBrowser();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
