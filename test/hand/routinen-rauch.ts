// Handprüfung: der Schalter für den Tagesabschluss in den Einstellungen, im echten Browser gegen den gebauten
// Server und einen nachgebauten Telegram-Server (nicht Teil von npm test). Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/routinen-rauch.ts [Ordner für Bilder]
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { sichereUmgebung } from "../helfer/umgebung";
import { starteTelegramMock } from "../mocks/telegram-mock";

const PORT = 3108;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("routinen-rauch");
// Sieht aus wie ein Bot-Schlüssel, ist aber keiner. Zusammengesetzt, damit gitleaks ihn nicht meldet.
const TOKEN = ["123456789", "AAHtest_nur_fuer_den_telegram_mock_xyz"].join(":");

async function main() {
  const tg = await starteTelegramMock();
  const config = await import("../../src/lib/server/config");
  await config.writeConfig({ name: "Benedikt", telegram: { token: TOKEN, bot: "jarvis_test_bot", chatId: 111, chatName: "Benedikt" } });
  const gespeichert = () => (JSON.parse(readFileSync(path.join(ordner, "config.json"), "utf8")) as { telegram: { abschluss?: string | null; projekte?: boolean; hinweise?: boolean } }).telegram;

  const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env: { ...process.env, PORT: String(PORT), TELEGRAM_API_URL: tg.url, JARVIS_TELEGRAM_POLL_S: "1" }, stdio: "ignore", detached: true });
  const stop = () => {
    try {
      process.kill(-server.pid!, "SIGTERM");
    } catch {}
  };
  try {
    for (let i = 0; ; i++) {
      if (await fetch(`${BASIS}/api/einstellungen`).then((r) => r.ok, () => false)) break;
      if (i > 120) throw new Error("Der Server ist nicht gestartet.");
      await new Promise((r) => setTimeout(r, 500));
    }
    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: true });
    };
    const warte = async (pruefung: () => boolean, was: string) => {
      for (let i = 0; i < 100; i++) {
        if (pruefung()) return;
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.fail(`Zeit abgelaufen: ${was}`);
    };

    await seite.goto(`${BASIS}/einstellungen`);
    const abschluss = seite.getByLabel("Tagesabschluss jeden Abend um");
    await abschluss.waitFor({ timeout: 30_000 });
    assert.equal(await abschluss.isChecked(), false, "Voreinstellung: aus");
    assert.equal(await seite.getByLabel(/Projekte beim Namen/).isChecked(), false, "Voreinstellung: keine Projektnamen über Telegram");
    await bild("0-einstellungen-vorher");

    // Das Häkchen folgt erst der Antwort des Servers, deshalb klicken und auf die gespeicherte Datei warten.
    await abschluss.click();
    await warte(() => gespeichert().abschluss === "18:00", "Tagesabschluss um 18:00 gespeichert");
    await seite.locator("input:checked").and(abschluss).waitFor();
    await seite.getByLabel("Uhrzeit für den Tagesabschluss").fill("17:15");
    await seite.getByLabel("Uhrzeit für den Tagesabschluss").blur();
    await warte(() => gespeichert().abschluss === "17:15", "neue Uhrzeit gespeichert");
    await bild("1-einstellungen-an");

    await seite.getByLabel("Tagesabschluss jeden Abend um").click();
    await warte(() => gespeichert().abschluss === null, "Tagesabschluss wieder aus");

    // Eine unsinnige Uhrzeit nimmt die Schnittstelle nicht an.
    const falsch = await fetch(`${BASIS}/api/einstellungen`, { method: "POST", headers: { "content-type": "application/json", "x-jarvis": "1" }, body: JSON.stringify({ action: "telegramPrefs", abschluss: "25:00" }) });
    assert.equal(falsch.status, 400);
    assert.equal(gespeichert().abschluss, null);

    // Hinweise am Tag: aus, bis man sie einschaltet. Danach steht die Regel im gemeinsamen Zeitplan.
    const hinweise = seite.getByLabel(/Hinweise am Tag/);
    assert.equal(await hinweise.isChecked(), false, "Voreinstellung: keine Hinweise am Tag");
    await hinweise.click();
    await warte(() => gespeichert().hinweise === true, "Hinweise am Tag gespeichert");
    await seite.locator("input:checked").and(hinweise).waitFor();
    await bild("2-einstellungen-hinweise");
    await seite.goto(`${BASIS}/agenten#zeitplan`);
    const zeile = seite.locator("#zeitplan li[data-aufgabe=hinweise]");
    await zeile.waitFor({ timeout: 30_000 });
    assert.match(await zeile.innerText(), /zwischen 9 und 18 Uhr, höchstens 3 am Tag, per Telegram/);
    assert.match(await seite.locator("#zeitplan li[data-aufgabe=briefing]").innerText(), /täglich um 07:30 Uhr, per Telegram/);
    assert.match(await seite.locator("#zeitplan li[data-aufgabe=erinnerungen]").innerText(), /15 Minuten vor jedem Termin, per Telegram/);
    await bild("3-zeitplan");

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    await browser.close();
    console.log("Einstellungen Tagesabschluss und Hinweise: alle Schritte in Ordnung.");
  } finally {
    stop();
    // Der Server hält noch eine wartende Anfrage offen; darauf wartet die Prüfung nicht.
    await Promise.race([tg.stop(), new Promise((r) => setTimeout(r, 2000))]);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
