// Kleine Regeln für Texte, die überall stehen: Prozente mit echtem Minuszeichen, Einzahl und Mehrzahl,
// und Meldungen, die als ganzer Satz enden.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { alsSatz, anzahl, formatPct } from "../../src/lib/format";
import { docCaption, docDoneSentence, type DocJob } from "../../src/lib/documents";
import { renderDocument } from "../../src/lib/server/document-html";
import { checkDocument } from "../../src/lib/documents";

describe("Prozente", () => {
  test("ein Minus ist ein Minuszeichen, kein Bindestrich (wie bei den Beträgen)", () => {
    assert.equal(formatPct(-2), "−2 %");
    assert.equal(formatPct(-0.74), "−0,7 %");
    assert.equal(formatPct(3.21), "+3,2 %");
    assert.ok(!formatPct(-12.5).includes("-"));
  });
});

describe("Einzahl und Mehrzahl", () => {
  test("eins steht in der Einzahl, alles andere in der Mehrzahl", () => {
    assert.equal(anzahl(1, "Abschnitt", "Abschnitte"), "1 Abschnitt");
    assert.equal(anzahl(0, "Abschnitt", "Abschnitte"), "0 Abschnitte");
    assert.equal(anzahl(2, "Quelle", "Quellen"), "2 Quellen");
    assert.equal(anzahl(1200, "Suche", "Suchen"), "1.200 Suchen");
  });

  const job = (teil: Partial<DocJob>): DocJob => ({ id: "d1", thema: "Stahl", auftrag: "", from: "mac", state: "fertig", phase: null, startedAt: "2026-11-15T10:00:00.000Z", endedAt: "2026-11-15T10:01:00.000Z", steps: [], searches: 1, pagesRead: 1, costUsd: 0.5, title: "Stahlmarkt", points: [], sections: 1, sources: 1, pdf: "/x/a.pdf", html: "/x/a.html", fallback: false, error: null, ...teil }) as DocJob;

  test("ein Dokument mit einem Abschnitt und einer Quelle heißt auch so (Satz und Nachricht aufs Handy)", () => {
    assert.match(docDoneSentence(job({}), true), /ist fertig: 1 Abschnitt mit 1 Quelle\. /);
    assert.match(docDoneSentence(job({ sections: 7, sources: 12 }), true), /ist fertig: 7 Abschnitte mit 12 Quellen\. /);
    assert.match(docCaption(job({})), /\n1 Abschnitt, 1 Quelle · /);
    assert.match(docCaption(job({ sections: 3, sources: 1 })), /\n3 Abschnitte, 1 Quelle · /);
  });

  test("auch im Dokument selbst (Zeile unter dem Titel)", () => {
    const geprueft = checkDocument({
      titel: "Stahlmarkt",
      untertitel: "",
      kernaussagen: ["Stahl wird teurer [1]."],
      abschnitte: [{ ueberschrift: "Lage", absaetze: ["Die Preise steigen [1]."] }],
      quellen: [{ titel: "Testblatt", url: "https://example.com/a" }],
    });
    assert.ok(geprueft.ok, geprueft.ok ? "" : geprueft.problems.join(" "));
    if (!geprueft.ok) return;
    const seite = renderDocument(geprueft.doc, { date: new Date(2026, 10, 15), model: "Testmodell" });
    assert.match(seite, /· 1 Abschnitt · 1 Quelle · recherchiert im Web/);
  });
});

describe("Meldungen als ganzer Satz", () => {
  test("ein Satz ohne Schlusszeichen bekommt einen Punkt", () => {
    assert.equal(alsSatz("Grok hat keinen lesbaren Bericht geliefert"), "Grok hat keinen lesbaren Bericht geliefert.");
    assert.equal(alsSatz("xAI bremst gerade, zu viele Anfragen "), "xAI bremst gerade, zu viele Anfragen.");
  });

  test("was schon endet, bleibt, wie es ist", () => {
    for (const satz of ["Schon fertig.", "Wirklich?", "Achtung!", "Und so weiter …", "Er sagte „Stopp.“", "(in Klammern.)"]) assert.equal(alsSatz(satz), satz);
    assert.equal(alsSatz(""), "");
    assert.equal(alsSatz("  "), "");
  });
});
