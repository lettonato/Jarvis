import { connection } from "next/server";
import { DeskError, answerApproval, control, deskSnapshot, startDesk, type DeskAction } from "@/lib/server/desk/engine";
import { guard, readBody } from "@/lib/server/guard";

const ACTIONS = new Set(["start", "pause", "weiter", "notaus", "verkaufen", "alle_verkaufen", "zuruecksetzen"]);

// Deine Antwort auf eine Rückfrage vor einem Kauf, per Knopf auf dem Trading-Desk.
type Answer = { action: "rueckfrage"; id: string; ja: boolean };

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
  const body = await readBody<DeskAction | Answer>(request);
  const valid =
    body?.action === "rueckfrage"
      ? typeof body.id === "string" && typeof body.ja === "boolean"
      : Boolean(body && ACTIONS.has(body.action) && (body.action !== "verkaufen" || typeof body.address === "string"));
  if (!body || !valid) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  startDesk();
  try {
    const message = body.action === "rueckfrage" ? await answerApproval(body.id, body.ja, "app") : await control(body);
    return Response.json({ ...(await deskSnapshot()), message });
  } catch (e) {
    if (e instanceof DeskError) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
