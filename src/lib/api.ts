"use client";

// Anfragen an den JARVIS-Server. Änderungen tragen den Header x-jarvis, sonst lehnt der Server sie ab.

import { meldeAntwort, meldeKeineAntwort } from "./verbindung";

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? `Der Server antwortet mit ${res.status}.`, res.status);
  return data;
}

// status 0: Es kam keine Antwort (siehe frage). ursache: der Fehler des Browsers dazu, zum Nachsehen.
export class ApiError extends Error {
  constructor(message: string, readonly status: number, ursache?: unknown) {
    super(message, ursache === undefined ? undefined : { cause: ursache });
  }
}

// Antwortet JARVIS gar nicht (beendet, startet gerade neu), wirft der Browser einen Fehler in seiner eigenen Sprache
// („Failed to fetch“, in Safari „Load failed“). Daraus wird ein Satz, den jede Stelle so zeigen und JARVIS im
// Gespräch so sagen kann. Status 0: Es kam keine Antwort. Ein Abbruch von außen (Frist, „Stopp“) bleibt ein Abbruch.
export const NICHT_ERREICHBAR = "JARVIS antwortet gerade nicht. Versuch es gleich noch einmal.";

// Jede Anfrage der Seite an JARVIS geht hier durch und meldet, ob er geantwortet hat (verbindung.ts). Jede Antwort
// zählt, auch eine mit Fehler: JARVIS sagt selbst „502“, wenn etwa das Postfach nicht erreichbar ist.
export async function frage(url: string, init: RequestInit): Promise<Response> {
  const begonnen = Date.now();
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if (init.signal?.aborted) throw e;
    meldeKeineAntwort(begonnen);
    throw new ApiError(NICHT_ERREICHBAR, 0, e);
  }
  meldeAntwort();
  return res;
}

// signal: beendet die Anfrage von außen (die geteilten Abfragen geben nach ihrer Frist auf, siehe geteilt.ts).
export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return parse<T>(await frage(url, { cache: "no-store", signal }));
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  return parse<T>(
    await frage(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-jarvis": "1" },
      body: JSON.stringify(body),
    }),
  );
}

// Eine Antwort, die Stück für Stück kommt: eine Zeile JSON pro Ereignis.
export async function* postStream<T>(url: string, body: unknown, signal?: AbortSignal): AsyncGenerator<T> {
  const res = await frage(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-jarvis": "1" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    await parse(res);
    throw new ApiError(`Der Server antwortet mit ${res.status}.`, res.status);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      // Reißt die Antwort mittendrin ab (JARVIS wird beendet, während er schreibt), gilt dasselbe wie oben: Von
      // diesem Augenblick an fehlt eine Antwort.
      const { done, value } = await reader.read().catch((e: unknown) => {
        if (signal?.aborted) throw e;
        meldeKeineAntwort(Date.now());
        throw new ApiError(NICHT_ERREICHBAR, 0, e);
      });
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = done ? "" : (lines.pop() ?? "");
      for (const line of lines) if (line.trim()) yield JSON.parse(line) as T;
      if (done) return;
    }
  } finally {
    reader.releaseLock();
  }
}
