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
        setData(await getJson<T>(url + query));
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
