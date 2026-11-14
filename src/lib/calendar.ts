import { addDays, daysBetween, findDate, fromIso, isoDate, spokenDay } from "./dates";

// Der Apple-Kalender auf dem Mac. JARVIS liest alle Kalender, die dort eingerichtet sind (iCloud,
// Google, Exchange), und trägt neue Termine auf Zuruf ein. Ändern oder löschen kann er nichts.
// Hier stehen die Typen und Sätze ohne Mac-Zugriff, damit sie testbar sind; den Zugriff macht
// src/lib/server/calendar.ts.

export type CalendarEvent = {
  id: string;
  title: string;
  // Millisekunden seit 1970, wie Date.now().
  start: number;
  end: number;
  allDay: boolean;
  location: string;
  calendar: string;
  // Fehlt: aus der Kalender-App des Macs. outlook: aus Microsoft 365 gelesen (src/lib/microsoft.ts).
  quelle?: "outlook";
};

// ok: lesen und eintragen. offen: noch nie gefragt. nur-schreiben: macOS erlaubt nur das Eintragen.
export type CalendarAccess = "ok" | "offen" | "verweigert" | "nur-schreiben" | "fehler" | "kein-mac";

export type CalendarSnapshot = {
  access: CalendarAccess;
  events: CalendarEvent[];
  calendars: { name: string; writable: boolean }[];
  // In diesen Kalender trägt JARVIS neue Termine ein.
  target: string | null;
  // Gelesener Zeitraum, JJJJ-MM-TT.
  from: string;
  to: string;
  error?: string;
  // Gesetzt, wenn Microsoft 365 verbunden ist. extern: Outlook-Termine dürfen ins Gespräch mit dem KI-Modell
  // und über Telegram. fehler: warum die Outlook-Termine gerade fehlen. verdeckt: nur Zeiten der Outlook-Termine,
  // die fuerGespraech herausgenommen hat, damit JARVIS sagen kann, dass es sie gibt, ohne sie zu nennen.
  // unvollstaendig: Outlook hat mehr geliefert, als JARVIS auf einmal liest; es fehlen Termine.
  outlook?: { konto: string; extern: boolean; fehler?: string; unvollstaendig?: true; verdeckt?: Verdeckt[] };
  // Gesetzt, wenn es keinen Mac-Kalender gibt und nur Outlook liefert: lesen ja, eintragen nein.
  nurLesen?: true;
};

export type Verdeckt = { start: number; end: number; allDay: boolean };

// Was vom Kalender den Mac verlassen darf (Gespräch mit dem KI-Modell, Telegram): Outlook-Termine nur, wenn du
// es eingeschaltet hast. Der Bildschirm am Mac zeigt immer alles.
export function fuerGespraech<T extends CalendarSnapshot | null>(snap: T): T {
  if (!snap || snap.outlook?.extern) return snap;
  const outlook = snap.events.filter((e) => e.quelle === "outlook");
  if (outlook.length === 0) return snap;
  const verdeckt = outlook.map((e) => ({ start: e.start, end: e.end, allDay: e.allDay }));
  return { ...snap, events: snap.events.filter((e) => e.quelle !== "outlook"), ...(snap.outlook ? { outlook: { ...snap.outlook, verdeckt } } : {}) };
}

// Findet der Termin an diesem Tag statt? Ein Termin ohne Dauer zählt an seinem Starttag.
function amTag(e: { start: number; end: number }, iso: string): boolean {
  return e.start < fromIso(addDays(iso, 1)).getTime() && Math.max(e.end, e.start + 1) > fromIso(iso).getTime();
}

// Wie viele Outlook-Termine an diesem Tag verdeckt sind. ab: Nur was dann noch nicht vorbei ist.
export function verdecktAm(cal: CalendarSnapshot | null, iso: string, ab = 0): number {
  return (cal?.outlook?.verdeckt ?? []).filter((v) => amTag(v, iso) && (v.allDay || v.end > ab)).length;
}

// Fehlen gerade Termine aus Outlook (Microsoft nicht erreichbar, Anmeldung abgelaufen, zu viele Termine)?
// Dann sagt JARVIS das dazu, statt einen Tag „frei“ zu nennen, den er nur halb kennt. Leer, wenn nichts fehlt.
export function outlookLuecke(cal: CalendarSnapshot | null): string {
  if (cal?.outlook?.fehler) return "Die Termine aus Outlook fehlen gerade.";
  if (cal?.outlook?.unvollstaendig) return "Aus Outlook fehlen gerade Termine: Es sind mehr, als ich auf einmal lese.";
  return "";
}
const mitLuecke = (satz: string, cal: CalendarSnapshot | null) => [satz, outlookLuecke(cal)].filter(Boolean).join(" ");

// Der Satz zu Outlook-Terminen, die JARVIS im Gespräch und über Telegram nicht nennt. allein: Sonst steht
// an dem Tag nichts im Kalender.
export function outlookSatz(n: number, allein = false): string {
  if (n <= 0) return "";
  if (allein) return n === 1 ? "ein Termin aus Outlook, den ich hier nicht nenne" : `${n} Termine aus Outlook, die ich hier nicht nenne`;
  return n === 1 ? "Dazu kommt ein Termin aus Outlook, den ich hier nicht nenne." : `Dazu kommen ${n} Termine aus Outlook, die ich hier nicht nenne.`;
}

// Die Erinnerung kurz vor einem Termin, am Mac gesprochen und im Gespräch gezeigt. Ein Outlook-Termin kommt
// ohne Titel, solange Outlook nicht fürs Gespräch freigegeben ist: Was im Gespräch steht, liest das KI-Modell
// beim nächsten Satz mit, und eine Stimme aus dem Netz bekäme den Text auch.
export function erinnerungsSatz(e: CalendarEvent, minuten: number, outlookExtern: boolean): { text: string; mitTitel: boolean } {
  const mitTitel = e.quelle !== "outlook" || outlookExtern;
  const was = mitTitel ? e.title : "ein Termin aus Outlook";
  return { text: minuten <= 1 ? `Jetzt beginnt ${was}.` : `In ${minuten} Minuten: ${was}.`, mitTitel };
}

// Was JARVIS eintragen soll. Uhrzeit als HH:MM, ohne Uhrzeit ist der Termin ganztägig.
export type NewEvent = { title: string; date: string; time?: string; minutes?: number; location?: string; calendar?: string };

export const DEFAULT_MINUTES = 60;
export const READ_DAYS = 31;

const pad = (n: number) => String(n).padStart(2, "0");

export const clock = (ms: number) => {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// „um 9 Uhr“, „um 9 Uhr 30“, so wie man es sagt.
export function spokenTime(ms: number): string {
  const d = new Date(ms);
  return d.getMinutes() === 0 ? `um ${d.getHours()} Uhr` : `um ${d.getHours()} Uhr ${d.getMinutes()}`;
}

const spokenClock = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return m === 0 ? `um ${h} Uhr` : `um ${h} Uhr ${m}`;
};

const list = (parts: string[]) => (parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} und ${parts.at(-1)}`);


// Alle Termine, die an diesem Tag stattfinden, ganztägige zuerst.
export function eventsOn(events: CalendarEvent[], iso: string): CalendarEvent[] {
  return events
    .filter((e) => amTag(e, iso))
    .sort((a, b) => (a.allDay !== b.allDay ? (a.allDay ? -1 : 1) : a.start - b.start));
}

// Der nächste Termin mit Uhrzeit, der noch nicht vorbei ist.
export function nextEvent(events: CalendarEvent[], now: number): CalendarEvent | null {
  return events.filter((e) => !e.allDay && e.end > now).sort((a, b) => a.start - b.start)[0] ?? null;
}

export function eventPhrase(e: CalendarEvent): string {
  return e.allDay ? `ganztägig ${e.title}` : `${spokenTime(e.start)} ${e.title}`;
}

// Warum JARVIS den Kalender nicht lesen kann, oder null, wenn alles passt.
export function accessProblem(cal: CalendarSnapshot | null): string | null {
  if (!cal) return "Dein Kalender lädt noch.";
  if (cal.access === "ok") return null;
  if (cal.access === "offen") return "Dein Kalender ist noch nicht verbunden. In der Kalender-Ansicht geht das mit einem Klick.";
  if (cal.access === "nur-schreiben") return "Ich darf in deinen Kalender nur eintragen, aber nicht hineinsehen. Gib mir in den Systemeinstellungen Vollzugriff.";
  return cal.error ?? "Ich komme gerade nicht an deinen Kalender.";
}

// „Morgen“, aber „Am Freitag, 30. Oktober,“, damit der Satz danach weitergeht.
function dayWord(iso: string, today: string): string {
  return daysBetween(today, iso) <= 2 ? capitalize(spokenDay(iso, today)) : `Am ${spokenDay(iso, today)},`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// „Morgen hast du zwei Termine: um 9 Uhr Zahnarzt und um 14 Uhr Meeting.“
export function daySentence(cal: CalendarSnapshot | null, iso: string, today: string): string {
  const problem = accessProblem(cal);
  if (problem) return problem;
  return mitLuecke(tagesSatz(cal!, iso, today), cal);
}

function tagesSatz(cal: CalendarSnapshot, iso: string, today: string): string {
  if (iso > cal.to) return `So weit voraus lese ich deinen Kalender nicht, nur bis ${spokenDay(cal.to, today)}. Im Kalender auf dem Mac siehst du alles.`;
  const day = dayWord(iso, today);
  const now = Date.now();
  const all = eventsOn(cal.events, iso);
  // Für heute zählt nur, was noch kommt.
  const events = iso === today ? all.filter((e) => e.allDay || e.end > now) : all;
  const verdeckt = verdecktAm(cal, iso, iso === today ? now : 0);
  if (events.length === 0) {
    if (verdeckt > 0) return `${day} steht nur Outlook im Kalender: ${outlookSatz(verdeckt, true)}.`;
    if (iso === today && all.length > 0) return "Für heute steht nichts mehr im Kalender.";
    return `${day} steht nichts im Kalender.`;
  }
  const what = list(events.slice(0, 6).map(eventPhrase));
  const more = events.length > 6 ? `, und noch ${events.length - 6} weitere` : "";
  const dazu = verdeckt > 0 ? ` ${outlookSatz(verdeckt)}` : "";
  // Ist heute schon etwas vorbei, zählt JARVIS nur, was noch kommt.
  if (iso === today && events.length < all.length) {
    return (events.length === 1 ? `Heute kommt noch ein Termin: ${what}.` : `Heute kommen noch ${events.length} Termine: ${what}${more}.`) + dazu;
  }
  return (events.length === 1 ? `${day} hast du einen Termin: ${what}.` : `${day} hast du ${events.length} Termine: ${what}${more}.`) + dazu;
}

// Der nächste Termin, für „wann ist mein nächster Termin“.
export function nextSentence(cal: CalendarSnapshot | null, today: string): string {
  const problem = accessProblem(cal);
  if (problem) return problem;
  return mitLuecke(naechsterSatz(cal!, today), cal);
}

function naechsterSatz(cal: CalendarSnapshot, today: string): string {
  const now = Date.now();
  const next = nextEvent(cal.events, now);
  // Liegt ein verdeckter Outlook-Termin davor, wäre „dein nächster Termin ist …“ falsch.
  const davor = (cal.outlook?.verdeckt ?? []).some((v) => !v.allDay && v.end > now && (!next || v.start < next.start));
  if (davor) return "Dein nächster Termin steht in Outlook. Den nenne ich hier nicht; am Mac siehst du ihn im Raum Kalender.";
  if (!next) return `In den nächsten ${READ_DAYS} Tagen steht kein Termin mit Uhrzeit im Kalender.`;
  if (next.start <= now) return `Gerade läuft ${next.title}, bis ${spokenTime(next.end).replace(/^um /, "")}.`;
  const iso = isoDate(new Date(next.start));
  const minutes = Math.round((next.start - now) / 60_000);
  if (iso === today && minutes < 60) return `In ${minutes <= 1 ? "einer Minute" : `${minutes} Minuten`}: ${next.title}.`;
  return `Dein nächster Termin ist ${spokenDay(iso, today)} ${spokenTime(next.start)}: ${next.title}.`;
}

// Fürs Briefing: kurz, und leer, wenn der Kalender gar nicht verbunden ist.
export function briefingSentence(cal: CalendarSnapshot | null, today: string): string {
  if (!cal || cal.access === "offen" || cal.access === "kein-mac") return "";
  if (accessProblem(cal)) return accessProblem(cal)!;
  return mitLuecke(briefingSatz(cal, today), cal);
}

function briefingSatz(cal: CalendarSnapshot, today: string): string {
  const now = Date.now();
  const rest = eventsOn(cal.events, today).filter((e) => e.allDay || e.end > now);
  const verdeckt = verdecktAm(cal, today, now);
  if (rest.length === 0 && verdeckt > 0) return `Im Kalender steht heute nur Outlook: ${outlookSatz(verdeckt, true)}.`;
  if (rest.length === 0) {
    const tomorrow = eventsOn(cal.events, addDays(today, 1));
    if (tomorrow.length) return `Heute ist dein Kalender frei. Morgen geht es los mit ${eventPhrase(tomorrow[0])}.`;
    const morgenVerdeckt = verdecktAm(cal, addDays(today, 1));
    return morgenVerdeckt > 0 ? `Heute ist dein Kalender frei. Morgen steht nur Outlook darin: ${outlookSatz(morgenVerdeckt, true)}.` : "Heute und morgen ist dein Kalender frei.";
  }
  const timed = rest.filter((e) => !e.allDay);
  const first = timed[0] ?? rest[0];
  const n = rest.length === 1 ? "einen Termin" : `${rest.length} Termine`;
  return `Im Kalender hast du heute noch ${n}, ${first === rest[0] && rest.length === 1 ? "" : "als Nächstes "}${eventPhrase(first)}.${verdeckt > 0 ? ` ${outlookSatz(verdeckt)}` : ""}`;
}

// ---------- Neuer Termin per Zuruf ----------

const NUMBER_WORDS: Record<string, number> = {
  eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12,
};
// Längere Wörter zuerst, damit „eine“ nicht als „ein“ endet.
const NUM = `(?:\\d{1,2}|${Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length).join("|")})(?![a-zäöüß\\d])`;
const num = (s: string) => NUMBER_WORDS[s] ?? Number(s);

// Alles, was nur sagt „trag einen Termin ein“, aber nicht zum Termin gehört.
const FILLER = [
  /^(?:bitte\s+)?(?:trag(?:e)?|schreib(?:e)?|setz(?:e)?|leg(?:e)?|mach(?:e)?|erstell(?:e)?|plan(?:e)?)(?:\s+(?:mir|uns|bitte|doch|mal))*\b/i,
  /^(?:bitte\s+)?(?:neue[nr]?\s+)?termine?\b(?:\s+(?:eintragen|anlegen))?/i,
  /\b(?:in\s+(?:den|meinen|dem)|im|ins)\s+kalender\b/gi,
  /\b(?:einen|einem|ein|neuen|nen)\s+(?:neuen\s+)?termin\b/gi,
  /^(?:an|ein)\b|\b(?:eintragen|anlegen|ein|an)\s*$/gi,
  /\bkalender\b/gi,
];

const MORNING = /\b(morgens|früh|vormittags?|in der früh)\b/;
const LATER = /\b(nachmittags?|abends?|am abend|am nachmittag|nachts?)\b/;

type Found = { time: string; end?: string; match: string };

// Termine ohne „morgens“ zwischen 1 und 6 Uhr meint man fast immer nachmittags. „halb eins“ ist 12:30.
function hour24(h: number, text: string): number {
  if (h === 0) return 12;
  if (LATER.test(text) && h < 12) return h + 12;
  if (!MORNING.test(text) && h >= 1 && h <= 6) return h + 12;
  return h;
}

const t = (h: number, m: number) => (h >= 0 && h < 24 && m >= 0 && m < 60 ? `${pad(h)}:${pad(m)}` : null);

function findTime(text: string): Found | null {
  const lower = text.toLowerCase();
  const span = lower.match(new RegExp(`(?:von\\s+|um\\s+)?(${NUM})(?:[:.](\\d{2}))?(?:\\s+uhr)?\\s+bis\\s+(${NUM})(?:[:.](\\d{2}))?(?:\\s+uhr)?`));
  if (span) {
    const start = t(hour24(num(span[1]), lower), Number(span[2] ?? 0));
    let endH = hour24(num(span[3]), lower);
    if (start && endH < Number(start.slice(0, 2))) endH += 12;
    const end = t(endH, Number(span[4] ?? 0));
    if (start && end && end > start) return { time: start, end, match: span[0] };
  }
  const rules: [RegExp, (m: RegExpMatchArray) => string | null][] = [
    [new RegExp(`(?:um\\s+)?halb\\s+(${NUM})(?:\\s+uhr)?`), (m) => t(hour24(num(m[1]) - 1, lower), 30)],
    [new RegExp(`(?:um\\s+)?viertel\\s+nach\\s+(${NUM})(?:\\s+uhr)?`), (m) => t(hour24(num(m[1]), lower), 15)],
    [new RegExp(`(?:um\\s+)?(?:viertel\\s+vor|dreiviertel)\\s+(${NUM})(?:\\s+uhr)?`), (m) => t(hour24(num(m[1]) - 1, lower), 45)],
    // 9:30 oder 9.30, aber kein Datum wie 05.11.
    [/(?:um\s+)?(?<![\d.])(\d{1,2})[:.](\d{2})(?![\d.])(?:\s+uhr)?/, (m) => t(hour24(Number(m[1]), lower), Number(m[2]))],
    [new RegExp(`(?:um\\s+)?(${NUM})\\s+uhr(?:\\s+(\\d{1,2})(?!\\s*(?:minuten|min|stunden)))?`), (m) => t(hour24(num(m[1]), lower), Number(m[2] ?? 0))],
    [new RegExp(`um\\s+(${NUM})(?![\\d.:])`), (m) => t(hour24(num(m[1]), lower), 0)],
  ];
  for (const [re, make] of rules) {
    const m = lower.match(re);
    if (!m) continue;
    const time = make(m);
    if (time) return { time, match: m[0] };
  }
  return null;
}

function findMinutes(text: string): { minutes: number; match: string } | null {
  const lower = text.toLowerCase();
  const half = lower.match(/für\s+(?:eine\s+)?halbe\s+stunde/);
  if (half) return { minutes: 30, match: half[0] };
  const oneHalf = lower.match(/für\s+(?:anderthalb|eineinhalb)\s+stunden/);
  if (oneHalf) return { minutes: 90, match: oneHalf[0] };
  const m = lower.match(new RegExp(`(?:für\\s+)?(${NUM}|\\d{2,3})\\s+(stunden?|std|minuten|min)\\b`));
  if (!m) return null;
  const n = num(m[1]);
  return { minutes: m[2].startsWith("m") ? n : n * 60, match: m[0] };
}

const cut = (text: string, part: string) => {
  const i = text.toLowerCase().indexOf(part.toLowerCase());
  return i < 0 ? text : `${text.slice(0, i)} ${text.slice(i + part.length)}`;
};

// Aus „trag morgen um halb drei Zahnarzt ein“ wird { title: "Zahnarzt", date: morgen, time: "14:30" }.
// Ohne Datum ist heute gemeint, wenn die Uhrzeit noch kommt, sonst morgen. Ohne beides: null.
export function eventFromSpeech(input: string, now: Date): NewEvent | null {
  const today = isoDate(now);
  let text = ` ${input.trim().replace(/[.!?]+$/, "")} `;
  const time = findTime(text);
  if (time) text = cut(text, time.match);
  const duration = findMinutes(text);
  if (duration) text = cut(text, duration.match);
  const date = findDate(text, today);
  if (date) text = cut(text, date.match);
  if (!date && !time) return null;
  let iso = date?.iso ?? today;
  if (!date && time && time.time <= `${pad(now.getHours())}:${pad(now.getMinutes())}`) iso = addDays(today, 1);

  for (const re of FILLER) text = text.trim().replace(re, " ");
  text = text
    .replace(/\b(morgens|vormittags?|nachmittags?|abends?|am abend|am nachmittag|in der früh|früh)(?![a-zäöüß])/gi, " ")
    .replace(/^\s*(?:mit dem titel|titel|betreff|namens|und zwar|für|einen|eine|ein|den|die|das)\b/gi, " ")
    .replace(/^[\s,.:;-]+|[\s,.:;-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;

  const minutes = time?.end ? daysBetweenMinutes(time.time, time.end) : (duration?.minutes ?? DEFAULT_MINUTES);
  return { title: capitalize(text), date: iso, ...(time ? { time: time.time, minutes } : {}) };
}

function daysBetweenMinutes(from: string, to: string): number {
  const [h1, m1] = from.split(":").map(Number);
  const [h2, m2] = to.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

// So bestätigt JARVIS einen neuen Termin.
export function confirmSentence(e: NewEvent, today: string, calendar?: string | null): string {
  const diff = daysBetween(today, e.date);
  const day = diff <= 2 ? spokenDay(e.date, today) : `am ${spokenDay(e.date, today)}`;
  const when = e.time ? `${day} ${spokenClock(e.time)}` : `${day}, ganztägig`;
  const where = calendar ? ` im Kalender ${calendar}` : "";
  return `Eingetragen${where}: ${e.title}, ${when}.`;
}

// Start und Ende in Ortszeit; das läuft auf demselben Mac wie der Kalender.
export function eventTimes(e: NewEvent): { start: number; end: number; allDay: boolean } {
  const day = fromIso(e.date);
  if (!e.time) return { start: day.getTime(), end: day.getTime(), allDay: true };
  const [h, m] = e.time.split(":").map(Number);
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m).getTime();
  return { start, end: start + (e.minutes ?? DEFAULT_MINUTES) * 60_000, allDay: false };
}

export const dayOf = (ms: number) => isoDate(new Date(ms));
