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

// Offene Risiken (Schritt C4.2) laufen durch dieselben Texte wie Aufgaben. Geprüft wird wieder vor allem, was
// nicht hinausgeht: der Wortlaut eines Risikos aus einem vertraulichen Projekt nie, und über Telegram nur Zahlen,
// solange der Schalter aus ist.
describe("Offene Risiken im Briefing und im Tagesabschluss", () => {
  const MONTAG_FRUEH = new Date(2026, 10, 16, 7, 30);
  const LIEFER = projekt("Hallenneubau", { risiken: 1, risikenUeberfaellig: 1, risikoFrist: { text: "Lieferzeit Stahl", faellig: "2026-11-10" } });
  const GEHEIM = projekt("Adler", { vertraulich: true, risiken: 1, risikenUeberfaellig: 1, risikoFrist: { text: "Kaufpreis platzt", faellig: "2026-11-11" } });
  const MORGEN = projekt("Messe", { risiken: 1, risikoFrist: { text: "Standfläche wird knapp", faellig: "2026-11-14" } });
  const ALT = projekt("Website", { risiken: 1, risikenAlt: { anzahl: 1, text: "Agentur überlastet", tage: 19 } });
  const ALT_GEHEIM = projekt("Adler", { vertraulich: true, risiken: 1, risikenAlt: { anzahl: 1, text: "Kaufpreis platzt", tage: 30 } });

  test("im Briefing steht ein Risiko über der Frist beim Namen nur mit Schalter; aus einem vertraulichen Projekt nie", () => {
    const lage = tageslage({ ...nichts, projekte: projekte([LIEFER, GEHEIM, MORGEN]) }, ABEND);
    const namen = projekteAbsatz(lage, 0, true);
    assert.match(namen, /• Hallenneubau: Ein Risiko ist über der Frist: Lieferzeit Stahl, seit 3 Tagen überfällig/);
    assert.match(namen, /• Messe: Risiko: Standfläche wird knapp, morgen fällig/);
    assert.match(namen, /• ein vertrauliches Projekt: Einzelheiten nur am Mac/);
    assert.ok(ohneGeheimes(namen), namen);
    const zahlen = projekteAbsatz(lage, 0, false);
    assert.equal(zahlen, "Projekte: 3 brauchen dich, 2 davon dringend. Einzelheiten am Mac unter „Heute“.");
    const gesprochen = projektSatz(lage, 0);
    assert.match(gesprochen, /Im Projekt Hallenneubau: Ein Risiko ist über der Frist: Lieferzeit Stahl, seit 3 Tagen überfällig\./);
    assert.ok(ohneGeheimes(gesprochen), gesprochen);
  });

  test("lange unveränderte Risiken stehen nur im Briefing vom Montag", () => {
    const basis = { name: "Benedikt", weather: null, calendar: null, mail: null, tasks: null, intel: null, desk: null, projekte: projekte([ALT, ALT_GEHEIM]), projektNamen: true };
    const freitag = briefingMessage({ ...basis, now: new Date(2026, 10, 13, 7, 30) });
    assert.ok(!/Risik|Website|Projekte/.test(freitag), freitag);
    const montag = briefingMessage({ ...basis, now: MONTAG_FRUEH });
    assert.match(montag, /• Website: Ein Risiko ist seit 19 Tagen unverändert offen: Agentur überlastet/);
    assert.match(montag, /• ein vertrauliches Projekt: Einzelheiten nur am Mac/);
    assert.ok(ohneGeheimes(montag), montag);
    const ohneNamen = briefingMessage({ ...basis, projektNamen: false, now: MONTAG_FRUEH });
    assert.match(ohneNamen, /Projekte: 2 brauchen dich\. Einzelheiten am Mac unter „Heute“\./);
    assert.ok(!/Website|Agentur|Risik/.test(ohneNamen) && ohneGeheimes(ohneNamen), ohneNamen);
  });

  test("der Tagesabschluss nennt Risiken über der Frist und die Frist von morgen, lange unveränderte nicht", () => {
    const a = tagesabschluss({ ...nichts, projekte: projekte([LIEFER, GEHEIM, MORGEN, ALT]) }, new Date(2026, 10, 16, 18, 0));
    assert.deepEqual(a.projekteOffen.map((h) => h.name).sort(), ["Adler", "Hallenneubau"]);
    assert.deepEqual(a.fristenMorgen, [], "am 16. ist die Frist vom 14. nicht mehr „morgen“");
    const freitag = tagesabschluss({ ...nichts, projekte: projekte([LIEFER, GEHEIM, MORGEN, ALT]) }, ABEND);
    assert.deepEqual(freitag.fristenMorgen, [{ id: "p-Messe", name: "Messe", grund: "Risiko: Standfläche wird knapp, morgen fällig", dringend: false, vertraulich: false }]);
    const text = abschlussNachricht(freitag, { name: "Benedikt", namen: true });
    assert.match(text, /Projekte:\n• Hallenneubau: Ein Risiko ist über der Frist: Lieferzeit Stahl, seit 3 Tagen überfällig\n• Messe: Risiko: Standfläche wird knapp, morgen fällig\n• ein vertrauliches Projekt: Einzelheiten nur am Mac/);
    assert.ok(ohneGeheimes(text) && !text.includes("Agentur"), text);
    const zahlen = abschlussNachricht(freitag, { name: "Benedikt", namen: false });
    assert.match(zahlen, /Projekte: 2 haben Überfälliges oder eine Frist von heute, bei einem ist morgen etwas fällig\./);
    assert.ok(!/Lieferzeit|Standfläche|Hallenneubau|Messe/.test(zahlen) && ohneGeheimes(zahlen), zahlen);
  });

  test("ist morgen eine Aufgabe und ein Risiko fällig, steht das Projekt einmal da, mit der Aufgabe", () => {
    const beides = projekt("Messe", { naechsteFrist: { text: "Stand buchen", faellig: "2026-11-14" }, risikoFrist: { text: "Standfläche wird knapp", faellig: "2026-11-14" } });
    assert.deepEqual(tagesabschluss({ ...nichts, projekte: projekte([beides]) }, ABEND).fristenMorgen.map((h) => h.grund), ["Stand buchen, morgen fällig"]);
    // Steht das Projekt schon mit etwas Dringendem da, kommt es nicht ein zweites Mal mit dem Risiko von morgen.
    const brennt = projekt("Halle", { ueberfaellig: 1, naechsteFrist: { text: "Statik prüfen", faellig: "2026-11-10" }, risikoFrist: { text: "Lieferzeit", faellig: "2026-11-14" } });
    const heuteUndMorgen = projekt("Portal", { naechsteFrist: { text: "Angebot", faellig: "2026-11-13" }, risikoFrist: { text: "Agentur", faellig: "2026-11-14" } });
    const a = tagesabschluss({ ...nichts, projekte: projekte([brennt, heuteUndMorgen, MORGEN]) }, ABEND);
    assert.deepEqual(a.projekteOffen.map((h) => h.name).sort(), ["Halle", "Portal"]);
    assert.deepEqual(a.fristenMorgen.map((h) => h.name), ["Messe"]);
    const text = abschlussNachricht(a, { name: "Benedikt", namen: true });
    assert.equal(text.match(/• Halle:/g)?.length, 1, text);
    assert.equal(text.match(/• Portal:/g)?.length, 1, text);
    assert.match(abschlussNachricht(a, { name: "Benedikt", namen: false }), /Projekte: 2 haben Überfälliges oder eine Frist von heute, bei einem ist morgen etwas fällig\./);
    const pausiert = projekt("Ruht", { status: "pausiert", risikoFrist: { text: "Egal", faellig: "2026-11-14" } });
    assert.deepEqual(tagesabschluss({ ...nichts, projekte: projekte([pausiert]) }, ABEND).fristenMorgen, []);
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

// Am Mac schützt macOS den Ordner Dokumente: Ohne Freigabe sieht JARVIS den Tresor, darf aber nicht hineinsehen.
// Die Aufgaben sind dann nicht „keine“, sondern unbekannt, und genau das muss überall dastehen.
describe("Ein Tresor, der sich nicht lesen lässt, ist nicht dasselbe wie keine Aufgaben", () => {
  const GRUND = "macOS sperrt mir den Ordner /Users/b/Documents/Tresor.";
  const kaputt: TasksSnapshot = { configured: true, tasks: [], doneToday: 0, error: GRUND };
  const UNLESBAR = "Der Obsidian-Tresor lässt sich gerade nicht lesen.";
  const ctx: CommandContext = { name: "Benedikt", market: null, weather: null, tasks: kaputt, mail: null, desk: null, calendar: null, intel: null, now: ABEND, session: null };

  test("die Tagesübersicht merkt es sich und stellt es zu dem, was auf dich wartet", () => {
    const lage = tageslage({ ...nichts, tasks: kaputt }, ABEND);
    assert.equal(lage.aufgabenUnlesbar, true);
    assert.deepEqual(lage.brauchtDich, [{ art: "aufgaben", text: UNLESBAR, href: "/aufgaben", dringend: true }]);
    assert.equal(tageslage({ ...nichts, tasks: aufgaben([]) }, ABEND).aufgabenUnlesbar, false, "ein leerer Tresor ist lesbar");
    assert.equal(tageslage(nichts, ABEND).aufgabenUnlesbar, false, "noch nicht geladen ist kein Fehler");
    assert.equal(tageslage({ ...nichts, tasks: { configured: false, tasks: [], doneToday: 0 } }, ABEND).aufgabenUnlesbar, false, "nicht verbunden ist kein Fehler");
  });

  test("der Tagesabschluss sagt es, am Handy und gesprochen, statt „nichts offen geblieben“", () => {
    const a = tagesabschluss({ ...nichts, calendar: kalender([]), tasks: kaputt }, ABEND);
    assert.equal(a.aufgabenProblem, UNLESBAR);
    const text = abschlussNachricht(a, { name: "Benedikt", namen: false });
    assert.equal(text, `Feierabend, Benedikt. Dein Tag in Kürze:\n\nAufgaben: ${UNLESBAR}\n\nMorgen ist dein Kalender frei.`);
    const satz = abschlussSatz(a, "Benedikt");
    assert.ok(satz.includes(UNLESBAR), satz);
    assert.ok(!/nichts offen geblieben/.test(satz), satz);
    assert.equal(tagesabschluss({ ...nichts, tasks: aufgaben([]) }, ABEND).aufgabenProblem, null);
  });

  test("das Morgenbriefing am Handy sagt es, statt die Aufgaben wegzulassen", () => {
    const text = briefingMessage({ name: "Benedikt", now: ABEND, weather: null, calendar: null, mail: null, tasks: kaputt, intel: null, desk: null, projekte: null, projektNamen: false });
    assert.ok(text.includes(`Aufgaben: ${UNLESBAR}`), text);
    assert.ok(!/nichts fällig/.test(text), text);
  });

  test("„Meine Aufgaben“ nennt den Grund und behauptet nicht, es sei nichts fällig", () => {
    const antwort = decide("Meine Aufgaben", ctx, false);
    assert.equal(antwort?.reply, GRUND);
    assert.equal(antwort?.navigate, "/aufgaben");
    assert.equal(antwort?.session, null);
  });

  test("das Briefing nennt den Grund und sagt nicht „es liegt nichts Dringendes an“", () => {
    const antwort = decide("Guten Morgen", { ...ctx, mail: { configured: true, fetchedAt: "2026-11-13T09:00:00Z", unread: 0, importantUnread: 0, bulkUnread: 0, items: [] } }, false);
    assert.ok(antwort?.reply.includes(GRUND), antwort?.reply);
    assert.ok(!/nichts Dringendes/.test(antwort?.reply ?? ""), antwort?.reply);
  });
});
