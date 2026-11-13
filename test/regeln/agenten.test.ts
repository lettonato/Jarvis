// Die Agentensteuerung (src/lib/agenten.ts): Aus dem, was die Agenten melden, entsteht eine Liste mit Zustand,
// Läufen, Kosten und erlaubten Knöpfen. Reine Regeln ohne Netz. Wichtig ist vor allem, was Vorrang hat:
// Der Not-Aus und eine Sperre gehen jedem anderen Zustand vor, und dann lässt sich nichts starten.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { agentenLage, agentenSatz, type AgentenDaten, type AgentLage } from "../../src/lib/agenten";
import type { BrowserStatus } from "../../src/lib/browser";
import type { DocJob, DocsSnapshot } from "../../src/lib/documents";
import type { IntelSnapshot } from "../../src/lib/intel";
import type { KostenPosten, KostenUebersicht } from "../../src/lib/kosten";
import { baueBericht, HINWEIS, type MetalleSnapshot, type TagesKerze } from "../../src/lib/metalle";
import type { DeskSnapshot } from "../../src/lib/paper";
import type { SicherheitsZustand } from "../../src/lib/sicherheit";

const JETZT = new Date(2026, 10, 13, 10, 0);
const frei: SicherheitsZustand = { notaus: { an: false, seit: null, aus_von: null }, sperren: {}, cStrenge: "immer" };

const intel = (extra: Partial<IntelSnapshot> = {}): IntelSnapshot => ({
  configured: true,
  report: { at: "2026-11-13T07:00:00.000Z", mood: "ruhig", summary: "Ruhiger Markt, Bitcoin seitwärts.", items: [], deskWarning: null, topics: [], focus: null, costUsd: 0.4 },
  search: null,
  running: null,
  error: null,
  spentTodayUsd: 0.4,
  budgetUsd: 1,
  topics: [],
  auto: true,
  warning: null,
  nextAt: "2026-11-13T15:00:00.000Z",
  ...extra,
});
const job = (extra: Partial<DocJob> = {}): DocJob => ({
  id: "d1",
  thema: "Goldmarkt",
  auftrag: "",
  from: "mac",
  state: "fertig",
  phase: null,
  startedAt: new Date(2026, 10, 13, 8, 0).toISOString(),
  endedAt: new Date(2026, 10, 13, 8, 12).toISOString(),
  steps: [],
  searches: 5,
  pagesRead: 3,
  costUsd: 2.5,
  title: "Der Goldmarkt 2026",
  points: [],
  sections: 4,
  sources: 6,
  pdf: null,
  html: null,
  note: null,
  error: null,
  ...extra,
});
const dokumente = (jobs: DocJob[], running: DocJob | null = null): DocsSnapshot => ({ configured: true, folder: "/tmp", running, jobs });
const browser = (extra: Partial<BrowserStatus> = {}): BrowserStatus => ({ ready: true, open: false, visible: false, live: false, url: null, title: null, task: null, shotAt: null, error: null, ...extra });
const desk = (status: DeskSnapshot["status"], extra: Partial<DeskSnapshot> = {}): DeskSnapshot =>
  ({ status, statusReason: null, testDay: 3, pnlUsd: 120, lastTickAt: "2026-11-13T08:59:50.000Z", x: { enabled: true, spentTodayUsd: 0.2, budgetUsd: 1 }, ...extra }) as DeskSnapshot;
const posten = (usd: number, anfragen: number): KostenPosten => ({ usd, anfragen, eingabe: 0, ausgabe: 0, suchen: 0 });
// Das Kostenbuch von heute: drei Fragen im Gespräch, ein Schritt im Browser, zwei Bewertungen des Chiefs.
const buch = (heute: KostenUebersicht["heute"] = { gehirn: { claude: posten(0.06, 3) }, browser: { claude: posten(0.12, 1) }, desk: { claude: posten(0.002, 2) } }): KostenUebersicht => ({ heute, heuteUsd: 0, monatUsd: 0, seit: "2026-11-13" });
// Sechzig Handelstage Gold (steigend) und Silber (fallend), die am Vortag enden.
const kerzen = (von: number, bis: number): TagesKerze[] =>
  Array.from({ length: 60 }, (_, i) => {
    const close = von + ((bis - von) * i) / 59;
    return { tag: new Date(Date.UTC(2026, 10, 12) - (59 - i) * 86_400_000).toISOString().slice(0, 10), open: close, high: close, low: close, close };
  });
const bericht = baueBericht({ gold: kerzen(3000, 4000), silber: kerzen(50, 40) }, new Date(JETZT.getTime() - 2 * 3_600_000));
const metalle = (extra: Partial<MetalleSnapshot> = {}): MetalleSnapshot => ({
  eingerichtet: true,
  auto: true,
  zeiten: ["07:30", "17:30"],
  laeuft: false,
  bericht,
  fakten: [],
  einordnung: [],
  hinweis: HINWEIS,
  veraltet: false,
  letzterVersuch: bericht.erstelltAm,
  fehler: null,
  naechsterLauf: new Date(2026, 10, 13, 17, 30).toISOString(),
  ...extra,
});
const daten = (extra: Partial<AgentenDaten> = {}): AgentenDaten => ({ gehirnBereit: true, sicherheit: frei, intel: intel(), metalle: metalle(), documents: dokumente([job()]), browser: browser(), desk: desk("laeuft"), spuren: {}, kosten: buch(), ...extra });
const von = (liste: AgentLage[], name: AgentLage["name"]) => liste.find((a) => a.name === name)!;

describe("Agentensteuerung: Zustand und Läufe", () => {
  test("alle sechs Agenten erscheinen, jeder mit Ansicht, Arbeitsweise und festen Grenzen", () => {
    const liste = agentenLage(daten(), JETZT);
    assert.deepEqual(liste.map((a) => a.name), ["gehirn", "browser", "analyst", "intel", "metalle", "desk"]);
    for (const a of liste) {
      assert.ok(a.href.startsWith("/"), a.name);
      assert.ok(a.takt.length > 0 && a.grenzen.length >= 2, a.name);
    }
    assert.ok(von(liste, "desk").grenzen.some((g) => g.includes("Nur Spielgeld")), "die Spielgeld-Grenze steht immer da");
  });

  test("Intel: wartet nach Zeitplan, mit letztem und nächstem Lauf, Ergebnis und Kosten gegen das Tagesbudget", () => {
    const a = von(agentenLage(daten(), JETZT), "intel");
    assert.equal(a.zustand, "wartet");
    assert.equal(a.letzterLauf, "2026-11-13T07:00:00.000Z");
    assert.equal(a.naechsterLauf, "2026-11-13T15:00:00.000Z");
    assert.equal(a.ergebnis, "Ruhiger Markt, Bitcoin seitwärts.");
    assert.deepEqual(a.kosten, { heuteUsd: 0.4, budgetUsd: 1, was: "Grok (xAI)" });
    assert.deepEqual(a.aktionen, ["starten", "sperren"]);
  });

  test("Intel lässt sich nicht starten, wenn er schon läuft, das Budget aufgebraucht ist oder der Schlüssel fehlt", () => {
    const laeuft = von(agentenLage(daten({ intel: intel({ running: { focus: null, since: JETZT.toISOString() } }) }), JETZT), "intel");
    assert.equal(laeuft.zustand, "laeuft");
    assert.ok(!laeuft.aktionen.includes("starten"));
    const leer = von(agentenLage(daten({ intel: intel({ spentTodayUsd: 0.9, nextAt: null }) }), JETZT), "intel");
    assert.ok(!leer.aktionen.includes("starten"));
    assert.match(leer.satz, /Tagesbudget ist aufgebraucht/);
    const ohne = von(agentenLage(daten({ intel: intel({ configured: false }) }), JETZT), "intel");
    assert.equal(ohne.zustand, "nicht-eingerichtet");
    assert.deepEqual(ohne.aktionen, ["sperren"]);
    assert.equal(ohne.kosten, null);
  });

  test("ein Fehler beim letzten Lauf ist sichtbar: bei Intel, beim Analysten und beim Browser", () => {
    const liste = agentenLage(
      daten({
        intel: intel({ error: "Grok hat nicht geantwortet." }),
        documents: dokumente([job({ state: "fehler", error: "Die Recherche ist abgebrochen.", title: null })]),
        browser: browser({ error: "Chrome ist nicht gestartet." }),
      }),
      JETZT,
    );
    for (const name of ["intel", "analyst", "browser"] as const) assert.equal(von(liste, name).zustand, "fehler", name);
    assert.equal(von(liste, "intel").fehler, "Grok hat nicht geantwortet.");
    assert.equal(von(liste, "analyst").fehler, "Die Recherche ist abgebrochen.");
    assert.equal(von(liste, "analyst").ergebnis, null, "ein gescheitertes Dokument ist kein Ergebnis");
    assert.equal(von(liste, "browser").fehler, "Chrome ist nicht gestartet.");
  });

  test("Analyst: zählt nur die Kosten von heute und zeigt das letzte fertige Dokument", () => {
    const gestern = job({ id: "d0", startedAt: new Date(2026, 10, 12, 9, 0).toISOString(), endedAt: new Date(2026, 10, 12, 9, 20).toISOString(), costUsd: 4, title: "Alt" });
    const laufend = job({ id: "d2", state: "laeuft", phase: "recherchiert", thema: "KI-Wertschöpfungskette", endedAt: null, startedAt: new Date(2026, 10, 13, 9, 50).toISOString(), costUsd: 0.5, title: null });
    const a = von(agentenLage(daten({ documents: dokumente([laufend, job(), gestern], laufend) }), JETZT), "analyst");
    assert.equal(a.zustand, "laeuft");
    assert.match(a.satz, /^Schreibt: KI-Wertschöpfungskette/);
    assert.equal(a.kosten?.heuteUsd, 3);
    assert.equal(a.ergebnis, "Dokument fertig: Der Goldmarkt 2026");
    assert.equal(a.letzterLauf, new Date(2026, 10, 13, 8, 12).toISOString());
  });

  test("Desk: pausieren, wenn er läuft, fortsetzen, wenn er pausiert ist; gestartet wird er hier nicht", () => {
    const laeuft = von(agentenLage(daten(), JETZT), "desk");
    assert.equal(laeuft.zustand, "laeuft");
    assert.deepEqual(laeuft.aktionen, ["pausieren", "sperren"]);
    assert.match(laeuft.ergebnis!, /^\+120,00 \$ Spielgeld, Tag 3 von /);
    const pausiert = von(agentenLage(daten({ desk: desk("pausiert") }), JETZT), "desk");
    assert.deepEqual([pausiert.zustand, pausiert.aktionen], ["pausiert", ["fortsetzen", "sperren"]]);
    const aus = von(agentenLage(daten({ desk: desk("aus") }), JETZT), "desk");
    assert.deepEqual([aus.zustand, aus.aktionen, aus.ergebnis], ["bereit", ["sperren"], null]);
    const limit = von(agentenLage(daten({ desk: desk("tageslimit") }), JETZT), "desk");
    assert.deepEqual([limit.zustand, limit.aktionen], ["pausiert", ["sperren"]], "das Tageslimit lässt sich nicht wegklicken");
  });

  test("ohne Claude-Schlüssel sind Gespräch, Browser und Analyst nicht eingerichtet", () => {
    const liste = agentenLage(daten({ gehirnBereit: false, browser: browser({ ready: false }), documents: { ...dokumente([]), configured: false } }), JETZT);
    for (const name of ["gehirn", "browser", "analyst"] as const) assert.equal(von(liste, name).zustand, "nicht-eingerichtet", name);
  });

  test("fällt die Auskunft eines Agenten aus, stehen die anderen trotzdem da", () => {
    const liste = agentenLage(daten({ intel: null, metalle: null, desk: null, browser: null, documents: null }), JETZT);
    assert.equal(liste.length, 6);
    assert.ok(liste.every((a) => a.zustand === "bereit" && !a.aktionen.includes("starten")));
  });
});

describe("Agentensteuerung: der Edelmetall-Agent", () => {
  test("wartet nach Zeitplan, zeigt das letzte Lagebild in einem Satz und lässt sich von Hand starten", () => {
    const a = von(agentenLage(daten(), JETZT), "metalle");
    assert.deepEqual([a.zustand, a.takt, a.href], ["wartet", "täglich um 07:30 und 17:30 Uhr", "/intel#edelmetalle"]);
    assert.equal(a.letzterLauf, bericht.erstelltAm);
    assert.equal(a.naechsterLauf, new Date(2026, 10, 13, 17, 30).toISOString());
    assert.match(a.ergebnis ?? "", /^Gold 4\.000,00 \$ \(\+0,4 % zum Vortag\), Silber 40,00 \$/);
    assert.deepEqual(a.aktionen, ["starten", "sperren"]);
    assert.deepEqual(a.kosten?.heuteUsd, 0);
    assert.ok(a.grenzen.some((g) => /handelt nicht/.test(g)) && a.grenzen.some((g) => /Keine Prognose/.test(g)));
  });

  test("ohne Twelve-Data-Schlüssel ist er nicht eingerichtet und lässt sich nicht starten", () => {
    const a = von(agentenLage(daten({ metalle: metalle({ eingerichtet: false, bericht: null, naechsterLauf: null }) }), JETZT), "metalle");
    assert.deepEqual([a.zustand, a.aktionen, a.kosten, a.naechsterLauf], ["nicht-eingerichtet", ["sperren"], null, null]);
    assert.match(a.satz, /Twelve-Data-Schlüssel/);
  });

  test("läuft er gerade, meldet er einen Fehler oder liest er nur auf Zuruf, steht das da", () => {
    const laeuft = von(agentenLage(daten({ metalle: metalle({ laeuft: true }) }), JETZT), "metalle");
    assert.deepEqual([laeuft.zustand, laeuft.aktionen], ["laeuft", ["sperren"]]);
    const fehler = von(agentenLage(daten({ metalle: metalle({ fehler: "Twelve Data ist gerade nicht erreichbar." }) }), JETZT), "metalle");
    assert.deepEqual([fehler.zustand, fehler.fehler], ["fehler", "Twelve Data ist gerade nicht erreichbar."]);
    assert.ok(fehler.aktionen.includes("starten"), "nach einem Fehler kann man es von Hand noch einmal versuchen");
    const zuruf = von(agentenLage(daten({ metalle: metalle({ auto: false, naechsterLauf: null }) }), JETZT), "metalle");
    assert.deepEqual([zuruf.zustand, zuruf.takt, zuruf.satz], ["bereit", "nur auf Zuruf", "Liest nur auf Zuruf."]);
  });

  test("ein veraltetes Lagebild ist als veraltet gekennzeichnet", () => {
    const a = von(agentenLage(daten({ metalle: metalle({ veraltet: true }) }), JETZT), "metalle");
    assert.match(a.ergebnis ?? "", /^Veraltet: Gold/);
  });

  test("mit Not-Aus ist auch er angehalten und nicht zu starten", () => {
    const a = von(agentenLage(daten({ sicherheit: { ...frei, notaus: { an: true, seit: JETZT.toISOString(), grund: "Test", von: "mac" } } }), JETZT), "metalle");
    assert.deepEqual([a.zustand, a.aktionen, a.naechsterLauf], ["angehalten", [], null]);
  });
});

describe("Agentensteuerung: Kosten je Agent", () => {
  test("Gespräch und Browser zeigen, was sie heute bei Claude verbraucht haben, mit Modell und Zahl der Anfragen", () => {
    const liste = agentenLage(daten(), JETZT);
    assert.deepEqual(von(liste, "gehirn").kosten, { heuteUsd: 0.06, budgetUsd: null, was: "Claude Opus 5.5, 3 Anfragen heute" });
    assert.deepEqual(von(liste, "browser").kosten, { heuteUsd: 0.12, budgetUsd: null, was: "Claude Opus 5.5, eine Anfrage heute" });
  });

  test("ohne Buchung stehen null Dollar da, nicht „nicht gezählt“; ohne Schlüssel kostet der Agent nichts", () => {
    const leer = agentenLage(daten({ kosten: buch({}) }), JETZT);
    assert.deepEqual(von(leer, "gehirn").kosten, { heuteUsd: 0, budgetUsd: null, was: "Claude Opus 5.5, heute noch keine Anfrage" });
    const ohne = agentenLage(daten({ gehirnBereit: false, browser: browser({ ready: false }) }), JETZT);
    assert.equal(von(ohne, "gehirn").kosten, null);
    assert.equal(von(ohne, "browser").kosten, null);
  });

  test("Desk: Grok mit Tagesbudget und Claude als Chief stehen einzeln da, die Summe hat kein Budget", () => {
    const k = von(agentenLage(daten(), JETZT), "desk").kosten!;
    assert.ok(Math.abs(k.heuteUsd - 0.202) < 1e-9);
    assert.equal(k.budgetUsd, null, "das Budget gilt nur für Grok");
    assert.deepEqual(k.posten, [
      { was: "Grok liest X vor Käufen", usd: 0.2, budgetUsd: 1 },
      { was: "Claude Haiku 5.5 bewertet die Coins, 2 Anfragen heute", usd: 0.002, budgetUsd: null },
    ]);
  });

  test("Desk mit nur einem Dienst zeigt nur diesen; ohne beide kostet er nichts", () => {
    const nurGrok = von(agentenLage(daten({ gehirnBereit: false, kosten: buch({}) }), JETZT), "desk").kosten;
    assert.deepEqual(nurGrok, { heuteUsd: 0.2, budgetUsd: 1, was: "Grok liest X vor Käufen" });
    const ohneX = desk("laeuft", { x: { enabled: false, spentTodayUsd: 0, budgetUsd: 1 } } as Partial<DeskSnapshot>);
    const nurClaude = von(agentenLage(daten({ desk: ohneX }), JETZT), "desk").kosten;
    assert.deepEqual(nurClaude, { heuteUsd: 0.002, budgetUsd: null, was: "Claude Haiku 5.5 bewertet die Coins, 2 Anfragen heute" });
    assert.equal(von(agentenLage(daten({ desk: ohneX, gehirnBereit: false, kosten: buch({}) }), JETZT), "desk").kosten, null);
  });

  test("Desk: ist er nicht gestartet und hat heute nichts bewertet, steht keine Claude-Zeile da; Gebuchtes bleibt sichtbar, auch ohne Schlüssel", () => {
    const ohneX = (status: DeskSnapshot["status"]) => desk(status, { x: { enabled: false, spentTodayUsd: 0, budgetUsd: 1 } } as Partial<DeskSnapshot>);
    assert.equal(von(agentenLage(daten({ desk: ohneX("aus"), kosten: buch({}) }), JETZT), "desk").kosten, null, "aus und nichts gebucht: kostet nichts");
    assert.equal(von(agentenLage(daten({ desk: ohneX("aus") }), JETZT), "desk").kosten?.heuteUsd, 0.002, "aus, aber heute schon bewertet");
    assert.equal(von(agentenLage(daten({ desk: ohneX("laeuft"), gehirnBereit: false }), JETZT), "desk").kosten?.heuteUsd, 0.002, "Schlüssel entfernt, das Gebuchte bleibt");
    assert.equal(von(agentenLage(daten({ desk: ohneX("laeuft"), kosten: buch({}) }), JETZT), "desk").kosten?.heuteUsd, 0, "läuft mit Claude: null Dollar statt keiner Zahl");
  });

  test("lässt sich das Kostenbuch nicht lesen, steht bei Gespräch und Browser keine Zahl statt einer falschen; Intel und Analyst zählen weiter selbst", () => {
    const liste = agentenLage(daten({ kosten: null }), JETZT);
    assert.equal(von(liste, "gehirn").kosten, null);
    assert.equal(von(liste, "browser").kosten, null);
    assert.equal(von(liste, "intel").kosten?.heuteUsd, 0.4);
    assert.equal(von(liste, "analyst").kosten?.heuteUsd, 2.5);
    assert.deepEqual(von(liste, "desk").kosten, { heuteUsd: 0.2, budgetUsd: 1, was: "Grok liest X vor Käufen" });
  });
});

describe("Agentensteuerung: Not-Aus und Sperren gehen vor", () => {
  test("steht der Not-Aus, sind alle angehalten, nichts hat einen nächsten Lauf und kein Knopf wird angeboten", () => {
    const liste = agentenLage(daten({ sicherheit: { ...frei, notaus: { an: true, seit: JETZT.toISOString(), grund: "Test", von: "mac" } }, intel: intel({ running: { focus: null, since: JETZT.toISOString() } }) }), JETZT);
    for (const a of liste) {
      assert.equal(a.zustand, "angehalten", a.name);
      assert.deepEqual(a.aktionen, [], a.name);
      assert.equal(a.naechsterLauf, null, a.name);
    }
    assert.equal(agentenSatz(liste), "Der Not-Aus steht, alle Agenten sind angehalten.");
  });

  test("ein gesperrter Agent zeigt „gesperrt“ mit Grund und bietet nur Entsperren an, auch wenn er sonst startbar wäre", () => {
    const liste = agentenLage(daten({ sicherheit: { ...frei, sperren: { intel: { seit: JETZT.toISOString(), grund: "zu teuer" } } } }), JETZT);
    const a = von(liste, "intel");
    assert.equal(a.zustand, "gesperrt");
    assert.equal(a.satz, "Gesperrt: zu teuer.");
    assert.deepEqual(a.aktionen, ["entsperren"]);
    assert.equal(a.naechsterLauf, null);
    assert.equal(von(liste, "desk").zustand, "laeuft", "die anderen arbeiten weiter");
  });
});

describe("Agentensteuerung: gesprochen", () => {
  test("erst was nicht stimmt, dann was läuft", () => {
    const liste = agentenLage(daten({ intel: intel({ error: "Grok hat nicht geantwortet." }), sicherheit: { ...frei, sperren: { browser: { seit: JETZT.toISOString(), grund: "" } } } }), JETZT);
    assert.equal(agentenSatz(liste), "Intel meldet einen Fehler: Grok hat nicht geantwortet. Browser-Agent ist gesperrt. Spielgeld-Desk: Sucht und handelt mit Spielgeld. Die übrigen sind bereit.");
  });

  test("ist alles ruhig, sagt JARVIS das in einem Satz", () => {
    assert.equal(agentenSatz(agentenLage(daten({ desk: desk("aus") }), JETZT)), "Alle Agenten sind bereit, gerade arbeitet keiner.");
  });
});
