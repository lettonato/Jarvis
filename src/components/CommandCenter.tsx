"use client";

import Link from "next/link";
import { Console, STATE_LABEL } from "./Console";
import { useJarvis } from "./JarvisProvider";
import { ModuleCard, type Telemetry } from "./ModuleCard";
import { ParticleHead } from "./ParticleHead";
import { isoDate } from "@/lib/dates";
import { formatEur, formatPct } from "@/lib/format";
import type { MailSnapshot } from "@/lib/mail";
import type { MarketSnapshot } from "@/lib/market";
import { MODULES, type ModuleId } from "@/lib/modules";
import { dateOf, dueSoon, type TasksSnapshot } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";
import type { WeatherSnapshot } from "@/lib/weather";

// Die Übersicht wie im NEXUS-Video: JARVIS in der Mitte, die Module als Kacheln links und rechts.

type Data = { market: MarketSnapshot | null; weather: WeatherSnapshot | null; tasks: TasksSnapshot | null; mail: MailSnapshot | null; today: string | null };

function telemetryFor({ market, weather, tasks, mail, today }: Data): Partial<Record<ModuleId, Telemetry>> {
  const btc = market?.majors.quotes.find((q) => q.symbol === "BTC");
  const passed = market?.scan.candidates.filter((c) => c.passed).length ?? 0;
  const soon = tasks?.configured && today ? dueSoon(tasks.tasks, today) : [];
  const overdue = today ? soon.filter((t) => dateOf(t)! < today).length : 0;
  return {
    aufgaben: !tasks
      ? undefined
      : !tasks.configured
        ? { value: "einrichten", detail: "Obsidian verbinden" }
        : { value: String(soon.length), detail: overdue ? `fällig, ${overdue} überfällig` : "bis nächste Woche fällig", alert: overdue > 0 },
    post: !mail
      ? undefined
      : !mail.configured
        ? { value: "einrichten", detail: "Postfach verbinden" }
        : mail.error
          ? { value: "!", detail: "Postfach antwortet nicht", alert: true }
          : { value: String(mail.importantUnread), detail: "neue wichtige Mails", alert: mail.importantUnread > 0 },
    trading: market ? { value: `${passed}/${market.scan.candidates.length}`, detail: "Coins bestehen die Filter" } : undefined,
    markt: btc ? { value: formatEur(btc.eur), detail: `BTC ${formatPct(btc.change24h)} in 24 Std` } : undefined,
    wetter: weather ? { value: `${Math.round(weather.temperature)} °C`, detail: `${weather.place}, ${weather.description}` } : undefined,
  };
}

export function CommandCenter() {
  const { market, weather, tasks, mail, state } = useJarvis();
  const now = useNow();
  const telemetry = telemetryFor({ market, weather, tasks, mail, today: now ? isoDate(now) : null });
  const left = MODULES.filter((m) => m.side === "links");
  const right = MODULES.filter((m) => m.side === "rechts");

  return (
    <main className="view-enter grid flex-1 gap-4 p-4 sm:px-6 lg:grid-cols-[minmax(220px,280px)_1fr_minmax(220px,280px)] lg:[perspective:1400px]">
      <div className="order-2 grid grid-cols-2 gap-3 lg:order-none lg:grid-cols-1 lg:content-center lg:[transform-style:preserve-3d]">
        {left.map((m) => (
          <ModuleCard key={m.id} module={m} telemetry={telemetry[m.id]} tilt="left" />
        ))}
      </div>

      <section className="order-1 flex min-w-0 flex-col items-center lg:order-none">
        <Link
          href="/fokus"
          aria-label="Mit JARVIS allein sprechen"
          title="Mit JARVIS allein sprechen"
          className="group relative block h-[44vh] min-h-[280px] w-full max-w-[760px] [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_78%)]"
        >
          <ParticleHead state={state} />
          <span className="pointer-events-none absolute inset-x-0 top-3 text-center text-[10px] uppercase tracking-[0.3em] text-sky-200/0 transition group-hover:text-sky-200/80">
            Antippen für den Fokus
          </span>
        </Link>
        <p className="-mt-6 mb-3 rounded-full border border-sky-300/30 bg-desk/70 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-sky-200">
          {STATE_LABEL[state]}
        </p>
        <Console />
      </section>

      <div className="order-3 grid grid-cols-2 gap-3 lg:order-none lg:grid-cols-1 lg:content-center lg:[transform-style:preserve-3d]">
        {right.map((m) => (
          <ModuleCard key={m.id} module={m} telemetry={telemetry[m.id]} tilt="right" />
        ))}
      </div>
    </main>
  );
}
