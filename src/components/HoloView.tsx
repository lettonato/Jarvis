import { ViewTransition, type ReactNode } from "react";
import { HOLO_TYPES } from "@/lib/holo";

// Umhüllt eine ganze Ansicht. Je nach Art der Navigation fliegt sie anders herein und hinaus;
// die Animationen selbst stehen in globals.css. Ohne Art (Zurück-Taste des Browsers) blendet sie nur weich über.
const byType = Object.fromEntries([...HOLO_TYPES.map((t) => [t, t]), ["default", "holo-fade"]]);

export function HoloView({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={byType} exit={byType} default="none">
      {children}
    </ViewTransition>
  );
}

// Ein Teil, der in der nächsten Ansicht wieder auftaucht (JARVIS, eine Modul-Kachel) und dorthin fliegt.
export function Holo({ name, children }: { name: string; children: ReactNode }) {
  return (
    <ViewTransition name={name} share="holo-morph" default="none">
      {children}
    </ViewTransition>
  );
}
