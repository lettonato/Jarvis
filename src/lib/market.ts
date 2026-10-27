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
  // Kurzfristige Bewegung, damit der Chief sieht, ob der Anstieg schon gelaufen ist.
  change1h: number;
  change6h: number;
  liquidityUsd: number;
  volumeH24: number;
  mcapUsd: number;
  tradesH24: number;
  buysH1: number;
  sellsH1: number;
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
  priceChange?: { h1?: number; h6?: number; h24?: number };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  txns?: { h1?: DexTxns; h24?: DexTxns };
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
  info?: { websites?: { url?: string }[]; socials?: { type?: string; url?: string }[] };
};

// DexScreener nimmt höchstens 30 Adressen pro Abfrage.
const MAX_TOKENS = 30;

// Pro Token zählt das Handelspaar mit der meisten Liquidität.
export async function fetchPairs(addresses: string[]): Promise<Map<string, DexPair>> {
  const best = new Map<string, DexPair>();
  for (let i = 0; i < addresses.length; i += MAX_TOKENS) {
    const pairs = await getJson<DexPair[]>(`${DEXSCREENER}/tokens/v1/solana/${addresses.slice(i, i + MAX_TOKENS).join(",")}`);
    for (const pair of pairs) {
      const current = best.get(pair.baseToken.address);
      if (!current || (pair.liquidity?.usd ?? 0) > (current.liquidity?.usd ?? 0)) best.set(pair.baseToken.address, pair);
    }
  }
  return best;
}

async function fetchCandidates(): Promise<{ scanned: number; candidates: Candidate[] }> {
  const lists = await Promise.allSettled([
    getJson<DexListing[]>(`${DEXSCREENER}/token-boosts/top/v1`),
    getJson<DexListing[]>(`${DEXSCREENER}/token-profiles/latest/v1`),
  ]);
  const listings = lists.flatMap((l) => (l.status === "fulfilled" ? l.value : []));
  if (listings.length === 0) throw new Error("DexScreener liefert keine Token-Listen");

  const addresses = [
    ...new Set(listings.filter((l) => l.chainId === "solana").map((l) => l.tokenAddress)),
  ].slice(0, MAX_TOKENS);
  if (addresses.length === 0) return { scanned: 0, candidates: [] };

  const best = await fetchPairs(addresses);
  const now = Date.now();
  const candidates = [...best.values()].map((pair) => toCandidate(pair, now));
  return { scanned: addresses.length, candidates: sortCandidates(candidates) };
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
  return {
    address: pair.baseToken.address,
    symbol: pair.baseToken.symbol,
    name: pair.baseToken.name,
    url: pair.url,
    priceUsd: Number(pair.priceUsd ?? 0),
    change24h: pair.priceChange?.h24 ?? 0,
    change1h: pair.priceChange?.h1 ?? 0,
    change6h: pair.priceChange?.h6 ?? 0,
    buysH1: pair.txns?.h1?.buys ?? 0,
    sellsH1: pair.txns?.h1?.sells ?? 0,
    websites: (pair.info?.websites ?? []).map((w) => w.url).filter(httpsOnly).slice(0, 3),
    socials: (pair.info?.socials ?? [])
      .filter((x): x is { type: string; url: string } => typeof x.type === "string" && httpsOnly(x.url))
      .slice(0, 5),
    ...stats,
    ...vet(stats),
  };
}

function sortCandidates(list: Candidate[]): Candidate[] {
  return list.sort((a, b) => Number(b.passed) - Number(a.passed) || b.volumeH24 - a.volumeH24);
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
      change1h: change24h / 8,
      change6h: change24h / 3,
      buysH1: Math.round(tradesH24 / 40),
      sellsH1: Math.round(tradesH24 / 50),
      websites: [],
      socials: [],
      ...stats,
      ...vet(stats),
    };
  });
  return { scanned: 30, candidates: sortCandidates(candidates) };
}
