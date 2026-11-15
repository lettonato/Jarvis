// Start und Stopp des gebauten JARVIS-Servers für die Handprüfungen (test/hand/*-rauch.ts), an einer Stelle.
//
// Zwei Dinge, die jede Prüfung braucht und die einzeln leicht falsch werden:
// 1. Gestartet wird nur auf einem freien Port, und bereit ist der Server erst, wenn er antwortet UND der eigene
//    Prozess noch läuft. Ist der Port belegt (etwa von einem liegen gebliebenen Server eines früheren Laufs),
//    endet `next start` nach einer Sekunde wieder; bis dahin antwortete der fremde Server, die Prüfung hielte
//    ihn für ihren eigenen und prüfte gegen den falschen Stand.
//    Bindet ein anderer den Port erst kurz nach dieser Prüfung, antwortet er ebenfalls, bevor der eigene Prozess
//    scheitert. Deshalb gilt die erste gute Antwort erst, wenn der eigene Prozess auch kurz danach noch läuft.
// 2. Beendet ist er erst, wenn kein Prozess seiner Gruppe mehr läuft (siehe prozessgruppe.ts): `next start`
//    bedient nach dem Signal zum Beenden offene Verbindungen weiter.

import { spawn } from "node:child_process";
import { connect } from "node:net";
import { beendeGruppe } from "./prozessgruppe";

const warte = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Zusätzliche Umgebungsvariablen. (Nicht NodeJS.ProcessEnv: Dort verlangt Next die Angabe NODE_ENV.)
export type Umgebung = Record<string, string | undefined>;

export type Dienst = {
  pid: number;
  // Wartet, bis die Adresse mit einem guten Status antwortet und das Programm `bestaetigeMs` später noch läuft.
  // Wirft, wenn das Programm vorher endet oder nach `versuche` Anläufen niemand antwortet. Auf eine einzelne
  // Antwort wird höchstens `antwortMs` gewartet.
  bereit: (url: string, o?: { versuche?: number; schrittMs?: number; antwortMs?: number; bestaetigeMs?: number }) => Promise<void>;
  // Kommt erst zurück, wenn kein Prozess der Gruppe mehr läuft. Mehrfach aufrufen schadet nicht.
  stop: (o?: { fristMs?: number }) => Promise<void>;
  // Wie stop, für das Aufräumen am Ende einer Prüfung: Ein Fehler beim Beenden wird gemeldet (false), aber nicht
  // geworfen, damit er den eigentlichen Fehler der Prüfung nicht verdeckt. Ein Server, der dabei liegen bleibt,
  // fällt beim nächsten Start auf (Port belegt); der Sammellauf beendet ihn außerdem über seine Marke.
  stopLeise: (o?: { fristMs?: number }) => Promise<boolean>;
};

// Nimmt auf diesem Rechner schon jemand Verbindungen auf dem Port an?
function portBelegt(port: number): Promise<boolean> {
  return new Promise((fertig) => {
    const s = connect({ host: "127.0.0.1", port });
    const ende = (belegt: boolean) => {
      s.destroy();
      fertig(belegt);
    };
    s.once("connect", () => ende(true));
    s.once("error", () => ende(false));
    s.setTimeout(2000, () => ende(true));
  });
}

// Startet ein Programm in einer eigenen Prozessgruppe. `env` kommt zur Umgebung dieses Prozesses dazu.
// Mit `port`: Antwortet dort schon jemand, wird nicht gestartet.
export async function starteDienst(befehl: string, argumente: string[], env: Umgebung = {}, o: { port?: number } = {}): Promise<Dienst> {
  if (o.port !== undefined && (await portBelegt(o.port))) {
    throw new Error(`Auf Port ${o.port} antwortet schon ein Server (vielleicht von einem früheren Lauf). Bitte erst beenden.`);
  }
  const kind = spawn(befehl, argumente, { env: { ...process.env, ...env }, stdio: "ignore", detached: true });
  // undefined: läuft noch. Sonst der Exit-Code, oder der Name des Signals.
  let ende: number | string | undefined;
  kind.on("exit", (code, signal) => (ende = code ?? signal ?? "unbekannt"));
  kind.on("error", (e) => (ende = e.message));
  const pid = kind.pid;
  if (!pid) throw new Error(`${befehl} ließ sich nicht starten.`);
  const beendet = () => new Error(`Der Server hat sich beendet (Code ${ende}), bevor er bereit war. Ist gebaut (npx next build), und ist der Port frei?`);

  const dienst: Dienst = {
    pid,
    async bereit(url, o = {}) {
      const versuche = o.versuche ?? 120;
      for (let i = 0; ; i++) {
        // Mit Frist: Nimmt jemand die Verbindung an und antwortet nie, wartete fetch sonst minutenlang.
        const ok = await fetch(url, { signal: AbortSignal.timeout(o.antwortMs ?? 5000) }).then((r) => r.ok, () => false);
        // Erst nach der Antwort nachsehen: Hat ein anderer geantwortet, weil der eigene Prozess schon weg ist?
        if (ende !== undefined) throw beendet();
        if (ok) {
          // Und kurz danach noch einmal: Scheitert der eigene Prozess gerade erst am Port, den ein anderer hält?
          await warte(o.bestaetigeMs ?? 1500);
          if (ende !== undefined) throw beendet();
          return;
        }
        if (i >= versuche) throw new Error("Der Server ist nicht gestartet.");
        await warte(o.schrittMs ?? 500);
      }
    },
    async stop(o = {}) {
      await beendeGruppe(pid, o);
    },
    async stopLeise(o = {}) {
      try {
        await dienst.stop(o);
        return true;
      } catch (e) {
        console.error(String(e));
        return false;
      }
    },
  };
  return dienst;
}

// Der gebaute JARVIS auf einem Port (vorher `npx next build`).
export function starteNext(port: number, env: Umgebung = {}): Promise<Dienst> {
  return starteDienst("npx", ["next", "start", "-p", String(port)], { ...env, PORT: String(port) }, { port });
}
