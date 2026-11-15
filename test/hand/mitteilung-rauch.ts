// Handprüfung: Hinweise am Tag als Mitteilung am Mac, im echten Browser gegen den gebauten Server (nicht Teil
// von npm test). Geprüft wird die ganze Strecke: Abschnitt in den Einstellungen, Mitteilung zur Probe, Schalter,
// Zeile im Zeitplan, und dass der Zeitplan des laufenden Servers die Mitteilung wirklich auslöst, mit Zahlen und
// ohne Namen, genau einmal. Der Mac ist nachgebaut (test/mocks/osascript-mock.mjs): Hier erscheint keine echte
// Mitteilung. Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/mitteilung-rauch.ts [Ordner für Bilder]
import assert from "node:assert/strict";
import { chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { starteNext } from "../helfer/server";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { mittagsZone } from "../helfer/uhrzeiten";

const PORT = 3115;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("mitteilung-rauch");
const LOG = path.join(testOrdner("mitteilung-rauch-mac"), "aufrufe.log");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const schritt = (text: string) => console.log(`  in Ordnung: ${text}`);

// Hinweise kommen nur zwischen 9 und 18 Uhr. Damit die Prüfung zu jeder Tageszeit läuft, bekommt der Server
// eine Zeitzone, in der es gerade Mittag ist.
const ZONE = mittagsZone();

type Datei = { name: string; mitteilungen?: { hinweise?: boolean }; telegram?: unknown };
const gespeichert = () => JSON.parse(readFileSync(path.join(ordner, "config.json"), "utf8")) as Datei;
const gezeigt = () =>
  (existsSync(LOG) ? readFileSync(LOG, "utf8") : "")
    .split("\n")
    .filter(Boolean)
    .map((z) => (JSON.parse(z) as { args: string[] }).args)
    .filter((a) => a[1]?.includes("display notification"))
    .map((a) => ({ skript: a[1], text: a[2], titel: a[3] }));
async function warte(bedingung: () => boolean, was: string, ms = 90_000) {
  for (const ende = Date.now() + ms; !bedingung(); ) {
    if (Date.now() > ende) throw new Error(`Zeit abgelaufen: ${was}`);
    await pause(250);
  }
}

async function main() {
  chmodSync("test/mocks/osascript-mock.mjs", 0o755);
  const config = await import("../../src/lib/server/config");
  const p = await import("../../src/lib/server/projekte/projekte");
  await config.writeConfig({ name: "Benedikt" });
  // Ein offenes und ein vertrauliches Projekt, jedes mit einer längst überfälligen Aufgabe.
  const eingetragen = new Date(2026, 0, 2, 8, 0);
  const halle = await p.legeProjektAn({ name: "Hallenneubau" }, "mac", eingetragen);
  await p.trageEin(halle.id, { art: "aufgabe", text: "Statik prüfen", faellig: "2026-01-05" }, "mac", eingetragen);
  const geheim = await p.legeProjektAn({ name: "Adler", vertraulich: true }, "mac", eingetragen);
  await p.trageEin(geheim.id, { art: "aufgabe", text: "Kaufpreis nachverhandeln", faellig: "2026-01-07" }, "mac", eingetragen);

  const umgebung = { TZ: ZONE, JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_MAC_LOG: LOG, JARVIS_MAC_STORE: path.join(path.dirname(LOG), "kalender.json") };
  const server = await starteNext(PORT, umgebung);
  try {
    await server.bereit(`${BASIS}/api/einstellungen`);
    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string, ganz = false) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: ganz });
    };

    // 1. Der Abschnitt steht in den Einstellungen und in der Sprungleiste; der Schalter ist aus.
    await seite.goto(`${BASIS}/einstellungen`);
    const abschnitt = seite.locator("#mitteilungen");
    await abschnitt.waitFor({ timeout: 30_000 });
    await seite.getByRole("navigation", { name: "Abschnitte der Einstellungen" }).getByRole("link", { name: "Mitteilungen" }).click();
    const schalter = abschnitt.getByLabel(/Hinweise am Tag/);
    assert.equal(await schalter.isChecked(), false, "Voreinstellung: keine Mitteilungen");
    assert.match(await abschnitt.innerText(), /immer nur Zahlen/);
    await pause(1_500);
    assert.deepEqual(gezeigt(), [], "ausgeschaltet kommt nichts, obwohl etwas überfällig ist");
    schritt("Abschnitt „Mitteilungen am Mac“ ist da, der Schalter ist aus, und ausgeschaltet kommt nichts");

    // 2. Mitteilung zur Probe: fester Satz, und die Seite sagt, wo man nachsieht, wenn nichts erscheint.
    await abschnitt.getByRole("button", { name: "Mitteilung zur Probe zeigen" }).click();
    await abschnitt.getByText(/Die Mitteilung ist unterwegs/).waitFor();
    assert.deepEqual(gezeigt().map((m) => [m.titel, m.text]), [["JARVIS", "So sieht ein Hinweis von JARVIS aus."]]);
    assert.equal(gespeichert().mitteilungen, undefined, "die Probe schaltet nichts ein");
    await abschnitt.scrollIntoViewIfNeeded();
    await bild("1-probe");
    schritt("Mitteilung zur Probe ging an den (nachgebauten) Mac; eingeschaltet wurde dadurch nichts");

    // 3. Einschalten über die Seite. Der Zeitplan des Servers zeigt die Mitteilung von selbst: nur Zahlen.
    await schalter.click();
    await warte(() => gespeichert().mitteilungen?.hinweise === true, "Schalter gespeichert");
    await seite.locator("input:checked").and(schalter).waitFor();
    assert.equal(gespeichert().telegram, undefined, "ein Handy braucht es dafür nicht");
    await bild("2-eingeschaltet");
    // Ein Blick auf die Uhr außer der Reihe (so wie beim Öffnen des Raums Intel); sonst käme sie in der nächsten Minute.
    await fetch(`${BASIS}/api/intel`);
    await warte(() => gezeigt().length >= 2, "der Zeitplan zeigt die Mitteilung");
    const [, hinweis] = gezeigt();
    assert.deepEqual([hinweis.titel, hinweis.text], ["JARVIS", "2 Aufgaben sind überfällig. Einzelheiten in JARVIS unter „Heute“."]);
    for (const wort of ["Hallenneubau", "Statik", "Adler", "Kaufpreis"]) assert.ok(!readFileSync(LOG, "utf8").includes(wort), `„${wort}“ ging an den Mac`);
    assert.ok(!hinweis.skript.includes("überfällig"), "der Text steht nicht im Skript");
    schritt(`eingeschaltet (ohne Handy): Der laufende Server zeigt von selbst „${hinweis.text}“, ohne Namen`);

    // 4. Im Zeitplan steht die Zeile mit Takt und letztem Lauf; ein zweites Mal kommt dieselbe Mitteilung nicht.
    await seite.goto(`${BASIS}/agenten#zeitplan`);
    const zeile = seite.locator('#zeitplan li[data-aufgabe="hinweise-mac"]');
    await zeile.waitFor({ timeout: 30_000 });
    assert.match(await zeile.innerText(), /Hinweise am Tag als Mitteilung am Mac/);
    assert.match(await zeile.innerText(), /zwischen 9 und 18 Uhr, höchstens 3 am Tag, als Mitteilung am Mac/);
    await zeile.scrollIntoViewIfNeeded();
    await bild("3-zeitplan");
    for (let i = 0; i < 3; i++) {
      await fetch(`${BASIS}/api/intel`);
      await pause(1_000);
    }
    assert.equal(gezeigt().length, 2, "dieselbe Mitteilung kommt nicht noch einmal");
    schritt("der Zeitplan zeigt die Zeile mit ihrem Takt; dieselbe Mitteilung kommt kein zweites Mal");

    // 5. Ausschalten über die Seite; unsinnige Angaben und fremde Seiten ändern nichts.
    await seite.goto(`${BASIS}/einstellungen#mitteilungen`);
    await schalter.waitFor();
    assert.equal(await schalter.isChecked(), true, "nach neuem Laden ist der Schalter an");
    await schalter.click();
    await warte(() => gespeichert().mitteilungen?.hinweise === false, "Schalter wieder aus");
    const kopf = { "content-type": "application/json", "x-jarvis": "1" };
    const falsch = await fetch(`${BASIS}/api/einstellungen`, { method: "POST", headers: kopf, body: JSON.stringify({ action: "macHinweise", an: "ja" }) });
    assert.equal(falsch.status, 400);
    const fremd = await fetch(`${BASIS}/api/einstellungen`, { method: "POST", headers: { ...kopf, origin: "https://boese.example" }, body: JSON.stringify({ action: "macHinweise", an: true }) });
    assert.equal(fremd.status, 403);
    const fremdeProbe = await fetch(`${BASIS}/api/einstellungen`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "macMitteilungProbe" }) });
    assert.equal(fremdeProbe.status, 403);
    assert.equal(gespeichert().mitteilungen?.hinweise, false);
    assert.equal(gezeigt().length, 2, "eine fremde Seite löst keine Mitteilung aus");
    schritt("ausgeschaltet über die Seite; unsinnige Angabe (400) und fremde Seiten (403) ändern nichts und zeigen nichts");

    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    await browser.close();
    console.log("Handprüfung Mitteilung am Mac: alle Schritte in Ordnung.");
  } finally {
    await server.stopLeise();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
