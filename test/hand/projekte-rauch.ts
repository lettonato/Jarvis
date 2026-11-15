// Handprüfung: die Ansichten „Heute“ und „Projekte“ im echten Browser gegen den gebauten Server (nicht Teil von npm test).
// Legt Testdaten in einem eigenen, leeren Einstellungsordner an, startet JARVIS auf einem freien Port und
// klickt sich durch: Vorschlag übernehmen, Akte öffnen, Eintrag korrigieren, zurückziehen, Schutz der
// Schnittstelle. Vorher einmal `npx next build`.
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/projekte-rauch.ts [Ordner für Bilder] [--postgres]
// Mit --postgres liegt das Projektgedächtnis dabei nicht in der Datei, sondern in einem eigenen, leeren
// PostgreSQL auf diesem Rechner (Wegwerf-Datenbank, siehe test/helfer/postgres.ts). Die Schritte sind dieselben.
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { startePostgres } from "../helfer/postgres";
import { starteNext } from "../helfer/server";
import { sichereUmgebung } from "../helfer/umgebung";

const PORT = 3107;
const BASIS = `http://127.0.0.1:${PORT}`;
const args = process.argv.slice(2);
const mitDatenbank = args.includes("--postgres");
const bilder = args.find((a) => !a.startsWith("--")) ?? "";
const ordner = sichereUmgebung("projekte-rauch");

// Alles, was am Ende aufgeräumt werden muss, auch wenn schon das Anlegen der Testdaten scheitert.
const aufraeumen: (() => void | Promise<void>)[] = [];
const schliesse = (s: unknown) => (s && typeof s === "object" && "schliesse" in s ? (s as { schliesse: () => Promise<void> }).schliesse() : undefined);

async function main() {
  const db = mitDatenbank ? startePostgres(54331) : null;
  if (db) {
    aufraeumen.push(() => db.stop());
    process.env.JARVIS_PROJEKTE_DB = db.url;
  }
  const p = await import("../../src/lib/server/projekte/projekte");
  const sp = await import("../../src/lib/server/projekte/speicher");
  const erster = sp.speicher();
  aufraeumen.push(() => schliesse(erster));
  const projekt = await p.legeProjektAn({ name: "Hallenneubau", beschreibung: "Neue Lagerhalle am Standort Süd", verantwortliche: "Thomas, Benedikt", fortschritt: 40, stichworte: "Halle Süd" }, "mac");
  await p.trageEin(projekt.id, { art: "entscheidung", text: "Stahlbau statt Holz", datum: "2026-11-05" }, "mac");
  const aufgabe = await p.trageEin(projekt.id, { art: "aufgabe", text: "Statik prüfen lassen", zustaendig: "Thomas", faellig: "2026-11-10" }, "mac");
  await p.trageEin(projekt.id, { art: "notiz", text: "Kickoff: Zeitplan steht, Architekt liefert Pläne bis Monatsende", datum: "2026-11-06" }, "mac");
  await p.schlageVor({ projekt: "Hallenneubau", quelle_art: "gespraech", quelle_hinweis: "Besprechung am 12.11.", eintraege: [{ art: "risiko", text: "Lieferzeit für Stahlträger liegt bei 14 Wochen" }, { ersetzt: aufgabe.id, faellig: "2026-11-20" }] }, { kanal: "mac", fremd: false });
  await p.schlageVor({ projekt: "Kundenportal", beschreibung: "Portal für Kundenaufträge", quelle_art: "mail", quelle_hinweis: "Mail von Max Huber vom 10.11.", eintraege: [{ art: "aufgabe", text: "Angebot für das Portal bis Freitag schicken", faellig: "2026-11-20" }] }, { kanal: "telegram", fremd: true });

  const server = await starteNext(PORT);
  try {
    await server.bereit(`${BASIS}/api/projekte`);

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
    // Die Seite sagt ehrlich, wo das Projektgedächtnis liegt.
    await seite.getByText(mitDatenbank ? "Gespeichert in der PostgreSQL-Datenbank „postgres“ auf 127.0.0.1." : `Gespeichert auf diesem Mac in ${path.join(ordner, "projekte.json")}.`, { exact: false }).waitFor();
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

    // Der Stand, wie ihn ein frisch gestarteter JARVIS aus dem Speicher liest (Datei oder Datenbank).
    sp.setzeSpeicher(null);
    const frisch = sp.speicher();
    const datei = { projekte: await frisch.projekte(), eintraege: await frisch.eintraege(), vorschlaege: await frisch.vorschlaege() };
    assert.equal(existsSync(path.join(ordner, "projekte.json")), !mitDatenbank, "mit Datenbank entsteht keine Datei, ohne Datenbank liegt alles in der Datei");
    assert.deepEqual(datei.projekte.map((x) => x.name), ["Hallenneubau"], "das abgelehnte Projekt wurde nie angelegt");
    assert.equal(datei.eintraege.find((e) => e.text === "Statik prüfen lassen")?.faellig, "2026-11-25");
    assert.equal(datei.eintraege.filter((e) => e.zurueckgezogen).length, 1);
    assert.equal(datei.eintraege.length, 4, "nichts gelöscht");
    assert.deepEqual(datei.vorschlaege.map((v) => v.zustand).sort(), ["abgelehnt", "abgelehnt", "uebernommen", "uebernommen"]);
    console.log(`Ansicht Projekte${mitDatenbank ? " mit PostgreSQL" : ""}: alle Schritte in Ordnung.`);
  } finally {
    await server.stopLeise();
    await schliesse(sp.speicher());
  }
}

main()
  .then(
    () => 0,
    (e) => {
      console.error(e);
      return 1;
    },
  )
  .then(async (code) => {
    // In umgekehrter Reihenfolge: erst die Verbindungen schließen, dann die Wegwerf-Datenbank beenden.
    for (const schritt of aufraeumen.reverse()) await Promise.resolve(schritt()).catch((e) => console.error(e));
    process.exit(code);
  });
