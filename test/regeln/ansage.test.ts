// Was ein Vorleseprogramm von JARVIS angesagt bekommt, solange das Gespräch zugeklappt ist (src/lib/ansage.ts):
// jede fertige Antwort, nicht jedes Wort beim Schreiben, nichts, womit JARVIS selbst zu hören war, und nichts
// aus dem Gespräch von gestern.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ansage, ANSAGE_START, ANSAGE_WARTET_MS, type AnsageStand } from "../../src/lib/ansage";

const du = (id: number, text = "Frage") => ({ id, who: "du" as const, text });
const jarvis = (id: number, text: string, mehr: { live?: boolean; alt?: boolean } = {}) => ({ id, who: "jarvis" as const, text, ...mehr });
const STILL = false;

describe("Ansage für ein Vorleseprogramm", () => {
  test("eine fertige Antwort wird angesagt, wenn JARVIS sie nicht selbst spricht", () => {
    const r = ansage([du(3), jarvis(4, "Heute steht ein Termin an.")], STILL, STILL, ANSAGE_START);
    assert.deepEqual(r.texte, [{ id: 4, text: "Heute steht ein Termin an." }]);
  });

  test("solange JARVIS noch schreibt oder nachdenkt, wird nichts angesagt; was du sagst, auch nicht", () => {
    assert.deepEqual(ansage([du(3), jarvis(4, "Heute steht", { live: true })], STILL, STILL, ANSAGE_START).texte, []);
    assert.deepEqual(ansage([du(3), jarvis(4, "", { live: true })], STILL, STILL, ANSAGE_START).texte, []);
    assert.deepEqual(ansage([], STILL, STILL, ANSAGE_START).texte, []);
    assert.deepEqual(ansage([du(3), jarvis(4, "   ")], STILL, STILL, ANSAGE_START).texte, []);
    assert.deepEqual(ansage([du(3)], STILL, STILL, ANSAGE_START).texte, []);
  });

  test("ist JARVIS mit der Antwort zu hören, wird sie nicht auch noch angesagt, auch nicht, wenn er fertig gesprochen hat", () => {
    // Beim Schreiben beginnt er hörbar zu sprechen: Die Antwort gilt als gehört.
    const waehrend = ansage([du(3), jarvis(4, "Heute steht", { live: true })], true, true, ANSAGE_START);
    assert.deepEqual(waehrend, { texte: [], stand: { bis: 4, warHoerbar: true } });
    // Fertig geschrieben, spricht noch.
    const fertig = ansage([du(3), jarvis(4, "Heute steht ein Termin an.")], true, true, waehrend.stand);
    assert.deepEqual(fertig, { texte: [], stand: { bis: 4, warHoerbar: true } });
    // Fertig gesprochen: still bleiben.
    assert.deepEqual(ansage([du(3), jarvis(4, "Heute steht ein Termin an.")], STILL, STILL, fertig.stand), { texte: [], stand: { bis: 4, warHoerbar: false } });
  });

  test("will JARVIS sprechen, ist aber nichts zu hören (der Browser hat keine Stimme), wird gewartet und dann doch angesagt", () => {
    const zuege = [du(3), jarvis(4, "Heute steht ein Termin an.")];
    // „Spreche …“, aber kein Ton: noch nichts ansagen, die Antwort aber auch nicht als gehört abhaken.
    const wartet = ansage(zuege, true, STILL, ANSAGE_START);
    assert.deepEqual(wartet, { texte: [], stand: { bis: -1, warHoerbar: false } });
    // Er gibt auf, ohne dass je etwas zu hören war: Jetzt wird angesagt.
    assert.deepEqual(ansage(zuege, STILL, STILL, wartet.stand).texte, [{ id: 4, text: "Heute steht ein Termin an." }]);
  });

  test("das Gespräch von gestern (nach dem Laden zurückgeholt) wird nie angesagt", () => {
    const zuege = [{ ...du(1), alt: true }, jarvis(2, "Notiert: Dübel besorgen.", { alt: true })];
    assert.deepEqual(ansage(zuege, STILL, STILL, ANSAGE_START).texte, []);
    // Eine neue Antwort danach schon.
    assert.deepEqual(ansage([...zuege, du(3), jarvis(4, "Gern.")], STILL, STILL, ANSAGE_START).texte, [{ id: 4, text: "Gern." }]);
  });

  test("was dazukommt, während JARVIS etwas anderes spricht, gilt nicht als gehört und wird danach angesagt", () => {
    // Die Erinnerung wird gesprochen …
    const erinnert = ansage([jarvis(4, "In 15 Minuten: Besprechung.")], true, true, ANSAGE_START);
    assert.equal(erinnert.stand.bis, 4);
    // … und währenddessen kommt die Vorbereitung dazu, die niemand spricht.
    const zuege = [jarvis(4, "In 15 Minuten: Besprechung."), jarvis(5, "Zur Vorbereitung: drei offene Punkte.")];
    const dabei = ansage(zuege, true, true, erinnert.stand);
    assert.deepEqual(dabei, { texte: [], stand: { bis: 4, warHoerbar: true } });
    assert.deepEqual(ansage(zuege, STILL, STILL, dabei.stand).texte, [{ id: 5, text: "Zur Vorbereitung: drei offene Punkte." }]);
  });

  test("mehrere Antworten hintereinander werden alle angesagt, in ihrer Reihenfolge", () => {
    const r = ansage([jarvis(4, "Das Dokument A ist fertig."), jarvis(5, "Das Dokument B ist fertig.")], STILL, STILL, ANSAGE_START);
    assert.deepEqual(r.texte.map((t) => t.id), [4, 5]);
  });

  test("eine fertige Antwort hinter einer, die noch entsteht, wartet: Die Reihenfolge bleibt", () => {
    const zuege = [jarvis(4, "Ich schreibe noch", { live: true }), jarvis(5, "In 15 Minuten: Besprechung.")];
    assert.deepEqual(ansage(zuege, STILL, STILL, ANSAGE_START).texte, []);
    const fertig = [jarvis(4, "Ich bin fertig."), jarvis(5, "In 15 Minuten: Besprechung.")];
    assert.deepEqual(ansage(fertig, STILL, STILL, ANSAGE_START).texte.map((t) => t.id), [4, 5]);
  });

  test("was schon angesagt ist, kommt nicht wieder; dieselben Worte in einer neuen Antwort schon", () => {
    const stand: AnsageStand = { bis: 4, warHoerbar: false };
    assert.deepEqual(ansage([jarvis(4, "Notiert.")], STILL, STILL, stand).texte, []);
    assert.deepEqual(ansage([jarvis(4, "Notiert."), du(5), jarvis(6, "Notiert.")], STILL, STILL, stand).texte, [{ id: 6, text: "Notiert." }]);
  });

  test("spricht JARVIS gleich die nächste Antwort, gilt auch sie erst als gehört, wenn sie wirklich zu hören ist", () => {
    // Antwort 4 war zu hören; die Stimme setzt für Antwort 6 neu an (hoerbar fällt kurz weg).
    const neu = ansage([jarvis(4, "Eins."), du(5), jarvis(6, "Zwei.")], true, STILL, { bis: 4, warHoerbar: true });
    assert.deepEqual(neu, { texte: [], stand: { bis: 4, warHoerbar: false } });
    assert.equal(ansage([jarvis(4, "Eins."), du(5), jarvis(6, "Zwei.")], true, true, neu.stand).stand.bis, 6);
  });

  test("gewartet wird kurz, damit JARVIS zuerst zu sprechen beginnen kann, aber nicht lange", () => {
    assert.ok(ANSAGE_WARTET_MS >= 1000 && ANSAGE_WARTET_MS <= 3000);
  });
});
