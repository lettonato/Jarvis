import { ImapFlow, type FetchMessageObject } from "imapflow";
import { simpleParser } from "mailparser";
import type { MailConfig } from "./config";
import type { MailItem, MailMessage, MailSnapshot } from "../mail";

// Liest das Postfach über IMAP. JARVIS öffnet die Verbindung nur kurz, liest die Kopfzeilen
// und schließt sie wieder. Mails werden dabei nicht als gelesen markiert.

const DAYS = 14;
const LIMIT = 40;
const CACHE_MS = 60_000;

let cache: { key: string; at: number; data: MailSnapshot } | null = null;

const BULK_SENDER = /(^|[.+_-])(no-?reply|do-?not-?reply|newsletter|news|marketing|mailer-daemon|notifications?|benachrichtigung|info-?mail)([.+_-]|@)/i;

function client(config: MailConfig) {
  return new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.port === 993,
    auth: { user: config.user, pass: config.password },
    logger: false,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    disableAutoIdle: true,
  });
}

// Fehlermeldungen von IMAP in Sätze, mit denen man etwas anfangen kann.
export function explainMailError(e: unknown): string {
  const err = e as { authenticationFailed?: boolean; code?: string; message?: string; responseText?: string };
  if (err?.authenticationFailed) return "Anmeldung abgelehnt. Prüfe Adresse und Passwort (bei der Telekom das E-Mail-Passwort, bei Gmail und iCloud das App-Passwort).";
  if (err?.code === "ENOTFOUND") return "Den Mail-Server gibt es unter diesem Namen nicht. Prüfe den IMAP-Server.";
  if (err?.code === "ECONNREFUSED" || err?.code === "ETIMEDOUT" || err?.code === "CONNECT_TIMEOUT" || err?.code === "GREETING_TIMEOUT")
    return "Der Mail-Server antwortet nicht. Ist das Internet da?";
  return `Das Postfach meldet: ${err?.responseText ?? err?.message ?? String(e)}`;
}

function headerValue(headers: Buffer | undefined, name: string): string | undefined {
  const m = headers?.toString("utf8").match(new RegExp(`^${name}:\\s*(.*)$`, "im"));
  return m?.[1]?.trim();
}

function toItem(msg: FetchMessageObject): MailItem {
  const env = msg.envelope ?? {};
  const sender = env.from?.[0] ?? {};
  const address = sender.address ?? "";
  const flags = msg.flags ?? new Set<string>();
  const unread = !flags.has("\\Seen");
  const flagged = flags.has("\\Flagged");
  const precedence = headerValue(msg.headers, "precedence")?.toLowerCase();
  const auto = headerValue(msg.headers, "auto-submitted")?.toLowerCase();
  const bulk =
    Boolean(headerValue(msg.headers, "list-unsubscribe") || headerValue(msg.headers, "list-id")) ||
    precedence === "bulk" || precedence === "list" || precedence === "junk" ||
    (auto !== undefined && auto !== "no") ||
    BULK_SENDER.test(address);
  const date = env.date ?? msg.internalDate ?? new Date();
  return {
    uid: msg.uid,
    from: sender.name || address || "Unbekannt",
    fromAddress: address,
    subject: env.subject || "(ohne Betreff)",
    date: new Date(date).toISOString(),
    unread,
    flagged,
    important: flagged || (unread && !bulk),
    bulk,
    messageId: env.messageId,
  };
}

async function withInbox<T>(config: MailConfig, work: (c: ImapFlow) => Promise<T>): Promise<T> {
  const c = client(config);
  c.on("error", () => {});
  await c.connect();
  try {
    const lock = await c.getMailboxLock("INBOX");
    try {
      return await work(c);
    } finally {
      lock.release();
    }
  } finally {
    await c.logout().catch(() => c.close());
  }
}

export async function readMail(config: MailConfig | undefined, { force = false } = {}): Promise<MailSnapshot> {
  const fetchedAt = new Date().toISOString();
  const empty = { fetchedAt, unread: 0, importantUnread: 0, bulkUnread: 0, items: [] };
  if (!config) return { configured: false, ...empty };
  const key = `${config.user}@${config.host}`;
  if (!force && cache && cache.key === key && Date.now() - cache.at < CACHE_MS) return cache.data;
  try {
    const data = await withInbox(config, async (c) => {
      const status = await c.status("INBOX", { unseen: true });
      const since = new Date(Date.now() - DAYS * 86_400_000);
      const found = await c.search({ since, or: [{ seen: false }, { flagged: true }] }, { uid: true });
      const uids = (found || []).sort((a, b) => b - a).slice(0, LIMIT);
      const items: MailItem[] = [];
      if (uids.length) {
        const query = { uid: true, envelope: true, flags: true, internalDate: true, headers: ["list-unsubscribe", "list-id", "precedence", "auto-submitted"] };
        for await (const msg of c.fetch(uids, query, { uid: true })) items.push(toItem(msg));
      }
      items.sort((a, b) => (a.date < b.date ? 1 : -1));
      const unreadItems = items.filter((m) => m.unread);
      return {
        configured: true,
        account: config.user,
        fetchedAt,
        unread: status ? (status.unseen ?? unreadItems.length) : unreadItems.length,
        importantUnread: unreadItems.filter((m) => m.important).length,
        bulkUnread: unreadItems.filter((m) => m.bulk).length,
        items,
      } satisfies MailSnapshot;
    });
    cache = { key, at: Date.now(), data };
    return data;
  } catch (e) {
    return { configured: true, account: config.user, ...empty, error: explainMailError(e) };
  }
}

// Zitierte Antworten und Signaturen weglassen, damit JARVIS nur die eigentliche Nachricht vorliest.
function trimBody(text: string): string {
  const lines: string[] = [];
  for (const line of text.replace(/\r/g, "").split("\n")) {
    if (/^\s*>/.test(line)) continue;
    if (/^(Am .+ schrieb .+:|On .+ wrote:|-----\s*(Original|Ursprüngliche)|Von: .+|From: .+)$/i.test(line.trim())) break;
    if (line.trim() === "--" || line.trim() === "-- ") break;
    lines.push(line);
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, 2500);
}

export async function readMessage(config: MailConfig, uid: number): Promise<MailMessage> {
  return withInbox(config, async (c) => {
    const msg = await c.fetchOne(String(uid), { uid: true, envelope: true, source: { maxLength: 512_000 } }, { uid: true });
    if (!msg || !msg.source) throw new Error("Die Mail gibt es nicht mehr.");
    const parsed = await simpleParser(msg.source);
    const item = toItem(msg);
    return { uid, from: item.from, subject: item.subject, date: item.date, text: trimBody(parsed.text ?? "") };
  });
}

export async function markSeen(config: MailConfig, uid: number): Promise<void> {
  await withInbox(config, async (c) => {
    await c.messageFlagsAdd([uid], ["\\Seen"], { uid: true });
  });
  cache = null;
}

export async function testMail(config: MailConfig): Promise<{ ok: true; unread: number } | { ok: false; error: string }> {
  try {
    const unread = await withInbox(config, async (c) => {
      const status = await c.status("INBOX", { unseen: true });
      return status ? (status.unseen ?? 0) : 0;
    });
    cache = null;
    return { ok: true, unread };
  } catch (e) {
    return { ok: false, error: explainMailError(e) };
  }
}
