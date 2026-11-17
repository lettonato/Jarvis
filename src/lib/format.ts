const compact = new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 });
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const pct = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1, signDisplay: "always" });
const significant = new Intl.NumberFormat("de-DE", { maximumSignificantDigits: 4 });
const usd = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatCompactUsd = (n: number) => `${compact.format(n)} $`;
export const formatEur = (n: number) => eur.format(n);
// Mit echtem Minuszeichen, wie formatSignedUsd; die Zahlenformatierung selbst setzt einen Bindestrich.
export const formatPct = (n: number) => `${pct.format(n).replace("-", "−")} %`;
export const formatPriceUsd = (n: number) => `${significant.format(n)} $`;
export const formatUsd = (n: number) => `${usd.format(n)} $`;
export const formatSignedUsd = (n: number) => `${n >= 0 ? "+" : "−"}${usd.format(Math.abs(n))} $`;
export const formatCount = (n: number) => n.toLocaleString("de-DE");
// „1 Abschnitt“, „2 Abschnitte“, „0 Abschnitte“.
export const anzahl = (n: number, einzahl: string, mehrzahl: string) => `${formatCount(n)} ${n === 1 ? einzahl : mehrzahl}`;

// Ein Satz als Teil eines größeren (hinter „Auffällig:“, im Kopf der Übersicht): ohne den Punkt am Ende.
export const ohnePunkt = (s: string) => s.replace(/\.$/, "");

// Eine Meldung als ganzer Satz: Fehlt das Schlusszeichen, kommt ein Punkt dahinter. Fehlermeldungen kommen oft
// als Halbsatz („xAI nicht erreichbar“) und stehen dann hinter „Letzter Versuch:“ oder werden vorgelesen.
export function alsSatz(text: string): string {
  const t = text.trim();
  return !t || /[.!?…][“"»)\]]*$/.test(t) ? t : `${t}.`;
}

export function formatAge(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} Min`;
  if (minutes < 60 * 48) return `${Math.round(minutes / 60)} Std`;
  return `${Math.round(minutes / 1440)} T`;
}

export function formatClock(date: Date, timeZone?: string): string {
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone });
}
