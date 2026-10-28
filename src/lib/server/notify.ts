// Meldungen, die JARVIS dir von selbst schickt, etwa aufs Handy: ein Kauf oder Verkauf des Desks, das
// Tageslimit, eine Warnung von Intel. Wer meldet, muss nicht wissen, wer zuhört; ohne Zuhörer passiert nichts.
// Die Zuhörer liegen an einer gemeinsamen Stelle, weil Next.js den Code in mehreren Bündeln laden kann.

export type Notice = { kind: "trade" | "warnung"; text: string };

type Listener = (notice: Notice) => void;
const holder = globalThis as typeof globalThis & { __jarvisNotify?: Set<Listener> };
const listeners = (holder.__jarvisNotify ??= new Set());

export function notify(notice: Notice) {
  for (const listener of listeners) {
    try {
      listener(notice);
    } catch (e) {
      console.error("Meldung:", e);
    }
  }
}

export function onNotice(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
