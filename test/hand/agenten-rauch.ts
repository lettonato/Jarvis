// Handprüfung: die Agentensteuerung in der Ansicht „Agenten“ im echten Browser gegen den gebauten Server
// (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/agenten-rauch.ts [Ordner für Bilder]
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung } from "../helfer/umgebung";

const PORT = 3109;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("agenten-rauch");

async function main() {
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt", claude: { apiKey: "sk-test-nur-fuer-den-mock" } });
  const sperren = () => (JSON.parse(readFileSync(path.join(ordner, "sicherheit.json"), "utf8")) as { sperren: Record<string, unknown> }).sperren;

  const server = await starteNext(PORT);
  try {
    await server.bereit(`${BASIS}/api/agenten`);
    // Die Schnittstelle liest nur: Schreiben gibt es dort nicht.
    const schreiben = await fetch(`${BASIS}/api/agenten`, { method: "POST", headers: { "content-type": "application/json", "x-jarvis": "1" }, body: "{}" });
    assert.equal(schreiben.status, 405);

    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1300 } });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: true });
    };
    const zustand = (agent: string) => seite.locator(`li[data-agent="${agent}"] [data-zustand]`).getAttribute("data-zustand");

    await seite.goto(`${BASIS}/agenten`);
    await seite.locator('li[data-agent="desk"]').waitFor({ timeout: 30_000 });
    assert.equal(await seite.locator("li[data-agent]").count(), 6);
    assert.equal(await zustand("gehirn"), "bereit");
    assert.equal(await zustand("intel"), "nicht-eingerichtet");
    assert.equal(await zustand("metalle"), "nicht-eingerichtet");
    assert.equal(await seite.getByRole("button", { name: /Jetzt starten/ }).count(), 0, "ohne xAI- und Twelve-Data-Schlüssel gibt es keinen Start-Knopf");
    // Der gemeinsame Zeitplan steht unter der Steuerung: sieben Zeilen, und was fehlt, steht als Grund da.
    await seite.waitForSelector("#zeitplan li[data-aufgabe]");
    assert.deepEqual(await seite.locator("#zeitplan li[data-aufgabe]").evaluateAll((zeilen) => zeilen.map((z) => z.getAttribute("data-aufgabe"))), ["intel", "metalle", "briefing", "erinnerungen", "hinweise", "hinweise-mac", "abschluss"]);
    assert.match(await seite.locator("#zeitplan li[data-aufgabe=metalle]").innerText(), /Es fehlt der Twelve-Data-Schlüssel\./);
    assert.match(await seite.locator("#zeitplan li[data-aufgabe=briefing]").innerText(), /Telegram ist nicht verbunden\./);
    assert.match(await seite.locator("#zeitplan li[data-aufgabe=hinweise]").innerText(), /Hinweise am Tag/);
    await bild("0-agenten");

    // Den Analysten sperren und wieder entsperren. Der Zustand folgt der Antwort des Servers.
    const analyst = seite.locator('li[data-agent="analyst"]');
    await analyst.getByRole("button", { name: "Sperren" }).click();
    await analyst.locator('[data-zustand="gesperrt"]').waitFor();
    assert.ok(sperren().analyst, "die Sperre steht in der Datei der Sicherheitszentrale");
    await bild("1-gesperrt");
    await analyst.getByRole("button", { name: "Entsperren" }).click();
    await analyst.locator('[data-zustand="bereit"]').waitFor();
    assert.equal(sperren().analyst, undefined);

    // Die Tagesübersicht zeigt dieselben Agenten.
    await seite.goto(`${BASIS}/heute`);
    await seite.getByText("Browser-Agent").first().waitFor({ timeout: 30_000 });
    await bild("2-heute");

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    await browser.close();
    console.log("Agentensteuerung: alle Schritte in Ordnung.");
  } finally {
    await server.stopLeise();
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
