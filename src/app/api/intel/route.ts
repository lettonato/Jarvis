import { connection } from "next/server";
import { protokolliere } from "@/lib/server/gateway/audit";
import { guard, readBody } from "@/lib/server/guard";
import { IntelError, intelSnapshot, refreshIntel, saveIntelSettings } from "@/lib/server/intel";
import { starteZeitplan, zeitplanJetzt } from "@/lib/server/zeitplan-aufgaben";

// Intel: das Lagebild aus Nachrichten und X. Lesen kostet nichts; „aktualisieren“ fragt Grok und kostet.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  // Falls der Server ohne Startdatei hochgefahren ist, läuft der Zeitplan spätestens jetzt.
  starteZeitplan();
  void zeitplanJetzt();
  return Response.json(await intelSnapshot());
}

type Action = { action: "aktualisieren"; thema?: string } | { action: "einstellungen"; topics?: string[]; budgetUsd?: number; auto?: boolean };

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Action>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  starteZeitplan();
  try {
    if (body.action === "aktualisieren") {
      const topic = typeof body.thema === "string" && body.thema.trim() ? body.thema : null;
      await refreshIntel(topic);
      // Ein Start von Hand kostet Geld bei xAI; deshalb steht er im Audit-Log. Das Thema bleibt draußen.
      await protokolliere({ art: "werkzeug", agent: "mensch", kanal: "mac", was: topic ? "Intel: gezielte Suche von Hand gestartet" : "Intel: Lagebild von Hand gestartet", ergebnis: "ausgefuehrt" });
    } else if (body.action === "einstellungen") {
      await saveIntelSettings(body);
    } else {
      return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof IntelError) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
  return Response.json(await intelSnapshot());
}
