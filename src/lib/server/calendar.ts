import { execFile } from "node:child_process";
import { addDays, isoDate } from "../dates";
import { eventTimes, READ_DAYS, type CalendarAccess, type CalendarEvent, type CalendarSnapshot, type NewEvent } from "../calendar";
import { readConfig } from "./config";

// Der Apple-Kalender auf dem Mac, über EventKit, dieselbe Schnittstelle, die auch die Kalender-App
// nutzt. Damit sieht JARVIS alle Kalender, die dort eingerichtet sind (iCloud, Google, Exchange).
// macOS fragt beim ersten Mal, ob „Terminal“ auf die Kalender zugreifen darf, weil JARVIS im
// Terminal läuft. JARVIS liest und trägt neu ein; ändern oder löschen kann er nichts, dafür gibt es
// hier schlicht keinen Befehl.

const OSASCRIPT = () => process.env.JARVIS_OSASCRIPT ?? "/usr/bin/osascript";
const OPEN = () => process.env.JARVIS_OPEN ?? "/usr/bin/open";
const onMac = () => process.platform === "darwin" || Boolean(process.env.JARVIS_OSASCRIPT);

// JavaScript für Automation (JXA). Es bekommt den Modus und die Daten als Argumente, nie als Code.
const EVENTKIT = String.raw`
ObjC.import("EventKit");
ObjC.import("Foundation");

const NAMES = { 0: "offen", 1: "gesperrt", 2: "verweigert", 3: "ok", 4: "nur-schreiben" };
const status = () => Number($.EKEventStore.authorizationStatusForEntityType(0));
const isNil = (o) => o === undefined || o === null || (typeof o.isNil === "function" && o.isNil());
const text = (s) => {
  try {
    if (isNil(s)) return "";
    const v = ObjC.unwrap(s);
    return typeof v === "string" ? v : v == null ? "" : String(v);
  } catch (e) {
    return "";
  }
};
const date = (ms) => $.NSDate.dateWithTimeIntervalSince1970(ms / 1000);

function wait(done, seconds) {
  const until = Date.now() + seconds * 1000;
  while (!done() && Date.now() < until) $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.2));
}

// Zeigt die Rückfrage von macOS und wartet, bis du sie beantwortet hast. Die Antwort kommt über den
// Status, nicht über den Rückruf, der auf einem anderen Thread landen kann.
function ask() {
  const store = $.EKEventStore.alloc.init;
  let answered = false;
  const done = function () { answered = true; };
  try {
    if (typeof store.requestFullAccessToEventsWithCompletion === "function") store.requestFullAccessToEventsWithCompletion(done);
    else store.requestAccessToEntityTypeCompletion(0, done);
  } catch (e) {
    try { store.requestAccessToEntityTypeCompletion(0, done); } catch (e2) { return String(e2); }
  }
  wait(() => answered || status() !== 0, 90);
  return "";
}

function calendars(store) {
  const all = store.calendarsForEntityType(0);
  const list = [];
  for (let i = 0; i < all.count; i++) list.push(all.objectAtIndex(i));
  return { all, list };
}

function read(from, to) {
  const store = $.EKEventStore.alloc.init;
  const cals = calendars(store);
  const standard = store.defaultCalendarForNewEvents;
  const found = store.eventsMatchingPredicate(store.predicateForEventsWithStartDateEndDateCalendars(date(from), date(to), cals.all));
  const events = [];
  for (let i = 0; i < found.count && events.length < 1000; i++) {
    const e = found.objectAtIndex(i);
    const start = Math.round(e.startDate.timeIntervalSince1970 * 1000);
    const allDay = e.isAllDay;
    events.push({
      id: (text(e.eventIdentifier) || text(e.calendarItemIdentifier)) + "@" + start,
      title: text(e.title),
      start,
      end: Math.round(e.endDate.timeIntervalSince1970 * 1000),
      allDay: Boolean(allDay === undefined ? e.allDay : allDay),
      location: text(e.location),
      calendar: text(e.calendar.title),
    });
  }
  return {
    kalender: cals.list.map((c) => ({ name: text(c.title), writable: Boolean(c.allowsContentModifications) })),
    standard: isNil(standard) ? null : text(standard.title),
    events,
  };
}

function add(data) {
  const store = $.EKEventStore.alloc.init;
  let target = null;
  for (const c of calendars(store).list) {
    if (data.calendar && text(c.title) === data.calendar && c.allowsContentModifications) target = c;
  }
  if (!target) target = store.defaultCalendarForNewEvents;
  if (isNil(target)) return { fehler: "Ich finde keinen Kalender, in den ich eintragen darf." };
  const ev = $.EKEvent.eventWithEventStore(store);
  ev.setTitle(data.title);
  ev.setStartDate(date(data.start));
  ev.setEndDate(date(data.end));
  ev.setAllDay(Boolean(data.allDay));
  if (data.location) ev.setLocation(data.location);
  ev.setCalendar(target);
  const error = $();
  if (!store.saveEventSpanCommitError(ev, 0, true, error)) {
    let why = "";
    try { why = text(error.localizedDescription); } catch (e) {}
    return { fehler: "Der Kalender hat den Termin nicht gespeichert. " + why };
  }
  return { gespeichert: true, kalender_name: text(target.title) };
}

function run(argv) {
  try {
    const mode = argv[0];
    let frage = "";
    if (mode === "fragen" && status() === 0) {
      frage = ask();
      if (!frage && status() === 0) frage = "keine-antwort";
    }
    const s = status();
    const out = { zugriff: NAMES[s] || "fehler", status: s };
    if (frage) out.fehler = frage;
    if (mode === "neu") {
      if (s === 3 || s === 4) Object.assign(out, add(JSON.parse(argv[1])));
    } else if (s === 3) Object.assign(out, read(Number(argv[1]), Number(argv[2])));
    return JSON.stringify(out);
  } catch (e) {
    return JSON.stringify({ zugriff: "fehler", fehler: String(e) });
  }
}
`;

// Die Kalender-App am gewünschten Tag öffnen, in der Tagesansicht.
const SHOW_DAY = `on run argv
  set d to current date
  set day of d to 1
  set year of d to (item 1 of argv) as integer
  set month of d to (item 2 of argv) as integer
  set day of d to (item 3 of argv) as integer
  set time of d to 12 * hours
  tell application "Calendar"
    activate
    switch view to day view
    view calendar at d
  end tell
end run`;

type ScriptResult = {
  zugriff: "offen" | "gesperrt" | "verweigert" | "ok" | "nur-schreiben" | "fehler";
  status?: number;
  fehler?: string;
  kalender?: { name: string; writable: boolean }[];
  standard?: string | null;
  events?: CalendarEvent[];
  gespeichert?: boolean;
  kalender_name?: string;
};

function run(file: string, args: string[], timeout: number): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { timeout, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error((stderr || error.message).trim()));
      else resolve(stdout.trim());
    });
  });
}

async function eventKit(args: string[], timeout = 20_000): Promise<ScriptResult> {
  const out = await run(OSASCRIPT(), ["-l", "JavaScript", "-e", EVENTKIT, ...args], timeout);
  try {
    return JSON.parse(out) as ScriptResult;
  } catch {
    return { zugriff: "fehler", fehler: out.slice(0, 200) || "Keine Antwort vom Kalender." };
  }
}

export const SETTINGS_PATH = "Systemeinstellungen → Datenschutz & Sicherheit → Kalender";

function explain(r: ScriptResult): string | undefined {
  if (r.zugriff === "offen" && r.fehler) {
    return `macOS hat den Zugriff noch nicht freigegeben. Kam keine Rückfrage, öffne ${SETTINGS_PATH} und schalte „Terminal“ ein, falls es dort steht. Dann hier noch einmal auf „Kalender verbinden“ tippen.`;
  }
  if (r.zugriff === "verweigert") return `macOS lässt mich nicht in deinen Kalender sehen. Öffne ${SETTINGS_PATH} und gib dort „Terminal“ Vollzugriff. Danach hier auf „Neu laden“ tippen.`;
  if (r.zugriff === "gesperrt") return "Der Kalenderzugriff ist auf diesem Mac gesperrt, etwa durch Bildschirmzeit oder ein Firmenprofil.";
  if (r.zugriff === "nur-schreiben") return `Ich darf nur eintragen, aber nicht hineinsehen. Stell in ${SETTINGS_PATH} bei „Terminal“ auf Vollzugriff.`;
  if (r.zugriff === "fehler") return `Ich komme gerade nicht an deinen Kalender. ${r.fehler ?? ""}`.trim();
  return r.fehler;
}

const accessOf = (r: ScriptResult): CalendarAccess => (r.zugriff === "gesperrt" ? "verweigert" : r.zugriff);

let cache: { at: number; snap: CalendarSnapshot } | null = null;
let pending: Promise<CalendarSnapshot> | null = null;
const CACHE_MS = 60_000;

async function load(mode: "lesen" | "fragen"): Promise<CalendarSnapshot> {
  const today = isoDate(new Date());
  const to = addDays(today, READ_DAYS);
  const base = { events: [], calendars: [], target: null, from: today, to };
  if (!onMac()) return { ...base, access: "kein-mac", error: "Den Apple-Kalender gibt es nur auf dem Mac." };
  const from = new Date(`${today}T00:00:00`).getTime();
  const until = new Date(`${to}T23:59:59`).getTime();
  let r: ScriptResult;
  try {
    r = await eventKit([mode, String(from), String(until)], mode === "fragen" ? 100_000 : 20_000);
  } catch (e) {
    r = { zugriff: "fehler", fehler: e instanceof Error ? e.message : String(e) };
  }
  const { calendar } = await readConfig();
  const calendars = r.kalender ?? [];
  const chosen = calendar?.target && calendars.some((c) => c.name === calendar.target && c.writable) ? calendar.target : null;
  return {
    access: accessOf(r),
    events: (r.events ?? []).filter((e) => e.title).sort((a, b) => a.start - b.start),
    calendars,
    target: chosen ?? r.standard ?? null,
    from: today,
    to,
    error: explain(r),
  };
}

export async function readCalendar({ force = false } = {}): Promise<CalendarSnapshot> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.snap;
  if (pending) return pending;
  pending = load("lesen")
    .then((snap) => {
      cache = { at: Date.now(), snap };
      return snap;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

// Fragt macOS nach dem Zugriff. Die Rückfrage erscheint auf dem Mac; JARVIS wartet bis zu 90 Sekunden.
export async function requestAccess(): Promise<CalendarSnapshot> {
  const snap = await load("fragen");
  cache = { at: Date.now(), snap };
  return snap;
}

export class CalendarError extends Error {}

const MAX_TITLE = 200;

export function checkEvent(input: NewEvent): NewEvent {
  const title = input.title?.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE);
  if (!title) throw new CalendarError("Wie soll der Termin heißen?");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date ?? "")) throw new CalendarError("Das Datum bitte als JJJJ-MM-TT angeben.");
  if (input.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) throw new CalendarError("Die Uhrzeit bitte als HH:MM angeben.");
  const minutes = input.time ? Math.round(Number(input.minutes ?? 60)) : undefined;
  if (minutes !== undefined && !(minutes >= 5 && minutes <= 24 * 60)) throw new CalendarError("Ein Termin dauert zwischen 5 Minuten und 24 Stunden.");
  const today = isoDate(new Date());
  if (input.date < addDays(today, -1)) throw new CalendarError("Das Datum liegt in der Vergangenheit.");
  if (input.date > addDays(today, 3 * 365)) throw new CalendarError("So weit voraus trage ich nichts ein.");
  return {
    title,
    date: input.date,
    ...(input.time ? { time: input.time, minutes } : {}),
    ...(input.location?.trim() ? { location: input.location.trim().slice(0, MAX_TITLE) } : {}),
    ...(input.calendar?.trim() ? { calendar: input.calendar.trim() } : {}),
  };
}

// Trägt einen neuen Termin ein. Ohne Kalendernamen nimmt JARVIS den aus den Einstellungen,
// sonst den Standardkalender des Macs.
export async function addEvent(input: NewEvent): Promise<{ snapshot: CalendarSnapshot; calendar: string; event: NewEvent }> {
  const event = checkEvent(input);
  if (!onMac()) throw new CalendarError("Den Apple-Kalender gibt es nur auf dem Mac.");
  const { calendar } = await readConfig();
  const times = eventTimes(event);
  const r = await eventKit(["neu", JSON.stringify({ title: event.title, location: event.location ?? "", calendar: event.calendar ?? calendar?.target ?? "", ...times })]).catch(
    (e: unknown): ScriptResult => ({ zugriff: "fehler", fehler: e instanceof Error ? e.message : String(e) }),
  );
  if (r.zugriff === "offen") throw new CalendarError("Dein Kalender ist noch nicht verbunden. Tippe in der Kalender-Ansicht auf „Kalender verbinden“.");
  if (!r.gespeichert) throw new CalendarError(r.fehler && r.zugriff !== "fehler" ? r.fehler : (explain(r) ?? "Der Termin wurde nicht gespeichert."));
  cache = null;
  return { snapshot: await readCalendar({ force: true }), calendar: r.kalender_name ?? "", event };
}

// Öffnet die Kalender-App am gewünschten Tag. Darf JARVIS die App nicht steuern, öffnet er sie nur.
export async function openCalendar(date?: string): Promise<string | undefined> {
  if (!onMac()) throw new CalendarError("Die Kalender-App gibt es nur auf dem Mac.");
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : isoDate(new Date());
  const [y, m, d] = day.split("-");
  try {
    await run(OSASCRIPT(), ["-e", SHOW_DAY, y, String(Number(m)), String(Number(d))], 15_000);
    return undefined;
  } catch (e) {
    await run(OPEN(), ["-a", "Calendar"], 10_000).catch(() => {});
    const denied = /-1743|nicht berechtigt|not authorized/i.test(e instanceof Error ? e.message : String(e));
    return denied
      ? "Ich habe den Kalender geöffnet, darf aber nicht zum Tag springen. Erlaube es in Systemeinstellungen → Datenschutz & Sicherheit → Automation bei „Terminal“ für „Kalender“."
      : undefined;
  }
}

// Öffnet eine Adresse mit dem passenden Programm auf dem Mac, etwa obsidian://.
export async function openUrl(url: string): Promise<void> {
  if (!onMac()) throw new CalendarError("Das geht nur auf dem Mac.");
  await run(OPEN(), [url], 10_000);
}
