import { ACTIVE_FILTERS, FILTER_LABELS, HARD_FILTERS, type ActiveFilter } from "./thresholds";

export type TokenStats = {
  ageMinutes: number;
  liquidityUsd: number;
  volumeH24: number;
  mcapUsd: number;
  tradesH24: number;
};

export type Check = {
  key: ActiveFilter;
  label: string;
  ok: boolean;
};

const STAT_FOR: Record<ActiveFilter, keyof TokenStats> = {
  minAgeMinutes: "ageMinutes",
  minLiquidityUsd: "liquidityUsd",
  minVolumeH24: "volumeH24",
  minMcapUsd: "mcapUsd",
  minTradesH24: "tradesH24",
};

// Der Vet-Agent: prüft die harten Filter der Reihe nach und hört beim ersten Fehlschlag auf.
export function vet(stats: TokenStats): { checks: Check[]; passed: boolean } {
  const checks: Check[] = [];
  for (const key of ACTIVE_FILTERS) {
    const ok = stats[STAT_FOR[key]] >= HARD_FILTERS[key];
    checks.push({ key, label: FILTER_LABELS[key], ok });
    if (!ok) return { checks, passed: false };
  }
  return { checks, passed: true };
}
