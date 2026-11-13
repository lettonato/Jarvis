"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ApprovalBar, openApprovals } from "./Approvals";
import { Chips, Composer, HandsFreeSwitch, Messages, NewConversation, sessionLabel, useDraft, useStateLabel } from "./Console";
import { Icon } from "./icons";
import { useConversation, useJarvis } from "./JarvisProvider";
import { Orb } from "./Orb";
import { RaumLink } from "./RaumLink";
import { SicherheitsLeiste } from "./Sicherheit";
import { eventsOn } from "@/lib/calendar";
import { isoDate } from "@/lib/dates";
import { RAEUME, raumVon, type Raum } from "@/lib/raeume";
import { dateOf, dueSoon } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";

// Der Rahmen um alle Räume: unten auf dem Boden die Leiste mit den Räumen und dem Feld für JARVIS, oben die
// Hinweise, die nicht warten können (Not-Aus, Freigaben, Rückfragen), und hinter dem Raum die dunkle Wand,
// die bei der Kamerafahrt vorbeizieht. Die Räume selbst bringt jede Seite mit (src/components/Raum.tsx).

type Marke = { zahl: number; dringend: boolean };

// Die kleinen Zahlen an den Räumen: was dort gerade auf dich wartet.
function useMarken(): Record<string, Marke | undefined> {
  const { tasks, mail, calendar, intel, desk, documents, projekte } = useJarvis();
  const now = useNow();
  const today = now ? isoDate(now) : null;
  const events = now && today && calendar?.access === "ok" ? eventsOn(calendar.events, today).filter((e) => e.allDay || e.end > now.getTime()).length : 0;
  const soon = today && tasks?.configured ? dueSoon(tasks.tasks, today) : [];
  const overdue = today ? soon.filter((t) => dateOf(t)! < today).length : 0;
  const important = mail?.configured && !mail.error ? mail.importantUnread : 0;
  const fragen = openApprovals(desk).length;
  return {
    "/aufgaben": soon.length ? { zahl: soon.length, dringend: overdue > 0 } : undefined,
    "/kalender": events ? { zahl: events, dringend: false } : undefined,
    "/post": important ? { zahl: important, dringend: true } : undefined,
    "/dokumente": documents?.running ? { zahl: 1, dringend: false } : undefined,
    "/projekte": projekte?.vorschlaege.length ? { zahl: projekte.vorschlaege.length, dringend: false } : undefined,
    "/trading": fragen ? { zahl: fragen, dringend: true } : undefined,
    "/intel": intel?.warning ? { zahl: 1, dringend: true } : undefined,
  };
}

// Wie viele Räume die Leiste selbst zeigt, hängt von der Breite ab; der Rest steht unter „Mehr“.
const IMMER = 5;
const BREIT = 8;
const sichtbar = (i: number) => (i < IMMER ? "hidden lg:flex" : i < BREIT ? "hidden xl:flex" : "hidden");
const imMenue = (i: number) => (i < IMMER ? "lg:hidden" : i < BREIT ? "xl:hidden" : "");

function Zahl({ marke }: { marke?: Marke }) {
  if (!marke) return null;
  return (
    <span className={`grid h-[1.3rem] min-w-[1.3rem] place-items-center rounded-full px-1 text-[0.72rem] font-bold leading-none ${marke.dringend ? "bg-rot text-white" : "bg-sonne text-schiefer"}`}>
      {marke.zahl}
    </span>
  );
}

function Mehr({ hier, marken }: { hier: Raum; marken: Record<string, Marke | undefined> }) {
  const [offen, setOffen] = useState(false);
  const hinten = RAEUME.findIndex((r) => r.href === hier.href) >= BREIT;
  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOffen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
        aria-haspopup="menu"
        className={`flex items-center gap-1 text-[1.05rem] transition-colors hover:text-schiefer ${hinten ? "font-bold text-schiefer" : "font-medium text-quiet"}`}
      >
        <span className="lg:hidden">Räume</span>
        <span className="hidden lg:inline">{hinten ? hier.name : "Mehr"}</span>
        <Icon name="hoch" className={`h-4 w-4 transition-transform ${offen ? "" : "rotate-180"}`} />
      </button>
      {offen && (
        <ul role="menu" className="absolute bottom-full left-1/2 mb-5 min-w-[13rem] -translate-x-1/2 animate-[jarvis-sheet_220ms_var(--weich)] rounded-md bg-white/95 p-2 shadow-[0_24px_50px_-18px_rgba(20,34,40,0.5)] backdrop-blur-xl">
          {RAEUME.map((r, i) => (
            <li key={r.href} role="none" className={imMenue(i)}>
              <RaumLink
                href={r.href}
                role="menuitem"
                aria-current={r.href === hier.href ? "page" : undefined}
                className={`flex items-center justify-between gap-4 rounded px-3 py-2 text-[1.05rem] hover:bg-schiefer/5 ${r.href === hier.href ? "font-bold text-schiefer" : "font-medium text-stein"}`}
              >
                {r.name}
                <Zahl marke={marken[r.href]} />
              </RaumLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Was JARVIS gerade sagt, in zwei Zeilen über der Leiste. Ein Klick klappt das ganze Gespräch auf.
function Antwortzeile({ onOpen }: { onOpen: () => void }) {
  const { state, session, voice } = useJarvis();
  const { turns, interim } = useConversation();
  const label = useStateLabel();
  const last = turns.findLast((t) => t.who === "jarvis");
  if (!turns.length && !interim && !voice.error && !voice.hint && state === "idle" && !session) return null;
  const zeile =
    voice.error || voice.hint ? (
      <p className={`line-clamp-2 ${voice.error ? "text-down" : "text-ocker"}`}>{voice.error ?? voice.hint}</p>
    ) : state === "listening" ? (
      <p className="line-clamp-2 italic text-quiet">{interim || "…"}</p>
    ) : last?.live && !last.text ? (
      <p className="text-quiet">{last.status ? `${last.status} …` : "Denke nach …"}</p>
    ) : (
      // Schreibt Claude eine lange Antwort, siehst du hier immer die letzten zwei Zeilen.
      <span className="flex max-h-[2.9rem] flex-col justify-end overflow-hidden">
        <span>{last?.text ?? label}</span>
      </span>
    );
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Ganzes Gespräch zeigen"
      className="pointer-events-auto flex w-[min(46rem,100%)] animate-[jarvis-sheet_260ms_var(--weich)] items-center gap-3 rounded-[1.1rem] bg-white/90 px-4 py-2.5 text-left text-[0.95rem] leading-snug text-schiefer shadow-[0_24px_50px_-18px_rgba(20,34,40,0.45)] backdrop-blur-xl"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-quiet">{sessionLabel(session) ?? label}</span>
        {zeile}
      </span>
      <Icon name="hoch" className="h-4 w-4 shrink-0 text-quiet" />
    </button>
  );
}

function Gespraech({ onClose, onFill }: { onClose: () => void; onFill: (text: string) => void }) {
  const { session } = useJarvis();
  return (
    <section
      aria-label="Gespräch"
      className="pointer-events-auto w-[min(46rem,100%)] animate-[jarvis-sheet_260ms_var(--weich)] rounded-2xl bg-white/95 px-5 pb-4 pt-3 shadow-[0_30px_60px_-20px_rgba(12,28,40,0.5)] backdrop-blur-xl"
    >
      <div className="flex items-center gap-2 border-b border-schiefer/15 pb-2">
        <h2 className="min-w-0 flex-1 truncate text-base font-bold">{sessionLabel(session) ?? "Gespräch"}</h2>
        <NewConversation />
        <HandsFreeSwitch />
        <button type="button" onClick={onClose} aria-label="Gespräch zuklappen" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-quiet hover:bg-schiefer/5 hover:text-schiefer">
          <Icon name="runter" className="h-4 w-4" />
        </button>
      </div>
      <Messages className="h-[min(52vh,30rem)]" />
      <div className="mt-2">
        <Chips onFill={onFill} scroll />
      </div>
    </section>
  );
}

// Die Leiste auf dem Boden: der Name, die Räume, das Feld für JARVIS. Sie bleibt bei jeder Kamerafahrt stehen.
function Leiste() {
  const pathname = usePathname();
  const hier = raumVon(pathname);
  const marken = useMarken();
  const { state } = useJarvis();
  const label = useStateLabel();
  const { draft, setDraft, inputRef, fill } = useDraft();
  const [offen, setOffen] = useState(false);
  // Im Raum „Gespräch“ steht der Verlauf an der Wand; die Leiste zeigt ihn dort nicht noch einmal.
  const imGespraech = hier.href === "/fokus";
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex flex-col items-center gap-3 px-3"
      style={{ viewTransitionName: "jarvis-dock", paddingBottom: "max(10px, calc((var(--boden) - 4.25rem) / 2))" }}
    >
      {!imGespraech && (offen ? <Gespraech onClose={() => setOffen(false)} onFill={fill} /> : <Antwortzeile onOpen={() => setOffen(true)} />)}
      <div className="pointer-events-auto flex h-[4.25rem] max-w-full items-center gap-[clamp(0.9rem,1.7vw,2.2rem)] rounded-full bg-white/85 pl-[clamp(1rem,1.8vw,2rem)] pr-2 shadow-[0_24px_50px_-18px_rgba(20,34,40,0.4),0_0_0_1px_rgba(31,42,46,0.06)] backdrop-blur-xl">
        <RaumLink href="/fokus" aria-label="Gespräch mit JARVIS" className="text-[1.45rem] font-extrabold leading-none text-schiefer [font-stretch:66%]">
          JARVIS
        </RaumLink>
        <nav aria-label="Räume" className="flex items-center gap-[clamp(0.9rem,1.7vw,2.2rem)] whitespace-nowrap">
          {RAEUME.map((r, i) => (
            <RaumLink
              key={r.href}
              href={r.href}
              aria-current={r.href === hier.href ? "page" : undefined}
              className={`${sichtbar(i)} items-center gap-1.5 text-[1.05rem] transition-colors hover:text-schiefer ${r.href === hier.href ? "font-bold text-schiefer" : "font-medium text-quiet"}`}
            >
              {r.name}
              <Zahl marke={marken[r.href]} />
            </RaumLink>
          ))}
          <Mehr key={pathname} hier={hier} marken={marken} />
        </nav>
        <div className="w-[clamp(13rem,23vw,24rem)] min-w-0 shrink">
          <Composer
            inputRef={inputRef}
            draft={draft}
            setDraft={setDraft}
            vorn={
              <span className="grid h-10 w-9 shrink-0 place-items-center" title={label}>
                <Orb state={state} className="h-6 w-6" />
                <span className="sr-only" role="status">
                  {label}
                </span>
              </span>
            }
          />
        </div>
      </div>
    </div>
  );
}

// Oben in jedem Raum: was nicht warten kann. Ohne Not-Aus, Freigabe oder Rückfrage ist hier nichts zu sehen.
function Hinweise() {
  const { market, weather } = useJarvis();
  const demo = market?.majors.source === "demo" || weather?.source === "demo";
  return (
    <>
      <div className="fixed left-1/2 top-3 z-30 w-[min(54rem,calc(100vw-1.5rem))] -translate-x-1/2 space-y-2" style={{ viewTransitionName: "jarvis-hinweise" }}>
        <SicherheitsLeiste />
        <ApprovalBar />
      </div>
      {demo && <p className="pointer-events-none fixed right-4 top-3 z-20 hidden text-xs font-medium text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.6)] lg:block">Beispieldaten</p>}
    </>
  );
}

function Zwischenwand() {
  const pathname = usePathname();
  const name = raumVon(pathname).name;
  // Der Name füllt die Wand: kurze Namen groß, lange so, dass sie noch hineinpassen.
  return (
    <div className="zwischenwand" aria-hidden style={{ fontSize: `${Math.min(7.8, 60 / name.length)}vw` }}>
      {name}
    </div>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <Zwischenwand />
      {children}
      <Hinweise />
      <Leiste />
    </>
  );
}
