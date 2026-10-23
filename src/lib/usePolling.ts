"use client";

import { useEffect, useState } from "react";

// Lädt eine JARVIS-Schnittstelle sofort und danach in festen Abständen neu.
export function usePolling<T>(url: string, intervalMs: number): T | null {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (res.ok && alive) setData((await res.json()) as T);
      } catch {
        // Beim nächsten Durchlauf erneut versuchen.
      }
    }
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [url, intervalMs]);

  return data;
}
