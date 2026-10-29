import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { APPROVAL, approvalLimitOf, approvalOutcome, approvalQuestion, needsApproval, type Approval, type ApprovalState } from "../../approval";
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
  type CrawlEvent,
  type CrawlState,
  type CrawlStep,
  type CrawlTrail,
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
import { CONFIG_DIR, grokKey, readConfig, xBudget } from "../config";
import { intelWarning } from "../intel";
import { notify } from "../notify";
import { writeVaultFile } from "../obsidian";
import { judgeByRules, judgeWithClaude, type ChiefInput, type Verdict } from "./chief";
import { crawl, guard, type ChainCheck } from "./crawler";
import { GrokError, readX, TYPICAL_COST_USD, type XReport } from "./grok";

// Der Motor des Spielgeld-Desks. Er läuft jede Minute, solange JARVIS auf dem Mac läuft:
// 1. Risk und Crawler bewachen die offenen Positionen (Stop-Loss, Ziel, Rug-Zeichen).
// 2. Das Tageslimit wird geprüft.
// 3. Läuft der Handel, gehen neue Coins durch Scan, Vet, Crawler und Chief; Size und Fills kaufen.
//    Ab der Grenze aus den Einstellungen fragen sie dich vorher und kaufen erst nach deinem Ja.
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
const TRAIL_LIMIT = 200;
const APPROVAL_MS = APPROVAL.timeoutMinutes * 60_000;

type StoredPosition = Position & { missed?: number };

type State = {
  version: 1;
  status: DeskStatus;
  statusReason: string | null;
  startedAt: string | null;
  startCapital: number;
  cash: number;
  positions: StoredPosition[];
  day: { date: string; startEquity: number; trades: number; limitHit: boolean; chiefCalls: number; xSpentUsd: number };
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
  // Rückfragen vor Käufen, neueste zuerst.
  approvals: Approval[];
};

const freshState = (): State => ({
  version: 1,
  status: "aus",
  statusReason: null,
  startedAt: null,
  startCapital: SAFETY.startCapitalUsd,
  cash: SAFETY.startCapitalUsd,
  positions: [],
  day: { date: isoDate(new Date()), startEquity: SAFETY.startCapitalUsd, trades: 0, limitHit: false, chiefCalls: 0, xSpentUsd: 0 },
  days: [],
  seen: {},
  cooldown: {},
  verdicts: {},
  stats: { scanned: 0, vetPassed: 0, pagesRead: 0, reportsRead: 0, postsRead: 0, xReads: 0, xCostUsd: 0, killed: 0, rugsStopped: 0, chiefCalls: 0, wins: 0, losses: 0 },
  trades: [],
  log: [],
  equityHistory: [],
  lastPick: null,
  lastTickAt: null,
  approvals: [],
});

// Next.js lädt diesen Code unter Umständen in mehreren Bündeln. Damit es trotzdem nur einen Desk
// gibt, liegen Stand und Takt an einer gemeinsamen Stelle. Die Spur der Spinne lebt nur im Speicher.
type Shared = {
  state: State | null;
  loading: Promise<State> | null;
  saving: Promise<void>;
  timer: ReturnType<typeof setInterval> | null;
  ticking: boolean;
  trail?: CrawlEvent[];
  seq?: number;
};
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
function warnOnce(state: State, agent: LogEntry["agent"], text: string): boolean {
  const recent = state.log.some((l) => l.text === text && Date.now() - Date.parse(l.at) < 10 * 60_000);
  if (!recent) log(state, agent, text, "warn");
  return !recent;
}

// Ein Schritt für die Spinne: welcher Coin, welche Prüfung, wie sie ausging.
function trace(coin: { address: string; symbol: string } | null, step: CrawlStep, state: CrawlState, text: string) {
  const trail = (shared.trail ??= []);
  shared.seq = (shared.seq ?? 0) + 1;
  trail.push({ seq: shared.seq, at: new Date().toISOString(), address: coin?.address ?? "", symbol: coin?.symbol ?? "", step, state, text });
  if (trail.length > TRAIL_LIMIT) trail.splice(0, trail.length - TRAIL_LIMIT);
}

export async function crawlTrail(after = 0): Promise<CrawlTrail> {
  const state = await load();
  const seq = shared.seq ?? 0;
  // Ist die Seite weiter als der Server, wurde er neu gestartet: dann alles von vorn.
  const from = after > seq ? 0 : after;
  return { seq, events: (shared.trail ?? []).filter((e) => e.seq > from).slice(-80), status: state.status, lastTickAt: state.lastTickAt, tickMs: TICK_MS };
}

const chainText = (chain: ChainCheck) =>
  `Blockchain sauber, Top 10 halten ${chain.top10Pct?.toLocaleString("de-DE") ?? "?"} %${chain.lpLockedPct !== null ? `, Pool zu ${chain.lpLockedPct.toLocaleString("de-DE")} % gesperrt` : ""}`;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

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

// Nach deinem Ja steht das Ergebnis schon unter der Rückfrage; eine zweite Meldung wäre doppelt.
function buy(state: State, c: Candidate, ticket: number, why: string, now: Date, approved = false) {
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
  if (!approved) notify({ kind: "trade", text: `🟢 Spielgeld-Kauf: $${c.symbol} für ${formatUsd(ticket)}.\nWarum: ${why}` });
}

// ---------- Rückfrage vor Käufen ----------

const openApprovals = (state: State) => state.approvals.filter((a) => a.state === "offen");

// Warum gerade nicht gekauft wird, als halber Satz.
const NOT_BUYING: Record<DeskStatus, string> = {
  aus: "der Handel ist nicht gestartet",
  laeuft: "",
  pausiert: "der Handel ist pausiert",
  tageslimit: "das Tageslimit ist erreicht",
  notaus: "der Not-Aus ist gedrückt",
};

function ask(state: State, c: Candidate, usd: number, why: string, now: Date) {
  const a: Approval = {
    id: randomBytes(5).toString("hex"),
    address: c.address,
    symbol: c.symbol,
    name: c.name,
    url: c.url,
    usd,
    price: c.priceUsd,
    why,
    askedAt: now.toISOString(),
    until: new Date(now.getTime() + APPROVAL_MS).toISOString(),
    state: "offen",
  };
  state.approvals.unshift(a);
  // Offene bleiben immer, von den erledigten nur die letzten.
  let done = 0;
  state.approvals = state.approvals.filter((x) => x.state === "offen" || ++done <= APPROVAL.keep);
  state.verdicts[c.address] = { at: now.toISOString(), stage: "frage", text: `wartet auf dein Ja für ${formatUsd(usd)}` };
  log(state, "Size", `$${c.symbol}: Kauf für ${formatUsd(usd)}. Ich frage dich vorher und kaufe erst nach deinem Ja`, "warn");
  trace(c, "chief", "ok", `wartet auf dein Ja für ${formatUsd(usd)}`);
  notify({ kind: "rueckfrage", id: a.id, text: approvalQuestion(a) });
}

function settle(state: State, a: Approval, outcome: Exclude<ApprovalState, "offen">, result: string, now: Date, via?: Approval["via"]) {
  a.state = outcome;
  a.result = result;
  a.answeredAt = now.toISOString();
  if (via) a.via = via;
  if (outcome !== "ja") state.verdicts[a.address] = { at: now.toISOString(), stage: "nicht_gekauft", text: result.replace(/\.$/, "") };
  notify({ kind: "rueckfrage_ende", id: a.id, text: approvalOutcome(a) });
}

// Ohne Antwort kein Kauf.
function expireApprovals(state: State, now: Date) {
  for (const a of openApprovals(state)) {
    if (Date.parse(a.until) > now.getTime()) continue;
    settle(state, a, "verfallen", "Keine Antwort, also nicht gekauft.", now);
    log(state, "Fills", `$${a.symbol}: keine Antwort von dir, also nicht gekauft`, "warn");
    trace(a, "fills", "warn", "keine Antwort von dir, also nicht gekauft");
  }
}

// Pause, Not-Aus, Tageslimit: Was noch auf dein Ja wartet, fällt weg.
function dropApprovals(state: State, why: string, now: Date) {
  for (const a of openApprovals(state)) {
    settle(state, a, "verworfen", `Nicht gekauft: ${why}.`, now);
    log(state, "Fills", `$${a.symbol}: Rückfrage zurückgezogen, ${why}`, "warn");
  }
}

export async function approvalStateOf(id: string): Promise<ApprovalState | null> {
  return (await load()).approvals.find((a) => a.id === id)?.state ?? null;
}

// Deine Antwort auf eine Rückfrage, per Knopf in JARVIS oder in Telegram. Ein Ja kauft nur, wenn auch
// jetzt noch alles passt; geprüft wird mit einem frischen Kurs.
export async function answerApproval(id: string, yes: boolean, via: NonNullable<Approval["via"]>, now = new Date()): Promise<string> {
  const state = await load();
  const find = () => state.approvals.find((x) => x.id === id);
  const open = () => {
    const a = find();
    if (!a) throw new DeskError("Diese Rückfrage gibt es nicht mehr.");
    if (a.state !== "offen") throw new DeskError(`Diese Rückfrage ist schon erledigt: ${a.result}`);
    return a;
  };
  let a = open();
  if (Date.parse(a.until) <= now.getTime()) {
    expireApprovals(state, now);
    await save(state);
    throw new DeskError(`Zu spät: Die Rückfrage zu $${a.symbol} ist verfallen. Gekauft habe ich nichts.`);
  }
  if (!yes) {
    settle(state, a, "nein", "Nicht gekauft, du hast Nein gesagt.", now, via);
    // Denselben Coin fragt der Desk heute nicht noch einmal.
    state.cooldown[a.address] = new Date(now.getTime() + SAFETY.cooldownHours * HOUR).toISOString();
    log(state, "Du", `$${a.symbol}: nein, nicht kaufen`);
    trace(a, "fills", "raus", "du hast Nein gesagt");
    await save(state);
    return `Gut, $${a.symbol} kaufe ich nicht.`;
  }

  let pair: DexPair | undefined;
  try {
    pair = (await fetchPairs([a.address])).get(a.address);
  } catch {
    throw new DeskError("Ich bekomme gerade keinen frischen Kurs und kaufe nicht blind. Die Frage bleibt offen, versuch es gleich noch einmal.");
  }
  // Während auf den Kurs gewartet wurde, kann sich alles geändert haben: noch einmal von vorn prüfen.
  a = open();
  const refuse = async (why: string) => {
    settle(state, a, "verworfen", `Nicht gekauft: ${why}.`, now, via);
    log(state, "Fills", `$${a.symbol}: trotz deinem Ja nicht gekauft, ${why}`, "warn");
    trace(a, "fills", "warn", `trotz deinem Ja nicht gekauft: ${why}`);
    await save(state);
    return `Nicht gekauft: ${why}.`;
  };
  if (Date.parse(a.until) <= now.getTime()) return refuse("die Rückfrage ist inzwischen verfallen");
  if (state.status !== "laeuft") return refuse(NOT_BUYING[state.status]);
  if (state.positions.some((p) => p.address === a.address)) return refuse("den Coin hat der Desk schon");
  if (state.positions.length >= SAFETY.maxOpenPositions) return refuse(`es sind schon ${SAFETY.maxOpenPositions} Coins offen`);
  const live = pair ? toCandidate(pair, now.getTime()) : null;
  if (!live || !(live.priceUsd > 0) || !live.passed) return refuse("er besteht die harten Filter nicht mehr");
  if (live.priceUsd > a.price * (1 + MAX_CHASE)) return refuse(`der Kurs ist seit der Frage ${formatPct((live.priceUsd / a.price - 1) * 100)} gestiegen, ich laufe nicht hinterher`);
  const size = Math.min(a.usd, ticketSize(equity(state), state.cash));
  if (!size) return refuse("es ist nicht genug Geld auf dem Konto");

  settle(state, a, "ja", `Gekauft für ${formatUsd(size)}.`, now, via);
  state.verdicts[a.address] = { at: now.toISOString(), stage: "gekauft", text: a.why };
  log(state, "Du", `$${a.symbol}: ja, kaufen`);
  buy(state, live, size, a.why, now, true);
  trace(live, "fills", "gekauft", `nach deinem Ja gekauft für ${formatUsd(size)}`);
  await save(state);
  await writeReport(state, state.day.date);
  return `Gekauft: $${a.symbol} für ${formatUsd(size)}.`;
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
  // Was du selbst verkaufst, weißt du schon.
  if (agent !== "Du") {
    notify({ kind: "trade", text: `${pnlUsd >= 0 ? "🔵" : "🔴"} Spielgeld-Verkauf: $${p.symbol}, Ergebnis ${formatSignedUsd(pnlUsd)} (${formatPct((pnlUsd / p.costUsd) * 100)}).\nGrund: ${why}` });
  }
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
      trace(p, "guard", "laeuft", "bewacht den gekauften Coin, liest RugCheck");
      try {
        const danger = await guard(p.address);
        p.guardedAt = now.toISOString();
        state.stats.reportsRead++;
        if (danger && !halted(state) && state.positions.includes(p)) {
          trace(p, "guard", "raus", `Rug-Zeichen: ${danger}. Sofort verkauft`);
          sell(state, p, price, p.lastLiquidity, "Crawler", `Rug-Zeichen: ${danger}`, now);
          state.stats.rugsStopped++;
          continue;
        }
        trace(p, "guard", "ok", "keine neuen Rug-Zeichen");
      } catch {
        // RugCheck gerade nicht erreichbar: beim nächsten Durchlauf wieder.
        trace(p, "guard", "warn", "RugCheck gerade nicht erreichbar, nächste Runde wieder");
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
    notify({ kind: "warnung", text: `⚠️ Tageslimit: Der Spielgeld-Desk hat heute ${SAFETY.dailyLossLimit * 100} % verloren und kauft bis morgen nichts mehr. Der Stop-Loss passt weiter auf.` });
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
    if (warnOnce(state, "Scan", NO_LIVE)) trace(null, "scan", "warn", NO_LIVE);
    return;
  }
  trace(null, "scan", "ok", `${market.scan.scanned} neue Coins gescannt, ${state.stats.vetPassed} bestehen die harten Filter`);
  // Intel darf den Desk nur bremsen: Bei einer ernsten Meldung kauft er eine Weile nichts Neues.
  const caution = await intelWarning(now).catch(() => null);
  if (caution) {
    const until = new Date(caution.until).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const text = `Intel warnt: ${caution.text.replace(/[.!]?$/, "")}. Bis ${until} Uhr kaufe ich nichts Neues, Stop-Loss bleibt aktiv`;
    if (warnOnce(state, "Risk", text)) trace(null, "intel", "warn", text);
    return;
  }
  // Was auf dein Ja wartet, belegt schon einen Platz.
  const asked = openApprovals(state);
  if (state.positions.length + asked.length >= SAFETY.maxOpenPositions) return;
  const ticket = ticketSize(equity(state), state.cash);
  if (!ticket) return;

  const held = new Set([...state.positions, ...asked].map((p) => p.address));
  const fresh = candidates
    .filter((c) => c.passed && !held.has(c.address))
    .filter((c) => !(state.cooldown[c.address] && Date.parse(state.cooldown[c.address]) > now.getTime()))
    .filter((c) => !(state.seen[c.address] && now.getTime() - Date.parse(state.seen[c.address]) < SAFETY.recheckHours * HOUR))
    .slice(0, MAX_CRAWLS_PER_TICK);
  if (fresh.length === 0) return;

  const config = await readConfig();
  const xKey = grokKey(config);
  const xLeft = () => xBudget(config) - state.day.xSpentUsd;
  // Der Crawler liest zuerst, dann handelt der Desk: Ist das X-Budget für heute weg, prüft er nichts Neues.
  if (xKey && xLeft() < TYPICAL_COST_USD) {
    const text = `Das X-Budget von ${formatUsd(xBudget(config))} für heute ist aufgebraucht. Morgen liest Grok weiter, bis dahin kauft der Desk nichts Neues`;
    if (warnOnce(state, "Crawler", text)) trace(null, "x", "warn", text);
    return;
  }

  const survivors: ChiefInput[] = [];
  for (const c of fresh) {
    // Grok braucht pro Coin einige Sekunden; eine Pause oder der Not-Aus gilt sofort.
    if (state.status !== "laeuft") return;
    state.seen[c.address] = now.toISOString();
    trace(c, "chain", "laeuft", "liest die Blockchain bei RugCheck");
    let chainShown = false;
    try {
      const report = await crawl(c, (chain, url) => {
        chainShown = true;
        trace(c, "chain", "ok", chainText(chain));
        trace(c, "site", "laeuft", `liest die Projektseite ${hostOf(url)}`);
      });
      state.stats.reportsRead++;
      state.stats.pagesRead += report.pages;
      if (report.kill) {
        trace(c, report.stage === "skin_kill" ? "site" : "chain", "raus", report.kill);
        state.verdicts[c.address] = { at: now.toISOString(), stage: report.stage ?? "chain_kill", text: report.kill };
        state.stats.killed++;
        log(state, "Crawler", `$${c.symbol} aussortiert: ${report.kill}`, "kill");
        continue;
      }
      if (!chainShown) trace(c, "chain", "ok", chainText(report.chain));
      if (!report.site) trace(c, "site", "warn", "keine Webseite, nur Konten angegeben");
      else if ("title" in report.site) trace(c, "site", "ok", `Seite „${report.site.title || hostOf(report.site.url)}“ gelesen`);
      else trace(c, "site", "warn", `Seite: ${report.site.error}`);
      const site = report.site ? ("title" in report.site ? `Seite „${report.site.title || report.site.url}“ gelesen` : `Seite: ${report.site.error}`) : "keine Seite";
      log(state, "Crawler", `$${c.symbol}: Blockchain sauber, Top 10 halten ${report.chain.top10Pct?.toLocaleString("de-DE")} %, ${site}`);
      let x: XReport | null = null;
      if (xKey) {
        // Reicht das Budget nicht mehr, kommt der Coin morgen wieder dran.
        if (xLeft() < TYPICAL_COST_USD) {
          trace(c, "x", "warn", "X-Budget für heute aufgebraucht, morgen geht es weiter");
          delete state.seen[c.address];
          break;
        }
        trace(c, "x", "laeuft", "Grok liest die Beiträge auf X und das Projektkonto");
        x = await readXFor(state, xKey, c, now);
        if (!x) continue;
        if (x.rugWarnings) {
          const why = `Auf X warnen mehrere Konten vor $${c.symbol}`;
          trace(c, "x", "raus", why);
          state.verdicts[c.address] = { at: now.toISOString(), stage: "x_kill", text: x.summary || why };
          state.stats.killed++;
          log(state, "Crawler", `$${c.symbol} aussortiert: ${why}. ${x.summary}`, "kill");
          continue;
        }
        trace(c, "x", "ok", `${x.posts >= 0 ? `${x.posts} Beiträge` : "Beiträge"} gelesen, Stimmung ${x.mood}`);
      }
      survivors.push({ candidate: c, crawl: report, ticket, x });
    } catch (e) {
      trace(c, "chain", "warn", "RugCheck nicht erreichbar, also kein Kauf");
      state.verdicts[c.address] = { at: now.toISOString(), stage: "nicht_geprueft", text: "RugCheck nicht erreichbar, also kein Kauf" };
      log(state, "Crawler", `$${c.symbol} nicht geprüft (${e instanceof Error ? e.message : e}), also kein Kauf`, "warn");
    }
  }
  if (survivors.length === 0 || state.status !== "laeuft") return;

  const key = brainKey(config);
  const withClaude = Boolean(key && state.day.chiefCalls < MAX_CHIEF_CALLS_PER_DAY);
  for (const s of survivors) trace(s.candidate, "chief", "laeuft", withClaude ? "Chief fragt Claude nach den weichen Filtern" : "Chief prüft die weichen Filter mit Faustregeln");
  let verdicts: Verdict[];
  if (withClaude) {
    try {
      state.day.chiefCalls++;
      state.stats.chiefCalls++;
      verdicts = await judgeWithClaude(key!, survivors);
    } catch (e) {
      for (const s of survivors) trace(s.candidate, "chief", "warn", "Claude antwortet nicht, in dieser Runde kein Kauf");
      log(state, "Chief", `Claude antwortet nicht: ${explainBrainError(e)} Ich kaufe in dieser Runde nichts`, "warn");
      return;
    }
  } else {
    verdicts = judgeByRules(survivors);
  }
  for (const v of verdicts) {
    trace(v, "chief", v.buy ? "ok" : "raus", v.buy ? `ja: ${v.why}` : v.why);
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
    trace(v, "fills", "warn", why);
    state.verdicts[v.address] = { at: now.toISOString(), stage: "nicht_gekauft", text: why };
    log(state, "Fills", `$${v.symbol}: ${why}`, "warn");
  };
  const limit = approvalLimitOf(config.approval?.limitUsd);
  for (const v of picks) {
    // Der Not-Aus oder eine Pause kann jederzeit dazwischenkommen.
    if (state.status !== "laeuft" || state.positions.length + openApprovals(state).length >= SAFETY.maxOpenPositions) break;
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
    // Ab deiner Grenze kauft nicht der Desk, sondern du.
    if (needsApproval(size, limit)) {
      ask(state, live, size, v.why, now);
      continue;
    }
    state.verdicts[v.address] = { at: now.toISOString(), stage: "gekauft", text: v.why };
    buy(state, live, size, v.why, now);
    trace(live, "fills", "gekauft", `gekauft für ${formatUsd(size)}`);
  }
}

const NO_LIVE = "Keine Live-Daten von DexScreener. Mit Beispieldaten kaufe ich nichts";

// Grok liest X zu einem Coin. Kosten zählen auch, wenn etwas schiefgeht; dann wird nicht gekauft.
async function readXFor(state: State, apiKey: string, c: Candidate, now: Date): Promise<XReport | null> {
  try {
    const x = await readX(apiKey, c, now);
    state.day.xSpentUsd += x.costUsd;
    state.stats.xCostUsd += x.costUsd;
    state.stats.xReads++;
    state.stats.postsRead += Math.max(0, x.posts);
    log(state, "Crawler", xLine(c, x));
    return x;
  } catch (e) {
    const cost = e instanceof GrokError ? e.costUsd : 0;
    state.day.xSpentUsd += cost;
    state.stats.xCostUsd += cost;
    const why = e instanceof Error ? e.message : String(e);
    trace(c, "x", "warn", `X nicht gelesen: ${why}. Also kein Kauf`);
    state.verdicts[c.address] = { at: now.toISOString(), stage: "nicht_geprueft", text: `X nicht gelesen: ${why}` };
    log(state, "Crawler", `$${c.symbol}: X nicht gelesen (${why}), also kein Kauf`, "warn");
    return null;
  }
}

function xLine(c: Candidate, x: XReport): string {
  const posts = x.posts >= 0 ? `${x.posts} Beiträge${x.accounts >= 0 ? ` von ${x.accounts} Konten` : ""}` : "Beiträge";
  const bots = x.botShare >= 0 ? `, etwa ${Math.round(x.botShare * 100)} % wirken wie Bots` : "";
  const account = !x.account.found ? "kein Projektkonto gefunden" : `Konto @${x.account.handle}${x.account.fits >= 0 ? (x.account.fits >= 0.7 ? " passt" : " passt nicht sicher") : ""}`;
  return `$${c.symbol} auf X: ${posts} gelesen, Stimmung ${x.mood}${bots}, ${account}. ${x.summary} (${formatUsd(x.costUsd)})`.trim();
}

async function rollDay(state: State, now: Date) {
  const today = isoDate(now);
  if (state.day.date === today) return;
  const closed: DayRecord = { date: state.day.date, startEquity: state.day.startEquity, endEquity: equity(state), trades: state.day.trades };
  state.days.push(closed);
  await writeReport(state, closed.date, closed);
  state.day = { date: today, startEquity: equity(state), trades: 0, limitHit: false, chiefCalls: 0, xSpentUsd: 0 };
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
    expireApprovals(state, now);
    const before = state.day.trades;
    await watch(state, now);
    dailyLimit(state);
    if (state.status !== "laeuft") dropApprovals(state, NOT_BUYING[state.status], now);
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
      dropApprovals(state, NOT_BUYING.pausiert, now);
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
      dropApprovals(state, NOT_BUYING.notaus, now);
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
      dropApprovals(state, "der Handel wurde zurückgesetzt", now);
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
  const config = await readConfig();
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
    chief: brainKey(config) ? "claude" : "regeln",
    x: { enabled: Boolean(grokKey(config)), spentTodayUsd: state.day.xSpentUsd, budgetUsd: xBudget(config) },
    intelWarning: await intelWarning(now)
      .then((w) => (w ? { text: w.text, until: w.until } : null))
      .catch(() => null),
    approvals: [...openApprovals(state), ...state.approvals.filter((a) => a.state !== "offen").slice(0, 5)],
    approvalLimit: approvalLimitOf(config.approval?.limitUsd),
    approvalPhone: Boolean(config.telegram?.chatId),
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
    `- Crawler: ${state.stats.killed} Coins aussortiert, ${state.stats.rugsStopped} Rugs gestoppt, ${state.stats.postsRead} Beiträge auf X gelesen (seit dem Start)`,
    ...(state.stats.xReads ? [`- Grok auf X: ${formatUsd(state.stats.xCostUsd)} seit dem Start`] : []),
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
