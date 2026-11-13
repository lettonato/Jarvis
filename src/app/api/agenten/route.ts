import { connection } from "next/server";
import { agentenSnapshot } from "@/lib/server/agenten";
import { guard } from "@/lib/server/guard";

// Die Agentensteuerung: Zustand, letzter und nächster Lauf, Kosten und Grenzen aller Agenten. Nur lesen.
// Starten, Pausieren und Sperren gehen über /api/intel, /api/handel und /api/sicherheit mit deren Prüfungen.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await agentenSnapshot());
}
