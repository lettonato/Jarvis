#!/usr/bin/env node
// Nachgebauter Mac für den Kalender: steht in Tests an der Stelle von /usr/bin/osascript (JARVIS_OSASCRIPT)
// und von /usr/bin/open (JARVIS_OPEN). Der Kalender liegt als JSON in JARVIS_MAC_STORE, jeder Aufruf wird
// mit seinen Argumenten in JARVIS_MAC_LOG festgehalten. So prüfen Tests, was JARVIS dem Mac übergibt.

import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const log = process.env.JARVIS_MAC_LOG;
if (log) appendFileSync(log, `${JSON.stringify({ programm: path.basename(process.argv[1]), als: process.env.JARVIS_MAC_ALS ?? "osascript", args })}\n`);

// Als „open“ aufgerufen: nur festhalten.
if (process.env.JARVIS_MAC_ALS === "open") process.exit(0);

const store = process.env.JARVIS_MAC_STORE;
const lies = () => {
  try {
    return JSON.parse(readFileSync(store, "utf8"));
  } catch {
    return { zugriff: "ok", kalender: [{ name: "Privat", writable: true }], standard: "Privat", events: [] };
  }
};

// osascript -l JavaScript -e <Skript> <Modus> …
if (args[0] === "-l") {
  const modus = args[4];
  const stand = lies();
  if (stand.zugriff !== "ok") {
    process.stdout.write(JSON.stringify({ zugriff: stand.zugriff, kalender: [], events: [] }));
    process.exit(0);
  }
  if (modus === "neu") {
    const e = JSON.parse(args[5]);
    const antworte = (o) => {
      process.stdout.write(JSON.stringify({ zugriff: "ok", ...o }));
      process.exit(0);
    };
    // Wie das echte Skript (EVENTKIT in src/lib/server/calendar.ts): der genannte Kalender, wenn es ihn gibt und er
    // beschreibbar ist. Sonst der Standardkalender des Macs; war der Name ausdrücklich verlangt (fest), wird abgelehnt.
    // Genau so geschrieben geht vor; sonst zählt Groß- und Kleinschreibung nicht.
    const gesucht = String(e.calendar || "").trim();
    const frei = stand.kalender.filter((k) => k.writable);
    const genannt = gesucht ? (frei.find((k) => k.name.trim() === gesucht) ?? frei.find((k) => k.name.trim().toLowerCase() === gesucht.toLowerCase())) : undefined;
    if (!genannt && gesucht && e.fest) antworte({ gespeichert: false, fehler: `Den Kalender „${gesucht}“ gibt es nicht oder er ist schreibgeschützt.` });
    // Der Standardkalender für neue Termine ist am Mac immer einer, in den man eintragen darf, oder es gibt keinen.
    const ziel = genannt ?? frei.find((k) => k.name === stand.standard);
    if (!ziel) antworte({ gespeichert: false, fehler: "Ich finde keinen Kalender, in den ich eintragen darf." });
    // „speichern: abgelehnt“ stellt nach, dass die Kalender-App den Termin nicht annimmt.
    if (stand.speichern === "abgelehnt") antworte({ gespeichert: false, fehler: "Der Kalender hat den Termin nicht gespeichert. Testfehler vom Mac" });
    stand.events.push({ id: `neu-${stand.events.length + 1}`, title: e.title, start: e.start, end: e.end, allDay: e.allDay, location: e.location, calendar: ziel.name });
    writeFileSync(store, JSON.stringify(stand));
    antworte({ gespeichert: true, kalender_name: ziel.name });
  }
  const [von, bis] = [Number(args[5]), Number(args[6])];
  process.stdout.write(JSON.stringify({ zugriff: "ok", kalender: stand.kalender, standard: stand.standard, events: stand.events.filter((e) => e.start >= von && e.start <= bis) }));
  process.exit(0);
}
// osascript -e <Skript für eine Mitteilung> <Text> <Titel>. JARVIS_MAC_MITTEILUNG stellt nach, was am Mac schiefgehen
// kann: „abgelehnt“ (der Mac nimmt sie nicht an), „haengt“ (er antwortet nicht), „abgeschossen“ (osascript wird von
// außen beendet) und „langsam“ (er antwortet erst nach einem Augenblick).
if (args[0] === "-e" && args[1]?.includes("display notification")) {
  if (process.env.JARVIS_MAC_MITTEILUNG === "abgelehnt") {
    process.stderr.write("execution error: Testfehler vom Mac (-1743)\n");
    process.exit(1);
  }
  if (process.env.JARVIS_MAC_MITTEILUNG === "abgeschossen") process.kill(process.pid, "SIGKILL");
  if (process.env.JARVIS_MAC_MITTEILUNG === "haengt") setTimeout(() => process.exit(0), 10_000);
  else if (process.env.JARVIS_MAC_MITTEILUNG === "langsam") setTimeout(() => process.exit(0), 300);
  else process.exit(0);
} else {
  // osascript -e <Skript zum Anzeigen eines Tages> j m t
  process.exit(0);
}
