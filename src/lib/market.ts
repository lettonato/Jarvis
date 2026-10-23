import { vet, type Check } from "./vet";

// Marktdaten für Phase 1: nur lesen, kein Handel.
// Große Coins kommen von CoinGecko, neue Solana-Memecoins von DexScreener.
// Beide APIs sind ohne Schlüssel nutzbar. Ist eine nicht erreichbar, zeigt das
// Dashboard klar gekennzeichnete Beispieldaten statt einer leeren Seite.

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
  liquidityUsd: number;
  volumeH24: number;
  mcapUsd: number;
  tradesH24: number;
  ageMinutes: number;
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
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=eur&include_24hr_change=true`,
  );
  return MAJORS.map((m) => ({
    ...m,
    eur: data[m.id]?.eur ?? 0,
    change24h: data[m.id]?.eur_24h_change ?? 0,
  }));
}

type DexListing = { chainId: string; tokenAddress: string };

type DexPair = {
  url: string;
  baseToken: { address: string; name: string; symbol: string };
  priceUsd?: string;
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  txns?: { h24?: { buys?: number; sells?: number } };
  marketCap?: number;
  fdv?: number;
  pairCreatedAt?: number;
};

// DexScreener nimmt höchstens 30 Adressen pro Abfrage.
const MAX_TOKENS = 30;

async function fetchCandidates(): Promise<{ scanned: number; candidates: Candidate[] }> {
  const lists = await Promise.allSettled([
    getJson<DexListing[]>("https://api.dexscreener.com/token-boosts/top/v1"),
    getJson<DexListing[]>("https://api.dexscreener.com/token-profiles/latest/v1"),
  ]);
  const listings = lists.flatMap((l) => (l.status === "fulfilled" ? l.value : []));
  if (listings.length === 0) throw new Error("DexScreener liefert keine Token-Listen");

  const addresses = [
    ...new Set(listings.filter((l) => l.chainId === "solana").map((l) => l.tokenAddress)),
  ].slice(0, MAX_TOKENS);
  if (addresses.length === 0) return { scanned: 0, candidates: [] };

  const pairs = await getJson<DexPair[]>(
    `https://api.dexscreener.com/tokens/v1/solana/${addresses.join(",")}`,
  );

  // Pro Token zählt das Handelspaar mit der meisten Liquidität.
  const best = new Map<string, DexPair>();
  for (const pair of pairs) {
    const current = best.get(pair.baseToken.address);
    if (!current || (pair.liquidity?.usd ?? 0) > (current.liquidity?.usd ?? 0)) {
      best.set(pair.baseToken.address, pair);
    }
  }

  const now = Date.now();
  const candidates = [...best.values()].map((pair) => {
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
      ...stats,
      ...vet(stats),
    };
  });

  return { scanned: addresses.length, candidates: sortCandidates(candidates) };
}

function sortCandidates(list: Candidate[]): Candidate[] {
  return list.sort((a, b) => Number(b.passed) - Number(a.passed) || b.volumeH24 - a.volumeH24);
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
      ...stats,
      ...vet(stats),
    };
  });
  return { scanned: 30, candidates: sortCandidates(candidates) };
}
