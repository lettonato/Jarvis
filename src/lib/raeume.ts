// Die Räume des Glashauses. Jeder Bereich von JARVIS ist ein Raum mit eigener Aussicht; die Reihenfolge hier
// ist die Reihenfolge in der Leiste und bestimmt, in welche Richtung die Kamera beim Wechsel fährt.

export type Raum = {
  href: string;
  name: string;
  // Das Foto im Fenster (public/welt/<foto>.webp, Bildnachweis in public/welt/QUELLEN.md).
  foto: string;
  // Welcher Ausschnitt des Fotos zu sehen ist (CSS background-position).
  lage?: string;
  // Nacht- und Dämmerungsfotos: kein Sonnenlicht im Raum, die Scheiben sind dunkel getönt.
  licht: "tag" | "abend";
  // Wie viel der Breite das Fenster bekommt. Dichte Bereiche brauchen mehr Wand.
  fenster: "weit" | "normal" | "schmal";
};

export const RAEUME: Raum[] = [
  { href: "/", name: "Heute", foto: "post", licht: "tag", fenster: "weit" },
  { href: "/aufgaben", name: "Aufgaben", foto: "aufgaben", lage: "center 55%", licht: "tag", fenster: "normal" },
  { href: "/kalender", name: "Kalender", foto: "kalender", lage: "center 30%", licht: "tag", fenster: "normal" },
  { href: "/post", name: "Post", foto: "uebersicht", lage: "center 45%", licht: "tag", fenster: "normal" },
  { href: "/projekte", name: "Projekte", foto: "browser", lage: "60% 50%", licht: "tag", fenster: "normal" },
  { href: "/trading", name: "Trading", foto: "trading", lage: "70% 60%", licht: "abend", fenster: "schmal" },
  { href: "/intel", name: "Intel", foto: "intel", lage: "center 55%", licht: "abend", fenster: "normal" },
  { href: "/agenten", name: "Agenten", foto: "agenten", lage: "60% 40%", licht: "abend", fenster: "normal" },
  { href: "/browser", name: "Browser", foto: "einstellungen", lage: "40% 45%", licht: "abend", fenster: "schmal" },
  { href: "/dokumente", name: "Dokumente", foto: "dokumente", lage: "center 35%", licht: "tag", fenster: "normal" },
  { href: "/einstellungen", name: "Einstellungen", foto: "aufgaben", lage: "20% 30%", licht: "tag", fenster: "schmal" },
  { href: "/fokus", name: "Gespräch", foto: "fokus", lage: "center 60%", licht: "abend", fenster: "normal" },
];

const pfadVon = (href: string) => {
  const pfad = href.split(/[?#]/)[0] || "/";
  // „Heute“ ist der Eingangsraum; die alte Adresse /heute führt in denselben Raum.
  return pfad === "/heute" ? "/" : pfad;
};

export const raumVon = (href: string): Raum => RAEUME.find((r) => r.href === pfadVon(href)) ?? RAEUME[0];

export const FAHRTEN = ["fahrt-rechts", "fahrt-links"] as const;

// Wohin die Kamera fährt: zu einem Raum weiter rechts in der Leiste nach rechts, sonst nach links.
// Derselbe Raum (etwa ein Sprung zu einem Abschnitt) braucht keine Fahrt.
export function fahrtArten(von: string, nach: string): string[] {
  const a = RAEUME.indexOf(raumVon(von));
  const b = RAEUME.indexOf(raumVon(nach));
  if (a === b) return [];
  return [b > a ? "fahrt-rechts" : "fahrt-links"];
}
