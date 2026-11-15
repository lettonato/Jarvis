// Nachgebauter Markt für den Spielgeld-Desk: DexScreener (Listen und Kurse), GeckoTerminal (Trends),
// CoinGecko (Bitcoin und Co.) und RugCheck (Blockchain-Bericht) auf einem einzigen Server. Die Antworten
// haben die Form der echten Dienste, so weit JARVIS sie liest. So lässt sich der ganze Kaufpfad prüfen,
// ohne dass eine Anfrage das Haus verlässt. Es bleibt Spielgeld: Der Desk hat keine Börsenanbindung.

import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export type MockCoin = {
  address: string;
  symbol: string;
  preis: number;
  liquiditaet: number;
  volumen24: number;
  volumen1h: number;
  marktwert: number;
  alterMinuten: number;
  handel: { h24: [number, number]; h1: [number, number]; m5: [number, number] };
  aenderung: { m5: number; h1: number; h6: number; h24: number };
  webseiten: string[];
  konten: { type: string; url: string }[];
  // Blockchain-Bericht bei RugCheck: Anteile der größten Halter in Prozent und die Rug-Zeichen.
  kette: { halter: number[]; mint?: boolean; freeze?: boolean; rugged?: boolean; gefahr?: string[]; status?: number };
  // Steht der Coin in den Listen neuer Coins? Verschwunden heißt: DexScreener kennt kein Handelspaar mehr.
  gelistet: boolean;
  verschwunden?: boolean;
};

const adresse = (symbol: string) => `${symbol}${"1".repeat(44)}`.slice(0, 44);

// Ein Coin, der alle harten Filter besteht, gerade frisches Geld bekommt und eine saubere Blockchain hat.
export function guterCoin(symbol: string, mehr: Partial<MockCoin> = {}): MockCoin {
  return {
    address: adresse(symbol),
    symbol,
    preis: 0.002,
    liquiditaet: 200_000,
    volumen24: 600_000,
    volumen1h: 80_000,
    marktwert: 900_000,
    alterMinuten: 120,
    handel: { h24: [1400, 800], h1: [400, 200], m5: [40, 15] },
    aenderung: { m5: 4, h1: 18, h6: 30, h24: 45 },
    webseiten: [],
    konten: [
      { type: "twitter", url: `https://x.com/${symbol.toLowerCase()}` },
      { type: "telegram", url: `https://t.me/${symbol.toLowerCase()}` },
    ],
    kette: { halter: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3] },
    gelistet: true,
    ...mehr,
  };
}

export type MarktMock = {
  url: string;
  coins: MockCoin[];
  // Alle Pfade, die abgefragt wurden.
  anfragen: string[];
  // Für welche Adressen der Blockchain-Bericht geholt wurde.
  kettenAbfragen: () => string[];
  // Wird vor jeder Kursabfrage gerufen (n zählt ab 1), um den Markt mitten in einer Runde zu bewegen.
  vorKursen: ((adressen: string[], n: number) => void) | null;
  // Dienste ausfallen lassen.
  aus: { dexscreener?: boolean; rugcheck?: boolean; coingecko?: boolean };
  // Veränderung in 24 Stunden in Prozent für Bitcoin, Ethereum und Solana bei CoinGecko.
  majors: { bitcoin: number; ethereum: number; solana: number };
  leeren: () => void;
  stop: () => Promise<void>;
};

export async function starteMarktMock(): Promise<MarktMock> {
  const coins: MockCoin[] = [];
  const anfragen: string[] = [];
  let kursAbfragen = 0;
  const json = (res: ServerResponse, status: number, daten: unknown) => res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(daten));

  const paar = (c: MockCoin) => ({
    chainId: "solana",
    url: `https://dexscreener.com/solana/${c.address}`,
    baseToken: { address: c.address, name: c.symbol, symbol: c.symbol },
    priceUsd: String(c.preis),
    priceChange: c.aenderung,
    liquidity: { usd: c.liquiditaet },
    volume: { m5: c.volumen1h / 12, h1: c.volumen1h, h24: c.volumen24 },
    txns: Object.fromEntries(Object.entries(c.handel).map(([k, [buys, sells]]) => [k, { buys, sells }])),
    marketCap: c.marktwert,
    fdv: c.marktwert,
    pairCreatedAt: Date.now() - c.alterMinuten * 60_000,
    info: { websites: c.webseiten.map((url) => ({ url })), socials: c.konten },
  });

  const bericht = (c: MockCoin) => ({
    mintAuthority: c.kette.mint ? "Entwickler1111111111111111111111111111111111" : null,
    freezeAuthority: c.kette.freeze ? "Entwickler1111111111111111111111111111111111" : null,
    creator: null,
    rugged: Boolean(c.kette.rugged),
    score_normalised: 12,
    topHolders: c.kette.halter.map((pct, i) => ({ address: `Halter${i}`, owner: `Besitzer${i}`, pct, insider: false })),
    risks: (c.kette.gefahr ?? []).map((name) => ({ name, level: "danger" })),
    markets: [{ pubkey: "Pool1", liquidityAAccount: "PoolA", liquidityBAccount: "PoolB", lp: { lpLockedPct: 98 } }],
  });

  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://mock");
    const pfad = url.pathname;
    anfragen.push(pfad);
    const dex = /^\/(token-boosts|token-profiles|tokens)\//.test(pfad);
    if (dex && mock.aus.dexscreener) return json(res, 503, { error: "wartung" });
    if (pfad === "/token-boosts/top/v1") return json(res, 200, coins.filter((c) => c.gelistet).map((c) => ({ chainId: "solana", tokenAddress: c.address })));
    if (pfad === "/token-boosts/latest/v1" || pfad === "/token-profiles/latest/v1") return json(res, 200, []);
    const kurse = /^\/tokens\/v1\/solana\/(.+)$/.exec(pfad);
    if (kurse) {
      const adressen = decodeURIComponent(kurse[1]).split(",");
      mock.vorKursen?.(adressen, ++kursAbfragen);
      return json(res, 200, coins.filter((c) => adressen.includes(c.address) && !c.verschwunden).map(paar));
    }
    if (pfad === "/api/v2/networks/solana/trending_pools") return json(res, 200, { data: [] });
    if (pfad === "/api/v3/simple/price") {
      if (mock.aus.coingecko) return json(res, 503, { error: "aus" });
      return json(res, 200, { bitcoin: { eur: 92_450, eur_24h_change: mock.majors.bitcoin }, ethereum: { eur: 3_310, eur_24h_change: mock.majors.ethereum }, solana: { eur: 168, eur_24h_change: mock.majors.solana } });
    }
    const kette = /^\/v1\/tokens\/([^/]+)\/report$/.exec(pfad);
    if (kette) {
      const c = coins.find((x) => x.address === decodeURIComponent(kette[1]));
      if (mock.aus.rugcheck) return json(res, 503, { error: "wartung" });
      if (!c) return json(res, 404, { error: "not found" });
      if (c.kette.status) return json(res, c.kette.status, { error: "fehler" });
      return json(res, 200, bericht(c));
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const mock: MarktMock = {
    url: `http://127.0.0.1:${port}`,
    coins,
    anfragen,
    kettenAbfragen: () => anfragen.map((p) => /^\/v1\/tokens\/([^/]+)\/report$/.exec(p)?.[1]).filter((x): x is string => Boolean(x)),
    vorKursen: null,
    aus: {},
    majors: { bitcoin: -1.2, ethereum: 0.4, solana: 2.1 },
    leeren: () => {
      anfragen.length = 0;
      kursAbfragen = 0;
      mock.vorKursen = null;
      mock.aus = {};
    },
    stop: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
  return mock;
}
