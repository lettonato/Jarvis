// Der Edelmetall-Agent: ein Lagebild für Gold und Silber aus Tageskursen. Hier wird nur gerechnet, ohne KI-Modell
// und ohne Netz: Zahlen mit Datum und Quelle (Fakten) und davon getrennt eine Einordnung nach festen Regeln.
// Eine Prognose gibt der Agent nicht ab. Die Kurse holt src/lib/server/metalle.ts über den Twelve-Data-Schlüssel,
// den auch der Spielgeld-Desk nutzt. Liefert der Plan dort ein Metall nicht je Feinunze (im kostenlosen Plan
// fehlt Silber), steht stellvertretend ein Fonds da, der dem Metall folgt, und er ist als Fonds beschriftet.

import { daysBetween } from "./dates";
import { formatUsd } from "./format";

export type MetallId = "gold" | "silber";

// Dieselben Kursquellen wie beim Spielgeld-Desk (src/lib/commodities.ts): erst das Metall, sonst der US-Fonds.
export const METALLE: { id: MetallId; name: string; symbol: string; einheit: string; ersatz: { symbol: string; name: string; einheit: string } }[] = [
  { id: "gold", name: "Gold", symbol: "XAU/USD", einheit: "Feinunze", ersatz: { symbol: "GLD", name: "Gold-Fonds GLD", einheit: "Anteil" } },
  { id: "silber", name: "Silber", symbol: "XAG/USD", einheit: "Feinunze", ersatz: { symbol: "SLV", name: "Silber-Fonds SLV", einheit: "Anteil" } },
];

export const QUELLE = "Twelve Data, Tageskurse in US-Dollar";
export const HINWEIS = "Die Einordnung folgt festen Regeln aus den Kursen. Sie ist keine Prognose und keine Anlageberatung.";

// Wie viele Handelstage der Agent abfragt und womit er rechnet.
export const TAGE_ABFRAGEN = 90;
const WOCHE = 5;
const MONAT = 21;
const SPANNE_TAGE = 14;
const SCHNITT_KURZ = 20;
const SCHNITT_LANG = 50;
// Ist der jüngste Kurs älter, gilt der Bericht als veraltet. Vier Tage decken ein langes Wochenende ab.
const VERALTET_TAGE = 4;

export type TagesKerze = { tag: string; open: number; high: number; low: number; close: number };

export type MetallTrend = "aufwaerts" | "abwaerts" | "seitwaerts";

export type MetallLage = {
  id: MetallId;
  name: string;
  // "spot": der Kurs des Metalls je Feinunze. "fonds": der Kurs eines Fonds, der dem Metall folgt, je Anteil.
  art: "spot" | "fonds";
  // Wie die Zeile heißt („Gold“, „Silber-Fonds SLV“) und worauf sich der Kurs bezieht („Feinunze“, „Anteil“).
  bezeichnung: string;
  einheit: string;
  symbol: string;
  kurs: number;
  // Der Tag der jüngsten Kerze (JJJJ-MM-TT). Läuft der Handelstag noch, ist es der Kurs von eben.
  kursVom: string;
  // Veränderung in Prozent zum Schluss des Vortags, vor 5 und vor 21 Handelstagen. null: zu wenige Kurse.
  aenderung: { tag: number | null; woche: number | null; monat: number | null };
  // Höchster und tiefster Kurs der letzten 21 Handelstage und der Abstand des Kurses zum Hoch in Prozent.
  hoch: number;
  tief: number;
  abstandHochPct: number;
  // Mittlere Tagesspanne (Hoch minus Tief) der letzten 14 Handelstage im Verhältnis zum Kurs, in Prozent.
  schwankungPct: number;
  // null: weniger als 50 Handelstage, dafür reicht es nicht.
  trend: MetallTrend | null;
};

export type MetallBericht = {
  erstelltAm: string;
  quelle: string;
  metalle: MetallLage[];
  // Wie viele Unzen Silber eine Unze Gold kostet. null: Eines der beiden fehlt oder ist nur als Fonds da.
  verhaeltnis: number | null;
  // Namen der Metalle, für die keine brauchbaren Kurse kamen.
  fehlend: string[];
};

const brauchbar = (k: TagesKerze) => [k.open, k.high, k.low, k.close].every((n) => typeof n === "number" && Number.isFinite(n) && n > 0) && /^\d{4}-\d{2}-\d{2}$/.test(k.tag);
const schnitt = (zahlen: number[]) => zahlen.reduce((a, b) => a + b, 0) / zahlen.length;
const prozentZu = (kurs: number, frueher: number | undefined) => (frueher ? (kurs / frueher - 1) * 100 : null);

// Die Lage eines Metalls. kerzen: Tageskerzen, die älteste zuerst. null: weniger als zwei brauchbare Kerzen.
// fonds: Die Kerzen stammen vom Ersatz-Fonds, nicht vom Metall selbst.
export function metallLage(m: (typeof METALLE)[number], kerzen: TagesKerze[], fonds = false): MetallLage | null {
  const k = kerzen.filter(brauchbar);
  const letzte = k.at(-1);
  if (!letzte || k.length < 2) return null;
  const kurs = letzte.close;
  const schluss = k.map((x) => x.close);
  const monat = k.slice(-MONAT);
  const hoch = Math.max(...monat.map((x) => x.high));
  const tief = Math.min(...monat.map((x) => x.low));
  let trend: MetallTrend | null = null;
  if (schluss.length >= SCHNITT_LANG) {
    const kurz = schnitt(schluss.slice(-SCHNITT_KURZ));
    const lang = schnitt(schluss.slice(-SCHNITT_LANG));
    trend = kurs > kurz && kurz > lang ? "aufwaerts" : kurs < kurz && kurz < lang ? "abwaerts" : "seitwaerts";
  }
  return {
    id: m.id,
    name: m.name,
    art: fonds ? "fonds" : "spot",
    bezeichnung: fonds ? m.ersatz.name : m.name,
    einheit: fonds ? m.ersatz.einheit : m.einheit,
    symbol: fonds ? m.ersatz.symbol : m.symbol,
    kurs,
    kursVom: letzte.tag,
    aenderung: { tag: prozentZu(kurs, schluss.at(-2)), woche: prozentZu(kurs, schluss.at(-1 - WOCHE)), monat: prozentZu(kurs, schluss.at(-1 - MONAT)) },
    hoch,
    tief,
    abstandHochPct: (kurs / hoch - 1) * 100,
    schwankungPct: schnitt(k.slice(-SPANNE_TAGE).map((x) => ((x.high - x.low) / x.close) * 100)),
    trend,
  };
}

// reihen: die Kurse der Metalle je Feinunze. ersatz: die Kurse der Fonds für die Metalle, bei denen das nicht
// ging. Der Kurs je Feinunze geht vor.
export function baueBericht(reihen: Partial<Record<MetallId, TagesKerze[]>>, now: Date, ersatz: Partial<Record<MetallId, TagesKerze[]>> = {}): MetallBericht {
  const metalle: MetallLage[] = [];
  const fehlend: string[] = [];
  for (const m of METALLE) {
    const lage = metallLage(m, reihen[m.id] ?? []) ?? metallLage(m, ersatz[m.id] ?? [], true);
    if (lage) metalle.push(lage);
    else fehlend.push(m.name);
  }
  // Ein Fonds-Anteil ist keine Feinunze: Das Verhältnis gibt es nur aus zwei Kursen je Feinunze.
  const gold = metalle.find((m) => m.id === "gold" && m.art === "spot");
  const silber = metalle.find((m) => m.id === "silber" && m.art === "spot");
  return { erstelltAm: now.toISOString(), quelle: QUELLE, metalle, verhaeltnis: gold && silber ? gold.kurs / silber.kurs : null, fehlend };
}

// Warum bei einem Metall ein Fonds steht.
export const fondsSatz = (m: MetallLage) => `${m.name}: Den Kurs je Feinunze liefert dein Plan bei Twelve Data nicht. Stattdessen steht hier der ${m.bezeichnung}, der dem ${m.name}preis folgt; sein Kurs gilt je ${m.einheit}.`;

export const prozent = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
export const datum = (tag: string) => tag.split("-").reverse().join(".");

// Die Fakten: je Metall ein Satz aus Zahlen mit dem Datum des Kurses, dazu das Verhältnis von Gold zu Silber.
export function fakten(b: MetallBericht): string[] {
  const saetze = b.metalle.map((m) => {
    const teile = [`${m.bezeichnung}: ${formatUsd(m.kurs)} je ${m.einheit} (Kurs vom ${datum(m.kursVom)})`];
    if (m.aenderung.tag !== null) teile.push(`${prozent(m.aenderung.tag)} zum Vortag`);
    if (m.aenderung.woche !== null) teile.push(`${prozent(m.aenderung.woche)} in 5 Handelstagen`);
    if (m.aenderung.monat !== null) teile.push(`${prozent(m.aenderung.monat)} in 21 Handelstagen`);
    return `${teile.join(", ")}. Hoch und Tief der letzten 21 Handelstage: ${formatUsd(m.hoch)} und ${formatUsd(m.tief)}.`;
  });
  if (b.verhaeltnis !== null) saetze.push(`Eine Unze Gold kostet so viel wie ${Math.round(b.verhaeltnis).toLocaleString("de-DE")} Unzen Silber.`);
  for (const m of b.metalle) if (m.art === "fonds") saetze.push(fondsSatz(m));
  for (const name of b.fehlend) saetze.push(`${name}: gerade ohne Kurs.`);
  return saetze;
}

const TREND_SATZ: Record<MetallTrend, string> = {
  aufwaerts: "Aufwärtstrend nach fester Regel: Der Kurs liegt über dem Schnitt der letzten 20 Handelstage, und der liegt über dem der letzten 50.",
  abwaerts: "Abwärtstrend nach fester Regel: Der Kurs liegt unter dem Schnitt der letzten 20 Handelstage, und der liegt unter dem der letzten 50.",
  seitwaerts: "kein klarer Trend. Der Kurs und der Schnitt der letzten 20 und 50 Handelstage zeigen nicht in dieselbe Richtung.",
};

// Die Einordnung, getrennt von den Fakten: je Metall der Trend mit der Regel, nach der er bestimmt ist.
export function einordnung(b: MetallBericht): string[] {
  return b.metalle.map((m) => `${m.bezeichnung}: ${m.trend ? TREND_SATZ[m.trend] : "Für einen Trend reichen die Kurse noch nicht (weniger als 50 Handelstage)."}`);
}

// Das Lagebild in einem Satz, für die Agentensteuerung.
export function metallSatz(b: MetallBericht): string {
  if (b.metalle.length === 0) return "Keine Kurse bekommen.";
  return `${b.metalle.map((m) => `${m.bezeichnung} ${formatUsd(m.kurs)}${m.aenderung.tag === null ? "" : ` (${prozent(m.aenderung.tag)} zum Vortag)`}`).join(", ")}.`;
}

// Ein Bericht ohne Kurse oder mit einem jüngsten Kurs, der mehr als vier Tage alt ist.
export function veraltet(b: MetallBericht, now: Date): boolean {
  const juengster = b.metalle.map((m) => m.kursVom).sort().at(-1);
  return !juengster || daysBetween(juengster, now.toISOString().slice(0, 10)) > VERALTET_TAGE;
}

// Was die Oberfläche bekommt.
export type MetalleSnapshot = {
  // Ohne Twelve-Data-Schlüssel kann der Agent nichts lesen.
  eingerichtet: boolean;
  auto: boolean;
  zeiten: string[];
  laeuft: boolean;
  bericht: MetallBericht | null;
  fakten: string[];
  einordnung: string[];
  hinweis: string;
  veraltet: boolean;
  letzterVersuch: string | null;
  fehler: string | null;
  naechsterLauf: string | null;
};

// Zweimal am Tag reicht für Tageskurse: morgens vor der Arbeit und am späten Nachmittag.
export const METALLE_ZEITEN = ["07:30", "17:30"];
