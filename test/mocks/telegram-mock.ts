// Nachgebauter Telegram-Server (Bot-API). Er merkt sich, was JARVIS sendet, und liefert beim Abholen
// die Nachrichten und Knopfdrücke aus, die ein Test hineinlegt. So lässt sich prüfen, wem JARVIS
// antwortet und wem nicht, ohne ein echtes Handy und ohne echten Bot.

import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export type Gesendet = { methode: string; token: string; body: Record<string, unknown> };

export type TelegramMock = {
  url: string;
  gesendet: Gesendet[];
  // Texte, die an einen Chat gingen (sendMessage und geänderte Nachrichten).
  texteAn: (chatId: number) => string[];
  nachricht: (chatId: number, text: string, extra?: { type?: string; vorSekunden?: number; name?: string }) => void;
  knopf: (vonId: number, chatId: number, messageId: number, data: string) => void;
  // Fehler für die nächste Anfrage einer Methode, z. B. { sendMessage: 403 }.
  fehler: Record<string, number>;
  leeren: () => void;
  stop: () => Promise<void>;
};

const lies = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    const teile: Buffer[] = [];
    req.on("data", (c: Buffer) => teile.push(c));
    req.on("end", () => resolve(Buffer.concat(teile).toString("utf8")));
  });

export async function starteTelegramMock(bot = "jarvis_test_bot"): Promise<TelegramMock> {
  const gesendet: Gesendet[] = [];
  const wartend: Record<string, unknown>[] = [];
  const fehler: Record<string, number> = {};
  let updateId = 100;
  let messageId = 500;

  const server: Server = createServer(async (req, res) => {
    const m = /^\/bot([^/]+)\/([A-Za-z]+)/.exec(req.url ?? "");
    if (!m || req.method !== "POST") return void res.writeHead(404).end();
    const [, token, methode] = m;
    const roh = await lies(req);
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(roh) as Record<string, unknown>;
    } catch {
      // Dateien kommen als Formular; für die Tests reicht, dass etwas kam.
      body = { formular: true, laenge: roh.length, chat_id: Number(/name="chat_id"\r\n\r\n(\d+)/.exec(roh)?.[1]), caption: /name="caption"\r\n\r\n([^\r]*)/.exec(roh)?.[1] };
    }
    const antworte = (result: unknown) => res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, result }));
    if (fehler[methode]) {
      const code = fehler[methode];
      delete fehler[methode];
      gesendet.push({ methode: `${methode}:fehler`, token, body });
      return void res.writeHead(code, { "content-type": "application/json" }).end(JSON.stringify({ ok: false, error_code: code, description: "Testfehler" }));
    }
    if (methode === "getUpdates") {
      // Kurz warten wie beim echten Abholen, dann liefern, was da ist.
      const bis = Date.now() + 150;
      while (!wartend.length && Date.now() < bis) await new Promise((r) => setTimeout(r, 15));
      const offset = Number(body.offset ?? 0);
      const neu = wartend.filter((u) => Number(u.update_id) >= offset);
      wartend.length = 0;
      return antworte(neu);
    }
    gesendet.push({ methode, token, body });
    if (methode === "getMe") return antworte({ id: 1, is_bot: true, username: bot });
    if (methode === "sendMessage" || methode === "sendDocument") return antworte({ message_id: ++messageId });
    return antworte(true);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    gesendet,
    texteAn: (chatId) => gesendet.filter((g) => (g.methode === "sendMessage" || g.methode === "editMessageText") && g.body.chat_id === chatId).map((g) => String(g.body.text)),
    nachricht: (chatId, text, extra = {}) =>
      void wartend.push({
        update_id: ++updateId,
        message: { message_id: ++messageId, date: Math.floor(Date.now() / 1000) - (extra.vorSekunden ?? 0), chat: { id: chatId, type: extra.type ?? "private", first_name: extra.name ?? "Test" }, from: { first_name: extra.name ?? "Test" }, text },
      }),
    knopf: (vonId, chatId, mid, data) => void wartend.push({ update_id: ++updateId, callback_query: { id: `cb${updateId}`, from: { id: vonId }, message: { message_id: mid, chat: { id: chatId, type: "private" } }, data } }),
    fehler,
    leeren: () => {
      gesendet.length = 0;
    },
    stop: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
