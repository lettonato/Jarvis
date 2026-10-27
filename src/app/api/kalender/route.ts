import { connection } from "next/server";
import { readConfig, writeConfig } from "@/lib/server/config";
import { addEvent, CalendarError, openCalendar, openUrl, readCalendar, requestAccess } from "@/lib/server/calendar";
import { guard, readBody } from "@/lib/server/guard";
import type { NewEvent } from "@/lib/calendar";

export async function GET(request: Request) {
  await connection();
  const blocked = guard(request);
  if (blocked) return blocked;
  const force = new URL(request.url).searchParams.get("force") === "1";
  return Response.json(await readCalendar({ force }));
}

// Es gibt nur Lesen, Eintragen und Öffnen. Ändern und Löschen kann JARVIS im Kalender nicht.
type Action =
  | { action: "zugriff" }
  | { action: "neu"; event: NewEvent; open?: boolean }
  | { action: "oeffnen"; date?: string }
  | { action: "ziel"; calendar: string }
  // Öffnet in den Systemeinstellungen die Seite, auf der du JARVIS den Kalender freigibst.
  | { action: "einstellungen" };

const PRIVACY_CALENDARS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Calendars";

export async function POST(request: Request) {
  await connection();
  const blocked = guard(request, { write: true });
  if (blocked) return blocked;
  const body = await readBody<Action>(request);
  if (!body) return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  try {
    if (body.action === "zugriff") return Response.json(await requestAccess());
    if (body.action === "neu") {
      const { snapshot, calendar, event } = await addEvent(body.event);
      const note = body.open ? await openCalendar(event.date).catch(() => undefined) : undefined;
      return Response.json({ ...snapshot, saved: { calendar, event }, note });
    }
    if (body.action === "oeffnen") {
      const note = await openCalendar(body.date);
      return Response.json({ ...(await readCalendar()), note });
    }
    if (body.action === "einstellungen") {
      await openUrl(PRIVACY_CALENDARS);
      return Response.json(await readCalendar());
    }
    if (body.action === "ziel") {
      const snap = await readCalendar();
      const name = body.calendar?.trim() ?? "";
      if (name && !snap.calendars.some((c) => c.name === name && c.writable)) return Response.json({ error: `In den Kalender „${name}“ darf ich nicht eintragen.` }, { status: 400 });
      const config = await readConfig();
      if (name) config.calendar = { target: name };
      else delete config.calendar;
      await writeConfig(config);
      return Response.json(await readCalendar({ force: true }));
    }
  } catch (e) {
    const status = e instanceof CalendarError ? 400 : 500;
    return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status });
  }
  return Response.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
