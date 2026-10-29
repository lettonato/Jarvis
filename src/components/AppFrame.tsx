"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ApprovalBar, openApprovals } from "./Approvals";
import { Chips, Composer, HandsFreeSwitch, Messages, NewConversation, sessionLabel, useDraft, useStateLabel } from "./Console";
import { HoloLink } from "./HoloLink";
import { Holo } from "./HoloView";
import { Icon, type IconName } from "./icons";
import { useConversation, useJarvis } from "./JarvisProvider";
import { Orb } from "./Orb";
import { eventsOn } from "@/lib/calendar";
import { isoDate } from "@/lib/dates";
import { formatClock } from "@/lib/format";
import { dateOf, dueSoon } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";
import { World } from "./world/World";

// Der Rahmen um alle Ansichten: oben die Navigation, unten in den Arbeitsansichten der kleine JARVIS,
// mit dem du jederzeit weitersprichst. Ein Klick auf JARVIS führt in den Fokus, wo nur er zu sehen ist.

type Tab = { href: string; label: string; icon: IconName; badge?: { value: number; alert: boolean } };

function useTabs(): Tab[] {
  const { tasks, mail, calendar, intel, desk } = useJarvis();
  const now = useNow();
  const today = now ? isoDate(now) : null;
  const events = now && today && calendar?.access === "ok" ? eventsOn(calendar.events, today).filter((e) => e.allDay || e.end > now.getTime()).length : 0;
  const soon = today && tasks?.configured ? dueSoon(tasks.tasks, today) : [];
  const overdue = today ? soon.filter((t) => dateOf(t)! < today).length : 0;
  const important = mail?.configured && !mail.error ? mail.importantUnread : 0;
  return [
    { href: "/fokus", label: "JARVIS", icon: "fokus" },
    { href: "/", label: "Übersicht", icon: "uebersicht" },
    { href: "/aufgaben", label: "Aufgaben", icon: "aufgaben", badge: soon.length ? { value: soon.length, alert: overdue > 0 } : undefined },
    { href: "/kalender", label: "Kalender", icon: "kalender", badge: events ? { value: events, alert: false } : undefined },
    { href: "/post", label: "Post", icon: "post", badge: important ? { value: important, alert: true } : undefined },
    { href: "/browser", label: "Browser", icon: "browser" },
    { href: "/trading", label: "Trading", icon: "trading", badge: openApprovals(desk).length ? { value: openApprovals(desk).length, alert: true } : undefined },
    { href: "/intel", label: "Intel", icon: "intel", badge: intel?.warning ? { value: 1, alert: true } : undefined },
    { href: "/agenten", label: "Agenten", icon: "agenten" },
  ];
}

function Clock() {
  const now = useNow(1000);
  return <span className="rounded bg-panel-2 px-2 py-1 font-bold tabular-nums text-sky-100">{now ? formatClock(now) : "--:--:--"}</span>;
}

function NavBar() {
  const pathname = usePathname();
  const { market, weather, state } = useJarvis();
  const label = useStateLabel();
  const tabs = useTabs();
  const demo = market?.majors.source === "demo" || weather?.source === "demo";
  return (
    <header
      className="pointer-events-auto sticky top-0 z-30 shrink-0 border-b border-sky-300/10 bg-gradient-to-b from-desk/90 to-desk/55"
      style={{ viewTransitionName: "jarvis-nav" }}
    >
      <div className="flex items-center gap-3 px-3 py-2 sm:px-5">
        <HoloLink href="/fokus" className="group flex shrink-0 items-center gap-2.5" aria-label="JARVIS im Fokus">
          <Orb state={state} className="h-9 w-9" />
          <span className="hidden sm:block">
            <span className="block text-base font-bold leading-tight tracking-[0.35em] text-sky-100 group-hover:text-white">JARVIS</span>
            <span className="block text-[9px] uppercase tracking-[0.3em] text-quiet">{label}</span>
          </span>
        </HoloLink>
        <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto xl:gap-0.5 px-1 [scrollbar-width:none] sm:justify-center" aria-label="Ansichten">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <HoloLink
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold uppercase tracking-widest transition xl:px-1.5 xl:tracking-wider 2xl:tracking-widest ${
                  active ? "border-transparent text-sky-50" : "border-transparent text-sky-200/70 hover:border-sky-300/30 hover:text-sky-100"
                }`}
              >
                {active && <ActiveGlow />}
                <Icon name={t.icon} className="relative h-4 w-4" />
                <span className={`relative ${active ? "" : "sr-only xl:not-sr-only"}`}>{t.label}</span>
                {t.badge && (
                  <span className={`relative grid min-w-5 place-items-center rounded-full px-1.5 text-[10px] leading-5 ${t.badge.alert ? "bg-frame text-white" : "bg-sky-400/30 text-sky-50"}`}>
                    {t.badge.value}
                  </span>
                )}
              </HoloLink>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2 text-[11px] tracking-widest">
          {demo && <span className="hidden rounded bg-amber-500/15 px-2 py-1 text-amber-300 md:inline">BEISPIELDATEN</span>}
          <span className="hidden lg:inline">
            <Clock />
          </span>
          <HoloLink
            href="/einstellungen"
            aria-label="Einstellungen"
            aria-current={pathname === "/einstellungen" ? "page" : undefined}
            className={`relative grid h-8 w-8 place-items-center rounded-lg border transition ${
              pathname === "/einstellungen" ? "border-transparent text-sky-50" : "border-sky-300/20 text-sky-200/80 hover:text-sky-50"
            }`}
          >
            {pathname === "/einstellungen" && <ActiveGlow />}
            <Icon name="einstellungen" className="relative h-4 w-4" />
          </HoloLink>
        </div>
      </div>
      <ApprovalBar />
    </header>
  );
}

// Der Leuchtrahmen um die aktive Ansicht. Er gleitet beim Wechsel zum nächsten Reiter.
function ActiveGlow() {
  return (
    <span
      aria-hidden
      className="absolute inset-0 rounded-lg border border-sky-300/60 bg-sky-400/15 shadow-[0_0_14px_rgba(56,189,248,0.3)]"
      style={{ viewTransitionName: "nav-aktiv" }}
    />
  );
}

// Unten in Aufgaben, Post, Trading, Agenten und Einstellungen: JARVIS ist klein dabei und spricht weiter.
// Beim Wechsel zwischen diesen Ansichten bleibt er stehen; der Kopf fliegt in den Fokus, wenn du ihn antippst.
// Der Pfeil klappt das ganze Gespräch auf.
function Dock() {
  const { state, session, voice } = useJarvis();
  const { turns, interim } = useConversation();
  const label = useStateLabel();
  const { draft, setDraft, inputRef, fill } = useDraft();
  const [open, setOpen] = useState(false);
  const last = turns.findLast((t) => t.who === "jarvis");
  const line =
    voice.error || voice.hint ? (
      <p className={`line-clamp-2 text-sm ${voice.error ? "text-down" : "text-amber-200"}`}>{voice.error ?? voice.hint}</p>
    ) : state === "listening" ? (
      <p className="line-clamp-2 text-sm italic text-quiet">{interim || "…"}</p>
    ) : last?.live && !last.text ? (
      <p className="text-sm text-sky-300/90">{last.status ? `${last.status} …` : "Denke nach …"}</p>
    ) : (
      // Schreibt Claude eine lange Antwort, siehst du hier immer die letzten zwei Zeilen.
      <div className="flex h-10 flex-col justify-end overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_8px)]">
        <p className="text-sm leading-5 text-sky-100">{last?.text ?? "Ich bin hier. Sprich mit mir oder schreib unten, was ich tun soll."}</p>
      </div>
    );
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-2 sm:px-4" style={{ viewTransitionName: "jarvis-dock" }}>
      <div className="mx-auto max-w-6xl rounded-t-2xl border border-b-0 border-sky-300/25 bg-panel shadow-[0_-10px_40px_rgba(9,11,24,0.8)]">
        {open && (
          <div className="animate-[jarvis-sheet_260ms_cubic-bezier(0.16,1,0.3,1)] border-b border-line px-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">Gespräch</p>
              <NewConversation />
            </div>
            <Messages className="h-[min(52vh,480px)]" />
          </div>
        )}
        <div className="p-3">
          <div className="flex items-center gap-3">
            <HoloLink href="/fokus" aria-label="JARVIS im Fokus öffnen" title="JARVIS im Fokus">
              <Holo name="jarvis-kopf">
                <span className="block">
                  <Orb state={state} className="h-12 w-12" />
                </span>
              </Holo>
            </HoloLink>
            <button type="button" onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left" aria-expanded={open} aria-label={open ? "Gespräch zuklappen" : "Ganzes Gespräch zeigen"}>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">{sessionLabel(session) ?? `JARVIS · ${label}`}</p>
              {line}
            </button>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              aria-hidden
              tabIndex={-1}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-sky-200 transition-colors hover:border-sky-300/50 hover:text-sky-50"
            >
              <Icon name="hoch" className={`h-4 w-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
            </button>
            <div className="hidden sm:block">
              <HandsFreeSwitch />
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-end">
            <div className="min-w-0 lg:flex-1 lg:pb-2.5">
              <Chips onFill={fill} scroll />
            </div>
            <div className="lg:w-[460px]">
              <Composer inputRef={inputRef} draft={draft} setDraft={setDraft} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const dock = pathname !== "/" && pathname !== "/fokus";
  // In Übersicht und Fokus passt alles genau in den Bildschirm: Nur das Gespräch scrollt, das Eingabefeld bleibt unten.
  const fit = pathname === "/fokus" || pathname === "/";
  // In der Übersicht gehen Maus und Finger durch die Seite hindurch an die Felsen in der 3D-Welt;
  // nur Navigation und Konsole fangen sie selbst.
  const stage = pathname === "/";
  return (
    <>
      <World />
      <div className={`relative z-10 flex flex-col ${fit ? "h-dvh flex-none overflow-hidden" : "min-h-full flex-1"} ${stage ? "pointer-events-none" : ""}`}>
        <NavBar />
        <div className={`flex min-h-0 flex-1 flex-col ${dock ? "pb-40 lg:pb-32" : ""}`}>{children}</div>
        {dock && <Dock />}
      </div>
    </>
  );
}
