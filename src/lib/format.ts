const compact = new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 });
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1, signDisplay: "always" });
const significant = new Intl.NumberFormat("de-DE", { maximumSignificantDigits: 4 });
const usd = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatCompactUsd = (n: number) => `${compact.format(n)} $`;
export const formatEur = (n: number) => eur.format(n);
export const formatPct = (n: number) => `${pct.format(n)} %`;
export const formatPriceUsd = (n: number) => `${significant.format(n)} $`;
export const formatUsd = (n: number) => `${usd.format(n)} $`;
export const formatSignedUsd = (n: number) => `${n >= 0 ? "+" : "−"}${usd.format(Math.abs(n))} $`;
export const formatCount = (n: number) => n.toLocaleString("de-DE");

export function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} Min`;
  if (minutes < 60 * 48) return `${Math.round(minutes / 60)} Std`;
  return `${Math.round(minutes / 1440)} T`;
}

export function formatClock(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone });
}
