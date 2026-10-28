"use client";

import { useJarvis } from "./JarvisProvider";
import { clock, eventsOn, nextEvent, type CalendarSnapshot } from "@/lib/calendar";
import { isoDate } from "@/lib/dates";
import { formatEur, formatPct, formatSignedUsd } from "@/lib/format";
import { MOOD_LABEL, type IntelSnapshot } from "@/lib/intel";
import type { MailSnapshot } from "@/lib/mail";
import type { MarketSnapshot } from "@/lib/market";
import type { ModuleId } from "@/lib/modules";
import { SAFETY, STATUS_LABEL, type DeskSnapshot } from "@/lib/paper";
import { dateOf, dueSoon, type TasksSnapshot } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";
import type { WeatherSnapshot } from "@/lib/weather";

// Was auf den Tafeln der Module steht: eine Zahl und eine Zeile dazu, etwa „4 neue wichtige Mails“.

export type Telemetry = { value: string; detail: string; alert?: boolean };

type Data = {
  market: MarketSnapshot | null;
  desk: DeskSnapshot | null;
  weather: WeatherSnapshot | null;
  tasks: TasksSnapshot | null;
  mail: MailSnapshot | null;
  calendar: CalendarSnapshot | null;
  intel: IntelSnapshot | null;
  brain: boolean | null;
  now: Date | null;
};

function calendarTelemetry(calendar: CalendarSnapshot | null, now: Date | null): Telemetry | undefined {
  if (!calendar || !now) return undefined;
  if (calendar.access === "offen") return { value: "einrichten", detail: "Kalender verbinden" };
  if (calendar.access === "kein-mac") return { value: "–", detail: "nur auf dem Mac" };
  if (calendar.access !== "ok") return { value: "!", detail: "kein Zugriff auf den Kalender", alert: true };
  const rest = eventsOn(calendar.events, isoDate(now)).filter((e) => e.allDay || e.end > now.getTime());
  const next = nextEvent(calendar.events, now.getTime());
  const soon = next && isoDate(new Date(next.start)) === isoDate(now) ? `als Nächstes ${clock(next.start)} ${next.title}` : "heute keine Termine mehr";
  return { value: String(rest.length), detail: soon };
}

function intelTelemetry(intel: IntelSnapshot | null): Telemetry | undefined {
  if (!intel) return undefined;
  if (!intel.configured) return { value: "einrichten", detail: "xAI-Schlüssel eintragen" };
  if (intel.warning) return { value: "WARNUNG", detail: intel.warning.text, alert: true };
  if (intel.running && !intel.report) return { value: "liest …", detail: "Grok liest Nachrichten und X" };
  if (!intel.report) return { value: "–", detail: "noch kein Lagebild" };
  return { value: MOOD_LABEL[intel.report.mood], detail: intel.report.items[0]?.title ?? "nichts Wichtiges in den Nachrichten" };
}

function telemetryFor({ market, desk, weather, tasks, mail, calendar, intel, brain, now }: Data): Partial<Record<ModuleId, Telemetry>> {
  const today = now ? isoDate(now) : null;
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
    kalender: calendarTelemetry(calendar, now),
    // Sobald der Spielgeld-Handel einmal gestartet wurde, zeigt die Kachel Gewinn und Testtag statt des Scanners.
    trading:
      desk && desk.status !== "aus"
        ? {
            value: formatSignedUsd(desk.pnlUsd),
            detail: `${desk.status === "laeuft" ? "Spielgeld" : STATUS_LABEL[desk.status]} · Tag ${Math.min(desk.testDay, SAFETY.testDays)}/${SAFETY.testDays}`,
            alert: desk.status === "notaus" || desk.status === "tageslimit",
          }
        : market
          ? { value: `${passed}/${market.scan.candidates.length}`, detail: "Coins bestehen die Filter" }
          : undefined,
    markt: btc ? { value: formatEur(btc.eur), detail: `BTC ${formatPct(btc.change24h)} in 24 Std` } : undefined,
    intel: intelTelemetry(intel),
    wetter: weather ? { value: `${Math.round(weather.temperature)} °C`, detail: `${weather.place}, ${weather.description}` } : undefined,
    cognition: brain === null ? undefined : brain ? { value: "AN", detail: "Claude versteht freie Sätze" } : { value: "einrichten", detail: "Claude-Schlüssel eintragen" },
  };
}

export function useTelemetry(): { telemetry: Partial<Record<ModuleId, Telemetry>>; brain: boolean } {
  const { market, desk, weather, tasks, mail, calendar, intel, settings } = useJarvis();
  const now = useNow();
  const brain = settings ? settings.brain.configured : null;
  return { telemetry: telemetryFor({ market, desk, weather, tasks, mail, calendar, intel, brain, now }), brain: Boolean(brain) };
}
