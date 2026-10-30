import { randomInt } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { approvalButton, assetLabel, parseApprovalButton } from "../approval";
import type { BrainTurn } from "../brain";
import type { CalendarSnapshot } from "../calendar";
import { deskSentence, situation } from "../commands";
import { isoDate } from "../dates";
import { formatPct, formatUsd } from "../format";
import { marketSnapshot } from "../market";
import { getWeather } from "../weather";
import {
  briefingMessage,
  commandOf,
  COMMANDS,
  helpText,
  reminderMessage,
  REMINDER_MINUTES,
  splitMessage,
  TELEGRAM_DEFAULTS,
  type TelegramCommand,
  type TelegramPrefs,
  type TelegramStatus,
} from "../telegram";
import { brainKey, explainBrainError, HISTORY_TURNS, think } from "./brain";
import { readCalendar } from "./calendar";
import { CONFIG_DIR, readConfig, writeConfig, type JarvisConfig, type TelegramConfig } from "./config";
import { answerApproval, approvalStateOf, control, DeskError, deskSnapshot } from "./desk/engine";
import { intelSnapshot } from "./intel";
import { readMail } from "./mail";
import { onNotice, type Notice } from "./notify";
import { readTasks } from "./obsidian";

// JARVIS auf dem Handy: JARVIS fragt bei Telegram ständig nach neuen Nachrichten an deinen Bot („long
// polling“). Dafür muss niemand von außen an deinen Mac heran; er bleibt nur unter 127.0.0.1 erreichbar.
// Antworten bekommt nur der eine Chat, der sich mit dem Code aus den Einstellungen gekoppelt hat; alle
// anderen werden still übergangen. Was JARVIS schreibt, läuft über die Server von Telegram.
// Der Stand (welche Nachricht zuletzt gelesen, das Gespräch, gesendete Erinnerungen) liegt in ~/.jarvis/telegram.json.

const FILE = path.join(CONFIG_DIR, "telegram.json");
const api = () => process.env.TELEGRAM_API_URL ?? "https://api.telegram.org";

// Solange wartet eine Anfrage bei Telegram auf neue Nachrichten.
const POLL_S = Number(process.env.JARVIS_TELEGRAM_POLL_S) || 50;
const MINUTE = 60_000;
const CODE_MS = 15 * MINUTE;
const CODE_LENGTH = 8;
// Ohne 0/O und 1/I, damit man den Code auch abtippen kann.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// So oft darf sich ein fremder Chat beim Code vertippen, dann hört JARVIS ihm bis zum nächsten Code nicht mehr zu.
const MAX_TRIES = 5;
// Kommt eine Nachricht später an (der Mac hat geschlafen), führt JARVIS sie nicht mehr blind aus.
const STALE_MS = 30 * MINUTE;
// Nach so langer Stille beginnt ein neues Gespräch.
const IDLE_MS = 3 * 60 * MINUTE;
// Das Briefing kommt auch, wenn der Mac zur eingestellten Zeit kurz geschlafen hat, aber nicht mehr am Nachmittag.
const BRIEFING_WINDOW_MS = 3 * 60 * MINUTE;
const CALENDAR_EVERY_MS = 5 * MINUTE;

type TgChat = { id: number; type: string; first_name?: string };
type TgMessage = { message_id: number; date: number; chat: TgChat; from?: { first_name?: string }; text?: string; voice?: unknown; audio?: unknown };
// Ein Druck auf einen Knopf unter einer Nachricht des Bots.
type TgCallback = { id: string; from: { id: number }; message?: { message_id: number; chat: TgChat }; data?: string };
type TgUpdate = { update_id: number; message?: TgMessage; callback_query?: TgCallback };

// asks: welche Telegram-Nachricht zu welcher Rückfrage gehört, damit JARVIS dort später das Ergebnis
// einträgt und die Knöpfe entfernt.
type Ask = { id: string; messageId: number; text: string };
type State = { offset: number; history: BrainTurn[]; lastAt: string | null; reminded: string[]; briefedOn: string | null; asks: Ask[] };

type Shared = {
  running: boolean;
  state: State | null;
  loading: Promise<State> | null;
  saving: Promise<void>;
  abort: AbortController | null;
  wake: (() => void) | null;
  timer: ReturnType<typeof setInterval> | null;
  pair: { code: string; until: number; tries: Map<number, number> } | null;
  error: string | null;
  // Gespräche mit Claude laufen nacheinander, damit die Antworten in der richtigen Reihenfolge kommen.
  queue: Promise<void>;
  calendar: { at: number; snap: CalendarSnapshot } | null;
};
const holder = globalThis as typeof globalThis & { __jarvisTelegram?: Shared };
const shared: Shared = (holder.__jarvisTelegram ??= {
  running: false,
  state: null,
  loading: null,
  saving: Promise.resolve(),
  abort: null,
  wake: null,
  timer: null,
  pair: null,
  error: null,
  queue: Promise.resolve(),
  calendar: null,
});

const freshState = (): State => ({ offset: 0, history: [], lastAt: null, reminded: [], briefedOn: null, asks: [] });

async function load(): Promise<State> {
  if (shared.state) return shared.state;
  shared.loading ??= fs
    .readFile(FILE, "utf8")
    .then((raw) => ({ ...freshState(), ...(JSON.parse(raw) as Partial<State>) }))
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
    .catch((e) => console.error("Telegram-Stand nicht gespeichert:", e));
  return shared.saving;
}

// ---------- Telegram ----------

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly code?: number,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

// Der Schlüssel steckt in der Adresse; er landet deshalb nie in einer Fehlermeldung oder im Protokoll.
async function call<T>(token: string, method: string, body: object = {}, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${api()}/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: signal ?? AbortSignal.timeout(20_000),
    });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new TelegramError("Ich erreiche Telegram gerade nicht. Ist der Mac mit dem Internet verbunden?");
  }
  const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string; error_code?: number; parameters?: { retry_after?: number } } | null;
  if (!data?.ok) throw new TelegramError(data?.description ?? `Telegram antwortet mit ${res.status}.`, data?.error_code ?? res.status, data?.parameters?.retry_after);
  return data.result as T;
}

export function explainTelegramError(e: unknown): string {
  if (e instanceof TelegramError) {
    if (e.code === 401 || e.code === 404) return "Telegram kennt diesen Schlüssel nicht. Beim Abtippen verrutscht leicht ein Zeichen (O und 0, l und 1). Am besten am iPhone im Chat mit dem BotFather einmal kurz auf den Schlüssel tippen und ihn hier einfügen.";
    if (e.code === 409) return "Ein anderes Programm liest diesen Bot schon mit, vielleicht ein zweites JARVIS. Schließ es, dann geht es hier weiter.";
    if (e.code === 403) return "Du hast den Bot in Telegram blockiert. Öffne den Chat mit ihm und tippe auf „Neu starten“.";
    if (e.code === 429) return "Telegram bremst gerade. Gleich geht es weiter.";
    return e.code ? `Telegram meldet: ${e.message}` : e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

// Prüft einen Schlüssel und liefert den Namen des Bots.
export async function testTelegramToken(token: string): Promise<{ ok: true; bot: string } | { ok: false; error: string }> {
  try {
    const me = await call<{ username?: string; is_bot?: boolean }>(token, "getMe");
    if (!me.is_bot || !me.username) return { ok: false, error: "Das ist kein Bot-Schlüssel. Er kommt aus dem Chat mit dem BotFather." };
    return { ok: true, bot: me.username };
  } catch (e) {
    return { ok: false, error: explainTelegramError(e) };
  }
}

async function send(token: string, chatId: number, text: string): Promise<void> {
  for (const part of splitMessage(text)) {
    const body = { chat_id: chatId, text: part, link_preview_options: { is_disabled: true } };
    try {
      await call(token, "sendMessage", body);
    } catch (e) {
      if (!(e instanceof TelegramError) || e.code !== 429) throw e;
      await new Promise((r) => setTimeout(r, Math.min(30, e.retryAfter ?? 3) * 1000));
      await call(token, "sendMessage", body);
    }
  }
}

// Eine Rückfrage mit Ja/Nein-Knöpfen darunter.
async function sendQuestion(token: string, chatId: number, id: string, text: string): Promise<number> {
  const msg = await call<{ message_id: number }>(token, "sendMessage", {
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: [[{ text: "✅ Ja, kaufen", callback_data: approvalButton(id, true) }, { text: "✖️ Nein", callback_data: approvalButton(id, false) }]] },
  });
  return msg.message_id;
}

// ---------- Koppeln ----------

function newCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  shared.pair = { code, until: Date.now() + CODE_MS, tries: new Map() };
  return code;
}

const codeValid = () => Boolean(shared.pair && Date.now() < shared.pair.until);

// Was die Einstellungen anzeigen. Ist noch kein Handy gekoppelt, liegt immer ein gültiger Code bereit.
export function telegramStatus(config: JarvisConfig): TelegramStatus {
  const tg = config.telegram;
  if (tg?.token && !tg.chatId && !codeValid()) newCode();
  return {
    configured: Boolean(tg?.token),
    bot: tg?.bot ?? null,
    hint: tg?.token ? `…${tg.token.slice(-4)}` : null,
    paired: Boolean(tg?.chatId),
    chatName: tg?.chatName ?? null,
    code: tg?.token && !tg.chatId && shared.pair ? shared.pair.code : null,
    codeUntil: tg?.token && !tg.chatId && shared.pair ? new Date(shared.pair.until).toISOString() : null,
    error: tg?.token ? shared.error : null,
    prefs: prefsOf(tg),
  };
}

export const prefsOf = (tg?: TelegramConfig): TelegramPrefs => ({
  trades: tg?.trades ?? TELEGRAM_DEFAULTS.trades,
  warnings: tg?.warnings ?? TELEGRAM_DEFAULTS.warnings,
  reminders: tg?.reminders ?? TELEGRAM_DEFAULTS.reminders,
  briefing: tg?.briefing === undefined ? TELEGRAM_DEFAULTS.briefing : tg.briefing,
});

// Nach dem Speichern eines neuen Schlüssels: von vorn, mit frischem Code.
export async function resetTelegram(): Promise<void> {
  const state = await load();
  Object.assign(state, freshState());
  await save(state);
  shared.error = null;
  newCode();
  wakeTelegram();
}

export function renewCode() {
  newCode();
}

async function pairChat(token: string, msg: TgMessage) {
  const config = await readConfig();
  if (!config.telegram || config.telegram.token !== token) return;
  config.telegram = { ...config.telegram, chatId: msg.chat.id, chatName: msg.from?.first_name ?? msg.chat.first_name ?? undefined };
  await writeConfig(config);
  shared.pair = null;
  await call(token, "setMyCommands", { commands: COMMANDS }).catch(() => {});
  await send(token, msg.chat.id, `Verbunden. ${helpText(config.name, Boolean(brainKey(config)))}`);
}

// Trennt das Handy. Danach braucht es einen neuen Code.
export async function unpairTelegram(): Promise<void> {
  const config = await readConfig();
  const tg = config.telegram;
  if (!tg) return;
  if (tg.chatId) await send(tg.token, tg.chatId, "JARVIS ist jetzt von diesem Chat getrennt. Neu koppeln kannst du am Mac unter Einstellungen → Handy.").catch(() => {});
  config.telegram = { token: tg.token, bot: tg.bot, trades: tg.trades, warnings: tg.warnings, reminders: tg.reminders, briefing: tg.briefing };
  await writeConfig(config);
  const state = await load();
  state.history = [];
  await save(state);
  newCode();
}

export async function sendTest(): Promise<void> {
  const config = await readConfig();
  const tg = config.telegram;
  if (!tg?.chatId) throw new TelegramError("Es ist noch kein Handy gekoppelt.");
  await send(tg.token, tg.chatId, `Test von JARVIS: Hallo ${config.name}, die Verbindung steht.`);
}

// ---------- Nachrichten an JARVIS ----------

async function handle(token: string, msg: TgMessage) {
  if (msg.chat.type !== "private") return;
  const config = await readConfig();
  const tg = config.telegram;
  if (!tg || tg.token !== token) return;

  if (msg.chat.id !== tg.chatId) {
    // Nur zum Koppeln hört JARVIS auf einen fremden Chat, und nur solange ein Code gilt.
    if (tg.chatId || !codeValid() || !msg.text) return;
    const pair = shared.pair!;
    const tries = pair.tries.get(msg.chat.id) ?? 0;
    if (tries >= MAX_TRIES) return;
    const code = msg.text.trim().replace(/^\/start\b/i, "").replace(/[\s-]/g, "").toUpperCase();
    if (code === pair.code) return pairChat(token, msg);
    pair.tries.set(msg.chat.id, tries + 1);
    const hint = code ? "Der Code stimmt nicht." : "Schick mir bitte den Code.";
    await send(token, msg.chat.id, `${hint} Du findest ihn am Mac in JARVIS unter Einstellungen → Handy.`).catch(() => {});
    return;
  }

  const sent = msg.date * 1000;
  const text = msg.text?.trim();
  if (!text) {
    const what = msg.voice || msg.audio ? "Sprachnachrichten kann ich noch nicht hören. Tipp auf der Tastatur aufs Mikrofon, dann schreibt das Handy für dich." : "Damit kann ich noch nichts anfangen. Schreib mir einfach.";
    return send(token, tg.chatId, what);
  }
  const command = commandOf(text);
  if (Date.now() - sent > STALE_MS) {
    const at = new Date(sent).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    const late = `Deine Nachricht von ${at} Uhr kam erst jetzt bei mir an, wahrscheinlich hat der Mac geschlafen.`;
    // Anhalten ist auch verspätet die vorsichtige Richtung; alles andere führt JARVIS nicht blind aus.
    if (command === "pause" || command === "notaus") return send(token, tg.chatId, `${late} ${await runCommand(command, config)}`);
    return send(token, tg.chatId, `${late} („${text.slice(0, 60)}${text.length > 60 ? "…" : ""}“) Wenn sie noch gilt, schick sie bitte noch einmal.`);
  }

  if (command) return send(token, tg.chatId, await runCommand(command, config));
  // Fragen an Claude laufen im Hintergrund, damit „Stopp“ nicht hinter einer langen Antwort warten muss.
  shared.queue = shared.queue.then(() => converse(token, tg.chatId!, text, config)).catch((e) => console.error("Telegram:", e));
}

// Ja oder Nein auf eine Rückfrage. Zählt nur aus deinem gekoppelten Chat; alle anderen bekommen keine Antwort.
async function handleButton(token: string, q: TgCallback) {
  const config = await readConfig();
  const tg = config.telegram;
  if (!tg?.chatId || tg.token !== token) return;
  const answer = (text?: string) => call(token, "answerCallbackQuery", { callback_query_id: q.id, ...(text ? { text } : {}) }).catch(() => {});
  if (q.from.id !== tg.chatId || q.message?.chat.id !== tg.chatId) return;
  const button = parseApprovalButton(q.data);
  if (!button) return answer();
  let text: string;
  try {
    text = await answerApproval(button.id, button.yes, "telegram");
  } catch (e) {
    text = e instanceof DeskError ? e.message : `Das hat nicht geklappt. ${explainTelegramError(e)}`;
    // Ist die Frage schon erledigt, verschwinden wenigstens die Knöpfe.
    if (q.message && (await approvalStateOf(button.id)) !== "offen") {
      const state = await load();
      state.asks = state.asks.filter((a) => a.id !== button.id);
      await save(state);
      await call(token, "editMessageReplyMarkup", { chat_id: tg.chatId, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
    }
  }
  await answer(text.slice(0, 190));
}

async function runCommand(command: TelegramCommand, config: JarvisConfig): Promise<string> {
  try {
    switch (command) {
      case "briefing":
        return await briefing(config, new Date());
      case "handel":
        return deskStatus(await deskSnapshot());
      case "pause":
      case "weiter":
      case "notaus":
        return await control({ action: command });
      case "hilfe":
        return helpText(config.name, Boolean(brainKey(config)));
    }
  } catch (e) {
    return e instanceof DeskError ? e.message : `Das hat nicht geklappt. ${explainTelegramError(e)}`;
  }
}

function deskStatus(desk: Awaited<ReturnType<typeof deskSnapshot>>): string {
  if (desk.status === "aus") return "Der Spielgeld-Handel ist noch nicht gestartet. Starten kannst du ihn am Mac auf dem Trading-Desk oder hier mit „Starte den Handel“.";
  const lines = [deskSentence(desk)];
  for (const a of desk.approvals.filter((x) => x.state === "offen")) {
    const until = new Date(a.until).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    lines.push(`🟡 Wartet auf dein Ja: ${assetLabel(a)} für ${formatUsd(a.usd)}, bis ${until} Uhr. Die Knöpfe stehen unter meiner Frage.`);
  }
  for (const p of desk.positions.slice(0, 8)) {
    const value = p.qty * p.lastPrice;
    lines.push(`• $${p.symbol}: ${formatUsd(p.costUsd)} → ${formatUsd(value)} (${formatPct(((value - p.costUsd) / p.costUsd) * 100)})`);
  }
  for (const p of desk.commodities.positions) {
    const value = p.qty * p.lastPrice;
    lines.push(`• ${p.name}: ${formatUsd(p.costUsd)} → ${formatUsd(value)} (${formatPct(((value - p.costUsd) / p.costUsd) * 100)})`);
  }
  return lines.join("\n");
}

async function converse(token: string, chatId: number, text: string, config: JarvisConfig) {
  const apiKey = brainKey(config);
  if (!apiKey) return send(token, chatId, helpText(config.name, false));
  const state = await load();
  if (state.lastAt && Date.now() - Date.parse(state.lastAt) > IDLE_MS) state.history = [];

  // „schreibt …“ oben im Chat, solange Claude nachdenkt. Telegram zeigt das etwa fünf Sekunden lang.
  const typing = () => void call(token, "sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => {});
  typing();
  const keep = setInterval(typing, 4_500);
  let reply: string;
  try {
    const now = new Date();
    const [weather, market] = await Promise.all([getWeather().catch(() => null), marketSnapshot().catch(() => null)]);
    const answer = await think(config, apiKey, {
      text,
      history: state.history,
      view: "telegram",
      focus: null,
      extra: situation({ name: config.name, now, market, weather, tasks: null, mail: null, desk: null, session: null }),
      channel: "telegram",
    });
    reply = answer.reply;
    if (answer.sources?.length) reply += `\n\nQuellen:\n${answer.sources.map((s) => `• ${s.title}: ${s.url}`).join("\n")}`;
    state.history = [...state.history, { who: "du" as const, text }, { who: "jarvis" as const, text: answer.reply }].slice(-HISTORY_TURNS);
    state.lastAt = new Date().toISOString();
    await save(state);
  } catch (e) {
    reply = `Das hat nicht geklappt. ${explainBrainError(e)}`;
  } finally {
    clearInterval(keep);
  }
  await send(token, chatId, reply);
}

// ---------- Von selbst: Meldungen, Briefing, Erinnerungen ----------

async function briefing(config: JarvisConfig, now: Date): Promise<string> {
  const [weather, calendar, mail, tasks, intel, desk] = await Promise.all([
    getWeather().catch(() => null),
    readCalendar().catch(() => null),
    config.mail ? readMail(config.mail).catch(() => null) : null,
    config.vaultPath ? readTasks(config.vaultPath).catch(() => null) : null,
    intelSnapshot(now).catch(() => null),
    deskSnapshot(now).catch(() => null),
  ]);
  return briefingMessage({ name: config.name, now, weather, calendar, mail, tasks, intel, desk });
}

// Rückfragen kommen immer, auch wenn Meldungen zu Trades abgeschaltet sind: Ohne dein Ja kauft der Desk nicht.
async function deliverQuestion(tg: TelegramConfig & { chatId: number }, notice: Extract<Notice, { kind: "rueckfrage" | "rueckfrage_ende" }>) {
  const state = await load();
  if (notice.kind === "rueckfrage") {
    const messageId = await sendQuestion(tg.token, tg.chatId, notice.id, notice.text);
    state.asks = [...state.asks, { id: notice.id, messageId, text: notice.text }].slice(-30);
    await save(state);
    return;
  }
  const ask = state.asks.find((a) => a.id === notice.id);
  if (!ask) return;
  state.asks = state.asks.filter((a) => a !== ask);
  await save(state);
  // Ergebnis unter die Frage, Knöpfe weg.
  await call(tg.token, "editMessageText", {
    chat_id: tg.chatId,
    message_id: ask.messageId,
    text: `${ask.text}\n\n${notice.text}`,
    link_preview_options: { is_disabled: true },
    reply_markup: { inline_keyboard: [] },
  });
}

async function deliver(notice: Notice) {
  const config = await readConfig();
  const tg = config.telegram;
  if (!tg?.chatId) return;
  if (notice.kind === "rueckfrage" || notice.kind === "rueckfrage_ende") {
    return deliverQuestion({ ...tg, chatId: tg.chatId }, notice).catch((e) => {
      if (e instanceof TelegramError && e.code === 403) shared.error = explainTelegramError(e);
      console.error("Telegram-Rückfrage:", explainTelegramError(e));
    });
  }
  const prefs = prefsOf(tg);
  if (notice.kind === "trade" && !prefs.trades) return;
  if (notice.kind === "warnung" && !prefs.warnings) return;
  await send(tg.token, tg.chatId, notice.text).catch((e) => {
    // Hat er den Bot blockiert, steht das in den Einstellungen.
    if (e instanceof TelegramError && e.code === 403) shared.error = explainTelegramError(e);
    console.error("Telegram-Meldung:", explainTelegramError(e));
  });
}

// Einmal pro Minute: Ist es Zeit fürs Briefing, beginnt bald ein Termin?
export async function telegramMinute(now = new Date()) {
  const config = await readConfig();
  const tg = config.telegram;
  if (!tg?.chatId) return;
  const prefs = prefsOf(tg);
  const state = await load();
  const today = isoDate(now);
  let changed = false;

  if (prefs.briefing && state.briefedOn !== today) {
    const [h, m] = prefs.briefing.split(":").map(Number);
    const due = new Date(now);
    due.setHours(h, m, 0, 0);
    const late = now.getTime() - due.getTime();
    if (late >= 0 && late < BRIEFING_WINDOW_MS) {
      state.briefedOn = today;
      await save(state);
      await send(tg.token, tg.chatId, await briefing(config, now)).catch((e) => console.error("Telegram-Briefing:", explainTelegramError(e)));
    }
  }

  if (prefs.reminders) {
    if (!shared.calendar || now.getTime() - shared.calendar.at >= CALENDAR_EVERY_MS) {
      const snap = await readCalendar().catch(() => null);
      if (snap) shared.calendar = { at: now.getTime(), snap };
    }
    const cal = shared.calendar?.snap;
    if (cal?.access === "ok") {
      const soon = cal.events.filter((e) => !e.allDay && e.start > now.getTime() && e.start - now.getTime() <= REMINDER_MINUTES * MINUTE);
      for (const e of soon) {
        const key = `${e.id}@${e.start}`;
        if (state.reminded.includes(key)) continue;
        state.reminded = [...state.reminded, key].slice(-100);
        changed = true;
        await send(tg.token, tg.chatId, reminderMessage(e, now.getTime())).catch((err) => console.error("Telegram-Erinnerung:", explainTelegramError(err)));
      }
    }
  }
  if (changed) await save(state);
}

// ---------- Die Schleife ----------

export function wakeTelegram() {
  shared.abort?.abort();
  shared.wake?.();
}

const rest = (ms: number) =>
  new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      shared.wake = null;
      resolve();
    };
    const timer = setTimeout(done, ms);
    shared.wake = done;
  });

async function poll() {
  let backoff = 5_000;
  while (shared.running) {
    const config = await readConfig();
    const token = config.telegram?.token;
    if (!token) {
      shared.error = null;
      await rest(30_000);
      continue;
    }
    const state = await load();
    const abort = (shared.abort = new AbortController());
    try {
      const updates = await call<TgUpdate[]>(token, "getUpdates", { offset: state.offset, timeout: POLL_S, allowed_updates: ["message", "callback_query"] }, AbortSignal.any([abort.signal, AbortSignal.timeout((POLL_S + 20) * 1000)]));
      shared.error = null;
      backoff = 5_000;
      for (const update of updates) {
        state.offset = update.update_id + 1;
        await save(state);
        if (update.message) await handle(token, update.message).catch((e) => console.error("Telegram:", explainTelegramError(e)));
        if (update.callback_query) await handleButton(token, update.callback_query).catch((e) => console.error("Telegram:", explainTelegramError(e)));
      }
    } catch (e) {
      if (abort.signal.aborted) continue;
      shared.error = explainTelegramError(e);
      // Ein Webhook (von einem anderen Programm gesetzt) blockiert das Abholen; den nimmt JARVIS weg.
      if (e instanceof TelegramError && e.code === 409) await call(token, "deleteWebhook").catch(() => {});
      const unauthorized = e instanceof TelegramError && (e.code === 401 || e.code === 404);
      await rest(unauthorized ? 10 * MINUTE : backoff);
      backoff = Math.min(backoff * 2, 5 * MINUTE);
    } finally {
      if (shared.abort === abort) shared.abort = null;
    }
  }
}

export function startTelegram() {
  if (shared.running) return;
  shared.running = true;
  onNotice((n) => void deliver(n));
  shared.timer = setInterval(() => void telegramMinute().catch((e) => console.error("Telegram:", e)), MINUTE);
  void poll();
}
