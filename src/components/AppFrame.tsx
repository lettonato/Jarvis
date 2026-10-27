"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AskForm, Chips, HandsFreeSwitch, MicButton, sessionLabel, useDraft, useStateLabel } from "./Console";
import { HoloLink } from "./HoloLink";
import { Holo } from "./HoloView";
import { Icon, type IconName } from "./icons";
import { useJarvis } from "./JarvisProvider";
import { Orb } from "./Orb";
import { eventsOn } from "@/lib/calendar";
import { isoDate } from "@/lib/dates";
import { formatClock } from "@/lib/format";
import { dateOf, dueSoon } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";

// Der Rahmen um alle Ansichten: oben die Navigation, unten in den Arbeitsansichten der kleine JARVIS,
// mit dem du jederzeit weitersprichst. Ein Klick auf JARVIS führt in den Fokus, wo nur er zu sehen ist.

type Tab = { href: string; label: string; icon: IconName; badge?: { value: number; alert: boolean } };

function useTabs(): Tab[] {
  const { tasks, mail, calendar } = useJarvis();
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
    { href: "/trading", label: "Trading", icon: "trading" },
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
    <header className="sticky top-0 z-30 border-b border-sky-300/10 bg-desk/75 backdrop-blur-md" style={{ viewTransitionName: "jarvis-nav" }}>
      <div className="flex items-center gap-3 px-3 py-2 sm:px-5">
        <HoloLink href="/fokus" className="group flex shrink-0 items-center gap-2.5" aria-label="JARVIS im Fokus">
          <Orb state={state} className="h-9 w-9" />
          <span className="hidden sm:block">
            <span className="block text-base font-bold leading-tight tracking-[0.35em] text-sky-100 group-hover:text-white">JARVIS</span>
            <span className="block text-[9px] uppercase tracking-[0.3em] text-quiet">{label}</span>
          </span>
        </HoloLink>
        <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 [scrollbar-width:none] sm:justify-center" aria-label="Ansichten">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <HoloLink
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-widest transition ${
                  active ? "border-transparent text-sky-50" : "border-transparent text-sky-200/70 hover:border-sky-300/30 hover:text-sky-100"
                }`}
              >
                {active && <ActiveGlow />}
                <Icon name={t.icon} className="relative h-4 w-4" />
                <span className={`relative ${active ? "" : "sr-only sm:not-sr-only"}`}>{t.label}</span>
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
function Dock() {
  const { turns, state, session, voice } = useJarvis();
  const label = useStateLabel();
  const { draft, setDraft, inputRef, fill } = useDraft();
  const last = [...turns].reverse().find((t) => t.who === "jarvis");
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-2 sm:px-4" style={{ viewTransitionName: "jarvis-dock" }}>
      <div className="mx-auto max-w-6xl rounded-t-2xl border border-b-0 border-sky-300/25 bg-panel/90 p-3 shadow-[0_-10px_40px_rgba(9,11,24,0.8)] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <HoloLink href="/fokus" aria-label="JARVIS im Fokus öffnen" title="JARVIS im Fokus">
            <Holo name="jarvis-kopf">
              <span className="block">
                <Orb state={state} className="h-12 w-12" />
              </span>
            </Holo>
          </HoloLink>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-sky-300">{sessionLabel(session) ?? `JARVIS · ${label}`}</p>
            {voice.error || voice.hint ? (
              <p className={`line-clamp-2 text-sm ${voice.error ? "text-down" : "text-amber-200"}`}>{voice.error ?? voice.hint}</p>
            ) : state === "listening" ? (
              <p className="line-clamp-2 text-sm italic text-quiet">{voice.interim || "…"}</p>
            ) : (
              <p className="line-clamp-2 text-sm text-sky-100">{last?.text ?? "Ich bin hier. Sprich mit mir oder tipp unten, was ich tun soll."}</p>
            )}
          </div>
          <div className="hidden sm:block">
            <HandsFreeSwitch />
          </div>
          <MicButton />
        </div>
        <div className="mt-2 flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="min-w-0 lg:flex-1">
            <Chips onFill={fill} scroll />
          </div>
          <div className="lg:w-[420px]">
            <AskForm inputRef={inputRef} draft={draft} setDraft={setDraft} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const dock = pathname !== "/" && pathname !== "/fokus";
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[radial-gradient(ellipse_at_top,_#16204a_0%,_#090b18_62%)]">
      <NavBar />
      <div className={`flex flex-1 flex-col ${dock ? "pb-40 lg:pb-32" : ""}`}>{children}</div>
      {dock && <Dock />}
    </div>
  );
}
