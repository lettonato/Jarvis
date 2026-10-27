import { HoloLink } from "./HoloLink";
import { Holo } from "./HoloView";
import { Icon } from "./icons";
import { Brackets } from "./ui";
import { isActive, type JarvisModule } from "@/lib/modules";

export type Telemetry = { value: string; detail: string; alert?: boolean };

// Eine schwebende Glas-Kachel wie in der NEXUS-Oberfläche. Jede Kachel öffnet ihre Ansicht.
// Der Link selbst bleibt still stehen und fängt die Maus; nur die Glasplatte darin dreht sich zu dir,
// kommt nach vorn und leuchtet auf. So flackert die Kachel nicht, wenn sie sich unter der Maus bewegt.
export function ModuleCard({ module, telemetry, tilt, brain }: { module: JarvisModule; telemetry?: Telemetry; tilt: "left" | "right"; brain: boolean }) {
  const active = isActive(module, brain);
  return (
    <Holo name={`modul-${module.id}`}>
      <HoloLink
        href={module.href}
        aria-label={`${module.name} öffnen`}
        className="group relative block h-full rounded-xl [transform-style:preserve-3d] hover:z-20 focus-visible:z-20 focus-visible:outline-none"
      >
        <div
          className={`relative h-full rounded-xl border border-sky-300/25 bg-sky-400/[0.05] p-3.5 shadow-[0_0_30px_rgba(56,189,248,0.10)] backdrop-blur-sm transition duration-300 ease-out group-hover:border-sky-200/90 group-hover:bg-sky-400/[0.14] group-hover:shadow-[0_0_48px_rgba(56,189,248,0.45)] group-focus-visible:border-sky-200/90 group-focus-visible:shadow-[0_0_48px_rgba(56,189,248,0.45)] group-active:scale-[0.98] motion-safe:group-hover:[transform:translateZ(40px)_scale(1.05)] ${
            // Die Kachel wächst zur Mitte hin, damit sie nicht über den Bildschirmrand ragt.
            tilt === "left"
              ? "origin-left lg:[transform:rotateY(16deg)] lg:motion-safe:group-hover:[transform:rotateY(0deg)_translateX(16px)_translateZ(50px)_scale(1.07)]"
              : "origin-right lg:[transform:rotateY(-16deg)] lg:motion-safe:group-hover:[transform:rotateY(0deg)_translateX(-16px)_translateZ(50px)_scale(1.07)]"
          } ${active ? "" : "opacity-60 group-hover:opacity-100"}`}
        >
          <Brackets />
          <div className="flex items-center justify-between text-[10px] tracking-widest">
            <span className="text-sky-200/60">{module.code}</span>
            {active ? (
              <span className="text-up">● AKTIV</span>
            ) : (
              <span className="text-quiet">{module.phase >= 6 ? "SPÄTER" : `PHASE ${module.phase}`}</span>
            )}
          </div>
          <div className="mt-2.5 flex items-center gap-2 sm:gap-3">
            <span className="text-sky-300 drop-shadow-[0_0_6px_rgba(125,211,252,0.7)] transition duration-300 group-hover:text-sky-100 group-hover:drop-shadow-[0_0_12px_rgba(125,211,252,1)]">
              <Icon name={module.id} className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-bold uppercase tracking-[0.1em] text-sky-100 sm:text-base sm:tracking-[0.18em]">{module.name}</h3>
              <p className="truncate text-[11px] text-quiet">{module.tagline}</p>
            </div>
            <span aria-hidden className="hidden shrink-0 -translate-x-1 text-lg text-sky-200 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100 sm:inline">
              ›
            </span>
          </div>
          <div className="mt-2.5 border-t border-sky-300/15 pt-2">
            <div className="flex flex-col-reverse sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <span className="truncate text-[11px] text-quiet">{telemetry?.detail ?? (active ? "lädt …" : "ansehen, was kommt")}</span>
              <span className={`shrink-0 font-bold ${telemetry?.alert ? "text-pink-300" : "text-sky-50"}`}>{telemetry?.value ?? "–"}</span>
            </div>
          </div>
        </div>
      </HoloLink>
    </Holo>
  );
}
