// Das Kostenbuch (src/lib/server/kosten.ts) gegen die echten Module, mit nachgebautem Claude. Geprüft wird:
// Jede bezahlte Anfrage landet beim richtigen Agenten und Tag, im Buch stehen nur Zahlen, eine kaputte Datei
// wird beiseitegelegt statt überschrieben, und die Agentensteuerung zeigt die Kosten von Gespräch, Browser und
// Desk. Echte Kosten entstehen nicht: Der Claude hier ist nachgebaut.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { sichereUmgebung } from "../helfer/umgebung";
import { starteClaudeMock, type ClaudeMock } from "../mocks/claude-mock";

const ordner = sichereUmgebung("kosten");
const DATEI = path.join(ordner, "kosten.json");
// Feste Tage weit weg vom echten Heute, damit sich die Buchungen der Agenten weiter unten nicht hineinmischen.
const HEUTE = new Date(2026, 8, 13, 10, 0);
const GESTERN = new Date(2026, 8, 12, 23, 30);
const AUGUST = new Date(2026, 7, 31, 12, 0);
// Eine Antwort des nachgebauten Claude: 10 Token Eingabe, 5 Token Ausgabe.
const OPUS_ANTWORT_USD = (10 * 4 + 5 * 20) / 1e6;
const HAIKU_ANTWORT_USD = (10 * 0.1 + 5 * 0.5) / 1e6;
const nah = (ist: number, soll: number, text?: string) => assert.ok(Math.abs(ist - soll) < 1e-9, `${text ?? ""} erwartet ${soll}, bekommen ${ist}`);

let claude: ClaudeMock;
let kosten: typeof import("../../src/lib/server/kosten");
let config: typeof import("../../src/lib/server/config");
let brain: typeof import("../../src/lib/server/brain");
let chief: typeof import("../../src/lib/server/desk/chief");
let agenten: typeof import("../../src/lib/server/agenten");

before(async () => {
  claude = await starteClaudeMock();
  Object.assign(process.env, { ANTHROPIC_BASE_URL: claude.url });
  kosten = await import("../../src/lib/server/kosten");
  config = await import("../../src/lib/server/config");
  brain = await import("../../src/lib/server/brain");
  chief = await import("../../src/lib/server/desk/chief");
  agenten = await import("../../src/lib/server/agenten");
  await config.writeConfig({ name: "Benedikt", claude: { apiKey: "sk-test-nur-fuer-den-mock" } });
});

after(async () => {
  await claude.stop();
});

describe("Kostenbuch: buchen und zusammenzählen", () => {
  test("eine Claude-Anfrage landet beim Agenten, mit Betrag, Anzahl und Token; gebucht wird nur in Zahlen", async () => {
    const usd = await kosten.bucheClaude("gehirn", "gespraech", { model: "claude-opus-5-5", usage: { input_tokens: 1_000, output_tokens: 200, server_tool_use: { web_search_requests: 2 } } }, HEUTE);
    nah(usd, (1_000 * 4 + 200 * 20) / 1e6 + 0.02);
    await kosten.bucheClaude("gehirn", "gespraech", { model: "claude-opus-5-5", usage: { input_tokens: 500, output_tokens: 100 } }, HEUTE);
    const u = await kosten.kostenUebersicht(HEUTE);
    const posten = u.heute.gehirn!.claude!;
    nah(posten.usd, (1_500 * 4 + 300 * 20) / 1e6 + 0.02);
    assert.deepEqual([posten.anfragen, posten.eingabe, posten.ausgabe, posten.suchen], [2, 1_500, 300, 2]);
    assert.equal(u.heute.browser, undefined, "andere Agenten bleiben leer");

    await kosten.kostenGeschrieben();
    const roh = readFileSync(DATEI, "utf8");
    const buch = JSON.parse(roh) as { tage: Record<string, unknown> };
    assert.deepEqual(Object.keys(buch.tage), ["2026-09-13"]);
    // Im Buch stehen nur Schlüsselwörter und Zahlen: kein Satz aus einem Gespräch, kein Schlüssel.
    const texte = roh.match(/"[^"]*"/g)!.filter((t) => !/^"(tage|gehirn|browser|analyst|intel|desk|claude|grok|usd|anfragen|eingabe|ausgabe|suchen|\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?)"$/.test(t));
    assert.deepEqual(texte, []);
    assert.ok(!roh.includes("sk-test"));
  });

  test("ein fester Betrag (Grok) wird genauso gebucht; null und negative Beträge nicht", async () => {
    await kosten.bucheBetrag("intel", "grok", 0.4, HEUTE);
    await kosten.bucheBetrag("intel", "grok", 0, HEUTE);
    await kosten.bucheBetrag("intel", "grok", -1, HEUTE);
    await kosten.bucheBetrag("intel", "grok", Number.NaN, HEUTE);
    const posten = (await kosten.kostenUebersicht(HEUTE)).heute.intel!.grok!;
    nah(posten.usd, 0.4);
    assert.equal(posten.anfragen, 1);
  });

  test("jeder Tag zählt für sich; der Monat zählt die Tage des laufenden Monats zusammen", async () => {
    await kosten.bucheBetrag("desk", "grok", 1, GESTERN);
    await kosten.bucheBetrag("desk", "grok", 7, AUGUST);
    const u = await kosten.kostenUebersicht(HEUTE);
    assert.equal(u.heute.desk, undefined, "gestern ist nicht heute");
    const heuteSumme = (1_500 * 4 + 300 * 20) / 1e6 + 0.02 + 0.4;
    nah(u.heuteUsd, heuteSumme);
    nah(u.monatUsd, heuteSumme + 1, "der August zählt im September nicht mit");
    assert.equal(u.seit, "2026-08-31", "gezählt wird ab dem ersten gebuchten Tag");
  });

  test("gleichzeitige Buchungen gehen nicht verloren", async () => {
    const tag = new Date(2026, 8, 14, 9, 0);
    await Promise.all(Array.from({ length: 25 }, () => kosten.bucheBetrag("browser", "claude", 0.01, tag)));
    await kosten.kostenGeschrieben();
    const posten = (await kosten.kostenUebersicht(tag)).heute.browser!.claude!;
    nah(posten.usd, 0.25);
    assert.equal(posten.anfragen, 25);
    const buch = JSON.parse(readFileSync(DATEI, "utf8")) as { tage: Record<string, { browser: { claude: { anfragen: number } } }> };
    assert.equal(buch.tage["2026-09-14"].browser.claude.anfragen, 25, "auch in der Datei");
    assert.deepEqual(readdirSync(ordner).filter((f) => f.includes(".tmp")), [], "keine Zwischendatei bleibt liegen");
  });

  test("unbrauchbare Zahlen kommen nie ins Buch: Sie zählen als null, und ohne Verbrauch wird nichts gebucht", async () => {
    const vorher = (await kosten.kostenUebersicht(HEUTE)).heute.gehirn!.claude!.anfragen;
    const usd = await kosten.bucheClaude("gehirn", "gespraech", { model: "claude-opus-5-5", usage: { input_tokens: Number.NaN, output_tokens: 5 } }, HEUTE);
    nah(usd, (5 * 20) / 1e6);
    assert.equal(await kosten.bucheClaude("gehirn", "gespraech", null, HEUTE), 0);
    assert.equal(await kosten.bucheClaude("gehirn", "gespraech", { model: "claude-opus-5-5" }, HEUTE), 0);
    const posten = (await kosten.kostenUebersicht(HEUTE)).heute.gehirn!.claude!;
    assert.equal(posten.anfragen, vorher + 1, "nur die eine Antwort mit Verbrauch zählt");
    assert.ok(Number.isFinite(posten.usd) && Number.isFinite(posten.eingabe));
  });
});

describe("Kostenbuch: die Agenten buchen selbst", () => {
  const tagesStand = async (agent: "gehirn" | "desk") => (await kosten.kostenUebersicht(new Date())).heute[agent]?.claude ?? { usd: 0, anfragen: 0 };

  test("ein Gespräch mit einem Werkzeug sind zwei Anfragen an Claude, beide stehen beim Gespräch", async () => {
    const vorher = await tagesStand("gehirn");
    claude.drehbuch([{ werkzeug: "agenten_lesen", eingabe: {} }, { text: "Alle Agenten sind bereit." }]);
    const reply = await brain.think(await config.readConfig(), "sk-test", { text: "Was machen die Agenten?", history: [], view: "/", focus: null, extra: [] });
    assert.equal(reply.reply, "Alle Agenten sind bereit.");
    await kosten.kostenGeschrieben();
    const nachher = await tagesStand("gehirn");
    assert.equal(nachher.anfragen - vorher.anfragen, 2);
    nah(nachher.usd - vorher.usd, 2 * OPUS_ANTWORT_USD);
  });

  test("reißt die Antwort mittendrin ab, ist wenigstens die Eingabe gebucht: Anthropic berechnet sie trotzdem", async () => {
    const vorher = await tagesStand("gehirn");
    claude.drehbuch([{ abbruch: true }]);
    await assert.rejects(brain.think(await config.readConfig(), "sk-test", { text: "Erzähl mir etwas Langes.", history: [], view: "/", focus: null, extra: [] }));
    const nachher = await tagesStand("gehirn");
    assert.equal(nachher.anfragen - vorher.anfragen, 1);
    // Bekannt ist, was Claude zu Beginn der Antwort gemeldet hat: 10 Token Eingabe, 1 Token Ausgabe.
    nah(nachher.usd - vorher.usd, (10 * 4 + 1 * 20) / 1e6);
  });

  test("der Chief des Desks bucht seine Bewertung zum Haiku-Preis beim Spielgeld-Desk", async () => {
    const vorher = await tagesStand("desk");
    claude.drehbuch([{ text: JSON.stringify({ coins: [] }) }]);
    await chief.judgeWithClaude("sk-test", []);
    await kosten.kostenGeschrieben();
    assert.equal(claude.anfragen[0].model, "claude-haiku-5-5");
    const nachher = await tagesStand("desk");
    assert.equal(nachher.anfragen - vorher.anfragen, 1);
    nah(nachher.usd - vorher.usd, HAIKU_ANTWORT_USD);
  });

  test("die Agentensteuerung zeigt die Kosten von Gespräch und Desk und die Summen von heute und vom Monat", async () => {
    const jetzt = new Date();
    const snap = await agenten.agentenSnapshot(jetzt);
    const gehirn = snap.agenten.find((a) => a.name === "gehirn")!;
    const u = await kosten.kostenUebersicht(jetzt);
    assert.ok(gehirn.kosten, "das Gespräch hat jetzt eine Zählung");
    nah(gehirn.kosten.heuteUsd, u.heute.gehirn!.claude!.usd);
    assert.match(gehirn.kosten.was, /Claude Opus 5\.5/);
    const desk = snap.agenten.find((a) => a.name === "desk")!;
    nah(desk.kosten!.heuteUsd, u.heute.desk!.claude!.usd, "ohne xAI-Schlüssel sind es nur die Bewertungen des Chiefs");
    assert.ok(snap.kosten.heuteUsd >= gehirn.kosten.heuteUsd + desk.kosten!.heuteUsd - 1e-9);
    nah(snap.kosten.monatUsd!, u.monatUsd, "der Monat kommt aus dem Kostenbuch");
    assert.equal(snap.kosten.seit, u.seit);
  });
});

describe("Kostenbuch: Datei nicht lesbar", () => {
  test("lässt sich die Datei gerade nicht lesen, bleibt sie unangetastet; die Übersicht zeigt keine Zahl, die Agenten arbeiten weiter", async () => {
    await kosten.kostenGeschrieben();
    const weg = `${DATEI}.weg`;
    renameSync(DATEI, weg);
    // Ein Ordner an der Stelle der Datei: Lesen scheitert, aber nicht, weil der Inhalt kaputt wäre.
    mkdirSync(DATEI);
    kosten.vergissKostenbuch();
    try {
      await assert.rejects(kosten.kostenUebersicht(HEUTE));
      assert.equal(await kosten.bucheClaude("gehirn", "gespraech", { model: "claude-opus-5-5", usage: { input_tokens: 10, output_tokens: 5 } }, HEUTE), OPUS_ANTWORT_USD, "der Betrag kommt trotzdem zurück");
      await kosten.bucheBetrag("intel", "grok", 0.1, HEUTE);
      assert.deepEqual(readdirSync(ordner).filter((f) => f.includes("defekt")), [], "nichts wurde beiseitegelegt");
      const snap = await agenten.agentenSnapshot(new Date());
      assert.equal(snap.kosten.monatUsd, null);
      assert.equal(snap.agenten.find((a) => a.name === "gehirn")!.kosten, null, "keine Zahl statt einer falschen");
      assert.equal(snap.agenten.length, 5);
    } finally {
      rmSync(DATEI, { recursive: true });
      renameSync(weg, DATEI);
    }
    // Sobald die Datei wieder lesbar ist, stimmt alles wie vorher, ohne Neustart.
    const u = await kosten.kostenUebersicht(HEUTE);
    assert.ok(u.heute.gehirn?.claude && u.heute.gehirn.claude.anfragen >= 3);
  });
});

describe("Kostenbuch: kaputte Datei", () => {
  test("eine unlesbare Datei wird beiseitegelegt und nicht überschrieben; danach zählt das Buch neu", async () => {
    await kosten.kostenGeschrieben();
    writeFileSync(DATEI, "{ das ist kein JSON");
    kosten.vergissKostenbuch();
    const leer = await kosten.kostenUebersicht(HEUTE);
    assert.equal(leer.heuteUsd, 0);
    await kosten.bucheBetrag("intel", "grok", 0.1, HEUTE);
    await kosten.kostenGeschrieben();
    const beiseite = readdirSync(ordner).filter((f) => f.startsWith("kosten.json.defekt-"));
    assert.equal(beiseite.length, 1);
    assert.equal(readFileSync(path.join(ordner, beiseite[0]), "utf8"), "{ das ist kein JSON", "der alte Inhalt ist noch da");
    assert.ok(existsSync(DATEI));
    nah((await kosten.kostenUebersicht(HEUTE)).heuteUsd, 0.1);
  });
});
