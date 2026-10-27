"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Holo } from "./HoloView";
import { useJarvis } from "./JarvisProvider";
import { AGENTS, type Agent } from "@/lib/agents";
import { postJson } from "@/lib/api";
import type { Candidate, MajorQuote, MarketSnapshot } from "@/lib/market";
import { COSTS, SAFETY, STATUS_LABEL, type CoinVerdict, type DeskSnapshot, type LogEntry, type Trade } from "@/lib/paper";
import { FILTER_LABELS, FILTER_STAGES, HARD_FILTERS, SOFT_FILTERS, SOFT_KEYS, type FilterKey } from "@/lib/thresholds";
import {
  formatAge,
  formatClock,
  formatCompactUsd,
  formatCount,
  formatEur,
  formatPct,
  formatPriceUsd,
  formatSignedUsd,
  formatUsd,
} from "@/lib/format";

// Der Trading-Desk wie im GrokBot-Video: oben die Agenten, darunter das Spielgeld-Konto mit Verlauf,
// die offenen Positionen, der Scanner, die Filter aus thresholds.py und das Protokoll jeder Entscheidung.

type Action = "start" | "pause" | "weiter" | "notaus" | "alle_verkaufen" | "zuruecksetzen" | "verkaufen";

function useDeskAction() {
  const { setDesk } = useJarvis();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const act = async (action: Action, address?: string) => {
    setBusy(true);
    setNote(null);
    try {
      const next = await postJson<DeskSnapshot & { message: string }>("/api/handel", { action, address });
      setDesk(next);
      setNote({ tone: "ok", text: next.message });
    } catch (e) {
      setNote({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };
  return { act, busy, note };
}

export function TradingDesk() {
  const { market: snap, desk } = useJarvis();
  const [now, setNow] = useState<Date | null>(null);
  const controls = useDeskAction();

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const clock = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(clock);
    };
  }, []);

  const isDemo = snap ? snap.majors.source === "demo" || snap.scan.source === "demo" : false;

  return (
    <main className="m-2 flex flex-1 flex-col gap-3 rounded-lg border-2 border-frame/80 bg-desk/60 p-3 sm:m-4 sm:p-4">
      <Header now={now} isDemo={isDemo} loading={!snap} desk={desk} />
      <AgentGrid snap={snap} desk={desk} />
      <section className="grid gap-3 lg:grid-cols-3">
        <Account desk={desk} isDemo={isDemo} controls={controls} />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {(snap?.majors.quotes ?? []).map((q) => (
            <MajorCard key={q.id} quote={q} />
          ))}
        </div>
      </section>
      {desk && desk.positions.length > 0 && <Positions desk={desk} controls={controls} now={now} />}
      <section className="grid flex-1 gap-3 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
          <ScannerTable snap={snap} verdicts={desk?.verdicts ?? {}} />
          <Trades trades={desk?.trades ?? []} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <ThresholdsPanel />
          <DeskLog log={desk?.log ?? []} />
        </div>
      </section>
      <Footer desk={desk} controls={controls} />
    </main>
  );
}

function Header({ now, isDemo, loading, desk }: { now: Date | null; isDemo: boolean; loading: boolean; desk: DeskSnapshot | null }) {
  const subtitle = !desk
    ? "lädt …"
    : desk.status === "aus"
      ? "Spielgeld-Handel noch nicht gestartet"
      : `Spielgeld · Tag ${Math.min(desk.testDay, SAFETY.testDays)} von ${SAFETY.testDays} · ${STATUS_LABEL[desk.status]}`;
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
      <Holo name="modul-trading">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-[0.25em] text-frame">Trading-Desk</h1>
          <p className="text-[11px] uppercase tracking-widest text-quiet">{subtitle}</p>
        </div>
      </Holo>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {desk && desk.status !== "aus" && <StatusPill desk={desk} />}
        {!loading && (
          <span className={`rounded px-2 py-1 font-bold tracking-wider ${isDemo ? "bg-amber-500/15 text-amber-300" : "bg-up/15 text-up"}`}>
            {isDemo ? "BEISPIELDATEN" : "● LIVE"}
          </span>
        )}
        <span className="rounded border border-line px-2 py-1 text-quiet">{now ? formatClock(now) : "--:--:--"} lokal</span>
        <span className="rounded bg-panel-2 px-2 py-1 font-bold text-ink">{now ? formatClock(now, "UTC") : "--:--:--"} UTC</span>
      </div>
    </header>
  );
}

function StatusPill({ desk }: { desk: DeskSnapshot }) {
  const tone =
    desk.status === "laeuft" ? "bg-up/15 text-up" : desk.status === "notaus" ? "bg-down/20 text-down" : "bg-amber-500/15 text-amber-300";
  return <span className={`rounded px-2 py-1 font-bold uppercase tracking-wider ${tone}`}>{STATUS_LABEL[desk.status]}</span>;
}

type Metric = { value: string; detail: string; progress?: number };

function agentState(agent: Agent, desk: DeskSnapshot | null): { label: string; live: boolean } {
  if (!desk) return { label: "…", live: false };
  if (desk.status === "aus") return { label: "bereit", live: false };
  if (desk.status === "notaus") return { label: "steht", live: false };
  if (desk.status === "laeuft") return { label: "aktiv", live: true };
  return agent.guards ? { label: "wacht", live: true } : { label: "Pause", live: false };
}

function AgentGrid({ snap, desk }: { snap: MarketSnapshot | null; desk: DeskSnapshot | null }) {
  const candidates = snap?.scan.candidates ?? [];
  const passed = candidates.filter((c) => c.passed).length;
  const stats = desk?.stats;
  const lastBuy = desk?.trades.find((t) => t.side === "kauf");
  const lastFill = desk?.trades[0];
  const metrics: Partial<Record<Agent["id"], Metric>> = {
    chief: {
      value: desk?.lastPick ? `$${desk.lastPick}` : "–",
      detail: desk?.chief === "claude" ? "letzte Wahl · Claude bewertet" : "letzte Wahl · Faustregeln",
    },
    scan: {
      value: snap ? String(snap.scan.scanned) : "…",
      detail: "Coins gescannt",
      progress: snap && snap.scan.scanned ? candidates.length / snap.scan.scanned : 0,
    },
    vet: { value: snap ? `${passed}/${candidates.length}` : "…", detail: "bestehen die harten Filter", progress: candidates.length ? passed / candidates.length : 0 },
    social: desk?.x.enabled
      ? { value: stats ? formatCount(stats.postsRead) : "–", detail: `X-Beiträge gelesen · Grok heute ${formatUsd(desk.x.spentTodayUsd)} von ${formatUsd(desk.x.budgetUsd)}` }
      : { value: stats ? formatCount(stats.pagesRead) : "–", detail: "Seiten gelesen · X ohne xAI-Schlüssel aus" },
    size: { value: lastBuy ? formatUsd(lastBuy.usd) : "–", detail: `Ticket, ${SAFETY.maxTradeShare * 100} % des Kontos` },
    fills: {
      value: lastFill ? `${lastFill.side === "kauf" ? "rein" : "raus"} $${lastFill.symbol}` : "–",
      detail: lastFill ? `letzte Ausführung, ${formatUsd(lastFill.feesUsd)} Gebühren` : "noch keine Ausführung",
    },
    risk: { value: stats ? `${stats.wins}W ${stats.losses}L` : "–", detail: `Stop-Loss −${SAFETY.stopLoss * 100} %, Tageslimit −${SAFETY.dailyLossLimit * 100} %` },
    crawler: {
      value: stats ? `${stats.rugsStopped}` : "–",
      detail: stats
        ? `Rugs gestoppt · ${formatCount(stats.pagesRead)} Seiten · ${formatCount(stats.postsRead)} Beiträge · ${formatCount(stats.killed)} aussortiert`
        : "Rugs gestoppt",
    },
  };
  return (
    <section className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {AGENTS.map((agent) => (
        <AgentTile key={agent.id} agent={agent} metric={metrics[agent.id]} state={agentState(agent, desk)} />
      ))}
    </section>
  );
}

function AgentTile({ agent, metric, state }: { agent: Agent; metric?: Metric; state: { label: string; live: boolean } }) {
  return (
    <article className="flex min-w-0 flex-col gap-1 rounded-md border border-line bg-panel p-3">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${state.live ? "animate-pulse" : "opacity-50"}`}
            style={{ background: agent.color, boxShadow: state.live ? `0 0 10px ${agent.color}` : undefined }}
          />
          <h2 className="font-bold uppercase tracking-wider" style={{ color: agent.color }}>
            {agent.name}
          </h2>
        </div>
        <span className="whitespace-nowrap rounded bg-panel-2 px-1.5 py-0.5 text-[10px] uppercase text-quiet">{state.label}</span>
      </div>
      <p className="text-[11px] text-quiet">{agent.motto}</p>
      {/* Auf dem Handy sind die Kacheln schmal: dann steht der Wert unter der Erklärung. */}
      <div className="mt-auto flex flex-col gap-0.5 pt-2 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
        <span className="min-w-0 text-[11px] text-quiet">{metric?.detail ?? "wartet"}</span>
        <span className="max-w-full shrink-0 truncate font-bold sm:max-w-[60%] sm:text-right">{metric?.value ?? ""}</span>
      </div>
      {metric?.progress !== undefined && (
        <div className="h-1 overflow-hidden rounded bg-panel-2">
          <div className="h-full rounded" style={{ width: `${Math.round(metric.progress * 100)}%`, background: agent.color }} />
        </div>
      )}
    </article>
  );
}

type Controls = ReturnType<typeof useDeskAction>;

function Account({ desk, isDemo, controls }: { desk: DeskSnapshot | null; isDemo: boolean; controls: Controls }) {
  const { act, busy, note } = controls;
  const started = desk && desk.status !== "aus";
  const day = desk ? Math.min(desk.testDay, SAFETY.testDays) : 0;
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-md border border-line bg-panel p-3 lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-quiet">
            Spielgeld-Konto{started ? ` · Tag ${day} von ${SAFETY.testDays}` : ""}
          </p>
          <p className="text-3xl font-bold">{formatUsd(desk?.equity ?? SAFETY.startCapitalUsd)}</p>
          {started && desk ? (
            <p className="text-sm">
              <span className={desk.pnlUsd >= 0 ? "text-up" : "text-down"}>
                {formatSignedUsd(desk.pnlUsd)} ({formatPct(desk.pnlPct)})
              </span>
              <span className="text-quiet"> seit dem Start · heute {formatPct(desk.dayPnlPct)} · bar {formatUsd(desk.cash)}</span>
            </p>
          ) : (
            <p className="text-sm text-quiet">Erfundenes Geld, echte Kurse, echte Kosten. Kein echter Handel.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {desk?.status === "aus" && (
            <button type="button" disabled={busy} onClick={() => act("start")} className="rounded bg-up/90 px-3 py-1.5 text-sm font-bold text-desk hover:bg-up disabled:opacity-50">
              Spielgeld-Handel starten
            </button>
          )}
          {(desk?.status === "laeuft" || desk?.status === "tageslimit") && (
            <button type="button" disabled={busy} onClick={() => act("pause")} className="rounded border border-line px-3 py-1.5 text-sm font-bold hover:bg-panel-2 disabled:opacity-50">
              Pause
            </button>
          )}
          {(desk?.status === "pausiert" || desk?.status === "notaus") && (
            <button type="button" disabled={busy} onClick={() => act("weiter")} className="rounded bg-up/90 px-3 py-1.5 text-sm font-bold text-desk hover:bg-up disabled:opacity-50">
              Weitermachen
            </button>
          )}
          {(desk?.status === "pausiert" || desk?.status === "notaus") && (
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm("Den Spielgeld-Handel zurücksetzen und mit 10.000 $ neu anfangen? Die Testzeit beginnt dann von vorn.") && act("zuruecksetzen")}
              className="rounded border border-line px-3 py-1.5 text-sm text-quiet hover:bg-panel-2 disabled:opacity-50"
            >
              Zurücksetzen
            </button>
          )}
        </div>
      </div>
      {started && (
        <div>
          <div className="h-1.5 overflow-hidden rounded bg-panel-2" title={`Testzeit: Tag ${day} von ${SAFETY.testDays}`}>
            <div className="h-full rounded bg-frame" style={{ width: `${(day / SAFETY.testDays) * 100}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-quiet">
            {desk.testDay > SAFETY.testDays
              ? `Die ${SAFETY.testDays} Testtage sind um. ${desk.pnlUsd > 0 ? "Der Desk liegt nach Kosten im Plus." : "Der Desk liegt nach Kosten nicht im Plus, also bleibt es bei Spielgeld."}`
              : `Echtes Geld erst, wenn der Desk nach ${SAFETY.testDays} Tagen nach Kosten im Plus ist und du zustimmst.`}
          </p>
        </div>
      )}
      {desk?.statusReason && <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{desk.statusReason}</p>}
      {started && isDemo && (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Gerade keine Live-Daten von DexScreener. Mit Beispieldaten kauft der Desk nichts.
        </p>
      )}
      {note && <p className={`text-xs ${note.tone === "ok" ? "text-up" : "text-down"}`}>{note.text}</p>}
      <BalanceChart points={desk?.equityHistory ?? []} start={desk?.startCapital ?? SAFETY.startCapitalUsd} />
      {desk?.status === "aus" && (
        <ul className="grid gap-1 text-xs text-quiet sm:grid-cols-2">
          <li>· {SAFETY.maxTradeShare * 100} % des Kontos pro Trade, höchstens {SAFETY.maxOpenPositions} Coins gleichzeitig</li>
          <li>· Stop-Loss −{SAFETY.stopLoss * 100} %, nachziehend −{SAFETY.trailingStop * 100} % vom Höchststand</li>
          <li>· Gewinnmitnahme bei +{SAFETY.takeProfit * 100} %, spätestens nach {SAFETY.maxHoldHours} Stunden raus</li>
          <li>· höchstens −{SAFETY.dailyLossLimit * 100} % am Tag, dann Pause bis morgen</li>
          <li>· Kosten wie echt: {COSTS.dexFee * 100} % Gebühr, Slippage, Netzwerkgebühr</li>
          <li>· läuft, solange JARVIS auf dem Mac offen ist</li>
        </ul>
      )}
    </section>
  );
}

// Der Kontoverlauf: eine Linie mit Fadenkreuz. Die dünne Linie markiert das Startkapital.
function BalanceChart({ points, start }: { points: { at: string; equity: number }[]; start: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<SVGSVGElement>(null);
  if (points.length < 2) {
    return <p className="rounded border border-dashed border-line px-3 py-6 text-center text-xs text-quiet">Der Verlauf erscheint, sobald der Handel ein paar Minuten läuft.</p>;
  }
  const W = 600;
  const H = 140;
  const pad = { top: 10, bottom: 18, left: 4, right: 4 };
  const values = points.map((p) => p.equity);
  const lo = Math.min(start, ...values);
  const hi = Math.max(start, ...values);
  const span = hi - lo || 1;
  const t0 = Date.parse(points[0].at);
  const t1 = Date.parse(points.at(-1)!.at);
  const x = (at: string) => pad.left + ((Date.parse(at) - t0) / (t1 - t0 || 1)) * (W - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - lo) / span) * (H - pad.top - pad.bottom);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.at).toFixed(1)},${y(p.equity).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.at(-1)!.at).toFixed(1)},${H - pad.bottom} L${x(points[0].at).toFixed(1)},${H - pad.bottom} Z`;
  const last = points.at(-1)!;
  const shown = hover === null ? null : points[hover];

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.at) - px) < Math.abs(x(points[best].at) - px)) best = i;
    });
    setHover(best);
  };

  const when = (iso: string) => new Date(iso).toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <figure className="relative">
      <svg
        ref={box}
        viewBox={`0 0 ${W} ${H}`}
        className="h-36 w-full touch-none"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Kontoverlauf von ${formatUsd(points[0].equity)} auf ${formatUsd(last.equity)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <line x1={0} x2={W} y1={y(start)} y2={y(start)} stroke="var(--color-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={area} fill="#7dd3fc" opacity={0.1} />
        <path d={line} fill="none" stroke="#7dd3fc" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {shown && <line x1={x(shown.at)} x2={x(shown.at)} y1={pad.top} y2={H - pad.bottom} stroke="var(--color-quiet)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      </svg>
      <span
        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-300 ring-2 ring-panel"
        style={{ left: `${(x((shown ?? last).at) / W) * 100}%`, top: `${(y((shown ?? last).equity) / H) * 144}px` }}
      />
      <figcaption className="flex justify-between text-[10px] text-quiet">
        <span>{when(points[0].at)}</span>
        <span>dünne Linie: Start {formatUsd(start)}</span>
        <span>{when(last.at)}</span>
      </figcaption>
      {shown && (
        <div
          className="pointer-events-none absolute top-0 rounded border border-line bg-desk/95 px-2 py-1 text-[11px] shadow-lg"
          style={{ left: `${Math.min(80, Math.max(0, (x(shown.at) / W) * 100 - 10))}%` }}
        >
          <p className="text-quiet">{when(shown.at)}</p>
          <p className="font-bold">{formatUsd(shown.equity)}</p>
        </div>
      )}
    </figure>
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
      <p className="mt-1 text-xl font-bold">{formatEur(quote.eur)}</p>
      <p className={`text-sm ${up ? "text-up" : "text-down"}`}>{formatPct(quote.change24h)} in 24 Std</p>
    </article>
  );
}

function Positions({ desk, controls, now }: { desk: DeskSnapshot; controls: Controls; now: Date | null }) {
  return (
    <section className="rounded-md border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-sky-300">Offene Positionen · {desk.positions.length}</h2>
        <button
          type="button"
          disabled={controls.busy}
          onClick={() => window.confirm("Alle offenen Positionen zum aktuellen Kurs verkaufen?") && controls.act("alle_verkaufen")}
          className="rounded border border-line px-2 py-1 text-xs hover:bg-panel-2 disabled:opacity-50"
        >
          Alles verkaufen
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] whitespace-nowrap text-left text-xs">
          <thead className="text-[10px] uppercase tracking-wider text-quiet">
            <tr className="border-b border-line">
              <th className="px-3 py-2">Coin</th>
              <th className="px-3 py-2 text-right">Einsatz</th>
              <th className="px-3 py-2 text-right">Wert jetzt</th>
              <th className="px-3 py-2 text-right">±</th>
              <th className="px-3 py-2 text-right">Stop</th>
              <th className="px-3 py-2 text-right">Ziel</th>
              <th className="px-3 py-2 text-right">seit</th>
              <th className="px-3 py-2">Warum gekauft</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {desk.positions.map((p) => {
              const value = p.qty * p.lastPrice;
              const change = (value / p.costUsd - 1) * 100;
              return (
                <tr key={p.address} className="border-b border-line/60">
                  <td className="px-3 py-2">
                    <a href={p.url} target="_blank" rel="noreferrer" className="font-bold hover:underline">
                      ${p.symbol}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-right">{formatUsd(p.costUsd)}</td>
                  <td className="px-3 py-2 text-right">{formatUsd(value)}</td>
                  <td className={`px-3 py-2 text-right ${change >= 0 ? "text-up" : "text-down"}`}>{formatPct(change)}</td>
                  <td className="px-3 py-2 text-right">{formatPriceUsd(p.stopPrice)}</td>
                  <td className="px-3 py-2 text-right">{formatPriceUsd(p.targetPrice)}</td>
                  <td className="px-3 py-2 text-right">{now ? formatAge((now.getTime() - Date.parse(p.openedAt)) / 60_000) : "–"}</td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-quiet" title={p.why}>
                    {p.why}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" disabled={controls.busy} onClick={() => controls.act("verkaufen", p.address)} className="rounded border border-line px-2 py-0.5 hover:bg-panel-2 disabled:opacity-50">
                      Verkaufen
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ScannerTable({ snap, verdicts }: { snap: MarketSnapshot | null; verdicts: Record<string, CoinVerdict> }) {
  const rows = snap?.scan.candidates ?? [];
  return (
    <section className="flex min-w-0 flex-col rounded-md border border-line bg-panel">
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
              <th className="px-3 py-2">Prüfung</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <CandidateRow key={c.address} c={c} verdict={verdicts[c.address]} />
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

// Wie weit ein Coin gekommen ist: Vet (harte Filter), Crawler, Chief, Fills.
const VERDICT: Record<CoinVerdict["stage"], { label: string; tone: string }> = {
  chain_kill: { label: "Crawler: raus", tone: "bg-down/15 text-down" },
  skin_kill: { label: "Crawler: raus", tone: "bg-down/15 text-down" },
  x_kill: { label: "X warnt", tone: "bg-down/15 text-down" },
  chief_nein: { label: "Chief: nein", tone: "bg-amber-500/15 text-amber-300" },
  nicht_gekauft: { label: "Fills: nein", tone: "bg-amber-500/15 text-amber-300" },
  nicht_geprueft: { label: "nicht geprüft", tone: "bg-panel-2 text-quiet" },
  gekauft: { label: "GEKAUFT", tone: "bg-sky-500/15 font-bold text-sky-300" },
};

function CandidateRow({ c, verdict }: { c: Candidate; verdict?: CoinVerdict }) {
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
        {!c.passed ? (
          <span className="rounded bg-down/15 px-1.5 py-0.5 text-down">raus: {failed?.label}</span>
        ) : verdict ? (
          <span title={verdict.text}>
            <span className={`rounded px-1.5 py-0.5 ${VERDICT[verdict.stage].tone}`}>{VERDICT[verdict.stage].label}</span>
            <span className="ml-2 inline-block max-w-[240px] truncate align-bottom text-quiet">{verdict.text}</span>
          </span>
        ) : (
          <span className="rounded bg-up/15 px-1.5 py-0.5 font-bold text-up" title="Hat die harten Filter bestanden, der Crawler prüft ihn als Nächstes">
            BESTANDEN
          </span>
        )}
      </td>
    </tr>
  );
}

function Trades({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) return null;
  return (
    <section className="rounded-md border border-line bg-panel">
      <div className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-sky-300">Trades mit Begründung</h2>
      </div>
      <ol className="divide-y divide-line/60 text-xs">
        {trades.slice(0, 20).map((t) => (
          <li key={t.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
            <span className="text-quiet">{new Date(t.at).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
            <span className={`w-14 font-bold uppercase ${t.side === "kauf" ? "text-sky-300" : "text-amber-300"}`}>{t.side}</span>
            <span className="font-bold">${t.symbol}</span>
            <span>{formatUsd(t.usd)}</span>
            {t.pnlUsd !== undefined && <span className={t.pnlUsd >= 0 ? "text-up" : "text-down"}>{formatSignedUsd(t.pnlUsd)}</span>}
            <span className="text-quiet">{t.agent}</span>
            <span className="basis-full text-quiet sm:basis-auto">{t.why}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ThresholdsPanel() {
  const keys = Object.keys(HARD_FILTERS) as FilterKey[];
  return (
    <section className="rounded-md border border-line bg-panel p-3 text-xs">
      <h2 className="mb-2 font-bold text-ink">thresholds.py</h2>
      <p className="mb-2 text-[10px] uppercase tracking-wider text-quiet">Hart · reine Rechnung, kostet nichts</p>
      <ul className="space-y-1">
        {keys.map((key) => (
          <li key={key} className="flex justify-between gap-2">
            <span className="text-sky-300">{FILTER_LABELS[key]}</span>
            <span>{HARD_FILTERS[key].toLocaleString("de-DE")}</span>
          </li>
        ))}
      </ul>
      <p className="mb-2 mt-3 text-[10px] uppercase tracking-wider text-quiet">Weich · der Chief schätzt, die Grenze entscheidet</p>
      <ul className="space-y-1">
        {SOFT_KEYS.map((key) => (
          <li key={key} className="flex justify-between gap-2" title={SOFT_FILTERS[key].label}>
            <span className="truncate text-sky-300">{key}</span>
            <span className="shrink-0">
              {SOFT_FILTERS[key].limit} {SOFT_FILTERS[key].value.toLocaleString("de-DE")}
            </span>
          </li>
        ))}
      </ul>
      <p className="mb-1 mt-3 text-[10px] uppercase tracking-wider text-quiet">filter.py · die Reihenfolge ist der Trick</p>
      <ol className="flex flex-wrap gap-1">
        {FILTER_STAGES.map((stage) => (
          <li key={stage.id} title={`${stage.agent}: ${stage.label}`} className="rounded border border-frame/50 px-1.5 py-0.5 text-[10px] text-frame">
            {stage.id}
          </li>
        ))}
      </ol>
    </section>
  );
}

const TONE: Record<NonNullable<LogEntry["tone"]>, string> = { kill: "text-down", buy: "text-sky-300", sell: "text-amber-300", warn: "text-amber-200" };

function DeskLog({ log }: { log: LogEntry[] }) {
  return (
    <section className="flex min-h-48 flex-1 flex-col rounded-md border border-line bg-panel p-3 text-xs">
      <h2 className="mb-2 font-bold text-ink">Protokoll</h2>
      <ol className="max-h-[420px] flex-1 space-y-1 overflow-y-auto">
        {log.map((e, i) => (
          <li key={`${e.at}-${i}`} className="flex gap-2">
            <span className="shrink-0 text-quiet">{formatClock(new Date(e.at))}</span>
            <span className="w-14 shrink-0 font-bold uppercase text-frame">{e.agent}</span>
            <span className={e.tone ? TONE[e.tone] : ""}>{e.text}</span>
          </li>
        ))}
        {log.length === 0 && <li className="text-quiet">Noch nichts passiert. Sobald der Spielgeld-Handel läuft, steht hier jede Entscheidung der Agenten.</li>}
      </ol>
    </section>
  );
}

function Footer({ desk, controls }: { desk: DeskSnapshot | null; controls: Controls }) {
  const armed = desk && desk.status !== "aus" && desk.status !== "notaus";
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[11px] text-quiet">
      <span>Daten: CoinGecko, DexScreener und RugCheck · der Desk arbeitet jede Minute, die Seite aktualisiert alle 15 Sekunden</span>
      <button
        type="button"
        disabled={!armed || controls.busy}
        onClick={() => controls.act("notaus")}
        title={armed ? "Stoppt sofort alle Agenten. Auch per Sprache: „Stopp alles“." : "Der Not-Aus greift, sobald der Spielgeld-Handel läuft."}
        className="rounded border border-down px-3 py-1 font-bold uppercase tracking-wider text-down hover:bg-down/15 disabled:cursor-not-allowed disabled:border-down/40 disabled:text-down/50"
      >
        Not-Aus
      </button>
    </footer>
  );
}
