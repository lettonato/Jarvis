import { connection } from "next/server";
import { readConfig } from "@/lib/server/config";
import { guard, readBody } from "@/lib/server/guard";
import { addNote, addTask, completeTask, readTasks, rescheduleTask, TaskChangedError } from "@/lib/server/obsidian";
import type { TasksSnapshot } from "@/lib/tasks";

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  const { vaultPath } = await readConfig();
  if (!vaultPath) return Response.json({ configured: false, tasks: [], doneToday: 0 } satisfies TasksSnapshot);
  return Response.json(await readTasks(vaultPath));
}

type Action =
  | { action: "done"; file: string; line: number; raw: string }
  | { action: "due"; file: string; line: number; raw: string; date: string }
  | { action: "add"; text: string; due?: string; important?: boolean }
  | { action: "note"; text: string };

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Action>(request);
  const { vaultPath } = await readConfig();
  if (!vaultPath) return Response.json({ error: "Noch kein Obsidian-Tresor verbunden." }, { status: 409 });
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  try {
    if (body.action === "done") await completeTask(vaultPath, body);
    else if (body.action === "due") await rescheduleTask(vaultPath, body, body.date);
    else if (body.action === "add") await addTask(vaultPath, body);
    else if (body.action === "note") await addNote(vaultPath, body.text);
    else return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (e) {
    const status = e instanceof TaskChangedError ? 409 : 400;
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
  return Response.json(await readTasks(vaultPath));
}
