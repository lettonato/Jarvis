import { connection } from "next/server";
import { readConfig } from "@/lib/server/config";
import { aendereEntwurf, EntwurfFehler, entwuerfeSnapshot, mailZumEntwurf, verwirfEntwurf } from "@/lib/server/entwuerfe";
import { guard, readBody } from "@/lib/server/guard";

// Antwortentwürfe: lesen, den Text ändern, verwerfen. Angelegt wird ein Entwurf nur im Gespräch mit JARVIS
// (Werkzeug antwort_entwerfen). Senden gibt es hier nicht und nirgends sonst in JARVIS. „mail“ holt auf deinen
// Klick das Zitat der ursprünglichen Mail und ihre übrigen Empfänger, nur lesend und ohne etwas zu speichern.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await entwuerfeSnapshot());
}

type Action = { action: "aendern"; id?: string; text?: string } | { action: "verwerfen"; id?: string } | { action: "mail"; id?: string };

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Action>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  try {
    if (body.action === "mail") {
      const postfach = (await readConfig()).mail;
      if (!postfach) return Response.json({ error: "Das Postfach ist nicht eingerichtet." }, { status: 409 });
      return Response.json(await mailZumEntwurf(postfach, body.id));
    }
    if (body.action === "aendern") await aendereEntwurf(body.id, body.text);
    else if (body.action === "verwerfen") await verwirfEntwurf(body.id);
    else return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (e) {
    if (e instanceof EntwurfFehler) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
  return Response.json(await entwuerfeSnapshot());
}
