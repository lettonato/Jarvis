import { connection } from "next/server";
import { DesktopError, oeffneAufZuruf } from "@/lib/server/desktop";
import { guard, readBody } from "@/lib/server/guard";

// Öffnet ein Programm oder einen Ordner am Mac, wenn du es sagst („Jarvis, öffne Excel“) oder in den Einstellungen
// auf „Öffnen“ tippst. Die Seite nennt nur die Kennung; was geöffnet werden darf, entscheidet die Liste auf dem
// Server (src/lib/server/desktop.ts).
export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<{ id?: unknown }>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  try {
    const ziel = await oeffneAufZuruf(body.id);
    return Response.json({ geoeffnet: ziel.name });
  } catch (e) {
    if (e instanceof DesktopError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
