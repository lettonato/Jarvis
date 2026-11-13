// Die Tagesübersicht (src/lib/heute.ts) und die kurzen Befehle zu den neuen Ansichten. Reine Regeln ohne
// Netz und ohne KI: Dieselben Daten müssen immer dieselbe Übersicht ergeben.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { CalendarEvent, CalendarSnapshot } from "../../src/lib/calendar";
import { decide, type CommandContext } from "../../src/lib/commands";
import type { DocsSnapshot } from "../../src/lib/documents";
import { tageslage, type TagesDaten } from "../../src/lib/heute";
import type { IntelSnapshot } from "../../src/lib/intel";
import type { MailItem, MailSnapshot } from "../../src/lib/mail";
import type { DeskSnapshot } from "../../src/lib/paper";
import type { ProjektKarte, ProjekteSnapshot } from "../../src/lib/projekte";
import type { Task, TasksSnapshot } from "../../src/lib/tasks";

const JETZT = new Date(2026, 10, 13, 10, 0);
const um = (stunde: number, minute = 0, tag = 13) => new Date(2026, 10, tag, stunde, minute).getTime();

const ereignis = (id: string, title: string, start: number, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({ id, title, start, end: start + 3_600_000, allDay: false, location: "", calendar: "Firma", ...extra });
const kalender = (events: CalendarEvent[]): CalendarSnapshot => ({ access: "ok", events, calendars: [], target: "Firma", from: "2026-11-13", to: "2026-12-14" });
const aufgabe = (text: string, due?: string): Task => ({ id: `Eingang.md:${text}`, file: "Eingang.md", line: 0, raw: `- [ ] ${text}`, text, due, important: false, recurring: false, tags: [] });
const aufgaben = (tasks: Task[]): TasksSnapshot => ({ configured: true, tasks, doneToday: 0 });
const mailItem = (uid: number, subject: string, extra: Partial<MailItem> = {}): MailItem => ({ uid, from: "Max Huber", fromAddress: "max@example.com", subject, date: "2026-11-13T08:00:00Z", unread: true, flagged: false, important: true, bulk: false, ...extra });
const post = (items: MailItem[]): MailSnapshot => ({ configured: true, fetchedAt: "2026-11-13T09:00:00Z", unread: items.length, importantUnread: items.filter((m) => m.important && m.unread).length, bulkUnread: 0, items });
const projekt = (name: string, extra: Partial<ProjektKarte> = {}): ProjektKarte => ({
  id: `p-${name}`,
  name,
  beschreibung: "",
  status: "aktiv",
  verantwortliche: [],
  fortschritt: null,
  stichworte: [],
  vertraulich: false,
  quelle: { art: "eingabe", hinweis: "", kanal: "mac", fremd: false, von: "mensch" },
  erstelltAm: "2026-11-01T08:00:00.000Z",
  geaendertAm: "2026-11-01T08:00:00.000Z",
  offeneAufgaben: 0,
  ueberfaellig: 0,
  naechsteFrist: null,
  risiken: 0,
  letzteEntscheidung: null,
  naechsterSchritt: null,
  eintraege: 0,
  ...extra,
});
const projekte = (liste: ProjektKarte[], vorschlaege = 0): ProjekteSnapshot => ({ projekte: liste, vorschlaege: Array.from({ length: vorschlaege }) as ProjekteSnapshot["vorschlaege"], ablage: "/tmp/projekte.json" });
const nichts: TagesDaten = { calendar: null, tasks: null, mail: null, projekte: null, desk: null, intel: null, documents: null, freigabenOffen: 0, notaus: false };

describe("Tagesübersicht: Termine", () => {
  test("ganztägige zuerst, dann nach Uhrzeit; vorbei, läuft und der nächste sind erkennbar", () => {
    const lage = tageslage(
      { ...nichts, calendar: kalender([ereignis("c", "Mittag", um(12)), ereignis("a", "Früh", um(8)), ereignis("g", "Messe", um(0), { allDay: true, end: um(0, 0, 14) }), ereignis("b", "Jetzt", um(9, 30)), ereignis("m", "Morgen", um(9, 0, 14))]) },
      JETZT,
    );
    assert.deepEqual(lage.termine.map((t) => t.titel), ["Messe", "Früh", "Jetzt", "Mittag"]);
    assert.deepEqual(lage.termine.map((t) => [t.vorbei, t.laeuft]), [[false, false], [true, false], [false, true], [false, false]]);
    assert.equal(lage.naechster?.titel, "Mittag");
    assert.equal(lage.termineMorgen, 1);
  });

  test("ein Termin, der ein laufendes Projekt nennt, verweist auf dessen Akte; abgeschlossene Projekte nicht", () => {
    const lage = tageslage(
      { ...nichts, calendar: kalender([ereignis("a", "Jour fixe Hallenneubau", um(14)), ereignis("b", "Rückblick Altprojekt", um(15)), ereignis("c", "Hallenbad", um(16))]), projekte: projekte([projekt("Hallenneubau"), projekt("Altprojekt", { status: "abgeschlossen" }), projekt("Halle")]) },
      JETZT,
    );
    assert.deepEqual(lage.termine.map((t) => t.projekte.map((p) => p.name)), [["Hallenneubau"], [], []]);
  });

  test("ohne Zugriff auf den Kalender gibt es keine Termine, aber auch keinen Fehler", () => {
    const lage = tageslage({ ...nichts, calendar: { ...kalender([ereignis("a", "X", um(12))]), access: "verweigert" } }, JETZT);
    assert.deepEqual(lage.termine, []);
    assert.equal(lage.naechster, null);
  });
});

describe("Tagesübersicht: Aufgaben, Post und Projekte", () => {
  test("Aufgaben: überfällig, heute und die nächsten sieben Tage; ohne Datum zählt nicht", () => {
    const lage = tageslage({ ...nichts, tasks: aufgaben([aufgabe("alt", "2026-11-10"), aufgabe("heute", "2026-11-13"), aufgabe("bald", "2026-11-18"), aufgabe("fern", "2026-12-24"), aufgabe("irgendwann")]) }, JETZT);
    assert.deepEqual(lage.aufgaben.ueberfaellig.map((t) => t.text), ["alt"]);
    assert.deepEqual(lage.aufgaben.heute.map((t) => t.text), ["heute"]);
    assert.equal(lage.aufgaben.dieseWoche, 1);
  });

  test("Post: nur ungelesene wichtige Mails, höchstens fünf; bei einem Fehler des Postfachs keine", () => {
    const viele = Array.from({ length: 7 }, (_, i) => mailItem(i, `Mail ${i}`));
    const lage = tageslage({ ...nichts, mail: post([...viele, mailItem(20, "Werbung", { important: false, bulk: true }), mailItem(21, "Gelesen", { unread: false })]) }, JETZT);
    assert.equal(lage.post.length, 5);
    assert.ok(lage.brauchtDich.some((h) => h.art === "post" && /7 neue wichtige Mails/.test(h.text)));
    assert.deepEqual(tageslage({ ...nichts, mail: { ...post(viele), error: "Zeitüberschreitung" } }, JETZT).post, []);
  });

  test("Projekte: Überfälliges ist dringend, Fristen bis in drei Tagen fallen auf, pausierte und fernere nicht", () => {
    const lage = tageslage(
      {
        ...nichts,
        projekte: projekte([
          projekt("Ruhig", { naechsteFrist: { text: "Bericht", faellig: "2026-12-01" } }),
          projekt("Bald", { naechsteFrist: { text: "Angebot abgeben", faellig: "2026-11-15" } }),
          projekt("Brennt", { ueberfaellig: 2, naechsteFrist: { text: "Statik prüfen", faellig: "2026-11-10" } }),
          projekt("Pausiert", { status: "pausiert", ueberfaellig: 5 }),
          projekt("Heute", { naechsteFrist: { text: "Vertrag unterschreiben", faellig: "2026-11-13" } }),
        ]),
      },
      JETZT,
    );
    assert.deepEqual(lage.projekte.map((p) => [p.name, p.dringend]), [["Brennt", true], ["Heute", true], ["Bald", false]]);
    assert.equal(lage.projekte[0].grund, "2 Aufgaben sind überfällig: Statik prüfen, seit 3 Tagen überfällig");
    assert.equal(lage.projekte[1].grund, "Vertrag unterschreiben, heute fällig");
  });
});

describe("Tagesübersicht: was auf dich wartet", () => {
  test("ist nichts los, wartet nichts", () => {
    assert.deepEqual(tageslage(nichts, JETZT).brauchtDich, []);
    assert.deepEqual(tageslage({ ...nichts, calendar: kalender([]), tasks: aufgaben([]), mail: post([]), projekte: projekte([]) }, JETZT).brauchtDich, []);
  });

  test("Reihenfolge: erst was JARVIS anhält oder blockiert, dann Fälliges, dann Hinweise", () => {
    const desk = { approvals: [{ state: "offen" }, { state: "ja" }] } as unknown as DeskSnapshot;
    const intel = { warning: { text: "Börsen-Hack", at: "", until: "" } } as unknown as IntelSnapshot;
    const documents = { jobs: [{ state: "fertig", endedAt: new Date(2026, 10, 13, 9).toISOString(), title: "Marktanalyse", thema: "Markt" }, { state: "fertig", endedAt: new Date(2026, 10, 12, 9).toISOString(), title: "Gestern", thema: "Alt" }] } as unknown as DocsSnapshot;
    const lage = tageslage(
      {
        calendar: null,
        tasks: aufgaben([aufgabe("alt", "2026-11-10")]),
        mail: post([mailItem(1, "Angebot")]),
        projekte: projekte([projekt("Brennt", { ueberfaellig: 1 })], 3),
        desk,
        intel,
        documents,
        freigabenOffen: 2,
        notaus: true,
      },
      JETZT,
    );
    assert.deepEqual(lage.brauchtDich.map((h) => h.art), ["notaus", "freigabe", "rueckfrage", "warnung", "vorschlag", "aufgaben", "projekt", "post", "dokument"]);
    assert.deepEqual(lage.brauchtDich.filter((h) => !h.dringend).map((h) => h.art), ["vorschlag", "post", "dokument"]);
    const text = (art: string) => lage.brauchtDich.find((h) => h.art === art)!.text;
    assert.equal(text("freigabe"), "2 Freigaben warten auf dein Ja oder Nein.");
    assert.equal(text("rueckfrage"), "Der Spielgeld-Desk fragt vor einem Kauf nach.");
    assert.equal(text("vorschlag"), "3 Vorschläge fürs Projektgedächtnis warten auf deine Bestätigung.");
    assert.equal(text("projekt"), "Brennt: Eine Aufgabe ist überfällig");
    assert.equal(text("dokument"), "Dokument fertig: Marktanalyse");
    assert.ok(lage.brauchtDich.every((h) => h.href.startsWith("/")), "jeder Hinweis führt in eine Ansicht");
  });

  test("dieselben Daten ergeben dieselbe Übersicht", () => {
    const daten: TagesDaten = { ...nichts, calendar: kalender([ereignis("a", "Früh", um(8))]), tasks: aufgaben([aufgabe("heute", "2026-11-13")]), projekte: projekte([projekt("Bald", { naechsteFrist: { text: "X", faellig: "2026-11-14" } })], 1) };
    assert.deepEqual(tageslage(daten, JETZT), tageslage(structuredClone(daten), new Date(JETZT)));
  });
});

describe("Kurze Befehle zu den neuen Ansichten", () => {
  const ctx: CommandContext = { name: "Benedikt", market: null, weather: null, tasks: null, mail: null, desk: null, calendar: null, intel: null, now: JETZT, session: null };

  test("„Tagesübersicht“ und „Projekte“ öffnen ihre Ansicht", () => {
    assert.equal(decide("Tagesübersicht", ctx, true)?.navigate, "/heute");
    assert.equal(decide("Mein Tag", ctx, true)?.navigate, "/heute");
    assert.equal(decide("Projekte", ctx, true)?.navigate, "/projekte");
    assert.equal(decide("Zeig die Projekte", ctx, true)?.navigate, "/projekte");
    assert.equal(decide("Übersicht", ctx, true)?.navigate, "/", "die Übersicht bleibt, wo sie war");
  });

  test("eine ganze Frage zu einem Projekt geht mit KI-Gehirn an Claude, nicht an die Regel", () => {
    assert.equal(decide("Was ist der Stand im Projekt Hallenneubau und was ist offen?", ctx, true), null);
  });
});
