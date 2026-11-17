import { execFile } from "node:child_process";

// Eine Mitteilung von macOS zeigen: das kleine Fenster oben rechts, das danach in der Mitteilungszentrale steht.
// So meldet sich JARVIS am Mac selbst, ohne Handy. Es geht über osascript, das auf jedem Mac vorhanden ist; es
// wird nichts installiert, und nichts verlässt den Mac.
//
// Zwei Dinge kann JARVIS dabei nicht wissen: ob du Mitteilungen für den Skripteditor in den Systemeinstellungen
// erlaubt hast, und ob gerade ein Fokus (Nicht stören) sie zurückhält. In beiden Fällen meldet der Mac „erledigt“
// und zeigt nichts. Dafür gibt es in den Einstellungen die Mitteilung zur Probe.

// In Tests steht hier ein nachgebautes osascript (wie beim Kalender).
const OSASCRIPT = () => process.env.JARVIS_OSASCRIPT ?? "/usr/bin/osascript";
export const mitteilungMoeglich = () => process.platform === "darwin" || Boolean(process.env.JARVIS_OSASCRIPT);

// So lange darf der Mac brauchen. In Tests kürzer.
const FRIST_MS = () => Number(process.env.JARVIS_MITTEILUNG_FRIST_MS) || 15_000;

// Text und Titel stehen nie im Skript: Sie gehen als eigene Argumente an osascript. So kann kein Zeichen darin
// (Anführungszeichen, Backslash) das Skript verändern.
const SKRIPT = `on run argv
  display notification (item 1 of argv) with title (item 2 of argv)
end run`;

// kein-mac: JARVIS läuft nicht auf einem Mac. abgelehnt: Der Mac hat sie sicher nicht gezeigt. unklar: Er hat
// nicht rechtzeitig geantwortet (oder osascript wurde von außen beendet); ob sie erschienen ist, weiß niemand.
export type MitteilungFehler = "kein-mac" | "abgelehnt" | "unklar";

// Feste Sätze: Was osascript als Fehler schreibt, gehört weder in eine Datei noch in die Anzeige.
export const MITTEILUNG_SATZ: Record<MitteilungFehler, string> = {
  "kein-mac": "Mitteilungen gibt es nur auf dem Mac.",
  abgelehnt: "Der Mac hat die Mitteilung nicht angenommen.",
  unklar: "Der Mac hat nicht rechtzeitig geantwortet.",
};

export class MitteilungError extends Error {
  constructor(readonly art: MitteilungFehler) {
    super(MITTEILUNG_SATZ[art]);
    this.name = "MitteilungError";
  }
}

// Steuerzeichen haben in einer Mitteilung nichts verloren, und ein NUL-Zeichen nähme das Betriebssystem als
// Argument gar nicht an.
const einzeilig = (s: string, hoechstens: number) =>
  s
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, hoechstens);

// Als eigene Funktion mit dem Programm als Parameter, wie beim Kalender: So versucht der Bau nicht, dem Pfad zu folgen.
function starte(programm: string, args: string[], frist: number): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(programm, args, { timeout: frist, maxBuffer: 64 * 1024 }, (error) => {
      if (!error) resolve();
      // killed: Die Frist ist abgelaufen, und osascript wurde beendet. signal: Jemand anderes hat es beendet. In
      // beiden Fällen weiß niemand, ob die Mitteilung schon erschienen war. Sonst hat osascript selbst abgelehnt
      // (oder ließ sich gar nicht starten): Dann ist sicher nichts erschienen.
      else reject(new MitteilungError(error.killed || error.signal ? "unklar" : "abgelehnt"));
    });
  });
}

export function zeigeMitteilung(titel: string, text: string): Promise<void> {
  if (!mitteilungMoeglich()) return Promise.reject(new MitteilungError("kein-mac"));
  return starte(OSASCRIPT(), ["-e", SKRIPT, einzeilig(text, 300), einzeilig(titel, 60)], FRIST_MS());
}
