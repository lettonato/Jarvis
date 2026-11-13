// Apple-Kalender gegen einen nachgebauten Mac (test/mocks/osascript-mock.mjs). Geprüft wird: lesen,
// eintragen nur mit gültigen Angaben, Daten gehen nie als Programmcode an den Mac, das Gehirn trägt nur
// nach einem Ja ein, und JARVIS öffnet nur die vorgesehenen Programme.

import assert from "node:assert/strict";
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { after, before, beforeEach, describe, test } from "node:test";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";
import { starteClaudeMock, werkzeugErgebnisse, type ClaudeMock } from "../mocks/claude-mock";

sichereUmgebung("kalender");
const ablage = testOrdner("mac");
const STORE = path.join(ablage, "kalender.json");
const LOG = path.join(ablage, "aufrufe.log");
const vault = testOrdner("kalender-tresor");
for (const f of ["test/mocks/osascript-mock.mjs", "test/mocks/open-mock.mjs"]) chmodSync(f, 0o755);
Object.assign(process.env, { JARVIS_OSASCRIPT: path.resolve("test/mocks/osascript-mock.mjs"), JARVIS_OPEN: path.resolve("test/mocks/open-mock.mjs"), JARVIS_MAC_STORE: STORE, JARVIS_MAC_LOG: LOG });

let claude: ClaudeMock;
let kalender: typeof import("../../src/lib/server/calendar");
let config: typeof import("../../src/lib/server/config");
let brain: typeof import("../../src/lib/server/brain");
let freigaben: typeof import("../../src/lib/server/gateway/freigaben");
let daten: typeof import("../../src/lib/dates");

const HEUTE = new Date();
const um = (tage: number, stunde: number) => new Date(HEUTE.getFullYear(), HEUTE.getMonth(), HEUTE.getDate() + tage, stunde).getTime();
const termin = (id: string, title: string, start: number, calendar = "Privat") => ({ id, title, start, end: start + 3_600_000, allDay: false, location: "", calendar });
const setze = (stand: Record<string, unknown>) => writeFileSync(STORE, JSON.stringify({ zugriff: "ok", kalender: [{ name: "Privat", writable: true }, { name: "Feiertage", writable: false }, { name: "Firma", writable: true }], standard: "Privat", events: [], ...stand }));
const aufrufe = () => (existsSync(LOG) ? readFileSync(LOG, "utf8").trim().split("\n").filter(Boolean).map((z) => JSON.parse(z) as { programm: string; args: string[] }) : []);
const gespeichert = () => (JSON.parse(readFileSync(STORE, "utf8")) as { events: { title: string; calendar: string; start: number; allDay: boolean }[] }).events;
const frage = (text: string, channel?: "telegram") => ({ text, history: [], view: "/", focus: null, extra: [], ...(channel ? { channel } : {}) });

before(async () => {
  claude = await starteClaudeMock();
  process.env.ANTHROPIC_BASE_URL = claude.url;
  config = await import("../../src/lib/server/config");
  kalender = await import("../../src/lib/server/calendar");
  brain = await import("../../src/lib/server/brain");
  freigaben = await import("../../src/lib/server/gateway/freigaben");
  daten = await import("../../src/lib/dates");
  await config.writeConfig({ name: "Benedikt", vaultPath: vault, claude: { apiKey: "sk-test-nur-fuer-den-mock" } });
});

after(async () => {
  await claude.stop();
});

beforeEach(async () => {
  rmSync(LOG, { force: true });
  setze({});
  await freigaben.sperreOffeneFreigaben("Testbeginn");
});

const morgen = () => daten.addDays(daten.isoDate(HEUTE), 1);

describe("Kalender: lesen", () => {
  test("Termine kommen sortiert, ohne leere Titel; der Standardkalender ist das Ziel", async () => {
    setze({ events: [termin("b", "Zweiter", um(1, 15)), termin("x", "", um(1, 9)), termin("a", "Erster", um(1, 10))] });
    const snap = await kalender.readCalendar({ force: true });
    assert.equal(snap.access, "ok");
    assert.deepEqual(snap.events.map((e) => e.title), ["Erster", "Zweiter"]);
    assert.equal(snap.target, "Privat");
  });

  test("ein gewählter Kalender gilt nur, wenn es ihn gibt und er beschreibbar ist", async () => {
    const c = await config.readConfig();
    await config.writeConfig({ ...c, calendar: { target: "Firma" } });
    assert.equal((await kalender.readCalendar({ force: true })).target, "Firma");
    await config.writeConfig({ ...c, calendar: { target: "Feiertage" } });
    assert.equal((await kalender.readCalendar({ force: true })).target, "Privat", "schreibgeschützt: zurück zum Standard");
    await config.writeConfig(c);
  });

  test("verweigert macOS den Zugriff, erklärt JARVIS, wo man ihn erlaubt", async () => {
    setze({ zugriff: "verweigert" });
    const snap = await kalender.readCalendar({ force: true });
    assert.equal(snap.access, "verweigert");
    assert.match(snap.error ?? "", /Datenschutz & Sicherheit → Kalender/);
    assert.deepEqual(snap.events, []);
  });
});

describe("Kalender: eintragen", () => {
  test("ungültige Angaben erreichen den Mac nicht", async () => {
    for (const falsch of [
      { title: " ", date: morgen() },
      { title: "Test", date: "morgen" },
      { title: "Test", date: morgen(), time: "25:00" },
      { title: "Test", date: morgen(), time: "10:00", minutes: 2 },
      { title: "Test", date: "2020-01-01" },
      { title: "Test", date: "2099-01-01" },
    ]) {
      await assert.rejects(kalender.addEvent(falsch), kalender.CalendarError, JSON.stringify(falsch));
    }
    assert.equal(aufrufe().length, 0);
  });

  test("ein Termin landet im Kalender; Titel und Ort gehen als Daten, nie als Programmcode", async () => {
    const titel = 'Treffen "); ObjC.import("Foundation"); $.NSFileManager.defaultManager.removeItemAtPathError("/", null); ("';
    const r = await kalender.addEvent({ title: titel, date: morgen(), time: "10:00", minutes: 30, location: "Büro `rm -rf`" });
    assert.equal(r.calendar, "Privat");
    const e = gespeichert()[0];
    assert.equal(e.title, titel.replace(/\s+/g, " ").trim());
    assert.equal(e.allDay, false);
    const neu = aufrufe().find((a) => a.args[4] === "neu")!;
    assert.ok(!neu.args[3].includes("Treffen") && !neu.args[3].includes("rm -rf"), "das Skript ist fest, die Daten stehen daneben");
    assert.equal(JSON.parse(neu.args[5]).title, e.title);
    // Das feste Skript ist bei jedem Aufruf dasselbe.
    assert.equal(new Set(aufrufe().filter((a) => a.args[0] === "-l").map((a) => a.args[3])).size, 1);
  });

  test("einen schreibgeschützten oder unbekannten Kalender lehnt JARVIS verständlich ab", async () => {
    await assert.rejects(kalender.addEvent({ title: "Test", date: morgen(), calendar: "Feiertage" }), /schreibgeschützt/);
    assert.equal(gespeichert().length, 0);
  });
});

describe("Kalender: über das Gehirn", () => {
  test("das Modell trägt nichts ohne dein Ja ein; nach dem Ja steht der Termin drin", async () => {
    claude.drehbuch([{ werkzeug: "termin_eintragen", eingabe: { titel: "Zahnarzt", datum: morgen(), uhrzeit: "09:00", dauer_minuten: 45, ort: "", kalender: "" } }, { text: "Ich habe nachgefragt." }]);
    await brain.think(await config.readConfig(), "sk-test", frage("Trag morgen 9 Uhr Zahnarzt ein"));
    assert.match(werkzeugErgebnisse(claude.anfragen[1]).at(-1)!.content, /wartet auf die Freigabe/);
    assert.equal(gespeichert().length, 0, "noch nichts eingetragen");
    const offen = await freigaben.offeneFreigaben();
    assert.equal(offen[0]?.werkzeug, "termin_eintragen");
    const ergebnis = await freigaben.entscheideFreigabe(offen[0].id, true, "mac");
    assert.match(ergebnis.text, /Eingetragen im Kalender Privat: Zahnarzt/);
    assert.equal(gespeichert()[0].title, "Zahnarzt");
  });

  test("ein Nein trägt nichts ein", async () => {
    claude.drehbuch([{ werkzeug: "termin_eintragen", eingabe: { titel: "Heimlich", datum: morgen(), uhrzeit: "", dauer_minuten: 60, ort: "", kalender: "" } }, { text: "Ok." }]);
    await brain.think(await config.readConfig(), "sk-test", frage("…"));
    const offen = await freigaben.offeneFreigaben();
    await freigaben.entscheideFreigabe(offen[0].id, false, "mac");
    assert.equal(gespeichert().length, 0);
  });

  test("vom Handy aus öffnet sich auf dem Mac keine Kalender-App", async () => {
    claude.drehbuch([{ werkzeug: "termin_eintragen", eingabe: { titel: "Unterwegs", datum: morgen(), uhrzeit: "", dauer_minuten: 60, ort: "", kalender: "" } }, { text: "Ok." }]);
    await brain.think(await config.readConfig(), "sk-test", frage("Trag ein", "telegram"));
    const offen = await freigaben.offeneFreigaben();
    await freigaben.entscheideFreigabe(offen[0].id, true, "telegram");
    assert.equal(gespeichert()[0].title, "Unterwegs");
    assert.ok(!aufrufe().some((a) => a.programm === "open" || (a.args[0] === "-e" && a.args.length === 5)), "kein Öffnen der Kalender-App");
  });
});

describe("Programme öffnen", () => {
  test("Kalender öffnen übergibt nur Zahlen für den Tag", async () => {
    await kalender.openCalendar("2026-12-24");
    const a = aufrufe().at(-1)!;
    assert.deepEqual(a.args.slice(2), ["2026", "12", "24"]);
    await kalender.openCalendar('2026-12-24"; do shell script "x');
    const heute = daten.isoDate(new Date()).split("-").map((t) => String(Number(t)));
    assert.deepEqual(aufrufe().at(-1)!.args.slice(2), heute, "ein ungültiges Datum wird zu heute");
  });

  test("das Gehirn kann nur Kalender und Obsidian öffnen, keine beliebigen Programme oder Dateien", () => {
    const quelle = readFileSync("src/lib/server/brain.ts", "utf8");
    assert.deepEqual([...quelle.matchAll(/await (openUrl|openFile|openCalendar)\(([^;]*)\);/g)].map((m) => m[0]), [
      "await openCalendar(datum ? checkDate(datum) : undefined);",
      "await openUrl(obsidianLink(needVault(), file));",
    ]);
    // obsidian_oeffnen kennt nur drei feste Ziele.
    assert.match(quelle, /was: \{ type: "string", enum: \["tresor", "eingang", "notizen"\] \}/);
    const aktionen = readFileSync("src/lib/server/aktionen.ts", "utf8");
    assert.ok(!/openUrl|openFile|execFile|spawn\(/.test(aktionen));
  });
});
