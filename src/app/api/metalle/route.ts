import { connection } from "next/server";
import { protokolliere } from "@/lib/server/gateway/audit";
import { guard, readBody } from "@/lib/server/guard";
import { MetalleError, metalleSnapshot, refreshMetalle, saveMetalleSettings } from "@/lib/server/metalle";
import { starteZeitplan } from "@/lib/server/zeitplan-aufgaben";

// Edelmetalle: das Lagebild für Gold und Silber. Lesen fragt niemanden; „aktualisieren“ holt die Tageskurse
// bei Twelve Data (zwei bis drei Abrufe aus dem Kontingent des Plans, kein KI-Modell).

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  starteZeitplan();
  return Response.json(await metalleSnapshot());
}

type Action = { action: "aktualisieren" } | { action: "einstellungen"; auto?: boolean; zeiten?: string[] };

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Action>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  starteZeitplan();
  try {
    if (body.action === "aktualisieren") {
      await refreshMetalle();
      // Ein Start von Hand verbraucht Abrufe aus dem Kontingent bei Twelve Data; deshalb steht er im Audit-Log.
      await protokolliere({ art: "werkzeug", agent: "mensch", kanal: "mac", was: "Edelmetalle: Lagebild von Hand gestartet", ergebnis: "ausgefuehrt" });
    } else if (body.action === "einstellungen") {
      await saveMetalleSettings(body);
    } else {
      return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof MetalleError) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
  return Response.json(await metalleSnapshot());
}
