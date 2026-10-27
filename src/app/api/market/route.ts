import { connection } from "next/server";
import { marketSnapshot } from "@/lib/market";
import { guard } from "@/lib/server/guard";

export async function GET(request: Request) {
  // Immer frische Kurse: diese Route läuft bei jeder Anfrage neu.
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await marketSnapshot());
}
