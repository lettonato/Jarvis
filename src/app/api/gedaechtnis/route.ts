import { connection } from "next/server";
import { forget, forgetAll, readMemory, remember } from "@/lib/server/memory";
import { guard, readBody } from "@/lib/server/guard";

// Das Gedächtnis von JARVIS: lesen, einen Eintrag selbst anlegen, einzelne oder alle löschen.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json({ facts: await readMemory() });
}

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<{ action?: string; id?: unknown; text?: unknown }>(request);
  try {
    if (body?.action === "merken" && typeof body.text === "string") await remember(body.text);
    else if (body?.action === "vergessen" && typeof body.id === "string") await forget(body.id);
    else if (body?.action === "alles") await forgetAll();
    else return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
  return Response.json({ facts: await readMemory() });
}
