import { connection } from "next/server";
import { isAgent, type SicherheitsLage } from "@/lib/sicherheit";
import { leseAudit, pruefeAudit } from "@/lib/server/gateway/audit";
import { entscheideFreigabe, FreigabeFehler, leseFreigaben } from "@/lib/server/gateway/freigaben";
import { entsperreAgent, leseZustand, notausAn, notausAus, setzeCStrenge, SicherheitsFehler, sperreAgent } from "@/lib/server/gateway/zustand";
import { guard, readBody } from "@/lib/server/guard";
import { SchluesselbundFehler } from "@/lib/server/schluesselbund";
import { inSchluesselbund, ZugangsdatenFehler, zugangsdatenStatus, zurueckInDatei } from "@/lib/server/zugangsdaten";

// Die Sicherheitszentrale am Mac: Not-Aus, Sperren der Agenten, Freigaben, Audit-Log und wo die
// Zugangsdaten liegen.
// Nur von diesem Mac aus (guard). Das ist der einzige Weg, den Not-Aus zu lösen oder einen Agenten zu
// entsperren; die KI hat dafür kein Werkzeug, und Telegram kann den Not-Aus nur einschalten.

type Body =
  | { aktion: "notaus_an"; grund?: string }
  | { aktion: "notaus_aus"; bestaetigung: string }
  | { aktion: "agent_sperren"; agent: string; grund?: string }
  | { aktion: "agent_entsperren"; agent: string }
  | { aktion: "freigabe"; id: string; ja: boolean }
  | { aktion: "c_strenge"; strenge: string }
  | { aktion: "zugangsdaten_schluesselbund" }
  | { aktion: "zugangsdaten_datei" };

async function lage(): Promise<SicherheitsLage> {
  const [zustand, freigaben, audit, pruefung, zugangsdaten] = await Promise.all([leseZustand(), leseFreigaben(), leseAudit(60), pruefeAudit(), zugangsdatenStatus()]);
  return { zustand, freigaben: freigaben.slice(0, 30), audit, pruefung, zugangsdaten };
}

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  return Response.json(await lage());
}

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Body>(request);
  if (!body || typeof body.aktion !== "string") return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  try {
    let message: string;
    // Nach einem Ja: welche Bereiche sich geändert haben, damit die Seite sie sofort neu lädt.
    let geaendert: string[] = [];
    switch (body.aktion) {
      case "notaus_an":
        message = await notausAn(typeof body.grund === "string" && body.grund.trim() ? body.grund : "am Mac ausgelöst", "mac");
        break;
      case "notaus_aus":
        message = await notausAus(typeof body.bestaetigung === "string" ? body.bestaetigung : "", "mac");
        break;
      case "agent_sperren":
        if (!isAgent(body.agent)) return Response.json({ error: "Unbekannter Agent." }, { status: 400 });
        await sperreAgent(body.agent, typeof body.grund === "string" ? body.grund : "am Mac gesperrt", "mac");
        message = "Gesperrt.";
        break;
      case "agent_entsperren":
        if (!isAgent(body.agent)) return Response.json({ error: "Unbekannter Agent." }, { status: 400 });
        await entsperreAgent(body.agent, "mac");
        message = "Entsperrt.";
        break;
      case "freigabe":
        if (typeof body.id !== "string" || typeof body.ja !== "boolean") return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
        ({ text: message, geaendert } = await entscheideFreigabe(body.id, body.ja, "mac"));
        break;
      case "c_strenge":
        if (body.strenge !== "immer" && body.strenge !== "bei-fremden-inhalten") return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
        await setzeCStrenge(body.strenge, "mac");
        message = "Gespeichert.";
        break;
      case "zugangsdaten_schluesselbund":
        message = await inSchluesselbund("mac");
        break;
      case "zugangsdaten_datei":
        message = await zurueckInDatei("mac");
        break;
      default:
        return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
    }
    return Response.json({ ...(await lage()), message, ...(geaendert.length ? { geaendert } : {}) });
  } catch (e) {
    if (e instanceof SicherheitsFehler || e instanceof FreigabeFehler || e instanceof ZugangsdatenFehler || e instanceof SchluesselbundFehler) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
}
