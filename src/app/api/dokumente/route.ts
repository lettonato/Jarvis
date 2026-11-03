import { connection } from "next/server";
import { brainKey, explainBrainError } from "@/lib/server/brain";
import { CalendarError } from "@/lib/server/calendar";
import { readConfig } from "@/lib/server/config";
import { cancelDocument, DocError, documentsSnapshot, openDocument, openFolder, startDocument } from "@/lib/server/documents";
import { guard, readBody } from "@/lib/server/guard";

// Dokumente: Stand abfragen, ein Dokument in Auftrag geben oder abbrechen, und Fertiges am Mac öffnen.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await documentsSnapshot());
}

type Action =
  | { action: "erstellen"; thema: string; auftrag?: string }
  | { action: "abbrechen" }
  | { action: "oeffnen"; id: string }
  | { action: "finder"; id: string }
  | { action: "ordner" };

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Action>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const id = "id" in body && typeof body.id === "string" ? body.id : null;
  try {
    if (body.action === "erstellen") {
      const config = await readConfig();
      const apiKey = brainKey(config);
      if (!apiKey) return Response.json({ error: "Für Dokumente braucht JARVIS das KI-Gehirn. Den Claude-Schlüssel trägst du in den Einstellungen ein." }, { status: 409 });
      await startDocument(config, apiKey, { thema: body.thema, auftrag: body.auftrag ?? "", from: "mac" });
    } else if (body.action === "abbrechen") {
      await cancelDocument();
    } else if (body.action === "oeffnen" || body.action === "finder") {
      if (!id) return Response.json({ error: "Welches Dokument?" }, { status: 400 });
      await openDocument(id, body.action === "finder");
    } else if (body.action === "ordner") {
      await openFolder();
    } else {
      return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof DocError || e instanceof CalendarError) return Response.json({ error: e.message }, { status: 409 });
    return Response.json({ error: explainBrainError(e) }, { status: 500 });
  }
  return Response.json(await documentsSnapshot());
}
