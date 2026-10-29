import { connection } from "next/server";
import { liveStream } from "@/lib/server/browser";
import { guard } from "@/lib/server/guard";

// Das Live-Bild vom Chrome, den JARVIS bedient, als laufendes Video (MJPEG). Ein <img> zeigt es direkt an.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return new Response(liveStream(request.signal), {
    headers: {
      "content-type": "multipart/x-mixed-replace; boundary=bild",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
