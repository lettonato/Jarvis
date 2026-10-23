import { HoloLink } from "./HoloLink";
import { Holo } from "./HoloView";
import { Icon } from "./icons";
import { Brackets } from "./ui";
import { isActive, type JarvisModule } from "@/lib/modules";

export type Telemetry = { value: string; detail: string; alert?: boolean };

// Eine schwebende Glas-Kachel wie in der NEXUS-Oberfläche. Jede Kachel öffnet ihre Ansicht.
export function ModuleCard({ module, telemetry, tilt }: { module: JarvisModule; telemetry?: Telemetry; tilt: "left" | "right" }) {
  const active = isActive(module);
  return (
    <Holo name={`modul-${module.id}`}>
      <HoloLink
        href={module.href}
        className={`group relative block h-full rounded-xl border border-sky-300/25 bg-sky-400/[0.05] p-3.5 shadow-[0_0_30px_rgba(56,189,248,0.10)] backdrop-blur-sm transition duration-300 hover:border-sky-300/70 hover:bg-sky-400/[0.1] hover:shadow-[0_0_34px_rgba(56,189,248,0.3)] focus-visible:outline-2 focus-visible:outline-sky-300 lg:hover:[transform:rotateY(0deg)_scale(1.03)] ${
          tilt === "left" ? "lg:[transform:rotateY(16deg)]" : "lg:[transform:rotateY(-16deg)]"
        } ${active ? "" : "opacity-60 hover:opacity-100"}`}
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
          <span className="text-sky-300 drop-shadow-[0_0_6px_rgba(125,211,252,0.7)]">
            <Icon name={module.id} className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold uppercase tracking-[0.1em] text-sky-100 sm:text-base sm:tracking-[0.18em]">{module.name}</h3>
            <p className="truncate text-[11px] text-quiet">{module.tagline}</p>
          </div>
        </div>
        <div className="mt-2.5 border-t border-sky-300/15 pt-2">
          <div className="flex flex-col-reverse sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <span className="truncate text-[11px] text-quiet">{telemetry?.detail ?? (active ? "lädt …" : "ansehen, was kommt")}</span>
            <span className={`shrink-0 font-bold ${telemetry?.alert ? "text-pink-300" : "text-sky-50"}`}>{telemetry?.value ?? "–"}</span>
          </div>
        </div>
      </HoloLink>
    </Holo>
  );
}
