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

// Nur auf diesem Mac selbst (etwa eine lokale Mail-Brücke) darf die Verbindung offen bleiben: Dort gibt es
// kein Netz, auf dem jemand mitlesen könnte.
const AUF_DIESEM_MAC = /^(127\.0\.0\.1|localhost|::1)$/i;

// Das Passwort geht nie unverschlüsselt über das Netz: Port 993 ist von Anfang an verschlüsselt, auf jedem
// anderen Port muss der Server STARTTLS anbieten. Tut er das nicht, bricht JARVIS vor der Anmeldung ab,
// statt wie die Bibliothek von sich aus im Klartext weiterzumachen.
export function imapOptionen(config: MailConfig) {
  const secure = config.port === 993;
  return {
    host: config.host,
    port: config.port,
    secure,
    ...(!secure && !AUF_DIESEM_MAC.test(config.host.trim()) ? { doSTARTTLS: true as const } : {}),
    auth: { user: config.user, pass: config.password },
    logger: false as const,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    disableAutoIdle: true,
  };
}

const client = (config: MailConfig) => new ImapFlow(imapOptionen(config));

// Fehlermeldungen von IMAP in Sätze, mit denen man etwas anfangen kann.
export function explainMailError(e: unknown): string {
  const err = e as { authenticationFailed?: boolean; tlsFailed?: boolean; code?: string; message?: string; responseText?: string };
  if (err?.tlsFailed) return "Die Verschlüsselung zum Mail-Server kam nicht zustande. JARVIS schickt dein Passwort nie unverschlüsselt und hat sich deshalb nicht angemeldet. Prüfe Server und Port (üblich ist 993).";
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
  const vorher = cache;
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
    // Der gemerkte Stand von vorhin gilt nicht mehr: Sonst zeigte die nächste gewöhnliche Abfrage (eine andere
    // Seite, das Briefing) noch eine Minute lang Mails, obwohl JARVIS schon weiß, dass das Postfach nicht antwortet.
    // Ist inzwischen ein neuerer Abruf gelungen, bleibt dessen Stand stehen.
    if (cache === vorher && cache?.key === key) cache = null;
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

// Die Mail mit dieser Nummer liegt nicht (mehr) im Posteingang.
export class MailFehlt extends Error {
  constructor() {
    super("Die Mail gibt es nicht mehr.");
  }
}

// Nur Absender und Betreff einer Mail, ohne ihren Text zu laden (für Antwortentwürfe).
export async function readAbsender(config: MailConfig, uid: number): Promise<Pick<MailItem, "from" | "fromAddress" | "subject">> {
  return withInbox(config, async (c) => {
    const msg = await c.fetchOne(String(uid), { uid: true, envelope: true }, { uid: true });
    if (!msg || !msg.envelope) throw new MailFehlt();
    const { from, fromAddress, subject } = toItem(msg);
    return { from, fromAddress, subject };
  });
}

// Holt eine Mail mit PEEK: Sie gilt danach nicht als gelesen. ganz: ihr ganzer Text. empfaenger: an wen sie
// außer dir ging (An und Kopie), so wie das Postfach die Adressen nennt.
async function liesMail(config: MailConfig, uid: number): Promise<{ kopf: Omit<MailMessage, "text">; ganz: string; empfaenger: string[] }> {
  return withInbox(config, async (c) => {
    const msg = await c.fetchOne(String(uid), { uid: true, envelope: true, source: { maxLength: 512_000 } }, { uid: true });
    if (!msg || !msg.source) throw new MailFehlt();
    const parsed = await simpleParser(msg.source);
    const item = toItem(msg);
    const empfaenger = [...(msg.envelope?.to ?? []), ...(msg.envelope?.cc ?? [])].map((a) => a.address ?? "").filter(Boolean);
    return { kopf: { uid, from: item.from, fromAddress: item.fromAddress, subject: item.subject, date: item.date }, ganz: parsed.text ?? "", empfaenger };
  });
}

// Für das Gespräch und die Ansicht Post: der Text ohne Zitate und Signatur, und ohne die übrigen Empfänger.
export async function readMessage(config: MailConfig, uid: number): Promise<MailMessage> {
  const { kopf, ganz } = await liesMail(config, uid);
  return { ...kopf, text: trimBody(ganz) };
}

// Für Zitat und „Allen antworten“ an einem Antwortentwurf: der ganze Text und die übrigen Empfänger.
export async function readAntwortMail(config: MailConfig, uid: number): Promise<MailMessage & { empfaenger: string[] }> {
  const { kopf, ganz, empfaenger } = await liesMail(config, uid);
  return { ...kopf, text: ganz, empfaenger };
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
