"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { ApprovalPanel, ApprovalRule } from "./Approvals";
import { RaumLink } from "./RaumLink";
import { PageHeader } from "./ui";
import { CrawlerWeb } from "./CrawlerWeb";
import { useJarvis } from "./JarvisProvider";
import { AGENTS, type Agent } from "@/lib/agents";
import { postJson } from "@/lib/api";
import { assetLabel } from "@/lib/approval";
import { COMMODITIES, COMMODITY_RULES, type CommodityQuote } from "@/lib/commodities";
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

// Das Aussehen der Flächen im Raum, wie im übrigen Glashaus: keine weißen Kästen mit Rahmen, sondern ruhige
// Platten mit einer Linie oben. Abschnitte tragen die kräftige Tafellinie, kleine Kacheln eine leichte.
const PLATTE = "border-t-[3px] border-schiefer bg-wand/60";
const KACHEL = "border-t-2 border-schiefer/30 bg-wand/60";

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
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 sm:p-6">
      <Header now={now} isDemo={isDemo} loading={!snap} desk={desk} />
      {desk && <ApprovalPanel desk={desk} />}
      <AgentGrid snap={snap} desk={desk} />
      <CrawlerWeb snap={snap} desk={desk} />
      <section className="grid gap-3 lg:grid-cols-3">
        <Account desk={desk} isDemo={isDemo} controls={controls} />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {(snap?.majors.quotes ?? []).map((q) => (
            <MajorCard key={q.id} quote={q} />
          ))}
        </div>
      </section>
      {desk && desk.positions.length > 0 && <Positions desk={desk} controls={controls} now={now} />}
      {desk && <Commodities desk={desk} controls={controls} />}
      {/* Die Scan-Tabelle hat elf Spalten und bekommt die ganze Breite: So steht die Prüfung, die letzte Spalte, ohne Schieben da. */}
      <ScannerTable snap={snap} verdicts={desk?.verdicts ?? {}} />
      <section className="grid flex-1 items-start gap-3 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
          <Trades trades={desk?.trades ?? []} />
          <DeskLog log={desk?.log ?? []} />
        </div>
        <ThresholdsPanel />
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
      : `Spielgeld, Tag ${Math.min(desk.testDay, SAFETY.testDays)} von ${SAFETY.testDays}, ${STATUS_LABEL[desk.status]}`;
  return (
    <PageHeader title="Trading" subtitle={subtitle}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {desk && desk.status !== "aus" && <StatusPill desk={desk} />}
        {!loading && (
          <span className={`rounded px-2 py-1 font-bold ${isDemo ? "bg-sonne/15 text-ocker" : "bg-up/15 text-up"}`}>
            {isDemo ? "Beispieldaten" : "live"}
          </span>
        )}
        <span className="rounded border border-line px-2 py-1 text-quiet">{now ? formatClock(now) : "--:--:--"} lokal</span>
        <span className="rounded bg-panel-2 px-2 py-1 font-bold text-schiefer">{now ? formatClock(now, "UTC") : "--:--:--"} UTC</span>
      </div>
    </PageHeader>
  );
}

function StatusPill({ desk }: { desk: DeskSnapshot }) {
  const tone =
    desk.status === "laeuft" ? "bg-up/15 text-up" : desk.status === "notaus" ? "bg-down/20 text-down" : "bg-sonne/15 text-ocker";
  return <span className={`rounded px-2 py-1 font-bold ${tone}`}>{STATUS_LABEL[desk.status]}</span>;
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
      detail: desk?.chief === "claude" ? "letzte Wahl, Claude bewertet" : "letzte Wahl nach Faustregeln",
    },
    scan: {
      value: snap ? String(snap.scan.scanned) : "…",
      detail: "Coins gescannt",
      progress: snap && snap.scan.scanned ? candidates.length / snap.scan.scanned : 0,
    },
    vet: { value: snap ? `${passed}/${candidates.length}` : "…", detail: "bestehen die harten Filter", progress: candidates.length ? passed / candidates.length : 0 },
    social: desk?.x.enabled
      ? { value: stats ? formatCount(stats.postsRead) : "–", detail: `X-Beiträge gelesen, Grok heute ${formatUsd(desk.x.spentTodayUsd)} von ${formatUsd(desk.x.budgetUsd)}` }
      : { value: stats ? formatCount(stats.pagesRead) : "–", detail: "Seiten gelesen, X ist ohne xAI-Schlüssel aus" },
    size: { value: lastBuy ? formatUsd(lastBuy.usd) : "–", detail: `Ticket, ${SAFETY.minTradeShare * 100} bis ${SAFETY.maxTradeShare * 100} % des Kontos je nach Überzeugung` },
    fills: {
      value: lastFill ? `${lastFill.side === "kauf" ? "rein" : "raus"} ${assetLabel(lastFill)}` : "–",
      detail: lastFill ? `letzte Ausführung, ${formatUsd(lastFill.feesUsd)} Gebühren` : "noch keine Ausführung",
    },
    risk: { value: stats ? `${stats.wins}W ${stats.losses}L` : "–", detail: `Stop-Loss −${SAFETY.stopLoss * 100} %, Tageslimit −${SAFETY.dailyLossLimit * 100} %` },
    crawler: {
      value: stats ? `${stats.rugsStopped}` : "–",
      detail: stats
        ? `Rugs gestoppt, ${formatCount(stats.pagesRead)} Seiten, ${formatCount(stats.postsRead)} Beiträge, ${formatCount(stats.killed)} aussortiert`
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
    <article className={`flex min-w-0 flex-col gap-1 p-3 ${KACHEL}`}>
      <div className="flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${state.live ? "animate-pulse" : "opacity-50"}`}
            style={{ background: agent.color }}
          />
          <h2 className="font-bold" style={{ color: agent.color }}>
            {agent.name}
          </h2>
        </div>
        <span className="whitespace-nowrap rounded bg-panel-2 px-1.5 py-0.5 text-xs text-quiet">{state.label}</span>
      </div>
      <p className="text-xs text-quiet">{agent.motto}</p>
      {/* Auf dem Handy sind die Kacheln schmal: dann steht der Wert unter der Erklärung. */}
      <div className="mt-auto flex flex-col gap-0.5 pt-2 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
        <span className="min-w-0 text-xs text-quiet">{metric?.detail ?? "wartet"}</span>
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
    <section className={`flex min-w-0 flex-col gap-3 p-3 lg:col-span-2 ${PLATTE}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-quiet">
            Spielgeld-Konto{started ? `, Tag ${day} von ${SAFETY.testDays}` : ""}
          </p>
          <p className="text-3xl font-bold">{formatUsd(desk?.equity ?? SAFETY.startCapitalUsd)}</p>
          {started && desk ? (
            <p className="text-sm">
              <span className={desk.pnlUsd >= 0 ? "text-up" : "text-down"}>
                {formatSignedUsd(desk.pnlUsd)} ({formatPct(desk.pnlPct)})
              </span>
              <span className="text-quiet"> seit dem Start, heute {formatPct(desk.dayPnlPct)}, bar {formatUsd(desk.cash)}</span>
            </p>
          ) : (
            <p className="text-sm text-quiet">Erfundenes Geld, echte Kurse, echte Kosten. Kein echter Handel.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {desk?.status === "aus" && (
            <button type="button" disabled={busy} onClick={() => act("start")} className="rounded-full bg-up px-4 py-1.5 text-sm font-bold text-white hover:bg-up/90 disabled:opacity-50">
              Spielgeld-Handel starten
            </button>
          )}
          {(desk?.status === "laeuft" || desk?.status === "tageslimit") && (
            <button type="button" disabled={busy} onClick={() => act("pause")} className="rounded-full border border-schiefer/30 px-4 py-1.5 text-sm font-bold hover:bg-panel-2 disabled:opacity-50">
              Pause
            </button>
          )}
          {(desk?.status === "pausiert" || desk?.status === "notaus") && (
            <button type="button" disabled={busy} onClick={() => act("weiter")} className="rounded-full bg-up px-4 py-1.5 text-sm font-bold text-white hover:bg-up/90 disabled:opacity-50">
              Weitermachen
            </button>
          )}
          {(desk?.status === "pausiert" || desk?.status === "notaus") && (
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm("Den Spielgeld-Handel zurücksetzen und mit 10.000 $ neu anfangen? Die Testzeit beginnt dann von vorn.") && act("zuruecksetzen")}
              className="rounded-full border border-schiefer/30 px-4 py-1.5 text-sm text-quiet hover:bg-panel-2 disabled:opacity-50"
            >
              Zurücksetzen
            </button>
          )}
        </div>
      </div>
      {started && (
        <div>
          <div className="h-1.5 overflow-hidden rounded bg-panel-2" title={`Testzeit: Tag ${day} von ${SAFETY.testDays}`}>
            <div className="h-full rounded bg-rot" style={{ width: `${(day / SAFETY.testDays) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-quiet">
            {desk.testDay > SAFETY.testDays
              ? `Die ${SAFETY.testDays} Testtage sind um. ${desk.pnlUsd > 0 ? "Der Desk liegt nach Kosten im Plus." : "Der Desk liegt nach Kosten nicht im Plus, also bleibt es bei Spielgeld."}`
              : `Echtes Geld erst, wenn der Desk nach ${SAFETY.testDays} Tagen nach Kosten im Plus ist und du zustimmst.`}
          </p>
        </div>
      )}
      {desk?.statusReason && <p className="rounded border border-sonne/40 bg-sonne/10 px-3 py-2 text-xs text-ocker">{desk.statusReason}</p>}
      {desk?.intelWarning && (
        <p className="rounded border border-down/50 bg-down/10 px-3 py-2 text-xs text-down">
          Intel warnt: {desk.intelWarning.text} Bis {new Date(desk.intelWarning.until).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr kauft der Desk nichts Neues,
          Stop-Loss bleibt aktiv.
        </p>
      )}
      {started && isDemo && (
        <p className="rounded border border-sonne/40 bg-sonne/10 px-3 py-2 text-xs text-ocker">
          Gerade keine Live-Daten von DexScreener. Mit Beispieldaten kauft der Desk nichts.
        </p>
      )}
      {note && <p className={`text-xs ${note.tone === "ok" ? "text-up" : "text-down"}`}>{note.text}</p>}
      {desk && <ApprovalRule desk={desk} />}
      <BalanceChart points={desk?.equityHistory ?? []} start={desk?.startCapital ?? SAFETY.startCapitalUsd} />
      {desk?.status === "aus" && (
        <ul className="grid list-disc gap-x-6 gap-y-1 pl-4 text-xs text-quiet marker:text-schiefer/40 sm:grid-cols-2">
          <li>
            {SAFETY.minTradeShare * 100} bis {SAFETY.maxTradeShare * 100} % des Kontos je Coin, höchstens {SAFETY.maxOpenPositions} Coins gleichzeitig
          </li>
          <li>Stop-Loss −{SAFETY.stopLoss * 100} %, nachziehend −{SAFETY.trailingStop * 100} % vom Höchststand</li>
          <li>
            bei +{SAFETY.halfAt * 100} % die Hälfte verkaufen, der Rest läuft mit −{SAFETY.runnerTrail * 100} % Nachlauf weiter; nach {SAFETY.staleHours} Std ohne +
            {SAFETY.staleGain * 100} % raus
          </li>
          <li>höchstens −{SAFETY.dailyLossLimit * 100} % am Tag, dann Pause bis morgen</li>
          <li>Gold, Silber, Öl: je {COMMODITY_RULES.tradeShare * 100} % des Kontos, wenn der Trend nach oben zeigt</li>
          <li>Kosten wie echt: {COSTS.dexFee * 100} % Gebühr, Slippage, Netzwerkgebühr</li>
          <li>läuft, solange JARVIS auf dem Mac offen ist</li>
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
        <path d={area} fill="#2f7f86" opacity={0.12} />
        <path d={line} fill="none" stroke="#2f7f86" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {shown && <line x1={x(shown.at)} x2={x(shown.at)} y1={pad.top} y2={H - pad.bottom} stroke="var(--color-quiet)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      </svg>
      <span
        className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gletscher ring-2 ring-panel"
        style={{ left: `${(x((shown ?? last).at) / W) * 100}%`, top: `${(y((shown ?? last).equity) / H) * 144}px` }}
      />
      <figcaption className="flex justify-between text-xs text-quiet">
        <span>{when(points[0].at)}</span>
        <span>dünne Linie: Start {formatUsd(start)}</span>
        <span>{when(last.at)}</span>
      </figcaption>
      {shown && (
        <div
          className="pointer-events-none absolute top-0 rounded border border-line bg-desk/95 px-2 py-1 text-xs shadow-lg"
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
    <article className={`p-3 ${KACHEL}`}>
      <div className="flex items-center justify-between text-xs text-quiet">
        <span>{quote.name}</span>
        <span className="font-bold text-schiefer">{quote.symbol}</span>
      </div>
      <p className="mt-1 text-xl font-bold">{formatEur(quote.eur)}</p>
      <p className={`text-sm ${up ? "text-up" : "text-down"}`}>{formatPct(quote.change24h)} in 24 Std</p>
    </article>
  );
}

function Positions({ desk, controls, now }: { desk: DeskSnapshot; controls: Controls; now: Date | null }) {
  return (
    <section className={PLATTE}>
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="text-sm font-bold text-see">Offene Positionen <span className="font-medium text-quiet">{desk.positions.length}</span></h2>
        <button
          type="button"
          disabled={controls.busy}
          onClick={() => window.confirm("Alle offenen Positionen zum aktuellen Kurs verkaufen?") && controls.act("alle_verkaufen")}
          className="rounded-full border border-schiefer/30 px-3 py-1 text-xs hover:bg-panel-2 disabled:opacity-50"
        >
          Alles verkaufen
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] whitespace-nowrap text-left text-xs">
          <thead className="text-xs text-quiet">
            <tr className="border-b border-line">
              <th className="px-3 py-2">Coin</th>
              <th className="px-3 py-2 text-right">Einsatz</th>
              <th className="px-3 py-2 text-right">Wert jetzt</th>
              <th className="px-3 py-2 text-right">±</th>
              <th className="px-3 py-2 text-right">Stop</th>
              <th className="px-3 py-2 text-right">Hälfte bei</th>
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
                    <a href={p.url} target="_blank" rel="noreferrer" className="griff font-bold hover:underline">
                      ${p.symbol}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-right">{formatUsd(p.costUsd)}</td>
                  <td className="px-3 py-2 text-right">{formatUsd(value)}</td>
                  <td className={`px-3 py-2 text-right ${change >= 0 ? "text-up" : "text-down"}`}>{formatPct(change)}</td>
                  <td className="px-3 py-2 text-right">{formatPriceUsd(p.stopPrice)}</td>
                  <td className="px-3 py-2 text-right" title={p.targetPrice === null ? "Die Hälfte ist schon verkauft, der Rest läuft mit dem Nachlauf-Stop" : "Hier verkauft Risk die Hälfte"}>
                    {p.targetPrice === null ? "Hälfte raus" : formatPriceUsd(p.targetPrice)}
                  </td>
                  <td className="px-3 py-2 text-right">{now ? formatAge((now.getTime() - Date.parse(p.openedAt)) / 60_000) : "–"}</td>
                  <td className="max-w-[280px] truncate px-3 py-2 text-quiet" title={p.why}>
                    {p.why}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" disabled={controls.busy} onClick={() => controls.act("verkaufen", p.address)} className="rounded-full border border-schiefer/30 px-3 py-0.5 hover:bg-panel-2 disabled:opacity-50">
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

const TREND: Record<NonNullable<CommodityQuote["signal"]>["trend"], { label: string; tone: string }> = {
  steigt: { label: "Trend steigt", tone: "bg-up/15 text-up" },
  faellt: { label: "Trend fällt", tone: "bg-down/15 text-down" },
  seitwaerts: { label: "seitwärts", tone: "bg-panel-2 text-quiet" },
};

// Gold, Silber und Öl: Kurs, Trend und was der Desk davon hält.
function Commodities({ desk, controls }: { desk: DeskSnapshot; controls: Controls }) {
  const c = desk.commodities;
  return (
    <section className={PLATTE}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 className="text-sm font-bold text-see">Rohstoffe: Gold, Silber, Öl</h2>
        <span className="text-xs text-quiet">{c.enabled ? `folgt dem Trend, je ${COMMODITY_RULES.tradeShare * 100} % des Kontos` : "aus"}</span>
      </div>
      {!c.enabled ? (
        <p className="px-3 py-3 text-xs text-quiet">
          Mit einem kostenlosen Schlüssel von Twelve Data handelt der Desk auch Gold, Silber und Öl. Den Schlüssel trägst du in den{" "}
          <RaumLink href="/einstellungen#rohstoffe" className="text-see hover:underline">
            Einstellungen unter Rohstoffe
          </RaumLink>{" "}
          ein.
        </p>
      ) : (
        <div className="grid gap-2 p-3 sm:grid-cols-3">
          {COMMODITIES.map((meta) => (
            <CommodityCard
              key={meta.id}
              name={meta.name}
              quote={c.quotes.find((q) => q.id === meta.id)}
              position={c.positions.find((p) => p.id === meta.id)}
              controls={controls}
            />
          ))}
        </div>
      )}
      {c.enabled && c.note && <p className="px-3 pb-3 text-xs text-ocker">{c.note}</p>}
    </section>
  );
}

function CommodityCard({
  name,
  quote,
  position,
  controls,
}: {
  name: string;
  quote?: CommodityQuote;
  position?: DeskSnapshot["commodities"]["positions"][number];
  controls: Controls;
}) {
  const signal = quote?.signal ?? null;
  const value = position ? position.qty * position.lastPrice : 0;
  const change = position ? (value / position.costUsd - 1) * 100 : 0;
  return (
    // Die Karte liegt schon auf einer Platte: nur die Linie, kein zweiter Grund darüber.
    <article className="flex min-w-0 flex-col gap-1 border-t-2 border-schiefer/30 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-bold text-schiefer">{name}</span>
        {quote && !quote.open ? (
          <span className="rounded bg-panel-2 px-1.5 py-0.5 text-quiet">Markt zu</span>
        ) : signal ? (
          <span className={`rounded px-1.5 py-0.5 ${TREND[signal.trend].tone}`}>{TREND[signal.trend].label}</span>
        ) : quote ? (
          <span className="text-quiet">sammelt Kurse</span>
        ) : null}
      </div>
      <p className="text-xs text-quiet">{quote ? quote.label : "noch kein Kurs"}</p>
      <p className="text-xl font-bold">{quote ? formatPriceUsd(quote.price) : "–"}</p>
      {signal && <p className={`text-xs ${signal.change4h >= 0 ? "text-up" : "text-down"}`}>{formatPct(signal.change4h * 100)} in 4 Std</p>}
      {position ? (
        <div className="mt-1 space-y-1 border-t border-line pt-2 text-xs">
          <p>
            Gekauft für {formatUsd(position.costUsd)}, jetzt {formatUsd(value)} <span className={change >= 0 ? "text-up" : "text-down"}>({formatPct(change)})</span>
          </p>
          <p className="text-quiet">Stop bei {formatPriceUsd(position.stopPrice)}</p>
          <button
            type="button"
            disabled={controls.busy}
            onClick={() => controls.act("verkaufen", position.id)}
            className="rounded-full border border-schiefer/30 px-3 py-0.5 hover:bg-panel-2 disabled:opacity-50"
          >
            Verkaufen
          </button>
        </div>
      ) : (
        signal && <p className="mt-1 text-xs text-quiet">{signal.buy ? "Kaufsignal" : `Kein Kauf: ${signal.why}`}</p>
      )}
    </article>
  );
}

function ScannerTable({ snap, verdicts }: { snap: MarketSnapshot | null; verdicts: Record<string, CoinVerdict> }) {
  const rows = snap?.scan.candidates ?? [];
  return (
    <section className={`flex min-w-0 flex-col ${PLATTE}`}>
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <h2 className="text-sm font-bold text-see">Scan: Solana-Memecoins</h2>
        <span className="text-xs text-quiet">{snap ? `${snap.scan.scanned} gescannt` : "lädt …"}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] whitespace-nowrap text-left text-xs">
          <thead className="text-xs text-quiet">
            <tr className="border-b border-line">
              <th className="px-3 py-2">Coin</th>
              <th className="px-2 py-2 text-right">Preis</th>
              <th className="px-2 py-2 text-right" title="Schwung: Kaufdruck, Volumen und Kurs der letzten Minuten, 0 bis 100">Schwung</th>
              <th className="px-2 py-2 text-right">5 Min</th>
              <th className="px-2 py-2 text-right">24 Std</th>
              <th className="px-2 py-2 text-right">Liquidität</th>
              <th className="px-2 py-2 text-right" title="Handelsvolumen der letzten 24 Stunden">Volumen</th>
              <th className="px-2 py-2 text-right">MCap</th>
              <th className="px-2 py-2 text-right">Trades</th>
              <th className="px-2 py-2 text-right">Alter</th>
              <th className="min-w-[180px] py-2 pl-2 pr-3">Prüfung</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <CandidateRow key={c.address} c={c} verdict={verdicts[c.address]} />
            ))}
            {snap && rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-center text-quiet">
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
  chief_nein: { label: "Chief: nein", tone: "bg-sonne/15 text-ocker" },
  frage: { label: "fragt dich", tone: "bg-sonne/20 font-bold text-ocker" },
  nicht_gekauft: { label: "Fills: nein", tone: "bg-sonne/15 text-ocker" },
  nicht_geprueft: { label: "nicht geprüft", tone: "bg-panel-2 text-quiet" },
  gekauft: { label: "gekauft", tone: "bg-schiefer/15 font-bold text-see" },
};

function CandidateRow({ c, verdict }: { c: Candidate; verdict?: CoinVerdict }) {
  const failed = c.checks.find((check) => !check.ok);
  return (
    <tr className="border-b border-line/60 hover:bg-panel-2">
      <td className="px-3 py-2">
        <a href={c.url} target="_blank" rel="noreferrer" className="griff font-bold hover:underline">
          ${c.symbol}
        </a>
        <span className="ml-2 text-quiet">{c.name}</span>
      </td>
      <td className="px-2 py-2 text-right">{formatPriceUsd(c.priceUsd)}</td>
      <td className="px-2 py-2 text-right">
        <HeatBar heat={c.heat} />
      </td>
      <td className={`px-2 py-2 text-right ${c.change5m >= 0 ? "text-up" : "text-down"}`}>{formatPct(c.change5m)}</td>
      <td className={`px-2 py-2 text-right ${c.change24h >= 0 ? "text-up" : "text-down"}`}>{formatPct(c.change24h)}</td>
      <td className="px-2 py-2 text-right">{formatCompactUsd(c.liquidityUsd)}</td>
      <td className="px-2 py-2 text-right">{formatCompactUsd(c.volumeH24)}</td>
      <td className="px-2 py-2 text-right">{formatCompactUsd(c.mcapUsd)}</td>
      <td className="px-2 py-2 text-right">{formatCount(c.tradesH24)}</td>
      <td className="px-2 py-2 text-right">{formatAge(c.ageMinutes)}</td>
      {/* Die Prüfung nimmt den Platz, der übrig ist, und bricht ihren Text um, statt die Tabelle breiter zu machen:
          So steht der Grund da, auch ohne Maus. */}
      <td className="w-full whitespace-normal py-2 pl-2 pr-3 leading-relaxed">
        {!c.passed ? (
          <span className="rounded bg-down/15 px-1.5 py-0.5 text-down" title={failed?.label}>
            raus: {failed?.label}
          </span>
        ) : verdict ? (
          // Höchstens drei Zeilen, damit eine lange Begründung die Tabelle nicht zerreißt; der ganze Text steht im Hinweis.
          <span className="line-clamp-3" title={verdict.text}>
            <span className={`rounded px-1.5 py-0.5 ${VERDICT[verdict.stage].tone}`}>{VERDICT[verdict.stage].label}</span>
            <span className="ml-2 text-quiet">{verdict.text}</span>
          </span>
        ) : (
          <span className="rounded bg-up/15 px-1.5 py-0.5 font-bold text-up" title="Hat die harten Filter bestanden, der Crawler prüft ihn als Nächstes">
            bestanden
          </span>
        )}
      </td>
    </tr>
  );
}

// Schwung als schmaler Balken mit Zahl. Ab 30 prüft der Crawler einen Coin überhaupt.
function HeatBar({ heat }: { heat: number }) {
  const value = Math.round(heat * 100);
  return (
    <span className="inline-flex items-center justify-end gap-1.5" title={value >= 30 ? "genug Schwung, der Crawler prüft ihn" : "zu wenig Schwung, wird übersprungen"}>
      <span className="h-1.5 w-10 overflow-hidden rounded bg-panel-2">
        <span className="block h-full rounded bg-gletscher" style={{ width: `${value}%`, opacity: value >= 30 ? 1 : 0.4 }} />
      </span>
      <span className={value >= 30 ? "text-schiefer" : "text-quiet"}>{value}</span>
    </span>
  );
}

function Trades({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) return null;
  return (
    <section className={PLATTE}>
      <div className="border-b border-line px-3 py-2">
        <h2 className="text-sm font-bold text-see">Trades mit Begründung</h2>
      </div>
      <ol className="divide-y divide-line/60 text-xs">
        {trades.slice(0, 20).map((t) => (
          <li key={t.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
            <span className="text-quiet">{new Date(t.at).toLocaleString("de-DE", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span>
            <span className={`w-14 font-bold ${t.side === "kauf" ? "text-see" : "text-ocker"}`}>{t.side}</span>
            <span className="font-bold">{assetLabel(t)}</span>
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
    <section className={`min-w-0 p-3 text-xs ${PLATTE}`}>
      <h2 className="mb-2 font-bold text-schiefer">thresholds.py</h2>
      <p className="mb-2 text-xs text-quiet">Hart: reine Rechnung, kostet nichts</p>
      <ul className="space-y-1">
        {keys.map((key) => (
          <li key={key} className="flex justify-between gap-2">
            <span className="text-see">{FILTER_LABELS[key]}</span>
            <span>{HARD_FILTERS[key].toLocaleString("de-DE")}</span>
          </li>
        ))}
      </ul>
      <p className="mb-2 mt-3 text-xs text-quiet">Weich: der Chief schätzt, die Grenze entscheidet</p>
      <ul className="space-y-1">
        {SOFT_KEYS.map((key) => (
          <li key={key} className="flex justify-between gap-2" title={SOFT_FILTERS[key].label}>
            <span className="truncate text-see">{key}</span>
            <span className="shrink-0">
              {SOFT_FILTERS[key].limit} {SOFT_FILTERS[key].value.toLocaleString("de-DE")}
            </span>
          </li>
        ))}
      </ul>
      <p className="mb-1 mt-3 text-xs text-quiet">filter.py: die Reihenfolge ist der Trick</p>
      <ol className="flex flex-wrap gap-1">
        {FILTER_STAGES.map((stage) => (
          <li key={stage.id} title={`${stage.agent}: ${stage.label}`} className="rounded border border-rot/50 px-1.5 py-0.5 text-xs text-down">
            {stage.id}
          </li>
        ))}
      </ol>
    </section>
  );
}

const TONE: Record<NonNullable<LogEntry["tone"]>, string> = { kill: "text-down", buy: "text-see", sell: "text-ocker", warn: "text-ocker" };

function DeskLog({ log }: { log: LogEntry[] }) {
  return (
    <section className={`flex min-h-48 flex-col p-3 text-xs ${PLATTE}`}>
      <h2 className="mb-2 font-bold text-schiefer">Protokoll</h2>
      <ol className="max-h-[420px] flex-1 space-y-1 overflow-y-auto">
        {log.map((e, i) => (
          <li key={`${e.at}-${i}`} className="flex gap-2">
            <span className="shrink-0 text-quiet">{formatClock(new Date(e.at))}</span>
            <span className="w-14 shrink-0 font-bold text-down">{e.agent}</span>
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
    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs text-quiet">
      <span>
        Daten: CoinGecko, DexScreener, GeckoTerminal, RugCheck, Grok und Twelve Data. Risk wacht alle 10 Sekunden, neue Coins alle 30 Sekunden, die Spinne zeigt jeden
        Schritt sofort.
      </span>
      <button
        type="button"
        disabled={!armed || controls.busy}
        onClick={() => controls.act("notaus")}
        title={armed ? "Stoppt sofort alle Agenten. Auch per Sprache: „Stopp alles“." : "Der Not-Aus greift, sobald der Spielgeld-Handel läuft."}
        className="rounded-full border border-down px-4 py-1 font-bold text-down hover:bg-down/15 disabled:cursor-not-allowed disabled:border-down/40 disabled:text-down/50"
      >
        Not-Aus
      </button>
    </footer>
  );
}
