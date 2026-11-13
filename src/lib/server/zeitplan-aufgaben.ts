import { HINWEIS_TAKT } from "../hinweise";
import { AUTO_HOURS } from "../intel";
import { REMINDER_MINUTES } from "../telegram";
import { naechsterTermin, taktText, type ZeitplanSnapshot } from "../zeitplan";
import { readConfig, twelveKey } from "./config";
import { hinweiseFaellig, merkeGemeldet, sendeHinweise } from "./hinweise";
import { IntelError, intelFaellig, intelSnapshot, refreshIntel } from "./intel";
import { MetalleError, metalleAuto, metalleFaellig, metalleNaechster, metalleZeiten, refreshMetalle } from "./metalle";
import { erinnerungenFaellig, naechsteErinnerung, prefsOf, sendeErinnerungen, sendeTagesmeldung, tagesmeldungFaellig, TelegramError, TelegramNichtErreichbar, type Tagesmeldung } from "./telegram";
import { starteTakt, zeitplanMinute, zeitplanUebersicht, type Aufgabe } from "./zeitplan";

// Was JARVIS von selbst tut, an einer Stelle: Intel, der Edelmetall-Agent und alles, was per Telegram von selbst
// kommt (Morgenbriefing, Erinnerungen vor Terminen, Hinweise am Tag, Tagesabschluss), laufen über den gemeinsamen
// Taktgeber (zeitplan.ts). Wann eine Aufgabe dran ist, entscheidet sie selbst (Budget, Tageszeit, eigene
// Uhrzeiten); Not-Aus und Sperre für Agenten, Überlappung, Fristen und feste Fehlersätze regelt der Taktgeber.
// Nachrichten an dich sind kein Agent: Sie kommen auch, wenn der Not-Aus steht (der Tagesabschluss nennt ihn).

const intel: Aufgabe = {
  id: "intel",
  agent: "intel",
  name: "Intel: Lagebild aus Nachrichten und X",
  takt: async () => ((await readConfig()).intel?.auto === false ? "nur auf Zuruf" : `alle ${AUTO_HOURS} Stunden, tagsüber`),
  naechster: async (now) => {
    const s = await intelSnapshot(now);
    return s.nextAt ? new Date(s.nextAt) : null;
  },
  hinweis: async (now) => {
    const s = await intelSnapshot(now);
    if (!s.configured) return "Es fehlt der xAI-Schlüssel.";
    if (!s.auto) return "Liest nur auf Zuruf.";
    return s.nextAt ? null : "Das Tagesbudget ist aufgebraucht.";
  },
  faellig: (now) => intelFaellig(now),
  // Der Zeitplan wartet auf das Ergebnis, damit ein Fehlschlag bei ihm steht. Die Kosten begrenzt Intel selbst.
  lauf: async (now) => void (await refreshIntel(null, { now, wait: true })),
  // Was Intel selbst sagt (Budget, Schlüssel, Sperre), ist ein fester Satz. Was von xAI zurückkommt, nicht.
  fehlerSatz: (e) => (e instanceof IntelError ? e.message : "Intel konnte das Lagebild nicht lesen. Den Grund zeigt der Raum Intel."),
};

const metalle: Aufgabe = {
  id: "metalle",
  agent: "metalle",
  name: "Edelmetalle: Lagebild für Gold und Silber",
  takt: async () => {
    const config = await readConfig();
    return metalleAuto(config) ? taktText(metalleZeiten(config)) : "nur auf Zuruf";
  },
  naechster: (now) => metalleNaechster(now),
  hinweis: async () => {
    const config = await readConfig();
    if (!twelveKey(config)) return "Es fehlt der Twelve-Data-Schlüssel.";
    return metalleAuto(config) ? null : "Liest nur auf Zuruf.";
  },
  faellig: (now, letzterLauf) => metalleFaellig(now, letzterLauf),
  lauf: async (now) => void (await refreshMetalle({ now })),
  // Der Edelmetall-Agent meldet Fehler nur als feste Sätze (metalle.ts).
  fehlerSatz: (e) => (e instanceof MetalleError ? e.message : "Die Kurse konnten nicht gelesen werden."),
};

// Was per Telegram hinausgeht, meldet Fehlschläge nur mit festen Sätzen: Der Text eines Fehlers kann von
// Telegram stammen und gehört weder in die Datei noch in die Anzeige. was/wen: „Der Hinweis“, „den Hinweis“.
const telegramSatz = (was: string, wen: string) => (e: unknown) => {
  if (e instanceof TelegramNichtErreichbar) return `Telegram war nicht erreichbar. ${was} kommt, sobald es wieder geht.`;
  if (!(e instanceof TelegramError)) return `${was} konnte nicht zusammengestellt werden.`;
  if (e.code === 401 || e.code === 404) return "Telegram kennt den Schlüssel des Bots nicht. Sieh unter Einstellungen beim Handy nach.";
  if (e.code === 403) return "Du hast den Bot in Telegram blockiert. Öffne den Chat mit ihm und tippe auf „Neu starten“.";
  // Ohne Antwort von Telegram: Die Verbindung riss beim Senden ab, und ob etwas ankam, weiß niemand.
  if (e.code === undefined) return `Die Verbindung zu Telegram ist beim Senden abgerissen. Damit nichts doppelt kommt, schickt JARVIS ${wen} nicht noch einmal.`;
  return `Telegram hat ${wen} nicht angenommen.`;
};

const telegram = async () => {
  const tg = (await readConfig()).telegram;
  return { verbunden: Boolean(tg?.chatId), prefs: prefsOf(tg) };
};

// Morgenbriefing und Tagesabschluss: einmal am Tag zur eingestellten Uhrzeit. Was dort als überfällig steht,
// gilt danach als gemeldet und kommt nicht noch einmal als Hinweis am Tag.
function meldung(id: Tagesmeldung, name: string, was: string, wen: string): Aufgabe {
  return {
    id,
    agent: null,
    name,
    takt: async () => {
      const uhrzeit = (await telegram()).prefs[id];
      return uhrzeit ? `${taktText([uhrzeit])}, per Telegram` : "ausgeschaltet";
    },
    naechster: async (now) => {
      const uhrzeit = (await telegram()).prefs[id];
      return uhrzeit ? naechsterTermin([uhrzeit], now) : null;
    },
    hinweis: async () => {
      const { verbunden, prefs } = await telegram();
      return !verbunden ? "Telegram ist nicht verbunden." : prefs[id] ? null : "Ausgeschaltet.";
    },
    faellig: (now, letzterLauf) => tagesmeldungFaellig(id, now, letzterLauf),
    // Was die Meldung an Überfälligem nennt, gilt als gemeldet, noch bevor sie selbst als erledigt gilt: So
    // schickt der Zeitplan nie in derselben Minute einen Hinweis auf dasselbe hinterher.
    lauf: (now) => sendeTagesmeldung(id, now, () => merkeGemeldet(now).catch(() => {})),
    fehlerSatz: telegramSatz(was, wen),
  };
}

const erinnerungen: Aufgabe = {
  id: "erinnerungen",
  agent: null,
  name: "Erinnerung vor Terminen",
  takt: async () => ((await telegram()).prefs.reminders ? `${REMINDER_MINUTES} Minuten vor jedem Termin, per Telegram` : "ausgeschaltet"),
  naechster: (now) => naechsteErinnerung(now),
  hinweis: async () => {
    const { verbunden, prefs } = await telegram();
    return !verbunden ? "Telegram ist nicht verbunden." : prefs.reminders ? null : "Ausgeschaltet.";
  },
  faellig: (now) => erinnerungenFaellig(now),
  lauf: (now) => sendeErinnerungen(now),
  fehlerSatz: telegramSatz("Die Erinnerung", "die Erinnerung"),
};

// Hinweise am Tag (src/lib/hinweise.ts): Die Obergrenze steht dort; hier wird nur gefragt und gesendet.
const hinweise: Aufgabe = {
  id: "hinweise",
  agent: null,
  name: "Hinweise am Tag: überfällig, Rückmeldung fehlt, heute noch offen",
  takt: async () => ((await telegram()).prefs.hinweise ? HINWEIS_TAKT : "ausgeschaltet"),
  // Ein Hinweis kommt, wenn es etwas Neues gibt; eine Uhrzeit dafür gibt es nicht.
  naechster: async () => null,
  hinweis: async () => {
    const { verbunden, prefs } = await telegram();
    return !verbunden ? "Telegram ist nicht verbunden." : prefs.hinweise ? null : "Ausgeschaltet.";
  },
  // Steht gerade das Morgenbriefing oder der Tagesabschluss an, wartet der Hinweis: Erst danach steht fest, was neu ist.
  faellig: async (now, letzterLauf) => !(await tagesmeldungFaellig("briefing", now, null)) && !(await tagesmeldungFaellig("abschluss", now, null)) && hinweiseFaellig(now, letzterLauf),
  lauf: (now) => sendeHinweise(now),
  fehlerSatz: telegramSatz("Der Hinweis", "den Hinweis"),
};

export const aufgaben = (): Aufgabe[] => [intel, metalle, meldung("briefing", "Morgenbriefing", "Das Morgenbriefing", "das Morgenbriefing"), erinnerungen, hinweise, meldung("abschluss", "Tagesabschluss", "Der Tagesabschluss", "den Tagesabschluss")];

// Startet den gemeinsamen Taktgeber. Mehrfach aufrufen schadet nicht.
export const starteZeitplan = () => starteTakt(aufgaben);
export const zeitplanSnapshot = (now = new Date()): Promise<ZeitplanSnapshot> => zeitplanUebersicht(aufgaben(), now);
// Ein Blick auf die Uhr außer der Reihe, etwa wenn jemand die Seite öffnet.
export const zeitplanJetzt = (now = new Date()) => zeitplanMinute(aufgaben(), now);
