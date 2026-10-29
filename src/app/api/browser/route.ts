import { connection } from "next/server";
import { brainKey, explainBrainError } from "@/lib/server/brain";
import { browserStatus, BrowserError, closeBrowser, runBrowserTask, stopBrowserTask, takeOver } from "@/lib/server/browser";
import { readConfig } from "@/lib/server/config";
import { guard, readBody } from "@/lib/server/guard";

// Der Browser-Agent: Stand abfragen, einen Auftrag starten, anhalten, selbst übernehmen (echtes Chrome-Fenster) oder schließen.
// Ein Auftrag aus der Ansicht läuft im Hintergrund weiter; die Seite fragt den Stand regelmäßig ab.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await browserStatus(brainKey(await readConfig())));
}

type Action = { action: "auftrag"; text: string } | { action: "stopp" } | { action: "uebernehmen" } | { action: "schliessen" };

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Action>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const config = await readConfig();
  const apiKey = brainKey(config);
  try {
    if (body.action === "auftrag") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) return Response.json({ error: "Was soll ich im Browser erledigen?" }, { status: 400 });
      if (!apiKey) return Response.json({ error: "Für den Browser braucht JARVIS das KI-Gehirn. Den Claude-Schlüssel trägst du in den Einstellungen ein." }, { status: 409 });
      const done = runBrowserTask(config, apiKey, text, { from: "ansicht" });
      // Startet Chrome nicht, kommt der Fehler gleich zurück; sonst läuft der Auftrag im Hintergrund.
      const early = await Promise.race([done.then(() => null, (e: unknown) => e), new Promise((r) => setTimeout(() => r(null), 1_500))]);
      done.catch(() => {});
      if (early) throw early;
    } else if (body.action === "stopp") {
      stopBrowserTask();
    } else if (body.action === "uebernehmen") {
      await takeOver();
    } else if (body.action === "schliessen") {
      await closeBrowser();
    } else {
      return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof BrowserError) return Response.json({ error: e.message }, { status: 409 });
    return Response.json({ error: explainBrainError(e) }, { status: 500 });
  }
  return Response.json(await browserStatus(apiKey));
}
