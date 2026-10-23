import Link from "next/link";
import type { ReactNode } from "react";
import { isActive, type JarvisModule, type ModuleId } from "@/lib/modules";

export type Telemetry = { value: string; detail: string };

// Eine schwebende Glas-Kachel wie in der NEXUS-Oberfläche.
export function ModuleCard({
  module,
  telemetry,
  tilt,
}: {
  module: JarvisModule;
  telemetry?: Telemetry;
  tilt: "left" | "right";
}) {
  const active = isActive(module);
  const card = (
    <article
      className={`group relative h-full rounded-xl border border-sky-300/25 bg-sky-400/[0.05] p-4 shadow-[0_0_30px_rgba(56,189,248,0.10)] backdrop-blur-sm transition duration-300 hover:border-sky-300/60 hover:bg-sky-400/[0.09] ${
        tilt === "left" ? "lg:[transform:rotateY(16deg)]" : "lg:[transform:rotateY(-16deg)]"
      } ${active ? "" : "opacity-55"}`}
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
      <div className="mt-3 flex items-center gap-2 sm:gap-3">
        <ModuleIcon id={module.id} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold uppercase tracking-[0.1em] text-sky-100 sm:text-lg sm:tracking-[0.18em]">
            {module.name}
          </h3>
          <p className="truncate text-[11px] text-quiet">{module.tagline}</p>
        </div>
      </div>
      <div className="mt-3 border-t border-sky-300/15 pt-2">
        <p className="text-[9px] uppercase tracking-widest text-sky-200/50">Telemetrie</p>
        <div className="flex flex-col-reverse sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
          <span className="truncate text-[11px] text-quiet">{telemetry?.detail ?? "wartet auf Freischaltung"}</span>
          <span className="shrink-0 font-bold text-sky-50">{telemetry?.value ?? "–"}</span>
        </div>
      </div>
    </article>
  );
  return module.href ? (
    <Link href={module.href} className="block h-full">
      {card}
    </Link>
  ) : (
    card
  );
}

function Brackets() {
  const base = "pointer-events-none absolute h-3 w-3 border-sky-300/70";
  return (
    <>
      <span className={`${base} left-1.5 top-1.5 border-l-2 border-t-2`} />
      <span className={`${base} right-1.5 top-1.5 border-r-2 border-t-2`} />
      <span className={`${base} bottom-1.5 left-1.5 border-b-2 border-l-2`} />
      <span className={`${base} bottom-1.5 right-1.5 border-b-2 border-r-2`} />
    </>
  );
}

const ICONS: Record<ModuleId, ReactNode> = {
  trading: (
    <>
      <path d="M6 4v16M12 2v20M18 6v12" />
      <rect x="4" y="8" width="4" height="7" />
      <rect x="10" y="5" width="4" height="9" />
      <rect x="16" y="9" width="4" height="5" />
    </>
  ),
  markt: <path d="M3 17l5-5 4 3 8-9M15 6h5v5" />,
  wetter: <path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z" />,
  cognition: (
    <>
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </>
  ),
  intel: <path d="M2 12h3l2-6 4 12 3-9 2 3h6" />,
  kalender: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h2M12 14h2M16 14h2M8 17h2M12 17h2" />
    </>
  ),
  telefon: <path d="M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" />,
  browser: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
};

function ModuleIcon({ id }: { id: ModuleId }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-7 w-7 shrink-0 text-sky-300 sm:h-9 sm:w-9 drop-shadow-[0_0_6px_rgba(125,211,252,0.7)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[id]}
    </svg>
  );
}
