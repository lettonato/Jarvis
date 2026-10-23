import { connection } from "next/server";
import { readConfig } from "@/lib/server/config";
import { guard, readBody } from "@/lib/server/guard";
import { explainMailError, markSeen, readMail, readMessage } from "@/lib/server/mail";

// GET liefert die Übersicht; mit ?uid=123 den Text einer einzelnen Mail.
export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  const { mail } = await readConfig();
  const params = new URL(request.url).searchParams;
  const uid = Number(params.get("uid"));
  if (params.has("uid")) {
    if (!mail) return Response.json({ error: "Noch kein Postfach verbunden." }, { status: 409 });
    if (!Number.isInteger(uid) || uid <= 0) return Response.json({ error: "Ungültige Mail." }, { status: 400 });
    try {
      return Response.json(await readMessage(mail, uid));
    } catch (e) {
      return Response.json({ error: explainMailError(e) }, { status: 502 });
    }
  }
  return Response.json(await readMail(mail, { force: params.get("force") === "1" }));
}

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<{ action: "seen"; uid: number }>(request);
  const { mail } = await readConfig();
  if (!mail) return Response.json({ error: "Noch kein Postfach verbunden." }, { status: 409 });
  if (body?.action !== "seen" || !Number.isInteger(body.uid)) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  try {
    await markSeen(mail, body.uid);
  } catch (e) {
    return Response.json({ error: explainMailError(e) }, { status: 502 });
  }
  return Response.json(await readMail(mail, { force: true }));
}
