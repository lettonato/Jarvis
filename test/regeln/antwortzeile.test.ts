// Die Zeile über der Leiste zeigt die Antwort auf das zuletzt Gesagte, nie die auf eine ältere Frage.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { antwortAufLetztes } from "../../src/lib/brain";

type Zug = { who: "du" | "jarvis"; text: string; live?: boolean };
const du = (text: string): Zug => ({ who: "du", text });
const jarvis = (text: string, live?: boolean): Zug => ({ who: "jarvis", text, ...(live ? { live } : {}) });

describe("Antwortzeile über der Leiste", () => {
  test("zeigt die Antwort auf die letzte Frage", () => {
    assert.equal(antwortAufLetztes([du("A?"), jarvis("A1"), du("B?"), jarvis("B1")])?.text, "B1");
    assert.equal(antwortAufLetztes([]), undefined);
  });

  test("eine Antwort, die gerade entsteht, zählt auch ohne Text", () => {
    assert.equal(antwortAufLetztes([du("A?"), jarvis("A1"), du("B?"), jarvis("", true)])?.live, true);
  });

  test("nach einer angehaltenen Frage steht nicht die Antwort auf die Frage davor da", () => {
    // Sofort angehalten: Es gibt gar keine Antwort.
    assert.equal(antwortAufLetztes([du("A?"), jarvis("A1"), du("B?")]), undefined);
    // Beim Nachdenken angehalten: Die Antwort blieb leer.
    assert.equal(antwortAufLetztes([du("A?"), jarvis("A1"), du("B?"), jarvis(" ")]), undefined);
  });

  test("was JARVIS von sich aus sagt (eine Erinnerung), zählt, auch nach einer Antwort", () => {
    assert.equal(antwortAufLetztes([du("A?"), jarvis("A1"), jarvis("In 10 Minuten: Notar.")])?.text, "In 10 Minuten: Notar.");
    assert.equal(antwortAufLetztes([jarvis("Guten Morgen.")])?.text, "Guten Morgen.");
  });
});
