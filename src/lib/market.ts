import { vet, type Check } from "./vet";

// Marktdaten: große Coins kommen von CoinGecko, neue Solana-Memecoins von DexScreener.
// Beide APIs sind ohne Schlüssel nutzbar. Ist eine nicht erreichbar, zeigt das
// Dashboard klar gekennzeichnete Beispieldaten statt einer leeren Seite; mit Beispieldaten
// handelt der Spielgeld-Desk nie.

export type Source = "live" | "demo";

export type MajorQuote = {
  id: string;
  symbol: string;
  name: string;
  eur: number;
  change24h: number;
};

export type Candidate = {
  address: string;
  symbol: string;
  name: string;
  url: string;
  priceUsd: number;
  change24h: number;
  // Kurzfristige Bewegung, damit der Chief sieht, ob der Anstieg schon gelaufen ist oder gerade anfängt.
  change5m: number;
  change1h: number;
  change6h: number;
  liquidityUsd: number;
  volumeH24: number;
  mcapUsd: number;
  tradesH24: number;
  buysH1: number;
  sellsH1: number;
  buysM5: number;
  sellsM5: number;
  volumeH1: number;
  // Schwung von 0 bis 1: Kommt gerade frisches Geld rein? Daraus entscheidet der Desk, wen er zuerst prüft.
  heat: number;
  ageMinutes: number;
  // Webseite und Konten, die das Projekt bei DexScreener angegeben hat. Der Crawler liest sie.
  websites: string[];
  socials: { type: string; url: string }[];
  checks: Check[];
  passed: boolean;
};

export type MarketSnapshot = {
  fetchedAt: string;
  majors: { source: Source; quotes: MajorQuote[] };
  scan: { source: Source; scanned: number; candidates: Candidate[] };
};

const MAJORS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
];

const TIMEOUT_MS = 8000;

// Für Tests lassen sich die Quellen auf einen nachgebauten Server umlenken.
const COINGECKO = process.env.COINGECKO_URL ?? "https://api.coingecko.com";
const DEXSCREENER = process.env.DEXSCREENER_URL ?? "https://api.dexscreener.com";
// GeckoTerminal zeigt, welche Solana-Pools gerade am meisten gehandelt werden, ebenfalls ohne Schlüssel.
const GECKOTERMINAL = process.env.GECKOTERMINAL_URL ?? "https://api.geckoterminal.com";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`${url} antwortet mit ${res.status}`);
  return (await res.json()) as T;
}

type CoinGeckoPrices = Record<string, { eur?: number; eur_24h_change?: number }>;

async function fetchMajors(): Promise<MajorQuote[]> {
  const ids = MAJORS.map((m) => m.id).join(",");
  const data = await getJson<CoinGeckoPrices>(
    `${COINGECKO}/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`,
  );
  return MAJORS.map((m) => ({
    ...m,
    eur: data[m.id]?.eur ?? 0,
    change24h: data[m.id]?.eur_24h_change ?? 0,
  }));
}

type DexListing = { chainId: string; tokenAddress: string };

type DexTxns = { buys?: number; sells?: number };

export type DexPair = {
  url: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  liquidity?: { usd?: number };
  volume?: { m5?: number; h1?: number; h24?: number };
  txns?: { m5?: DexTxns; h1?: DexTxns; h24?: DexTxns };
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
  info?: { websites?: { url?: string }[]; socials?: { type?: string; url?: string }[] };
};

// DexScreener nimmt höchstens 30 Adressen pro Abfrage; der Scan schaut sich bis zu 60 an.
const MAX_TOKENS = 30;
const MAX_SCAN = 60;

// Pro Token zählt das Handelspaar mit der meisten Liquidität.
export async function fetchPairs(addresses: string[]): Promise<Map<string, DexPair>> {
  const best = new Map<string, DexPair>();
  const chunks: string[][] = [];
  for (let i = 0; i < addresses.length; i += MAX_TOKENS) chunks.push(addresses.slice(i, i + MAX_TOKENS));
  const results = await Promise.all(chunks.map((chunk) => getJson<DexPair[]>(`${DEXSCREENER}/tokens/v1/solana/${chunk.join(",")}`)));
  for (const pair of results.flat()) {
    const current = best.get(pair.baseToken.address);
    if (!current || (pair.liquidity?.usd ?? 0) > (current.liquidity?.usd ?? 0)) best.set(pair.baseToken.address, pair);
  }
  return best;
}

type GeckoPools = { data?: { relationships?: { base_token?: { data?: { id?: string } } } }[] };

// Die Pools, die gerade bei GeckoTerminal im Trend sind. Die Token-Adresse steckt in der id hinter „solana_“.
async function trendingAddresses(): Promise<string[]> {
  const res = await getJson<GeckoPools>(`${GECKOTERMINAL}/api/v2/networks/solana/trending_pools?duration=1h`);
  return (res.data ?? [])
    .map((pool) => pool.relationships?.base_token?.data?.id ?? "")
    .filter((id) => id.startsWith("solana_"))
    .map((id) => id.slice("solana_".length));
}

// Gängige Coins, die im Trend auftauchen, aber keine Memecoins sind (SOL selbst, Dollar-Coins).
const NOT_MEME = new Set([
  "So11111111111111111111111111111111111111112",
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
]);

async function fetchCandidates(): Promise<{ scanned: number; candidates: Candidate[] }> {
  const lists = await Promise.allSettled([
    getJson<DexListing[]>(`${DEXSCREENER}/token-boosts/top/v1`),
    getJson<DexListing[]>(`${DEXSCREENER}/token-boosts/latest/v1`),
    getJson<DexListing[]>(`${DEXSCREENER}/token-profiles/latest/v1`),
  ]);
  const listings = lists.flatMap((l) => (l.status === "fulfilled" ? l.value : []));
  if (listings.length === 0) throw new Error("DexScreener liefert keine Token-Listen");
  // Fällt GeckoTerminal aus, reichen die Listen von DexScreener.
  const trending = await trendingAddresses().catch(() => []);

  const addresses = [
    ...new Set([...trending, ...listings.filter((l) => l.chainId === "solana").map((l) => l.tokenAddress)].filter((a) => a && !NOT_MEME.has(a))),
  ].slice(0, MAX_SCAN);
  if (addresses.length === 0) return { scanned: 0, candidates: [] };

  const best = await fetchPairs(addresses);
  const now = Date.now();
  const candidates = [...best.values()].map((pair) => toCandidate(pair, now));
  return { scanned: addresses.length, candidates: sortCandidates(candidates) };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// Schwung aus den letzten Minuten: Kaufen gerade mehr Leute als verkaufen, ist das Volumen der letzten Stunde
// höher als im Tagesschnitt, und steigt der Kurs gerade erst? Ein senkrechter Pump zählt dagegen wenig,
// da kämen wir zu spät.
export function heatOf(c: Pick<Candidate, "buysH1" | "sellsH1" | "buysM5" | "sellsM5" | "volumeH1" | "volumeH24" | "change5m" | "change1h">): number {
  const trades = c.buysH1 + c.sellsH1;
  const pressure = trades ? clamp01((c.buysH1 / trades - 0.45) / 0.25) : 0;
  const recent = c.buysM5 + c.sellsM5;
  const pressureNow = recent >= 5 ? clamp01((c.buysM5 / recent - 0.45) / 0.25) : pressure;
  const accel = c.volumeH24 > 0 ? clamp01((c.volumeH1 / (c.volumeH24 / 24) - 0.8) / 2.2) : 0;
  const move5 = clamp01(c.change5m / 8);
  const move1 = c.change1h > 80 ? 0.2 : clamp01(c.change1h / 30);
  return Math.round((0.2 * pressure + 0.2 * pressureNow + 0.3 * accel + 0.15 * move5 + 0.15 * move1) * 100) / 100;
}

const httpsOnly = (url?: string): url is string => typeof url === "string" && url.startsWith("https://");

export function toCandidate(pair: DexPair, now = Date.now()): Candidate {
  const stats = {
    ageMinutes: pair.pairCreatedAt ? (now - pair.pairCreatedAt) / 60_000 : 0,
    liquidityUsd: pair.liquidity?.usd ?? 0,
    volumeH24: pair.volume?.h24 ?? 0,
    mcapUsd: pair.marketCap ?? pair.fdv ?? 0,
    tradesH24: (pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0),
  };
  const candidate = {
    address: pair.baseToken.address,
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    url: pair.url,
    priceUsd: Number(pair.priceUsd ?? 0),
    change24h: pair.priceChange?.h24 ?? 0,
    change5m: pair.priceChange?.m5 ?? 0,
    change1h: pair.priceChange?.h1 ?? 0,
    change6h: pair.priceChange?.h6 ?? 0,
    buysH1: pair.txns?.h1?.buys ?? 0,
    sellsH1: pair.txns?.h1?.sells ?? 0,
    buysM5: pair.txns?.m5?.buys ?? 0,
    sellsM5: pair.txns?.m5?.sells ?? 0,
    volumeH1: pair.volume?.h1 ?? 0,
    websites: (pair.info?.websites ?? []).map((w) => w.url).filter(httpsOnly).slice(0, 3),
    socials: (pair.info?.socials ?? [])
      .filter((x): x is { type: string; url: string } => typeof x.type === "string" && httpsOnly(x.url))
      .slice(0, 5),
    ...stats,
    ...vet(stats),
  };
  return { ...candidate, heat: heatOf(candidate) };
}

// Wer die harten Filter besteht, zuerst; darunter die mit dem meisten Schwung.
function sortCandidates(list: Candidate[]): Candidate[] {
  return list.sort((a, b) => Number(b.passed) - Number(a.passed) || b.heat - a.heat || b.volumeH24 - a.volumeH24);
}

// Mehrere Ansichten und der Spielgeld-Desk fragen die Kurse ab; innerhalb von 15 Sekunden bekommen
// alle dieselbe Antwort, damit CoinGecko und DexScreener nicht zu oft angefragt werden.
let last: { at: number; data: Promise<MarketSnapshot> } | null = null;

export function marketSnapshot(maxAgeMs = 15_000): Promise<MarketSnapshot> {
  if (!last || Date.now() - last.at > maxAgeMs) last = { at: Date.now(), data: getMarketSnapshot() };
  return last.data;
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const [majors, scan] = await Promise.allSettled([fetchMajors(), fetchCandidates()]);
  return {
    fetchedAt: new Date().toISOString(),
    majors:
      majors.status === "fulfilled"
        ? { source: "live", quotes: majors.value }
        : { source: "demo", quotes: DEMO_MAJORS },
    scan:
      scan.status === "fulfilled"
        ? { source: "live", ...scan.value }
        : { source: "demo", ...demoCandidates() },
  };
}

// Beispieldaten, falls keine Verbindung besteht. Sie sind im Dashboard als solche markiert.
const DEMO_MAJORS: MajorQuote[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", eur: 92_450, change24h: 1.8 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", eur: 3_310, change24h: -0.7 },
  { id: "solana", symbol: "SOL", name: "Solana", eur: 168.4, change24h: 3.2 },
];

function demoCandidates(): { scanned: number; candidates: Candidate[] } {
  const rows = [
    ["HIGGS", "Higgs", 0.00142, 18.4, 210_000, 1_480_000, 1_400_000, 2_310, 4_200],
    ["PLAGUE", "Plague", 0.000789, 147.6, 46_000, 541_000, 789_000, 980, 1_380],
    ["FOMO", "Fomo", 0.0000921, -12.3, 31_000, 260_000, 92_000, 640, 720],
    ["STONK", "Stonk", 0.0031, 6.1, 9_800, 51_000, 310_000, 410, 2_900],
    ["WOOF", "Woof", 0.00044, 54.2, 15_500, 22_000, 440_000, 95, 360],
    ["RUG", "Totally Safe", 0.0000071, 380, 13_000, 88_000, 71_000, 520, 9],
    ["CATZ", "Catz", 0.00021, -4.8, 27_000, 96_000, 41_000, 330, 2_100],
  ] as const;
  const candidates = rows.map(([symbol, name, priceUsd, change24h, liquidityUsd, volumeH24, mcapUsd, tradesH24, ageMinutes]) => {
    const stats = { ageMinutes, liquidityUsd, volumeH24, mcapUsd, tradesH24 };
    return {
      address: `demo-${symbol}`,
      symbol,
      name,
      url: "https://dexscreener.com/solana",
      priceUsd,
      change24h,
      change5m: change24h / 60,
      change1h: change24h / 8,
      change6h: change24h / 3,
      buysH1: Math.round(tradesH24 / 40),
      sellsH1: Math.round(tradesH24 / 50),
      buysM5: Math.round(tradesH24 / 400),
      sellsM5: Math.round(tradesH24 / 500),
      volumeH1: volumeH24 / 20,
      websites: [],
      socials: [],
      ...stats,
      ...vet(stats),
    };
  }).map((c) => ({ ...c, heat: heatOf(c) }));
  return { scanned: 30, candidates: sortCandidates(candidates) };
}
