import { connection } from "next/server";
import { crawlTrail, startDesk } from "@/lib/server/desk/engine";
import { guard } from "@/lib/server/guard";

// Die Spur des Crawlers für die Spinne auf dem Trading-Desk: jeder Schritt seit ?nach=<seq>.
// Die Seite fragt jede Sekunde; das kostet nichts, es liest nur aus dem Speicher.
export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  startDesk();
  const after = Number(new URL(request.url).searchParams.get("nach")) || 0;
  return Response.json(await crawlTrail(after));
}
