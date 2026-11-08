import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { AuditEintrag, AuditPruefung } from "../../sicherheit";
import { CONFIG_DIR } from "../config";

// Das Audit-Log: jede sicherheitsrelevante Entscheidung als eine Zeile in ~/.jarvis/audit.jsonl. Es wird
// nur angehängt, nie umgeschrieben. Jede Zeile trägt die Prüfsumme der vorigen; ändert oder löscht jemand
// eine Zeile in der Mitte, passt die Kette nicht mehr und die Prüfung meldet es.
// Grenze: Wer Zugriff auf den Mac hat, kann die Datei ab einer Stelle ganz neu schreiben. Dagegen hilft erst
// eine Ablage, die sich nicht ändern lässt (Phase 3, Azure). Geheimnisse und Inhalte von Mails stehen nie
// im Log, nur Metadaten, gekürzt.

const datei = () => path.join(CONFIG_DIR, "audit.jsonl");
const NULL_HASH = "0".repeat(64);
const MAX_TEXT = 300;

type Shared = { letzter: { nr: number; hash: string } | null; schreiben: Promise<unknown> };
const holder = globalThis as typeof globalThis & { __jarvisAudit?: Shared };
const shared: Shared = (holder.__jarvisAudit ??= { letzter: null, schreiben: Promise.resolve() });

// Schlüssel, deren Werte nie ins Log gehören.
const GEHEIM_SCHLUESSEL = /(key|token|passw|secret|geheim|iban|kartennummer|cvc|cvv|^pin$|^tan$|cookie|authorization)/i;
// Werte, die nach einem Schlüssel aussehen, auch wenn sie unter einem harmlosen Namen stehen.
const GEHEIM_WERT = [/sk-ant-[A-Za-z0-9_-]{8,}/g, /\b\d{5,12}:[A-Za-z0-9_-]{30,60}\b/g, /\bxai-[A-Za-z0-9]{16,}\b/g, /\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}\b/g];

export function schwaerzen(wert: unknown, tiefe = 0): unknown {
  if (tiefe > 4) return "…";
  if (typeof wert === "string") {
    let s = wert;
    for (const muster of GEHEIM_WERT) s = s.replace(muster, "***");
    return s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}…` : s;
  }
  if (typeof wert === "number" || typeof wert === "boolean" || wert === null || wert === undefined) return wert;
  if (Array.isArray(wert)) return wert.slice(0, 20).map((w) => schwaerzen(w, tiefe + 1));
  if (typeof wert === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(wert as Record<string, unknown>).slice(0, 30)) out[k] = GEHEIM_SCHLUESSEL.test(k) ? "***" : schwaerzen(v, tiefe + 1);
    return out;
  }
  return String(wert).slice(0, MAX_TEXT);
}

const hashVon = (e: Omit<AuditEintrag, "hash">) => createHash("sha256").update(JSON.stringify(e)).digest("hex");

async function zeilen(): Promise<string[]> {
  try {
    return (await fs.readFile(datei(), "utf8")).split("\n").filter((l) => l.trim());
  } catch {
    return [];
  }
}

async function letzter(): Promise<{ nr: number; hash: string }> {
  if (shared.letzter) return shared.letzter;
  const alle = await zeilen();
  const zuletzt = alle.at(-1);
  try {
    const e = zuletzt ? (JSON.parse(zuletzt) as AuditEintrag) : null;
    shared.letzter = e ? { nr: e.nr, hash: e.hash } : { nr: 0, hash: NULL_HASH };
  } catch {
    // Eine kaputte letzte Zeile bleibt stehen; die Prüfung meldet sie. Neue Zeilen hängen sich an sie an.
    shared.letzter = { nr: alle.length, hash: createHash("sha256").update(zuletzt ?? "").digest("hex") };
  }
  return shared.letzter;
}

export type AuditNeu = Omit<AuditEintrag, "nr" | "zeit" | "vorher" | "hash">;

// Hängt eine Zeile an. Schreibvorgänge laufen nacheinander, damit die Kette nie verzweigt.
export function protokolliere(neu: AuditNeu, jetzt = new Date()): Promise<AuditEintrag> {
  const arbeit = shared.schreiben.then(async () => {
    const vor = await letzter();
    const roh: Omit<AuditEintrag, "hash"> = {
      nr: vor.nr + 1,
      zeit: jetzt.toISOString(),
      art: neu.art,
      agent: neu.agent,
      kanal: neu.kanal,
      was: String(schwaerzen(neu.was)),
      ...(neu.klasse ? { klasse: neu.klasse } : {}),
      ergebnis: neu.ergebnis,
      ...(neu.grund ? { grund: String(schwaerzen(neu.grund)) } : {}),
      ...(neu.daten ? { daten: schwaerzen(neu.daten) as Record<string, unknown> } : {}),
      vorher: vor.hash,
    };
    const eintrag: AuditEintrag = { ...roh, hash: hashVon(roh) };
    await fs.mkdir(path.dirname(datei()), { recursive: true, mode: 0o700 });
    await fs.appendFile(datei(), `${JSON.stringify(eintrag)}\n`, { mode: 0o600 });
    shared.letzter = { nr: eintrag.nr, hash: eintrag.hash };
    return eintrag;
  });
  shared.schreiben = arbeit.catch((e) => console.error("Audit-Log nicht geschrieben:", e));
  return arbeit;
}

// Wartet, bis alle angefangenen Zeilen geschrieben sind (für Tests und vor dem Lesen).
export const auditFertig = () => shared.schreiben.then(() => undefined);

// Die letzten Einträge, neueste zuerst.
export async function leseAudit(anzahl = 50): Promise<AuditEintrag[]> {
  await auditFertig();
  const out: AuditEintrag[] = [];
  for (const z of (await zeilen()).slice(-anzahl).reverse()) {
    try {
      out.push(JSON.parse(z) as AuditEintrag);
    } catch {
      // kaputte Zeile: zeigt die Prüfung an
    }
  }
  return out;
}

// Prüft die ganze Kette: Nummern lückenlos, jede Prüfsumme stimmt, jede Zeile zeigt auf die vorige.
export async function pruefeAudit(): Promise<AuditPruefung> {
  await auditFertig();
  const alle = await zeilen();
  let vorher = NULL_HASH;
  for (let i = 0; i < alle.length; i++) {
    let e: AuditEintrag;
    try {
      e = JSON.parse(alle[i]) as AuditEintrag;
    } catch {
      return { ok: false, eintraege: alle.length, fehler: `Zeile ${i + 1} ist beschädigt.` };
    }
    const { hash, ...rest } = e;
    if (e.nr !== i + 1) return { ok: false, eintraege: alle.length, fehler: `Eintrag ${i + 1} fehlt oder steht an falscher Stelle.` };
    if (e.vorher !== vorher) return { ok: false, eintraege: alle.length, fehler: `Die Kette ist bei Eintrag ${e.nr} unterbrochen.` };
    if (hashVon(rest) !== hash) return { ok: false, eintraege: alle.length, fehler: `Eintrag ${e.nr} wurde nachträglich verändert.` };
    vorher = hash;
  }
  return { ok: true, eintraege: alle.length, fehler: null };
}

// Nur für Tests: vergisst den Zwischenspeicher, damit eine von Hand veränderte Datei neu gelesen wird.
export function vergissAuditCache() {
  shared.letzter = null;
}
