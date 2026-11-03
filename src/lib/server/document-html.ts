import type { DocChart, DocSection, DocTable, Dokument } from "../documents";
import { hostLabel, safeUrl } from "../documents";

// Setzt ein Dokument des Analysten als Seite zum Drucken: A4, hell, ruhig, wie ein Bericht einer Bank.
// Aus derselben Seite macht Chrome das PDF. Alles, was von Claude kommt, wird hier zu reinem Text; Links
// gehen nur ins Web, Skripte gibt es keine. Grafiken sind eingebettetes SVG und brauchen nichts aus dem Netz.

// Farben nach dem geprüften Standard für Diagramme: eine Reihe in Blau, Prognosen in einer helleren Stufe
// desselben Blaus, Text immer in Schriftfarben, nie in der Farbe der Daten.
const C = {
  ink: "#0b0b0b",
  ink2: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  base: "#c3c2b7",
  surface: "#ffffff",
  plane: "#f6f5f1",
  series: "#2a78d6",
  forecast: "#86b6ef",
  accentSoft: "#cde2fb",
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Fließtext: Fettes mit **…**, Quellenverweise [1] oder [2, 5] als hochgestellte Links ins Quellenverzeichnis.
function inline(text: string, sources: number): string {
  let html = esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*\*/g, "");
  html = html.replace(/\[(\d{1,3}(?:\s*[,–-]\s*\d{1,3})*)\]/g, (whole, list: string) => {
    const parts = list.split(/\s*,\s*/).map((p) => p.trim());
    const links = parts.map((p) => {
      const range = p.split(/\s*[–-]\s*/).map(Number);
      const ok = range.every((n) => n >= 1 && n <= sources);
      if (!ok) return esc(p);
      return range.length === 2 ? `<a href="#q-${range[0]}">${range[0]}</a>–<a href="#q-${range[1]}">${range[1]}</a>` : `<a href="#q-${range[0]}">${range[0]}</a>`;
    });
    return links.every((l) => l.startsWith("<a")) ? `<sup class="cite">[${links.join(", ")}]</sup>` : whole;
  });
  return html;
}

// Zahlen wie in einer deutschen Zeitung: 1.234, 12,5 oder 0,75.
export function formatValue(n: number): string {
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return n.toLocaleString("de-DE", { maximumFractionDigits: digits });
}
const withUnit = (n: number, unit: string) => (unit ? `${formatValue(n)} ${unit}` : formatValue(n));

// Eine runde Achse: 0 bis zu einem schönen Höchstwert in vier bis sechs Schritten.
export function niceTicks(max: number): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 1000; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}

// Grob, wie breit ein Text in der Systemschrift wird, damit nichts über den Rand läuft.
const textWidth = (s: string, size: number) => s.length * size * 0.56;
const fit = (s: string, width: number, size: number) => {
  if (textWidth(s, size) <= width) return s;
  const keep = Math.max(1, Math.floor(width / (size * 0.56)) - 1);
  return `${s.slice(0, keep).trimEnd()}…`;
};

// Balken mit runder Spitze und gerader Kante an der Grundlinie.
function hBar(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h / 2);
  return `M${x} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x}Z`;
}
function vBar(x: number, base: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h / 2);
  const top = base - h;
  return `M${x} ${base}V${top + r}A${r} ${r} 0 0 1 ${x + r} ${top}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${top + r}V${base}Z`;
}

const legend = (y: number) =>
  `<g font-size="10.5" fill="${C.ink2}"><rect x="0" y="${y}" width="10" height="10" rx="2" fill="${C.series}"/><text x="15" y="${y + 9}">Ist-Wert</text>` +
  `<rect x="78" y="${y}" width="10" height="10" rx="2" fill="${C.forecast}"/><text x="93" y="${y + 9}">Prognose</text></g>`;

const svgOpen = (w: number, h: number, label: string) =>
  `<svg class="chart" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system, system-ui, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif">`;

// Größen vergleichen: waagerechte Balken, der größte oben, Wert an der Spitze.
export function barChart(chart: DocChart): string {
  const values = [...chart.werte].sort((a, b) => b.wert - a.wert);
  const W = 640;
  const labelW = 196;
  const valueW = 96;
  const plotW = W - labelW - valueW;
  const rowH = 26;
  const barH = 16;
  const forecast = values.some((v) => v.prognose);
  const H = values.length * rowH + 6 + (forecast ? 26 : 0);
  const max = Math.max(...values.map((v) => v.wert), 0) || 1;
  const rows = values
    .map((v, i) => {
      const y = 3 + i * rowH + (rowH - barH) / 2;
      const w = v.wert > 0 ? Math.max(2, (v.wert / max) * plotW) : 0;
      const tip = `${v.name}: ${withUnit(v.wert, chart.einheit)}${v.prognose ? " (Prognose)" : ""}`;
      return (
        `<g><title>${esc(tip)}</title>` +
        `<text x="${labelW - 10}" y="${y + barH / 2 + 4}" text-anchor="end" font-size="11" fill="${C.ink2}">${esc(fit(v.name, labelW - 14, 11))}</text>` +
        (w ? `<path d="${hBar(labelW, y, w, barH)}" fill="${v.prognose ? C.forecast : C.series}"/>` : "") +
        `<text x="${labelW + w + 6}" y="${y + barH / 2 + 4}" font-size="11" fill="${C.ink}" style="font-variant-numeric: tabular-nums">${esc(withUnit(v.wert, chart.einheit))}</text>` +
        `</g>`
      );
    })
    .join("");
  const axis = `<line x1="${labelW}" y1="0" x2="${labelW}" y2="${values.length * rowH + 6}" stroke="${C.base}" stroke-width="1"/>`;
  return `${svgOpen(W, H, chart.titel)}${rows}${axis}${forecast ? legend(values.length * rowH + 14) : ""}</svg>`;
}

// Entwicklung über die Zeit: Säulen in der gegebenen Reihenfolge, Werte am ersten, letzten und höchsten Punkt.
export function columnChart(chart: DocChart): string {
  const values = chart.werte;
  const W = 640;
  const left = 58;
  const right = 8;
  const top = 18;
  const plotH = 200;
  const base = top + plotH;
  const forecast = values.some((v) => v.prognose);
  const H = base + 26 + (forecast ? 24 : 0);
  const ticks = niceTicks(Math.max(...values.map((v) => v.wert), 0));
  const topValue = ticks.at(-1) || 1;
  const y = (v: number) => base - (v / topValue) * plotH;
  const slot = (W - left - right) / values.length;
  const colW = Math.min(24, slot * 0.6);
  const peak = values.reduce((best, v, i) => (v.wert > values[best].wert ? i : best), 0);
  const labelled = new Set([0, values.length - 1, peak]);
  const grid = ticks
    .map(
      (t) =>
        `<line x1="${left}" y1="${y(t)}" x2="${W - right}" y2="${y(t)}" stroke="${t === 0 ? C.base : C.grid}" stroke-width="1"/>` +
        `<text x="${left - 8}" y="${y(t) + 3.5}" text-anchor="end" font-size="10" fill="${C.muted}" style="font-variant-numeric: tabular-nums">${esc(formatValue(t))}</text>`,
    )
    .join("");
  const cols = values
    .map((v, i) => {
      const cx = left + slot * i + slot / 2;
      const h = v.wert > 0 ? Math.max(2, base - y(v.wert)) : 0;
      const tip = `${v.name}: ${withUnit(v.wert, chart.einheit)}${v.prognose ? " (Prognose)" : ""}`;
      return (
        `<g><title>${esc(tip)}</title>` +
        (h ? `<path d="${vBar(cx - colW / 2, base, colW, h)}" fill="${v.prognose ? C.forecast : C.series}"/>` : "") +
        (labelled.has(i) ? `<text x="${cx}" y="${base - h - 6}" text-anchor="middle" font-size="10.5" fill="${C.ink}" style="font-variant-numeric: tabular-nums">${esc(formatValue(v.wert))}</text>` : "") +
        `<text x="${cx}" y="${base + 16}" text-anchor="middle" font-size="10.5" fill="${C.ink2}">${esc(fit(v.name, slot - 4, 10.5))}</text>` +
        `</g>`
      );
    })
    .join("");
  const unit = `<text x="${left - 8}" y="${top - 8}" text-anchor="end" font-size="10" fill="${C.muted}">${esc(chart.einheit)}</text>`;
  return `${svgOpen(W, H, chart.titel)}${grid}${unit}${cols}${forecast ? legend(base + 32) : ""}</svg>`;
}

// Die Wertschöpfungskette: Stufen von oben nach unten, je Stufe ein Satz und die Firmen darin.
export function chainChart(chart: DocChart): string {
  const stages = chart.stufen
    .map(
      (s, i) =>
        `<li class="stage"><span class="stage-num">${i + 1}</span><div class="stage-body"><p class="stage-name">${esc(s.name)}</p>` +
        (s.beschreibung ? `<p class="stage-text">${esc(s.beschreibung)}</p>` : "") +
        (s.firmen.length ? `<ul class="firms">${s.firmen.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : "") +
        `</div></li>`,
    )
    .join("");
  return `<ol class="chain" aria-label="${esc(chart.titel)}">${stages}</ol>`;
}

function figure(chart: DocChart, n: number): string {
  const body = chart.art === "balken" ? barChart(chart) : chart.art === "saeulen" ? columnChart(chart) : chainChart(chart);
  const unit = chart.art !== "kette" && chart.einheit ? ` <span class="unit">in ${esc(chart.einheit)}</span>` : "";
  const source = chart.quelle ? `<p class="fig-source">Quelle: ${esc(chart.quelle)}</p>` : "";
  return `<figure class="fig fig-${chart.art}"><figcaption><span class="fig-no">Abbildung ${n}</span> ${esc(chart.titel)}${unit}</figcaption>${body}${source}</figure>`;
}

function table(t: DocTable, sources: number): string {
  const head = t.spalten.map((c) => `<th>${esc(c)}</th>`).join("");
  const rows = t.zeilen.map((r) => `<tr>${r.map((c) => `<td>${inline(c, sources)}</td>`).join("")}</tr>`).join("");
  return `<div class="table">${t.titel ? `<p class="table-title">${esc(t.titel)}</p>` : ""}<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function section(s: DocSection, i: number, sources: number, figNo: () => number): string {
  const paras = s.absaetze.map((p) => p.split(/\n{2,}/).map((x) => `<p>${inline(x.replace(/\n/g, " "), sources)}</p>`).join("")).join("");
  const bullets = s.punkte.length ? `<ul class="points">${s.punkte.map((p) => `<li>${inline(p, sources)}</li>`).join("")}</ul>` : "";
  const chart = s.grafik.art !== "keine" ? figure(s.grafik, figNo()) : "";
  const tab = s.tabelle.spalten.length ? table(s.tabelle, sources) : "";
  return `<section id="s-${i + 1}"><h2><span class="no">${i + 1}</span>${esc(s.ueberschrift)}</h2>${paras}${bullets}${chart}${tab}</section>`;
}

const STYLE = `
@page { size: A4; margin: 18mm 16mm 20mm; }
:root { color-scheme: light; }
* { box-sizing: border-box; }
html { background: ${C.plane}; }
body { margin: 0 auto; max-width: 820px; padding: 40px 48px 56px; background: ${C.surface}; color: ${C.ink};
  font: 10.5pt/1.55 -apple-system, system-ui, "Segoe UI", "Helvetica Neue", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media print { html { background: ${C.surface}; } body { max-width: none; padding: 0; } }
a { color: ${C.series}; text-decoration: none; }
.eyebrow { margin: 0 0 10px; font-size: 8.5pt; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: ${C.series}; }
h1 { margin: 0; font-size: 25pt; line-height: 1.15; letter-spacing: -.01em; }
.subtitle { margin: 10px 0 0; font-size: 13pt; line-height: 1.4; color: ${C.ink2}; }
.meta { margin: 14px 0 0; padding-bottom: 14px; border-bottom: 1px solid ${C.grid}; font-size: 9pt; color: ${C.muted}; }
.summary { margin: 22px 0 8px; padding: 14px 18px 12px; background: ${C.plane}; border-left: 3px solid ${C.series}; border-radius: 4px; break-inside: avoid; }
.summary h2 { margin: 0 0 6px; font-size: 10pt; letter-spacing: .08em; text-transform: uppercase; color: ${C.ink2}; }
.summary ul { margin: 0; padding-left: 18px; }
.summary li { margin: 4px 0; }
.toc { margin: 18px 0 4px; font-size: 9.5pt; color: ${C.ink2}; break-inside: avoid; }
.toc p { margin: 0 0 4px; font-weight: 700; color: ${C.ink}; }
.toc ol { margin: 0; padding-left: 20px; columns: 2; column-gap: 28px; }
.toc li { margin: 2px 0; break-inside: avoid; }
section { margin-top: 26px; }
h2 { margin: 0 0 8px; font-size: 14.5pt; line-height: 1.25; break-after: avoid; }
h2 .no { display: inline-block; min-width: 1.6em; color: ${C.series}; }
p { margin: 0 0 9px; orphans: 3; widows: 3; }
.points { margin: 4px 0 10px; padding-left: 18px; }
.points li { margin: 3px 0; }
sup.cite { font-size: 7pt; line-height: 0; color: ${C.muted}; }
.fig { margin: 16px 0 14px; break-inside: avoid; }
.fig figcaption { margin: 0 0 8px; font-size: 10pt; font-weight: 700; break-after: avoid; }
.fig-no { color: ${C.muted}; font-weight: 600; margin-right: 4px; }
.unit { font-weight: 400; color: ${C.muted}; }
.chart { display: block; max-width: 100%; height: auto; }
.fig-source { margin: 6px 0 0; font-size: 8.5pt; color: ${C.muted}; }
.chain { list-style: none; margin: 0; padding: 0; }
.stage { position: relative; display: flex; gap: 12px; padding: 0 0 12px; break-inside: avoid; }
.stage:not(:last-child)::before { content: ""; position: absolute; left: 12px; top: 26px; bottom: 0; width: 1px; background: ${C.base}; }
.stage-num { flex: none; display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; background: ${C.series}; color: #fff; font-size: 9.5pt; font-weight: 700; }
.stage-body { flex: 1; min-width: 0; padding: 2px 12px 10px; border: 1px solid ${C.grid}; border-radius: 6px; background: ${C.surface}; }
.stage-name { margin: 2px 0 2px; font-weight: 700; }
.stage-text { margin: 0 0 6px; font-size: 9.5pt; color: ${C.ink2}; }
.firms { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.firms li { padding: 1px 7px; border-radius: 999px; background: ${C.accentSoft}; font-size: 8.5pt; color: ${C.ink}; }
.table { margin: 12px 0 14px; }
.table-title { margin: 0 0 6px; font-size: 10pt; font-weight: 700; break-after: avoid; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; }
thead { display: table-header-group; }
th { text-align: left; padding: 5px 8px; border-bottom: 1px solid ${C.base}; color: ${C.ink2}; font-weight: 700; vertical-align: bottom; }
td { padding: 5px 8px; border-bottom: 1px solid ${C.grid}; vertical-align: top; }
tr { break-inside: avoid; }
.sources { margin-top: 30px; font-size: 8.5pt; color: ${C.ink2}; }
.sources h2 { font-size: 12pt; color: ${C.ink}; }
.sources ol { margin: 0; padding-left: 22px; }
.sources li { margin: 2px 0; overflow-wrap: anywhere; }
.sources .host { color: ${C.muted}; }
.foot { margin-top: 26px; padding-top: 10px; border-top: 1px solid ${C.grid}; font-size: 8pt; color: ${C.muted}; }
`;

export type RenderMeta = { date: Date; model: string };

export function renderDocument(doc: Dokument, meta: RenderMeta): string {
  const sources = doc.quellen.length;
  let figures = 0;
  const figNo = () => ++figures;
  const date = meta.date.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
  const toc =
    doc.abschnitte.length >= 4
      ? `<nav class="toc"><p>Inhalt</p><ol>${doc.abschnitte.map((s, i) => `<li><a href="#s-${i + 1}">${esc(s.ueberschrift)}</a></li>`).join("")}</ol></nav>`
      : "";
  const sourceList = sources
    ? `<section class="sources"><h2>Quellen</h2><ol>${doc.quellen
        .map((q, i) => {
          const url = safeUrl(q.url);
          return `<li id="q-${i + 1}">${esc(q.titel)}${url ? ` · <a class="host" href="${esc(url)}" rel="noopener noreferrer">${esc(hostLabel(url))}</a>` : ""}</li>`;
        })
        .join("")}</ol></section>`
    : "";
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:">
<title>${esc(doc.titel)}</title>
<style>${STYLE}</style>
</head>
<body>
<header>
<p class="eyebrow">JARVIS · Analyse</p>
<h1>${esc(doc.titel)}</h1>
${doc.untertitel ? `<p class="subtitle">${esc(doc.untertitel)}</p>` : ""}
<p class="meta">${esc(date)} · ${doc.abschnitte.length} Abschnitte · ${sources} Quellen · recherchiert im Web mit Claude</p>
</header>
<aside class="summary"><h2>Das Wichtigste in Kürze</h2><ul>${doc.kernaussagen.map((k) => `<li>${inline(k, sources)}</li>`).join("")}</ul></aside>
${toc}
${doc.abschnitte.map((s, i) => section(s, i, sources, figNo)).join("\n")}
${sourceList}
<p class="foot">Erstellt von JARVIS am ${esc(date)} mit ${esc(meta.model)} von Anthropic und der Websuche. Zahlen stammen aus den genannten Quellen und können sich seitdem geändert haben. Keine Anlageberatung.</p>
</body>
</html>`;
}
