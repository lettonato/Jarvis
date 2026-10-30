import { COMMODITIES, COMMODITY_RULES, commoditySignal, type Bar, type CommodityId, type CommodityQuote } from "../../commodities";

// Kurse für Gold, Silber und Öl von Twelve Data. Ein kostenloser Schlüssel reicht: 800 Abfragen am Tag,
// der Desk braucht rund 400. Pro Rohstoff probiert er die Kursquellen der Reihe nach; was der Plan nicht
// hergibt, merkt er sich und nimmt die nächste. Der Schlüssel geht nur im Header an Twelve Data.

const TWELVEDATA = process.env.TWELVEDATA_URL ?? "https://api.twelvedata.com";
const TIMEOUT_MS = 10_000;
// 120 Kerzen zu 15 Minuten: 30 Stunden Gold, bei den US-Fonds gut vier Handelstage.
const BARS = 120;

// Die US-Fonds handeln nur zur Börsenzeit in New York. Außerhalb fragt der Desk sie gar nicht erst ab.
const US_FUNDS = new Set(["GLD", "SLV", "USO"]);

type TwelveBar = { datetime?: string; open?: string; high?: string; low?: string; close?: string };
type TwelveSeries = { status?: string; code?: number; message?: string; values?: TwelveBar[] };

export class TwelveError extends Error {
  constructor(
    message: string,
    readonly code: number,
  ) {
    super(message);
  }
}

type Shared = {
  // Welche Kursquelle je Rohstoff gerade gilt (Index in COMMODITIES[].symbols).
  pick: Partial<Record<CommodityId, number>>;
  quotes: Partial<Record<CommodityId, CommodityQuote>>;
  fetchedAt: number;
  note: string | null;
};
const holder = globalThis as typeof globalThis & { __jarvisCommodities?: Shared };
const shared: Shared = (holder.__jarvisCommodities ??= { pick: {}, quotes: {}, fetchedAt: 0, note: null });

async function getTwelve<T>(pathAndQuery: string, apiKey: string): Promise<T> {
  const res = await fetch(`${TWELVEDATA}${pathAndQuery}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json", authorization: `apikey ${apiKey}` },
  });
  const body = (await res.json().catch(() => null)) as (T & { status?: string; code?: number; message?: string }) | null;
  if (!body) throw new TwelveError(`Twelve Data antwortet mit ${res.status}`, res.status);
  // Twelve Data meldet Fehler meist mit Status 200 und code im Text.
  if (body.status === "error") throw new TwelveError(body.message ?? "Twelve Data meldet einen Fehler", body.code ?? res.status);
  if (!res.ok) throw new TwelveError(`Twelve Data antwortet mit ${res.status}`, res.status);
  return body;
}

const parseBars = (values: TwelveBar[] | undefined): Bar[] =>
  (values ?? [])
    .map((v) => ({
      at: new Date(`${String(v.datetime).replace(" ", "T")}Z`).toISOString(),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
    }))
    .filter((b) => [b.open, b.high, b.low, b.close].every((n) => Number.isFinite(n) && n > 0) && !Number.isNaN(Date.parse(b.at)))
    .reverse();

// Am Wochenende ruhen alle drei Märkte (Freitag 22 Uhr bis Sonntag 22 Uhr UTC).
export function weekend(now: Date): boolean {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();
  return day === 6 || (day === 0 && hour < 22) || (day === 5 && hour >= 22);
}

// Börsenzeit New York, großzügig über Sommer- und Winterzeit: 13 bis 21:30 Uhr UTC, Montag bis Freitag.
export function usHours(now: Date): boolean {
  const day = now.getUTCDay();
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return day >= 1 && day <= 5 && minutes >= 13 * 60 && minutes <= 21 * 60 + 30;
}

const pickOf = (id: CommodityId) => shared.pick[id] ?? 0;
// Die Kursquelle, die gerade gilt, oder null, wenn keine mehr übrig ist oder der Fonds gerade nicht handelt.
const sourceOf = (c: (typeof COMMODITIES)[number], now: Date) => {
  const s = c.symbols[pickOf(c.id)];
  return s && (!US_FUNDS.has(s.symbol) || usHours(now)) ? s : null;
};

// Holt die Kerzen aller drei Rohstoffe in einer Abfrage und rechnet den Trend. Wirft, wenn Twelve Data gar
// nicht antwortet; einzelne Rohstoffe ohne Kurs fehlen dann einfach.
export async function refreshCommodities(apiKey: string, now = new Date()): Promise<CommodityQuote[]> {
  let todo = weekend(now) ? [] : COMMODITIES.filter((c) => sourceOf(c, now));
  const missing: string[] = [];
  const asked = todo.length > 0;
  // Liefert der Plan eine Quelle nicht, fragt der Desk gleich die nächste ab, statt eine Runde zu warten.
  // Das endet, weil jede Quelle höchstens einmal drankommt.
  while (todo.length > 0) {
    const wanted = todo.map((c) => ({ c, s: sourceOf(c, now)! }));
    const symbols = wanted.map((x) => x.s.symbol);
    const query = `/time_series?symbol=${encodeURIComponent(symbols.join(","))}&interval=15min&outputsize=${BARS}&timezone=UTC`;
    const body = await getTwelve<Record<string, TwelveSeries> & TwelveSeries>(query, apiKey);
    // Bei nur einem Symbol kommt die Reihe direkt, bei mehreren nach Symbol sortiert.
    const bySymbol: Record<string, TwelveSeries> = symbols.length === 1 ? { [symbols[0]]: body } : body;
    const next: typeof todo = [];
    for (const { c, s } of wanted) {
      const series = bySymbol[s.symbol];
      if (!series || series.status === "error") {
        // Nicht im Plan oder unbekannt: ab jetzt die nächste Quelle.
        if (series?.code && [400, 403, 404].includes(series.code)) {
          shared.pick[c.id] = pickOf(c.id) + 1;
          if (sourceOf(c, now)) {
            next.push(c);
            continue;
          }
          // Keine Quelle mehr übrig: steht unten im Hinweis zum Plan.
          if (pickOf(c.id) >= c.symbols.length) continue;
        }
        missing.push(c.name);
        continue;
      }
      const bars = parseBars(series.values);
      const last = bars.at(-1);
      if (!last) continue;
      const open = now.getTime() - Date.parse(last.at) <= COMMODITY_RULES.staleMinutes * 60_000;
      shared.quotes[c.id] = { id: c.id, name: c.name, symbol: s.symbol, label: s.label, price: last.close, at: last.at, open, signal: commoditySignal(bars) };
    }
    todo = next;
  }
  if (asked) {
    const gone = COMMODITIES.filter((c) => pickOf(c.id) >= c.symbols.length).map((c) => c.name);
    shared.note = gone.length
      ? `${gone.join(" und ")}: Dein Twelve-Data-Plan liefert dafür keine Kurse.`
      : missing.length
        ? `${missing.join(" und ")} gerade ohne Kurs, nächste Runde wieder.`
        : null;
    shared.fetchedAt = now.getTime();
  }
  // Was nicht neu geholt wurde (Wochenende, Fonds nach Börsenschluss), gilt als geschlossen.
  for (const q of Object.values(shared.quotes)) {
    if (q && now.getTime() - Date.parse(q.at) > COMMODITY_RULES.staleMinutes * 60_000) q.open = false;
  }
  return commodityQuotes();
}

export const commodityQuotes = (): CommodityQuote[] => COMMODITIES.map((c) => shared.quotes[c.id]).filter((q): q is CommodityQuote => Boolean(q));
export const commodityNote = () => shared.note;
export const lastCommodityFetch = () => shared.fetchedAt;

// Ein frischer Kurs für einen Rohstoff, zum Verkaufen per Knopf oder nach einer Rückfrage. Kostet eine Abfrage.
export async function freshCommodity(apiKey: string, id: CommodityId, now = new Date()): Promise<CommodityQuote | null> {
  const c = COMMODITIES.find((x) => x.id === id);
  const s = c?.symbols[pickOf(id)];
  if (!c || !s) return null;
  const body = await getTwelve<TwelveSeries>(`/time_series?symbol=${encodeURIComponent(s.symbol)}&interval=15min&outputsize=${BARS}&timezone=UTC`, apiKey);
  const bars = parseBars(body.values);
  const last = bars.at(-1);
  if (!last) return null;
  const open = now.getTime() - Date.parse(last.at) <= COMMODITY_RULES.staleMinutes * 60_000;
  const quote: CommodityQuote = { id, name: c.name, symbol: s.symbol, label: s.label, price: last.close, at: last.at, open, signal: commoditySignal(bars) };
  shared.quotes[id] = quote;
  return quote;
}

// Zum Testen des Schlüssels in den Einstellungen: Die Abfrage des Verbrauchs kostet nichts.
export async function testTwelveKey(apiKey: string): Promise<{ ok: true; plan: string } | { ok: false; error: string }> {
  try {
    const usage = await getTwelve<{ plan_category?: string; plan_limit?: number }>("/api_usage", apiKey);
    return { ok: true, plan: usage.plan_category ? String(usage.plan_category) : "unbekannt" };
  } catch (e) {
    if (e instanceof TwelveError && e.code === 401) return { ok: false, error: "Twelve Data kennt diesen Schlüssel nicht. Bitte den ganzen Schlüssel aus deinem Konto kopieren." };
    if (e instanceof TwelveError && e.code === 429) return { ok: false, error: "Twelve Data meldet: zu viele Abfragen. Bitte in einer Minute noch einmal." };
    return { ok: false, error: "Twelve Data ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen." };
  }
}

// Nur für Tests: alles vergessen.
export function resetCommodityCache() {
  shared.pick = {};
  shared.quotes = {};
  shared.fetchedAt = 0;
  shared.note = null;
}
