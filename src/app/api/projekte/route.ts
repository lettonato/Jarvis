import { connection } from "next/server";
import type { ProjekteAntwort } from "@/lib/projekte";
import { guard, readBody } from "@/lib/server/guard";
import { aendereProjekt, akte, entscheide, korrigiere, legeProjektAn, ProjektFehler, terminVorbereitung, trageEin, uebersicht, zieheZurueck } from "@/lib/server/projekte/projekte";
import { SpeicherFehler } from "@/lib/server/projekte/speicher";

// Das Projektgedächtnis am Mac: lesen, selbst eintragen, korrigieren, zurückziehen und über die Vorschläge
// von JARVIS entscheiden. Nur von diesem Mac aus (guard). Das ist der einzige Weg, auf dem etwas dauerhaft
// ins Projektgedächtnis kommt; die KI hat dafür kein Werkzeug, und per Telegram geht es auch nicht.

type Felder = { art?: unknown; text?: unknown; zustaendig?: unknown; faellig?: unknown; datum?: unknown; erledigt?: unknown };
type ProjektFelder = { name?: unknown; beschreibung?: unknown; status?: unknown; verantwortliche?: unknown; fortschritt?: unknown; stichworte?: unknown; vertraulich?: unknown };

// zeige: das Projekt, dessen Akte die Seite gerade offen hat; sie kommt in der Antwort frisch mit.
type Body = { zeige?: unknown } & (
  | ({ aktion: "projekt_anlegen" } & ProjektFelder)
  | ({ aktion: "projekt_aendern"; id: unknown } & ProjektFelder)
  | ({ aktion: "eintrag_anlegen"; projektId: unknown } & Felder)
  | ({ aktion: "eintrag_korrigieren"; id: unknown; grund?: unknown } & Felder)
  | { aktion: "eintrag_zurueckziehen"; id: unknown; grund?: unknown }
  | { aktion: "vorschlag"; id: unknown; ja: unknown; aenderung?: Felder & { projektName?: unknown; beschreibung?: unknown } }
);

const text = (wert: unknown) => (typeof wert === "string" ? wert : "");

async function antwort(zeige: string, message?: string): Promise<ProjekteAntwort> {
  const snapshot = await uebersicht();
  // Die Akte nur, wenn es das Projekt (noch) gibt; sonst zeigt die Seite einfach die Liste.
  const offen = zeige && snapshot.projekte.some((p) => p.id === zeige) ? await akte(zeige) : null;
  return { ...snapshot, akte: offen, message };
}

const fehler = (e: unknown): Response | null => {
  if (e instanceof ProjektFehler) return Response.json({ error: e.message }, { status: 409 });
  if (e instanceof SpeicherFehler) return Response.json({ error: e.message }, { status: 500 });
  return null;
};

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    const frage = new URL(request.url).searchParams;
    // Für die Erinnerung am Mac: die Vorbereitung zu einem Termin, wenn sein Titel ein Projekt nennt.
    const termin = frage.get("termin");
    if (termin !== null) return Response.json({ vorbereitung: await terminVorbereitung(termin.slice(0, 300)) });
    return Response.json(await antwort(frage.get("projekt") ?? ""));
  } catch (e) {
    const r = fehler(e);
    if (r) return r;
    throw e;
  }
}

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Body>(request);
  if (!body || typeof body.aktion !== "string") return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  let zeige = text(body.zeige);
  try {
    let message: string;
    switch (body.aktion) {
      case "projekt_anlegen": {
        const p = await legeProjektAn(body, "mac");
        zeige = p.id;
        message = `Projekt „${p.name}“ angelegt.`;
        break;
      }
      case "projekt_aendern":
        await aendereProjekt(text(body.id), body, "mac");
        message = "Gespeichert.";
        break;
      case "eintrag_anlegen":
        await trageEin(text(body.projektId), body, "mac");
        message = "Eingetragen.";
        break;
      case "eintrag_korrigieren":
        await korrigiere(text(body.id), { art: body.art, text: body.text, zustaendig: body.zustaendig, faellig: body.faellig, datum: body.datum, erledigt: body.erledigt }, text(body.grund), "mac");
        message = "Korrigiert. Der alte Stand steht im Verlauf.";
        break;
      case "eintrag_zurueckziehen":
        await zieheZurueck(text(body.id), text(body.grund), "mac");
        message = "Zurückgezogen.";
        break;
      case "vorschlag": {
        if (typeof body.ja !== "boolean") return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
        const r = await entscheide(text(body.id), body.ja, "mac", body.ja && body.aenderung && typeof body.aenderung === "object" ? body.aenderung : {});
        if (body.ja && r.vorschlag.projektId && !zeige) zeige = r.vorschlag.projektId;
        message = body.ja ? "Übernommen." : "Abgelehnt.";
        break;
      }
      default:
        return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }
    return Response.json(await antwort(zeige, message));
  } catch (e) {
    const r = fehler(e);
    if (r) return r;
    throw e;
  }
}
