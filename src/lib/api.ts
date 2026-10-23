"use client";

// Anfragen an den JARVIS-Server. Änderungen tragen den Header x-jarvis, sonst lehnt der Server sie ab.

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? `Der Server antwortet mit ${res.status}.`, res.status);
  return data;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function getJson<T>(url: string): Promise<T> {
  return parse<T>(await fetch(url, { cache: "no-store" }));
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  return parse<T>(
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-jarvis": "1" },
      body: JSON.stringify(body),
    }),
  );
}
