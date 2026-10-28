import { useSyncExternalStore } from "react";

// Die Ansichten sagen der 3D-Welt, wohin sie den Kopf oder die Bühne legen soll: Ein leeres Element auf der
// Seite (in der Übersicht der freie Platz über der Konsole, im Fokus die Stelle des Kopfes) meldet sich hier an.
// Die Kamera rahmt das Bild dann so, dass Kopf und Felsen genau dort stehen, auch wenn sich das Element bewegt.

const anchors = new Set<HTMLElement>();

export function worldAnchor(el: HTMLElement | null) {
  if (!el) return;
  anchors.add(el);
  return () => {
    anchors.delete(el);
  };
}

export function anchorRect(): DOMRect | null {
  let last: HTMLElement | null = null;
  for (const el of anchors) if (el.isConnected) last = el;
  return last?.getBoundingClientRect() ?? null;
}

// Ob die 3D-Welt läuft. Ohne WebGL (alter Rechner, Grafik abgeschaltet) zeigen die Ansichten einfache Kacheln.
export type WorldStatus = "startet" | "laeuft" | "aus";
let status: WorldStatus = "startet";
const listeners = new Set<() => void>();

export function setWorldStatus(next: WorldStatus) {
  if (next === status) return;
  status = next;
  for (const l of listeners) l();
}

export function useWorldStatus(): WorldStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
    () => "startet",
  );
}

// Tastatur: Bekommt ein Modul-Link den Fokus, leuchtet sein Fels auf.
let focusHandler: ((id: string | null) => void) | null = null;
export const setFocusHandler = (h: typeof focusHandler) => (focusHandler = h);
export const focusRock = (id: string | null) => focusHandler?.(id);
