import type { CalendarSnapshot } from "./calendar";
import type { IntelSnapshot } from "./intel";
import type { MailMessage, MailSnapshot } from "./mail";
import type { DeskSnapshot } from "./paper";
import type { TasksSnapshot } from "./tasks";

// Das KI-Gehirn: Sätze, die keine feste Regel versteht, beantwortet Claude. Hier steht, was die
// Seite an den Server schickt und was zurückkommt; die Arbeit macht src/lib/server/brain.ts.

export type BrainTurn = { who: "du" | "jarvis"; text: string };

export type BrainRequest = {
  text: string;
  // Die letzten Sätze des Gesprächs, damit Claude weiß, worauf sich „die“ oder „ihm“ bezieht.
  history: BrainTurn[];
  // Die Ansicht, in der du gerade bist, zum Beispiel "/post".
  view: string;
  // Was JARVIS gerade mit dir bespricht, wenn eine Besprechung läuft.
  focus: { kind: "post" | "aufgaben"; id: string | number } | null;
  // Kurze Lagezeilen, die nur die Seite kennt (Wetter, Kurse).
  extra: string[];
};

export type BrainReply = {
  reply: string;
  navigate?: string;
  // Claude möchte die Mails oder Aufgaben Punkt für Punkt mit dir durchgehen.
  session?: "post" | "aufgaben";
  // Frische Daten, wenn Claude etwas geändert hat.
  tasks?: TasksSnapshot;
  mail?: MailSnapshot;
  // Mails, die Claude geöffnet hat; die Post-Ansicht zeigt ihren Text.
  opened?: MailMessage[];
  // Neuer Stand des Spielgeld-Desks, wenn Claude ihn gesteuert hat.
  desk?: DeskSnapshot;
  // Der Kalender, wenn Claude einen Termin eingetragen hat.
  calendar?: CalendarSnapshot;
  // Intel, wenn Claude gezielt nach Nachrichten gesucht hat.
  intel?: IntelSnapshot;
};

export const VIEWS = {
  fokus: "/fokus",
  uebersicht: "/",
  aufgaben: "/aufgaben",
  kalender: "/kalender",
  post: "/post",
  trading: "/trading",
  intel: "/intel",
  agenten: "/agenten",
  einstellungen: "/einstellungen",
} as const;

export type ViewName = keyof typeof VIEWS;

export const viewName = (path: string): ViewName | undefined =>
  (Object.keys(VIEWS) as ViewName[]).find((v) => VIEWS[v] === path.split(/[?#]/)[0]);
