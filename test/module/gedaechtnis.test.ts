// Das persönliche Gedächtnis (src/lib/server/memory.ts) mit denselben Zusagen wie das Projektgedächtnis:
// Zwei Änderungen zur selben Zeit überschreiben sich nicht, eine beschädigte Datei wird nie stillschweigend
// durch eine leere ersetzt, und scheitert das Speichern, erfährt man es und es ist nichts geändert. Die Datei
// (~/.jarvis/gedaechtnis.json) behält ihren Aufbau. Hier nur im Testordner; das echte Gedächtnis wird nicht berührt.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, beforeEach, describe, test, type TestContext } from "node:test";
import { sichereUmgebung } from "../helfer/umgebung";
import { starteClaudeMock, type ClaudeMock } from "../mocks/claude-mock";

let claude: ClaudeMock;
let ordner: string;
let memory: typeof import("../../src/lib/server/memory");
let brain: typeof import("../../src/lib/server/brain");
let aktionen: typeof import("../../src/lib/server/aktionen");

const DATEI = () => path.join(ordner, "gedaechtnis.json");
const inDatei = () => (JSON.parse(readFileSync(DATEI(), "utf8")) as { facts: { id: string; text: string; at: string }[] }).facts;
// Vergisst, was im Speicher steht: Der nächste Zugriff liest die Datei neu, wie nach einem Neustart.
const neuStarten = () => memory.vergissGedaechtnis();
const texte = async () => (await memory.readMemory()).map((f) => f.text);
// Ein Eintrag des KI-Gehirns, nachdem ein Mensch Ja gesagt hat.
const merke = (text: string) => aktionen.fuehreAus("gedaechtnis_merken", { text }, { kanal: "mac", config: { name: "Benedikt" } });
const beiseite = () => readdirSync(ordner).filter((n) => n.startsWith("gedaechtnis.json.beschaedigt-"));

before(async () => {
  claude = await starteClaudeMock();
  process.env.ANTHROPIC_BASE_URL = claude.url;
  ordner = sichereUmgebung("gedaechtnis");
  memory = await import("../../src/lib/server/memory");
  brain = await import("../../src/lib/server/brain");
  aktionen = await import("../../src/lib/server/aktionen");
});

after(async () => {
  await claude.stop();
});

beforeEach(async () => {
  await memory.gedaechtnisGeschrieben();
  for (const name of readdirSync(ordner).filter((n) => n.startsWith("gedaechtnis.json"))) rmSync(path.join(ordner, name), { recursive: true, force: true });
  neuStarten();
});

describe("Gedächtnis: zwei Änderungen zur selben Zeit", () => {
  test("zwei Dinge gleichzeitig merken: beide bleiben", async () => {
    await memory.remember("Trinkt Kaffee schwarz.");
    await Promise.all([memory.remember("Die Tochter heißt Anna."), memory.remember("Fährt montags nach München.")]);
    assert.deepEqual((await texte()).sort(), ["Die Tochter heißt Anna.", "Fährt montags nach München.", "Trinkt Kaffee schwarz."]);
    neuStarten();
    assert.equal((await texte()).length, 3, "auch in der Datei stehen alle drei");
  });

  test("zwanzig Änderungen durcheinander (merken, ändern, vergessen): keine geht verloren", async () => {
    const alt = await Promise.all(["eins", "zwei", "drei", "vier"].map((t) => memory.remember(`Alt ${t}`)));
    await Promise.all([
      ...Array.from({ length: 12 }, (_, i) => memory.remember(`Neu ${i}`)),
      memory.revise(alt[0].id, "Geändert eins"),
      memory.revise(alt[1].id, "Geändert zwei"),
      memory.forget(alt[2].id),
      memory.forget(alt[3].id),
      ...Array.from({ length: 4 }, (_, i) => memory.remember(`Spät ${i}`)),
    ]);
    neuStarten();
    const jetzt = (await texte()).sort();
    assert.deepEqual(jetzt, [...Array.from({ length: 12 }, (_, i) => `Neu ${i}`), ...Array.from({ length: 4 }, (_, i) => `Spät ${i}`), "Geändert eins", "Geändert zwei"].sort());
  });

  test("dasselbe zweimal gleichzeitig: ein Eintrag", async () => {
    const [a, b] = await Promise.all([memory.remember("Trinkt Kaffee schwarz."), memory.remember("trinkt kaffee SCHWARZ.")]);
    assert.equal(a.id, b.id);
    assert.equal((await texte()).length, 1);
  });

  test("zwei bestätigte Einträge des KI-Gehirns zur selben Zeit: beide stehen im Gedächtnis", async () => {
    await Promise.all([merke("Mag keine Besprechungen vor neun."), merke("Steuerberaterin ist Frau Huber.")]);
    neuStarten();
    assert.equal((await texte()).length, 2);
  });
});

describe("Gedächtnis: Lesen nach einem Neustart, während schon geändert wird", () => {
  // Das erste Lesen der Datei bleibt hängen, bis `frei` gerufen wird: So überholt es eine Änderung sicher.
  function haltErstesLesenAn(t: TestContext) {
    const echt = fs.readFile.bind(fs) as (...a: unknown[]) => Promise<unknown>;
    let frei!: () => void;
    const tor = new Promise<void>((r) => (frei = r));
    let erstes = true;
    t.mock.method(fs, "readFile", async (...a: unknown[]) => {
      const warten = erstes;
      erstes = false;
      const ergebnis = echt(...a);
      if (warten) {
        await ergebnis.catch(() => {});
        await tor;
      }
      return ergebnis;
    });
    return frei;
  }

  test("ein Lesen, das den alten Stand noch in der Hand hat, bringt ihn nach einer Änderung nicht zurück", async (t) => {
    await memory.remember("Alt");
    neuStarten();
    const frei = haltErstesLesenAn(t);
    const lesen = memory.readMemory();
    await memory.remember("Dazwischen");
    frei();
    assert.deepEqual((await lesen).map((f) => f.text), ["Alt", "Dazwischen"], "auch das überholte Lesen bekommt den Stand von jetzt");
    await memory.remember("Danach");
    neuStarten();
    assert.deepEqual(await texte(), ["Alt", "Dazwischen", "Danach"]);
  });

  test("dasselbe ohne Datei: Das überholte Lesen macht das Gedächtnis nicht wieder leer", async (t) => {
    const frei = haltErstesLesenAn(t);
    const lesen = memory.readMemory();
    await memory.remember("Der erste Eintrag");
    frei();
    await lesen;
    await memory.remember("Der zweite");
    neuStarten();
    assert.deepEqual(await texte(), ["Der erste Eintrag", "Der zweite"]);
  });
});

describe("Gedächtnis: eine beschädigte Datei wird nie überschrieben", () => {
  const KAPUTT = ['{"facts": [{"id": "g1", "text": "Trinkt Kaffee schwarz.", "at": "2026-11-0', "{}", '{"facts": "nichts"}', '{"facts": [{"id": 7, "text": "ohne Kennung"}]}', "[]", "null", '{"facts": [{"id": "g1", "text": "ohne lesbares Datum", "at": "gestern"}]}'];

  test("kaputter Inhalt oder unerwarteter Aufbau: fester Satz, nichts lässt sich merken, die Datei bleibt Byte für Byte", async () => {
    for (const inhalt of KAPUTT) {
      writeFileSync(DATEI(), inhalt);
      neuStarten();
      await assert.rejects(memory.readMemory(), /Die Datei des Gedächtnisses ist beschädigt\. JARVIS lässt sie unverändert/, inhalt);
      await assert.rejects(memory.remember("Neu"), /beschädigt/, inhalt);
      await assert.rejects(memory.revise("g1", "Anders"), /beschädigt/, inhalt);
      await assert.rejects(memory.forget("g1"), /beschädigt/, inhalt);
      assert.equal(readFileSync(DATEI(), "utf8"), inhalt, "die Datei ist unverändert");
    }
    assert.deepEqual(beiseite(), []);
  });

  test("der Fehler nennt weder den Ort der Datei noch, was darin steht; nur die Seite erfährt, welche Datei es ist", async () => {
    writeFileSync(DATEI(), '{"facts": [{"id": "g1", "text": "Kontonummer 4711"');
    neuStarten();
    const fehler = await memory.readMemory().then(
      () => null,
      (e: Error) => e,
    );
    assert.ok(fehler instanceof memory.GedaechtnisFehler);
    // Der Satz geht als Ergebnis eines Werkzeugs auch ans Modell: kein Pfad (darin steht der Benutzername), kein Inhalt.
    assert.ok(!fehler.message.includes(ordner) && !fehler.message.includes("gedaechtnis.json"));
    assert.ok(!fehler.message.includes("4711") && !fehler.message.includes("Kontonummer"));
    assert.match(fehler.message, /Einstellungen unter „Gedächtnis“/);
    const stand = await memory.gedaechtnisStand();
    assert.deepEqual(stand.beschaedigt, { datei: DATEI(), lesbar: 0 });
    assert.ok(!JSON.stringify(stand).includes("4711"));
  });

  test("beiseitelegen behält, was sich noch lesen lässt; die Datei selbst liegt unverändert daneben", async () => {
    const gut = [
      { id: "g1", text: "Trinkt Kaffee schwarz.", at: "2026-10-01T07:00:00.000Z" },
      { id: "g3", text: "Die Tochter heißt Anna.", at: "2026-10-03T07:00:00.000Z" },
    ];
    const inhalt = JSON.stringify({ facts: [gut[0], { id: "g2", text: "ohne Zeit" }, gut[1], { id: "g4", text: "Zeit unlesbar", at: "gestern" }, "kein Eintrag"] });
    writeFileSync(DATEI(), inhalt, { mode: 0o644 });
    neuStarten();
    const stand = await memory.gedaechtnisStand();
    assert.deepEqual([stand.facts, stand.beschaedigt], [[], { datei: DATEI(), lesbar: 2 }], "bis dahin gilt nichts davon, die Seite erfährt nur die Zahl");
    await memory.legeBeiseite();
    assert.deepEqual(await memory.readMemory(), gut);
    assert.deepEqual(inDatei(), gut);
    assert.equal(beiseite().length, 1);
    const daneben = path.join(ordner, beiseite()[0]);
    assert.equal(readFileSync(daneben, "utf8"), inhalt, "der alte Inhalt liegt Byte für Byte daneben");
    assert.equal(statSync(daneben).mode & 0o777, 0o600, "auch die beiseitegelegte Datei ist nur für den eigenen Benutzer lesbar");
    assert.deepEqual(await memory.gedaechtnisStand(), { facts: gut });
  });

  test("beiseitelegen bei unlesbarem Inhalt fängt leer an; ist nichts beschädigt, geschieht nichts", async () => {
    writeFileSync(DATEI(), "kein json");
    neuStarten();
    await memory.legeBeiseite();
    assert.deepEqual(await memory.readMemory(), []);
    assert.equal(beiseite().length, 1);
    await memory.remember("Neu angefangen.");
    await memory.legeBeiseite();
    assert.equal(beiseite().length, 1, "ein heiles Gedächtnis wird nicht beiseitegelegt");
    assert.deepEqual(await texte(), ["Neu angefangen."]);
  });

  test("„Alles vergessen“ behält auch aus einer teils lesbaren Datei nichts; beim Beiseitelegen bleiben höchstens so viele, wie Platz ist", async () => {
    const eintrag = (i: number) => ({ id: `g${i}`, text: `Eintrag ${i}`, at: "2026-10-01T07:00:00.000Z" });
    const inhalt = JSON.stringify({ facts: [...Array.from({ length: memory.MAX_FACTS + 5 }, (_, i) => eintrag(i)), { id: "kaputt" }] });
    writeFileSync(DATEI(), inhalt);
    neuStarten();
    await memory.legeBeiseite();
    const behalten = await texte();
    assert.deepEqual([behalten.length, behalten[0], behalten.at(-1)], [memory.MAX_FACTS, "Eintrag 5", `Eintrag ${memory.MAX_FACTS + 4}`], "die neuesten bleiben");
    writeFileSync(DATEI(), inhalt);
    neuStarten();
    await memory.forgetAll();
    assert.deepEqual(await memory.readMemory(), []);
    assert.deepEqual(inDatei(), []);
    assert.equal(beiseite().length, 2, "beide Male liegt die Datei daneben");
  });

  test("beiseitelegen und gleich danach merken, ohne zu warten: Erst wird beiseitegelegt, dann gemerkt", async () => {
    writeFileSync(DATEI(), JSON.stringify({ facts: [{ id: "g1", text: "Trinkt Kaffee schwarz.", at: "2026-10-01T07:00:00.000Z" }, { id: "kaputt" }] }));
    neuStarten();
    await Promise.all([memory.legeBeiseite(), memory.remember("Gleich danach.")]);
    neuStarten();
    assert.deepEqual(await texte(), ["Trinkt Kaffee schwarz.", "Gleich danach."]);
    assert.equal(beiseite().length, 1);
  });

  test("eine früher beiseitegelegte Datei wird nie überschrieben, auch nicht bei gleichem Namen", async (t) => {
    t.mock.method(Date, "now", () => 1_800_000_000_000);
    const frueher = `${DATEI()}.beschaedigt-1800000000000`;
    writeFileSync(frueher, "die frühere Kopie");
    writeFileSync(DATEI(), "kein json");
    neuStarten();
    await assert.rejects(memory.legeBeiseite(), /nicht speichern/);
    assert.equal(readFileSync(frueher, "utf8"), "die frühere Kopie");
    assert.equal(readFileSync(DATEI(), "utf8"), "kein json");
  });

  test("scheitert dabei das Speichern, bleibt die beschädigte Datei an ihrem Platz, und es liegt keine Kopie herum", async () => {
    const inhalt = '{"facts": [{"id": "g1", "text": "Trinkt Kaffee schwarz."';
    writeFileSync(DATEI(), inhalt);
    neuStarten();
    mkdirSync(`${DATEI()}.tmp`);
    await assert.rejects(memory.legeBeiseite(), /Das Gedächtnis ließ sich nicht speichern\. Es ist nichts geändert\./);
    await assert.rejects(memory.forgetAll(), /nicht speichern/);
    assert.equal(readFileSync(DATEI(), "utf8"), inhalt, "die beschädigte Datei liegt, wo sie lag");
    assert.deepEqual(beiseite(), []);
    assert.ok((await memory.gedaechtnisStand()).beschaedigt, "und gilt weiter als beschädigt, nicht als leer");
    rmSync(`${DATEI()}.tmp`, { recursive: true });
    await memory.legeBeiseite();
    assert.deepEqual(await memory.gedaechtnisStand(), { facts: [] });
    assert.equal(readFileSync(path.join(ordner, beiseite()[0]), "utf8"), inhalt);
  });

  test("„Alles vergessen“ löscht auch dann nichts: Die beschädigte Datei wird beiseitegelegt, danach geht es leer weiter", async () => {
    const inhalt = '{"facts": [{"id": "g1", "text": "Trinkt Kaffee schwarz."';
    writeFileSync(DATEI(), inhalt);
    neuStarten();
    await memory.forgetAll();
    assert.deepEqual(await memory.readMemory(), []);
    assert.equal(beiseite().length, 1);
    assert.equal(readFileSync(path.join(ordner, beiseite()[0]), "utf8"), inhalt, "der alte Inhalt liegt unverändert daneben");
    await memory.remember("Neu angefangen.");
    neuStarten();
    assert.deepEqual(await texte(), ["Neu angefangen."]);
  });

  test("die Seite bekommt statt eines Fehlers einen leeren Stand mit dem festen Satz, und nach „Alles vergessen“ wieder den normalen", async () => {
    await memory.remember("Trinkt Kaffee schwarz.");
    assert.deepEqual(Object.keys(await memory.gedaechtnisStand()), ["facts"], "ohne Fehler steht kein Satz dabei");
    writeFileSync(DATEI(), "kein json");
    neuStarten();
    const stand = await memory.gedaechtnisStand();
    assert.deepEqual(stand.facts, []);
    assert.match(stand.fehler ?? "", /beschädigt\. JARVIS lässt sie unverändert/);
    assert.deepEqual(Object.keys(stand), ["facts", "fehler", "beschaedigt"]);
    await memory.forgetAll();
    assert.deepEqual(await memory.gedaechtnisStand(), { facts: [] });
  });

  test("fehlt die Datei, ist das Gedächtnis leer und nichts ist beschädigt", async () => {
    assert.deepEqual(await memory.readMemory(), []);
    await memory.forgetAll();
    assert.deepEqual(beiseite(), []);
  });

  test("das KI-Gehirn antwortet auch mit beschädigtem Gedächtnis; es erfährt davon, und die Datei bleibt", async () => {
    const inhalt = '{"facts": [{"id": "g1", "text": "Trinkt Kaffee schwarz."';
    writeFileSync(DATEI(), inhalt);
    neuStarten();
    claude.drehbuch([{ text: "Guten Morgen." }]);
    const reply = await brain.think({ name: "Benedikt", claude: { apiKey: "sk-test-nur-fuer-den-mock" } }, "sk-test", { text: "Guten Morgen", history: [], view: "/", focus: null, extra: [] });
    assert.equal(reply.reply, "Guten Morgen.");
    const system = JSON.stringify(claude.anfragen.at(-1)!.system);
    assert.match(system, /Das Gedächtnis lässt sich gerade nicht lesen/);
    assert.ok(!system.includes("Kaffee"));
    assert.equal(readFileSync(DATEI(), "utf8"), inhalt);
  });

  test("ein bestätigter Eintrag des KI-Gehirns scheitert dann mit dem festen Satz statt die Datei zu ersetzen", async () => {
    const inhalt = "kein json";
    writeFileSync(DATEI(), inhalt);
    neuStarten();
    await assert.rejects(merke("Neu"), /beschädigt/);
    assert.equal(readFileSync(DATEI(), "utf8"), inhalt);
  });
});

describe("Gedächtnis: wenn das Speichern scheitert", () => {
  test("fester Satz, nichts ist geändert, und danach geht es wieder", async () => {
    await memory.remember("Trinkt Kaffee schwarz.");
    const alt = await memory.readMemory();
    // Die Nebendatei, über die gespeichert wird, ist ein Ordner: Schreiben schlägt fehl.
    mkdirSync(`${DATEI()}.tmp`);
    await assert.rejects(memory.remember("Geht verloren?"), /Das Gedächtnis ließ sich nicht speichern\. Es ist nichts geändert\./);
    await assert.rejects(memory.revise(alt[0].id, "Anders"), /nicht speichern/);
    await assert.rejects(memory.forget(alt[0].id), /nicht speichern/);
    await assert.rejects(memory.forgetAll(), /nicht speichern/);
    assert.deepEqual(await memory.readMemory(), alt, "im Speicher steht der Stand von vorher");
    assert.deepEqual(inDatei(), alt, "in der Datei auch");
    rmSync(`${DATEI()}.tmp`, { recursive: true });
    await memory.remember("Jetzt geht es wieder.");
    neuStarten();
    assert.deepEqual(await texte(), ["Trinkt Kaffee schwarz.", "Jetzt geht es wieder."]);
  });

  test("lässt sich die Datei nicht lesen (kein Zugriff), wird sie nicht für leer gehalten", async () => {
    // Ein Ordner an der Stelle der Datei: Lesen schlägt fehl, ohne dass die Datei fehlt.
    mkdirSync(DATEI());
    await assert.rejects(memory.readMemory(), /Das Gedächtnis lässt sich gerade nicht lesen\./);
    await assert.rejects(memory.remember("Neu"), /nicht lesen/);
    await assert.rejects(memory.forgetAll(), /nicht lesen/, "auch „Alles vergessen“ räumt hier nichts weg");
    await assert.rejects(memory.legeBeiseite(), /nicht lesen/, "und beiseitelegen auch nicht");
    assert.deepEqual(await memory.gedaechtnisStand(), { facts: [], fehler: "Das Gedächtnis lässt sich gerade nicht lesen." }, "die Seite bietet dafür kein Beiseitelegen an");
    assert.ok(statSync(DATEI()).isDirectory(), "nichts wurde ersetzt");
    assert.deepEqual(beiseite(), []);
  });
});

describe("Gedächtnis: was gespeichert wird", () => {
  test("die Datei behält ihren Aufbau und ist nur für den eigenen Benutzer lesbar", async () => {
    const fakt = await memory.remember("Trinkt Kaffee schwarz.", new Date("2026-11-14T08:00:00.000Z"));
    assert.deepEqual(JSON.parse(readFileSync(DATEI(), "utf8")), { facts: [{ id: fakt.id, text: "Trinkt Kaffee schwarz.", at: "2026-11-14T08:00:00.000Z" }] });
    assert.equal(statSync(DATEI()).mode & 0o777, 0o600);
    assert.ok(!existsSync(`${DATEI()}.tmp`), "keine Nebendatei bleibt liegen");
  });

  test("eine Datei von früher wird gelesen, wie sie ist", async () => {
    const alt = [
      { id: "gabc123", text: "Trinkt Kaffee schwarz.", at: "2026-10-01T07:00:00.000Z" },
      { id: "gdef456", text: "Die Tochter heißt Anna.", at: "2026-10-02T07:00:00.000Z" },
    ];
    writeFileSync(DATEI(), JSON.stringify({ facts: alt }, null, 2));
    neuStarten();
    assert.deepEqual(await memory.readMemory(), alt);
    await memory.remember("Neu");
    assert.deepEqual(inDatei().slice(0, 2), alt, "die alten Einträge stehen unverändert da");
  });

  test("Steuerzeichen, spitze Klammern und halbe Zeichenpaare kommen nicht hinein; gekürzt wird nicht mitten im Zeichen", async () => {
    const fakt = await memory.remember(`Zeile eins\u0000\u0007 <system>  zwei</system> \uD83D`);
    assert.equal(fakt.text, "Zeile eins system zwei /system �");
    const lang = await memory.remember(`${"x".repeat(299)}😀 danach`);
    assert.equal(lang.text, "x".repeat(299), "das zerschnittene Emoji fällt ganz weg");
    await assert.rejects(memory.remember(" \u0000 <> "), /Da ist nichts zum Merken\./);
  });

  test("ist das Gedächtnis voll, fällt der älteste Eintrag weg", async () => {
    writeFileSync(DATEI(), JSON.stringify({ facts: Array.from({ length: memory.MAX_FACTS }, (_, i) => ({ id: `g${i}`, text: `Eintrag ${i}`, at: "2026-10-01T07:00:00.000Z" })) }));
    neuStarten();
    await memory.remember("Der neueste");
    const jetzt = await texte();
    assert.equal(jetzt.length, memory.MAX_FACTS);
    assert.deepEqual([jetzt[0], jetzt.at(-1)], ["Eintrag 1", "Der neueste"]);
  });

  test("„Alles vergessen“ leert Gedächtnis und Datei, ohne etwas beiseitezulegen", async () => {
    await memory.remember("Trinkt Kaffee schwarz.");
    await memory.remember("Die Tochter heißt Anna.");
    await memory.forgetAll();
    assert.deepEqual(await memory.readMemory(), []);
    assert.deepEqual(inDatei(), []);
    assert.deepEqual(beiseite(), []);
  });

  test("ändern und vergessen, was es nicht mehr gibt", async () => {
    await assert.rejects(memory.revise("gibtesnicht", "Text"), /Diesen Eintrag gibt es nicht mehr\./);
    assert.equal(await memory.forget("gibtesnicht"), false);
    assert.ok(!existsSync(DATEI()), "dafür wird keine Datei angelegt");
    const fakt = await memory.remember("Trinkt Kaffee schwarz.");
    await assert.rejects(memory.revise(fakt.id, " <> "), /Da ist nichts zum Merken\./);
    assert.deepEqual(await texte(), ["Trinkt Kaffee schwarz."], "ein leerer Text ersetzt nichts");
  });
});
