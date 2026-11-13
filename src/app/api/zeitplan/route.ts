import { connection } from "next/server";
import { guard } from "@/lib/server/guard";
import { starteZeitplan, zeitplanSnapshot } from "@/lib/server/zeitplan-aufgaben";

// Der gemeinsame Zeitplan: was JARVIS von selbst tut, in welchem Takt, wann zuletzt und wann als Nächstes.
// Nur lesen. Uhrzeiten ändert man dort, wo die Aufgabe hingehört (Intel, Edelmetalle, Telegram).

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  starteZeitplan();
  return Response.json(await zeitplanSnapshot());
}
