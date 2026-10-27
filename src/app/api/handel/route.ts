import { connection } from "next/server";
import { DeskError, control, deskSnapshot, startDesk, type DeskAction } from "@/lib/server/desk/engine";
import { guard, readBody } from "@/lib/server/guard";

const ACTIONS = new Set(["start", "pause", "weiter", "notaus", "verkaufen", "alle_verkaufen", "zuruecksetzen"]);

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  // Falls der Server ohne Startdatei hochgefahren ist, läuft der Takt spätestens jetzt.
  startDesk();
  return Response.json(await deskSnapshot());
}

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<DeskAction>(request);
  if (!body || !ACTIONS.has(body.action) || (body.action === "verkaufen" && typeof body.address !== "string")) {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  startDesk();
  try {
    const message = await control(body);
    return Response.json({ ...(await deskSnapshot()), message });
  } catch (e) {
    if (e instanceof DeskError) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
