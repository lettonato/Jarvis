// Intel, der Nachrichten-Agent: Grok von xAI liest Nachrichten im Web und Beiträge auf X zu Bitcoin,
// Ethereum, Solana und deinen eigenen Themen und macht daraus ein kurzes Lagebild. Hier steht, was die
// Seite davon sieht und wie JARVIS es sagt; die Arbeit macht src/lib/server/intel.ts.
//
// Intel darf den Trading-Desk nur bremsen, nie kaufen lassen: Meldet er ein ernstes Ereignis, kauft der
// Desk ein paar Stunden lang nichts Neues. Stop-Loss und Verkäufe laufen davon unberührt weiter.

export type IntelMood = "positiv" | "gemischt" | "negativ" | "ruhig";

export type IntelItem = {
  title: string;
  summary: string;
  topic: string;
  // Woher die Meldung stammt, etwa „Reuters“ oder „X“, und die Adresse, wenn Grok eine gelesen hat.
  source: string;
  url: string | null;
  // 0 bis 1: wie sehr die Meldung für dich zählt.
  importance: number;
  effect: "positiv" | "negativ" | "neutral";
  fromX: boolean;
};

export type IntelReport = {
  at: string;
  mood: IntelMood;
  summary: string;
  items: IntelItem[];
  // Ein ernstes, marktweites Ereignis: Dann kauft der Desk eine Weile nichts Neues.
  deskWarning: string | null;
  topics: string[];
  // Bei einer gezielten Suche das Thema, sonst null.
  focus: string | null;
  costUsd: number;
};

export type IntelSnapshot = {
  configured: boolean;
  report: IntelReport | null;
  // Die letzte gezielte Suche, etwa „Nachrichten zu Tesla“.
  search: IntelReport | null;
  running: { focus: string | null; since: string } | null;
  error: string | null;
  spentTodayUsd: number;
  budgetUsd: number;
  topics: string[];
  auto: boolean;
  // Die Warnung an den Desk, solange sie gilt.
  warning: { text: string; at: string; until: string } | null;
  nextAt: string | null;
};

// Diese Themen liest Intel immer; deine eigenen kommen dazu.
export const BASE_TOPICS = ["Bitcoin", "Ethereum", "Solana", "Solana-Memecoins"];
export const MAX_TOPICS = 6;
// So lange bremst eine Warnung den Desk.
export const WARNING_HOURS = 6;
// So oft liest Intel von selbst, tagsüber zwischen 6 und 22 Uhr: morgens und am Nachmittag.
export const AUTO_HOURS = 8;
export const DEFAULT_INTEL_BUDGET_USD = 1;
// Ein Lagebild kostet meist 25 bis 45 Cent, vor allem für die gelesenen X-Beiträge.
export const TYPICAL_INTEL_COST_USD = 0.4;

export const MOOD_LABEL: Record<IntelMood, string> = { positiv: "positiv", gemischt: "gemischt", negativ: "angespannt", ruhig: "ruhig" };

const clockOf = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

const firstSentences = (text: string, n: number) => {
  const parts = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  return parts.slice(0, n).map((p) => p.trim()).join(" ");
};

// Ein Lagebild gilt fürs Briefing, solange es höchstens einen Tag alt ist.
const fresh = (r: IntelReport | null, now: Date) => (r && now.getTime() - Date.parse(r.at) < 24 * 3_600_000 ? r : null);

export function warningSentence(s: IntelSnapshot | null): string {
  if (!s?.warning) return "";
  return `Achtung: ${s.warning.text.replace(/[.!]?$/, ".")} Der Trading-Desk kauft deshalb bis ${clockOf(s.warning.until)} Uhr nichts Neues.`;
}

// Für das Briefing: ein, zwei Sätze, und die Warnung an den Desk, falls es eine gibt.
export function intelBriefing(s: IntelSnapshot | null, now: Date): string {
  const r = fresh(s?.report ?? null, now);
  if (!r) return warningSentence(s);
  return [`In den Nachrichten: ${firstSentences(r.summary, 2)}`, warningSentence(s)].filter(Boolean).join(" ");
}

// Die längere Fassung, wenn du nach den Nachrichten fragst: Lage und die wichtigsten Meldungen.
export function intelSentence(s: IntelSnapshot | null, now: Date): string {
  if (!s) return "Intel lädt noch.";
  if (!s.configured) return "Für die Nachrichten brauche ich den xAI-Schlüssel, den auch der Crawler nutzt. Den trägst du in den Einstellungen ein.";
  const r = s.report;
  if (!r) return s.running ? "Ich lese gerade die Nachrichten, das dauert etwa eine halbe Minute." : "Ich habe noch kein Lagebild. Sag: aktualisiere die Nachrichten.";
  const top = [...r.items].sort((a, b) => b.importance - a.importance).slice(0, 3);
  const heads = top.length ? ` Die wichtigsten Meldungen: ${top.map((i) => i.title.replace(/[.!?]$/, "")).join(". ")}.` : "";
  const age = now.getTime() - Date.parse(r.at) > 3 * 3_600_000 ? ` Das Lagebild ist von ${clockOf(r.at)} Uhr.` : "";
  return `${r.summary}${heads}${age} ${warningSentence(s)}`.trim();
}

// Die Antwort auf eine gezielte Suche.
export function searchSentence(r: IntelReport): string {
  const top = [...r.items].sort((a, b) => b.importance - a.importance).slice(0, 2);
  const heads = top.length ? ` ${top.map((i) => `${i.title.replace(/[.!?]$/, "")}: ${firstSentences(i.summary, 1)}`).join(" ")}` : "";
  return `Zu ${r.focus}: ${firstSentences(r.summary, 2)}${heads}`.trim();
}

// Die Meldungen zu einem Thema aus dem letzten Lagebild, ohne neue Suche.
export function itemsAbout(r: IntelReport | null, topic: string): IntelItem[] {
  if (!r) return [];
  const t = topic.toLowerCase();
  return r.items.filter((i) => i.topic.toLowerCase().includes(t) || i.title.toLowerCase().includes(t) || i.summary.toLowerCase().includes(t));
}

// Themen säubern: kurz, ohne Dubletten, ohne die festen Themen.
export function cleanTopics(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const raw of list) {
    const t = String(raw).replace(/[<>{}\n\r]/g, " ").replace(/\s+/g, " ").trim().slice(0, 40);
    if (!t || BASE_TOPICS.some((b) => b.toLowerCase() === t.toLowerCase()) || out.some((o) => o.toLowerCase() === t.toLowerCase())) continue;
    out.push(t);
    if (out.length >= MAX_TOPICS) break;
  }
  return out;
}
