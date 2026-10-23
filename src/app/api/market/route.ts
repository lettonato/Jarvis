import { connection } from "next/server";
import { getMarketSnapshot } from "@/lib/market";

export async function GET() {
  // Immer frische Kurse: diese Route läuft bei jeder Anfrage neu.
  await connection();
  return Response.json(await getMarketSnapshot());
}
