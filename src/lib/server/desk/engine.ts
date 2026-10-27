import { promises as fs } from "node:fs";
import path from "node:path";
import { isoDate } from "../../dates";
import { formatPct, formatSignedUsd, formatUsd } from "../../format";
import { fetchPairs, marketSnapshot, toCandidate, type Candidate, type DexPair } from "../../market";
import {
  SAFETY,
  equityOf,
  exitReason,
  simulateBuy,
  simulateSell,
  stopPrice,
  targetPrice,
  testDayOf,
  ticketSize,
  type CoinVerdict,
  type DayRecord,
  type DeskAgent,
  type DeskSnapshot,
  type DeskStats,
  type DeskStatus,
  type LogEntry,
  type Position,
  type Trade,
} from "../../paper";
import { SOFT_FILTERS, SOFT_KEYS, type SoftKey } from "../../thresholds";
import { brainKey, explainBrainError } from "../brain";
import { CONFIG_DIR, readConfig } from "../config";
import { writeVaultFile } from "../obsidian";
import { judgeByRules, judgeWithClaude, type ChiefInput, type Verdict } from "./chief";
import { crawl, guard } from "./crawler";

// Der Motor des Spielgeld-Desks. Er läuft jede Minute, solange JARVIS auf dem Mac läuft:
// 1. Risk und Crawler bewachen die offenen Positionen (Stop-Loss, Ziel, Rug-Zeichen).
// 2. Das Tageslimit wird geprüft.
// 3. Läuft der Handel, gehen neue Coins durch Scan, Vet, Crawler und Chief; Size und Fills kaufen.
// Der Stand liegt in ~/.jarvis/spielgeld.json, jeder Trade zusätzlich in spielgeld-trades.jsonl.

const FILE = path.join(CONFIG_DIR, "spielgeld.json");
const TRADES_FILE = path.join(CONFIG_DIR, "spielgeld-trades.jsonl");
const TICK_MS = Number(process.env.JARVIS_TICK_MS) || 60_000;
// Bei einer Minute Takt: RugCheck alle 10 Minuten, ein Punkt für den Verlauf alle 5 Minuten.
const GUARD_MS = 10 * TICK_MS;
const HOUR = 3_600_000;
const MAX_CRAWLS_PER_TICK = 4;
const MAX_CHIEF_CALLS_PER_DAY = 200;
// Ist der Kurs seit der Prüfung um mehr als 5 % gestiegen, wird nicht gekauft.
const MAX_CHASE = 0.05;
const MISSED_TICKS_UNTIL_GONE = 5;
const LOG_LIMIT = 150;
const TRADE_LIMIT = 200;
const HISTORY_EVERY_MS = 5 * TICK_MS;
const HISTORY_LIMIT = 3000;

type StoredPosition = Position & { missed?: number };

type State = {
  version: 1;
  status: DeskStatus;
  statusReason: string | null;
  startedAt: string | null;
  startCapital: number;
  cash: number;
  positions: StoredPosition[];
  day: { date: string; startEquity: number; trades: number; limitHit: boolean; chiefCalls: number };
  days: DayRecord[];
  // Wann ein Coin zuletzt geprüft wurde und bis wann er nach einem Verkauf gesperrt ist.
  seen: Record<string, string>;
  cooldown: Record<string, string>;
  verdicts: Record<string, CoinVerdict>;
  stats: DeskStats;
  trades: Trade[];
  log: LogEntry[];
  equityHistory: { at: string; equity: number }[];
  lastPick: string | null;
  lastTickAt: string | null;
};

const freshState = (): State => ({
  version: 1,
  status: "aus",
  statusReason: null,
  startedAt: null,
  startCapital: SAFETY.startCapitalUsd,
  cash: SAFETY.startCapitalUsd,
  positions: [],
  day: { date: isoDate(new Date()), startEquity: SAFETY.startCapitalUsd, trades: 0, limitHit: false, chiefCalls: 0 },
  days: [],
  seen: {},
  cooldown: {},
  verdicts: {},
  stats: { scanned: 0, vetPassed: 0, pagesRead: 0, reportsRead: 0, killed: 0, rugsStopped: 0, chiefCalls: 0, wins: 0, losses: 0 },
  trades: [],
  log: [],
  equityHistory: [],
  lastPick: null,
  lastTickAt: null,
});

// Next.js lädt diesen Code unter Umständen in mehreren Bündeln. Damit es trotzdem nur einen Desk
// gibt, liegen Stand und Takt an einer gemeinsamen Stelle.
type Shared = { state: State | null; loading: Promise<State> | null; saving: Promise<void>; timer: ReturnType<typeof setInterval> | null; ticking: boolean };
const holder = globalThis as typeof globalThis & { __jarvisDesk?: Shared };
const shared: Shared = (holder.__jarvisDesk ??= { state: null, loading: null, saving: Promise.resolve(), timer: null, ticking: false });

async function load(): Promise<State> {
  if (shared.state) return shared.state;
  shared.loading ??= fs
    .readFile(FILE, "utf8")
    .then((raw) => {
      const saved = JSON.parse(raw) as Partial<State>;
      const base = freshState();
      return { ...base, ...saved, day: { ...base.day, ...saved.day }, stats: { ...base.stats, ...saved.stats } };
    })
    .catch(() => freshState())
    .then((state) => (shared.state = state));
  return shared.loading;
}

function save(state: State): Promise<void> {
  const json = JSON.stringify(state);
  shared.saving = shared.saving
    .then(async () => {
      await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(`${FILE}.tmp`, json, { mode: 0o600 });
      await fs.rename(`${FILE}.tmp`, FILE);
    })
    .catch((e) => console.error("Spielgeld-Stand nicht gespeichert:", e));
  return shared.saving;
}

function log(state: State, agent: LogEntry["agent"], text: string, tone?: LogEntry["tone"]) {
  state.log.unshift({ at: new Date().toISOString(), agent, text, tone });
  state.log.length = Math.min(state.log.length, LOG_LIMIT);
}

// Warnungen wie „keine Kurse“ nur einmal in 10 Minuten, sonst füllt ein Ausfall das ganze Protokoll.
function warnOnce(state: State, agent: LogEntry["agent"], text: string) {
  const recent = state.log.some((l) => l.text === text && Date.now() - Date.parse(l.at) < 10 * 60_000);
  if (!recent) log(state, agent, text, "warn");
}

const equity = (state: State) => equityOf(state.cash, state.positions);

// Liest den Status jedes Mal frisch: Der Not-Aus kann jederzeit zwischen zwei Schritten kommen.
const halted = (state: State) => state.status === "notaus";

function record(state: State, trade: Trade) {
  state.trades.unshift(trade);
  state.trades.length = Math.min(state.trades.length, TRADE_LIMIT);
  state.day.trades++;
  fs.appendFile(TRADES_FILE, JSON.stringify(trade) + "\n", { mode: 0o600 }).catch((e) => console.error("Trade nicht protokolliert:", e));
}

const tradeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

function buy(state: State, c: Candidate, ticket: number, why: string, now: Date) {
  const { qty, fillPrice, feesUsd } = simulateBuy(ticket, c.priceUsd, c.liquidityUsd);
  state.cash -= ticket;
  const at = now.toISOString();
  state.positions.push({
    address: c.address,
    symbol: c.symbol,
    name: c.name,
    url: c.url,
    qty,
    costUsd: ticket,
    entryPrice: fillPrice,
    openedAt: at,
    peakPrice: fillPrice,
    lastPrice: c.priceUsd,
    lastAt: at,
    entryLiquidity: c.liquidityUsd,
    lastLiquidity: c.liquidityUsd,
    guardedAt: at,
    why,
  });
  record(state, { id: tradeId(), at, side: "kauf", address: c.address, symbol: c.symbol, qty, price: c.priceUsd, fillPrice, usd: ticket, feesUsd, agent: "Fills", why });
  state.lastPick = c.symbol;
  log(state, "Size", `$${c.symbol}: ${formatUsd(ticket)}, das sind ${SAFETY.maxTradeShare * 100} % des Kontos`);
  log(state, "Fills", `Kauf $${c.symbol} für ${formatUsd(ticket)}, davon ${formatUsd(feesUsd)} Gebühren`, "buy");
}

function sell(state: State, p: StoredPosition, price: number, liquidity: number, agent: DeskAgent, why: string, now: Date) {
  // Während der Desk auf Kurse wartet, kannst du dieselbe Position schon selbst verkauft haben.
  if (!state.positions.includes(p)) return;
  const { usd, fillPrice, feesUsd } = simulateSell(p.qty, price, liquidity);
  const pnlUsd = usd - p.costUsd;
  state.cash += usd;
  state.positions = state.positions.filter((x) => x.address !== p.address);
  state.cooldown[p.address] = new Date(now.getTime() + SAFETY.cooldownHours * HOUR).toISOString();
  if (pnlUsd >= 0) state.stats.wins++;
  else state.stats.losses++;
  record(state, {
    id: tradeId(),
    at: now.toISOString(),
    side: "verkauf",
    address: p.address,
    symbol: p.symbol,
    qty: p.qty,
    price,
    fillPrice,
    usd,
    feesUsd,
    pnlUsd,
    pnlPct: (pnlUsd / p.costUsd) * 100,
    agent,
    why,
  });
  log(state, agent, `Verkauf $${p.symbol}: ${why}. Ergebnis ${formatSignedUsd(pnlUsd)}`, "sell");
}

// 1. Risk und Crawler bewachen, was gekauft ist. Das läuft auch in der Pause und am Tageslimit.
async function watch(state: State, now: Date) {
  if (state.positions.length === 0) return;
  let pairs;
  try {
    pairs = await fetchPairs(state.positions.map((p) => p.address));
  } catch {
    warnOnce(state, "Risk", "Keine Kurse für die offenen Positionen, ich versuche es beim nächsten Durchlauf wieder");
    return;
  }
  for (const p of [...state.positions]) {
    if (halted(state)) return;
    if (!state.positions.includes(p)) continue;
    const pair = pairs.get(p.address);
    const price = Number(pair?.priceUsd ?? 0);
    if (!pair || !(price > 0)) {
      // Verschwindet ein Coin ganz von DexScreener, ist der Pool meist leer geräumt.
      p.missed = (p.missed ?? 0) + 1;
      if (p.missed >= MISSED_TICKS_UNTIL_GONE) {
        sell(state, p, p.lastPrice, 0, "Risk", "Kein Handelspaar mehr zu finden, der Pool ist vermutlich leer", now);
        state.stats.rugsStopped++;
      }
      continue;
    }
    p.missed = 0;
    p.lastPrice = price;
    p.lastLiquidity = pair.liquidity?.usd ?? 0;
    p.lastAt = now.toISOString();
    p.peakPrice = Math.max(p.peakPrice, price);

    if (now.getTime() - Date.parse(p.guardedAt) >= GUARD_MS) {
      try {
        const danger = await guard(p.address);
        p.guardedAt = now.toISOString();
        state.stats.reportsRead++;
        if (danger && !halted(state) && state.positions.includes(p)) {
          sell(state, p, price, p.lastLiquidity, "Crawler", `Rug-Zeichen: ${danger}`, now);
          state.stats.rugsStopped++;
          continue;
        }
      } catch {
        // RugCheck gerade nicht erreichbar: beim nächsten Durchlauf wieder.
      }
    }

    const reason = exitReason(p, price, p.lastLiquidity, now);
    if (reason && !halted(state) && state.positions.includes(p)) {
      sell(state, p, price, p.lastLiquidity, "Risk", reason, now);
      if (reason.startsWith("Liquidität")) state.stats.rugsStopped++;
    }
  }
}

// 2. Höchstens 5 % Verlust am Tag.
function dailyLimit(state: State) {
  if (!state.day.limitHit && equity(state) <= state.day.startEquity * (1 - SAFETY.dailyLossLimit)) {
    state.day.limitHit = true;
    log(state, "Risk", `Tageslimit: ${SAFETY.dailyLossLimit * 100} % Verlust heute. Bis morgen kaufe ich nichts mehr, Stop-Loss bleibt aktiv`, "warn");
  }
  if (state.day.limitHit && state.status === "laeuft") {
    state.status = "tageslimit";
    state.statusReason = `Heute ${SAFETY.dailyLossLimit * 100} % Verlust erreicht, morgen geht es weiter`;
  }
}

const margin = (v: Verdict) =>
  SOFT_KEYS.reduce((sum, k: SoftKey) => sum + (SOFT_FILTERS[k].limit === "max" ? SOFT_FILTERS[k].value - v.scores[k] : v.scores[k] - SOFT_FILTERS[k].value), 0);

// 3. Neue Coins suchen: Scan und Vet (harte Filter), Crawler (Blockchain und Projekt), Chief (weiche Filter).
async function hunt(state: State, now: Date) {
  const market = await marketSnapshot(15_000);
  const candidates = market.scan.candidates;
  state.stats.scanned = market.scan.scanned;
  state.stats.vetPassed = candidates.filter((c) => c.passed).length;
  if (market.scan.source !== "live") {
    warnOnce(state, "Scan", NO_LIVE);
    return;
  }
  if (state.positions.length >= SAFETY.maxOpenPositions) return;
  const ticket = ticketSize(equity(state), state.cash);
  if (!ticket) return;

  const held = new Set(state.positions.map((p) => p.address));
  const fresh = candidates
    .filter((c) => c.passed && !held.has(c.address))
    .filter((c) => !(state.cooldown[c.address] && Date.parse(state.cooldown[c.address]) > now.getTime()))
    .filter((c) => !(state.seen[c.address] && now.getTime() - Date.parse(state.seen[c.address]) < SAFETY.recheckHours * HOUR))
    .slice(0, MAX_CRAWLS_PER_TICK);
  if (fresh.length === 0) return;

  const survivors: ChiefInput[] = [];
  for (const c of fresh) {
    state.seen[c.address] = now.toISOString();
    try {
      const report = await crawl(c);
      state.stats.reportsRead++;
      state.stats.pagesRead += report.pages;
      if (report.kill) {
        state.verdicts[c.address] = { at: now.toISOString(), stage: report.stage ?? "chain_kill", text: report.kill };
        state.stats.killed++;
        log(state, "Crawler", `$${c.symbol} aussortiert: ${report.kill}`, "kill");
        continue;
      }
      const site = report.site ? ("title" in report.site ? `Seite „${report.site.title || report.site.url}“ gelesen` : `Seite: ${report.site.error}`) : "keine Seite";
      log(state, "Crawler", `$${c.symbol}: Blockchain sauber, Top 10 halten ${report.chain.top10Pct?.toLocaleString("de-DE")} %, ${site}`);
      survivors.push({ candidate: c, crawl: report, ticket });
    } catch (e) {
      state.verdicts[c.address] = { at: now.toISOString(), stage: "nicht_geprueft", text: "RugCheck nicht erreichbar, also kein Kauf" };
      log(state, "Crawler", `$${c.symbol} nicht geprüft (${e instanceof Error ? e.message : e}), also kein Kauf`, "warn");
    }
  }
  if (survivors.length === 0) return;

  const key = brainKey(await readConfig());
  let verdicts: Verdict[];
  if (key && state.day.chiefCalls < MAX_CHIEF_CALLS_PER_DAY) {
    try {
      state.day.chiefCalls++;
      state.stats.chiefCalls++;
      verdicts = await judgeWithClaude(key, survivors);
    } catch (e) {
      log(state, "Chief", `Claude antwortet nicht: ${explainBrainError(e)} Ich kaufe in dieser Runde nichts`, "warn");
      return;
    }
  } else {
    verdicts = judgeByRules(survivors);
  }
  for (const v of verdicts) {
    log(state, "Chief", `$${v.symbol}: ${v.buy ? "ja. " : ""}${v.why}`);
    if (!v.buy) state.verdicts[v.address] = { at: now.toISOString(), stage: "chief_nein", text: v.why };
  }

  const picks = verdicts.filter((x) => x.buy).sort((a, b) => margin(b) - margin(a));
  if (picks.length === 0) return;

  // Zwischen Scan und Entscheidung vergehen Sekunden; gekauft wird zum frischen Kurs, nicht zum alten.
  let quotes: Map<string, DexPair>;
  try {
    quotes = await fetchPairs(picks.map((v) => v.address));
  } catch {
    log(state, "Fills", "Keine frischen Kurse, also kein Kauf in dieser Runde", "warn");
    return;
  }
  const pass = (v: Verdict, why: string) => {
    state.verdicts[v.address] = { at: now.toISOString(), stage: "nicht_gekauft", text: why };
    log(state, "Fills", `$${v.symbol}: ${why}`, "warn");
  };
  for (const v of picks) {
    // Der Not-Aus oder eine Pause kann jederzeit dazwischenkommen.
    if (state.status !== "laeuft" || state.positions.length >= SAFETY.maxOpenPositions) break;
    const size = ticketSize(equity(state), state.cash);
    if (!size) break;
    const checked = survivors.find((s) => s.candidate.address === v.address)!.candidate;
    const pair = quotes.get(v.address);
    const live = pair ? toCandidate(pair, now.getTime()) : null;
    if (!live || !(live.priceUsd > 0) || !live.passed) {
      pass(v, "besteht die harten Filter nicht mehr, kein Kauf");
      continue;
    }
    if (live.priceUsd > checked.priceUsd * (1 + MAX_CHASE)) {
      pass(v, `seit der Prüfung ${formatPct((live.priceUsd / checked.priceUsd - 1) * 100)} gestiegen, ich laufe nicht hinterher`);
      continue;
    }
    state.verdicts[v.address] = { at: now.toISOString(), stage: "gekauft", text: v.why };
    buy(state, live, size, v.why, now);
  }
}

const NO_LIVE = "Keine Live-Daten von DexScreener. Mit Beispieldaten kaufe ich nichts";

async function rollDay(state: State, now: Date) {
  const today = isoDate(now);
  if (state.day.date === today) return;
  const closed: DayRecord = { date: state.day.date, startEquity: state.day.startEquity, endEquity: equity(state), trades: state.day.trades };
  state.days.push(closed);
  await writeReport(state, closed.date, closed);
  state.day = { date: today, startEquity: equity(state), trades: 0, limitHit: false, chiefCalls: 0 };
  if (state.status === "tageslimit") {
    state.status = "laeuft";
    state.statusReason = null;
    log(state, "Risk", "Neuer Tag, das Tageslimit ist zurückgesetzt");
  }
  // Alte Einträge vergessen, damit die Datei klein bleibt.
  const cutoff = now.getTime() - 2 * 24 * HOUR;
  for (const map of [state.seen, state.cooldown]) {
    for (const [k, v] of Object.entries(map)) if (Date.parse(v) < cutoff) delete map[k];
  }
  for (const [k, v] of Object.entries(state.verdicts)) if (Date.parse(v.at) < cutoff) delete state.verdicts[k];
}

function remember(state: State, now: Date) {
  const last = state.equityHistory.at(-1);
  if (last && now.getTime() - Date.parse(last.at) < HISTORY_EVERY_MS) return;
  state.equityHistory.push({ at: now.toISOString(), equity: Math.round(equity(state) * 100) / 100 });
  if (state.equityHistory.length > HISTORY_LIMIT) state.equityHistory.splice(0, state.equityHistory.length - HISTORY_LIMIT);
}

export async function tick(now = new Date()) {
  if (shared.ticking) return;
  shared.ticking = true;
  try {
    const state = await load();
    if (state.status === "aus" || state.status === "notaus") return;
    await rollDay(state, now);
    const before = state.day.trades;
    await watch(state, now);
    dailyLimit(state);
    if (state.status === "laeuft") await hunt(state, now);
    remember(state, now);
    state.lastTickAt = now.toISOString();
    await save(state);
    if (state.day.trades !== before) await writeReport(state, state.day.date);
  } catch (e) {
    console.error("Spielgeld-Desk:", e);
  } finally {
    shared.ticking = false;
  }
}

export function startDesk() {
  if (shared.timer) return;
  shared.timer = setInterval(() => void tick(), TICK_MS);
  setTimeout(() => void tick(), Math.min(5_000, TICK_MS));
}

export type DeskAction = { action: "start" | "pause" | "weiter" | "notaus" | "alle_verkaufen" | "zuruecksetzen" } | { action: "verkaufen"; address: string };

export class DeskError extends Error {}

export async function control(input: DeskAction, now = new Date()): Promise<string> {
  const state = await load();
  let message: string;
  switch (input.action) {
    case "start": {
      if (state.status !== "aus") throw new DeskError("Der Spielgeld-Handel ist schon gestartet.");
      Object.assign(state, freshState(), { status: "laeuft", startedAt: now.toISOString() });
      state.equityHistory.push({ at: now.toISOString(), equity: state.startCapital });
      message = `Spielgeld-Handel gestartet mit ${formatUsd(state.startCapital)}. Die Testzeit läuft ${SAFETY.testDays} Tage.`;
      setTimeout(() => void tick(), 1_000);
      break;
    }
    case "pause":
      if (state.status !== "laeuft" && state.status !== "tageslimit") throw new DeskError("Der Handel läuft gerade nicht.");
      state.status = "pausiert";
      state.statusReason = "Von dir pausiert. Stop-Loss und Crawler bewachen die offenen Positionen weiter.";
      message = "Pausiert. Ich kaufe nichts Neues, passe aber weiter auf die offenen Positionen auf.";
      break;
    case "weiter":
      if (state.status !== "pausiert" && state.status !== "notaus") throw new DeskError("Der Handel ist nicht angehalten.");
      state.status = state.day.limitHit ? "tageslimit" : "laeuft";
      state.statusReason = state.day.limitHit ? `Heute ${SAFETY.dailyLossLimit * 100} % Verlust erreicht, morgen geht es weiter` : null;
      message = state.day.limitHit ? "Die Agenten laufen wieder, kaufen wegen des Tageslimits aber erst morgen." : "Die Agenten laufen wieder.";
      setTimeout(() => void tick(), 1_000);
      break;
    case "notaus":
      if (state.status === "aus") throw new DeskError("Der Spielgeld-Handel ist noch nicht gestartet.");
      state.status = "notaus";
      state.statusReason = "Not-Aus: alle Agenten stehen, auch der Stop-Loss. Offene Positionen bleiben, bis du sie verkaufst oder weitermachst.";
      message = `Not-Aus. Alle Agenten stehen.${state.positions.length ? ` ${state.positions.length} Positionen bleiben offen.` : ""}`;
      break;
    case "verkaufen":
    case "alle_verkaufen": {
      const targets = input.action === "verkaufen" ? state.positions.filter((p) => p.address === input.address) : [...state.positions];
      if (targets.length === 0) throw new DeskError("Diese Position gibt es nicht mehr.");
      const pairs = await fetchPairs(targets.map((p) => p.address)).catch(() => {
        throw new DeskError("Ich bekomme gerade keine Kurse, also verkaufe ich nicht blind. Versuch es gleich noch einmal.");
      });
      let total = 0;
      for (const p of targets) {
        const pair = pairs.get(p.address);
        const price = Number(pair?.priceUsd ?? p.lastPrice);
        const before = state.cash;
        sell(state, p, price, pair?.liquidity?.usd ?? p.lastLiquidity, "Du", "von dir verkauft", now);
        total += state.cash - before;
      }
      message = `${targets.length === 1 ? `$${targets[0].symbol}` : `${targets.length} Positionen`} verkauft, ${formatUsd(total)} zurück aufs Konto.`;
      break;
    }
    case "zuruecksetzen": {
      if (state.status === "laeuft" || state.status === "tageslimit") throw new DeskError("Bitte zuerst pausieren.");
      await fs.rename(TRADES_FILE, TRADES_FILE.replace(/\.jsonl$/, `-bis-${isoDate(now)}-${now.getTime()}.jsonl`)).catch(() => {});
      Object.assign(state, freshState());
      message = "Zurückgesetzt. Das alte Protokoll liegt noch neben den Einstellungen.";
      break;
    }
    default:
      throw new DeskError("Unbekannte Aktion.");
  }
  log(state, "Du", message);
  await save(state);
  if (input.action === "verkaufen" || input.action === "alle_verkaufen") await writeReport(state, state.day.date);
  return message;
}

// Der Zähler für verpasste Kurse ist nur intern.
const publicPosition = ({ missed, ...p }: StoredPosition): Position => (void missed, p);

function downsample<T>(list: T[], max: number): T[] {
  if (list.length <= max) return list;
  const step = list.length / max;
  return Array.from({ length: max }, (_, i) => list[Math.floor(i * step)]).concat(list.at(-1)!);
}

export async function deskSnapshot(now = new Date()): Promise<DeskSnapshot> {
  const state = await load();
  const total = equity(state);
  return {
    status: state.status,
    statusReason: state.statusReason,
    startedAt: state.startedAt,
    testDay: testDayOf(state.startedAt, now),
    startCapital: state.startCapital,
    cash: state.cash,
    equity: total,
    pnlUsd: total - state.startCapital,
    pnlPct: (total / state.startCapital - 1) * 100,
    dayPnlPct: (total / state.day.startEquity - 1) * 100,
    positions: state.positions.map((p) => ({ ...publicPosition(p), stopPrice: stopPrice(p), targetPrice: targetPrice(p) })),
    trades: state.trades.slice(0, 40),
    log: state.log.slice(0, 80),
    stats: state.stats,
    days: state.days,
    equityHistory: downsample(state.equityHistory, 400),
    lastPick: state.lastPick,
    lastTickAt: state.lastTickAt,
    verdicts: Object.fromEntries(Object.entries(state.verdicts).filter(([, v]) => now.getTime() - Date.parse(v.at) < SAFETY.recheckHours * HOUR)),
    chief: brainKey(await readConfig()) ? "claude" : "regeln",
  };
}

// Der Tagesbericht in Obsidian: JARVIS/Handel/JJJJ-MM-TT.md, damit du jeden Trade nachlesen kannst.
async function writeReport(state: State, date: string, closed?: DayRecord) {
  const vault = (await readConfig()).vaultPath;
  if (!vault) return;
  const trades = state.trades.filter((t) => isoDate(new Date(t.at)) === date).reverse();
  const end = closed?.endEquity ?? equity(state);
  const start = closed?.startEquity ?? state.day.startEquity;
  const time = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  const cell = (s: string) => s.replace(/\|/g, "/").replace(/\s+/g, " ");
  const lines = [
    `# Spielgeld-Handel ${date}`,
    "",
    `Testtag ${testDayOf(state.startedAt, closed ? new Date(`${date}T23:59:59`) : new Date())} von ${SAFETY.testDays}. Kein echtes Geld.`,
    "",
    `- Konto am Tagesanfang: ${formatUsd(start)}`,
    `- Konto ${closed ? "am Tagesende" : "jetzt"}: ${formatUsd(end)} (${formatSignedUsd(end - start)})`,
    `- Seit dem Start: ${formatSignedUsd(end - state.startCapital)}`,
    `- Offene Positionen: ${state.positions.map((p) => `$${p.symbol}`).join(", ") || "keine"}`,
    `- Crawler: ${state.stats.killed} Coins aussortiert, ${state.stats.rugsStopped} Rugs gestoppt (seit dem Start)`,
    "",
    "## Trades",
    "",
    "| Zeit | Coin | Art | Betrag | Ergebnis | Wer | Warum |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...trades.map(
      (t) =>
        `| ${time(t.at)} | $${cell(t.symbol)} | ${t.side} | ${formatUsd(t.usd)} | ${t.pnlUsd === undefined ? "" : formatSignedUsd(t.pnlUsd)} | ${t.agent} | ${cell(t.why)} |`,
    ),
    ...(trades.length ? [] : ["| | | | | | | heute keine Trades |"]),
    "",
  ];
  await writeVaultFile(vault, `JARVIS/Handel/${date}.md`, lines.join("\n")).catch((e) => console.error("Tagesbericht nicht geschrieben:", e));
}
