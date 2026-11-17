import { HINWEIS_TAKT, HINWEIS_TAKT_MAC } from "../hinweise";
import { AUTO_HOURS } from "../intel";
import { REMINDER_MINUTES } from "../telegram";
import { naechsteWoche, wochenTakt } from "../woche";
import { naechsterTermin, taktText, type ZeitplanSnapshot } from "../zeitplan";
import { readConfig, twelveKey } from "./config";
import { hinweiseFaellig, macHinweiseAn, macHinweiseFaellig, merkeAmMac, merkeGemeldet, sendeHinweise, zeigeHinweise } from "./hinweise";
import { IntelError, intelFaellig, intelSnapshot, refreshIntel } from "./intel";
import { MitteilungError, mitteilungMoeglich } from "./mitteilung";
import { MetalleError, metalleAuto, metalleFaellig, metalleNaechster, metalleZeiten, refreshMetalle } from "./metalle";
import { erinnerungenFaellig, naechsteErinnerung, prefsOf, sendeErinnerungen, sendeTagesmeldung, sendeWochenbericht, tagesmeldungFaellig, TelegramError, TelegramNichtErreichbar, wochenberichtFaellig, type Tagesmeldung } from "./telegram";
import { starteTakt, zeitplanMinute, zeitplanUebersicht, type Aufgabe } from "./zeitplan";

// Was JARVIS von selbst tut, an einer Stelle: Intel, der Edelmetall-Agent, alles, was per Telegram von selbst
// kommt (Morgenbriefing, Erinnerungen vor Terminen, Hinweise am Tag, Tagesabschluss), und die Hinweise am Tag als
// Mitteilung am Mac laufen über den gemeinsamen Taktgeber (zeitplan.ts). Wann eine Aufgabe dran ist, entscheidet sie selbst (Budget, Tageszeit, eigene
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
    // Für die Mitteilung am Mac gilt es erst als gesagt, wenn die Meldung wirklich hinausging: Wirft das Senden,
    // hat sie niemand gelesen, und der Mac zeigt den Hinweis selbst.
    lauf: async (now) => {
      let gesagt: Awaited<ReturnType<typeof merkeGemeldet>> = [];
      await sendeTagesmeldung(id, now, async () => {
        gesagt = await merkeGemeldet(now).catch(() => []);
      });
      await merkeAmMac(gesagt, now);
    },
    fehlerSatz: telegramSatz(was, wen),
  };
}

// Der Wochenbericht: einmal in der Woche am eingestellten Tag. Anders als Briefing und Tagesabschluss gilt danach
// nichts als „schon gemeldet“: Er fasst zusammen, die Hinweise am Tag bleiben, wie sie sind.
const wochenbericht: Aufgabe = {
  id: "woche",
  agent: null,
  name: "Wochenbericht",
  takt: async () => {
    const plan = (await telegram()).prefs.woche;
    return plan ? `${wochenTakt(plan)}, per Telegram` : "ausgeschaltet";
  },
  naechster: async (now) => naechsteWoche((await telegram()).prefs.woche, now),
  hinweis: async () => {
    const { verbunden, prefs } = await telegram();
    return !verbunden ? "Telegram ist nicht verbunden." : prefs.woche ? null : "Ausgeschaltet.";
  },
  faellig: (now, letzterLauf) => wochenberichtFaellig(now, letzterLauf),
  lauf: (now) => sendeWochenbericht(now),
  fehlerSatz: telegramSatz("Der Wochenbericht", "den Wochenbericht"),
};

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

// Steht gerade das Morgenbriefing oder der Tagesabschluss an, wartet der Hinweis: Erst danach steht fest, was neu ist.
const meldungStehtAn = async (now: Date, fensterMs?: number) => (await tagesmeldungFaellig("briefing", now, null, fensterMs)) || (await tagesmeldungFaellig("abschluss", now, null, fensterMs));
// Die Mitteilung am Mac wartet darauf nur kurz. Kommt die Meldung nicht durch, weil Telegram fehlt, bliebe der
// Hinweis am Mac sonst bis zu drei Stunden aus, obwohl er Telegram gar nicht braucht.
const MAC_WARTET_MS = 10 * 60_000;

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
  faellig: async (now, letzterLauf) => !(await meldungStehtAn(now)) && hinweiseFaellig(now, letzterLauf),
  lauf: (now) => sendeHinweise(now),
  fehlerSatz: telegramSatz("Der Hinweis", "den Hinweis"),
};

// Dieselben Hinweise als Mitteilung am Mac selbst, ohne Handy. Eigener Schalter, eigener Stand, dieselbe Obergrenze.
const hinweiseMac: Aufgabe = {
  id: "hinweise-mac",
  agent: null,
  name: "Hinweise am Tag als Mitteilung am Mac",
  takt: async () => ((await macHinweiseAn()) && mitteilungMoeglich() ? HINWEIS_TAKT_MAC : "ausgeschaltet"),
  naechster: async () => null,
  hinweis: async () => (!(await macHinweiseAn()) ? "Ausgeschaltet." : mitteilungMoeglich() ? null : "Mitteilungen gibt es nur auf dem Mac."),
  faellig: async (now, letzterLauf) => !(await meldungStehtAn(now, MAC_WARTET_MS)) && macHinweiseFaellig(now, letzterLauf),
  lauf: (now) => zeigeHinweise(now),
  // Nur feste Sätze: Was osascript als Fehler schreibt, steht weder in der Datei noch in der Anzeige.
  fehlerSatz: (e) => {
    if (!(e instanceof MitteilungError)) return "Der Hinweis konnte nicht zusammengestellt werden.";
    if (e.art === "unklar") return `${e.message} JARVIS versucht es frühestens in einer Stunde noch einmal, höchstens dreimal am Tag.`;
    return e.art === "abgelehnt" ? `${e.message} JARVIS versucht es in einer Viertelstunde noch einmal.` : e.message;
  },
};

export const aufgaben = (): Aufgabe[] => [intel, metalle, meldung("briefing", "Morgenbriefing", "Das Morgenbriefing", "das Morgenbriefing"), erinnerungen, hinweise, hinweiseMac, meldung("abschluss", "Tagesabschluss", "Der Tagesabschluss", "den Tagesabschluss"), wochenbericht];

// Startet den gemeinsamen Taktgeber. Mehrfach aufrufen schadet nicht.
export const starteZeitplan = () => starteTakt(aufgaben);
export const zeitplanSnapshot = (now = new Date()): Promise<ZeitplanSnapshot> => zeitplanUebersicht(aufgaben(), now);
// Ein Blick auf die Uhr außer der Reihe, etwa wenn jemand die Seite öffnet.
export const zeitplanJetzt = (now = new Date()) => zeitplanMinute(aufgaben(), now);
