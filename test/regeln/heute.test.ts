// Die Tagesübersicht (src/lib/heute.ts) und die kurzen Befehle zu den neuen Ansichten. Reine Regeln ohne
// Netz und ohne KI: Dieselben Daten müssen immer dieselbe Übersicht ergeben.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { outlookLuecke, type CalendarEvent, type CalendarSnapshot } from "../../src/lib/calendar";
import { decide, type CommandContext } from "../../src/lib/commands";
import type { DocsSnapshot } from "../../src/lib/documents";
import { kopfSatz, luecken, tageslage, tagesSatz, wartetLeer, type Luecken, type TagesDaten } from "../../src/lib/heute";
import type { IntelSnapshot } from "../../src/lib/intel";
import type { MailItem, MailSnapshot } from "../../src/lib/mail";
import type { DeskSnapshot } from "../../src/lib/paper";
import type { ProjektKarte, ProjekteSnapshot } from "../../src/lib/projekte";
import type { Task, TasksSnapshot } from "../../src/lib/tasks";
import { wetterKurz, type WeatherSnapshot } from "../../src/lib/weather";

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
  risikenUeberfaellig: 0,
  risikoFrist: null,
  risikenAlt: null,
  letzteEntscheidung: null,
  naechsterSchritt: null,
  textVonDritten: false,
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

// Offene Risiken in der Projektüberwachung (Schritt C4.2). Ein Risiko mit Frist zählt wie eine Frist; eines, das
// lange unverändert offen ist, kommt nur am Montag zur Sprache, nicht jeden Tag.
describe("Tagesübersicht: offene Risiken", () => {
  const MONTAG = new Date(2026, 10, 16, 10, 0);
  const eines = (extra: Partial<ProjektKarte>, wann = JETZT) => tageslage({ ...nichts, projekte: projekte([projekt("Halle", extra)]) }, wann).projekte;

  test("ein Risiko über der Frist ist dringend und steht mit Text und Verzug da", () => {
    assert.deepEqual(eines({ risiken: 1, risikenUeberfaellig: 1, risikoFrist: { text: "Lieferzeit Stahl", faellig: "2026-11-10" } }), [
      { id: "p-Halle", name: "Halle", grund: "Ein Risiko ist über der Frist: Lieferzeit Stahl, seit 3 Tagen überfällig", dringend: true, vertraulich: false },
    ]);
    assert.equal(eines({ risikenUeberfaellig: 2, risikoFrist: { text: "Lieferzeit Stahl", faellig: "2026-11-12" } })[0].grund, "2 Risiken sind über der Frist: Lieferzeit Stahl, seit gestern überfällig");
  });

  test("Frist heute ist dringend, bis in drei Tagen fällt auf, danach nicht", () => {
    assert.deepEqual(eines({ risikoFrist: { text: "Genehmigung", faellig: "2026-11-13" } }).map((h) => [h.grund, h.dringend]), [["Risiko: Genehmigung, heute fällig", true]]);
    assert.deepEqual(eines({ risikoFrist: { text: "Genehmigung", faellig: "2026-11-16" } }).map((h) => [h.grund, h.dringend]), [["Risiko: Genehmigung, fällig am 16. November", false]]);
    assert.deepEqual(eines({ risikoFrist: { text: "Genehmigung", faellig: "2026-11-17" } }), []);
  });

  test("ein dringendes Risiko steht auch unter dem, was auf dich wartet", () => {
    const lage = tageslage({ ...nichts, projekte: projekte([projekt("Halle", { risikenUeberfaellig: 1, risikoFrist: { text: "Lieferzeit Stahl", faellig: "2026-11-10" } })]) }, JETZT);
    assert.deepEqual(lage.brauchtDich, [{ art: "projekt", text: "Halle: Ein Risiko ist über der Frist: Lieferzeit Stahl, seit 3 Tagen überfällig", href: "/projekte", dringend: true }]);
  });

  test("Aufgaben und Risiken zusammen: Überfällige Aufgaben stehen vorn, das Risiko fällt nicht unter den Tisch", () => {
    const aufgabeAlt = { ueberfaellig: 1, naechsteFrist: { text: "Statik prüfen", faellig: "2026-11-10" } };
    assert.equal(eines({ ...aufgabeAlt, risikenUeberfaellig: 1, risikoFrist: { text: "Lieferzeit", faellig: "2026-11-01" } })[0].grund, "Eine Aufgabe ist überfällig: Statik prüfen, seit 3 Tagen überfällig; außerdem ist ein Risiko über der Frist");
    assert.equal(eines({ ...aufgabeAlt, risikenUeberfaellig: 3, risikoFrist: { text: "Lieferzeit", faellig: "2026-11-01" } })[0].grund, "Eine Aufgabe ist überfällig: Statik prüfen, seit 3 Tagen überfällig; außerdem sind 3 Risiken über der Frist");
    assert.equal(eines({ ...aufgabeAlt, risikoFrist: { text: "Lieferzeit", faellig: "2026-11-13" } })[0].grund, "Eine Aufgabe ist überfällig: Statik prüfen, seit 3 Tagen überfällig; außerdem ist heute ein Risiko fällig");
    assert.equal(eines({ ...aufgabeAlt, risikoFrist: { text: "Lieferzeit", faellig: "2026-11-14" } })[0].grund, "Eine Aufgabe ist überfällig: Statik prüfen, seit 3 Tagen überfällig", "ein Risiko von morgen ist nicht dringend");
  });

  test("ist ein Risiko über der Frist und heute eine Aufgabe fällig, steht beides da", () => {
    const h = eines({ risikenUeberfaellig: 1, risikoFrist: { text: "Lieferzeit", faellig: "2026-11-11" }, naechsteFrist: { text: "Vertrag", faellig: "2026-11-13" } })[0];
    assert.equal(h.grund, "Ein Risiko ist über der Frist: Lieferzeit, seit 2 Tagen überfällig; außerdem ist heute eine Aufgabe fällig");
    assert.equal(eines({ risikenUeberfaellig: 1, risikoFrist: { text: "Lieferzeit", faellig: "2026-11-11" }, naechsteFrist: { text: "Vertrag", faellig: "2026-11-14" } })[0].grund, "Ein Risiko ist über der Frist: Lieferzeit, seit 2 Tagen überfällig");
  });

  test("ohne Überfälliges zählt die frühere Frist; bei Gleichstand die Aufgabe, und was heute fällig ist, wird genannt", () => {
    const risikoHeute = { text: "Genehmigung", faellig: "2026-11-13" };
    assert.deepEqual(eines({ naechsteFrist: { text: "Vertrag", faellig: "2026-11-15" }, risikoFrist: risikoHeute }).map((h) => [h.grund, h.dringend]), [["Risiko: Genehmigung, heute fällig", true]]);
    assert.deepEqual(eines({ naechsteFrist: { text: "Vertrag", faellig: "2026-11-13" }, risikoFrist: risikoHeute }).map((h) => [h.grund, h.dringend]), [["Vertrag, heute fällig; außerdem ist heute ein Risiko fällig", true]]);
    assert.deepEqual(eines({ naechsteFrist: { text: "Vertrag", faellig: "2026-11-14" }, risikoFrist: { text: "Genehmigung", faellig: "2026-11-14" } }).map((h) => [h.grund, h.dringend]), [["Vertrag, morgen fällig", false]]);
    assert.deepEqual(eines({ naechsteFrist: { text: "Vertrag", faellig: "2026-12-20" }, risikoFrist: { text: "Genehmigung", faellig: "2026-11-15" } }).map((h) => h.grund), ["Risiko: Genehmigung, fällig am 15. November"]);
  });

  test("ein lange unverändertes Risiko kommt nur am Montag zur Sprache und ist nie dringend", () => {
    const alt = { risiken: 1, risikenAlt: { anzahl: 1, text: "Schlüsselperson fällt aus", tage: 16 } };
    assert.deepEqual(eines(alt), [], "an einem Freitag steht nichts da");
    assert.deepEqual(eines({ risiken: 1, risikenAlt: { anzahl: 1, text: "Schlüsselperson fällt aus", tage: 19 } }, MONTAG), [
      { id: "p-Halle", name: "Halle", grund: "Ein Risiko ist seit 19 Tagen unverändert offen: Schlüsselperson fällt aus", dringend: false, vertraulich: false },
    ]);
    for (let tag = 17; tag <= 22; tag++) assert.deepEqual(eines(alt, new Date(2026, 10, tag, 10, 0)), [], `am ${tag}.11. steht nichts da`);
    assert.equal(eines(alt, new Date(2026, 10, 23, 10, 0)).length, 1, "am Montag darauf wieder");
    assert.equal(tageslage({ ...nichts, projekte: projekte([projekt("Halle", alt)]) }, MONTAG).brauchtDich.length, 0, "nicht unter dem, was dringend wartet");
  });

  test("mehrere alte Risiken stehen in einem Satz, mit dem ältesten", () => {
    assert.equal(eines({ risikenAlt: { anzahl: 3, text: "Schlüsselperson fällt aus", tage: 40 } }, MONTAG)[0].grund, "3 Risiken sind seit mindestens 14 Tagen unverändert offen, das älteste seit 40 Tagen: Schlüsselperson fällt aus");
  });

  test("hat das Projekt am Montag schon einen anderen Anlass, steht das alte Risiko als Nachsatz dabei; an anderen Tagen nicht", () => {
    const alt = { anzahl: 1, text: "Schlüsselperson fällt aus", tage: 19 };
    const frist = { naechsteFrist: { text: "Vertrag", faellig: "2026-11-17" } };
    assert.deepEqual(eines({ risikenAlt: alt, ...frist }, MONTAG).map((h) => [h.grund, h.dringend]), [["Vertrag, morgen fällig; außerdem ist ein Risiko seit 19 Tagen unverändert offen", false]]);
    assert.deepEqual(eines({ risikenAlt: alt, ...frist }, new Date(2026, 10, 14, 10, 0)).map((h) => h.grund), ["Vertrag, fällig am 17. November"], "am Samstag ohne Nachsatz");
    // Gerade ein Projekt, in dem ständig etwas überfällig ist, darf die Erinnerung nicht für immer verlieren.
    const brennt = { ueberfaellig: 1, naechsteFrist: { text: "Statik prüfen", faellig: "2026-11-10" }, risikenUeberfaellig: 1, risikoFrist: { text: "Lieferzeit", faellig: "2026-11-01" } };
    assert.equal(
      eines({ ...brennt, risikenAlt: { anzahl: 3, text: "Schlüsselperson fällt aus", tage: 60 } }, MONTAG)[0].grund,
      "Eine Aufgabe ist überfällig: Statik prüfen, seit 6 Tagen überfällig; außerdem ist ein Risiko über der Frist; außerdem sind 3 Risiken seit mindestens 14 Tagen unverändert offen",
    );
    assert.equal(eines({ risikenUeberfaellig: 1, risikoFrist: { text: "Lieferzeit", faellig: "2026-11-13" }, risikenAlt: alt }, MONTAG)[0].grund, "Ein Risiko ist über der Frist: Lieferzeit, seit 3 Tagen überfällig; außerdem ist ein Risiko seit 19 Tagen unverändert offen");
    assert.equal(eines({ risikoFrist: { text: "Genehmigung", faellig: "2026-11-16" }, risikenAlt: alt }, MONTAG)[0].grund, "Risiko: Genehmigung, heute fällig; außerdem ist ein Risiko seit 19 Tagen unverändert offen");
  });

  test("pausierte Projekte melden nichts, auch am Montag nicht", () => {
    const alt = { anzahl: 1, text: "Schlüsselperson fällt aus", tage: 19 };
    assert.deepEqual(eines({ risikenAlt: alt, status: "pausiert", risikenUeberfaellig: 1, risikoFrist: { text: "Lieferzeit", faellig: "2026-11-01" } }, MONTAG), []);
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

describe("Tagesübersicht: Was JARVIS gerade nicht weiß, ist nicht „nichts“", () => {
  const alles: TagesDaten = { ...nichts, calendar: kalender([]), tasks: aufgaben([]), mail: post([]), projekte: projekte([]) };
  const KEINE: Luecken = { kalender: null, outlook: null, aufgaben: null, post: null, projekte: null };
  const laedt = (text: string) => ({ art: "laedt" as const, text });
  const fehlt = (text: string) => ({ art: "fehlt" as const, text });
  const gestoert = (text: string) => ({ art: "gestoert" as const, text });

  test("ist alles gelesen, gibt es keine Lücke, und ein leerer Tag heißt auch so", () => {
    assert.deepEqual(luecken(alles), KEINE);
    assert.equal(kopfSatz(tageslage(alles, JETZT), luecken(alles)), "Heute steht kein Termin an");
    assert.equal(tagesSatz(tageslage(alles, JETZT), luecken(alles)), "Sonst liegt heute nichts an.");
    assert.equal(wartetLeer(luecken(alles), true), "Nichts wartet auf dich.");
  });

  test("solange etwas noch lädt, behauptet die Seite nichts darüber", () => {
    const l = luecken(nichts);
    assert.deepEqual(l, { kalender: laedt("Der Kalender lädt noch."), outlook: null, aufgaben: laedt("Die Aufgaben laden noch."), post: laedt("Das Postfach lädt noch."), projekte: laedt("Die Projekte laden noch.") });
    assert.equal(kopfSatz(tageslage(nichts, JETZT), l), "Der Kalender lädt noch");
    assert.equal(tagesSatz(tageslage(nichts, JETZT), l), "Der Rest des Tages lädt noch.");
    assert.equal(wartetLeer(l, true), "Lädt noch, was auf dich wartet.");
    // Das Übrige, aus dem die Liste entsteht (Freigaben und Not-Aus, Desk, Intel, Dokumente), gehört dazu:
    // Solange es fehlt, ist „nichts wartet“ nicht sicher.
    assert.equal(wartetLeer(luecken(alles), false), "Lädt noch, was auf dich wartet.");
    // Lädt nur noch der Kalender, steht der Rest schon da.
    const fast = { ...alles, calendar: null, tasks: aufgaben([aufgabe("Bauamt anrufen", "2026-11-13")]) };
    assert.equal(tagesSatz(tageslage(fast, JETZT), luecken(fast)), "Eine Aufgabe ist heute fällig.");
  });

  test("Kalender: nicht verbunden, nicht am Mac, nicht erlaubt oder gestört steht da, statt „kein Termin“", () => {
    const mit = (access: CalendarSnapshot["access"], extra: Partial<CalendarSnapshot> = {}) => ({ ...alles, calendar: { ...kalender([]), access, ...extra } });
    assert.deepEqual(luecken(mit("offen")).kalender, fehlt("Der Kalender ist noch nicht verbunden."));
    assert.deepEqual(luecken(mit("kein-mac")).kalender, fehlt("Den Kalender gibt es nur auf dem Mac."));
    // Ein Fehler geht vorbei; was der Mac dazu meldet, steht nicht in der Übersicht.
    const fehler = mit("fehler", { error: "osascript: Zeitüberschreitung <b>" });
    assert.deepEqual(luecken(fehler).kalender, gestoert("Der Kalender lässt sich gerade nicht lesen."));
    assert.equal(kopfSatz(tageslage(fehler, JETZT), luecken(fehler)), "Der Kalender lässt sich gerade nicht lesen");
    // Eine fehlende Erlaubnis geht nicht von selbst vorbei: Das steht da, ohne „gerade“.
    for (const access of ["verweigert", "nur-schreiben"] as const) {
      assert.deepEqual(luecken(mit(access)).kalender, gestoert("JARVIS darf den Kalender nicht lesen."), access);
      assert.equal(kopfSatz(tageslage(mit(access), JETZT), luecken(mit(access))), "JARVIS darf den Kalender nicht lesen", access);
    }
    // Gibt es einen Termin, steht er im Kopf; dann braucht es dort keinen Satz über Lücken.
    const voll = { ...alles, calendar: kalender([ereignis("a", "Abnahme", um(14))]) };
    assert.equal(kopfSatz(tageslage(voll, JETZT), luecken(voll)), "Abnahme");
    const vorbei = { ...alles, calendar: kalender([ereignis("a", "Frühbesprechung", um(8))]) };
    assert.equal(kopfSatz(tageslage(vorbei, JETZT), luecken(vorbei)), "Für heute ist kein Termin mehr offen");
  });

  test("fehlen Outlook-Termine, steht das bei den Terminen, und „kein Termin“ wird nicht behauptet", () => {
    const mit = (outlook: CalendarSnapshot["outlook"]) => ({ ...alles, calendar: { ...kalender([]), outlook } });
    const aus = mit({ konto: "b@example.com", extern: false, fehler: "Microsoft antwortet nicht" });
    assert.equal(luecken(aus).kalender, null);
    // Derselbe Satz wie im Raum Kalender und im Gespräch.
    assert.deepEqual(luecken(aus).outlook, gestoert(outlookLuecke(aus.calendar)));
    assert.equal(kopfSatz(tageslage(aus, JETZT), luecken(aus)), "Die Termine aus Outlook fehlen gerade");
    // Auch wenn Outlook mehr Termine hat, als JARVIS auf einmal liest, ist „kein Termin“ nicht sicher.
    const zuViele = mit({ konto: "b@example.com", extern: false, unvollstaendig: true });
    assert.deepEqual(luecken(zuViele).outlook, gestoert("Aus Outlook fehlen gerade Termine: Es sind mehr, als ich auf einmal lese."));
    assert.doesNotMatch(kopfSatz(tageslage(zuViele, JETZT), luecken(zuViele)), /kein Termin/);
    // Ohne Lücke bei Outlook steht auch keine da.
    assert.equal(luecken(mit({ konto: "b@example.com", extern: false })).outlook, null);
  });

  test("Aufgaben und Post: nicht verbunden, unlesbar oder ausgefallen", () => {
    const ohne = { ...alles, tasks: { configured: false, tasks: [], doneToday: 0 } as TasksSnapshot, mail: { configured: false } as MailSnapshot };
    assert.deepEqual(luecken(ohne).aufgaben, fehlt("Obsidian ist noch nicht verbunden."));
    assert.deepEqual(luecken(ohne).post, fehlt("Das Postfach ist noch nicht verbunden."));
    assert.equal(tagesSatz(tageslage(ohne, JETZT), luecken(ohne)), "Aufgaben und Post sind noch nicht verbunden.");
    assert.equal(wartetLeer(luecken(ohne), true), "Nichts wartet auf dich.", "was nicht verbunden ist, kann auch nicht warten");

    const kaputt = { ...alles, tasks: { ...aufgaben([]), error: "EACCES" } as TasksSnapshot, mail: { ...post([]), error: "Der Mail-Server antwortet nicht." } };
    assert.deepEqual(luecken(kaputt).aufgaben, gestoert("Der Obsidian-Tresor lässt sich gerade nicht lesen."));
    assert.deepEqual(luecken(kaputt).post, gestoert("Das Postfach antwortet nicht."));
    assert.equal(tagesSatz(tageslage(kaputt, JETZT), luecken(kaputt)), "Die Aufgaben lassen sich gerade nicht lesen, das Postfach antwortet nicht.");
    // Es zählt die Art der Lücke, nicht ihr Wortlaut.
    assert.equal(wartetLeer({ ...KEINE, post: gestoert("Anders gesagt.") }, true), "Soweit JARVIS es gerade lesen kann, wartet nichts auf dich.");
    assert.equal(wartetLeer({ ...KEINE, aufgaben: gestoert("Anders gesagt.") }, true), "Soweit JARVIS es gerade lesen kann, wartet nichts auf dich.");
    assert.equal(wartetLeer({ ...KEINE, projekte: laedt("Anders gesagt.") }, true), "Lädt noch, was auf dich wartet.");
    assert.equal(wartetLeer({ ...KEINE, kalender: gestoert("Der Kalender lässt sich gerade nicht lesen.") }, true), "Nichts wartet auf dich.", "Termine stehen nicht unter „Wartet auf dich“");
    assert.equal(tagesSatz(tageslage(alles, JETZT), { ...KEINE, post: gestoert("Anders gesagt.") }), "Das Postfach antwortet nicht.");
    assert.equal(tagesSatz(tageslage(alles, JETZT), { ...KEINE, aufgaben: laedt("Anders gesagt.") }), "Der Rest des Tages lädt noch.");

    // Nur das Postfach fehlt: Was bekannt ist, steht da, die Lücke dahinter.
    const halb = { ...alles, tasks: aufgaben([aufgabe("Bauamt anrufen", "2026-11-13")]), mail: { ...post([]), error: "x" } };
    assert.equal(tagesSatz(tageslage(halb, JETZT), luecken(halb)), "Eine Aufgabe ist heute fällig, das Postfach antwortet nicht.");
  });

  test("der Satz zum Tag zählt wie bisher, wenn alles da ist", () => {
    const d = { ...alles, tasks: aufgaben([aufgabe("A", "2026-11-13"), aufgabe("B", "2026-11-13"), aufgabe("C", "2026-11-10")]), mail: post([mailItem(1, "Angebot"), mailItem(2, "Abnahme")]) };
    assert.equal(tagesSatz(tageslage(d, JETZT), luecken(d)), "2 Aufgaben sind heute fällig, eine ist überfällig, 2 wichtige Mails sind neu.");
  });
});

describe("Wetter: Beispieldaten sind kein Wetter", () => {
  const wetter = (source: WeatherSnapshot["source"]): WeatherSnapshot => ({ source, place: "Deggendorf", temperature: 11.4, feelsLike: 9, humidity: 78, windKmh: 14, description: "teils bewölkt", days: [] });
  const ctx: CommandContext = { name: "Benedikt", market: null, weather: null, tasks: null, mail: null, desk: null, calendar: null, intel: null, now: JETZT, session: null };

  test("echtes Wetter steht in einem kurzen Satz da", () => {
    assert.equal(wetterKurz(wetter("live")), "11\u00a0°C, teils bewölkt in Deggendorf.");
    assert.match(decide("Briefing", { ...ctx, weather: wetter("live") }, false)?.reply ?? "", /^Guten Morgen, Benedikt\. Draußen hat es 11 Grad, teils bewölkt\. /);
  });

  test("ohne Verbindung zum Wetterdienst steht kein erfundenes Wetter da, weder in „Heute“ noch im Briefing", () => {
    assert.equal(wetterKurz(wetter("demo")), "");
    assert.equal(wetterKurz(null), "");
    const briefing = decide("Briefing", { ...ctx, weather: wetter("demo") }, false)?.reply ?? "";
    assert.match(briefing, /^Guten Morgen, Benedikt\. /);
    assert.doesNotMatch(briefing, /Draußen hat es|11 Grad/);
  });

  test("wer ausdrücklich nach dem Wetter fragt, erfährt, dass es Beispieldaten sind", () => {
    assert.match(decide("Wetter", { ...ctx, weather: wetter("demo") }, false)?.reply ?? "", /Achtung, das sind Beispieldaten, ich habe gerade keine Verbindung\.$/);
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
    // Das Wort „Projekt“ allein öffnet nicht die Ansicht: Kurze Fragen zu einem Projekt gehen an das KI-Gehirn …
    assert.equal(decide("Was macht Projekt Hallenneubau", ctx, true), null);
    assert.equal(decide("Stand Projekt Halle", ctx, true), null);
    // … und ohne KI-Gehirn greifen die Regeln für Post und Aufgaben, nicht die Projektansicht.
    assert.notEqual(decide("Mails zum Projekt Alpha", ctx, false)?.navigate, "/projekte");
    assert.notEqual(decide("Aufgaben im Projekt Alpha", ctx, false)?.navigate, "/projekte");
    for (const satz of ["Projekt", "Meine Projekte", "Zeig mir die Projekte", "Projektübersicht", "Öffne das Projektgedächtnis", "Geh zu den Projekten", "Projekte zeigen"]) {
      assert.equal(decide(satz, ctx, true)?.navigate, "/projekte", satz);
      assert.equal(decide(satz, ctx, false)?.navigate, "/projekte", `${satz} (ohne KI-Gehirn)`);
    }
  });
});
