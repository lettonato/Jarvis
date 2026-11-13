// Die Agentensteuerung (src/lib/agenten.ts): Aus dem, was die Agenten melden, entsteht eine Liste mit Zustand,
// Läufen, Kosten und erlaubten Knöpfen. Reine Regeln ohne Netz. Wichtig ist vor allem, was Vorrang hat:
// Der Not-Aus und eine Sperre gehen jedem anderen Zustand vor, und dann lässt sich nichts starten.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { agentenLage, agentenSatz, type AgentenDaten, type AgentLage } from "../../src/lib/agenten";
import type { BrowserStatus } from "../../src/lib/browser";
import type { DocJob, DocsSnapshot } from "../../src/lib/documents";
import type { IntelSnapshot } from "../../src/lib/intel";
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
const daten = (extra: Partial<AgentenDaten> = {}): AgentenDaten => ({ gehirnBereit: true, sicherheit: frei, intel: intel(), documents: dokumente([job()]), browser: browser(), desk: desk("laeuft"), spuren: {}, ...extra });
const von = (liste: AgentLage[], name: AgentLage["name"]) => liste.find((a) => a.name === name)!;

describe("Agentensteuerung: Zustand und Läufe", () => {
  test("alle fünf Agenten erscheinen, jeder mit Ansicht, Arbeitsweise und festen Grenzen", () => {
    const liste = agentenLage(daten(), JETZT);
    assert.deepEqual(liste.map((a) => a.name), ["gehirn", "browser", "analyst", "intel", "desk"]);
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
    const liste = agentenLage(daten({ intel: null, desk: null, browser: null, documents: null }), JETZT);
    assert.equal(liste.length, 5);
    assert.ok(liste.every((a) => a.zustand === "bereit" && !a.aktionen.includes("starten")));
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
