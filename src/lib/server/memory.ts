import fs from "node:fs/promises";
import path from "node:path";
import type { MemoryFact } from "../brain";
import { CONFIG_DIR } from "./config";

// Das Gedächtnis von JARVIS: kurze Dinge über dich, die Claude sich von selbst oder auf Zuruf merkt
// (Vorlieben, Namen, Umstände), damit er sie im nächsten Gespräch noch weiß. Es liegt nur auf deinem Mac
// in ~/.jarvis/gedaechtnis.json; in den Einstellungen siehst du jeden Eintrag und kannst ihn löschen.

const FILE = path.join(CONFIG_DIR, "gedaechtnis.json");
export const MAX_FACTS = 120;
const MAX_LENGTH = 300;

type Shared = { facts: MemoryFact[] | null; saving: Promise<void> };
const holder = globalThis as typeof globalThis & { __jarvisMemory?: Shared };
const shared: Shared = (holder.__jarvisMemory ??= { facts: null, saving: Promise.resolve() });

export async function readMemory(): Promise<MemoryFact[]> {
  if (shared.facts) return shared.facts;
  try {
    const raw = JSON.parse(await fs.readFile(FILE, "utf8")) as { facts?: unknown };
    shared.facts = Array.isArray(raw.facts)
      ? raw.facts.filter((f): f is MemoryFact => typeof f?.id === "string" && typeof f?.text === "string" && typeof f?.at === "string")
      : [];
  } catch {
    shared.facts = [];
  }
  return shared.facts;
}

function save(facts: MemoryFact[]): Promise<void> {
  shared.facts = facts;
  const json = JSON.stringify({ facts }, null, 2);
  shared.saving = shared.saving
    .then(async () => {
      await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(`${FILE}.tmp`, json, { mode: 0o600 });
      await fs.rename(`${FILE}.tmp`, FILE);
    })
    .catch((e) => console.error("Gedächtnis nicht gespeichert:", e));
  return shared.saving;
}

const clean = (text: string) => text.replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_LENGTH);

// Merkt sich etwas. Steht es schon so da, bleibt es bei dem einen Eintrag; ist das Gedächtnis voll,
// fällt der älteste weg.
export async function remember(text: string, now = new Date()): Promise<MemoryFact> {
  const t = clean(text);
  if (!t) throw new Error("Da ist nichts zum Merken.");
  const facts = await readMemory();
  const same = facts.find((f) => f.text.toLowerCase() === t.toLowerCase());
  if (same) return same;
  const fact: MemoryFact = { id: `g${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 5)}`, text: t, at: now.toISOString() };
  await save([...facts, fact].slice(-MAX_FACTS));
  return fact;
}

// Ersetzt einen Eintrag, wenn sich etwas geändert hat (umgezogen, neue Stelle).
export async function revise(id: string, text: string): Promise<MemoryFact> {
  const t = clean(text);
  const facts = await readMemory();
  const old = facts.find((f) => f.id === id);
  if (!old) throw new Error("Diesen Eintrag gibt es nicht mehr.");
  if (!t) throw new Error("Da ist nichts zum Merken.");
  const fact = { ...old, text: t, at: new Date().toISOString() };
  await save(facts.map((f) => (f.id === id ? fact : f)));
  return fact;
}

export async function forget(id: string): Promise<boolean> {
  const facts = await readMemory();
  if (!facts.some((f) => f.id === id)) return false;
  await save(facts.filter((f) => f.id !== id));
  return true;
}

export async function forgetAll(): Promise<void> {
  await save([]);
}
