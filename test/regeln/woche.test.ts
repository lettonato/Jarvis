// Der Wochenbericht (src/lib/woche.ts): was diese Woche erledigt wurde, was liegt, was in den nächsten sieben Tagen
// kommt. Reine Regeln ohne Netz und ohne KI. Geprüft wird auch hier, was NICHT hinausgeht (vertrauliche Projekte,
// Outlook-Termine ohne Freigabe) und dass Unbekanntes nie als „nichts“ dasteht.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { CalendarEvent, CalendarSnapshot } from "../../src/lib/calendar";
import { decide, type CommandContext } from "../../src/lib/commands";
import type { TagesDaten } from "../../src/lib/heute";
import type { ProjektKarte, ProjekteSnapshot } from "../../src/lib/projekte";
import type { Task, TasksSnapshot } from "../../src/lib/tasks";
import { commandOf, helpText, COMMANDS } from "../../src/lib/telegram";
import { naechsteWoche, wocheFaellig, wocheNachricht, wocheSatz, wochenbericht, wochenPlan, wochenTakt, WOCHE_VORSCHLAG } from "../../src/lib/woche";

// Freitag, 13. November 2026, 16 Uhr. Die Woche begann am Montag, dem 9.
const FREITAG = new Date(2026, 10, 13, 16, 0);
const um = (tag: number, stunde: number, minute = 0) => new Date(2026, 10, tag, stunde, minute).getTime();

const ereignis = (id: string, title: string, start: number, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({ id, title, start, end: start + 3_600_000, allDay: false, location: "", calendar: "Firma", ...extra });
const kalender = (events: CalendarEvent[], extra: Partial<CalendarSnapshot> = {}): CalendarSnapshot => ({ access: "ok", events, calendars: [], target: "Firma", from: "2026-11-13", to: "2026-12-14", ...extra });
const aufgabe = (text: string, due?: string): Task => ({ id: `Eingang.md:${text}`, file: "Eingang.md", line: 0, raw: `- [ ] ${text}`, text, due, important: false, recurring: false, tags: [] });
const erledigt = (am: string, text: string) => ({ am, text });
const aufgaben = (tasks: Task[], fertig: { am: string; text: string }[] = []): TasksSnapshot => ({ configured: true, tasks, doneToday: fertig.filter((e) => e.am === "2026-11-13").length, erledigt: fertig });
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

const FERTIG = [
  erledigt("2026-11-13", "Angebot Müller verschickt"),
  erledigt("2026-11-12", "Statik freigegeben"),
  erledigt("2026-11-09", "Wochenplan geschrieben"),
  // Vorwoche (2. bis 8. November)
  erledigt("2026-11-08", "Sonntags aufgeräumt"),
  erledigt("2026-11-02", "Rechnung Huber bezahlt"),
  // davor: zählt nirgends
  erledigt("2026-11-01", "Uralt"),
  // ein Datum in der Zukunft ist ein Tippfehler im Tresor und zählt nicht
  erledigt("2026-11-20", "Aus der Zukunft"),
];

describe("Rückblick: was diese Woche erledigt wurde und was liegt", () => {
  test("gezählt wird von Montag bis heute, die Vorwoche von Montag bis Sonntag davor", () => {
    const w = wochenbericht({ ...nichts, tasks: aufgaben([], FERTIG) }, FREITAG);
    assert.equal(w.montag, "2026-11-09");
    assert.equal(w.aufgaben?.erledigt, 3);
    assert.equal(w.aufgaben?.erledigtVorwoche, 2);
    assert.deepEqual(w.aufgaben?.erledigtTexte, ["Angebot Müller verschickt", "Statik freigegeben", "Wochenplan geschrieben"], "die neuesten zuerst");
    const text = wocheNachricht(w, { name: "Benedikt", namen: false });
    assert.match(text, /^Deine Woche, Benedikt \(9\. bis 13\. November\):/);
    assert.match(text, /Erledigt: 3 Aufgaben \(Vorwoche: 2\)\.\n• Angebot Müller verschickt\n• Statik freigegeben\n• Wochenplan geschrieben/);
    for (const fremd of ["Uralt", "Zukunft", "Sonntags", "Huber"]) assert.ok(!text.includes(fremd), fremd);
  });

  test("am Montagmorgen ist die Woche neu: nichts erledigt ist dann keine Nachricht wert, die Vorwoche schon", () => {
    const montag = new Date(2026, 10, 16, 8, 0);
    const w = wochenbericht({ ...nichts, tasks: aufgaben([], FERTIG) }, montag);
    assert.equal(w.montag, "2026-11-16");
    assert.equal(w.aufgaben?.erledigt, 0);
    assert.equal(w.aufgaben?.erledigtVorwoche, 3);
    assert.match(wocheNachricht(w, { name: "Benedikt", namen: false }), /Erledigt: diese Woche noch keine Aufgabe \(Vorwoche: 3\)\./);
    // Am Sonntag gehört der ganze Sonntag noch zur Woche, die am Montag davor begann.
    assert.equal(wochenbericht(nichts, new Date(2026, 10, 15, 20, 0)).montag, "2026-11-09");
  });

  test("mehr als fünf Erledigte: fünf beim Namen, der Rest gezählt", () => {
    const viele = Array.from({ length: 8 }, (_, i) => erledigt("2026-11-10", `Sache ${i + 1}`));
    const text = wocheNachricht(wochenbericht({ ...nichts, tasks: aufgaben([], viele) }, FREITAG), { name: "Benedikt", namen: false });
    assert.match(text, /Erledigt: 8 Aufgaben \(Vorwoche: 0\)\./);
    assert.match(text, /• Sache 5\n• und 3 weitere/);
    assert.ok(!text.includes("Sache 6"));
  });

  test("Überfälliges steht mit Zahl und den ältesten zuerst da", () => {
    const offen = [aufgabe("Vertrag prüfen", "2026-11-12"), aufgabe("Steuer", "2026-11-03"), aufgabe("Heute fällig", "2026-11-13"), aufgabe("Ohne Datum")];
    const w = wochenbericht({ ...nichts, tasks: aufgaben(offen) }, FREITAG);
    assert.deepEqual(w.aufgaben?.ueberfaellig.map((t) => t.text), ["Steuer", "Vertrag prüfen"]);
    const text = wocheNachricht(w, { name: "Benedikt", namen: false });
    assert.match(text, /Liegt noch: 2 Aufgaben sind überfällig\.\n• Steuer \(seit 10 Tagen überfällig\)\n• Vertrag prüfen \(seit gestern überfällig\)/);
  });

  test("ein Tresor, der sich nicht lesen lässt, heißt nicht „nichts erledigt“; ohne Tresor steht zu Aufgaben nichts da", () => {
    const kaputt: TasksSnapshot = { configured: true, tasks: [], doneToday: 0, error: "Zugriff verweigert" };
    const w = wochenbericht({ ...nichts, tasks: kaputt }, FREITAG);
    assert.equal(w.aufgaben, null, "unbekannt, nicht null Aufgaben");
    const text = wocheNachricht(w, { name: "Benedikt", namen: false });
    assert.match(text, /Aufgaben: Der Obsidian-Tresor lässt sich gerade nicht lesen\./);
    assert.ok(!/Erledigt|Liegt noch|keine Aufgabe/.test(text), text);
    assert.ok(!text.includes("Zugriff verweigert"), "der genaue Grund bleibt am Mac");
    assert.match(wocheSatz(w, "Benedikt"), /Der Obsidian-Tresor lässt sich gerade nicht lesen\./);

    const ohne = wocheNachricht(wochenbericht({ ...nichts, tasks: { configured: false, tasks: [], doneToday: 0 } }, FREITAG), { name: "Benedikt", namen: false });
    assert.ok(!/Erledigt|Liegt noch|keine Aufgabe/.test(ohne), ohne);
    // Noch nicht geladen (null) ist ebenfalls kein „nichts erledigt“.
    assert.ok(!/Erledigt|Liegt noch|keine Aufgabe/.test(wocheNachricht(wochenbericht(nichts, FREITAG), { name: "Benedikt", namen: false })));
  });
});

describe("Ausblick: die nächsten sieben Tage", () => {
  const TERMINE = [
    ereignis("heute", "Heute Abend", um(13, 19)),
    ereignis("a", "Jour fixe", um(16, 9)),
    ereignis("b", "Bank", um(16, 14), { location: "Deggendorf" }),
    ereignis("c", "Messe", new Date(2026, 10, 18).getTime(), { allDay: true, end: new Date(2026, 10, 19).getTime() }),
    ereignis("d", "Letzter Tag", um(20, 11)),
    ereignis("e", "Zu spät", um(21, 9)),
  ];

  test("Termine von morgen bis in sieben Tagen, je Tag eine Zeile; heute und der achte Tag gehören nicht dazu", () => {
    const w = wochenbericht({ ...nichts, calendar: kalender(TERMINE) }, FREITAG);
    assert.equal(w.bis, "2026-11-20");
    assert.deepEqual(w.tage?.map((t) => [t.tag, t.termine.map((e) => e.title)]), [
      ["2026-11-16", ["Jour fixe", "Bank"]],
      ["2026-11-18", ["Messe"]],
      ["2026-11-20", ["Letzter Tag"]],
    ]);
    const text = wocheNachricht(w, { name: "Benedikt", namen: false });
    assert.match(text, /Die nächsten sieben Tage im Kalender: 4 Termine\.\n• Mo\., 16\.11\.: 2 Termine, ab 09:00 Jour fixe\n• Mi\., 18\.11\.: ganztägig Messe\n• Fr\., 20\.11\.: 11:00 Letzter Tag/);
    for (const fremd of ["Heute Abend", "Zu spät"]) assert.ok(!text.includes(fremd), fremd);
  });

  test("ein Termin über mehrere Tage zählt einmal und steht an seinem ersten Tag, mit seinem Ende", () => {
    const tag = (n: number) => new Date(2026, 10, n).getTime();
    const cal = kalender([
      ereignis("u", "Urlaub", tag(16), { allDay: true, end: tag(21) }),
      ereignis("n", "Nachtschicht", um(17, 22), { end: um(18, 2) }),
      ereignis("m", "Morgens", um(18, 9)),
      // läuft schon seit gestern und endet übermorgen
      ereignis("l", "Lehrgang", tag(12), { allDay: true, end: tag(16) }),
    ]);
    const w = wochenbericht({ ...nichts, calendar: cal }, FREITAG);
    assert.deepEqual(w.tage?.map((t) => [t.tag, t.termine.map((e) => e.title)]), [
      ["2026-11-14", ["Lehrgang"]],
      ["2026-11-16", ["Urlaub"]],
      ["2026-11-17", ["Nachtschicht"]],
      ["2026-11-18", ["Morgens"]],
    ]);
    const text = wocheNachricht(w, { name: "B", namen: false });
    assert.match(text, /im Kalender: 4 Termine\./);
    assert.match(text, /• morgen: ganztägig Lehrgang \(bis So\., 15\.11\.\)/);
    assert.match(text, /• Mo\., 16\.11\.: ganztägig Urlaub \(bis Fr\., 20\.11\.\)/);
    assert.match(text, /• Di\., 17\.11\.: 22:00 Nachtschicht \(bis Mi\., 18\.11\.\)/);
    assert.match(text, /• Mi\., 18\.11\.: 09:00 Morgens\n|• Mi\., 18\.11\.: 09:00 Morgens$/);
    assert.match(wocheSatz(w, "B"), /hast du 4 Termine\./);
    // Läuft ein Termin mit Uhrzeit schon seit einem früheren Tag, steht nie dessen Anfangszeit da (22:00 wäre die
    // von heute), sondern wann er endet.
    const nacht = kalender([ereignis("s", "Spätschicht", um(13, 22), { end: um(14, 2) }), ereignis("t", "Tagung", um(12, 9), { end: um(17, 17) })]);
    const laeuft = wocheNachricht(wochenbericht({ ...nichts, calendar: nacht }, FREITAG), { name: "B", namen: false });
    assert.match(laeuft, /im Kalender: 2 Termine\.\n• morgen: 2 Termine, läuft weiter: Tagung \(bis Di\., 17\.11\.\)$/m);
    assert.ok(!laeuft.includes("22:00") && !laeuft.includes("09:00"), laeuft);
    const allein = wocheNachricht(wochenbericht({ ...nichts, calendar: kalender([ereignis("s", "Spätschicht", um(13, 22), { end: um(14, 2) })]) }, FREITAG), { name: "B", namen: false });
    assert.match(allein, /• morgen: bis 02:00 Spätschicht$/m);
    // Dasselbe für verdeckte Outlook-Termine: einer über drei Tage ist einer.
    const verdeckt = [{ start: tag(16), end: tag(19), allDay: true }];
    const nur = wochenbericht({ ...nichts, calendar: kalender([], { outlook: { konto: "b@firma.de", extern: false, verdeckt } }) }, FREITAG);
    assert.deepEqual(nur.tage?.map((t) => [t.tag, t.outlook]), [["2026-11-16", 1]]);
    assert.match(wocheNachricht(nur, { name: "B", namen: false }), /im Kalender: ein Termin\./);
  });

  test("ein freier Kalender wird gesagt; einer, den JARVIS nicht lesen darf, mit seinem Grund; ein nie verbundener gar nicht", () => {
    assert.match(wocheNachricht(wochenbericht({ ...nichts, calendar: kalender([]) }, FREITAG), { name: "B", namen: false }), /In den nächsten sieben Tagen ist dein Kalender frei\./);
    const verweigert = wochenbericht({ ...nichts, calendar: kalender([], { access: "verweigert" }) }, FREITAG);
    assert.equal(verweigert.tage, null);
    const text = wocheNachricht(verweigert, { name: "B", namen: false });
    assert.match(text, /Kalender: /);
    assert.ok(!text.includes("frei"), text);
    for (const access of ["offen", "kein-mac"] as const) {
      const stumm = wocheNachricht(wochenbericht({ ...nichts, calendar: kalender([], { access }) }, FREITAG), { name: "B", namen: false });
      assert.ok(!/Kalender:|im Kalender|frei/.test(stumm), stumm);
    }
    assert.ok(!/Kalender:|im Kalender|frei/.test(wocheNachricht(wochenbericht(nichts, FREITAG), { name: "B", namen: false })));
  });

  test("Outlook-Termine ohne Freigabe werden nur gezählt, und ein Tag nur mit Outlook heißt nicht frei", () => {
    const verdeckt = [
      { start: um(16, 10), end: um(16, 11), allDay: false },
      { start: um(17, 10), end: um(17, 11), allDay: false },
      { start: um(17, 15), end: um(17, 16), allDay: false },
      { start: um(25, 10), end: um(25, 11), allDay: false },
    ];
    const cal = kalender([ereignis("a", "Jour fixe", um(16, 9))], { outlook: { konto: "b@firma.de", extern: false, verdeckt } });
    const w = wochenbericht({ ...nichts, calendar: cal }, FREITAG);
    assert.deepEqual(w.tage?.map((t) => [t.tag, t.termine.length, t.outlook]), [["2026-11-16", 1, 1], ["2026-11-17", 0, 2]]);
    const text = wocheNachricht(w, { name: "B", namen: false });
    assert.match(text, /im Kalender: 4 Termine\./);
    assert.match(text, /• Mo\., 16\.11\.: 09:00 Jour fixe, dazu ein Termin aus Outlook, den ich hier nicht nenne/);
    assert.match(text, /• Di\., 17\.11\.: 2 Termine aus Outlook, die ich hier nicht nenne/);
    const nur = wocheNachricht(wochenbericht({ ...nichts, calendar: kalender([], { outlook: { konto: "b@firma.de", extern: false, verdeckt } }) }, FREITAG), { name: "B", namen: false });
    assert.ok(!nur.includes("frei"), nur);
    // Fehlen Termine aus Outlook, steht das dabei, auch wenn sonst nichts im Kalender ist.
    const luecke = wocheNachricht(wochenbericht({ ...nichts, calendar: kalender([], { outlook: { konto: "b@firma.de", extern: false, verdeckt: [], fehler: "x" } }) }, FREITAG), { name: "B", namen: false });
    assert.match(luecke, /Die Termine aus Outlook fehlen gerade\./);
    assert.ok(!luecke.includes("ist dein Kalender frei"), luecke);
  });

  test("Aufgaben, die in den nächsten sieben Tagen fällig werden, mit ihrem Tag; heute und später nicht", () => {
    const offen = [aufgabe("Spät", "2026-11-21"), aufgabe("Angebot nachfassen", "2026-11-17"), aufgabe("Morgen dran", "2026-11-14"), aufgabe("Heute", "2026-11-13"), aufgabe("Letzter Tag", "2026-11-20")];
    const w = wochenbericht({ ...nichts, tasks: aufgaben(offen) }, FREITAG);
    assert.deepEqual(w.aufgaben?.kommend.map((t) => t.text), ["Morgen dran", "Angebot nachfassen", "Letzter Tag"]);
    assert.match(wocheNachricht(w, { name: "B", namen: false }), /Fällig in den nächsten sieben Tagen:\n• morgen: Morgen dran\n• Di\., 17\.11\.: Angebot nachfassen\n• Fr\., 20\.11\.: Letzter Tag/);
  });
});

describe("Projekte im Wochenbericht", () => {
  const HALLE = projekt("Hallenneubau", { ueberfaellig: 1, naechsteFrist: { text: "Statik prüfen", faellig: "2026-11-10" } });
  const ADLER = projekt("Adler", { vertraulich: true, naechsteFrist: { text: "Kaufpreis nachverhandeln", faellig: "2026-11-18" } });
  const MESSE = projekt("Messe", { naechsteFrist: { text: "Stand buchen", faellig: "2026-11-19" } });
  const RISIKO = projekt("Umzug", { risikoFrist: { text: "Mietvertrag läuft aus", faellig: "2026-11-20" } });
  const SPAET = projekt("Website", { naechsteFrist: { text: "Texte liefern", faellig: "2026-11-21" } });
  const RUHT = projekt("Archiv", { status: "pausiert", naechsteFrist: { text: "Kartons", faellig: "2026-11-16" } } as Partial<ProjektKarte>);
  const ALLE = projekte([HALLE, ADLER, MESSE, RISIKO, SPAET, RUHT], 2);
  const w = wochenbericht({ ...nichts, projekte: ALLE }, FREITAG);

  test("Fristen der nächsten sieben Tage, auch die eines Risikos; Überfälliges steht für sich und nicht doppelt", () => {
    assert.deepEqual(w.projekteOffen.map((h) => h.name), ["Hallenneubau"]);
    assert.deepEqual(w.fristen.map((h) => h.name), ["Adler", "Messe", "Umzug"]);
    assert.equal(w.vorschlaege, 2);
    // Ein Projekt mit Überfälligem und dazu einer Frist im Ausblick steht einmal da, bei den dringenden.
    const doppelt = wochenbericht({ ...nichts, projekte: projekte([projekt("Halle", { ueberfaellig: 1, naechsteFrist: { text: "Statik prüfen", faellig: "2026-11-10" }, risikoFrist: { text: "Kran fehlt", faellig: "2026-11-18" } })]) }, FREITAG);
    assert.deepEqual([doppelt.projekteOffen.map((h) => h.name), doppelt.fristen.map((h) => h.name)], [["Halle"], []]);
    // Hat ein Projekt beides, zählt die frühere Frist; bei Gleichstand die Aufgabe. Je Projekt eine Zeile.
    const beides = (aufgabeAm: string, risikoAm: string) =>
      wochenbericht({ ...nichts, projekte: projekte([projekt("Umbau", { naechsteFrist: { text: "Plan abgeben", faellig: aufgabeAm }, risikoFrist: { text: "Genehmigung fehlt", faellig: risikoAm } })]) }, FREITAG).fristen.map((h) => h.grund);
    assert.match(beides("2026-11-19", "2026-11-17")[0], /^Risiko: Genehmigung fehlt, /);
    assert.match(beides("2026-11-17", "2026-11-19")[0], /^Plan abgeben, /);
    assert.match(beides("2026-11-17", "2026-11-17")[0], /^Plan abgeben, /);
    assert.equal(beides("2026-11-17", "2026-11-19").length, 1);
    assert.match(beides("2026-11-25", "2026-11-19")[0], /^Risiko: /, "die Aufgabe liegt nach dem Ausblick");
  });

  test("über Telegram ohne den Schalter nur Zahlen", () => {
    const text = wocheNachricht(w, { name: "B", namen: false });
    assert.match(text, /Projekte: Eines hat Überfälliges oder eine Frist von heute, bei 3 ist in den nächsten sieben Tagen etwas fällig\. Einzelheiten am Mac unter „Heute“\./);
    assert.match(text, /2 Vorschläge fürs Projektgedächtnis warten am Mac auf deine Bestätigung\./);
    for (const wort of ["Hallenneubau", "Statik", "Messe", "Stand", "Umzug", "Mietvertrag", "Adler", "Kaufpreis"]) assert.ok(!text.includes(wort), wort);
  });

  test("mit dem Schalter stehen offene Projekte beim Namen, ein vertrauliches wird nur gezählt", () => {
    const text = wocheNachricht(w, { name: "B", namen: true });
    assert.match(text, /• Hallenneubau: /);
    assert.match(text, /• Messe: Stand buchen, fällig am /);
    assert.match(text, /• Umzug: Risiko: Mietvertrag läuft aus, fällig am /);
    assert.match(text, /• ein vertrauliches Projekt: Einzelheiten nur am Mac/);
    for (const wort of ["Adler", "Kaufpreis", "Website", "Archiv"]) assert.ok(!text.includes(wort), wort);
  });

  test("gesprochen am Mac: kurz, ohne Listen, und nie ein vertrauliches Projekt beim Namen", () => {
    const voll = wochenbericht(
      { ...nichts, projekte: ALLE, tasks: aufgaben([aufgabe("Steuer", "2026-11-03"), aufgabe("Angebot nachfassen", "2026-11-17")], FERTIG), calendar: kalender([ereignis("a", "Jour fixe", um(16, 9)), ereignis("b", "Bank", um(16, 14)), ereignis("c", "Friseur", um(18, 8))]) },
      FREITAG,
    );
    const satz = wocheSatz(voll, "Benedikt");
    assert.match(satz, /^Deine Woche, Benedikt\. Du hast 3 Aufgaben erledigt, in der Vorwoche waren es 2\. Eine ist überfällig\./);
    assert.match(satz, /In den nächsten sieben Tagen hast du 3 Termine, die meisten am Montag\./);
    // „Die meisten am …“ nur, wenn ein Tag wirklich heraussticht: nicht bei einem einzigen Tag, nicht bei Gleichstand.
    const termine = (...wann: number[]) => wocheSatz(wochenbericht({ ...nichts, calendar: kalender(wann.map((t, i) => ereignis(`t${i}`, `Termin ${i}`, t))) }, FREITAG), "B");
    assert.match(termine(um(16, 9), um(16, 14)), /hast du 2 Termine\./);
    assert.match(termine(um(16, 9), um(16, 14), um(17, 9), um(17, 14)), /hast du 4 Termine\./);
    assert.match(termine(um(16, 9), um(17, 9)), /hast du 2 Termine\./);
    assert.match(termine(um(16, 9)), /hast du einen Termin\./);
    assert.match(satz, /Eine Aufgabe wird fällig\./);
    assert.match(satz, /Im Projekt Hallenneubau: /);
    assert.ok(!satz.includes("•") && !satz.includes("\n"), satz);
    for (const wort of ["Adler", "Kaufpreis"]) assert.ok(!satz.includes(wort), wort);
    // Die Vorwoche steht als Zahl daneben, ohne „mehr“ oder „weniger“: Mitten in der Woche stünden sonst zwei
    // Tage gegen sieben.
    const s = (jetzt: number, davor: number) => wocheSatz({ ...voll, aufgaben: { ...voll.aufgaben!, erledigt: jetzt, erledigtVorwoche: davor } }, "B");
    assert.match(s(2, 5), /Du hast 2 Aufgaben erledigt, in der Vorwoche waren es 5\./);
    assert.match(s(4, 1), /Du hast 4 Aufgaben erledigt, in der Vorwoche war es eine\./);
    assert.match(s(1, 0), /Du hast eine Aufgabe erledigt, in der Vorwoche keine\./);
    assert.match(s(0, 3), /Erledigt ist diese Woche noch keine Aufgabe, in der Vorwoche waren es 3\./);
    assert.match(s(0, 0), /Erledigt ist diese Woche noch keine Aufgabe\. /);
    assert.ok(!/mehr als|weniger als/.test(s(2, 5) + s(4, 1)));
  });

  test("eine ganz leere Woche ist ein kurzer, ehrlicher Satz", () => {
    assert.equal(wocheSatz(wochenbericht(nichts, FREITAG), "Benedikt"), "Deine Woche, Benedikt. Dazu habe ich gerade nichts: Aufgaben, Kalender und Projekte sind nicht eingerichtet oder noch nicht geladen.");
    assert.match(wocheNachricht(wochenbericht(nichts, FREITAG), { name: "Benedikt", namen: false }), /Dazu habe ich gerade nichts/);
  });
});

describe("Wochenbericht auf Zuruf", () => {
  const ctx = { now: FREITAG, name: "Benedikt", tasks: aufgaben([], FERTIG), calendar: kalender([]), projekte: null } as unknown as CommandContext;

  test("am Mac: „Wochenbericht“, „Wochenrückblick“, „Wie war meine Woche?“", () => {
    for (const satz of ["Wochenbericht", "Gib mir den Wochenrückblick", "Wie war meine Woche?", "Wochenabschluss bitte"]) {
      const r = decide(satz, ctx);
      assert.match(r?.reply ?? "", /^Deine Woche, Benedikt\. Du hast 3 Aufgaben erledigt/, satz);
      assert.equal(r?.navigate, "/heute");
    }
    // Was es schon gab, bleibt, was es war.
    assert.ok(!decide("Was steht diese Woche an?", ctx)?.reply.startsWith("Deine Woche"));
    assert.ok(!decide("Tagesabschluss", ctx)?.reply.startsWith("Deine Woche"));
    // Nur die Bitte um den Bericht selbst; kommt das Wort in einem anderen Auftrag vor, ist es keiner.
    for (const anderes of ["Schreib einen Wochenbericht für Projekt Alpha", "Wochenbericht Projekt Alpha", "Stell den Wochenbericht auf Montag", "Notiere Wochenbericht abgeben bis Freitag"]) assert.ok(!decide(anderes, ctx)?.reply.startsWith("Deine Woche"), anderes);
    assert.equal(decide("Wochenbericht Projekt Alpha", ctx, true), null, "mit KI-Gehirn geht das an Claude");
    for (const bitte of ["Den Wochenbericht bitte", "Zeig mir meinen Wochenbericht", "Lies mir den Wochenbericht vor", "wochenrückblick"]) assert.match(decide(bitte, ctx)?.reply ?? "", /^Deine Woche/, bitte);
    // Mit KI-Gehirn bleibt nur der kurze Befehl ein fester; ein längerer Auftrag geht an Claude.
    assert.match(decide("Wochenbericht", ctx, true)?.reply ?? "", /^Deine Woche/);
    assert.equal(decide("Schreib einen Wochenbericht für den Kunden Müller", ctx, true), null);
  });

  test("am Handy: /woche und „Wochenbericht“; die Hilfe nennt es", () => {
    assert.equal(commandOf("/woche"), "woche");
    assert.equal(commandOf("Wochenbericht"), "woche");
    assert.equal(commandOf("wochenrückblick!"), "woche");
    assert.equal(commandOf("Wie war die Woche bei Müller?"), null, "eine freie Frage geht ans KI-Gehirn");
    assert.ok(COMMANDS.some((c) => c.command === "woche"));
    assert.match(helpText("Benedikt", true), /\/woche – /);
  });
});

describe("Wann der Wochenbericht von selbst kommt", () => {
  const PLAN = { tag: 5, zeit: "16:00" };
  const FENSTER = 3 * 60 * 60_000;

  test("nur gültige Pläne: Wochentag 1 (Montag) bis 7 (Sonntag) und eine Uhrzeit", () => {
    assert.deepEqual(wochenPlan({ tag: 5, zeit: "16:00" }), PLAN);
    assert.deepEqual(wochenPlan({ tag: 7, zeit: "09:05", mehr: "x" }), { tag: 7, zeit: "09:05" });
    for (const falsch of [null, undefined, "freitag", 5, {}, { tag: 0, zeit: "16:00" }, { tag: 8, zeit: "16:00" }, { tag: 5.5, zeit: "16:00" }, { tag: "5", zeit: "16:00" }, { tag: 5, zeit: "25:00" }, { tag: 5, zeit: "16 Uhr" }, { tag: 5 }]) assert.equal(wochenPlan(falsch), null, JSON.stringify(falsch));
    assert.deepEqual(wochenPlan(WOCHE_VORSCHLAG), WOCHE_VORSCHLAG);
  });

  test("fällig nur am eingestellten Wochentag, ab der Uhrzeit, einmal, und höchstens das Fenster lang", () => {
    assert.equal(wocheFaellig(PLAN, new Date(2026, 10, 13, 15, 59), null, FENSTER), false, "zu früh");
    assert.equal(wocheFaellig(PLAN, new Date(2026, 10, 13, 16, 0), null, FENSTER), true);
    assert.equal(wocheFaellig(PLAN, new Date(2026, 10, 13, 18, 59), null, FENSTER), true, "der Mac hat geschlafen");
    assert.equal(wocheFaellig(PLAN, new Date(2026, 10, 13, 19, 0), null, FENSTER), false, "zu spät, wird nicht nachgeholt");
    assert.equal(wocheFaellig(PLAN, new Date(2026, 10, 13, 16, 30), "2026-11-13", FENSTER), false, "heute schon geschickt");
    assert.equal(wocheFaellig(PLAN, new Date(2026, 10, 13, 16, 30), "2026-11-06", FENSTER), true, "letzte Woche zählt nicht");
    assert.equal(wocheFaellig(PLAN, new Date(2026, 10, 12, 16, 30), null, FENSTER), false, "Donnerstag");
    assert.equal(wocheFaellig(PLAN, new Date(2026, 10, 14, 16, 30), null, FENSTER), false, "Samstag");
    assert.equal(wocheFaellig({ tag: 7, zeit: "20:00" }, new Date(2026, 10, 15, 20, 5), null, FENSTER), true, "Sonntag ist Tag 7");
    assert.equal(wocheFaellig(null, FREITAG, null, FENSTER), false, "ausgeschaltet");
    // Spät am Abend reicht das Fenster über Mitternacht: Sonst fiele der Bericht eine ganze Woche aus.
    const SPAET = { tag: 5, zeit: "22:30" };
    assert.equal(wocheFaellig(SPAET, new Date(2026, 10, 14, 0, 10), null, FENSTER), true, "Samstag 00:10 gehört noch zu Freitag 22:30");
    assert.equal(wocheFaellig(SPAET, new Date(2026, 10, 14, 0, 10), "2026-11-13", FENSTER), false, "am Freitag schon geschickt");
    assert.equal(wocheFaellig(SPAET, new Date(2026, 10, 14, 0, 11), "2026-11-14", FENSTER), false, "nach Mitternacht geschickt: kein zweiter eine Minute später");
    assert.equal(wocheFaellig(SPAET, new Date(2026, 10, 14, 1, 30), null, FENSTER), false, "drei Stunden sind um");
    assert.equal(wocheFaellig(SPAET, new Date(2026, 10, 20, 22, 30), "2026-11-14", FENSTER), true, "eine Woche später wieder");
    assert.equal(wocheFaellig({ tag: 7, zeit: "23:00" }, new Date(2026, 10, 16, 0, 30), null, FENSTER), true, "Sonntagabend reicht in den Montag");
  });

  test("der nächste Termin und der Takt in Worten", () => {
    assert.deepEqual(naechsteWoche(PLAN, new Date(2026, 10, 13, 15, 0)), new Date(2026, 10, 13, 16, 0));
    assert.deepEqual(naechsteWoche(PLAN, new Date(2026, 10, 13, 16, 0)), new Date(2026, 10, 20, 16, 0), "genau zur Uhrzeit ist der nächste in einer Woche");
    assert.deepEqual(naechsteWoche(PLAN, new Date(2026, 10, 14, 9, 0)), new Date(2026, 10, 20, 16, 0));
    assert.deepEqual(naechsteWoche({ tag: 1, zeit: "07:00" }, new Date(2026, 10, 13, 9, 0)), new Date(2026, 10, 16, 7, 0));
    assert.equal(naechsteWoche(null, FREITAG), null);
    assert.equal(wochenTakt(PLAN), "freitags um 16:00 Uhr");
    assert.equal(wochenTakt({ tag: 7, zeit: "20:00" }), "sonntags um 20:00 Uhr");
    assert.equal(wochenTakt({ tag: 1, zeit: "07:00" }), "montags um 07:00 Uhr");
  });
});
