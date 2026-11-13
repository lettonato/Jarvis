// Handprüfung: die Ansichten „Heute“ und „Projekte“ im echten Browser gegen den gebauten Server (nicht Teil von npm test).
// Legt Testdaten in einem eigenen, leeren Einstellungsordner an, startet JARVIS auf einem freien Port und
// klickt sich durch: Vorschlag übernehmen, Akte öffnen, Eintrag korrigieren, zurückziehen, Schutz der
// Schnittstelle. Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/projekte-rauch.ts [Ordner für Bilder]
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { sichereUmgebung } from "../helfer/umgebung";

const PORT = 3107;
const BASIS = `http://127.0.0.1:${PORT}`;
const bilder = process.argv[2] ?? "";
const ordner = sichereUmgebung("projekte-rauch");

async function main() {
  const p = await import("../../src/lib/server/projekte/projekte");
  const projekt = await p.legeProjektAn({ name: "Hallenneubau", beschreibung: "Neue Lagerhalle am Standort Süd", verantwortliche: "Thomas, Benedikt", fortschritt: 40, stichworte: "Halle Süd" }, "mac");
  await p.trageEin(projekt.id, { art: "entscheidung", text: "Stahlbau statt Holz", datum: "2026-11-05" }, "mac");
  const aufgabe = await p.trageEin(projekt.id, { art: "aufgabe", text: "Statik prüfen lassen", zustaendig: "Thomas", faellig: "2026-11-10" }, "mac");
  await p.trageEin(projekt.id, { art: "notiz", text: "Kickoff: Zeitplan steht, Architekt liefert Pläne bis Monatsende", datum: "2026-11-06" }, "mac");
  await p.schlageVor({ projekt: "Hallenneubau", quelle_art: "gespraech", quelle_hinweis: "Besprechung am 12.11.", eintraege: [{ art: "risiko", text: "Lieferzeit für Stahlträger liegt bei 14 Wochen" }, { ersetzt: aufgabe.id, faellig: "2026-11-20" }] }, { kanal: "mac", fremd: false });
  await p.schlageVor({ projekt: "Kundenportal", beschreibung: "Portal für Kundenaufträge", quelle_art: "mail", quelle_hinweis: "Mail von Max Huber vom 10.11.", eintraege: [{ art: "aufgabe", text: "Angebot für das Portal bis Freitag schicken", faellig: "2026-11-20" }] }, { kanal: "telegram", fremd: true });

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

    // Der Schutz der Schnittstelle: ohne den eigenen Header und von fremden Seiten geht keine Änderung durch.
    const ohneHeader = await fetch(`${BASIS}/api/projekte`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aktion: "projekt_anlegen", name: "Eingeschleust" }) });
    assert.equal(ohneHeader.status, 403);
    const fremdeSeite = await fetch(`${BASIS}/api/projekte`, { method: "POST", headers: { "content-type": "application/json", "x-jarvis": "1", origin: "https://boese.example" }, body: JSON.stringify({ aktion: "projekt_anlegen", name: "Eingeschleust" }) });
    assert.equal(fremdeSeite.status, 403);

    const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
    const seite = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
    const fehler: string[] = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    const bild = async (name: string) => {
      if (!bilder) return;
      mkdirSync(bilder, { recursive: true });
      await seite.screenshot({ path: path.join(bilder, `${name}.png`), fullPage: true });
    };
    // Die Tagesübersicht nennt, was wartet, und führt in die Projekte.
    await seite.goto(`${BASIS}/heute`);
    await seite.getByText("4 Vorschläge fürs Projektgedächtnis warten auf deine Bestätigung.").waitFor({ timeout: 30_000 });
    await seite.getByText("Hallenneubau: Eine Aufgabe ist überfällig").first().waitFor();
    await bild("0-heute");
    await seite.goto(`${BASIS}/projekte`);
    await seite.getByText("Wartet auf deine Bestätigung (4)").waitFor({ timeout: 30_000 });
    assert.equal(await seite.getByText("Beruht auf Text von Dritten").count(), 2, "Projekt und Aufgabe aus der Mail tragen den Hinweis");
    await bild("1-vorschlaege");

    // Vorschlag „Risiko“ übernehmen: Er verschwindet aus dem Eingang, die Akte geht auf und zeigt ihn.
    await seite.locator("article", { hasText: "Lieferzeit für Stahlträger" }).getByRole("button", { name: "Übernehmen" }).click();
    await seite.getByText("Wartet auf deine Bestätigung (3)").waitFor();
    await seite.getByText("Projektakte").waitFor();
    await seite.getByRole("heading", { name: "Risiken (1)" }).waitFor();

    // Die Korrektur der Frist geändert übernehmen.
    const korrektur = seite.locator("article", { hasText: "Korrektur" });
    await korrektur.getByRole("button", { name: "Ändern" }).click();
    await korrektur.getByLabel("Frist (optional)").fill("2026-11-25");
    await korrektur.getByRole("button", { name: "Geändert übernehmen" }).click();
    await seite.getByText("Wartet auf deine Bestätigung (2)").waitFor();
    await seite.getByText("Einmal korrigiert").waitFor();

    // Einen Eintrag von Hand korrigieren und einen zurückziehen.
    const zeile = seite.locator("li", { hasText: "Stahlbau statt Holz" });
    await zeile.getByRole("button", { name: "Korrigieren" }).click();
    await zeile.getByLabel("Text").fill("Stahlbau statt Holz, Dach in Holz");
    await zeile.getByLabel("Grund der Korrektur (optional)").fill("Dach nachträglich geklärt");
    await zeile.getByRole("button", { name: "Korrektur speichern" }).click();
    await seite.locator("li", { hasText: "Stahlbau statt Holz, Dach in Holz" }).first().waitFor();
    const notiz = seite.locator("li", { hasText: "Kickoff: Zeitplan steht" });
    await notiz.getByRole("button", { name: "Zurückziehen" }).click();
    await notiz.getByLabel("Grund").fill("doppelt notiert");
    await notiz.getByRole("button", { name: "Wirklich zurückziehen" }).click();
    await seite.getByText("Zurückgezogen (1)").waitFor();
    await bild("2-akte");

    // Den Vorschlag aus der Mail ablehnen, das Projekt dazu auch.
    for (const text of ["Angebot für das Portal", "Portal für Kundenaufträge"]) {
      await seite.locator("article", { hasText: text }).getByRole("button", { name: "Ablehnen" }).click();
      await seite.locator("article", { hasText: text }).waitFor({ state: "detached" });
    }
    await bild("3-fertig");
    await browser.close();
    assert.deepEqual(fehler, [], "keine Fehler in der Seite");

    const datei = JSON.parse(readFileSync(path.join(ordner, "projekte.json"), "utf8")) as { projekte: { name: string }[]; eintraege: { text: string; faellig: string | null; verlauf: unknown[]; zurueckgezogen: unknown }[]; vorschlaege: { zustand: string }[] };
    assert.deepEqual(datei.projekte.map((x) => x.name), ["Hallenneubau"], "das abgelehnte Projekt wurde nie angelegt");
    assert.equal(datei.eintraege.find((e) => e.text === "Statik prüfen lassen")?.faellig, "2026-11-25");
    assert.equal(datei.eintraege.filter((e) => e.zurueckgezogen).length, 1);
    assert.equal(datei.eintraege.length, 4, "nichts gelöscht");
    assert.deepEqual(datei.vorschlaege.map((v) => v.zustand).sort(), ["abgelehnt", "abgelehnt", "uebernommen", "uebernommen"]);
    console.log("Ansicht Projekte: alle Schritte in Ordnung.");
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
