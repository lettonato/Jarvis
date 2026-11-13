"use client";

import { useCallback, useSyncExternalStore } from "react";
import { getJson } from "./api";
import { abonniere, ladeNeu, setze, stand } from "./geteilt";

// Lädt eine JARVIS-Schnittstelle sofort und danach in festen Abständen neu.
// `reload` lädt sofort, `set` übernimmt eine Antwort, die eine Änderung schon mitgebracht hat.
// Fragen mehrere Stellen dieselbe Schnittstelle ab (die Sicherheitslage steht in der Hinweisleiste, in „Heute“
// und in den Einstellungen), läuft nur eine Abfrage im kürzesten Takt, und alle sehen denselben Stand. Die
// Regeln dazu stehen in geteilt.ts. Ist die letzte Stelle weg, wird der Stand vergessen und später frisch geladen.
export function usePolling<T>(url: string, intervalMs: number) {
  const subscribe = useCallback((hoerer: () => void) => abonniere(url, intervalMs, hoerer, getJson), [url, intervalMs]);
  const data = useSyncExternalStore(
    subscribe,
    () => stand(url) as T | null,
    () => null,
  );
  const reload = useCallback((query = "") => ladeNeu(url, query), [url]);
  const set = useCallback((wert: T) => setze(url, wert), [url]);
  return { data, reload, set };
}
