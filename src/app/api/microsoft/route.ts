import { connection } from "next/server";
import { guard, readBody } from "@/lib/server/guard";
import { MicrosoftFehler } from "@/lib/server/microsoft";
import { microsoftAktion, microsoftStand, UnbekannteAktion, type MicrosoftAktion } from "@/lib/server/microsoft-aktionen";

// Microsoft 365 in den Einstellungen: Verzeichnis und Anwendung eintragen, anmelden, trennen und der Schalter,
// ob Outlook-Termine den Mac verlassen dürfen. Ein Schlüssel von Microsoft geht nie an die Seite.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await microsoftStand());
}

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<MicrosoftAktion>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  try {
    return Response.json(await microsoftAktion(body));
  } catch (e) {
    if (e instanceof UnbekannteAktion) return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
    if (e instanceof MicrosoftFehler) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
