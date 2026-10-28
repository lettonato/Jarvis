"use client";

import { useCallback, useEffect, useState } from "react";
import { getJson } from "./api";

// Lädt eine JARVIS-Schnittstelle sofort und danach in festen Abständen neu.
// `reload` lädt sofort, `set` übernimmt eine Antwort, die eine Änderung schon mitgebracht hat.
export function usePolling<T>(url: string, intervalMs: number) {
  const [data, setData] = useState<T | null>(null);

  const reload = useCallback(
    async (query = "") => {
      try {
        const next = await getJson<T>(url + query);
        // Hat sich nichts geändert, bleibt alles stehen: Sonst zeichnet jede Abfrage die ganze Seite neu.
        setData((prev) => (prev !== null && JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      } catch {
        // Beim nächsten Durchlauf erneut versuchen.
      }
    },
    [url],
  );

  useEffect(() => {
    const first = setTimeout(reload, 0);
    const timer = setInterval(reload, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [reload, intervalMs]);

  return { data, reload, set: setData };
}
