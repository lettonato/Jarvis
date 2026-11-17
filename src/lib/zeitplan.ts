// Der gemeinsame Zeitplan: was JARVIS von selbst tut und wann. Hier stehen nur die Regeln (ohne Uhr, ohne Netz)
// und das, was die Oberfläche zu sehen bekommt. Den Taktgeber hat src/lib/server/zeitplan.ts.

import type { AgentName } from "./sicherheit";

// So lange nach einer Uhrzeit wird ein verpasster Lauf noch nachgeholt (der Mac hat geschlafen, JARVIS war aus).
export const NACHHOL_FENSTER_MS = 2 * 60 * 60_000;
export const MAX_ZEITEN = 4;

const ZEIT = /^([01]\d|2[0-3]):[0-5]\d$/;

// Liest Uhrzeiten aus den Einstellungen: nur „HH:MM“, sortiert, ohne Doppelte, höchstens vier.
export function saeubereZeiten(roh: unknown): string[] {
  if (!Array.isArray(roh)) return [];
  const zeiten = roh.filter((z): z is string => typeof z === "string").map((z) => z.trim()).filter((z) => ZEIT.test(z));
  return [...new Set(zeiten)].sort().slice(0, MAX_ZEITEN);
}

const amTag = (tag: Date, zeit: string) => {
  const [h, m] = zeit.split(":").map(Number);
  const d = new Date(tag);
  d.setHours(h, m, 0, 0);
  return d;
};

// Die nächste Uhrzeit nach jetzt: heute, wenn noch eine kommt, sonst die erste von morgen.
export function naechsterTermin(zeiten: string[], now: Date): Date | null {
  if (zeiten.length === 0) return null;
  const sortiert = [...zeiten].sort();
  const heute = sortiert.map((z) => amTag(now, z)).find((d) => d.getTime() > now.getTime());
  if (heute) return heute;
  const morgen = new Date(now);
  morgen.setDate(morgen.getDate() + 1);
  return amTag(morgen, sortiert[0]);
}

// Der Termin, der jetzt dran ist, oder null. Dran ist die letzte Uhrzeit, die schon erreicht ist (auch eine von
// gestern Abend, wenn es gerade nach Mitternacht ist), wenn sie höchstens fensterMs zurückliegt und seitdem
// noch nichts gelaufen ist. Was länger her ist, wird nicht nachgeholt.
export function faelligerTermin(zeiten: string[], now: Date, letzterLauf: Date | null, fensterMs: number): Date | null {
  const gestern = new Date(now);
  gestern.setDate(gestern.getDate() - 1);
  const erreicht = [now, gestern]
    .flatMap((tag) => zeiten.map((z) => amTag(tag, z)))
    .filter((d) => d.getTime() <= now.getTime())
    .sort((a, b) => b.getTime() - a.getTime())[0];
  if (!erreicht || now.getTime() - erreicht.getTime() >= fensterMs) return null;
  if (letzterLauf && letzterLauf.getTime() >= erreicht.getTime()) return null;
  return erreicht;
}

export function taktText(zeiten: string[]): string {
  if (zeiten.length === 0) return "kein Zeitplan";
  const liste = zeiten.length === 1 ? zeiten[0] : `${zeiten.slice(0, -1).join(", ")} und ${zeiten.at(-1)}`;
  return `täglich um ${liste} Uhr`;
}

// Eine Zeile im Zeitplan, wie die Oberfläche sie zeigt.
export type ZeitplanEintrag = {
  id: string;
  // Der Agent, der läuft; null bei Meldungen, die kein Agent sind (Briefing, Tagesabschluss).
  agent: AgentName | null;
  name: string;
  takt: string;
  letzterLauf: string | null;
  // Wie der letzte Lauf nach Zeitplan ausging. null: noch keiner, oder der Zeitplan führt ihn nicht selbst aus.
  ergebnis: "ok" | "fehler" | null;
  fehler: string | null;
  naechsterLauf: string | null;
  // Warum gerade nichts ansteht (aus, gesperrt, nicht eingerichtet). null: Er läuft nach Plan.
  hinweis: string | null;
  // Führt der Zeitplan die Aufgabe selbst aus? Wenn nicht, zeigt er sie nur, und den letzten Lauf kennt er nicht immer.
  selbst: boolean;
  // Der Lauf nach Plan ist gerade unterwegs.
  laeuft: boolean;
};

export type ZeitplanSnapshot = { eintraege: ZeitplanEintrag[]; notaus: boolean; stand: string };
