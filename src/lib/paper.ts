import type { Approval, ApprovalLimit } from "./approval";
import type { CommodityPosition, CommodityQuote } from "./commodities";
import type { SoftKey } from "./thresholds";

// Der Spielgeld-Handel: Die Agenten handeln mit erfundenem Geld, aber mit echten Kursen und echten
// Kosten. So zeigt sich in mindestens vier Wochen, ob der Desk nach Gebühren wirklich im Plus ist,
// bevor echtes Geld ins Spiel kommt. Die Arbeit macht src/lib/server/desk/; hier stehen die festen
// Regeln, die Rechnungen und was die Seite zu sehen bekommt.

// Feste Sicherheitsregeln aus dem Bauplan. Sie stehen im Code; das KI-Gehirn kann sie nicht ändern.
// Seit dem Umbau auf maximalen Gewinn (Oktober 2026): größere Einsätze, Gewinner laufen lassen, schneller
// wieder einsteigen. Stop-Loss, Tageslimit und Not-Aus bleiben.
export const SAFETY = {
  startCapitalUsd: 10_000,
  // Je Coin 2 bis 5 % des Kontos: je überzeugter der Desk, desto mehr.
  minTradeShare: 0.02,
  maxTradeShare: 0.05,
  minTicketUsd: 10,
  maxOpenPositions: 8,
  // Höchstens 8 % Verlust pro Tag, danach kauft der Desk bis morgen nichts mehr.
  dailyLossLimit: 0.08,
  // Jede Position hat ab dem Kauf einen Stop-Loss 15 % unter dem Einstieg.
  stopLoss: 0.15,
  // Ist der Kurs gestiegen, zieht der Stop nach: 20 % unter dem Höchststand seit dem Kauf.
  trailingStop: 0.2,
  // Bei +100 % verkauft Risk die Hälfte: Der Einsatz ist zurück, der Rest läuft weiter.
  halfAt: 1,
  // Der Rest darf mehr schwanken (30 % unter dem Höchststand), damit ein großer Gewinner nicht zu früh rausfliegt.
  runnerTrail: 0.3,
  // Wer nach 12 Stunden keine +20 % geschafft hat, macht Platz für bessere Coins.
  staleHours: 12,
  staleGain: 0.2,
  // Fällt die Liquidität unter die Hälfte von beim Kauf, zieht jemand das Geld ab: sofort raus.
  rugLiquidityDrop: 0.5,
  // Nach einem Verlust kauft der Desk denselben Coin 12 Stunden nicht wieder, nach einem Gewinn schon nach einer.
  cooldownAfterLossHours: 12,
  cooldownAfterWinHours: 1,
  // Abgelehnte Coins schaut der Desk nach einer Stunde wieder an, solche mit Rug-Zeichen erst nach 12.
  recheckMinutes: 60,
  killRecheckHours: 12,
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
  // Bei +100 % ist die Hälfte schon verkauft.
  halfSold?: boolean;
  why: string;
};

// Trend kümmert sich um Gold, Silber und Öl.
export type DeskAgent = "Scan" | "Vet" | "Crawler" | "Chief" | "Size" | "Fills" | "Risk" | "Trend" | "Du";

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
  // Rohstoffe haben keine Adresse; address ist dann gold, silber oder oel.
  market?: "rohstoff";
};

export type LogEntry = { at: string; agent: DeskAgent | "Desk"; text: string; tone?: "kill" | "buy" | "sell" | "warn" };

// Was Crawler und Chief zuletzt über einen Coin entschieden haben, für die Scan-Tabelle.
export type CoinVerdict = { at: string; stage: "chain_kill" | "skin_kill" | "x_kill" | "chief_nein" | "frage" | "gekauft" | "nicht_gekauft" | "nicht_geprueft"; text: string };

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

// Was der Crawler gerade tut, Schritt für Schritt: Daraus läuft die Spinne auf dem Trading-Desk.
// scan: neue Runde, chain: RugCheck, site: Projektseite, x: Grok auf X, chief: weiche Filter,
// fills: Kauf, guard: Wache bei gekauften Coins, intel: Warnung aus den Nachrichten.
export type CrawlStep = "scan" | "chain" | "site" | "x" | "chief" | "fills" | "guard" | "intel";
export type CrawlState = "laeuft" | "ok" | "raus" | "warn" | "gekauft";
export type CrawlEvent = { seq: number; at: string; address: string; symbol: string; step: CrawlStep; state: CrawlState; text: string };
// seq zählt jeden Schritt; die Seite fragt nur nach, was seit ihrem letzten Stand dazukam.
export type CrawlTrail = { seq: number; events: CrawlEvent[]; status: DeskStatus; lastTickAt: string | null; tickMs: number };

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
  // targetPrice: ab hier verkauft Risk die Hälfte; null, wenn das schon passiert ist.
  positions: (Position & { stopPrice: number; targetPrice: number | null })[];
  // Gold, Silber und Öl. Ohne Twelve-Data-Schlüssel ist dieser Teil aus.
  commodities: {
    enabled: boolean;
    quotes: CommodityQuote[];
    positions: (CommodityPosition & { stopPrice: number })[];
    note: string | null;
  };
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
  // Meldet Intel ein ernstes Ereignis, kauft der Desk bis dahin nichts Neues.
  intelWarning: { text: string; until: string } | null;
  // Rückfragen vor Käufen: die offenen zuerst, dazu die zuletzt erledigten.
  approvals: Approval[];
  approvalLimit: ApprovalLimit;
  // Ob die Frage auch aufs Handy kommt (Telegram gekoppelt).
  approvalPhone: boolean;
};

const HOUR = 3_600_000;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Der Stop: 15 % unter dem Einstieg oder 20 % unter dem Höchststand, je nachdem was höher ist. Ist die Hälfte
// verkauft, 30 % unter dem Höchststand; der lag dann schon beim doppelten Einstieg, ein Verlust ist also ausgeschlossen.
export const trailOf = (p: Pick<Position, "halfSold">) => (p.halfSold ? SAFETY.runnerTrail : SAFETY.trailingStop);

export const stopPrice = (p: Pick<Position, "entryPrice" | "peakPrice" | "halfSold">) =>
  Math.max(p.entryPrice * (1 - SAFETY.stopLoss), p.peakPrice * (1 - trailOf(p)));

// Ab diesem Kurs verkauft Risk die Hälfte; danach gibt es kein festes Ziel mehr, nur den Nachlauf-Stop.
export const targetPrice = (p: Pick<Position, "entryPrice" | "halfSold">) => (p.halfSold ? null : p.entryPrice * (1 + SAFETY.halfAt));

export type ExitPlan = { why: string; share: 1 | 0.5 };

// Was Risk jetzt verkauft: alles, die Hälfte oder nichts (null).
export function exitPlan(p: Position, price: number, liquidity: number, now: Date): ExitPlan | null {
  if (p.entryLiquidity > 0 && liquidity < p.entryLiquidity * SAFETY.rugLiquidityDrop) {
    return { share: 1, why: `Liquidität von ${Math.round(p.entryLiquidity).toLocaleString("de-DE")} $ auf ${Math.round(liquidity).toLocaleString("de-DE")} $ gefallen, da zieht jemand Geld ab` };
  }
  const stop = stopPrice(p);
  if (price <= stop) {
    const why =
      stop <= p.entryPrice * (1 - SAFETY.stopLoss) + 1e-12
        ? `Stop-Loss: ${pctText(price / p.entryPrice - 1)} seit dem Kauf`
        : `Nachlauf-Stop: ${pctText(price / p.peakPrice - 1)} unter dem Höchststand, ${pctText(price / p.entryPrice - 1)} seit dem Kauf`;
    return { share: 1, why };
  }
  const target = targetPrice(p);
  if (target !== null && price >= target) return { share: 0.5, why: `${pctText(price / p.entryPrice - 1)} seit dem Kauf: Hälfte verkauft, der Einsatz ist zurück, der Rest läuft weiter` };
  if (now.getTime() - Date.parse(p.openedAt) >= SAFETY.staleHours * HOUR && price < p.entryPrice * (1 + SAFETY.staleGain)) {
    return { share: 1, why: `nach ${SAFETY.staleHours} Stunden keine +${SAFETY.staleGain * 100} % (${pctText(price / p.entryPrice - 1)}), das Geld arbeitet woanders besser` };
  }
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

// Size: 2 % des Kontos, bei voller Überzeugung (1) bis zu 5 %, aber nie mehr, als bar da ist.
export const tradeShare = (conviction: number) => SAFETY.minTradeShare + (SAFETY.maxTradeShare - SAFETY.minTradeShare) * clamp01(conviction);

export function ticketSize(equity: number, cash: number, conviction = 0): number {
  const ticket = Math.floor(Math.min(equity * tradeShare(conviction), cash) * 100) / 100;
  return ticket >= SAFETY.minTicketUsd ? ticket : 0;
}

// Passt unser Kauf zur Liquidität? 1 heißt kaum Kursbewegung, 0 heißt 5 % oder mehr.
export const liquidityFit = (usd: number, liquidity: number) => clamp01(1 - priceImpact(usd, liquidity) / 0.05);

export const positionValue = (p: Pick<Position, "qty" | "lastPrice">) => p.qty * p.lastPrice;

// Konto = Bargeld plus alles, was gerade gehalten wird (Coins und Rohstoffe).
export const equityOf = (cash: number, ...holdings: Pick<Position, "qty" | "lastPrice">[][]) =>
  cash + holdings.flat().reduce((sum, p) => sum + positionValue(p), 0);

// Kalendertage: Wer am Montagabend startet, ist am Dienstag bei Tag 2.
export function testDayOf(startedAt: string | null, now: Date): number {
  if (!startedAt) return 0;
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.max(1, Math.round((midnight(now) - midnight(new Date(startedAt))) / (24 * HOUR)) + 1);
}
