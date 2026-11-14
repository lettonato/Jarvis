import { connection } from "next/server";
import { forget, forgetAll, GedaechtnisFehler, gedaechtnisStand, legeBeiseite, remember } from "@/lib/server/memory";
import { guard, readBody } from "@/lib/server/guard";

// Das Gedächtnis von JARVIS: lesen, einen Eintrag selbst anlegen, einzelne oder alle löschen. Lässt es sich nicht
// lesen (beschädigte Datei), kommt ein leerer Stand mit dem festen Satz dazu zurück, damit die Seite ihn zeigt;
// „beiseite“ legt die beschädigte Datei dann unter neuem Namen daneben und behält, was sich noch lesen lässt.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await gedaechtnisStand());
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
    else if (body?.action === "beiseite") await legeBeiseite();
    else return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  } catch (e) {
    // Ist der Speicher selbst gestört, ist das kein Bedienfehler (wie beim Projektgedächtnis).
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: e instanceof GedaechtnisFehler ? 500 : 400 });
  }
  return Response.json(await gedaechtnisStand());
}
