// Wie eine Ansicht in die nächste übergeht, im Stil der Hologramme aus Iron Man.
// Der Fokus und die Übersicht sind der Raum, in dem JARVIS steht; die Arbeitsansichten liegen
// nebeneinander wie Hologramm-Tafeln um dich herum.
//
// holo-zoom-in   Übersicht → Fokus: die Kamera fliegt auf JARVIS zu, die Kacheln fliegen seitlich vorbei
// holo-zoom-out  Fokus → Übersicht: die Kamera fährt zurück, die Kacheln kommen von den Seiten
// holo-in        Übersicht oder Fokus → Arbeitsansicht: die Tafel taucht aus der Tiefe auf
// holo-out       Arbeitsansicht → Übersicht oder Fokus: die Tafel klappt zusammen und versinkt
// holo-left      zur Tafel rechts daneben: alles schwenkt nach links um dich herum
// holo-right     zur Tafel links daneben: alles schwenkt nach rechts
// holo-fade      ohne Art, etwa mit der Zurück-Taste des Browsers: weiches Überblenden

export const HOLO_TYPES = ["holo-zoom-in", "holo-zoom-out", "holo-in", "holo-out", "holo-left", "holo-right"] as const;

const ROOM = ["/fokus", "/"];
const PANELS = ["/aufgaben", "/kalender", "/post", "/trading", "/intel", "/agenten", "/einstellungen"];

const pathOf = (href: string) => href.split(/[?#]/)[0] || "/";

export function holoTypes(from: string, to: string): string[] {
  const a = pathOf(from);
  const b = pathOf(to);
  if (a === b) return [];
  if (a === "/" && b === "/fokus") return ["holo-zoom-in"];
  if (a === "/fokus" && b === "/") return ["holo-zoom-out"];
  if (ROOM.includes(a)) return ["holo-in"];
  if (ROOM.includes(b)) return ["holo-out"];
  return [PANELS.indexOf(b) > PANELS.indexOf(a) ? "holo-left" : "holo-right"];
}
