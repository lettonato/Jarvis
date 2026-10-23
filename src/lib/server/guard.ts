// JARVIS läuft nur auf deinem Mac (127.0.0.1). Dieser Schutz sorgt zusätzlich dafür, dass keine
// fremde Webseite, die du im Browser offen hast, heimlich deine Mails oder Aufgaben liest oder ändert.

const LOCAL_HOST = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;

const forbidden = () => Response.json({ error: "Nur von diesem Mac aus erlaubt." }, { status: 403 });

export function guard(request: Request, { write = false } = {}): Response | null {
  if (!LOCAL_HOST.test(request.headers.get("host") ?? "")) return forbidden();
  if (request.headers.get("sec-fetch-site") === "cross-site") return forbidden();
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (!LOCAL_HOST.test(new URL(origin).host)) return forbidden();
    } catch {
      return forbidden();
    }
  }
  // Ein eigener Header zwingt den Browser bei fremden Seiten zu einer Rückfrage, die JARVIS nie erlaubt.
  if (write && request.headers.get("x-jarvis") !== "1") return forbidden();
  return null;
}

export async function readBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
