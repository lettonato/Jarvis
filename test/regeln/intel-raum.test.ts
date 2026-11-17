// Was der Raum Intel sagt, wenn etwas nicht geht: Das Tagesbudget reicht nicht mehr, oder ein Thema gibt es schon.
// Die Seite soll das sagen, statt Knöpfe nur grau zu zeigen oder etwas zu bestätigen, das nicht geschehen ist.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { BASE_TOPICS, budgetHinweis, budgetReicht, cleanTopics, MAX_TOPICS, themaDazu, type IntelSnapshot } from "../../src/lib/intel";

const stand = (teil: Partial<IntelSnapshot>): IntelSnapshot => ({ configured: true, report: null, search: null, running: null, error: null, spentTodayUsd: 0, budgetUsd: 1, topics: [], auto: false, warning: null, nextAt: null, ...teil });

describe("Raum Intel: Tagesbudget", () => {
  test("solange es für ein Lagebild reicht, steht nichts da", () => {
    assert.equal(budgetHinweis(stand({ spentTodayUsd: 0 })), null);
    assert.equal(budgetHinweis(stand({ spentTodayUsd: 0.6 })), null, "genau 0,40 übrig reicht noch");
    assert.equal(budgetHinweis(null), null);
    assert.equal(budgetHinweis(stand({ configured: false, spentTodayUsd: 5 })), null, "ohne Schlüssel ist das Budget nicht das Problem");
  });

  test("reicht es nicht mehr, nennt die Seite, was übrig ist und was ein Lagebild kostet", () => {
    assert.equal(
      budgetHinweis(stand({ spentTodayUsd: 0.76 })),
      "Für heute reicht das Tagesbudget nicht mehr für ein weiteres Lagebild oder eine Suche: Übrig sind 0,24 $, nötig sind etwa 0,40 $. Morgen geht es weiter; sofort geht es mit einem höheren Tagesbudget unten bei „Deine Themen“.",
    );
    assert.match(budgetHinweis(stand({ spentTodayUsd: 1.3 }))!, /Übrig sind 0,00 \$/, "mehr ausgegeben als geplant heißt nicht „minus“");
  });

  test("was übrig ist, wird abgerundet: Nie steht da „übrig 0,40 $, nötig 0,40 $“", () => {
    assert.match(budgetHinweis(stand({ spentTodayUsd: 0.603 }))!, /Übrig sind 0,39 \$, nötig sind etwa 0,40 \$/);
    assert.match(budgetHinweis(stand({ spentTodayUsd: 0.60001 }))!, /Übrig sind 0,39 \$/);
    assert.match(budgetHinweis(stand({ budgetUsd: 3, spentTodayUsd: 2.76 }))!, /Übrig sind 0,24 \$/);
  });

  test("ein Rechenrest im Billionstel macht aus genau 0,40 $ kein „reicht nicht“", () => {
    assert.ok(3 - 2.6 < 0.4, "so rechnet der Rechner: 3 minus 2,60 ist eine Spur weniger als 0,40");
    assert.equal(budgetReicht(3 - 2.6), true);
    assert.equal(budgetHinweis(stand({ budgetUsd: 3, spentTodayUsd: 2.6 })), null);
    assert.equal(budgetReicht(0.39999), false);
    assert.equal(budgetReicht(0.4), true);
  });

  test("steht das Tagesbudget schon am Höchstwert, rät die Seite nicht zu einem höheren", () => {
    const text = budgetHinweis(stand({ budgetUsd: 10, spentTodayUsd: 9.8 }))!;
    assert.match(text, /Übrig sind 0,20 \$, nötig sind etwa 0,40 \$\. Morgen geht es weiter\.$/);
    assert.doesNotMatch(text, /höheren Tagesbudget/);
    assert.match(budgetHinweis(stand({ budgetUsd: 9.9, spentTodayUsd: 9.8 }))!, /höheren Tagesbudget/);
  });
});

describe("Raum Intel: ein Thema dazu", () => {
  test("ein neues Thema kommt bereinigt hinten an", () => {
    assert.deepEqual(themaDazu(["Rosenheim"], "  Tesla "), { topics: ["Rosenheim", "Tesla"], name: "Tesla" });
    assert.deepEqual(themaDazu([], "<b>Stahl</b> {x}"), { topics: ["b Stahl /b x"], name: "b Stahl /b x" });
  });

  test("ein festes Thema oder eines, das es schon gibt, kommt nicht doppelt dazu", () => {
    assert.deepEqual(themaDazu(["Rosenheim"], "bitcoin"), { fehler: "„bitcoin“ gibt es schon." });
    assert.deepEqual(themaDazu(["Rosenheim"], "ROSENHEIM"), { fehler: "„ROSENHEIM“ gibt es schon." });
  });

  test("bleibt nach dem Bereinigen nichts übrig, ist es kein Thema", () => {
    assert.deepEqual(themaDazu([], " <> "), { fehler: "Das ist kein Thema." });
    assert.deepEqual(themaDazu([], ""), { fehler: "Das ist kein Thema." });
  });

  test("mehr als sechs eigene Themen gibt es nicht", () => {
    assert.deepEqual(themaDazu(["1", "2", "3", "4", "5", "6"], "Sieben"), { fehler: "Mehr als 6 eigene Themen gehen nicht. Nimm erst eines heraus." });
  });

  test("die Seite und das Speichern sind sich einig: Was die Seite annimmt, speichert der Server genau so, was sie ablehnt, hätte er verworfen", () => {
    const eigene = [[], ["Rosenheim"], ["Rosenheim", "Tesla", "Stahl", "Wärmepumpe", "Zinsen"], ["a", "b", "c", "d", "e", "f"].slice(0, MAX_TOPICS)];
    const eingaben = ["Tesla", " tesla ", BASE_TOPICS[0], BASE_TOPICS[0].toUpperCase(), "<b>Stahl</b>", "stahl", " <> ", "", "x".repeat(60), "Neu\nes  Thema", "g"];
    for (const liste of eigene) {
      for (const eingabe of eingaben) {
        const seite = themaDazu(liste, eingabe);
        const server = cleanTopics([...liste, eingabe]);
        if ("fehler" in seite) assert.deepEqual(server, cleanTopics(liste), `abgelehnt, also ändert auch das Speichern nichts: ${JSON.stringify(eingabe)} zu ${JSON.stringify(liste)}`);
        else assert.deepEqual(server, seite.topics, `angenommen, also speichert der Server dasselbe: ${JSON.stringify(eingabe)} zu ${JSON.stringify(liste)}`);
      }
    }
  });
});
