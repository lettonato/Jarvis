import { AUTO_HOURS } from "../intel";
import { naechsterTermin, taktText, type ZeitplanSnapshot } from "../zeitplan";
import { readConfig, twelveKey } from "./config";
import { IntelError, intelFaellig, intelSnapshot, refreshIntel } from "./intel";
import { MetalleError, metalleAuto, metalleFaellig, metalleNaechster, metalleZeiten, refreshMetalle } from "./metalle";
import { prefsOf } from "./telegram";
import { starteTakt, zeitplanMinute, zeitplanUebersicht, type Aufgabe } from "./zeitplan";

// Was JARVIS von selbst tut, an einer Stelle: Intel und der Edelmetall-Agent laufen über den gemeinsamen
// Taktgeber (zeitplan.ts). Morgenbriefing und Tagesabschluss schickt weiter Telegram selbst; sie stehen hier,
// damit der Zeitplan alles zeigt, was zu festen Zeiten kommt. Wann eine Aufgabe dran ist, entscheidet sie
// selbst (Budget, Tageszeit, eigene Uhrzeiten); Not-Aus, Sperre und Überlappung regelt der Taktgeber.

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

// Eine tägliche Meldung per Telegram. Der Zeitplan zeigt sie nur; verschickt wird sie in telegram.ts.
function meldung(id: string, name: string, welche: "briefing" | "abschluss"): Aufgabe {
  const zeit = async () => {
    const tg = (await readConfig()).telegram;
    return { verbunden: Boolean(tg?.chatId), uhrzeit: prefsOf(tg)[welche] };
  };
  return {
    id,
    agent: null,
    name,
    takt: async () => {
      const { uhrzeit } = await zeit();
      return uhrzeit ? `${taktText([uhrzeit])}, per Telegram` : "ausgeschaltet";
    },
    naechster: async (now) => {
      const { uhrzeit } = await zeit();
      return uhrzeit ? naechsterTermin([uhrzeit], now) : null;
    },
    hinweis: async () => {
      const { verbunden, uhrzeit } = await zeit();
      return !verbunden ? "Telegram ist nicht verbunden." : uhrzeit ? null : "Ausgeschaltet.";
    },
  };
}

export const aufgaben = (): Aufgabe[] => [intel, metalle, meldung("briefing", "Morgenbriefing", "briefing"), meldung("abschluss", "Tagesabschluss", "abschluss")];

// Startet den gemeinsamen Taktgeber. Mehrfach aufrufen schadet nicht.
export const starteZeitplan = () => starteTakt(aufgaben);
export const zeitplanSnapshot = (now = new Date()): Promise<ZeitplanSnapshot> => zeitplanUebersicht(aufgaben(), now);
// Ein Blick auf die Uhr außer der Reihe, etwa wenn jemand die Seite öffnet.
export const zeitplanJetzt = (now = new Date()) => zeitplanMinute(aufgaben(), now);
