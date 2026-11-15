// Handprüfung: offene Risiken in „Heute“ und „Projekte“ (Schritt C4.2), im echten Browser gegen den gebauten
// Server (nicht Teil von npm test). Legt Testdaten in einem eigenen, leeren Einstellungsordner an und klickt sich
// durch: Risiko über der Frist, Risiko mit Frist heute, ein lange unverändertes Risiko, abhaken, korrigieren.
// Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/risiken-rauch.ts [Ordner für Bilder]
// Der Server rechnet mit dem echten Tag. Ein lange unverändertes Risiko steht in „Heute“ nur am Montag; die
// Prüfung erwartet deshalb je nach Wochentag das eine oder das andere und sagt am Ende, welcher Fall es war.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { addDays, isoDate } from "../../src/lib/dates";
import { sichereUmgebung } from "../helfer/umgebung";

const PORT = 3117;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
sichereUmgebung("risiken-rauch");

async function main() {
  const p = await import("../../src/lib/server/projekte/projekte");
  const jetzt = new Date();
  const heute = isoDate(jetzt);
  const montag = jetzt.getDay() === 1;
  const vor20Tagen = new Date(jetzt.getTime() - 20 * 86_400_000);

  const halle = await p.legeProjektAn({ name: "Hallenneubau", verantwortliche: "Thomas" }, "mac", vor20Tagen);
  await p.trageEin(halle.id, { art: "risiko", text: "Lieferzeit für Stahlträger", zustaendig: "Thomas", faellig: addDays(heute, -3) }, "mac", vor20Tagen);
  await p.trageEin(halle.id, { art: "aufgabe", text: "Statik prüfen lassen", faellig: addDays(heute, 20) }, "mac", vor20Tagen);
  const portal = await p.legeProjektAn({ name: "Kundenportal" }, "mac", vor20Tagen);
  await p.trageEin(portal.id, { art: "risiko", text: "Agentur ist überlastet" }, "mac", vor20Tagen);
  await p.trageEin(portal.id, { art: "risiko", text: "Frisch erkannt" }, "mac", jetzt);
  const messe = await p.legeProjektAn({ name: "Messe" }, "mac", vor20Tagen);
  await p.trageEin(messe.id, { art: "risiko", text: "Standfläche wird knapp", faellig: heute }, "mac", vor20Tagen);
  await p.trageEin(messe.id, { art: "aufgabe", text: "Stand buchen", faellig: heute }, "mac", vor20Tagen);
  const ruht = await p.legeProjektAn({ name: "Altlast", status: "pausiert" }, "mac", vor20Tagen);
  await p.trageEin(ruht.id, { art: "risiko", text: "Ruht ohnehin", faellig: addDays(heute, -30) }, "mac", vor20Tagen);

  const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore", detached: true });
  const stop = () => {
    try {
      process.kill(-server.pid!, "SIGTERM");
    } catch {}
  };
  try {
    for (let i = 0; ; i++) {
      if (await fetch(`${BASIS}/api/projekte`).then((r) => r.ok, () => false)) break;
      if (i > 120) throw new Error("Der Server ist nicht gestartet.");
      await new Promise((r) => setTimeout(r, 500));
    }
    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: true });
    };
    const ALT = "Ein Risiko ist seit 20 Tagen unverändert offen: Agentur ist überlastet";

    // „Heute“: Das Risiko über der Frist ist dringend; bei der Messe steht die Aufgabe vorn, das Risiko als Nachsatz.
    await seite.goto(`${BASIS}/heute`);
    await seite.getByText("Hallenneubau: Ein Risiko ist über der Frist: Lieferzeit für Stahlträger, seit 3 Tagen überfällig").first().waitFor({ timeout: 30_000 });
    await seite.getByText("Messe: Stand buchen, heute fällig; außerdem ist heute ein Risiko fällig").first().waitFor();
    assert.equal(await seite.getByText("Ruht ohnehin").count(), 0, "ein pausiertes Projekt meldet nichts");
    assert.equal(await seite.getByText(ALT).count(), montag ? 1 : 0, montag ? "am Montag steht das alte Risiko da" : "außer am Montag steht das alte Risiko nicht in „Heute“");
    await bild("0-heute");

    // „Projekte“: Die Karte zeigt es jeden Tag, nicht nur am Montag.
    await seite.goto(`${BASIS}/projekte`);
    const karte = (name: string) => seite.locator("button", { has: seite.getByRole("heading", { name }) });
    await karte("Hallenneubau").getByText("Risiko über der Frist").waitFor({ timeout: 30_000 });
    assert.match(await karte("Hallenneubau").innerText(), /1 Risiko · nächste Frist: Statik prüfen lassen, fällig am .* · Risiko: Lieferzeit für Stahlträger, seit 3 Tagen überfällig/);
    assert.match(await karte("Kundenportal").innerText(), /2 Risiken · ein Risiko seit 20 Tagen unverändert/);
    assert.equal(await karte("Kundenportal").getByText("über der Frist").count(), 0);
    assert.match(await karte("Messe").innerText(), /Risiko: Standfläche wird knapp, heute fällig/);
    await bild("1-projekte");

    // In der Akte steht am alten Risiko, wie lange es unverändert ist; am frischen nicht.
    await karte("Kundenportal").click();
    await seite.getByRole("heading", { name: "Risiken (2)" }).waitFor();
    const altes = seite.locator("li", { hasText: "Agentur ist überlastet" });
    assert.match(await altes.innerText(), /seit 20 Tagen unverändert/);
    assert.doesNotMatch(await seite.locator("li", { hasText: "Frisch erkannt" }).innerText(), /unverändert/);
    await bild("2-akte-alt");

    // Korrigieren stellt die Uhr zurück: Der Zusatz verschwindet, auf der Karte auch.
    await altes.getByRole("button", { name: "Korrigieren" }).click();
    await altes.getByLabel("Text").fill("Agentur ist überlastet, Ersatz angefragt");
    await altes.getByLabel("Grund der Korrektur (optional)").fill("neu bewertet");
    await altes.getByRole("button", { name: "Korrektur speichern" }).click();
    // Erst wenn das Formular zu ist, zeigt die Zeile den gespeicherten Stand (vorher steht der neue Text nur im Eingabefeld).
    await seite.getByRole("button", { name: "Korrektur speichern" }).waitFor({ state: "detached" });
    const neu = seite.locator("li", { hasText: "Agentur ist überlastet, Ersatz angefragt" }).first();
    await neu.waitFor();
    assert.doesNotMatch(await neu.locator("p").nth(1).innerText(), /unverändert/);
    await seite.waitForFunction(() => !document.body.innerText.includes("seit 20 Tagen unverändert"));

    // Das Risiko über der Frist abhaken: Die rote Marke verschwindet, und „Heute“ meldet es nicht mehr.
    await karte("Kundenportal").click();
    await karte("Hallenneubau").click();
    await seite.getByRole("heading", { name: "Risiken (1)" }).waitFor();
    await seite.locator("li", { hasText: "Lieferzeit für Stahlträger" }).getByLabel("Als erledigt abhaken").click();
    await karte("Hallenneubau").getByText("Risiko über der Frist").waitFor({ state: "detached" });
    await bild("3-abgehakt");
    await seite.goto(`${BASIS}/heute`);
    await seite.getByText("Messe: Stand buchen, heute fällig; außerdem ist heute ein Risiko fällig").first().waitFor({ timeout: 30_000 });
    assert.equal(await seite.getByText("Lieferzeit für Stahlträger").count(), 0);
    assert.equal(await seite.getByText("unverändert offen").count(), 0, "nach der Korrektur ist kein Risiko mehr „lange unverändert“");
    await bild("4-heute-danach");

    await browser.close();
    assert.deepEqual(fehler, [], "keine Fehler in der Seite");
    console.log(`Offene Risiken in Heute und Projekte: alle Schritte in Ordnung (heute ist ${montag ? "Montag: das alte Risiko stand in „Heute“" : "kein Montag: das alte Risiko stand nur in „Projekte“"}).`);
  } finally {
    stop();
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
