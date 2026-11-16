"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getJson } from "./api";
import { abonniere, bild, ladeNeu, setze, type Bild } from "./geteilt";
import { abonniereVerbindung, VERBUNDEN, verbindungJetzt, type Verbindung } from "./verbindung";

const LEER: Bild = { stand: null, gescheitert: false };

// Lädt eine JARVIS-Schnittstelle sofort und danach in festen Abständen neu.
// `reload` lädt sofort, `set` übernimmt eine Antwort, die eine Änderung schon mitgebracht hat.
// Fragen mehrere Stellen dieselbe Schnittstelle ab (die Sicherheitslage steht in der Hinweisleiste, in „Heute“
// und in den Einstellungen), läuft nur eine Abfrage im kürzesten Takt, und alle sehen denselben Stand. Die
// Regeln dazu stehen in geteilt.ts. Ist die letzte Stelle weg, wird der Stand vergessen und später frisch geladen.
export function usePolling<T>(url: string, intervalMs: number) {
  const subscribe = useCallback((hoerer: () => void) => abonniere(url, intervalMs, hoerer, getJson), [url, intervalMs]);
  // Eine Anmeldung für beides: den Stand und die Auskunft, dass die Schnittstelle noch nie geantwortet hat und der
  // letzte Versuch gescheitert ist (failed; nicht bloß „lädt noch“).
  const { stand, gescheitert } = useSyncExternalStore(
    subscribe,
    () => bild(url),
    () => LEER,
  );
  const [data, failed] = [stand as T | null, gescheitert];
  const reload = useCallback((query = "") => ladeNeu(url, query), [url]);
  const set = useCallback((wert: T) => setze(url, wert), [url]);
  return { data, failed, reload, set };
}

// Antwortet JARVIS gerade überhaupt? (Die Regel steht in verbindung.ts.) Für den Hinweis oben in jeder Ansicht.
export function useVerbindung(): Verbindung {
  return useSyncExternalStore(abonniereVerbindung, verbindungJetzt, () => VERBUNDEN);
}
