// Antwortet JARVIS überhaupt? Alle Anfragen der Seite gehen an denselben JARVIS auf dem Mac. Bleibt er weg, zeigen
// die Räume weiter, was sie zuletzt gelesen haben; der Hinweis oben in jeder Ansicht sagt es dann (Verbindungshinweis
// in AppFrame.tsx). Gemeldet wird hier von zwei Stellen: von jeder Anfrage (api.ts) und von den gemeinsamen Abfragen,
// wenn eine nach ihrer Frist aufgegeben wird (geteilt.ts). Ohne React, damit sich die Regeln prüfen lassen.

// seit: wann JARVIS zuletzt geantwortet hat (null: in diesem Besuch noch nie).
export type Verbindung = { aus: boolean; seit: number | null };
export const VERBUNDEN: Verbindung = { aus: false, seit: null };

// Ein Stolperer ist kein Ausfall. Es braucht beides:
// (1) eine zweite Anfrage ohne Antwort, mindestens acht Sekunden nach der ersten, und dazwischen keine Antwort.
//     Mehrere Fehlschläge im selben Augenblick (ein Raum fragt drei Stellen zugleich, jemand klickt zweimal schnell
//     auf „Neu laden“) reichen nicht, und auch nicht die Zeit, die der Mac geschlafen hat: Gezählt wird ab dem
//     ersten Fehlschlag.
// (2) seit zwölf Sekunden keine Antwort. Die schnellsten Abfragen kommen alle zehn Sekunden (der Handel, die
//     Sicherheitslage): Solange eine davon beantwortet wird, ist JARVIS da, auch wenn eine einzelne Stelle immer
//     wieder scheitert.
// Scheitern zwei Abfragen im Zehn-Sekunden-Takt nacheinander, ist beides erfüllt.
export const AUS_NACH_MS = 8_000;
export const OHNE_ANTWORT_MS = 12_000;

// Die Regeln, für sich (so lassen sie sich von vorn prüfen); die Seite hat genau eine Verbindung, siehe unten.
export function neueVerbindung() {
  let verbindung = VERBUNDEN;
  let letzteAntwort: number | null = null;
  // Wann die erste Anfrage seit der letzten Antwort ohne Antwort blieb (null: seither keine).
  let ersterFehlschlag: number | null = null;
  const hoerer = new Set<() => void>();

  function setze(neu: Verbindung) {
    verbindung = neu;
    for (const h of [...hoerer]) h();
  }

  return {
    // JARVIS hat geantwortet (auch mit einem Fehler wie „409“: Das ist eine Antwort).
    meldeAntwort(): void {
      letzteAntwort = Date.now();
      ersterFehlschlag = null;
      if (verbindung.aus) setze(VERBUNDEN);
    },

    // Eine Anfrage ist ohne Antwort geblieben. begonnen: wann sie losging. Sie zählt nur, wenn das nach der letzten
    // Antwort war: Braucht eine einzelne Stelle von JARVIS sehr lange (der Kalender, das Postfach) und wird nach
    // ihrer Frist aufgegeben, während er anderswo längst wieder geantwortet hat, sagt das nichts über JARVIS.
    meldeKeineAntwort(begonnen: number): void {
      if (letzteAntwort !== null && begonnen < letzteAntwort) return;
      const jetzt = Date.now();
      ersterFehlschlag ??= jetzt;
      if (verbindung.aus || jetzt - ersterFehlschlag < AUS_NACH_MS) return;
      if (letzteAntwort !== null && jetzt - letzteAntwort < OHNE_ANTWORT_MS) return;
      setze({ aus: true, seit: letzteAntwort });
    },

    // Dasselbe Objekt, solange sich nichts ändert (für den Haken useVerbindung in usePolling.ts).
    verbindungJetzt: (): Verbindung => verbindung,

    abonniereVerbindung(h: () => void): () => void {
      hoerer.add(h);
      return () => void hoerer.delete(h);
    },
  };
}

export const { meldeAntwort, meldeKeineAntwort, verbindungJetzt, abonniereVerbindung } = neueVerbindung();
