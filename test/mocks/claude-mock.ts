// Nachgebauter Claude-Server (Anthropic Messages API mit Streaming). Er antwortet nach einem Drehbuch:
// Jede Anfrage nimmt den nächsten Zug. Ein Zug ist entweder Text oder ein Werkzeugaufruf. So lässt sich
// auch ein Modell nachstellen, das einer eingeschleusten Anweisung folgt, ohne echte Kosten oder Daten.

import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

// abbruch: Die Antwort beginnt (die Eingabe ist damit gezählt) und die Verbindung reißt mittendrin ab.
export type Zug = { text: string } | { werkzeug: string; eingabe: Record<string, unknown> } | { abbruch: true };

export type ClaudeMock = {
  url: string;
  drehbuch: (zuege: Zug[]) => void;
  // Eine feste Antwort auf jede Anfrage an ein Modell, solange das Drehbuch leer ist. Für die Schau: Der Chief
  // des Desks fragt mit einem eigenen Modell und bekommt so eine Bewertung, das Gespräch bleibt beim Üblichen.
  immer: (modell: string, zug: Zug) => void;
  // Jede Antwort kommt erst nach so vielen Millisekunden (0: sofort). Damit eine Seite den Zustand „arbeitet“
  // zeigen und ein Abbruch mitten in der Arbeit geprüft werden kann.
  bedenkzeit: (ms: number) => void;
  anfragen: Record<string, unknown>[];
  stop: () => Promise<void>;
};

const body = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });

export async function starteClaudeMock(): Promise<ClaudeMock> {
  let zuege: Zug[] = [];
  const fest = new Map<string, Zug>();
  const anfragen: Record<string, unknown>[] = [];
  let n = 0;
  let wartenMs = 0;
  const server: Server = createServer(async (req, res) => {
    const raw = await body(req);
    if (req.method === "GET" && req.url?.startsWith("/v1/models")) {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ id: "claude-opus-5-5", type: "model" }));
      return;
    }
    if (req.method !== "POST" || !req.url?.startsWith("/v1/messages")) {
      res.writeHead(404).end();
      return;
    }
    const anfrage = JSON.parse(raw) as Record<string, unknown>;
    anfragen.push(anfrage);
    // Der Zug steht fest, bevor gewartet wird: Sonst nähme eine längst abgebrochene Anfrage später einen Zug
    // aus dem Drehbuch eines anderen Schritts.
    const zug = zuege.shift() ?? fest.get(String(anfrage.model)) ?? { text: "Erledigt." };
    if (wartenMs > 0) {
      const abgebrochen = await new Promise<boolean>((fertig) => {
        const uhr = setTimeout(() => fertig(false), wartenMs);
        res.once("close", () => {
          clearTimeout(uhr);
          fertig(true);
        });
      });
      // Der Anrufer hat aufgelegt (Abbruch, Neustart): Es gibt niemanden mehr, dem zu antworten wäre.
      if (abgebrochen) return;
    }
    const id = `msg_${++n}`;
    // Wie bei Anthropic steht in der Antwort das Modell, das geantwortet hat: hier immer das angefragte.
    const model = typeof anfrage.model === "string" ? anfrage.model : "claude-opus-5-5";
    if ("abbruch" in zug) {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      res.write(`event: message_start\ndata: ${JSON.stringify({ type: "message_start", message: { id, type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } })}\n\n`);
      setTimeout(() => res.destroy(), 50);
      return;
    }
    // Ohne Streaming (Browser-Agent, Chief) kommt die ganze Antwort als ein JSON.
    if (anfrage.stream !== true) {
      const content = "text" in zug ? [{ type: "text", text: zug.text }] : [{ type: "tool_use", id: `toolu_${n}`, name: zug.werkzeug, input: zug.eingabe }];
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({ id, type: "message", role: "assistant", model, content, stop_reason: "text" in zug ? "end_turn" : "tool_use", stop_sequence: null, usage: { input_tokens: 10, output_tokens: 5 } }),
      );
      return;
    }
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    send("message_start", {
      type: "message_start",
      message: { id, type: "message", role: "assistant", model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } },
    });
    if ("text" in zug) {
      send("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } });
      send("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: zug.text } });
      send("content_block_stop", { type: "content_block_stop", index: 0 });
      send("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 5 } });
    } else {
      send("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "tool_use", id: `toolu_${n}`, name: zug.werkzeug, input: {} } });
      send("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: JSON.stringify(zug.eingabe) } });
      send("content_block_stop", { type: "content_block_stop", index: 0 });
      send("message_delta", { type: "message_delta", delta: { stop_reason: "tool_use", stop_sequence: null }, usage: { output_tokens: 5 } });
    }
    send("message_stop", { type: "message_stop" });
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    drehbuch: (z) => {
      zuege = [...z];
      anfragen.length = 0;
    },
    immer: (modell, zug) => void fest.set(modell, zug),
    bedenkzeit: (ms) => void (wartenMs = ms),
    anfragen,
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

// Was JARVIS dem Modell als Ergebnis eines Werkzeugs zurückgegeben hat (aus der letzten Anfrage).
export function werkzeugErgebnisse(anfrage: Record<string, unknown>): { content: string; is_error?: boolean }[] {
  const messages = anfrage.messages as { role: string; content: unknown }[];
  const out: { content: string; is_error?: boolean }[] = [];
  for (const m of messages) {
    if (!Array.isArray(m.content)) continue;
    for (const block of m.content as { type: string; content?: unknown; is_error?: boolean }[]) {
      if (block.type !== "tool_result") continue;
      const content = typeof block.content === "string" ? block.content : JSON.stringify(block.content);
      out.push({ content, is_error: block.is_error });
    }
  }
  return out;
}
