import { addDays } from "./dates";

// Aufgaben aus dem Obsidian-Tresor. Gelesen wird das Format des Tasks-Plugins
// („- [ ] Text 📅 2026-10-30“) und von Dataview („[due:: 2026-10-30]“).

export type Task = {
  id: string; // Datei und Zeile, z. B. "Projekte/Haus.md:12"
  file: string; // Pfad im Tresor
  line: number; // Zeile in der Datei, ab 0 gezählt
  raw: string; // die ganze Zeile, damit JARVIS vor dem Ändern prüfen kann, dass sie noch stimmt
  text: string; // lesbarer Text ohne Datum und Zeichen
  due?: string;
  scheduled?: string;
  important: boolean;
  recurring: boolean;
  tags: string[];
};

export type TasksSnapshot = {
  configured: boolean;
  vault?: { name: string; path: string };
  tasks: Task[];
  doneToday: number;
  error?: string;
};

export type TaskGroup = { id: "ueberfaellig" | "heute" | "woche" | "spaeter" | "offen"; title: string; tasks: Task[] };

// Wann eine Aufgabe dran ist: Fälligkeit, sonst das geplante Datum.
export const dateOf = (t: Task) => t.due ?? t.scheduled;

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const da = dateOf(a) ?? "9999";
    const db = dateOf(b) ?? "9999";
    if (da !== db) return da < db ? -1 : 1;
    if (a.important !== b.important) return a.important ? -1 : 1;
    return a.id < b.id ? -1 : 1;
  });
}

export function groupTasks(tasks: Task[], today: string): TaskGroup[] {
  const week = addDays(today, 7);
  const groups: TaskGroup[] = [
    { id: "ueberfaellig", title: "Überfällig", tasks: [] },
    { id: "heute", title: "Heute", tasks: [] },
    { id: "woche", title: "Nächste 7 Tage", tasks: [] },
    { id: "spaeter", title: "Später", tasks: [] },
    { id: "offen", title: "Ohne Datum", tasks: [] },
  ];
  for (const t of sortTasks(tasks)) {
    const d = dateOf(t);
    const g = !d ? 4 : d < today ? 0 : d === today ? 1 : d <= week ? 2 : 3;
    groups[g].tasks.push(t);
  }
  return groups.filter((g) => g.tasks.length > 0);
}

// „Bis nächste Woche muss noch erledigt werden“: alles Überfällige und alles in den nächsten 7 Tagen.
export function dueSoon(tasks: Task[], today: string): Task[] {
  const week = addDays(today, 7);
  return sortTasks(tasks.filter((t) => {
    const d = dateOf(t);
    return d !== undefined && d <= week;
  }));
}
