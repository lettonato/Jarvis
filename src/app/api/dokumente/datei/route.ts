import { connection } from "next/server";
import path from "node:path";
import { documentFile } from "@/lib/server/documents";
import { guard } from "@/lib/server/guard";

// Ein fertiges Dokument zum Ansehen im Browser: das PDF oder die Webseite. Die Webseite läuft dabei
// abgeschottet, ohne Skripte und ohne Zugriff auf JARVIS.

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const art = url.searchParams.get("art") === "html" ? "html" : "pdf";
  const found = /^[\w-]{1,40}$/.test(id) ? await documentFile(id, art) : null;
  if (!found) return Response.json({ error: "Dieses Dokument gibt es nicht mehr." }, { status: 404 });
  const name = path.basename(found.file);
  return new Response(new Uint8Array(found.data), {
    headers: {
      "content-type": art === "pdf" ? "application/pdf" : "text/html; charset=utf-8",
      "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(name)}`,
      // Chrome zeigt PDFs in einer abgeschotteten Seite nicht an; die Sperre gilt deshalb nur für die Webseite.
      ...(art === "html" ? { "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox" } : {}),
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
  });
}
