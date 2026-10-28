"use client";

import { Console, useStateLabel } from "./Console";
import { HoloLink } from "./HoloLink";
import { Holo } from "./HoloView";
import { ModuleCard } from "./ModuleCard";
import { Orb } from "./Orb";
import { useJarvis } from "./JarvisProvider";
import { useTelemetry } from "./useTelemetry";
import { focusRock, useWorldStatus, worldAnchor } from "./world/anchor";
import { MODULES } from "@/lib/modules";

// Die Übersicht: JARVIS schwebt über einem Tal aus leuchtenden Bergen, die Module stehen als Felsen mit
// Glas-Tafeln im Bogen um ihn. Kopf und Felsen gehören zur 3D-Welt hinter der Seite; hier bleibt nur der
// freie Platz, in den die Kamera sie rahmt, eine Liste der Module für die Tastatur und unten die Konsole.

export function CommandCenter() {
  const status = useWorldStatus();
  const label = useStateLabel();
  const { telemetry } = useTelemetry();

  if (status === "aus") return <Tiles />;

  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center px-3 pb-3 sm:px-6 sm:pb-4">
      <h1 className="sr-only">Übersicht</h1>
      {/* Mit der Tab-Taste gehst du die Felsen durch: Der gewählte leuchtet auf, Enter öffnet ihn. */}
      <nav aria-label="Module">
        <ul>
          {MODULES.map((m) => {
            const t = telemetry[m.id];
            return (
              <li key={m.id}>
                <HoloLink
                  href={m.href}
                  onFocus={() => focusRock(m.id)}
                  onBlur={() => focusRock(null)}
                  className="pointer-events-auto sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-1/2 focus-visible:top-20 focus-visible:z-40 focus-visible:-translate-x-1/2 focus-visible:rounded-full focus-visible:border focus-visible:border-sky-300/70 focus-visible:bg-panel focus-visible:px-4 focus-visible:py-2 focus-visible:text-xs focus-visible:font-bold focus-visible:uppercase focus-visible:tracking-widest focus-visible:text-sky-50 focus-visible:outline-none"
                >
                  {m.name} öffnen{t ? `: ${t.value}, ${t.detail}` : ""}
                </HoloLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div ref={worldAnchor} className="relative min-h-0 w-full flex-1">
        <p className="absolute inset-x-0 bottom-0 text-center text-[10px] uppercase tracking-[0.3em] text-sky-200/55">
          <span className="pointer-fine:hidden">Tippe einen Felsen an · wischen dreht den Kreis</span>
          <span className="hidden pointer-fine:inline">Klick auf einen Felsen öffnet das Modul · ziehen dreht den Kreis · Kopf für den Fokus</span>
        </p>
      </div>

      <p className="mt-2 mb-2 shrink-0 rounded-full border border-sky-300/30 bg-desk/70 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-sky-200">{label}</p>
      <div className="pointer-events-auto flex w-full justify-center">
        <Console />
      </div>
    </main>
  );
}

// Ohne 3D-Welt (kein WebGL): JARVIS als Kugel und die Module als einfache Kacheln.
function Tiles() {
  const { state } = useJarvis();
  const label = useStateLabel();
  const { telemetry, brain } = useTelemetry();
  return (
    <main className="pointer-events-auto flex-1 overflow-y-auto p-4 sm:px-6">
      <h1 className="sr-only">Übersicht</h1>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4">
        <Holo name="jarvis-kopf">
          <HoloLink href="/fokus" aria-label="Mit JARVIS allein sprechen" className="block">
            <Orb state={state} className="h-32 w-32" />
          </HoloLink>
        </Holo>
        <p className="rounded-full border border-sky-300/30 bg-desk/70 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-sky-200">{label}</p>
        <Console />
        <div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {MODULES.map((m) => (
            <ModuleCard key={m.id} module={m} telemetry={telemetry[m.id]} brain={brain} />
          ))}
        </div>
      </div>
    </main>
  );
}
