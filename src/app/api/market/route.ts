import { connection } from "next/server";
import { getMarketSnapshot, type MarketSnapshot } from "@/lib/market";
import { guard } from "@/lib/server/guard";

// Mehrere Ansichten fragen die Kurse ab; innerhalb von 15 Sekunden bekommen alle dieselbe Antwort,
// damit CoinGecko und DexScreener nicht zu oft angefragt werden.
let last: { at: number; data: MarketSnapshot } | null = null;

export async function GET(request: Request) {
  // Immer frische Kurse: diese Route läuft bei jeder Anfrage neu.
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  if (!last || Date.now() - last.at > 15_000) last = { at: Date.now(), data: await getMarketSnapshot() };
  return Response.json(last.data);
}
