// Rohstoffe im Spielgeld-Desk: Gold, Silber und Öl. Anders als Memecoins bewegen sie sich langsam und
// gleichmäßig, deshalb folgt der Desk hier dem Trend: Er kauft, wenn der Kurs nach oben zieht, und steigt
// mit einem Nachlauf-Stop aus, sobald der Trend kippt. Kurse kommen von Twelve Data (kostenloser Schlüssel);
// die Arbeit macht src/lib/server/desk/commodities.ts. Hier stehen die festen Regeln und die Rechnungen.

export type CommodityId = "gold" | "silber" | "oel";

// Je Rohstoff mehrere Kursquellen: zuerst der Rohstoff selbst, sonst ein Fonds, der ihm folgt. Gold gibt es bei
// Twelve Data direkt; Silber und Öl verlangen dort meist einen größeren Plan, dann gelten die US-Fonds SLV und USO.
// minStop: so weit darf der Kurs mindestens unter den Höchststand fallen, bevor Risk verkauft.
export const COMMODITIES: { id: CommodityId; name: string; symbols: { symbol: string; label: string }[]; minStop: number }[] = [
  { id: "gold", name: "Gold", symbols: [{ symbol: "XAU/USD", label: "Feinunze" }, { symbol: "GLD", label: "Gold-Fonds GLD" }], minStop: 0.015 },
  { id: "silber", name: "Silber", symbols: [{ symbol: "XAG/USD", label: "Feinunze" }, { symbol: "SLV", label: "Silber-Fonds SLV" }], minStop: 0.025 },
  { id: "oel", name: "Öl", symbols: [{ symbol: "WTI/USD", label: "Barrel WTI" }, { symbol: "USO", label: "Öl-Fonds USO" }], minStop: 0.025 },
];

// Feste Regeln, das KI-Gehirn kann sie nicht ändern.
export const COMMODITY_RULES = {
  // Je Rohstoff höchstens 10 % des Kontos, also zusammen höchstens 30 %.
  tradeShare: 0.1,
  // Der Stop liegt 4 Kerzenschwankungen (ATR) unter dem Höchststand, aber nie enger als minStop.
  atrStops: 4,
  // Nach einem Verlust wartet der Desk 4 Stunden, bevor er denselben Rohstoff wieder kauft.
  cooldownHours: 4,
  // Liegt die letzte Kerze länger zurück, ist der Markt zu: dann wird weder gekauft noch verkauft.
  staleMinutes: 45,
} as const;

// Kosten wie bei einem Online-Broker: 1 $ pro Auftrag und eine kleine Spanne zwischen Kauf- und Verkaufskurs.
export const COMMODITY_COSTS = { feeUsd: 1, spread: 0.0005 } as const;

export type Bar = { at: string; open: number; high: number; low: number; close: number };

export type CommoditySignal = {
  trend: "steigt" | "faellt" | "seitwaerts";
  buy: boolean;
  // Warum gekauft wird oder warum nicht, als kurzer Satz.
  why: string;
  // Schwankung einer 15-Minuten-Kerze im Verhältnis zum Kurs.
  atrPct: number;
  change4h: number;
};

export type CommodityQuote = {
  id: CommodityId;
  name: string;
  symbol: string;
  label: string;
  price: number;
  at: string;
  open: boolean;
  signal: CommoditySignal | null;
};

export type CommodityPosition = {
  id: CommodityId;
  name: string;
  symbol: string;
  qty: number;
  costUsd: number;
  entryPrice: number;
  openedAt: string;
  peakPrice: number;
  lastPrice: number;
  lastAt: string;
  // Abstand des Nachlauf-Stops vom Höchststand, beim Kauf festgelegt.
  stopPct: number;
  why: string;
};

const FAST = 12;
const SLOW = 48;
// Mindestens so viele Kerzen braucht die Trendrechnung.
export const MIN_BARS = SLOW + 12;

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  values.forEach((v, i) => out.push(i === 0 ? v : v * k + out[i - 1] * (1 - k)));
  return out;
}

// Mittlere Schwankung der letzten Kerzen (Average True Range).
export function atr(bars: Bar[], period = 14): number {
  const ranges = bars.slice(1).map((b, i) => Math.max(b.high - b.low, Math.abs(b.high - bars[i].close), Math.abs(b.low - bars[i].close)));
  const last = ranges.slice(-period);
  return last.length ? last.reduce((s, r) => s + r, 0) / last.length : 0;
}

// Der Trend aus 15-Minuten-Kerzen, älteste zuerst. Gekauft wird nur, wenn alles nach oben zeigt und der Kurs
// nicht schon weit davongelaufen ist.
export function commoditySignal(bars: Bar[]): CommoditySignal | null {
  if (bars.length < MIN_BARS) return null;
  const closes = bars.map((b) => b.close);
  const fast = ema(closes, FAST);
  const slow = ema(closes, SLOW);
  const price = closes.at(-1)!;
  const f = fast.at(-1)!;
  const s = slow.at(-1)!;
  const range = atr(bars);
  const atrPct = price > 0 ? range / price : 0;
  const change4h = price / closes.at(-17)! - 1;
  const rising = f > fast.at(-5)!;
  const trend = f > s && rising ? "steigt" : f < s && !rising ? "faellt" : "seitwaerts";
  const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
  if (trend !== "steigt") return { trend, buy: false, why: trend === "faellt" ? "Trend zeigt nach unten" : "kein klarer Trend", atrPct, change4h };
  if (price <= f) return { trend, buy: false, why: "Kurs liegt unter dem kurzen Schnitt", atrPct, change4h };
  // Ein echter Trend hebt sich vom gewöhnlichen Zappeln ab: Abstand der Schnitte und Anstieg seit 4 Stunden
  // müssen größer sein als die Schwankung einer Kerze.
  if (f - s < 0.5 * range || price - closes.at(-17)! < range) return { trend: "seitwaerts", buy: false, why: "Anstieg zu schwach, das ist noch Zappeln", atrPct, change4h };
  if (range > 0 && (price - f) / range > 2.5) return { trend, buy: false, why: "schon weit davongelaufen, ich warte auf einen Rücksetzer", atrPct, change4h };
  return { trend, buy: true, why: `Aufwärtstrend: ${pct(change4h)} in 4 Stunden, kurzer Schnitt über dem langen`, atrPct, change4h };
}

export const commodityStopPct = (id: CommodityId, atrPct: number) =>
  Math.max(COMMODITIES.find((c) => c.id === id)?.minStop ?? 0.02, COMMODITY_RULES.atrStops * atrPct);

export const commodityStop = (p: Pick<CommodityPosition, "peakPrice" | "stopPct">) => p.peakPrice * (1 - p.stopPct);

export function simulateCommodityBuy(usd: number, price: number) {
  const fillPrice = price * (1 + COMMODITY_COSTS.spread);
  return { qty: (usd - COMMODITY_COSTS.feeUsd) / fillPrice, fillPrice, feesUsd: COMMODITY_COSTS.feeUsd + usd * COMMODITY_COSTS.spread };
}

export function simulateCommoditySell(qty: number, price: number) {
  const fillPrice = price * (1 - COMMODITY_COSTS.spread);
  return { usd: Math.max(0, qty * fillPrice - COMMODITY_COSTS.feeUsd), fillPrice, feesUsd: COMMODITY_COSTS.feeUsd + qty * price * COMMODITY_COSTS.spread };
}

// Warum Risk einen Rohstoff jetzt verkauft, oder null, wenn er bleibt.
export function commodityExit(p: CommodityPosition, price: number, signal: CommoditySignal | null): string | null {
  const stop = commodityStop(p);
  const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n * 100).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
  if (price <= stop) return `Nachlauf-Stop: ${pct(price / p.peakPrice - 1)} unter dem Höchststand, ${pct(price / p.entryPrice - 1)} seit dem Kauf`;
  if (signal?.trend === "faellt") return `Trend gekippt, ${pct(price / p.entryPrice - 1)} seit dem Kauf`;
  return null;
}
