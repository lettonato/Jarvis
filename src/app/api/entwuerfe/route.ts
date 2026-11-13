import { connection } from "next/server";
import { aendereEntwurf, EntwurfFehler, entwuerfeSnapshot, verwirfEntwurf } from "@/lib/server/entwuerfe";
import { guard, readBody } from "@/lib/server/guard";

// Antwortentwürfe: lesen, den Text ändern, verwerfen. Angelegt wird ein Entwurf nur im Gespräch mit JARVIS
// (Werkzeug antwort_entwerfen). Senden gibt es hier nicht und nirgends sonst in JARVIS.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await entwuerfeSnapshot());
}

type Action = { action: "aendern"; id?: string; text?: string } | { action: "verwerfen"; id?: string };

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Action>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  try {
    if (body.action === "aendern") await aendereEntwurf(body.id, body.text);
    else if (body.action === "verwerfen") await verwirfEntwurf(body.id);
    else return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (e) {
    if (e instanceof EntwurfFehler) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
  return Response.json(await entwuerfeSnapshot());
}
