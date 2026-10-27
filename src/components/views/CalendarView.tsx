"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useJarvis } from "../JarvisProvider";
import { CalendarSetup } from "../setup";
import { Button, inputClass, Notice, PageHeader, Panel } from "../ui";
import { postJson } from "@/lib/api";
import { clock, confirmSentence, eventsOn, nextEvent, type CalendarEvent, type CalendarSnapshot, type NewEvent } from "@/lib/calendar";
import { addDays, isoDate, shortDue } from "@/lib/dates";
import { useNow } from "@/lib/useNow";

// Die Termine aus dem Apple-Kalender für die nächsten zwei Wochen. Neue Termine trägst du hier
// oder per Stimme ein; ändern und löschen geht nur in der Kalender-App selbst.

const AGENDA_DAYS = 14;
const LONG = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

export function CalendarView() {
  const { calendar, run, reloadCalendar } = useJarvis();
  const now = useNow();
  const today = now ? isoDate(now) : null;
  const [note, setNote] = useState<string | null>(null);

  const open = async (date?: string) => {
    setNote(null);
    try {
      const said = await run({ type: "openCalendar", date });
      if (said) setNote(said);
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    }
  };

  const ready = calendar?.access === "ok";
  const days = today ? Array.from({ length: AGENDA_DAYS }, (_, i) => addDays(today, i)) : [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="kalender" holo="modul-kalender" title="Kalender" subtitle={ready ? `${calendar.calendars.length} Kalender aus der Kalender-App auf deinem Mac` : "dein Apple-Kalender"}>
        {calendar && calendar.access !== "kein-mac" && (
          <Button icon="kalender" onClick={() => open()}>
            In Kalender-App öffnen
          </Button>
        )}
        <Button icon="laden" onClick={reloadCalendar} title="Neu laden">
          Neu laden
        </Button>
      </PageHeader>

      {!ready && (
        <Panel className="max-w-2xl">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-sky-100">Mit dem Kalender verbinden</h2>
          <p className="mb-4 text-sm text-quiet">
            JARVIS liest die Kalender-App auf deinem Mac, also alle Kalender, die dort eingerichtet sind (iCloud, Google, Exchange). Er nennt dir die Termine im Briefing,
            erinnert dich eine Viertelstunde vorher und trägt neue Termine auf Zuruf ein. Ändern oder löschen kann er nichts.
          </p>
          <CalendarSetup />
        </Panel>
      )}

      {note && <Notice tone="info">{note}</Notice>}

      {ready && now && today && (
        <>
          <Summary calendar={calendar} now={now} today={today} />
          <AddEvent calendar={calendar} today={today} />
          {days.map((day) => (
            <Day key={day} day={day} today={today} events={eventsOn(calendar.events, day)} now={now.getTime()} onOpen={() => open(day)} />
          ))}
          <p className="text-center text-xs text-quiet">
            Weiter voraus und zum Ändern oder Löschen:{" "}
            <button type="button" onClick={() => open(addDays(today, AGENDA_DAYS))} className="underline hover:text-sky-200">
              Kalender-App
            </button>
          </p>
        </>
      )}
    </main>
  );
}

function Summary({ calendar, now, today }: { calendar: CalendarSnapshot; now: Date; today: string }) {
  const rest = eventsOn(calendar.events, today).filter((e) => e.allDay || e.end > now.getTime());
  let week = 0;
  for (let i = 0; i < 7; i++) week += eventsOn(calendar.events, addDays(today, i)).length;
  const next = nextEvent(calendar.events, now.getTime());
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Stat label="Heute noch" value={String(rest.length)} />
      <Stat label="Nächste 7 Tage" value={String(week)} />
      <Stat label="Als Nächstes" value={next ? clock(next.start) : "–"} detail={next ? `${shortDue(isoDate(new Date(next.start)), today)} · ${next.title}` : "nichts geplant"} />
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Panel className="min-w-0 px-3 py-3 sm:px-4">
      <p className="text-[9px] uppercase tracking-widest text-quiet sm:text-[10px]">{label}</p>
      <p className="text-2xl font-bold tabular-nums text-sky-50">{value}</p>
      {detail && <p className="truncate text-[11px] text-sky-200/80">{detail}</p>}
    </Panel>
  );
}

const DURATIONS = [
  { label: "30 Min", minutes: 30 },
  { label: "1 Std", minutes: 60 },
  { label: "1½ Std", minutes: 90 },
  { label: "2 Std", minutes: 120 },
];

function AddEvent({ calendar, today }: { calendar: CalendarSnapshot; today: string }) {
  const { setCalendar } = useJarvis();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setBusy(true);
    setError(null);
    setSaved(null);
    const event: NewEvent = { title, date, ...(time ? { time, minutes } : {}) };
    try {
      const result = await postJson<CalendarSnapshot & { saved: { calendar: string; event: NewEvent } }>("/api/kalender", { action: "neu", event });
      setCalendar(result);
      setSaved(confirmSentence(result.saved.event, today, result.saved.calendar));
      setTitle("");
      setTime("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const quick = [
    { label: "Heute", date: today },
    { label: "Morgen", date: addDays(today, 1) },
    { label: "Übermorgen", date: addDays(today, 2) },
  ];

  return (
    <Panel>
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neuer Termin, z. B. Zahnarzt" aria-label="Neuer Termin" className={inputClass} />
          <div className="flex gap-2">
            <input type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} aria-label="Tag" className={`${inputClass} sm:w-44`} />
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Uhrzeit, leer für ganztägig" className={`${inputClass} w-28`} />
          </div>
          <Button type="submit" tone="primary" icon="neu" disabled={busy || !title.trim() || !date}>
            Eintragen
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {quick.map((q) => (
            <Chip key={q.label} active={date === q.date} onClick={() => setDate(q.date)}>
              {q.label}
            </Chip>
          ))}
          <span className="mx-1 h-4 w-px bg-sky-300/20" />
          {time ? (
            DURATIONS.map((d) => (
              <Chip key={d.minutes} active={minutes === d.minutes} onClick={() => setMinutes(d.minutes)}>
                {d.label}
              </Chip>
            ))
          ) : (
            <span className="text-quiet">ohne Uhrzeit ganztägig</span>
          )}
          <span className="ml-auto text-quiet">landet in {calendar.target ?? "deinem Standardkalender"}</span>
        </div>
        <p className="text-[11px] text-quiet">Oder sag: „Jarvis, trag morgen um 9 Uhr Zahnarzt ein.“</p>
        {saved && <Notice tone="ok">{saved}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
      </form>
    </Panel>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 ${active ? "border-sky-300 bg-sky-400/20 text-sky-50" : "border-sky-300/20 text-sky-200/80 hover:text-sky-50"}`}
    >
      {children}
    </button>
  );
}

function Day({ day, today, events, now, onOpen }: { day: string; today: string; events: CalendarEvent[]; now: number; onOpen: () => void }) {
  const label = day === today ? "Heute" : day === addDays(today, 1) ? "Morgen" : null;
  const long = LONG.format(new Date(`${day}T12:00:00`));
  const weekend = [0, 6].includes(new Date(`${day}T12:00:00`).getDay());
  if (events.length === 0 && day !== today) {
    return (
      <div className="flex items-center gap-3 px-1 text-[11px] text-quiet">
        <span className={`min-w-52 shrink-0 whitespace-nowrap uppercase tracking-widest ${weekend ? "text-sky-300/60" : ""}`}>{label ? `${label} · ${long}` : long}</span>
        <span className="h-px flex-1 bg-sky-300/10" />
        <span>frei</span>
      </div>
    );
  }
  return (
    <Panel className={day === today ? "border-sky-300/40" : ""}>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="min-w-0 flex-1 truncate text-xs font-bold uppercase tracking-[0.12em] text-sky-300 sm:tracking-[0.25em]">
          {label ? `${label} · ` : ""}
          {long}
        </h2>
        <Button small icon="kalender" onClick={onOpen} title="Diesen Tag in der Kalender-App zeigen">
          Zeigen
        </Button>
      </div>
      {events.length === 0 ? (
        <p className="px-2 py-1 text-sm text-quiet">Heute steht nichts im Kalender.</p>
      ) : (
        <ul className="divide-y divide-sky-300/10">
          {events.map((e) => (
            <EventRow key={e.id} event={e} day={day} now={now} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function EventRow({ event, day, now }: { event: CalendarEvent; day: string; now: number }) {
  const past = !event.allDay && event.end <= now;
  const running = !event.allDay && event.start <= now && event.end > now;
  const startsBefore = isoDate(new Date(event.start)) < day;
  const time = event.allDay ? "ganztägig" : startsBefore ? `bis ${clock(event.end)}` : `${clock(event.start)}–${clock(event.end)}`;
  return (
    <li className={`flex items-start gap-3 rounded-lg px-2 py-2 ${past ? "opacity-45" : ""} ${running ? "bg-sky-400/10" : ""}`}>
      <span className={`w-24 shrink-0 pt-0.5 text-xs tabular-nums ${running ? "font-bold text-sky-100" : "text-sky-200/80"}`}>{time}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-sky-50">
          {event.title}
          {running && <span className="ml-2 rounded-full border border-sky-300/50 px-1.5 text-[10px] uppercase tracking-widest text-sky-200">läuft</span>}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-quiet">
          {event.location && <span className="truncate">{event.location}</span>}
          <span className="text-sky-300/70">{event.calendar}</span>
        </p>
      </div>
    </li>
  );
}
