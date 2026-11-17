// Die Suche nach einem Projekt über einen Teil seines Namens (findeProjekt in src/lib/projekte.ts).
// Sie darf nur ganze Wörter treffen: Ein Projekt „IT“ steckt nicht in „Weiterbildung Mitarbeiter“.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { findeProjekt } from "../../src/lib/projekte";

const p = (id: string, name: string, stichworte: string[] = []) => ({ id, name, stichworte });

describe("Projektsuche", () => {
  test("genauer Name, Nummer und Stichwort treffen wie bisher", () => {
    const liste = [p("1", "Hallenneubau Nord", ["Halle"]), p("2", "KI-Dashboard")];
    assert.equal(findeProjekt(liste, "hallenneubau nord")?.id, "1");
    assert.equal(findeProjekt(liste, "2")?.id, "2");
    assert.equal(findeProjekt(liste, "Halle")?.id, "1");
    assert.equal(findeProjekt(liste, "ki dashboard")?.id, "2");
  });

  test("ein eindeutiges ganzes Wort aus dem Namen reicht", () => {
    const liste = [p("1", "Hallenneubau Nord"), p("2", "KI-Dashboard")];
    assert.equal(findeProjekt(liste, "Dashboard")?.id, "2");
    assert.equal(findeProjekt(liste, "Hallenneubau")?.id, "1");
    assert.equal(findeProjekt(liste, "Projekt Hallenneubau Nord besprechen")?.id, "1", "Name steckt als ganze Wörter im Gesuchten");
  });

  test("ein kurzer Projektname steckt nicht in fremden Wörtern", () => {
    const liste = [p("1", "IT"), p("2", "KI")];
    assert.equal(findeProjekt(liste, "Weiterbildung Mitarbeiter"), null, "„it“ in „Weiterbildung“ ist kein Treffer");
    assert.equal(findeProjekt(liste, "Kita Neubau"), null, "„ki“ und „it“ in „Kita“ sind keine Treffer");
    assert.equal(findeProjekt(liste, "IT")?.id, "1", "der genaue Name trifft weiter");
  });

  test("ein Wortanfang ist kein Treffer", () => {
    const liste = [p("1", "Hallenneubau Nord")];
    assert.equal(findeProjekt(liste, "Hall"), null);
    assert.equal(findeProjekt(liste, "Nordsee"), null);
  });

  test("mehrere Treffer sind keiner", () => {
    const liste = [p("1", "Halle Nord"), p("2", "Halle Süd")];
    assert.equal(findeProjekt(liste, "Halle"), null);
  });
});
