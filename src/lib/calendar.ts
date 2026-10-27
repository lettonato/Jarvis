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
};

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

const dayStart = (iso: string) => fromIso(iso).getTime();

// Alle Termine, die an diesem Tag stattfinden, ganztägige zuerst.
export function eventsOn(events: CalendarEvent[], iso: string): CalendarEvent[] {
  const from = dayStart(iso);
  const to = dayStart(addDays(iso, 1));
  return events
    .filter((e) => e.start < to && Math.max(e.end, e.start + 1) > from)
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
  if (iso > cal!.to) return `So weit voraus lese ich deinen Kalender nicht, nur bis ${spokenDay(cal!.to, today)}. Im Kalender auf dem Mac siehst du alles.`;
  const day = dayWord(iso, today);
  const now = Date.now();
  const all = eventsOn(cal!.events, iso);
  // Für heute zählt nur, was noch kommt.
  const events = iso === today ? all.filter((e) => e.allDay || e.end > now) : all;
  if (events.length === 0) {
    if (iso === today && all.length > 0) return "Für heute steht nichts mehr im Kalender.";
    return `${day} steht nichts im Kalender.`;
  }
  const what = list(events.slice(0, 6).map(eventPhrase));
  const more = events.length > 6 ? `, und noch ${events.length - 6} weitere` : "";
  // Ist heute schon etwas vorbei, zählt JARVIS nur, was noch kommt.
  if (iso === today && events.length < all.length) {
    return events.length === 1 ? `Heute kommt noch ein Termin: ${what}.` : `Heute kommen noch ${events.length} Termine: ${what}${more}.`;
  }
  return events.length === 1 ? `${day} hast du einen Termin: ${what}.` : `${day} hast du ${events.length} Termine: ${what}${more}.`;
}

// Der nächste Termin, für „wann ist mein nächster Termin“.
export function nextSentence(cal: CalendarSnapshot | null, today: string): string {
  const problem = accessProblem(cal);
  if (problem) return problem;
  const now = Date.now();
  const next = nextEvent(cal!.events, now);
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
  const now = Date.now();
  const rest = eventsOn(cal.events, today).filter((e) => e.allDay || e.end > now);
  if (rest.length === 0) {
    const tomorrow = eventsOn(cal.events, addDays(today, 1));
    return tomorrow.length ? `Heute ist dein Kalender frei. Morgen geht es los mit ${eventPhrase(tomorrow[0])}.` : "Heute und morgen ist dein Kalender frei.";
  }
  const timed = rest.filter((e) => !e.allDay);
  const first = timed[0] ?? rest[0];
  const n = rest.length === 1 ? "einen Termin" : `${rest.length} Termine`;
  return `Im Kalender hast du heute noch ${n}, ${first === rest[0] && rest.length === 1 ? "" : "als Nächstes "}${eventPhrase(first)}.`;
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
