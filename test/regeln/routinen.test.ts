// Was JARVIS von selbst meldet (src/lib/routinen.ts): die Projekte im Morgenbriefing und der Tagesabschluss.
// Reine Regeln ohne Netz und ohne KI. Geprüft wird vor allem, was dabei NICHT hinausgeht: vertrauliche
// Projekte nie beim Namen, und über Telegram Projektnamen nur, wenn es eingeschaltet ist.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { CalendarEvent, CalendarSnapshot } from "../../src/lib/calendar";
import { decide, type CommandContext } from "../../src/lib/commands";
import { tageslage, type TagesDaten } from "../../src/lib/heute";
import type { ProjektKarte, ProjekteSnapshot } from "../../src/lib/projekte";
import { abschlussNachricht, abschlussSatz, istFaellig, projekteAbsatz, projektSatz, tagesabschluss } from "../../src/lib/routinen";
import type { Task, TasksSnapshot } from "../../src/lib/tasks";
import { briefingMessage, commandOf, helpText, TELEGRAM_DEFAULTS } from "../../src/lib/telegram";

const ABEND = new Date(2026, 10, 13, 18, 0);
const um = (stunde: number, minute = 0, tag = 13) => new Date(2026, 10, tag, stunde, minute).getTime();

const ereignis = (id: string, title: string, start: number, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({ id, title, start, end: start + 3_600_000, allDay: false, location: "", calendar: "Firma", ...extra });
const kalender = (events: CalendarEvent[]): CalendarSnapshot => ({ access: "ok", events, calendars: [], target: "Firma", from: "2026-11-13", to: "2026-12-14" });
const aufgabe = (text: string, due?: string): Task => ({ id: `Eingang.md:${text}`, file: "Eingang.md", line: 0, raw: `- [ ] ${text}`, text, due, important: false, recurring: false, tags: [] });
const aufgaben = (tasks: Task[], doneToday = 0): TasksSnapshot => ({ configured: true, tasks, doneToday });
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

// Ein offenes Projekt mit Überfälligem, ein vertrauliches mit Überfälligem, eines mit Frist morgen, eines ohne Anlass.
const HALLE = projekt("Hallenneubau", { ueberfaellig: 1, naechsteFrist: { text: "Statik prüfen", faellig: "2026-11-10" } });
const ADLER = projekt("Adler", { vertraulich: true, ueberfaellig: 2, naechsteFrist: { text: "Kaufpreis nachverhandeln", faellig: "2026-11-11" } });
const MESSE = projekt("Messe", { naechsteFrist: { text: "Stand buchen", faellig: "2026-11-14" } });
const RUHIG = projekt("Website", { naechsteFrist: { text: "Texte liefern", faellig: "2026-12-20" } });
const ALLE = projekte([HALLE, ADLER, MESSE, RUHIG], 2);
const GEHEIMES = ["Adler", "Kaufpreis"];
const ohneGeheimes = (text: string) => GEHEIMES.every((wort) => !text.includes(wort));

describe("Projekte im Briefing", () => {
  const lage = tageslage({ ...nichts, projekte: ALLE }, ABEND);

  test("ohne den Schalter stehen über Telegram nur Zahlen, kein Projektname und kein Inhalt", () => {
    const text = projekteAbsatz(lage, 2, false);
    assert.match(text, /^Projekte: 3 brauchen dich, 2 davon dringend\. Einzelheiten am Mac unter „Heute“\./);
    assert.match(text, /2 Vorschläge fürs Projektgedächtnis warten am Mac auf deine Bestätigung\./);
    for (const wort of ["Hallenneubau", "Statik", "Messe", "Stand buchen", ...GEHEIMES]) assert.ok(!text.includes(wort), `„${wort}“ steht im Text: ${text}`);
  });

  test("mit dem Schalter stehen offene Projekte beim Namen, vertrauliche werden nur gezählt", () => {
    const text = projekteAbsatz(lage, 0, true);
    assert.match(text, /• Hallenneubau: Eine Aufgabe ist überfällig: Statik prüfen, seit 3 Tagen überfällig/);
    assert.match(text, /• Messe: Stand buchen, morgen fällig/);
    assert.match(text, /• ein vertrauliches Projekt: Einzelheiten nur am Mac/);
    assert.ok(ohneGeheimes(text), text);
    assert.ok(!text.includes("Website"), "ein Projekt ohne Anlass steht nicht im Briefing");
  });

  test("braucht kein Projekt Aufmerksamkeit und wartet kein Vorschlag, steht nichts im Briefing", () => {
    const ruhig = tageslage({ ...nichts, projekte: projekte([RUHIG, projekt("Alt", { status: "abgeschlossen", ueberfaellig: 3 })]) }, ABEND);
    assert.equal(projekteAbsatz(ruhig, 0, true), "");
    assert.equal(projekteAbsatz(ruhig, 0, false), "");
    assert.equal(projektSatz(ruhig, 0), "");
    assert.equal(projekteAbsatz(ruhig, 1, false), "Ein Vorschlag fürs Projektgedächtnis wartet am Mac auf deine Bestätigung.");
  });

  test("am Mac nennt JARVIS höchstens zwei Projekte, vertrauliche nie: Was er sagt, steht danach im Gesprächsverlauf", () => {
    const satz = projektSatz(lage, 1);
    assert.match(satz, /^Im Projekt Hallenneubau: .*Im Projekt Messe: Stand buchen, morgen fällig\. Ein weiteres Projekt braucht dich, das steht unter Heute\. Ein Vorschlag fürs Projektgedächtnis wartet auf deine Bestätigung\.$/);
    assert.ok(ohneGeheimes(satz), satz);
    const nurGeheim = projektSatz(tageslage({ ...nichts, projekte: projekte([ADLER]) }, ABEND), 0);
    assert.equal(nurGeheim, "Ein Projekt braucht dich, das steht unter Heute.");
  });

  test("das Briefing fürs Handy enthält den Absatz; ohne Projektgedächtnis bleibt es wie bisher", () => {
    const basis = { name: "Benedikt", now: new Date(2026, 10, 13, 7, 30), weather: null, calendar: null, mail: null, tasks: null, intel: null, desk: null };
    const ohne = briefingMessage(basis);
    assert.equal(briefingMessage({ ...basis, projekte: null }), ohne);
    assert.equal(briefingMessage({ ...basis, projekte: projekte([RUHIG]) }), ohne, "nichts zu melden, kein Absatz");
    const zahlen = briefingMessage({ ...basis, projekte: ALLE });
    assert.match(zahlen, /Projekte: 3 brauchen dich/);
    assert.ok(!zahlen.includes("Hallenneubau") && ohneGeheimes(zahlen), "Voreinstellung: keine Namen");
    const namen = briefingMessage({ ...basis, projekte: ALLE, projektNamen: true });
    assert.match(namen, /• Hallenneubau: /);
    assert.ok(ohneGeheimes(namen), namen);
  });
});

describe("Tagesabschluss", () => {
  const voll: TagesDaten = {
    ...nichts,
    calendar: kalender([ereignis("h", "Heute Nachmittag", um(15)), ereignis("b", "Jour fixe", um(9, 0, 14), { location: "Büro" }), ereignis("a", "Messe", um(0, 0, 14), { allDay: true, end: um(0, 0, 15) }), ereignis("x", "Übermorgen", um(9, 0, 15))]),
    tasks: aufgaben([aufgabe("Angebot prüfen", "2026-11-13"), aufgabe("Alte Sache", "2026-11-09"), aufgabe("Rückruf Steuerberater", "2026-11-14"), aufgabe("Später", "2026-11-20"), aufgabe("Ohne Datum")], 3),
    projekte: ALLE,
    freigabenOffen: 1,
  };

  test("stellt zusammen, was heute offen blieb, was morgen kommt und was wartet", () => {
    const a = tagesabschluss(voll, ABEND);
    assert.equal(a.erledigt, 3);
    assert.deepEqual(a.offenHeute.map((t) => t.text), ["Angebot prüfen"]);
    assert.equal(a.ueberfaellig, 1);
    assert.deepEqual(a.termineMorgen?.map((e) => e.title), ["Messe", "Jour fixe"]);
    assert.deepEqual(a.aufgabenMorgen.map((t) => t.text), ["Rückruf Steuerberater"]);
    assert.deepEqual(a.projekteOffen.map((h) => h.name).sort(), ["Adler", "Hallenneubau"]);
    assert.deepEqual(a.fristenMorgen.map((h) => h.name), ["Messe"]);
    assert.equal(a.vorschlaege, 2);
    assert.deepEqual(a.wartet, ["Eine Freigabe wartet auf dein Ja oder Nein."]);
  });

  test("die Nachricht aufs Handy: Listen für morgen, Projekte nur als Zahl, solange der Schalter aus ist", () => {
    const text = abschlussNachricht(tagesabschluss(voll, ABEND), { name: "Benedikt", namen: false });
    assert.match(text, /^Feierabend, Benedikt\. Dein Tag in Kürze:/);
    assert.match(text, /Heute: 3 Aufgaben erledigt, eine von heute ist offen geblieben, eine Aufgabe ist überfällig\.\n• Angebot prüfen/);
    assert.match(text, /Morgen im Kalender:\n• ganztägig Messe\n• 09:00 Jour fixe, Büro/);
    assert.match(text, /Morgen fällig:\n• Rückruf Steuerberater/);
    assert.match(text, /Projekte: 2 haben Überfälliges oder eine Frist von heute, bei einem ist morgen etwas fällig\. Einzelheiten am Mac unter „Heute“\./);
    assert.match(text, /Wartet noch auf dich:\n• Eine Freigabe wartet auf dein Ja oder Nein\./);
    for (const wort of ["Hallenneubau", "Statik", "Stand buchen", "Übermorgen", "Heute Nachmittag", ...GEHEIMES]) assert.ok(!text.includes(wort), `„${wort}“ steht im Text`);
  });

  test("mit dem Schalter stehen Projektnamen in der Nachricht, vertrauliche nie", () => {
    const text = abschlussNachricht(tagesabschluss(voll, ABEND), { name: "Benedikt", namen: true, handel: "Der Spielgeld-Handel steht bei plus 2 Prozent." });
    assert.match(text, /Projekte:\n• Hallenneubau: .*\n• Messe: Stand buchen, morgen fällig\n• ein vertrauliches Projekt: Einzelheiten nur am Mac/);
    assert.ok(ohneGeheimes(text), text);
    assert.ok(text.endsWith("Der Spielgeld-Handel steht bei plus 2 Prozent."));
  });

  test("ein leerer Tag ergibt eine kurze, ehrliche Nachricht; ohne Kalender steht nichts Erfundenes darin", () => {
    const leer = abschlussNachricht(tagesabschluss({ ...nichts, calendar: kalender([]), tasks: aufgaben([]) }, ABEND), { name: "Benedikt", namen: false });
    assert.equal(leer, "Feierabend, Benedikt. Dein Tag in Kürze:\n\nHeute: Von den Aufgaben ist nichts offen geblieben.\n\nMorgen ist dein Kalender frei.");
    const ohneKalender = abschlussNachricht(tagesabschluss(nichts, ABEND), { name: "Benedikt", namen: false });
    assert.ok(!/Kalender|Morgen/.test(ohneKalender), ohneKalender);
    const gesperrt = abschlussNachricht(tagesabschluss({ ...nichts, calendar: { ...kalender([]), access: "verweigert", error: "Kein Zugriff auf den Kalender." } as CalendarSnapshot }, ABEND), { name: "Benedikt", namen: false });
    assert.match(gesperrt, /Kalender: Kein Zugriff auf den Kalender\./);
    assert.ok(!gesperrt.includes("Kalender frei"), "ein nicht lesbarer Kalender ist kein freier Kalender");
  });

  test("gesprochen am Mac: kurz, mit dem ersten Termin von morgen, ohne vertrauliche Namen", () => {
    const satz = abschlussSatz(tagesabschluss(voll, ABEND), "Benedikt");
    assert.match(satz, /^Feierabend, Benedikt\. Heute: 3 Aufgaben erledigt, eine von heute ist offen geblieben, eine ist überfällig\. Morgen hast du 2 Termine, der erste um 09:00 Uhr: Jour fixe\. Eine Aufgabe ist morgen fällig\./);
    assert.match(satz, /Im Projekt Hallenneubau: /);
    assert.ok(ohneGeheimes(satz), satz);
  });

  test("der Zuruf „Tagesabschluss“ antwortet ohne KI und öffnet „Heute“", () => {
    const ctx: CommandContext = { name: "Benedikt", now: ABEND, market: null, weather: null, tasks: voll.tasks, mail: null, desk: null, calendar: voll.calendar, intel: null, projekte: ALLE, session: null };
    for (const zuruf of ["Tagesabschluss", "Feierabend", "tagesabschluss bitte"]) {
      const d = decide(zuruf, ctx, true);
      assert.equal(d?.navigate, "/heute", zuruf);
      assert.match(d!.reply, /^Feierabend, Benedikt\./);
      assert.ok(ohneGeheimes(d!.reply), d!.reply);
    }
    const briefing = decide("Briefing", ctx, true);
    assert.match(briefing!.reply, /Im Projekt Hallenneubau: /, "das Briefing am Mac nennt die Projekte");
    assert.ok(ohneGeheimes(briefing!.reply), briefing!.reply);
  });
});

describe("Routinen: einstellbar und abschaltbar", () => {
  test("der Tagesabschluss ist aus, bis eine Uhrzeit eingestellt ist; Projektnamen über Telegram ebenso", () => {
    assert.equal(TELEGRAM_DEFAULTS.abschluss, null);
    assert.equal(TELEGRAM_DEFAULTS.projekte, false);
  });

  test("eine tägliche Meldung kommt einmal: ab der Uhrzeit, höchstens drei Stunden später, nie am selben Tag doppelt", () => {
    const fenster = 3 * 3_600_000;
    const am = (stunde: number, minute: number, tag = 13) => new Date(2026, 10, tag, stunde, minute);
    assert.equal(istFaellig(null, am(18, 0), null, fenster), false, "abgeschaltet");
    assert.equal(istFaellig("18:00", am(17, 59), null, fenster), false, "zu früh");
    assert.equal(istFaellig("18:00", am(18, 0), null, fenster), true);
    assert.equal(istFaellig("18:00", am(20, 59), null, fenster), true, "der Mac hat geschlafen");
    assert.equal(istFaellig("18:00", am(21, 0), null, fenster), false, "zu spät");
    assert.equal(istFaellig("18:00", am(18, 5), "2026-11-13", fenster), false, "heute schon gesendet");
    assert.equal(istFaellig("18:00", am(18, 5, 14), "2026-11-13", fenster), true, "am nächsten Tag wieder");
    assert.equal(istFaellig("23:30", am(0, 10, 14), "2026-11-12", fenster), false, "nicht nach Mitternacht nachgeholt");
  });

  test("Telegram versteht /abschluss und „Feierabend“; die Hilfe nennt den Befehl", () => {
    assert.equal(commandOf("/abschluss"), "abschluss");
    assert.equal(commandOf("Feierabend!"), "abschluss");
    assert.equal(commandOf("Tagesabschluss"), "abschluss");
    assert.equal(commandOf("Feierabend ist erst um sechs"), null, "ein ganzer Satz geht an das KI-Gehirn");
    assert.match(helpText("Benedikt", true), /\/abschluss – /);
  });
});
