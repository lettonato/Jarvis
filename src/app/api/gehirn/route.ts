import { connection } from "next/server";
import type { BrainRequest } from "@/lib/brain";
import { brainKey, explainBrainError, think } from "@/lib/server/brain";
import { readConfig } from "@/lib/server/config";
import { guard, readBody } from "@/lib/server/guard";

// Ein Satz, den keine feste Regel versteht, geht hierher: Claude antwortet und ändert, wenn du es
// sagst, Aufgaben und Mails. Wie die Schreib-Schnittstellen nur von diesem Mac aus erreichbar.

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<BrainRequest>(request);
  if (!body || typeof body.text !== "string" || !body.text.trim()) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const config = await readConfig();
  const apiKey = brainKey(config);
  if (!apiKey) return Response.json({ error: "Das KI-Gehirn ist noch nicht eingerichtet. Den Schlüssel trägst du in den Einstellungen ein." }, { status: 409 });
  const input: BrainRequest = {
    text: body.text,
    history: Array.isArray(body.history) ? body.history.filter((t) => t && typeof t.text === "string" && (t.who === "du" || t.who === "jarvis")) : [],
    view: typeof body.view === "string" ? body.view : "/",
    focus: body.focus && (body.focus.kind === "post" || body.focus.kind === "aufgaben") ? body.focus : null,
    extra: Array.isArray(body.extra) ? body.extra.filter((l): l is string => typeof l === "string") : [],
  };
  try {
    return Response.json(await think(config, apiKey, input));
  } catch (e) {
    return Response.json({ error: explainBrainError(e) }, { status: 502 });
  }
}
