// Nachgebautes Twelve Data für Tageskurse (/time_series). Je Symbol eine Kursreihe oder ein Fehler; dazu ein
// Schalter für einen Fehler der ganzen Antwort. Wie beim echten Dienst kommen Fehler mit Status 200 und einem
// code im Text, und bei mehreren Symbolen steht jede Reihe unter ihrem Symbol.

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export type TwelveTag = { datetime: string; open: string; high: string; low: string; close: string };
export type TwelveMock = {
  url: string;
  reihen: Record<string, TwelveTag[] | { code: number; message: string }>;
  // Gesetzt: Die ganze Antwort ist dieser Fehler.
  fehler: { code: number; message: string } | null;
  anfragen: { pfad: string; schluessel: string | null }[];
  stop: () => Promise<void>;
};

// Tageskerzen, die an endTag enden; kurse[0] ist der älteste Tag. Zurück kommt wie bei Twelve Data die neueste zuerst.
export function tagesreihe(kurse: number[], endTag: string): TwelveTag[] {
  const ende = Date.parse(`${endTag}T00:00:00Z`);
  return kurse
    .map((close, i) => {
      const datetime = new Date(ende - (kurse.length - 1 - i) * 86_400_000).toISOString().slice(0, 10);
      return { datetime, open: String(close), high: String(close * 1.01), low: String(close * 0.99), close: String(close) };
    })
    .reverse();
}

export async function starteTwelveMock(): Promise<TwelveMock> {
  const mock: TwelveMock = { url: "", reihen: {}, fehler: null, anfragen: [], stop: async () => {} };
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://mock");
    mock.anfragen.push({ pfad: req.url ?? "", schluessel: req.headers.authorization ?? null });
    const json = (body: unknown) => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(body));
    if (url.pathname !== "/time_series") return void res.writeHead(404).end();
    if (mock.fehler) return json({ status: "error", ...mock.fehler });
    const symbole = (url.searchParams.get("symbol") ?? "").split(",").filter(Boolean);
    const menge = Number(url.searchParams.get("outputsize") ?? 30);
    const eine = (symbol: string) => {
      const r = mock.reihen[symbol];
      if (!r) return { status: "error", code: 404, message: `symbol ${symbol} not found` };
      return Array.isArray(r) ? { status: "ok", meta: { symbol, interval: url.searchParams.get("interval") }, values: r.slice(0, menge) } : { status: "error", ...r };
    };
    json(symbole.length === 1 ? eine(symbole[0]) : Object.fromEntries(symbole.map((s) => [s, eine(s)])));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  mock.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  mock.stop = () => new Promise((resolve) => server.close(() => resolve()));
  return mock;
}
