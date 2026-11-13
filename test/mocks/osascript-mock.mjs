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
    const name = e.calendar || stand.standard;
    const kalender = stand.kalender.find((k) => k.name === name);
    if (!kalender || !kalender.writable) {
      process.stdout.write(JSON.stringify({ zugriff: "ok", gespeichert: false, fehler: `Den Kalender „${name}“ gibt es nicht oder er ist schreibgeschützt.` }));
      process.exit(0);
    }
    stand.events.push({ id: `neu-${stand.events.length + 1}`, title: e.title, start: e.start, end: e.end, allDay: e.allDay, location: e.location, calendar: name });
    writeFileSync(store, JSON.stringify(stand));
    process.stdout.write(JSON.stringify({ zugriff: "ok", gespeichert: true, kalender_name: name }));
    process.exit(0);
  }
  const [von, bis] = [Number(args[5]), Number(args[6])];
  process.stdout.write(JSON.stringify({ zugriff: "ok", kalender: stand.kalender, standard: stand.standard, events: stand.events.filter((e) => e.start >= von && e.start <= bis) }));
  process.exit(0);
}
// osascript -e <Skript zum Anzeigen eines Tages> j m t
process.exit(0);
