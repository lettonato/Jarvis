import { connection } from "next/server";
import { browserShot } from "@/lib/server/browser";
import { guard } from "@/lib/server/guard";

// Das letzte Bild vom Browser-Fenster, damit du in JARVIS mitsiehst, auch wenn Chrome hinten liegt.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  const shot = browserShot();
  if (!shot) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(shot), { headers: { "content-type": "image/jpeg", "cache-control": "no-store" } });
}
