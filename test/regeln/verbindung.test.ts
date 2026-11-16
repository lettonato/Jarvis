// Antwortet JARVIS überhaupt (src/lib/verbindung.ts)? Fällt er aus, nachdem ein Raum schon gelesen war, blieb der
// alte Stand bisher ohne ein Wort stehen. Jede Anfrage der Seite meldet jetzt, ob eine Antwort kam; daraus wird der
// Hinweis oben in jeder Ansicht. Reine Regeln mit gestellter Uhr, jede Prüfung mit einer frischen Verbindung.

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { AUS_NACH_MS, neueVerbindung, OHNE_ANTWORT_MS, VERBUNDEN } from "../../src/lib/verbindung";

const START = new Date(2026, 10, 16, 12, 8).getTime();
const vor = (ms: number) => mock.timers.tick(ms);

beforeEach(() => mock.timers.enable({ apis: ["Date"], now: START }));
afterEach(() => mock.timers.reset());

// Eine Anfrage, die jetzt losgeht und ohne Antwort bleibt.
const scheitert = (v: ReturnType<typeof neueVerbindung>) => v.meldeKeineAntwort(Date.now());

describe("Antwortet JARVIS?", () => {
  test("am Anfang gilt er als da", () => {
    assert.deepEqual(neueVerbindung().verbindungJetzt(), { aus: false, seit: null });
    assert.equal(neueVerbindung().verbindungJetzt(), VERBUNDEN);
  });

  test("ein Fehlschlag ist noch kein Ausfall; der nächste zehn Sekunden später ist einer, mit der Zeit der letzten Antwort", () => {
    const v = neueVerbindung();
    let meldungen = 0;
    v.abonniereVerbindung(() => meldungen++);
    v.meldeAntwort();
    vor(10_000);
    scheitert(v);
    assert.equal(v.verbindungJetzt(), VERBUNDEN, "ein Stolperer ist kein Ausfall");
    assert.equal(meldungen, 0);
    vor(10_000);
    scheitert(v);
    assert.deepEqual(v.verbindungJetzt(), { aus: true, seit: START });
    assert.equal(meldungen, 1);
    // Weitere Fehlschläge sind nichts Neues: dasselbe Objekt, keine Meldung.
    const bild = v.verbindungJetzt();
    vor(10_000);
    scheitert(v);
    assert.equal(v.verbindungJetzt(), bild);
    assert.equal(meldungen, 1);
  });

  test("die erste Antwort beendet den Ausfall, und danach zählt es wieder von vorn", () => {
    const v = neueVerbindung();
    let meldungen = 0;
    const ab = v.abonniereVerbindung(() => meldungen++);
    v.meldeAntwort();
    vor(10_000);
    scheitert(v);
    vor(10_000);
    scheitert(v);
    assert.equal(v.verbindungJetzt().aus, true);
    vor(60_000);
    v.meldeAntwort();
    assert.equal(v.verbindungJetzt(), VERBUNDEN);
    assert.equal(meldungen, 2);
    vor(60_000);
    scheitert(v);
    assert.equal(v.verbindungJetzt(), VERBUNDEN, "wieder nur ein Stolperer");
    // Wer nicht mehr zuhört, erfährt nichts mehr.
    ab();
    vor(AUS_NACH_MS);
    scheitert(v);
    assert.deepEqual(v.verbindungJetzt(), { aus: true, seit: START + 80_000 });
    assert.equal(meldungen, 2);
  });

  test("viele Fehlschläge im selben Augenblick sind kein Ausfall: Zwischen dem ersten und dem, der zählt, liegen acht Sekunden", () => {
    const v = neueVerbindung();
    v.meldeAntwort();
    vor(30_000);
    // Ein Raum fragt mehrere Stellen zugleich, und jemand klickt ein paarmal schnell auf „Neu laden“.
    for (let i = 0; i < 5; i++) scheitert(v);
    for (let i = 0; i < 7; i++) {
      vor(1_000);
      scheitert(v);
      assert.equal(v.verbindungJetzt(), VERBUNDEN, `${i + 1} Sekunden nach dem ersten`);
    }
    vor(999);
    scheitert(v);
    assert.equal(v.verbindungJetzt(), VERBUNDEN);
    vor(1);
    scheitert(v);
    assert.deepEqual(v.verbindungJetzt(), { aus: true, seit: START }, "nach acht Sekunden");
  });

  test("die Zeit, die der Mac geschlafen hat, zählt nicht: Nach dem Aufwachen braucht es wieder zwei Fehlschläge mit Abstand", () => {
    const v = neueVerbindung();
    v.meldeAntwort();
    vor(8 * 3_600_000);
    // Beim Aufwachen feuern alle Uhren zugleich, das Netz ist noch nicht da.
    scheitert(v);
    scheitert(v);
    scheitert(v);
    assert.equal(v.verbindungJetzt(), VERBUNDEN);
    vor(AUS_NACH_MS - 1);
    scheitert(v);
    assert.equal(v.verbindungJetzt(), VERBUNDEN);
    v.meldeAntwort();
    assert.equal(v.verbindungJetzt(), VERBUNDEN);
  });

  test("antwortet JARVIS anderswo, ist er da: Eine einzelne Stelle, die immer wieder scheitert, ist kein Ausfall", () => {
    const v = neueVerbindung();
    // Die schnellsten Abfragen kommen alle zehn Sekunden und werden beantwortet; dazwischen scheitert eine andere
    // Stelle immer wieder, auch mit mehr als acht Sekunden Abstand (kurz nach einer Antwort und kurz vor der
    // nächsten).
    for (let i = 0; i < 12; i++) {
      v.meldeAntwort();
      vor(200);
      scheitert(v);
      vor(9_700);
      scheitert(v);
      assert.equal(v.verbindungJetzt(), VERBUNDEN, "die letzte Antwort ist keine zwölf Sekunden her");
      vor(100);
    }
  });

  test("zwei Fehlschläge mit Abstand reichen erst, wenn JARVIS seit zwölf Sekunden nicht geantwortet hat", () => {
    const v = neueVerbindung();
    v.meldeAntwort();
    vor(1_000);
    scheitert(v);
    vor(AUS_NACH_MS);
    scheitert(v);
    assert.equal(v.verbindungJetzt(), VERBUNDEN, "neun Sekunden nach der letzten Antwort");
    vor(OHNE_ANTWORT_MS - AUS_NACH_MS - 1_000 - 1);
    scheitert(v);
    assert.equal(v.verbindungJetzt(), VERBUNDEN);
    vor(1);
    scheitert(v);
    assert.deepEqual(v.verbindungJetzt(), { aus: true, seit: START });
  });

  test("eine Anfrage, die vor der letzten Antwort begonnen hat, zählt nicht", () => {
    const v = neueVerbindung();
    v.meldeAntwort();
    // Der Kalender braucht sehr lange; inzwischen antwortet JARVIS anderswo. Dann laufen die alten Anfragen ab.
    const begonnen = Date.now();
    vor(30_000);
    v.meldeAntwort();
    v.meldeKeineAntwort(begonnen);
    vor(OHNE_ANTWORT_MS);
    v.meldeKeineAntwort(begonnen + 10_000);
    v.meldeKeineAntwort(begonnen + 20_000);
    assert.equal(v.verbindungJetzt(), VERBUNDEN, "drei alte Anfragen, zwölf Sekunden auseinander und zwölf Sekunden nach der letzten Antwort");
    // Eine, die danach begonnen hat, zählt; die alten davor haben die Zeit nicht schon laufen lassen.
    scheitert(v);
    assert.equal(v.verbindungJetzt(), VERBUNDEN, "das war der erste Fehlschlag, der zählt");
    vor(AUS_NACH_MS);
    scheitert(v);
    assert.deepEqual(v.verbindungJetzt(), { aus: true, seit: START + 30_000 });
  });

  test("hat JARVIS in diesem Besuch noch nie geantwortet, gilt dasselbe, und der Hinweis nennt dann keine Uhrzeit", () => {
    const v = neueVerbindung();
    // Die Seite geht auf, und JARVIS ist nicht da: Jeder Raum fragt sofort, alles scheitert zugleich.
    scheitert(v);
    scheitert(v);
    scheitert(v);
    assert.equal(v.verbindungJetzt(), VERBUNDEN, "im ersten Augenblick sagt das noch nichts");
    vor(5_000);
    scheitert(v);
    assert.equal(v.verbindungJetzt(), VERBUNDEN);
    vor(AUS_NACH_MS - 5_000);
    scheitert(v);
    assert.deepEqual(v.verbindungJetzt(), { aus: true, seit: null });
    // Die erste Antwort überhaupt beendet es.
    v.meldeAntwort();
    assert.equal(v.verbindungJetzt(), VERBUNDEN);
  });

  test("jede Verbindung zählt für sich", () => {
    const a = neueVerbindung();
    const b = neueVerbindung();
    scheitert(a);
    vor(AUS_NACH_MS);
    scheitert(a);
    assert.equal(a.verbindungJetzt().aus, true);
    assert.equal(b.verbindungJetzt(), VERBUNDEN);
    scheitert(b);
    assert.equal(b.verbindungJetzt(), VERBUNDEN);
  });
});
