// Nachgebauter xAI-Server (Grok, Responses-API). Jede Anfrage bekommt die nächste Antwort aus der Liste;
// so lassen sich Lagebilder, Warnungen, Kosten und Fehler nachstellen, ohne dass echtes Geld fließt.

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export type XaiAntwort = { status?: number; antwort?: unknown; text?: string; kostenUsd?: number; fehler?: string };

export type XaiMock = {
  url: string;
  anfragen: { auth: string; body: Record<string, unknown> }[];
  naechste: (antworten: XaiAntwort[]) => void;
  // So lange lässt sich Grok ab jetzt mit jeder Antwort Zeit (das echte braucht eine halbe Minute und mehr).
  // Gilt, bis ein anderer Wert gesetzt wird, auch über `naechste` hinweg; `bedenkzeit(0)` stellt es ab.
  bedenkzeit: (ms: number) => void;
  stop: () => Promise<void>;
};

export async function starteXaiMock(): Promise<XaiMock> {
  let liste: XaiAntwort[] = [];
  let wartezeit = 0;
  const wartend = new Set<NodeJS.Timeout>();
  const anfragen: XaiMock["anfragen"] = [];
  const server: Server = createServer((req, res) => {
    let roh = "";
    req.on("data", (c) => (roh += c));
    req.on("end", () => {
      if (req.url?.startsWith("/v1/models")) return void res.writeHead(200, { "content-type": "application/json" }).end("{}");
      if (req.method !== "POST" || !req.url?.startsWith("/v1/responses")) return void res.writeHead(404).end();
      anfragen.push({ auth: String(req.headers.authorization ?? ""), body: JSON.parse(roh) as Record<string, unknown> });
      const a = liste.shift() ?? { antwort: {} };
      const status = a.status ?? 200;
      const antworte = () => {
        if (status !== 200) return void res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify({ error: { message: a.fehler ?? "Testfehler" } }));
        res.writeHead(200, { "content-type": "application/json" }).end(
          JSON.stringify({
            status: "completed",
            output: [{ type: "message", content: [{ type: "output_text", text: a.text ?? JSON.stringify(a.antwort) }] }],
            usage: { cost_in_usd_ticks: Math.round((a.kostenUsd ?? 0.1) * 1e10) },
          }),
        );
      };
      if (wartezeit <= 0) return antworte();
      const uhr = setTimeout(() => {
        wartend.delete(uhr);
        antworte();
      }, wartezeit);
      wartend.add(uhr);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    anfragen,
    naechste: (antworten) => {
      liste = [...antworten];
      anfragen.length = 0;
    },
    bedenkzeit: (ms) => {
      wartezeit = ms;
    },
    stop: () =>
      new Promise((resolve) => {
        // Wer noch auf seine Antwort wartet, bekommt keine mehr: Die Verbindung reißt ab, wie bei einem Ausfall.
        for (const uhr of wartend) clearTimeout(uhr);
        wartend.clear();
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}
