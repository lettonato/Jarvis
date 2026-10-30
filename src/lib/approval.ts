import { formatUsd } from "./format";

// Rückfrage vor Käufen: Ab einer Grenze kauft der Desk nicht selbst. Er fragt dich per Telegram mit
// Ja/Nein-Knöpfen und in JARVIS auf dem Trading-Desk, und kauft erst nach deinem Ja. Hier stehen die
// festen Regeln und Texte ohne Netz; die Arbeit macht der Desk in src/lib/server/desk/engine.ts.
//
// Fest im Code, das KI-Gehirn kann daran nichts ändern:
// - Freigeben kannst nur du, mit einem Knopf in JARVIS oder in deinem gekoppelten Telegram-Chat.
//   Claude hat dafür kein Werkzeug, und ein gesprochenes „Ja“ zählt nicht.
// - Ohne Antwort verfällt die Frage nach zehn Minuten. Dann wird nicht gekauft.
// - Nach deinem Ja prüft der Desk noch einmal: Läuft der Handel noch, ist Platz für eine Position, besteht
//   der Coin die harten Filter, ist der Kurs seit der Frage nicht mehr als 5 % gestiegen. Sonst kein Kauf.
// - Gekauft wird höchstens der Betrag, nach dem gefragt wurde.
// - Verkäufe (Stop-Loss, Ziel, Rug-Zeichen) fragen nie nach. Dort kostet Warten Geld.

export const APPROVAL = {
  timeoutMinutes: 10,
  // So viele erledigte Rückfragen bleiben zum Nachlesen.
  keep: 20,
} as const;

// Ab welchem Betrag der Desk fragt. 0 heißt bei jedem Kauf, null heißt nie.
export type ApprovalLimit = number | null;

export const APPROVAL_CHOICES: { value: ApprovalLimit; label: string }[] = [
  { value: 0, label: "Bei jedem Kauf" },
  { value: 100, label: "Ab 100 $" },
  { value: 250, label: "Ab 250 $" },
  { value: 500, label: "Ab 500 $" },
  { value: null, label: "Nie fragen" },
];

// Seit dem Umbau auf maximalen Gewinn (Benedikts Wahl am 30. Oktober 2026): Beim Spielgeld kauft der Desk
// sofort und meldet den Kauf danach. Die Rückfrage lässt sich in den Einstellungen wieder einschalten.
export const DEFAULT_APPROVAL_LIMIT: ApprovalLimit = null;

export const isApprovalLimit = (value: unknown): value is ApprovalLimit => APPROVAL_CHOICES.some((c) => c.value === value);

// Steht nichts oder Unsinn in den Einstellungen, gilt die Grenze von oben.
export const approvalLimitOf = (saved: unknown): ApprovalLimit => (isApprovalLimit(saved) ? saved : DEFAULT_APPROVAL_LIMIT);

export const needsApproval = (usd: number, limit: ApprovalLimit) => limit !== null && usd >= limit;

export const approvalLabel = (limit: ApprovalLimit) => APPROVAL_CHOICES.find((c) => c.value === limit)?.label ?? "";

export type ApprovalState = "offen" | "ja" | "nein" | "verfallen" | "verworfen";

export type Approval = {
  id: string;
  address: string;
  symbol: string;
  name: string;
  url: string;
  // Betrag und Kurs, nach denen gefragt wurde.
  usd: number;
  price: number;
  why: string;
  askedAt: string;
  until: string;
  state: ApprovalState;
  answeredAt?: string;
  via?: "app" | "telegram";
  // Gold, Silber oder Öl statt eines Coins; address ist dann gold, silber oder oel.
  market?: "rohstoff";
  // Was am Ende passiert ist, in einem Satz.
  result?: string;
};

const clock = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

// Coins heißen $SYMBOL, Rohstoffe einfach Gold, Silber oder Öl.
export const assetLabel = (a: { symbol: string; market?: "rohstoff" }) => (a.market === "rohstoff" ? a.symbol : `$${a.symbol}`);

export function approvalQuestion(a: Pick<Approval, "symbol" | "usd" | "why" | "until" | "market">): string {
  return `🟡 Rückfrage: Soll ich ${assetLabel(a)} für ${formatUsd(a.usd)} kaufen? (Spielgeld)\nWarum: ${a.why}\nOhne Antwort bis ${clock(a.until)} Uhr kaufe ich nicht.`;
}

// Was unter der Frage steht, sobald sie erledigt ist.
export function approvalOutcome(a: Pick<Approval, "state" | "result" | "via">): string {
  const icon = a.state === "ja" ? "✅" : a.state === "verfallen" ? "⌛" : "✖️";
  const where = a.via === "app" ? " (in JARVIS beantwortet)" : "";
  return `${icon} ${a.result ?? ""}${where}`.trim();
}

// Die Knöpfe unter der Frage in Telegram tragen nur die Nummer der Rückfrage und Ja oder Nein.
export const approvalButton = (id: string, yes: boolean) => `rf:${id}:${yes ? "ja" : "nein"}`;

export function parseApprovalButton(data: string | undefined): { id: string; yes: boolean } | null {
  const m = /^rf:([a-z0-9]{6,16}):(ja|nein)$/.exec(data ?? "");
  return m ? { id: m[1], yes: m[2] === "ja" } : null;
}

export const secondsLeft = (a: Pick<Approval, "until">, now: number) => Math.max(0, Math.round((Date.parse(a.until) - now) / 1000));
