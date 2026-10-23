"use client";

import { useEffect, useState } from "react";
import { AGENTS, CURRENT_PHASE, type Agent } from "@/lib/agents";
import type { Candidate, MajorQuote, MarketSnapshot } from "@/lib/market";
import { FILTER_LABELS, HARD_FILTERS, type FilterKey } from "@/lib/thresholds";
import {
  formatAge,
  formatClock,
  formatCompactUsd,
  formatCount,
  formatEur,
  formatPct,
  formatPriceUsd,
} from "@/lib/format";

const REFRESH_MS = 30_000;
const LOG_LIMIT = 40;

type LogEntry = { id: number; time: string; agent: string; text: string };

let logId = 0;

function logFor(snap: MarketSnapshot): LogEntry[] {
  const time = formatClock(new Date(snap.fetchedAt));
  const entry = (agent: string, text: string): LogEntry => ({ id: logId++, time, agent, text });
  const passed = snap.scan.candidates.filter((c) => c.passed);
  const failed = snap.scan.candidates.length - passed.length;
  return [
    ...snap.majors.quotes.map((q) => entry("MARKT", `${q.symbol} ${formatEur(q.eur)} (${formatPct(q.change24h)})`)),
    entry("SCAN", `${snap.scan.scanned} neue Solana-Coins geladen`),
    entry("VET", `${passed.length} bestehen, ${failed} aussortiert`),
    ...passed.slice(0, 3).map((c) => entry("VET", `${c.symbol} besteht alle harten Filter`)),
  ].reverse();
}

export function Dashboard() {
  const [snap, setSnap] = useState<MarketSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch("/api/market", { cache: "no-store" });
        if (!res.ok) throw new Error(`Server antwortet mit ${res.status}`);
        const next = (await res.json()) as MarketSnapshot;
        if (!alive) return;
        setSnap(next);
        setError(null);
        setLog((prev) => [...logFor(next), ...prev].slice(0, LOG_LIMIT));
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    }
    load();
    const refresh = setInterval(load, REFRESH_MS);
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => {
      alive = false;
      clearInterval(refresh);
      clearInterval(clock);
    };
  }, []);

  const isDemo = snap ? snap.majors.source === "demo" || snap.scan.source === "demo" : false;

  return (
    <main className="m-2 flex flex-1 flex-col gap-3 rounded-lg border-2 border-frame/80 p-3 sm:m-4 sm:p-4">
      <Header now={now} isDemo={isDemo} loading={!snap} />
      {error && (
        <p className="rounded border border-down/60 bg-down/10 px-3 py-2 text-sm text-down">
          Keine Verbindung zum JARVIS-Server: {error}
        </p>
      )}
      <AgentGrid snap={snap} />
      <section className="grid gap-3 lg:grid-cols-4">
        {(snap?.majors.quotes ?? []).map((q) => (
          <MajorCard key={q.id} quote={q} />
        ))}
        <PaperAccount />
      </section>
      <section className="grid flex-1 gap-3 lg:grid-cols-3">
        <ScannerTable snap={snap} />
        <div className="flex min-w-0 flex-col gap-3">
          <ThresholdsPanel />
          <ChiefLog log={log} />
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Header({ now, isDemo, loading }: { now: Date | null; isDemo: boolean; loading: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
      <div className="flex items-center gap-3">
        <div className="relative grid h-10 w-10 place-items-center rounded-full border border-sky-400/70 bg-sky-500/10 shadow-[0_0_18px_rgba(56,189,248,0.45)]">
          <span className="text-lg font-bold text-sky-300">J</span>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-widest text-frame">JARVIS</h1>
          <p className="text-[11px] uppercase tracking-widest text-quiet">
            Trading-Desk · Phase {CURRENT_PHASE}: nur lesen, kein Handel
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs">
        {!loading && (
          <span
            className={`rounded px-2 py-1 font-bold tracking-wider ${
              isDemo ? "bg-amber-500/15 text-amber-300" : "bg-up/15 text-up"
            }`}
          >
            {isDemo ? "BEISPIELDATEN" : "● LIVE"}
          </span>
        )}
        <span className="rounded border border-line px-2 py-1 text-quiet">
          {now ? formatClock(now) : "--:--:--"} lokal
        </span>
        <span className="rounded bg-panel-2 px-2 py-1 font-bold text-ink">
          {now ? formatClock(now, "UTC") : "--:--:--"} UTC
        </span>
      </div>
    </header>
  );
}

function AgentGrid({ snap }: { snap: MarketSnapshot | null }) {
  const candidates = snap?.scan.candidates ?? [];
  const passed = candidates.filter((c) => c.passed).length;
  const metrics: Partial<Record<Agent["id"], { value: string; detail: string; progress?: number }>> = {
    scan: {
      value: snap ? String(snap.scan.scanned) : "…",
      detail: "Coins gescannt",
      progress: snap && snap.scan.scanned ? candidates.length / snap.scan.scanned : 0,
    },
    vet: {
      value: snap ? `${passed}/${candidates.length}` : "…",
      detail: "bestehen die Filter",
      progress: candidates.length ? passed / candidates.length : 0,
    },
    chief: { value: "–", detail: "KI-Gehirn kommt in Phase 2" },
  };
  return (
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {AGENTS.map((agent) => (
        <AgentTile key={agent.id} agent={agent} metric={metrics[agent.id]} />
      ))}
    </section>
  );
}

function AgentTile({
  agent,
  metric,
}: {
  agent: Agent;
  metric?: { value: string; detail: string; progress?: number };
}) {
  const active = agent.phase <= CURRENT_PHASE;
  return (
    <article
      className={`flex flex-col gap-1 rounded-md border border-line bg-panel p-3 ${active ? "" : "opacity-60"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${active ? "animate-pulse" : ""}`}
            style={{ background: agent.color, boxShadow: active ? `0 0 10px ${agent.color}` : undefined }}
          />
          <h2 className="font-bold uppercase tracking-wider" style={{ color: agent.color }}>
            {agent.name}
          </h2>
        </div>
        <span className="whitespace-nowrap rounded bg-panel-2 px-1.5 py-0.5 text-[10px] uppercase text-quiet">
          {active ? "aktiv" : `Phase ${agent.phase}`}
        </span>
      </div>
      <p className="text-[11px] text-quiet">{agent.motto}</p>
      <div className="mt-auto flex items-end justify-between pt-2">
        <span className="text-[11px] text-quiet">{metric?.detail ?? "wartet"}</span>
        <span className="font-bold">{metric?.value ?? ""}</span>
      </div>
      {metric?.progress !== undefined && (
        <div className="h-1 overflow-hidden rounded bg-panel-2">
          <div className="h-full rounded" style={{ width: `${Math.round(metric.progress * 100)}%`, background: agent.color }} />
        </div>
      )}
    </article>
  );
}

function MajorCard({ quote }: { quote: MajorQuote }) {
  const up = quote.change24h >= 0;
  return (
    <article className="rounded-md border border-line bg-panel p-3">
      <div className="flex items-center justify-between text-xs text-quiet">
        <span>{quote.name}</span>
        <span className="font-bold text-ink">{quote.symbol}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{formatEur(quote.eur)}</p>
      <p className={`text-sm ${up ? "text-up" : "text-down"}`}>{formatPct(quote.change24h)} in 24 Std</p>
    </article>
  );
}

function PaperAccount() {
  return (
    <article className="rounded-md border border-dashed border-line bg-panel p-3">
      <div className="flex items-center justify-between text-xs text-quiet">
        <span>Spielgeld-Konto</span>
        <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[10px] uppercase">ab Phase 3</span>
      </div>
      <p className="mt-1 text-2xl font-bold text-quiet">{formatEur(10_000)}</p>
      <p className="text-sm text-quiet">Simulierter Handel, kein echtes Geld</p>
    </article>
  );
}

function ScannerTable({ snap }: { snap: MarketSnapshot | null }) {
  const rows = snap?.scan.candidates ?? [];
  return (
    <section className="flex min-w-0 flex-col rounded-md border border-line bg-panel lg:col-span-2">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-sky-300">Scan · Solana-Memecoins</h2>
        <span className="text-xs text-quiet">{snap ? `${snap.scan.scanned} gescannt` : "lädt …"}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] whitespace-nowrap text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-quiet">
            <tr className="border-b border-line">
              <th className="px-3 py-2">Coin</th>
              <th className="px-3 py-2 text-right">Preis</th>
              <th className="px-3 py-2 text-right">24 Std</th>
              <th className="px-3 py-2 text-right">Liquidität</th>
              <th className="px-3 py-2 text-right">Volumen 24 Std</th>
              <th className="px-3 py-2 text-right">MCap</th>
              <th className="px-3 py-2 text-right">Trades</th>
              <th className="px-3 py-2 text-right">Alter</th>
              <th className="px-3 py-2">Vet</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <CandidateRow key={c.address} c={c} />
            ))}
            {snap && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-center text-quiet">
                  Gerade keine neuen Solana-Coins gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CandidateRow({ c }: { c: Candidate }) {
  const failed = c.checks.find((check) => !check.ok);
  return (
    <tr className="border-b border-line/60 hover:bg-panel-2">
      <td className="px-3 py-2">
        <a href={c.url} target="_blank" rel="noreferrer" className="font-bold hover:underline">
          ${c.symbol}
        </a>
        <span className="ml-2 text-quiet">{c.name}</span>
      </td>
      <td className="px-3 py-2 text-right">{formatPriceUsd(c.priceUsd)}</td>
      <td className={`px-3 py-2 text-right ${c.change24h >= 0 ? "text-up" : "text-down"}`}>{formatPct(c.change24h)}</td>
      <td className="px-3 py-2 text-right">{formatCompactUsd(c.liquidityUsd)}</td>
      <td className="px-3 py-2 text-right">{formatCompactUsd(c.volumeH24)}</td>
      <td className="px-3 py-2 text-right">{formatCompactUsd(c.mcapUsd)}</td>
      <td className="px-3 py-2 text-right">{formatCount(c.tradesH24)}</td>
      <td className="px-3 py-2 text-right">{formatAge(c.ageMinutes)}</td>
      <td className="px-3 py-2">
        {c.passed ? (
          <span className="rounded bg-up/15 px-1.5 py-0.5 font-bold text-up">BESTANDEN</span>
        ) : (
          <span className="rounded bg-down/15 px-1.5 py-0.5 text-down">raus: {failed?.label}</span>
        )}
      </td>
    </tr>
  );
}

function ThresholdsPanel() {
  const keys = Object.keys(HARD_FILTERS) as FilterKey[];
  return (
    <section className="rounded-md border border-line bg-panel p-3 text-xs">
      <h2 className="mb-2 font-bold text-ink">thresholds.py</h2>
      <p className="mb-2 text-[10px] uppercase tracking-wider text-quiet">Hart · reine Rechnung, kostet nichts</p>
      <ul className="space-y-1">
        {keys.map((key) => {
          const later = key === "maxTopWallet" || key === "maxTop10";
          return (
            <li key={key} className={`flex justify-between ${later ? "text-quiet" : ""}`}>
              <span className="text-sky-300">{FILTER_LABELS[key]}</span>
              <span>
                {HARD_FILTERS[key].toLocaleString("de-DE")}
                {later && <span className="ml-2 text-[10px]">Phase 3</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ChiefLog({ log }: { log: LogEntry[] }) {
  return (
    <section className="flex min-h-48 flex-1 flex-col rounded-md border border-line bg-panel p-3 text-xs">
      <h2 className="mb-2 font-bold text-ink">Protokoll</h2>
      <ol className="flex-1 space-y-1 overflow-y-auto">
        {log.map((e) => (
          <li key={e.id} className="flex gap-2">
            <span className="text-quiet">{e.time}</span>
            <span className="w-12 shrink-0 font-bold text-frame">{e.agent}</span>
            <span>{e.text}</span>
          </li>
        ))}
        {log.length === 0 && <li className="text-quiet">Warte auf erste Daten …</li>}
      </ol>
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[11px] text-quiet">
      <span>Daten: CoinGecko und DexScreener · aktualisiert alle 30 Sekunden</span>
      <button
        type="button"
        disabled
        title="Der Not-Aus wird mit dem Spielgeld-Handel in Phase 3 aktiv."
        className="cursor-not-allowed rounded border border-down/50 px-3 py-1 font-bold uppercase tracking-wider text-down/60"
      >
        Not-Aus
      </button>
    </footer>
  );
}
