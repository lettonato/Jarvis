#!/usr/bin/env node
// Nachgebautes /usr/bin/open: hält nur fest, was geöffnet werden sollte (siehe osascript-mock.mjs).
import { appendFileSync } from "node:fs";

if (process.env.JARVIS_MAC_LOG) appendFileSync(process.env.JARVIS_MAC_LOG, `${JSON.stringify({ programm: "open", args: process.argv.slice(2) })}\n`);
