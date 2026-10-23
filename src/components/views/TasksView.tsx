"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useJarvis } from "../JarvisProvider";
import { VaultSetup } from "../setup";
import { Button, inputClass, Notice, PageHeader, Panel } from "../ui";
import { addDays, isoDate, shortDue } from "@/lib/dates";
import { dateOf, dueSoon, groupTasks, type Task } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";

// Aufgaben aus Obsidian, nach Fälligkeit sortiert. Abhaken, verschieben und neu notieren geht per Klick
// oder per Stimme; die Aufgabe, die JARVIS gerade mit dir bespricht, leuchtet.

const obsidianLink = (path: string) => `obsidian://open?path=${encodeURIComponent(path)}`;

export function TasksView() {
  const { tasks, session, reloadTasks, ask } = useJarvis();
  const now = useNow();
  const today = now ? isoDate(now) : null;
  const current = session?.kind === "aufgaben" ? session.ids[session.index] : null;

  if (tasks && !tasks.configured) {
    return (
      <Shell>
        <Panel className="max-w-2xl">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-sky-100">Mit Obsidian verbinden</h2>
          <p className="mb-4 text-sm text-quiet">
            JARVIS liest deine Aufgaben direkt aus deinem Obsidian-Tresor, sagt dir, was bis nächste Woche fällig ist, und hakt ab, was du erledigt hast.
            Hast du noch kein Obsidian, legt er dir einen Tresor mit den ersten Aufgaben an.
          </p>
          <VaultSetup />
        </Panel>
      </Shell>
    );
  }

  const groups = tasks && today ? groupTasks(tasks.tasks, today) : [];
  const soon = tasks && today ? dueSoon(tasks.tasks, today) : [];

  return (
    <Shell
      subtitle={tasks?.vault ? `aus deinem Obsidian-Tresor „${tasks.vault.name}“` : "lädt …"}
      actions={
        <>
          {soon.length > 0 && (
            <Button tone="primary" icon="fokus" onClick={() => ask("Meine Aufgaben")}>
              Mit JARVIS durchgehen
            </Button>
          )}
          {tasks?.vault && (
            <a
              href={obsidianLink(tasks.vault.path)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300/30 bg-sky-400/5 px-3 py-2 text-xs font-bold text-sky-100 hover:bg-sky-400/15"
            >
              In Obsidian öffnen
            </a>
          )}
          <Button icon="laden" onClick={reloadTasks} title="Neu laden">
            Neu laden
          </Button>
        </>
      }
    >
      {tasks?.error && <Notice tone="error">{tasks.error}</Notice>}
      {today && <AddTask today={today} />}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Stat label="Bis nächste Woche" value={soon.length} />
        <Stat label="Überfällig" value={today ? soon.filter((t) => dateOf(t)! < today).length : 0} alert />
        <Stat label="Heute erledigt" value={tasks?.doneToday ?? 0} ok />
      </div>
      {tasks && today && groups.length === 0 && <Notice tone="ok">Keine offenen Aufgaben. Alles erledigt.</Notice>}
      {groups.map((g) => (
        <Panel key={g.id} className={g.id === "ueberfaellig" ? "border-frame/40" : ""}>
          <h2 className={`mb-2 text-xs font-bold uppercase tracking-[0.25em] ${g.id === "ueberfaellig" ? "text-pink-300" : "text-sky-300"}`}>
            {g.title} · {g.tasks.length}
          </h2>
          <ul className="divide-y divide-sky-300/10">
            {g.tasks.map((t) => (
              <TaskRow key={t.id} task={t} today={today!} active={t.id === current} vaultPath={tasks?.vault?.path} />
            ))}
          </ul>
        </Panel>
      ))}
    </Shell>
  );
}

function Shell({ children, subtitle, actions }: { children: ReactNode; subtitle?: string; actions?: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="aufgaben" holo="modul-aufgaben" title="Aufgaben" subtitle={subtitle}>
        {actions}
      </PageHeader>
      {children}
    </main>
  );
}

function Stat({ label, value, alert, ok }: { label: string; value: number; alert?: boolean; ok?: boolean }) {
  const color = alert && value > 0 ? "text-pink-300" : ok && value > 0 ? "text-up" : "text-sky-50";
  return (
    <Panel className="px-3 py-3 sm:px-4">
      <p className="text-[9px] uppercase tracking-widest text-quiet sm:text-[10px]">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </Panel>
  );
}

function AddTask({ today }: { today: string }) {
  const { run, reloadTasks } = useJarvis();
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [important, setImportant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await run({ type: "addTask", text, due: due || undefined, important });
      setText("");
      setDue("");
      setImportant(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      await reloadTasks();
    } finally {
      setBusy(false);
    }
  };

  const quick = [
    { label: "Heute", date: today },
    { label: "Morgen", date: addDays(today, 1) },
    { label: "In 7 Tagen", date: addDays(today, 7) },
  ];

  return (
    <Panel>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Neue Aufgabe, z. B. Rechnung an Max schicken" aria-label="Neue Aufgabe" className={inputClass} />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Fällig am" className={`${inputClass} sm:w-44`} />
          <Button type="submit" tone="primary" icon="neu" disabled={busy || !text.trim()}>
            Notieren
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => setDue(due === q.date ? "" : q.date)}
              className={`rounded-full border px-2.5 py-1 ${due === q.date ? "border-sky-300 bg-sky-400/20 text-sky-50" : "border-sky-300/20 text-sky-200/80 hover:text-sky-50"}`}
            >
              {q.label}
            </button>
          ))}
          <label className="ml-1 inline-flex cursor-pointer items-center gap-1.5 text-sky-200/80">
            <input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} className="accent-pink-500" /> wichtig
          </label>
          <span className="ml-auto text-quiet">landet in JARVIS/Eingang.md</span>
        </div>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
    </Panel>
  );
}

function TaskRow({ task, today, active, vaultPath }: { task: Task; today: string; active: boolean; vaultPath?: string }) {
  const { run, discuss } = useJarvis();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const row = useRef<HTMLLIElement>(null);
  const d = dateOf(task);
  const overdue = d !== undefined && d < today;

  useEffect(() => {
    if (active) row.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);

  async function act(effect: Parameters<typeof run>[0]) {
    setBusy(true);
    setError(null);
    try {
      await run(effect);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      ref={row}
      className={`flex flex-col gap-2 rounded-lg px-2 py-2.5 transition sm:flex-row sm:items-center ${
        active ? "bg-sky-400/15 shadow-[0_0_0_1px_rgba(125,211,252,0.7),0_0_24px_rgba(56,189,248,0.3)]" : ""
      } ${busy ? "opacity-50" : ""}`}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <button
          type="button"
          disabled={busy || task.recurring}
          onClick={() => act({ type: "completeTask", task })}
          title={task.recurring ? "Wiederkehrende Aufgaben bitte in Obsidian abhaken" : "Erledigt"}
          aria-label={`${task.text} erledigt`}
          className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border border-sky-300/60 text-transparent transition hover:border-up hover:bg-up/20 hover:text-up disabled:cursor-not-allowed disabled:opacity-40"
        >
          ✓
        </button>
        <div className="min-w-0">
          <p className="text-sm text-sky-50">
            {task.important && <span className="mr-1.5 text-pink-300">▲</span>}
            {task.text}
            {task.recurring && <span className="ml-1.5 text-quiet">↻</span>}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-quiet">
            {d && <span className={overdue ? "font-bold text-pink-300" : "text-sky-200/80"}>{shortDue(d, today)}</span>}
            {vaultPath ? (
              <a href={obsidianLink(`${vaultPath}/${task.file}`)} className="truncate hover:text-sky-200" title="In Obsidian öffnen">
                {task.file.replace(/\.md$/, "")}
              </a>
            ) : (
              <span className="truncate">{task.file}</span>
            )}
            {task.tags.map((t) => (
              <span key={t} className="text-sky-300/70">
                #{t}
              </span>
            ))}
          </p>
          {error && <p className="mt-1 text-xs text-down">{error}</p>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5 pl-8 sm:pl-0">
        {active ? (
          <span className="rounded-full border border-sky-300/50 px-2 py-1 text-[10px] uppercase tracking-widest text-sky-200">JARVIS bespricht das</span>
        ) : (
          <Button small icon="fokus" onClick={() => discuss("aufgaben", task.id)}>
            Besprechen
          </Button>
        )}
        <Button small disabled={busy} onClick={() => act({ type: "rescheduleTask", task, date: addDays(today, 1) })}>
          Morgen
        </Button>
        <Button small disabled={busy} onClick={() => act({ type: "rescheduleTask", task, date: addDays(d && d > today ? d : today, 7) })}>
          +1 Woche
        </Button>
      </div>
    </li>
  );
}
