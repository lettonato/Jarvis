// Dokumente: Sagst du „Erstell mir ein Dokument über …“, recherchiert der Analyst von JARVIS im Hintergrund
// im Web und schreibt daraus ein PDF mit Tabellen, Grafiken und Quellen. Es landet im Ordner Dokumente/JARVIS
// auf dem Mac und, wenn dein Handy gekoppelt ist, auch in Telegram. Hier stehen die Form eines Dokuments,
// die Prüfung dessen, was Claude abgibt, und die Sätze für JARVIS; die Arbeit macht src/lib/server/documents.ts.

// Feste Grenzen pro Dokument, damit eine Recherche nicht ausufert.
export const DOC_LIMITS = {
  searches: 24,
  fetches: 10,
  // Ab diesen Kosten bei Anthropic hört der Analyst auf zu suchen und schreibt mit dem, was er hat.
  maxUsd: 10,
  minutes: 30,
} as const;

// Was der Analyst abgibt. Felder, die ein Abschnitt nicht braucht, sind leer.
export type DocValue = { name: string; wert: number; prognose: boolean };
export type DocStage = { name: string; beschreibung: string; firmen: string[] };
export type DocChart = {
  // balken: Größen vergleichen (sortiert), saeulen: Entwicklung über Jahre, kette: Stufen einer Wertschöpfungskette.
  art: "keine" | "balken" | "saeulen" | "kette";
  titel: string;
  einheit: string;
  quelle: string;
  werte: DocValue[];
  stufen: DocStage[];
};
export type DocTable = { titel: string; spalten: string[]; zeilen: string[][] };
export type DocSection = { ueberschrift: string; absaetze: string[]; punkte: string[]; tabelle: DocTable; grafik: DocChart };
export type DocSource = { titel: string; url: string };
export type Dokument = { titel: string; untertitel: string; kernaussagen: string[]; abschnitte: DocSection[]; quellen: DocSource[] };

export type DocStep = { at: string; text: string };
export type DocState = "laeuft" | "fertig" | "fehler" | "abgebrochen";

export type DocJob = {
  id: string;
  thema: string;
  auftrag: string;
  from: "mac" | "telegram";
  state: DocState;
  // Was der Analyst gerade tut, für die Anzeige.
  phase: "plant" | "recherchiert" | "schreibt" | "setzt" | null;
  startedAt: string;
  endedAt: string | null;
  steps: DocStep[];
  searches: number;
  pagesRead: number;
  costUsd: number;
  title: string | null;
  // Die Kernaussagen des fertigen Dokuments, für die Liste und die Nachricht aufs Handy.
  points: string[];
  sections: number;
  sources: number;
  // Wo die Dateien auf dem Mac liegen. Ohne Chrome gibt es nur die Webseite.
  pdf: string | null;
  html: string | null;
  // true, wenn macOS den Ordner Dokumente nicht freigegeben hat und die Dateien in ~/.jarvis/dokumente liegen.
  fallback?: boolean;
  note: string | null;
  error: string | null;
};

export type DocsSnapshot = {
  // Ohne Claude-Schlüssel schreibt JARVIS keine Dokumente.
  configured: boolean;
  folder: string;
  running: DocJob | null;
  jobs: DocJob[];
};

export const PHASE_LABEL: Record<NonNullable<DocJob["phase"]>, string> = {
  plant: "plant die Recherche",
  recherchiert: "recherchiert im Web",
  schreibt: "schreibt das Dokument",
  setzt: "setzt das PDF",
};

// Kurz, für die Fortschrittsleiste.
export const PHASE_SHORT: Record<NonNullable<DocJob["phase"]>, string> = { plant: "Planen", recherchiert: "Recherche", schreibt: "Schreiben", setzt: "PDF" };

// ---------- Prüfen, was Claude abgibt ----------

const MAX = {
  title: 160,
  subtitle: 300,
  points: 10,
  point: 600,
  sections: 30,
  heading: 160,
  paragraphs: 24,
  paragraph: 4000,
  bullets: 40,
  bullet: 600,
  columns: 8,
  rows: 120,
  cell: 400,
  values: 16,
  stages: 10,
  firms: 40,
  sources: 120,
} as const;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
// Absätze dürfen Zeilenumbrüche behalten, nur keine Steuerzeichen.
const para = (v: unknown, max: number) =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
        .replace(/[ \t]+/g, " ")
        .trim()
        .slice(0, max)
    : "";
const strings = (v: unknown, maxItems: number, max: number, keep = para) => (Array.isArray(v) ? v.map((x) => keep(x, max)).filter(Boolean).slice(0, maxItems) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

export const NO_CHART: DocChart = { art: "keine", titel: "", einheit: "", quelle: "", werte: [], stufen: [] };
const NO_TABLE: DocTable = { titel: "", spalten: [], zeilen: [] };

// Nur Links ins Web, nichts, was auf dem Mac etwas öffnet oder ausführt.
export function safeUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  try {
    const u = new URL(v.trim());
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function checkChart(raw: unknown, where: string, problems: string[]): DocChart {
  const g = obj(raw);
  const art = g.art;
  if (art === undefined || art === "keine" || art === null) return NO_CHART;
  if (art !== "balken" && art !== "saeulen" && art !== "kette") {
    problems.push(`${where}: grafik.art muss "keine", "balken", "saeulen" oder "kette" sein.`);
    return NO_CHART;
  }
  const chart: DocChart = { art, titel: str(g.titel, MAX.heading), einheit: str(g.einheit, 40), quelle: str(g.quelle, 300), werte: [], stufen: [] };
  if (!chart.titel) problems.push(`${where}: Die Grafik braucht einen Titel.`);
  if (art === "kette") {
    chart.stufen = (Array.isArray(g.stufen) ? g.stufen : []).slice(0, MAX.stages).map((s) => {
      const o = obj(s);
      return { name: str(o.name, 80), beschreibung: str(o.beschreibung, 400), firmen: strings(o.firmen, MAX.firms, 80, str) };
    });
    chart.stufen = chart.stufen.filter((s) => s.name);
    if (chart.stufen.length < 2) problems.push(`${where}: Eine Kette braucht mindestens zwei Stufen mit Namen.`);
    return chart;
  }
  const values = Array.isArray(g.werte) ? g.werte : [];
  if (values.length > MAX.values) problems.push(`${where}: Höchstens ${MAX.values} Werte pro Grafik; fasse kleine als „Andere“ zusammen.`);
  for (const v of values.slice(0, MAX.values)) {
    const o = obj(v);
    const name = str(o.name, 60);
    const wert = typeof o.wert === "number" ? o.wert : Number.NaN;
    if (!name || !Number.isFinite(wert) || wert < 0) {
      problems.push(`${where}: Jeder Wert braucht einen Namen und eine Zahl ab 0 (bei „${name || "?"}“ nicht der Fall). Negative Werte wie Rückgänge gehören in eine Tabelle.`);
      continue;
    }
    chart.werte.push({ name, wert, prognose: o.prognose === true });
  }
  if (chart.werte.length < 2) problems.push(`${where}: Eine Grafik braucht mindestens zwei Werte.`);
  if (!chart.einheit) problems.push(`${where}: Die Grafik braucht eine Einheit, etwa „Mrd. $“ oder „%“.`);
  return chart;
}

function checkTable(raw: unknown, where: string, problems: string[]): DocTable {
  const t = obj(raw);
  const columns = strings(t.spalten, MAX.columns, 80, str);
  const rows = Array.isArray(t.zeilen) ? t.zeilen : [];
  if (!columns.length) return rows.length ? (problems.push(`${where}: Die Tabelle hat Zeilen, aber keine Spalten.`), NO_TABLE) : NO_TABLE;
  if (rows.length > MAX.rows) problems.push(`${where}: Höchstens ${MAX.rows} Zeilen pro Tabelle; teile sie auf.`);
  // Fehlende Zellen bleiben leer, überzählige fallen weg.
  const zeilen = rows
    .slice(0, MAX.rows)
    .map((r) => (Array.isArray(r) ? r : []).map((c) => (typeof c === "number" ? String(c) : str(c, MAX.cell))))
    .filter((r) => r.some(Boolean))
    .map((r) => columns.map((_, i) => r[i] ?? ""));
  if (!zeilen.length) problems.push(`${where}: Die Tabelle hat keine Zeilen.`);
  return { titel: str(t.titel, MAX.heading), spalten: columns, zeilen };
}

// Macht aus der Eingabe des Werkzeugs ein sauberes Dokument oder sagt, was fehlt. Alles, was später in die
// Seite kommt, ist reiner Text; Links nur ins Web.
export function checkDocument(input: unknown): { ok: true; doc: Dokument } | { ok: false; problems: string[] } {
  const d = obj(input);
  const problems: string[] = [];
  const titel = str(d.titel, MAX.title);
  if (!titel) problems.push("Das Dokument braucht einen Titel.");
  const kernaussagen = strings(d.kernaussagen, MAX.points, MAX.point);
  if (!kernaussagen.length) problems.push("Es fehlen die Kernaussagen (drei bis sieben Sätze).");
  const rawSections = Array.isArray(d.abschnitte) ? d.abschnitte : [];
  if (rawSections.length > MAX.sections) problems.push(`Höchstens ${MAX.sections} Abschnitte.`);
  const abschnitte: DocSection[] = rawSections.slice(0, MAX.sections).map((s, i) => {
    const o = obj(s);
    const ueberschrift = str(o.ueberschrift, MAX.heading);
    const where = `Abschnitt ${i + 1}${ueberschrift ? ` („${ueberschrift}“)` : ""}`;
    if (!ueberschrift) problems.push(`${where}: Die Überschrift fehlt.`);
    const section: DocSection = {
      ueberschrift,
      absaetze: strings(o.absaetze, MAX.paragraphs, MAX.paragraph),
      punkte: strings(o.punkte, MAX.bullets, MAX.bullet),
      tabelle: checkTable(o.tabelle, where, problems),
      grafik: checkChart(o.grafik, where, problems),
    };
    if (!section.absaetze.length && !section.punkte.length && !section.tabelle.spalten.length && section.grafik.art === "keine") problems.push(`${where}: Der Abschnitt ist leer.`);
    return section;
  });
  if (!abschnitte.length) problems.push("Das Dokument braucht mindestens einen Abschnitt.");
  const quellen: DocSource[] = [];
  for (const q of (Array.isArray(d.quellen) ? d.quellen : []).slice(0, MAX.sources)) {
    const o = obj(q);
    const url = safeUrl(o.url);
    if (!url) {
      problems.push(`Die Quelle „${str(o.titel, 80) || "?"}“ hat keinen gültigen Link (http oder https).`);
      continue;
    }
    quellen.push({ titel: str(o.titel, 300) || hostLabel(url), url });
  }
  if (problems.length) return { ok: false, problems: problems.slice(0, 20) };
  return { ok: true, doc: { titel, untertitel: str(d.untertitel, MAX.subtitle), kernaussagen, abschnitte, quellen } };
}

export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Ein Dateiname, den der Finder mag: ohne Schrägstriche und Doppelpunkte, nicht zu lang.
export function fileStem(title: string, date: string): string {
  const clean = title
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 80)
    .trim();
  return `${date} ${clean || "Dokument"}`;
}

// ---------- Sätze ----------

const usd = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
const minutesBetween = (from: string, to: string) => Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60_000));

// Was JARVIS sagt, wenn ein Dokument fertig ist (oder nicht).
export function docDoneSentence(job: DocJob, onMac: boolean): string {
  const title = job.title ?? job.thema;
  if (job.state === "abgebrochen") return `Das Dokument „${title}“ habe ich abgebrochen.`;
  if (job.state === "fehler") return `Das Dokument „${title}“ ist leider nicht fertig geworden. ${job.error ?? ""}`.trim();
  const folder = job.fallback ? "im Ordner .jarvis in deinem Benutzerordner, weil macOS den Ordner Dokumente nicht freigegeben hat" : "in deinem Ordner Dokumente unter JARVIS";
  const where = job.pdf ? (onMac ? `Ich habe das PDF geöffnet; es liegt ${folder}.` : "Hier ist das PDF.") : `Es liegt als Webseite ${folder}.`;
  const minutes = job.endedAt ? minutesBetween(job.startedAt, job.endedAt) : 0;
  const dollars = job.costUsd.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const took = job.endedAt ? ` Gebraucht habe ich ${minutes === 1 ? "eine Minute" : `${minutes} Minuten`} und ${dollars} Dollar bei Anthropic.` : "";
  return `Dein Dokument „${title}“ ist fertig: ${job.sections} Abschnitte mit ${job.sources} Quellen. ${where}${took}`;
}

// Die Zeile für Claude im Gespräch: was gerade entsteht und welche Dokumente zuletzt fertig wurden.
export function docContextLine(snap: DocsSnapshot, now: Date): string | null {
  const parts: string[] = [];
  if (snap.running) {
    const r = snap.running;
    const minutes = Math.max(0, Math.round((now.getTime() - Date.parse(r.startedAt)) / 60_000));
    parts.push(`Der Analyst ${r.phase ? PHASE_LABEL[r.phase] : "arbeitet"} zu „${r.thema}“, seit ${minutes} Minuten, ${r.searches} Suchen, ${r.pagesRead} Seiten gelesen`);
  }
  const done = snap.jobs.filter((j) => j.state === "fertig").slice(0, 3);
  const at = (j: DocJob) => new Date(j.endedAt ?? j.startedAt).toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  if (done.length) parts.push(`fertig im Ordner Dokumente/JARVIS: ${done.map((j) => `[${j.id}] „${j.title ?? j.thema}“ vom ${at(j)}`).join(", ")}`);
  const last = snap.jobs[0];
  if (last && !snap.running && last.state !== "fertig") parts.push(`zuletzt „${last.thema}“ am ${at(last)} nicht fertig geworden (${last.state === "abgebrochen" ? "abgebrochen" : (last.error ?? "Fehler")})`);
  return parts.length ? `Dokumente: ${parts.join("; ")}` : null;
}

// Kernaussagen ohne Quellennummern und Sternchen, für Listen und das Handy.
export const plainPoint = (text: string) =>
  text
    .replace(/\s*\[\d+(?:\s*[,–-]\s*\d+)*\]/g, "")
    .replace(/\*\*/g, "")
    .trim();

// Die Nachricht aufs Handy, unter dem PDF.
export function docCaption(job: DocJob): string {
  const lines = [`📄 ${job.title ?? job.thema}`];
  for (const point of job.points.slice(0, 3)) {
    const p = plainPoint(point);
    lines.push(`• ${p.length > 220 ? `${p.slice(0, 217)}…` : p}`);
  }
  lines.push(`${job.sections} Abschnitte, ${job.sources} Quellen · ${usd(job.costUsd)}`);
  return lines.join("\n");
}
