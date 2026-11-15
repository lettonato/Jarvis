// Offene Risiken in der Projektüberwachung (Schritt C4.2): was die Karte eines Projekts über seine Risiken weiß
// (src/lib/projekte.ts). Reine Regeln ohne Netz und ohne KI.
//
// Die Regel: Ein offenes Risiko mit Frist zählt wie eine Frist. Eines ohne Frist fällt auf, wenn es seit
// 14 Tagen niemand mehr angefasst hat. Erledigte und zurückgezogene Risiken zählen nie.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { karteVon, RISIKO_REGELN, risikoUnveraendert, type Eintrag, type Projekt } from "../../src/lib/projekte";

const HEUTE = "2026-11-13";
const eigene = { art: "eingabe", hinweis: "", kanal: "mac", fremd: false, von: "mensch" } as const;
const ausMail = { art: "mail", hinweis: "Mail vom Lieferanten", kanal: "mac", fremd: true, von: "jarvis" } as const;
const PROJEKT: Projekt = { id: "p1", name: "Hallenneubau", beschreibung: "", status: "aktiv", verantwortliche: [], fortschritt: null, stichworte: [], vertraulich: false, quelle: eigene, erstelltAm: "2026-10-01T08:00:00.000Z", geaendertAm: "2026-10-01T08:00:00.000Z" };

// Mittags in Ortszeit, damit der Kalendertag in jeder Zeitzone derselbe ist.
const am = (tag: string) => new Date(`${tag}T12:00:00`).toISOString();
let nr = 0;
const eintrag = (art: Eintrag["art"], text: string, mehr: Partial<Eintrag> = {}): Eintrag => ({
  id: `e${++nr}`,
  projektId: "p1",
  art,
  text,
  zustaendig: "",
  faellig: null,
  datum: null,
  erledigt: false,
  quelle: eigene,
  erstelltAm: am("2026-10-01"),
  bestaetigtAm: am("2026-10-01"),
  geaendertAm: null,
  verlauf: [],
  zurueckgezogen: null,
  ...mehr,
});
const risiko = (text: string, mehr: Partial<Eintrag> = {}) => eintrag("risiko", text, mehr);

describe("Risiken auf der Projektkarte: mit Frist", () => {
  test("zählt, wie viele über der Frist sind, und nennt die früheste Frist", () => {
    const k = karteVon(PROJEKT, [risiko("Später", { faellig: "2026-11-20" }), risiko("Lieferzeit Stahl", { faellig: "2026-11-10" }), risiko("Genehmigung", { faellig: "2026-11-12" }), risiko("Heute", { faellig: HEUTE })], HEUTE);
    assert.equal(k.risiken, 4);
    assert.equal(k.risikenUeberfaellig, 2, "heute fällig ist noch nicht über der Frist");
    assert.deepEqual(k.risikoFrist, { text: "Lieferzeit Stahl", faellig: "2026-11-10" });
  });

  test("erledigte und zurückgezogene Risiken und die Risiken anderer Projekte zählen nicht", () => {
    const k = karteVon(
      PROJEKT,
      [risiko("Erledigt", { faellig: "2026-11-01", erledigt: true }), risiko("Zurückgezogen", { faellig: "2026-11-02", zurueckgezogen: { am: am("2026-11-03"), grund: "" } }), risiko("Fremdes Projekt", { faellig: "2026-11-03", projektId: "p2" })],
      HEUTE,
    );
    assert.equal(k.risikenUeberfaellig, 0);
    assert.equal(k.risikoFrist, null);
    assert.equal(k.risikenAlt, null);
  });

  test("die Fristen von Aufgaben und Risiken bleiben getrennt", () => {
    const k = karteVon(PROJEKT, [eintrag("aufgabe", "Statik prüfen", { faellig: "2026-11-11" }), risiko("Lieferzeit Stahl", { faellig: "2026-11-25" })], HEUTE);
    assert.equal(k.ueberfaellig, 1);
    assert.deepEqual(k.naechsteFrist, { text: "Statik prüfen", faellig: "2026-11-11" });
    assert.equal(k.risikenUeberfaellig, 0);
    assert.deepEqual(k.risikoFrist, { text: "Lieferzeit Stahl", faellig: "2026-11-25" });
  });
});

describe("Risiken auf der Projektkarte: ohne Frist und lange unverändert", () => {
  test("ab 14 Tagen ohne Änderung fällt ein Risiko auf, einen Tag vorher noch nicht", () => {
    assert.equal(RISIKO_REGELN.altTage, 14);
    const genau = risiko("Genau zwei Wochen", { bestaetigtAm: am("2026-10-30") });
    const knapp = risiko("Knapp darunter", { bestaetigtAm: am("2026-10-31") });
    assert.equal(risikoUnveraendert(genau, HEUTE), 14);
    assert.equal(risikoUnveraendert(knapp, HEUTE), 13);
    assert.deepEqual(karteVon(PROJEKT, [genau], HEUTE).risikenAlt, { anzahl: 1, text: "Genau zwei Wochen", tage: 14 });
    assert.equal(karteVon(PROJEKT, [knapp], HEUTE).risikenAlt, null);
  });

  test("bei mehreren steht das älteste vorn, gezählt werden alle", () => {
    const k = karteVon(PROJEKT, [risiko("Mittel", { bestaetigtAm: am("2026-10-20") }), risiko("Ältestes", { bestaetigtAm: am("2026-10-01") }), risiko("Frisch", { bestaetigtAm: am("2026-11-10") })], HEUTE);
    assert.deepEqual(k.risikenAlt, { anzahl: 2, text: "Ältestes", tage: 43 });
  });

  test("eine Korrektur stellt die Uhr zurück: Es zählt, wann das Risiko zuletzt angefasst wurde", () => {
    const korrigiert = risiko("Neu bewertet", { bestaetigtAm: am("2026-10-01"), geaendertAm: am("2026-11-09") });
    assert.equal(risikoUnveraendert(korrigiert, HEUTE), 4);
    assert.equal(karteVon(PROJEKT, [korrigiert], HEUTE).risikenAlt, null);
  });

  test("ein Risiko mit Frist gilt nie als „lange unverändert“, auch ein erledigtes oder zurückgezogenes nicht", () => {
    assert.equal(risikoUnveraendert(risiko("Mit Frist", { faellig: "2026-12-01" }), HEUTE), null);
    assert.equal(risikoUnveraendert(risiko("Erledigt", { erledigt: true }), HEUTE), null);
    assert.equal(risikoUnveraendert(risiko("Zurückgezogen", { zurueckgezogen: { am: am("2026-10-02"), grund: "" } }), HEUTE), null);
    assert.equal(risikoUnveraendert(eintrag("aufgabe", "Keine Frist"), HEUTE), null, "nur Risiken");
    assert.equal(karteVon(PROJEKT, [risiko("Mit Frist", { faellig: "2026-12-01" })], HEUTE).risikenAlt, null);
  });

  test("ein unlesbarer Zeitstempel ergibt kein Alter und keinen Absturz", () => {
    assert.equal(risikoUnveraendert(risiko("Kaputt", { bestaetigtAm: "irgendwann" }), HEUTE), null);
    assert.equal(karteVon(PROJEKT, [risiko("Kaputt", { bestaetigtAm: "irgendwann" })], HEUTE).risikenAlt, null);
  });
});

describe("Risiken auf der Projektkarte: Text von Dritten", () => {
  test("stammt das Risiko mit der nächsten Frist aus einer Mail, trägt die Karte Text von Dritten", () => {
    assert.equal(karteVon(PROJEKT, [risiko("Eigenes", { faellig: "2026-11-20" })], HEUTE).textVonDritten, false);
    assert.equal(karteVon(PROJEKT, [risiko("Aus der Mail", { faellig: "2026-11-20", quelle: ausMail })], HEUTE).textVonDritten, true);
  });

  test("dasselbe gilt für das älteste unveränderte Risiko; eines, dessen Text nicht auf der Karte steht, zählt nicht", () => {
    assert.equal(karteVon(PROJEKT, [risiko("Altes aus der Mail", { quelle: ausMail })], HEUTE).textVonDritten, true);
    const k = karteVon(PROJEKT, [risiko("Eigenes, früher fällig", { faellig: "2026-11-15" }), risiko("Aus der Mail, später fällig", { faellig: "2026-11-25", quelle: ausMail })], HEUTE);
    assert.equal(k.textVonDritten, false);
  });
});
