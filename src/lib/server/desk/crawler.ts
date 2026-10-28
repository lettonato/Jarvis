import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { HARD_FILTERS } from "../../thresholds";
import type { Candidate } from "../../market";

// Der Crawler liest zuerst, dann handelt der Desk. Er holt für jeden Coin, der die harten Filter
// bestanden hat, die Blockchain-Daten von RugCheck und liest die Webseite des Projekts. Was faul ist,
// fliegt raus, bevor der Chief überhaupt gefragt wird. Nach dem Kauf bewacht er die Coins weiter.
// Kann er etwas nicht prüfen, gilt der Coin als nicht geprüft und wird nicht gekauft.

const RUGCHECK = process.env.RUGCHECK_URL ?? "https://api.rugcheck.xyz";
const TIMEOUT_MS = 8000;
const SITE_BYTES = 300_000;
const SITE_TEXT = 1500;

// So liefert RugCheck den Bericht unter /v1/tokens/{mint}/report (geprüft an echten Antworten).
type RugReport = {
  mintAuthority?: string | null;
  freezeAuthority?: string | null;
  creator?: string | null;
  topHolders?: { address?: string; owner?: string; pct?: number; insider?: boolean }[] | null;
  risks?: { name?: string; value?: string; description?: string; level?: string }[] | null;
  score_normalised?: number;
  rugged?: boolean;
  markets?: { pubkey?: string; liquidityAAccount?: string; liquidityBAccount?: string; lp?: { lpLockedPct?: number } }[] | null;
};

export type ChainCheck = {
  kill: string | null;
  // Anteile in Prozent, ohne die Konten der Handelspools.
  topHolderPct: number | null;
  top10Pct: number | null;
  insiders: number;
  devPct: number | null;
  lpLockedPct: number | null;
  warnings: string[];
  riskScore: number | null;
};

export type SiteRead = { url: string; title: string; text: string; error?: undefined } | { url: string; error: string };

export type CrawlReport = {
  chain: ChainCheck;
  site: SiteRead | null;
  socials: { type: string; url: string }[];
  kill: string | null;
  stage: "chain_kill" | "skin_kill" | null;
  pages: number;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function checkChain(address: string): Promise<ChainCheck> {
  const res = await fetch(`${RUGCHECK}/v1/tokens/${encodeURIComponent(address)}/report`, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`RugCheck antwortet mit ${res.status}`);
  const report = (await res.json()) as RugReport;
  if (!report || typeof report !== "object" || !Array.isArray(report.topHolders)) throw new Error("RugCheck liefert keinen lesbaren Bericht");

  // Die größten „Halter“ sind oft die Pools, über die gehandelt wird. Die zählen nicht als Wal.
  const pools = new Set((report.markets ?? []).flatMap((m) => [m.pubkey, m.liquidityAAccount, m.liquidityBAccount]).filter(Boolean));
  const holders = report.topHolders.filter((h) => !pools.has(h.address) && !pools.has(h.owner) && typeof h.pct === "number");
  const pcts = holders.map((h) => h.pct!).sort((a, b) => b - a);
  const topHolderPct = pcts.length ? round1(pcts[0]) : 0;
  const top10Pct = round1(pcts.slice(0, 10).reduce((s, p) => s + p, 0));
  const insiders = holders.filter((h) => h.insider).length;
  const devPct = report.creator ? round1(holders.filter((h) => h.owner === report.creator || h.address === report.creator).reduce((s, h) => s + h.pct!, 0)) : null;
  const locked = (report.markets ?? []).map((m) => m.lp?.lpLockedPct).filter((n): n is number => typeof n === "number");
  const risks = report.risks ?? [];
  const danger = risks.filter((r) => r.level === "danger").map((r) => r.name ?? "unbekanntes Risiko");

  let kill: string | null = null;
  if (report.rugged) kill = "RugCheck meldet: bereits ausgeraubt (rugged)";
  else if (report.mintAuthority) kill = "Der Entwickler kann noch neue Coins erzeugen (Mint Authority)";
  else if (report.freezeAuthority) kill = "Der Entwickler kann Konten einfrieren (Freeze Authority)";
  else if (danger.length) kill = `RugCheck warnt: ${danger.join(", ")}`;
  else if (topHolderPct > HARD_FILTERS.maxTopWallet * 100) kill = `Eine Wallet hält ${topHolderPct.toLocaleString("de-DE")} % (max_top_wallet ${HARD_FILTERS.maxTopWallet * 100} %)`;
  else if (top10Pct > HARD_FILTERS.maxTop10 * 100) kill = `Die 10 größten Wallets halten ${top10Pct.toLocaleString("de-DE")} % (max_top_10 ${HARD_FILTERS.maxTop10 * 100} %)`;

  return {
    kill,
    topHolderPct,
    top10Pct,
    insiders,
    devPct,
    lpLockedPct: locked.length ? round1(Math.max(...locked)) : null,
    warnings: risks.filter((r) => r.level === "warn").map((r) => r.name ?? "").filter(Boolean),
    riskScore: typeof report.score_normalised === "number" ? report.score_normalised : null,
  };
}

// Nur echte Webseiten: kein localhost, keine IP-Adressen, nichts aus dem Heimnetz.
function publicHttps(raw: string): URL | null {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !host.includes(".")) return null;
    if (/^[\d.]+$/.test(host) || host.includes(":") || host.startsWith("[")) return null;
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".localhost") || host.endsWith(".internal")) return null;
    return url;
  } catch {
    return null;
  }
}

// Der Name allein reicht nicht: Auch ein öffentlicher Name kann auf ein Gerät im Heimnetz zeigen.
function privateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return privateAddress(v6.slice(7));
    return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b < 128) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b < 32) || (a === 192 && b === 168) || a >= 224;
}

// Wirft, wenn der Name gar nicht aufgelöst werden kann; dann ist die Seite nicht erreichbar.
async function pointsHome(url: URL): Promise<boolean> {
  const addresses = await lookup(url.hostname, { all: true });
  return addresses.some((a) => privateAddress(a.address));
}

const decode = (s: string) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export async function readSite(raw: string): Promise<SiteRead> {
  let url = publicHttps(raw);
  if (!url) return { url: raw, error: "keine sichere https-Adresse" };
  try {
    // Weiterleitungen einzeln folgen und jede Adresse prüfen, damit keine ins Heimnetz zeigt.
    for (let hop = 0; hop < 4; hop++) {
      if (await pointsHome(url)) return { url: url.toString(), error: "Adresse zeigt ins Heimnetz, die lese ich nicht" };
      const res = await fetch(url, {
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (JARVIS Crawler)" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        const next = publicHttps(new URL(res.headers.get("location")!, url).toString());
        await res.body?.cancel();
        if (!next) return { url: raw, error: "leitet auf eine unsichere Adresse weiter" };
        url = next;
        continue;
      }
      if (!res.ok) {
        await res.body?.cancel();
        return { url: url.toString(), error: `Seite antwortet mit ${res.status}` };
      }
      const html = await readLimited(res);
      const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
      const text = decode(
        html
          .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
          .replace(/<[^>]+>/g, " "),
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, SITE_TEXT);
      return { url: url.toString(), title, text };
    }
    return { url: raw, error: "zu viele Weiterleitungen" };
  } catch (e) {
    return { url: url.toString(), error: e instanceof Error && e.name === "TimeoutError" ? "Seite antwortet nicht" : "Seite nicht erreichbar" };
  }
}

async function readLimited(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < SITE_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.length;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, SITE_BYTES));
}

// Die beiden Crawler-Stufen aus filter.py: chain_kill (Blockchain), dann skin_kill (Projekt lesen).
// onSite meldet, dass die Blockchain bestanden ist und jetzt die Seite gelesen wird, für die Spinne.
export async function crawl(c: Candidate, onSite?: (chain: ChainCheck, url: string) => void): Promise<CrawlReport> {
  const chain = await checkChain(c.address);
  if (chain.kill) return { chain, site: null, socials: c.socials, kill: chain.kill, stage: "chain_kill", pages: 1 };
  if (c.websites.length === 0 && c.socials.length === 0) {
    return { chain, site: null, socials: [], kill: "Keine Webseite und keine Konten: da steht kein Projekt dahinter", stage: "skin_kill", pages: 1 };
  }
  if (c.websites.length) onSite?.(chain, c.websites[0]);
  const site = c.websites.length ? await readSite(c.websites[0]) : null;
  // Gezählt wird, was wirklich gelesen wurde: der RugCheck-Bericht und die Seite, wenn sie antwortet.
  return { chain, site, socials: c.socials, kill: null, stage: null, pages: site && !site.error ? 2 : 1 };
}

// Für gekaufte Coins: Taucht ein neues Rug-Zeichen auf, muss Risk sofort verkaufen.
export async function guard(address: string): Promise<string | null> {
  const chain = await checkChain(address);
  if (!chain.kill) return null;
  // Halter-Anteile schwanken nach dem Kauf; raus geht es nur bei echten Rug-Zeichen.
  return chain.kill.startsWith("Eine Wallet") || chain.kill.startsWith("Die 10 größten") ? null : chain.kill;
}
