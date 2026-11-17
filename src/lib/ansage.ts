// Was ein Vorleseprogramm von JARVIS angesagt bekommt, solange das Gespräch zugeklappt ist. (Aufgeklappt und im
// Raum „Gespräch“ sagt der Verlauf selbst an.) Angesagt wird jede fertige Antwort, nicht jedes Wort beim Schreiben,
// nichts, womit JARVIS selbst zu hören war (sonst redeten zwei Stimmen durcheinander), und nichts aus dem Gespräch
// von gestern, das nach dem Laden zurückgeholt wurde.

type Zug = { id: number; who: "du" | "jarvis"; text: string; live?: boolean; alt?: boolean };

// bis: Bis zu dieser Nummer ist alles angesagt oder gehört. warHoerbar: Beim letzten Blick war JARVIS zu hören.
export type AnsageStand = { bis: number; warHoerbar: boolean };
export const ANSAGE_START: AnsageStand = { bis: -1, warHoerbar: false };

// So lange wartet die Ansage nach einer fertigen Antwort, ob JARVIS sie selbst zu sprechen beginnt.
export const ANSAGE_WARTET_MS = 2000;

// zuege: das Gespräch. spricht: JARVIS will gerade sprechen („Spreche …“). hoerbar: Dabei ist wirklich etwas zu
// hören. (Hat der Browser keine Stimme, will JARVIS drei Sekunden lang sprechen und gibt dann auf; diese Antwort
// hat niemand gehört.) Zurück kommt, was jetzt (nach der Wartezeit) anzusagen ist, und der Stand für den nächsten
// Blick. Hat der Aufrufer angesagt, setzt er bis auf die letzte angesagte Nummer.
export function ansage(zuege: readonly Zug[], spricht: boolean, hoerbar: boolean, stand: AnsageStand): { texte: { id: number; text: string }[]; stand: AnsageStand } {
  let bis = stand.bis;
  // In dem Augenblick, in dem JARVIS zu hören ist, gilt alles bis hierher als gehört. Was danach dazukommt,
  // während er noch spricht (etwa die Vorbereitung hinter einer gesprochenen Erinnerung), nicht.
  if (hoerbar && !stand.warHoerbar) for (const z of zuege) bis = Math.max(bis, z.id);
  const weiter = { bis, warHoerbar: hoerbar };
  if (hoerbar || spricht) return { texte: [], stand: weiter };
  const texte: { id: number; text: string }[] = [];
  for (const z of zuege) {
    if (z.who !== "jarvis" || z.alt || z.id <= bis) continue;
    // Hinter einer Antwort, die noch entsteht, wartet alles Weitere: Die Reihenfolge bleibt.
    if (z.live) break;
    if (z.text.trim()) texte.push({ id: z.id, text: z.text });
  }
  return { texte, stand: weiter };
}
