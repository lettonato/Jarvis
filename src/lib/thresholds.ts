// Harte Filter aus dem GrokBot-Video (thresholds.py).
// Ein Coin fliegt raus, sobald er eine dieser Grenzen verfehlt.
export const HARD_FILTERS = {
  minAgeMinutes: 15,
  minLiquidityUsd: 12_000,
  minVolumeH24: 40_000,
  minMcapUsd: 60_000,
  minTradesH24: 150,
  // Die beiden Halter-Filter brauchen On-Chain-Daten (z. B. RugCheck) und kommen in Phase 3.
  maxTopWallet: 0.05,
  maxTop10: 0.6,
} as const;

export type FilterKey = keyof typeof HARD_FILTERS;

export const FILTER_LABELS: Record<FilterKey, string> = {
  minAgeMinutes: "min_age_minutes",
  minLiquidityUsd: "min_liquidity_usd",
  minVolumeH24: "min_volume_h24",
  minMcapUsd: "min_mcap_usd",
  minTradesH24: "min_trades_h24",
  maxTopWallet: "max_top_wallet",
  maxTop10: "max_top_10",
};

// Filter, die Phase 1 schon prüfen kann. Die Reihenfolge ist Absicht: billige Prüfungen zuerst.
export const ACTIVE_FILTERS = [
  "minAgeMinutes",
  "minLiquidityUsd",
  "minVolumeH24",
  "minMcapUsd",
  "minTradesH24",
] as const satisfies readonly FilterKey[];

export type ActiveFilter = (typeof ACTIVE_FILTERS)[number];
