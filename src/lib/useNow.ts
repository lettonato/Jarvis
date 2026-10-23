"use client";

import { useCallback, useSyncExternalStore } from "react";

// Die aktuelle Zeit, auf `stepMs` gerundet. Beim Vorrendern auf dem Server gibt es noch keine Uhrzeit (null),
// damit die Seite statisch bleibt; der Browser setzt sie sofort ein.
export function useNow(stepMs = 60_000): Date | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const id = setInterval(onChange, Math.min(stepMs / 4, 5_000));
      return () => clearInterval(id);
    },
    [stepMs],
  );
  const t = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / stepMs) * stepMs,
    () => null,
  );
  return t === null ? null : new Date(t);
}
