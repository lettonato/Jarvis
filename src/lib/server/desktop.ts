import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { FESTE_ZIELE, programmName, zielImSatz, zielName, zieleVon, type DesktopStatus, type DesktopZiel } from "../desktop";
import { readConfig, type JarvisConfig } from "./config";
import { protokolliere } from "./gateway/audit";

// Öffnet ein Programm oder einen Ordner am Mac. Die Regeln stehen in src/lib/desktop.ts; hier ist die eine Stelle,
// an der wirklich etwas geöffnet wird, für beide Wege: du am Mac (fester Befehl, Knopf in den Einstellungen) und
// das KI-Gehirn über sein Werkzeug. Beide nennen nur die Kennung eines Ziels. Was dann an den Mac geht, steht in
// der Liste und kommt nie aus dem Gespräch.

// In Tests steht hier ein nachgebautes open (wie beim Kalender).
const OPEN = () => process.env.JARVIS_OPEN ?? "/usr/bin/open";
export const desktopMoeglich = () => process.platform === "darwin" || Boolean(process.env.JARVIS_OPEN);

// So lange darf der Mac brauchen. In Tests kürzer.
const FRIST_MS = () => Number(process.env.JARVIS_DESKTOP_FRIST_MS) || 10_000;

// kein-mac: JARVIS läuft nicht auf einem Mac. unbekannt: steht nicht in der Liste. aus: in den Einstellungen
// ausgeschaltet. nicht-geoeffnet: Der Mac hat es nicht geöffnet; meist gibt es das Programm oder den Ordner dort
// nicht, sicher weiß JARVIS den Grund aber nicht. unklar: Der Mac hat nicht rechtzeitig geantwortet; ob es offen
// ist, weiß niemand.
export type DesktopFehler = "kein-mac" | "unbekannt" | "aus" | "nicht-geoeffnet" | "unklar";

// Feste Sätze: Was open als Fehler schreibt, gehört weder ins Gespräch noch in eine Datei.
export class DesktopError extends Error {
  constructor(
    readonly art: DesktopFehler,
    message: string,
    readonly ziel?: DesktopZiel,
  ) {
    super(message);
    this.name = "DesktopError";
  }
}

export const desktopStatus = (config: JarvisConfig): DesktopStatus => ({ moeglich: desktopMoeglich(), ziele: zieleVon(config.desktop) });

// Die Argumente für open. Für ein festes Ziel stehen sie in der Liste; für ein eigenes Programm ist es der Name,
// noch einmal geprüft. Der Benutzerordner kommt vom Betriebssystem.
function argumente(ziel: DesktopZiel): string[] | null {
  if (ziel.eigen) {
    const name = programmName(ziel.name);
    return name ? ["-a", name] : null;
  }
  const fest = FESTE_ZIELE.find((f) => f.id === ziel.id);
  if (fest?.paket) return ["-b", fest.paket];
  if (fest?.app) return ["-a", fest.app];
  if (fest?.ordner) return [path.join(os.homedir(), fest.ordner)];
  return null;
}

// Als eigene Funktion mit dem Programm als Parameter, wie beim Kalender: So versucht der Bau nicht, dem Pfad zu folgen.
function starte(programm: string, args: string[], frist: number): Promise<"ok" | "nicht-geoeffnet" | "unklar"> {
  return new Promise((resolve) => {
    execFile(programm, args, { timeout: frist, maxBuffer: 64 * 1024 }, (error) => {
      if (!error) resolve("ok");
      // killed: Die Frist ist abgelaufen. signal: Jemand anderes hat open beendet. In beiden Fällen weiß niemand,
      // ob das Programm schon offen ist. Sonst hat open selbst abgelehnt (oder ließ sich gar nicht starten). Warum,
      // steht nur in seinem eigenen Text, und der wird hier bewusst nicht gelesen.
      else resolve(error.killed || error.signal ? "unklar" : "nicht-geoeffnet");
    });
  });
}

// Öffnet das Ziel mit dieser Kennung, wenn es in der Liste steht und eingeschaltet ist. Die Liste wird dafür frisch
// gelesen: Was du eben ausgeschaltet hast, öffnet sich nicht mehr.
export async function oeffneZiel(id: unknown): Promise<DesktopZiel> {
  const ziel = typeof id === "string" ? zieleVon((await readConfig()).desktop).find((z) => z.id === id) : undefined;
  const args = ziel ? argumente(ziel) : null;
  if (!ziel || !args) throw new DesktopError("unbekannt", "Das steht nicht auf der Liste der Programme und Ordner in den Einstellungen.");
  if (!ziel.an) throw new DesktopError("aus", `${zielName(ziel)} ist in den Einstellungen unter „Programme“ ausgeschaltet.`, ziel);
  if (!desktopMoeglich()) throw new DesktopError("kein-mac", "Programme und Ordner öffnen kann ich nur auf dem Mac.", ziel);
  const ergebnis = await starte(OPEN(), args, FRIST_MS());
  if (ergebnis === "nicht-geoeffnet") {
    const vielleicht = ziel.art === "ordner" ? "Vielleicht gibt es ihn auf diesem Mac nicht." : "Vielleicht ist das Programm auf diesem Mac nicht installiert.";
    throw new DesktopError("nicht-geoeffnet", `Ich konnte ${zielImSatz(ziel)} nicht öffnen. ${vielleicht}`, ziel);
  }
  if (ergebnis === "unklar") throw new DesktopError("unklar", `Der Mac hat nicht rechtzeitig geantwortet. Ob ${zielImSatz(ziel)} jetzt offen ist, weiß ich nicht.`, ziel);
  return ziel;
}

// Dasselbe für dich am Mac (fester Befehl im Gespräch, Knopf in den Einstellungen), mit einer Zeile im Audit-Log.
// In dieser Zeile steht der Name aus der Liste, nie das, was angefragt wurde. Ruft das KI-Gehirn sein Werkzeug
// auf, schreibt stattdessen das Security Gateway seine Zeile, wie bei jedem Werkzeug mit der Eingabe des Modells
// (Schlüssel darin geschwärzt). Lässt sich das Log nicht schreiben, gilt das Öffnen wie dort als gescheitert.
export async function oeffneAufZuruf(id: unknown): Promise<DesktopZiel> {
  const zeile = { art: "desktop", agent: "mensch", kanal: "mac" } as const;
  try {
    const ziel = await oeffneZiel(id);
    await protokolliere({ ...zeile, was: `Öffnen: ${zielName(ziel)}`, ergebnis: "geoeffnet" });
    return ziel;
  } catch (e) {
    if (e instanceof DesktopError) {
      const abgelehnt = e.art === "unbekannt" || e.art === "aus" || e.art === "kein-mac";
      await protokolliere({ ...zeile, was: `Öffnen: ${e.ziel ? zielName(e.ziel) : "nicht auf der Liste"}`, ergebnis: `${abgelehnt ? "abgelehnt" : "fehler"}:${e.art}` });
    }
    throw e;
  }
}
