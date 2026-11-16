#!/usr/bin/env node
// Nachgebautes /usr/bin/open: hält nur fest, was geöffnet werden sollte (siehe osascript-mock.mjs).
// JARVIS_OPEN_FEHLT (Teile mit | getrennt): Kommt einer davon in einem Argument vor, meldet es wie das echte open,
// dass es das Programm oder die Datei nicht gibt. JARVIS_OPEN_HAENGT: Es antwortet nicht.
import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);
if (process.env.JARVIS_MAC_LOG) appendFileSync(process.env.JARVIS_MAC_LOG, `${JSON.stringify({ programm: "open", args })}\n`);
const fehlt = (process.env.JARVIS_OPEN_FEHLT ?? "").split("|").filter(Boolean);
if (process.env.JARVIS_OPEN_HAENGT) setTimeout(() => {}, 60_000);
else if (args.some((a) => fehlt.some((f) => a.includes(f)))) {
  process.stderr.write(`Unable to find application named '${args.at(-1)}'\n`);
  process.exit(1);
}
