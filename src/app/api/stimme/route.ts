import { connection } from "next/server";
import { readConfig } from "@/lib/server/config";
import { guard, readBody } from "@/lib/server/guard";
import { sprich, stimmeKonto, stimmenListe, stimmeStatusVon } from "@/lib/server/stimme";

// Die ElevenLabs-Stimme. GET zeigt den Zustand und (mit ?liste=1) die Stimmen und den Verbrauch deines Kontos.
// POST liest einen Satz vor und antwortet mit dem Ton. Der Schlüssel geht nie an die Seite.
// Eingerichtet und geschaltet wird in /api/einstellungen; hier wird nur geprüft und vorgelesen.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  const config = await readConfig();
  const status = await stimmeStatusVon(config);
  const apiKey = config.elevenlabs?.apiKey;
  if (!apiKey || new URL(request.url).searchParams.get("liste") !== "1") return Response.json({ status });
  const [liste, konto] = await Promise.all([stimmenListe(apiKey), stimmeKonto(apiKey)]);
  return Response.json({ status, stimmen: liste.ok ? liste.stimmen : [], konto, fehler: liste.ok ? null : liste.error });
}

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<{ text?: unknown; probe?: unknown }>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  const ergebnis = await sprich(typeof body.text === "string" ? body.text : "", { probe: body.probe === true });
  if (!ergebnis.ok) return Response.json({ error: ergebnis.error, grund: ergebnis.grund }, { status: ergebnis.status });
  return new Response(ergebnis.audio, { headers: { "content-type": ergebnis.typ, "cache-control": "no-store" } });
}
