import { connection } from "next/server";
import type { BrainEvent, BrainRequest } from "@/lib/brain";
import { brainKey, explainBrainError, think } from "@/lib/server/brain";
import { readConfig } from "@/lib/server/config";
import { guard, readBody } from "@/lib/server/guard";

// Ein Satz, den keine feste Regel versteht, geht hierher: Claude antwortet und ändert, wenn du es
// sagst, Aufgaben und Mails. Die Antwort kommt Stück für Stück, eine Zeile JSON pro Ereignis, damit
// JARVIS schon spricht, während Claude noch schreibt. Wie die Schreib-Schnittstellen nur von diesem Mac aus.

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

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (event: BrainEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };
      try {
        send({ type: "done", reply: await think(config, apiKey, input, send, request.signal) });
      } catch (e) {
        // Hat die Seite abgebrochen („Jarvis, stopp“), hört niemand mehr zu.
        if (!request.signal.aborted) send({ type: "error", error: explainBrainError(e) });
      } finally {
        open = false;
        try {
          controller.close();
        } catch {
          // Schon zu.
        }
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
