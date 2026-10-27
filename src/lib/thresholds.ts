// Harte Filter aus dem GrokBot-Video (thresholds.py).
// Ein Coin fliegt raus, sobald er eine dieser Grenzen verfehlt.
export const HARD_FILTERS = {
  minAgeMinutes: 15,
  minLiquidityUsd: 12_000,
  minVolumeH24: 40_000,
  minMcapUsd: 60_000,
  minTradesH24: 150,
  // Die beiden Halter-Filter prüft der Crawler mit den Blockchain-Daten von RugCheck.
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

// Filter, die Vet aus den DexScreener-Zahlen prüft. Die Reihenfolge ist Absicht: billige Prüfungen zuerst.
export const ACTIVE_FILTERS = [
  "minAgeMinutes",
  "minLiquidityUsd",
  "minVolumeH24",
  "minMcapUsd",
  "minTradesH24",
] as const satisfies readonly FilterKey[];

export type ActiveFilter = (typeof ACTIVE_FILTERS)[number];

// Weiche Filter aus dem Video („applied to Jev's answers“): Der Chief schätzt jeden Punkt von 0 bis 1
// ein, die Grenze hier entscheidet. Die KI kann eine Grenze nicht verschieben, nur ihre Einschätzung abgeben.
// label erklärt die Frage, fail sagt, warum der Chief bei einem Coin nein sagt.
export const SOFT_FILTERS = {
  concentration_is_exit_risk: { limit: "max", value: 0.55, label: "Wenige Halter könnten auf einmal verkaufen", fail: "zu wenige Wallets halten zu viel" },
  momentum_already_spent: { limit: "max", value: 0.6, label: "Der Anstieg ist schon gelaufen", fail: "der Anstieg ist schon gelaufen" },
  liquidity_fits_ticket: { limit: "min", value: 0.6, label: "Unser Kauf passt zur Liquidität", fail: "zu wenig Liquidität für unseren Einsatz" },
  account_is_the_project: { limit: "min", value: 0.7, label: "Seite und Konten gehören wirklich zum Projekt", fail: "Seite und Konten passen nicht sicher zum Coin" },
  recycled_account: { limit: "max", value: 0.5, label: "Das Konto wurde schon für andere Coins benutzt", fail: "das Konto wurde schon für andere Coins benutzt" },
  dev_still_loaded: { limit: "max", value: 0.55, label: "Der Entwickler hält noch viele Coins", fail: "der Entwickler hält noch zu viele Coins" },
} as const satisfies Record<string, { limit: "min" | "max"; value: number; label: string; fail: string }>;

export type SoftKey = keyof typeof SOFT_FILTERS;

export const SOFT_KEYS = Object.keys(SOFT_FILTERS) as SoftKey[];

export const softPasses = (key: SoftKey, score: number) => {
  const f = SOFT_FILTERS[key];
  return f.limit === "max" ? score <= f.value : score >= f.value;
};

// Die Reihenfolge aus filter.py: „the order is the whole point“. Billige Prüfungen zuerst,
// die teure KI-Bewertung ganz am Ende, wenn nur noch wenige Coins übrig sind.
export const FILTER_STAGES = [
  { id: "free_kill", label: "Alter, Liquidität, Marktwert", agent: "Vet" },
  { id: "trade_kill", label: "Volumen und Trades", agent: "Vet" },
  { id: "chain_kill", label: "Halter, Mint, Einfrieren, Rug-Risiken", agent: "Crawler" },
  { id: "skin_kill", label: "Projektseite und Konten gelesen", agent: "Crawler" },
  { id: "pick", label: "weiche Filter und Auswahl", agent: "Chief" },
] as const;
