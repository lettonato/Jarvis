import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { addDays, isoDate } from "../dates";
import type { Task, TasksSnapshot } from "../tasks";

// Obsidian speichert alles als Markdown-Dateien in einem Ordner, dem Tresor. JARVIS liest und
// schreibt diese Dateien direkt; Obsidian zeigt Änderungen sofort an. JARVIS fasst nur Dateien
// innerhalb des Tresors an und ändert eine Zeile nur, wenn sie noch genau so aussieht wie beim Lesen.

const INBOX = "JARVIS/Eingang.md";
const NOTES = "JARVIS/Notizen.md";
const MAX_FILES = 4000;
const MAX_BYTES = 1_000_000;

const TASK_LINE = /^(\s*(?:[-*+]|\d+[.)])\s+\[)([ xX/])(\]\s+)(.*)$/;
const DATE = "(\\d{4}-\\d{2}-\\d{2})";
const FIELD_EMOJI = "🔁⏳🛫📅📆🗓✅➕❌⏫🔺🔼🔽⏬🆔⛔";
const DUE = [new RegExp(`[📅📆🗓]\\uFE0F?\\s*${DATE}`, "u"), new RegExp(`\\[due::\\s*${DATE}\\]`), new RegExp(`(?:^|\\s)due::\\s*${DATE}`)];
const SCHEDULED = [new RegExp(`⏳\\uFE0F?\\s*${DATE}`, "u"), new RegExp(`\\[scheduled::\\s*${DATE}\\]`)];
const DONE_ON = new RegExp(`✅\\uFE0F?\\s*${DATE}`, "u");
const BLOCK_ID = /(\s+\^[\w-]+)?\s*$/;

export class TaskChangedError extends Error {}

const firstMatch = (body: string, patterns: RegExp[]) => {
  for (const re of patterns) {
    const m = body.match(re);
    if (m) return m[1];
  }
  return undefined;
};

// Macht aus „**Angebot** an [[Max Huber|Max]] schicken #wichtig ⏫ 📅 2026-10-30“ den Text „Angebot an Max schicken“.
function readable(body: string): { text: string; tags: string[] } {
  let text = body.split(new RegExp(`[${FIELD_EMOJI}]`, "u"))[0];
  text = text
    .replace(/\[[\w-]+::[^\]]*\]/g, "")
    .replace(/(?:^|\s)[\w-]+::.*$/, "")
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, (_, target: string) => target.split("/").pop()!.replace(/#.*/, ""))
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~`=]{1,2}/g, "");
  const tags = [...text.matchAll(/(?:^|\s)#([\p{L}\d_/-]+)/gu)].map((m) => m[1]);
  text = text.replace(/(?:^|\s)#[\p{L}\d_/-]+/gu, " ").replace(/\s+/g, " ").trim();
  return { text, tags };
}

export function parseTaskLine(line: string, file: string, index: number, today: string): { task?: Task; doneToday: boolean } {
  const m = line.match(TASK_LINE);
  if (!m) return { doneToday: false };
  const body = m[4];
  if (m[2] === "x" || m[2] === "X") return { doneToday: body.match(DONE_ON)?.[1] === today };
  const { text, tags } = readable(body);
  if (!text) return { doneToday: false };
  const important =
    /[🔺⏫]/u.test(body) || /\[priority::\s*(high|highest|hoch)\]/i.test(body) || tags.some((t) => /^(wichtig|dringend|important|urgent)$/i.test(t));
  return {
    doneToday: false,
    task: {
      id: `${file}:${index}`,
      file,
      line: index,
      raw: line,
      text,
      due: firstMatch(body, DUE),
      scheduled: firstMatch(body, SCHEDULED),
      important,
      recurring: body.includes("🔁") || /\[repeat::/i.test(body),
      tags,
    },
  };
}

async function markdownFiles(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(dir: string) {
    if (found.length >= MAX_FILES) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) found.push(full);
      if (found.length >= MAX_FILES) return;
    }
  }
  await walk(root);
  return found;
}

export async function readTasks(vault: string): Promise<TasksSnapshot> {
  const today = isoDate(new Date());
  const info = { name: path.basename(vault), path: vault };
  try {
    const stat = await fs.stat(vault);
    if (!stat.isDirectory()) throw new Error();
  } catch {
    return { configured: true, vault: info, tasks: [], doneToday: 0, error: `Den Ordner ${vault} gibt es nicht mehr.` };
  }
  const tasks: Task[] = [];
  let doneToday = 0;
  for (const full of await markdownFiles(vault)) {
    const stat = await fs.stat(full).catch(() => null);
    if (!stat || stat.size > MAX_BYTES) continue;
    const content = await fs.readFile(full, "utf8").catch(() => "");
    if (!content.includes("[")) continue;
    const file = path.relative(vault, full).split(path.sep).join("/");
    let fenced = false;
    content.split(/\r?\n/).forEach((line, i) => {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
      if (fenced) return;
      const parsed = parseTaskLine(line, file, i, today);
      if (parsed.task) tasks.push(parsed.task);
      if (parsed.doneToday) doneToday++;
    });
  }
  return { configured: true, vault: info, tasks, doneToday };
}

// Löst einen Pfad im Tresor auf und verhindert, dass ein Pfad aus dem Tresor herausführt.
async function inside(vault: string, file: string): Promise<string> {
  const root = await fs.realpath(vault);
  const target = path.resolve(root, file);
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error("Pfad liegt außerhalb des Tresors.");
  if (!target.toLowerCase().endsWith(".md")) throw new Error("Nur Markdown-Dateien.");
  // Auch eine Verknüpfung im Tresor darf nicht nach draußen zeigen.
  const real = await fs.realpath(target).catch(() => target);
  if (!real.startsWith(root + path.sep)) throw new Error("Pfad liegt außerhalb des Tresors.");
  return target;
}

async function editLine(vault: string, task: Pick<Task, "file" | "line" | "raw">, change: (line: string) => string) {
  const full = await inside(vault, task.file);
  const content = await fs.readFile(full, "utf8");
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(/\r?\n/);
  let index = lines[task.line] === task.raw ? task.line : -1;
  if (index < 0) {
    // Die Zeile ist verrutscht, zum Beispiel weil oben etwas eingefügt wurde: dann gilt sie nur, wenn sie eindeutig ist.
    const hits = lines.flatMap((l, i) => (l === task.raw ? [i] : []));
    if (hits.length !== 1) throw new TaskChangedError("Die Aufgabe wurde inzwischen in Obsidian geändert. Ich lade sie neu.");
    index = hits[0];
  }
  lines[index] = change(lines[index]);
  await fs.writeFile(full, lines.join(eol), "utf8");
}

// Neue Felder kommen ans Zeilenende, aber vor eine Block-ID wie „^abc123“.
const appendField = (line: string, field: string) => line.replace(BLOCK_ID, (_all, block?: string) => ` ${field}${block ?? ""}`);

export async function completeTask(vault: string, task: Pick<Task, "file" | "line" | "raw">) {
  const today = isoDate(new Date());
  await editLine(vault, task, (line) => {
    const m = line.match(TASK_LINE);
    if (!m) throw new TaskChangedError("Das ist keine offene Aufgabe mehr.");
    return appendField(`${m[1]}x${m[3]}${m[4]}`.replace(/\s+$/, ""), `✅ ${today}`);
  });
}

export async function rescheduleTask(vault: string, task: Pick<Task, "file" | "line" | "raw">, date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Ungültiges Datum.");
  await editLine(vault, task, (line) => {
    for (const re of [/([📅📆🗓]️?\s*)\d{4}-\d{2}-\d{2}/u, /(\[due::\s*)\d{4}-\d{2}-\d{2}/, /((?:^|\s)due::\s*)\d{4}-\d{2}-\d{2}/]) {
      if (re.test(line)) return line.replace(re, `$1${date}`);
    }
    return appendField(line.replace(/\s+$/, ""), `📅 ${date}`);
  });
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim().slice(0, 300);

async function appendTo(vault: string, file: string, header: string, line: string) {
  const full = await inside(vault, file);
  await fs.mkdir(path.dirname(full), { recursive: true });
  const existing = await fs.readFile(full, "utf8").catch(() => null);
  const base = existing ?? header;
  const sep = base === "" || base.endsWith("\n") ? "" : "\n";
  await fs.writeFile(full, `${base}${sep}${line}\n`, "utf8");
}

export async function addTask(vault: string, input: { text: string; due?: string; important?: boolean }) {
  const text = oneLine(input.text);
  if (!text) throw new Error("Die Aufgabe ist leer.");
  if (input.due && !/^\d{4}-\d{2}-\d{2}$/.test(input.due)) throw new Error("Ungültiges Datum.");
  const fields = [input.important ? "⏫" : "", input.due ? `📅 ${input.due}` : "", `➕ ${isoDate(new Date())}`].filter(Boolean);
  await appendTo(vault, INBOX, "# Eingang\n\nAufgaben, die JARVIS für dich notiert hat.\n\n", `- [ ] ${text} ${fields.join(" ")}`);
}

export async function addNote(vault: string, text: string) {
  const clean = oneLine(text);
  if (!clean) throw new Error("Die Notiz ist leer.");
  const now = new Date();
  const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  await appendTo(vault, NOTES, "# Notizen\n\nWas du JARVIS gesagt hast, damit er es sich merkt.\n\n", `- ${isoDate(now)} ${time}: ${clean}`);
}

// Tresore, die Obsidian auf diesem Rechner kennt.
export async function detectVaults(): Promise<{ name: string; path: string }[]> {
  const home = os.homedir();
  const candidates = [
    path.join(home, "Library", "Application Support", "obsidian", "obsidian.json"),
    path.join(process.env.APPDATA ?? path.join(home, "AppData", "Roaming"), "obsidian", "obsidian.json"),
    path.join(home, ".config", "obsidian", "obsidian.json"),
  ];
  for (const file of candidates) {
    try {
      const data = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ file, "utf8")) as { vaults?: Record<string, { path?: string; ts?: number }> };
      const vaults = Object.values(data.vaults ?? {})
        .filter((v): v is { path: string; ts?: number } => typeof v.path === "string")
        .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
      const existing = [];
      for (const v of vaults) {
        if (await fs.stat(v.path).then((s) => s.isDirectory()).catch(() => false)) existing.push({ name: path.basename(v.path), path: v.path });
      }
      return existing;
    } catch {
      // Obsidian ist hier nicht installiert, nächsten Ort versuchen.
    }
  }
  return [];
}

// Legt einen neuen Tresor in Dokumente/JARVIS-Tresor an, mit ersten Aufgaben zum Loslegen.
export async function createVault(): Promise<string> {
  const vault = path.join(os.homedir(), "Documents", "JARVIS-Tresor");
  await fs.mkdir(path.join(vault, "JARVIS"), { recursive: true });
  const today = isoDate(new Date());
  const welcome = path.join(vault, "Willkommen.md");
  if (!(await fs.stat(welcome).catch(() => null))) {
    await fs.writeFile(
      welcome,
      [
        "# Willkommen in deinem JARVIS-Tresor",
        "",
        "Hier liegen deine Aufgaben und Notizen als einfache Textdateien. Du kannst sie mit Obsidian öffnen",
        "(obsidian.md, kostenlos): Obsidian starten → „Ordner als Tresor öffnen“ → Dokumente/JARVIS-Tresor.",
        "",
        "Eine Aufgabe ist eine Zeile wie diese, das Datum ist die Fälligkeit:",
        "",
        "`- [ ] Rechnung an Max schicken 📅 2026-11-02`",
        "",
        "JARVIS legt neue Aufgaben in [[JARVIS/Eingang]] ab und merkt sich Notizen in [[JARVIS/Notizen]].",
        "",
      ].join("\n"),
      "utf8",
    );
  }
  const inbox = path.join(vault, INBOX);
  if (!(await fs.stat(inbox).catch(() => null))) {
    await fs.writeFile(
      inbox,
      [
        "# Eingang",
        "",
        "Aufgaben, die JARVIS für dich notiert hat.",
        "",
        `- [ ] Obsidian installieren und diesen Ordner als Tresor öffnen 📅 ${today} ➕ ${today}`,
        `- [ ] E-Mail-Postfach in den JARVIS-Einstellungen verbinden ⏫ 📅 ${addDays(today, 1)} ➕ ${today}`,
        `- [ ] Mit JARVIS das erste Briefing machen: „Guten Morgen“ sagen 📅 ${addDays(today, 2)} ➕ ${today}`,
        "",
      ].join("\n"),
      "utf8",
    );
  }
  return vault;
}
