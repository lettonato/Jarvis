import type { SoftKey } from "./thresholds";

// Der Spielgeld-Handel: Die Agenten handeln mit erfundenem Geld, aber mit echten Kursen und echten
// Kosten. So zeigt sich in mindestens vier Wochen, ob der Desk nach Gebühren wirklich im Plus ist,
// bevor echtes Geld ins Spiel kommt. Die Arbeit macht src/lib/server/desk/; hier stehen die festen
// Regeln, die Rechnungen und was die Seite zu sehen bekommt.

// Feste Sicherheitsregeln aus dem Bauplan. Sie stehen im Code; das KI-Gehirn kann sie nicht ändern.
export const SAFETY = {
  startCapitalUsd: 10_000,
  // Höchstens 2 % des Kontos pro Trade.
  maxTradeShare: 0.02,
  minTicketUsd: 10,
  maxOpenPositions: 5,
  // Höchstens 5 % Verlust pro Tag, danach kauft der Desk bis morgen nichts mehr.
  dailyLossLimit: 0.05,
  // Jede Position hat ab dem Kauf einen Stop-Loss 15 % unter dem Einstieg.
  stopLoss: 0.15,
  // Ist der Kurs gestiegen, zieht der Stop nach: 20 % unter dem Höchststand seit dem Kauf.
  trailingStop: 0.2,
  takeProfit: 0.5,
  maxHoldHours: 24,
  // Fällt die Liquidität unter die Hälfte von beim Kauf, zieht jemand das Geld ab: sofort raus.
  rugLiquidityDrop: 0.5,
  // Nach einem Verkauf kauft der Desk denselben Coin einen Tag lang nicht wieder.
  cooldownHours: 24,
  // Der Chief schaut sich einen Coin höchstens alle 6 Stunden noch einmal an.
  recheckHours: 6,
  testDays: 28,
} as const;

// Kosten wie bei einem echten Tausch auf Solana: Gebühr der Börse, Netzwerkgebühr, Slippage.
export const COSTS = {
  dexFee: 0.003,
  networkFeeUsd: 0.05,
  baseSlippage: 0.005,
} as const;

export type DeskStatus = "aus" | "laeuft" | "pausiert" | "tageslimit" | "notaus";

export const STATUS_LABEL: Record<DeskStatus, string> = {
  aus: "noch nicht gestartet",
  laeuft: "läuft",
  pausiert: "pausiert",
  tageslimit: "Tageslimit erreicht",
  notaus: "Not-Aus",
};

export type SoftScores = Record<SoftKey, number>;

export type Position = {
  address: string;
  symbol: string;
  name: string;
  url: string;
  qty: number;
  // Was der Kauf samt Kosten gekostet hat.
  costUsd: number;
  entryPrice: number;
  openedAt: string;
  peakPrice: number;
  lastPrice: number;
  lastAt: string;
  entryLiquidity: number;
  lastLiquidity: number;
  // Wann der Crawler die Blockchain-Daten dieses Coins zuletzt geprüft hat.
  guardedAt: string;
  why: string;
};

export type DeskAgent = "Scan" | "Vet" | "Crawler" | "Chief" | "Size" | "Fills" | "Risk" | "Du";

export type Trade = {
  id: string;
  at: string;
  side: "kauf" | "verkauf";
  address: string;
  symbol: string;
  qty: number;
  price: number;
  fillPrice: number;
  // Beim Kauf, was vom Konto abging; beim Verkauf, was zurückkam. Kosten sind schon abgezogen.
  usd: number;
  feesUsd: number;
  pnlUsd?: number;
  pnlPct?: number;
  agent: DeskAgent;
  why: string;
};

export type LogEntry = { at: string; agent: DeskAgent | "Desk"; text: string; tone?: "kill" | "buy" | "sell" | "warn" };

// Was Crawler und Chief zuletzt über einen Coin entschieden haben, für die Scan-Tabelle.
export type CoinVerdict = { at: string; stage: "chain_kill" | "skin_kill" | "x_kill" | "chief_nein" | "gekauft" | "nicht_gekauft" | "nicht_geprueft"; text: string };

export type DeskStats = {
  scanned: number;
  vetPassed: number;
  pagesRead: number;
  reportsRead: number;
  // Was Grok auf X gelesen hat und was das insgesamt gekostet hat.
  postsRead: number;
  xReads: number;
  xCostUsd: number;
  killed: number;
  rugsStopped: number;
  chiefCalls: number;
  wins: number;
  losses: number;
};

export type DayRecord = { date: string; startEquity: number; endEquity: number; trades: number };

// Was die Seite vom Desk sieht.
export type DeskSnapshot = {
  status: DeskStatus;
  statusReason: string | null;
  startedAt: string | null;
  testDay: number;
  startCapital: number;
  cash: number;
  equity: number;
  pnlUsd: number;
  pnlPct: number;
  dayPnlPct: number;
  positions: (Position & { stopPrice: number; targetPrice: number })[];
  trades: Trade[];
  log: LogEntry[];
  stats: DeskStats;
  days: DayRecord[];
  equityHistory: { at: string; equity: number }[];
  lastPick: string | null;
  lastTickAt: string | null;
  verdicts: Record<string, CoinVerdict>;
  // Mit KI-Gehirn bewertet Claude die weichen Filter, sonst feste Faustregeln.
  chief: "claude" | "regeln";
  // Grok liest X nur mit xAI-Schlüssel und innerhalb des Tagesbudgets.
  x: { enabled: boolean; spentTodayUsd: number; budgetUsd: number };
};

const HOUR = 3_600_000;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export const stopPrice = (p: Pick<Position, "entryPrice" | "peakPrice">) =>
  Math.max(p.entryPrice * (1 - SAFETY.stopLoss), p.peakPrice * (1 - SAFETY.trailingStop));

export const targetPrice = (p: Pick<Position, "entryPrice">) => p.entryPrice * (1 + SAFETY.takeProfit);

// Warum Risk eine Position jetzt verkauft, oder null, wenn sie bleibt.
export function exitReason(p: Position, price: number, liquidity: number, now: Date): string | null {
  if (p.entryLiquidity > 0 && liquidity < p.entryLiquidity * SAFETY.rugLiquidityDrop) {
    return `Liquidität von ${Math.round(p.entryLiquidity).toLocaleString("de-DE")} $ auf ${Math.round(liquidity).toLocaleString("de-DE")} $ gefallen, da zieht jemand Geld ab`;
  }
  if (price >= targetPrice(p)) return `Ziel erreicht: ${pctText(price / p.entryPrice - 1)} seit dem Kauf`;
  const stop = stopPrice(p);
  if (price <= stop) {
    return stop > p.entryPrice * (1 - SAFETY.stopLoss) + 1e-12
      ? `Nachlauf-Stop: ${pctText(price / p.peakPrice - 1)} unter dem Höchststand`
      : `Stop-Loss: ${pctText(price / p.entryPrice - 1)} seit dem Kauf`;
  }
  if (now.getTime() - Date.parse(p.openedAt) >= SAFETY.maxHoldHours * HOUR) return `nach ${SAFETY.maxHoldHours} Stunden ohne Ziel verkauft`;
  return null;
}

const pctText = (share: number) => `${share >= 0 ? "+" : "−"}${Math.abs(share * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;

// Wie stark unser eigener Kauf den Kurs bewegt: bei einem Pool mit Liquidität L etwa 2 · Betrag / L.
export const priceImpact = (usd: number, liquidity: number) => (liquidity > 0 ? (2 * usd) / liquidity : 1);

const slippage = (usd: number, liquidity: number) => Math.min(0.95, COSTS.baseSlippage + priceImpact(usd, liquidity));

export function simulateBuy(usd: number, price: number, liquidity: number) {
  const feesUsd = usd * COSTS.dexFee + COSTS.networkFeeUsd;
  const fillPrice = price * (1 + slippage(usd, liquidity));
  return { qty: (usd - feesUsd) / fillPrice, fillPrice, feesUsd };
}

export function simulateSell(qty: number, price: number, liquidity: number) {
  const gross = qty * price;
  const fillPrice = price * (1 - slippage(gross, liquidity));
  const proceeds = qty * fillPrice;
  const feesUsd = proceeds * COSTS.dexFee + COSTS.networkFeeUsd;
  return { usd: Math.max(0, proceeds - feesUsd), fillPrice, feesUsd };
}

// Size: 2 % des Kontos, aber nie mehr, als bar da ist.
export function ticketSize(equity: number, cash: number): number {
  const ticket = Math.floor(Math.min(equity * SAFETY.maxTradeShare, cash) * 100) / 100;
  return ticket >= SAFETY.minTicketUsd ? ticket : 0;
}

// Passt unser Kauf zur Liquidität? 1 heißt kaum Kursbewegung, 0 heißt 5 % oder mehr.
export const liquidityFit = (usd: number, liquidity: number) => clamp01(1 - priceImpact(usd, liquidity) / 0.05);

export const positionValue = (p: Pick<Position, "qty" | "lastPrice">) => p.qty * p.lastPrice;

export const equityOf = (cash: number, positions: Pick<Position, "qty" | "lastPrice">[]) =>
  cash + positions.reduce((sum, p) => sum + positionValue(p), 0);

// Kalendertage: Wer am Montagabend startet, ist am Dienstag bei Tag 2.
export function testDayOf(startedAt: string | null, now: Date): number {
  if (!startedAt) return 0;
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(1, Math.round((midnight(now) - midnight(new Date(startedAt))) / (24 * HOUR)) + 1);
}
