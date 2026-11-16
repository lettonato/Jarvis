// Was ein Raum sagt, solange er seine Quelle nicht hat. Zwei Fälle, die verschieden klingen müssen:
// laedt     die Abfrage an JARVIS ist unterwegs, gleich ist es da;
// gestoert  JARVIS selbst antwortet dort nicht (die Abfrage ist von Anfang an gescheitert, siehe geteilt.ts).
// Ein Satz, der bei einem Ausfall weiter „Lade …“ sagt, ist falsch. Die Sätze stehen hier an einer Stelle, damit
// „Heute“ (heute.ts) und die Räume über dieselbe Quelle dasselbe sagen; auf die Seite kommen sie über den Baustein
// Ladestand in ui.tsx.

// Name der Quelle, wie er im Satz steht, und ob er in der Mehrzahl steht.
export const QUELLEN = {
  kalender: ["Der Kalender", false],
  aufgaben: ["Die Aufgaben", true],
  post: ["Das Postfach", false],
  projekte: ["Die Projekte", true],
  akte: ["Die Akte", false],
  dokumente: ["Die Dokumente", true],
  intel: ["Das Lagebild", false],
  kurse: ["Die Krypto-Kurse", true],
  metalle: ["Die Kurse für Gold und Silber", true],
  desk: ["Der Trading-Desk", false],
  agenten: ["Die Agenten", true],
  zeitplan: ["Der Zeitplan", false],
  wetter: ["Das Wetter", false],
  browser: ["Der Browser", false],
  einstellungen: ["Die Einstellungen", true],
  gedaechtnis: ["Das Gedächtnis", false],
  sicherheit: ["Die Sicherheitslage", false],
  microsoft: ["Die Verbindung zu Microsoft", false],
} as const satisfies Record<string, readonly [string, boolean]>;

export type Quelle = keyof typeof QUELLEN;
export type Ladestand = { art: "laedt" | "gestoert"; text: string };

export function ladestand(quelle: Quelle, aus: boolean): Ladestand {
  const [name, mehrzahl] = QUELLEN[quelle];
  return aus
    ? { art: "gestoert", text: `${name} ${mehrzahl ? "lassen" : "lässt"} sich gerade nicht laden.` }
    : { art: "laedt", text: `${name} ${mehrzahl ? "laden" : "lädt"} noch.` };
}
