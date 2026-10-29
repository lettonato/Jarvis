import { accessProblem, clock, eventsOn, type CalendarSnapshot } from "./calendar";
import { deskSentence } from "./commands";
import { isoDate } from "./dates";
import { intelBriefing, type IntelSnapshot } from "./intel";
import { importantMails, type MailSnapshot } from "./mail";
import type { DeskSnapshot } from "./paper";
import { dateOf, dueSoon, type TasksSnapshot } from "./tasks";
import type { WeatherSnapshot } from "./weather";

// JARVIS auf dem Handy über Telegram: Du legst dir bei Telegram einen eigenen Bot an, JARVIS liest dessen
// Nachrichten und antwortet nur dir. Hier stehen die Texte und Regeln ohne Netz, damit sie testbar sind;
// die Verbindung macht src/lib/server/telegram.ts.

// Was die Einstellungen-Seite über Telegram erfährt. Der Schlüssel selbst nie, nur seine letzten Zeichen.
export type TelegramStatus = {
  configured: boolean;
  bot: string | null;
  hint: string | null;
  paired: boolean;
  chatName: string | null;
  // Der Code zum Koppeln, solange noch kein Handy gekoppelt ist.
  code: string | null;
  codeUntil: string | null;
  error: string | null;
  prefs: TelegramPrefs;
};

export type TelegramPrefs = { trades: boolean; warnings: boolean; reminders: boolean; briefing: string | null };

export const TELEGRAM_DEFAULTS: TelegramPrefs = { trades: true, warnings: true, reminders: true, briefing: "07:30" };

// So viele Minuten vor einem Termin erinnert JARVIS dich.
export const REMINDER_MINUTES = 15;

// Ein Bot-Schlüssel vom BotFather sieht so aus: 123456789:AAH-Buchstaben.
export const TOKEN_PATTERN = /^\d{5,12}:[A-Za-z0-9_-]{30,60}$/;

// Fischt den Schlüssel aus dem, was eingefügt wurde: auch aus der ganzen Nachricht des BotFathers, mit
// unsichtbaren Zeichen vom Kopieren oder mit Leerzeichen mittendrin, wenn er abgetippt wurde.
export function findToken(text: string): string | null {
  const clean = text.normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
  const found = clean.match(/(?<!\d)\d{5,12}:[A-Za-z0-9_-]{30,60}(?![A-Za-z0-9_-])/);
  if (found) return found[0];
  const squeezed = clean.replace(/\s+/g, "");
  return TOKEN_PATTERN.test(squeezed) ? squeezed : null;
}

// Sagt beim Abtippen, woran es hakt, statt nur „passt nicht“. Null, wenn der Schlüssel passt oder das Feld leer ist.
export function tokenProblem(text: string): string | null {
  if (findToken(text)) return null;
  const t = text.normalize("NFKC").replace(/[\u200B-\u200D\u2060\uFEFF\s]/g, "");
  if (!t) return null;
  const colon = t.indexOf(":");
  if (colon < 0)
    return /^\d+[.;,]/.test(t)
      ? "Nach den Ziffern steht ein Punkt oder Strichpunkt. Dort muss ein Doppelpunkt hin (Umschalttaste + Punkt)."
      : "Es fehlt der Doppelpunkt nach den Ziffern (Umschalttaste + Punkt).";
  if (!/^\d{5,12}$/.test(t.slice(0, colon))) return "Vor dem Doppelpunkt stehen nur Ziffern, meist zehn.";
  const tail = t.slice(colon + 1);
  const bad = [...tail].findIndex((c) => !/[A-Za-z0-9_-]/.test(c));
  if (bad >= 0) return `Das Zeichen „${[...tail][bad]}“ gehört nicht hinein. Nach dem Doppelpunkt kommen nur Buchstaben ohne Umlaute, Ziffern, - und _.`;
  return `Nach dem Doppelpunkt stehen ${tail.length} Zeichen, es müssen mindestens 30 sein (meist 35).`;
}

export const isClock = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

// Der Link, der den Bot auf dem Handy öffnet und den Code gleich mitschickt.
export const pairLink = (bot: string, code: string) => `https://t.me/${bot}?start=${code}`;

// Erscheint im Telegram-Menü unter „/“.
export const COMMANDS = [
  { command: "briefing", description: "Was heute ansteht" },
  { command: "handel", description: "Stand des Spielgeld-Handels" },
  { command: "pause", description: "Handel pausieren, der Stop-Loss bleibt" },
  { command: "weiter", description: "Handel fortsetzen" },
  { command: "notaus", description: "Alle Agenten sofort stoppen" },
  { command: "hilfe", description: "Was ich hier kann" },
];

// Was eine Nachricht ohne KI-Gehirn bedeutet. Alles andere geht an Claude.
export type TelegramCommand = "briefing" | "handel" | "pause" | "weiter" | "notaus" | "hilfe";

export function commandOf(text: string): TelegramCommand | null {
  const t = text.trim().toLowerCase();
  const slash = t.match(/^\/([a-zäöü]+)(?:@\w+)?(?:\s|$)/);
  if (slash) {
    const c = slash[1] === "start" || slash[1] === "help" ? "hilfe" : slash[1] === "stopp" || slash[1] === "stop" ? "pause" : slash[1];
    return (COMMANDS.some((x) => x.command === c) ? c : "hilfe") as TelegramCommand;
  }
  // Ein einzelnes „Stopp“ hält den Handel an. Pause statt Not-Aus, damit der Stop-Loss weiter aufpasst.
  if (/^(stopp?|halt)[.!]*$/.test(t)) return "pause";
  if (/^(briefing|lage)[.!?]*$/.test(t)) return "briefing";
  return null;
}

export function helpText(name: string, brain: boolean): string {
  const free = brain
    ? `Schreib mir einfach wie in der App, zum Beispiel „Was steht morgen an?“, „Trag Freitag 15 Uhr Friseur ein“ oder „Fass mir die Mail von Anna zusammen“.`
    : "Für freie Fragen braucht JARVIS das KI-Gehirn. Den Claude-Schlüssel trägst du am Mac unter Einstellungen ein.";
  return [
    `Hallo ${name}, hier ist JARVIS. ${free}`,
    "",
    "/briefing – was heute ansteht",
    "/handel – Stand des Spielgeld-Handels",
    "/pause – keine neuen Käufe, der Stop-Loss bleibt (oder einfach „Stopp“)",
    "/weiter – Handel fortsetzen",
    "/notaus – alle Agenten sofort stoppen",
    "",
    "Ich laufe auf deinem Mac. Schläft er, antworte ich, sobald er wieder wach ist.",
  ].join("\n");
}

export type BriefingInput = {
  name: string;
  now: Date;
  weather: WeatherSnapshot | null;
  calendar: CalendarSnapshot | null;
  mail: MailSnapshot | null;
  tasks: TasksSnapshot | null;
  intel: IntelSnapshot | null;
  desk: DeskSnapshot | null;
};

const DAY = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });
const MAX_LINES = 5;

// Das Briefing fürs Handy: kurze Absätze, Termine und Mails als Liste.
export function briefingMessage({ name, now, weather, calendar, mail, tasks, intel, desk }: BriefingInput): string {
  const today = isoDate(now);
  const hour = now.getHours();
  const greeting = hour < 11 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const parts: string[] = [`${greeting}, ${name}. Heute ist ${DAY.format(now)}.`];

  if (weather) {
    const day = weather.days[0];
    const range = day ? `, heute ${Math.round(day.min)} bis ${Math.round(day.max)} Grad` : "";
    parts.push(`${weather.place}: ${Math.round(weather.temperature)} Grad, ${weather.description}${range}.${weather.source === "demo" ? " (Beispieldaten)" : ""}`);
  }

  if (calendar && calendar.access !== "offen" && calendar.access !== "kein-mac") {
    const problem = accessProblem(calendar);
    if (problem) parts.push(`Kalender: ${problem}`);
    else {
      const rest = eventsOn(calendar.events, today).filter((e) => e.allDay || e.end > now.getTime());
      if (rest.length === 0) parts.push("Kalender: heute frei.");
      else {
        const lines = rest.slice(0, MAX_LINES).map((e) => `• ${e.allDay ? "ganztägig" : clock(e.start)} ${e.title}${e.location ? `, ${e.location}` : ""}`);
        if (rest.length > MAX_LINES) lines.push(`• und ${rest.length - MAX_LINES} weitere`);
        parts.push(`Termine heute:\n${lines.join("\n")}`);
      }
    }
  }

  if (mail?.configured) {
    if (mail.error) parts.push(`Post: ${mail.error}`);
    else {
      const important = importantMails(mail).filter((m) => m.unread || m.flagged);
      if (important.length === 0) parts.push(`Post: keine neuen wichtigen Mails${mail.bulkUnread ? `, dazu ${mail.bulkUnread} Newsletter` : ""}.`);
      else {
        const lines = important.slice(0, MAX_LINES).map((m) => `• ${m.from || m.fromAddress}: ${m.subject}`);
        if (important.length > MAX_LINES) lines.push(`• und ${important.length - MAX_LINES} weitere`);
        parts.push(`Post: ${important.length === 1 ? "eine wichtige Mail" : `${important.length} wichtige Mails`}\n${lines.join("\n")}`);
      }
    }
  }

  if (tasks?.configured && !tasks.error) {
    const soon = dueSoon(tasks.tasks, today);
    const overdue = soon.filter((t) => dateOf(t)! < today).length;
    const dueToday = soon.filter((t) => dateOf(t) === today);
    if (soon.length === 0) parts.push("Aufgaben: bis nächste Woche ist nichts fällig.");
    else {
      const head = `Aufgaben: ${soon.length} bis nächste Woche fällig${overdue ? `, ${overdue} davon überfällig` : ""}.`;
      const lines = dueToday.slice(0, MAX_LINES).map((t) => `• ${t.text}`);
      parts.push(lines.length ? `${head}\nHeute dran:\n${lines.join("\n")}` : head);
    }
  }

  const news = intelBriefing(intel, now);
  if (news) parts.push(news);
  const trading = deskSentence(desk, true);
  if (trading) parts.push(trading);
  return parts.join("\n\n");
}

// Eine Termin-Erinnerung.
export function reminderMessage(e: { title: string; start: number; location: string }, now: number): string {
  const minutes = Math.max(1, Math.round((e.start - now) / 60_000));
  return `⏰ In ${minutes} Minuten: ${e.title}${e.location ? `, ${e.location}` : ""} (${clock(e.start)} Uhr)`;
}

// Telegram nimmt höchstens 4096 Zeichen pro Nachricht. Längeres wird an Absätzen geteilt.
export function splitMessage(text: string, max = 4000): string[] {
  const out: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n\n", max);
    if (cut < max / 2) cut = rest.lastIndexOf("\n", max);
    if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
    if (cut < max / 2) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}
