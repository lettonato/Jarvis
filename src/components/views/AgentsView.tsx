"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "../icons";
import { useJarvis } from "../JarvisProvider";
import { PageHeader, Panel } from "../ui";
import { fromIso } from "@/lib/dates";
import { CURRENT_PHASE, isActive, MODULES, type JarvisModule } from "@/lib/modules";

// Alle Agenten auf einen Blick: was sie heute können und was noch kommt.
// Kommst du über eine Kachel, steht der passende Agent hervorgehoben im Blick.

const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "short" });

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function useHash(): string {
  return useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
}

export function AgentsView() {
  const hash = useHash();

  useEffect(() => {
    if (hash) document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hash]);

  return (
    <main className="view-enter mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="agenten" title="Agenten" subtitle={`Jeder Agent hat eine Aufgabe. Gerade läuft Phase ${CURRENT_PHASE} des Bauplans.`} />
      <div className="grid gap-4 md:grid-cols-2">
        {MODULES.map((m) => (
          <AgentCard key={m.id} module={m} highlighted={m.id === hash} />
        ))}
      </div>
    </main>
  );
}

function AgentCard({ module, highlighted }: { module: JarvisModule; highlighted: boolean }) {
  const active = isActive(module);
  const ownView = !module.href.startsWith("/agenten");
  return (
    <div id={module.id} className="scroll-mt-24">
      <Panel glow={highlighted} className={`h-full ${active ? "" : "opacity-80"}`}>
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-sky-300/30 bg-sky-400/10 text-sky-300">
            <Icon name={module.id} className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold uppercase tracking-[0.18em] text-sky-100">{module.name}</h2>
              <span className="text-[10px] tracking-widest text-sky-200/60">{module.code}</span>
              <span className={`ml-auto rounded px-2 py-0.5 text-[10px] font-bold tracking-widest ${active ? "bg-up/15 text-up" : "bg-panel-2 text-quiet"}`}>
                {active ? "● AKTIV" : module.phase >= 6 ? "SPÄTER" : `PHASE ${module.phase}`}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-sky-50/85">{module.about}</p>
            {module.id === "wetter" && <WeatherDetail />}
            {ownView && (
              <Link href={module.href} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-sky-300 hover:text-sky-100">
                Ansicht öffnen →
              </Link>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function WeatherDetail() {
  const { weather } = useJarvis();
  if (!weather) return <p className="mt-3 text-xs text-quiet">Wetter lädt …</p>;
  return (
    <div className="mt-3">
      <p className="text-sm text-sky-50">
        <span className="text-2xl font-bold">{Math.round(weather.temperature)} °C</span> in {weather.place}, {weather.description}
      </p>
      <p className="text-xs text-quiet">
        gefühlt {Math.round(weather.feelsLike)} °C · Luftfeuchte {weather.humidity} % · Wind {Math.round(weather.windKmh)} km/h
        {weather.source === "demo" && <span className="ml-2 text-amber-300">Beispieldaten</span>}
      </p>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {weather.days.map((d, i) => (
          <div key={d.date} className="rounded-lg border border-sky-300/15 bg-desk/50 px-2 py-1.5 text-center text-[11px]">
            <p className="font-bold text-sky-200">{i === 0 ? "Heute" : WEEKDAY.format(fromIso(d.date))}</p>
            <p className="text-sky-50">
              {Math.round(d.min)}° / {Math.round(d.max)}°
            </p>
            <p className="truncate text-quiet" title={d.description}>
              {d.description}
            </p>
            <p className="text-sky-300/80">{d.rain} % Regen</p>
          </div>
        ))}
      </div>
    </div>
  );
}
