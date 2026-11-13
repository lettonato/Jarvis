// Der gemeinsame Zeitplan (src/lib/zeitplan.ts): wann ein Lauf zu festen Uhrzeiten fällig ist und wann der
// nächste kommt. Reine Regeln ohne Uhr und ohne Netz; der Taktgeber dazu steht in src/lib/server/zeitplan.ts.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { faelligerTermin, naechsterTermin, saeubereZeiten, taktText } from "../../src/lib/zeitplan";

// Ortszeit des Rechners, damit die Uhrzeiten im Test dieselben sind wie in den Einstellungen.
const um = (tag: number, stunde: number, minute = 0) => new Date(2026, 8, tag, stunde, minute, 0, 0);
const FENSTER = 2 * 60 * 60_000;

describe("Zeitplan: Uhrzeiten aus den Einstellungen", () => {
  test("nur gültige Uhrzeiten bleiben, sortiert und ohne Doppelte, höchstens vier", () => {
    assert.deepEqual(saeubereZeiten(["17:30", "07:30", "07:30", "25:00", "7:5", 12, null, " 09:00 "]), ["07:30", "09:00", "17:30"]);
    assert.deepEqual(saeubereZeiten(["01:00", "02:00", "03:00", "04:00", "05:00"]), ["01:00", "02:00", "03:00", "04:00"]);
    assert.deepEqual(saeubereZeiten("07:30"), []);
    assert.deepEqual(saeubereZeiten(undefined), []);
  });

  test("der Takt steht als Satzteil da", () => {
    assert.equal(taktText([]), "kein Zeitplan");
    assert.equal(taktText(["07:30"]), "täglich um 07:30 Uhr");
    assert.equal(taktText(["07:30", "17:30"]), "täglich um 07:30 und 17:30 Uhr");
    assert.equal(taktText(["07:30", "12:00", "17:30"]), "täglich um 07:30, 12:00 und 17:30 Uhr");
  });
});

describe("Zeitplan: der nächste Termin", () => {
  test("heute, wenn noch eine Uhrzeit kommt, sonst die erste von morgen", () => {
    assert.equal(naechsterTermin(["07:30", "17:30"], um(4, 6))?.getTime(), um(4, 7, 30).getTime());
    assert.equal(naechsterTermin(["07:30", "17:30"], um(4, 7, 30))?.getTime(), um(4, 17, 30).getTime(), "genau zur Uhrzeit zählt schon der nächste");
    assert.equal(naechsterTermin(["07:30", "17:30"], um(4, 18))?.getTime(), um(5, 7, 30).getTime());
    assert.equal(naechsterTermin(["18:00", "07:30"], um(4, 6))?.getTime(), um(4, 7, 30).getTime(), "auch aus einer unsortierten Liste die früheste");
    assert.equal(naechsterTermin([], um(4, 6)), null);
  });
});

describe("Zeitplan: ist ein Lauf fällig?", () => {
  const zeiten = ["07:30", "17:30"];

  test("vor der Uhrzeit nicht, ab der Uhrzeit ja", () => {
    assert.equal(faelligerTermin(zeiten, um(4, 7, 29), null, FENSTER), null);
    assert.equal(faelligerTermin(zeiten, um(4, 7, 30), null, FENSTER)?.getTime(), um(4, 7, 30).getTime());
  });

  test("ein Termin läuft nur einmal: Nach dem Lauf ist er erledigt, der nächste kommt zur nächsten Uhrzeit", () => {
    assert.equal(faelligerTermin(zeiten, um(4, 7, 45), um(4, 7, 31), FENSTER), null);
    assert.equal(faelligerTermin(zeiten, um(4, 17, 30), um(4, 7, 31), FENSTER)?.getTime(), um(4, 17, 30).getTime());
  });

  test("hat der Mac zur Uhrzeit geschlafen, wird im Fenster nachgeholt, danach nicht mehr", () => {
    assert.equal(faelligerTermin(zeiten, um(4, 9, 29), null, FENSTER)?.getTime(), um(4, 7, 30).getTime());
    assert.equal(faelligerTermin(zeiten, um(4, 9, 30), null, FENSTER), null, "zwei Stunden später ist es zu spät");
    assert.equal(faelligerTermin(zeiten, um(5, 6), um(3, 17, 31), FENSTER), null, "ein verpasster Tag wird nicht am nächsten Morgen nachgeholt");
  });

  test("das Nachholen reicht über Mitternacht: ein Termin um 23:30 gilt bis 01:30", () => {
    const spaet = ["07:30", "23:30"];
    assert.equal(faelligerTermin(spaet, um(5, 0, 10), null, FENSTER)?.getTime(), um(4, 23, 30).getTime());
    assert.equal(faelligerTermin(spaet, um(5, 0, 10), um(4, 23, 31), FENSTER), null, "schon gelaufen");
    assert.equal(faelligerTermin(spaet, um(5, 1, 30), null, FENSTER), null, "zwei Stunden später ist es auch hier zu spät");
  });

  test("ein Lauf von Hand kurz vor der Uhrzeit ersetzt den Termin nicht, einer danach schon", () => {
    assert.equal(faelligerTermin(zeiten, um(4, 7, 30), um(4, 7, 10), FENSTER)?.getTime(), um(4, 7, 30).getTime());
    assert.equal(faelligerTermin(zeiten, um(4, 7, 50), um(4, 7, 40), FENSTER), null);
  });

  test("ohne Uhrzeiten ist nie etwas fällig", () => {
    assert.equal(faelligerTermin([], um(4, 12), null, FENSTER), null);
  });
});
