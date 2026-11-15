// Eine Prozessgruppe sicher beenden (für die Handprüfungen, die einen gebauten Server starten).
//
// Warum das nötig ist: `next start` hört nach SIGTERM auf, neue Verbindungen anzunehmen, wartet dann aber, bis
// alle offenen Verbindungen von selbst enden. Ein Browser, dessen Seite weiter abfragt, hält sie beliebig lange
// offen. Der alte Prozess lebt dann weiter und beantwortet die Anfragen der offenen Seite mit seinem alten Stand
// im Speicher, während auf demselben Port schon der neue läuft. Eine Prüfung, die JARVIS neu startet, darf erst
// weitermachen, wenn vom alten wirklich nichts mehr läuft.
// (Am Mac startet JARVIS mit `next dev`; dort schließt Next beim Beenden alle Verbindungen selbst.)

import { existsSync, readFileSync, readdirSync } from "node:fs";

const warte = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Unter Linux: Stehen in der Gruppe nur noch beendete Prozesse, die ihr Elternprozess noch nicht abgeholt hat
// (Zombies)? Für das System gibt es die Gruppe dann noch, aber es läuft nichts mehr darin und kein Port ist
// mehr belegt. null: nicht feststellbar (kein /proc).
function nurNochBeendete(pgid: number): boolean | null {
  if (!existsSync("/proc/self/stat")) return null;
  for (const eintrag of readdirSync("/proc")) {
    if (!/^\d+$/.test(eintrag)) continue;
    try {
      // „pid (name) Zustand Eltern Gruppe …“; der Name kann Klammern und Leerzeichen enthalten.
      const stat = readFileSync(`/proc/${eintrag}/stat`, "utf8");
      const [zustand, , gruppe] = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
      if (Number(gruppe) === pgid && zustand !== "Z" && zustand !== "X") return false;
    } catch {
      // Inzwischen ganz verschwunden.
    }
  }
  return true;
}

// Läuft in der Gruppe noch irgendein Prozess? Auch dann, wenn ihr Anführer schon beendet ist.
export function gruppeLebt(pid: number): boolean {
  try {
    process.kill(-pid, 0);
  } catch (e) {
    // EPERM hieße: Es gibt sie, sie gehört nur jemand anderem.
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
  return nurNochBeendete(pid) !== true;
}

async function bisWeg(pid: number, hoechstensMs: number): Promise<boolean> {
  const bis = Date.now() + hoechstensMs;
  while (gruppeLebt(pid)) {
    if (Date.now() >= bis) return false;
    await warte(50);
  }
  return true;
}

// Bittet die Gruppe zu enden (SIGTERM) und beendet sie nach der Frist hart (SIGKILL). Kommt erst zurück, wenn
// kein Prozess der Gruppe mehr läuft. "weg": Es lief schon nichts mehr.
export async function beendeGruppe(pid: number, o: { fristMs?: number } = {}): Promise<"weg" | "sauber" | "hart"> {
  if (!gruppeLebt(pid)) return "weg";
  try {
    process.kill(-pid, "SIGTERM");
  } catch {}
  if (await bisWeg(pid, o.fristMs ?? 2000)) return "sauber";
  try {
    process.kill(-pid, "SIGKILL");
  } catch {}
  if (!(await bisWeg(pid, 5000))) throw new Error(`Die Prozessgruppe ${pid} ließ sich nicht beenden.`);
  return "hart";
}

// Alle Prozesse, die eine bestimmte Angabe in ihrer Umgebung tragen. Der Sammellauf gibt jeder Prüfung eine
// eigene Marke mit; alles, was sie startet (Server in eigener Gruppe, Chrome), erbt sie. null heißt: auf diesem
// Rechner nicht feststellbar (kein /proc, etwa am Mac), nicht „es läuft nichts“.
export function prozesseMitMarke(name: string, wert: string): number[] | null {
  if (!existsSync("/proc/self/environ")) return null;
  const gesucht = `${name}=${wert}`;
  const pids: number[] = [];
  for (const eintrag of readdirSync("/proc")) {
    if (!/^\d+$/.test(eintrag) || Number(eintrag) === process.pid) continue;
    try {
      if (readFileSync(`/proc/${eintrag}/environ`, "utf8").split("\0").includes(gesucht)) pids.push(Number(eintrag));
    } catch {
      // Der Prozess ist inzwischen beendet oder gehört jemand anderem.
    }
  }
  return pids;
}

// Beendet hart, was mit dieser Marke noch läuft, und wartet, bis es weg ist. Gibt zurück, wie viele Prozesse es
// waren; null, wenn es sich hier nicht feststellen lässt.
export async function beendeMitMarke(name: string, wert: string): Promise<number | null> {
  const beendet = new Set<number>();
  const bis = Date.now() + 5000;
  for (;;) {
    const pids = prozesseMitMarke(name, wert);
    if (pids === null) return null;
    if (pids.length === 0) return beendet.size;
    if (Date.now() >= bis) throw new Error(`Prozesse mit ${name} ließen sich nicht beenden.`);
    // In jeder Runde neu: Ein Prozess kann noch ein Kind gestartet haben, bevor er beendet wurde.
    for (const pid of pids) {
      beendet.add(pid);
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
    await warte(50);
  }
}
