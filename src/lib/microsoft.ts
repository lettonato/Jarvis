import type { CalendarEvent } from "./calendar";
import { fromIso } from "./dates";

// Microsoft 365 über Microsoft Graph. Bisher gibt es genau eines: Termine aus Outlook lesen. JARVIS trägt dort
// nichts ein, ändert nichts und löscht nichts, und Mails, Dateien oder Teams liest er darüber nicht.
// Hier stehen die Regeln ohne Netz, damit sie prüfbar sind; Anmeldung und Abruf macht src/lib/server/microsoft.ts.
//
// Drei feste Regeln:
// 1. Nur lesen, und nur das Nötigste: Die Anmeldung bittet Microsoft um genau die Rechte in MICROSOFT_RECHTE.
// 2. Outlook-Termine bleiben auf dem Bildschirm am Mac. Ins Gespräch mit dem KI-Modell und über Telegram
//    gehen sie erst, wenn du es ausdrücklich einschaltest (extern).
// 3. Termine, die in Outlook als privat oder vertraulich markiert sind, zeigt JARVIS ohne Titel und Ort.

// offline_access: angemeldet bleiben. User.Read: zeigen, welches Konto verbunden ist.
// Calendars.ReadBasic: Titel, Zeit und Ort von Terminen, ohne den Text der Einladung und ohne Anhänge.
export const MICROSOFT_RECHTE = ["offline_access", "User.Read", "Calendars.ReadBasic"] as const;
export const OUTLOOK_KALENDER = "Outlook";

export type MicrosoftStatus = {
  // Verzeichnis und Anwendung sind eingetragen.
  eingerichtet: boolean;
  tenantId: string | null;
  clientId: string | null;
  // Eine Anmeldung liegt vor.
  verbunden: boolean;
  konto: string | null;
  // Outlook-Termine dürfen ins Gespräch mit dem KI-Modell und über Telegram.
  extern: boolean;
  // Eine Anmeldung läuft: Diesen Code gibst du auf der Seite von Microsoft ein.
  anmeldung: { code: string; adresse: string; bis: string } | null;
  fehler: string | null;
};

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOMAIN = /^(?=.{4,100}$)[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

// Die Verzeichnis-ID eurer Firma (oder ihr Name wie firma.onmicrosoft.com). Die Sammeladressen von Microsoft
// („common“, „organizations“, „consumers“) gelten nicht: JARVIS meldet sich nur an genau einem Verzeichnis an.
export const istTenant = (s: unknown): s is string => typeof s === "string" && (GUID.test(s) || DOMAIN.test(s));
export const istClientId = (s: unknown): s is string => typeof s === "string" && GUID.test(s);

// Der Code, den Microsoft für die Anmeldung nennt: nur Buchstaben, Ziffern und Bindestrich.
export const istAnmeldeCode = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9-]{4,20}$/.test(s);

// Die Seite, auf der du den Code eingibst, muss bei Microsoft liegen. loginUrl ist der Server, an dem sich
// JARVIS anmeldet (im Betrieb https://login.microsoftonline.com; in Tests der Nachbau). Verglichen wird samt
// Protokoll: Im Betrieb gilt damit nur https.
export function istAnmeldeAdresse(s: unknown, loginUrl: string): s is string {
  if (typeof s !== "string" || s.length > 300) return false;
  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return false;
  }
  if (url.username || url.password) return false;
  let login: string | null = null;
  try {
    login = new URL(loginUrl).origin;
  } catch {}
  if (login !== null && url.origin === login) return true;
  return url.protocol === "https:" && /(^|\.)(microsoft\.com|microsoftonline\.com)$/i.test(url.hostname);
}

// Eine Folgeseite darf nur von demselben Graph-Server kommen: Sonst ginge der Zugangsschlüssel an eine
// Adresse, die in einer Antwort stand.
export const istFolgeseite = (s: unknown, graph: string): s is string => typeof s === "string" && s.startsWith(`${graph}/`);

const einzeilig = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "");

// Graph nennt Zeiten ohne Zeitzone im Text und die Zone daneben. JARVIS bittet um nichts anderes als UTC und
// rechnet nur damit: Eine andere Zone wird nicht geraten.
function zeit(z: unknown): number | null {
  const d = z as { dateTime?: unknown; timeZone?: unknown } | null;
  if (!d || typeof d.dateTime !== "string" || d.timeZone !== "UTC") return null;
  const m = d.dateTime.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?$/);
  if (!m) return null;
  const ms = Date.parse(`${m[1]}Z`);
  return Number.isNaN(ms) ? null : ms;
}

const tag = (z: unknown): string | null => {
  const d = z as { dateTime?: unknown } | null;
  const m = typeof d?.dateTime === "string" ? d.dateTime.match(/^(\d{4}-\d{2}-\d{2})T/) : null;
  return m ? m[1] : null;
};

const PRIVAT = new Set(["private", "confidential", "personal"]);

// Ein Termin aus Graph als Termin von JARVIS. null: abgesagt, unvollständig oder nicht lesbar.
export function ausGraphTermin(roh: unknown): CalendarEvent | null {
  const t = roh as { id?: unknown; subject?: unknown; start?: unknown; end?: unknown; isAllDay?: unknown; isCancelled?: unknown; location?: { displayName?: unknown } | null; sensitivity?: unknown } | null;
  if (!t || typeof t !== "object" || typeof t.id !== "string" || !t.id || t.isCancelled === true) return null;
  const privat = typeof t.sensitivity === "string" && PRIVAT.has(t.sensitivity.toLowerCase());
  const basis = {
    id: `outlook:${t.id.slice(0, 300)}`,
    title: privat ? "Privater Termin" : einzeilig(t.subject, 200) || "(ohne Titel)",
    location: privat ? "" : einzeilig(t.location?.displayName, 200),
    calendar: OUTLOOK_KALENDER,
    quelle: "outlook" as const,
  };
  if (t.isAllDay === true) {
    // Ganztägig: von Mitternacht bis Mitternacht. Es zählt der Kalendertag, nicht die Zeitzone.
    const [von, bis] = [tag(t.start), tag(t.end)];
    if (!von || !bis || bis < von) return null;
    return { ...basis, start: fromIso(von).getTime(), end: fromIso(bis).getTime(), allDay: true };
  }
  const [start, end] = [zeit(t.start), zeit(t.end)];
  if (start === null || end === null || end < start) return null;
  return { ...basis, start, end, allDay: false };
}

// Feste Sätze für alles, was bei Microsoft schiefgehen kann. Der Text einer Antwort von Microsoft steht nie
// in einer Meldung oder Datei.
export const MICROSOFT_SATZ = {
  nichtErreichbar: "Microsoft war nicht erreichbar. Ist das Internet da?",
  abgelaufen: "Die Anmeldung bei Microsoft ist abgelaufen oder wurde zurückgezogen. Melde dich in den Einstellungen neu an.",
  keinRecht: "Microsoft erlaubt JARVIS diesen Zugriff nicht. Eure IT muss der Anwendung das Recht „Calendars.ReadBasic“ geben.",
  pause: "Microsoft bittet um eine Pause. JARVIS versucht es später noch einmal.",
  unerwartet: "Microsoft hat unerwartet geantwortet. Die Outlook-Termine fehlen deshalb gerade.",
  zuViele: "Outlook hat mehr Termine, als JARVIS auf einmal liest. Hier fehlen deshalb welche; in Outlook stehen alle.",
  abgelehnt: "Die Anmeldung wurde bei Microsoft abgelehnt.",
  zuSpaet: "Der Code ist abgelaufen. Starte die Anmeldung noch einmal.",
  anwendung: "Microsoft kennt diese Anwendung oder dieses Verzeichnis nicht, oder die Anmeldung mit Code ist für sie nicht erlaubt. Prüfe die beiden Nummern mit eurer IT.",
  adresse: "Microsoft hat eine unerwartete Anmeldeadresse genannt. JARVIS zeigt sie deshalb nicht an.",
} as const;
