// Macht aus docs/pruefliste-mac.md ein PDF mit Kästchen zum Abhaken (für Benedikt, der die Liste am Mac abarbeitet).
//   JARVIS_CHROME=/pfad/zu/chrome node scripts/pruefliste/pdf.mjs Ziel.pdf
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const hier = path.dirname(fileURLToPath(import.meta.url));
const ziel = process.argv[2];
if (!ziel) throw new Error("Aufruf: node scripts/pruefliste/pdf.mjs Ziel.pdf");
const html = execFileSync("python3", [path.join(hier, "md2html.py"), path.join(hier, "../../docs/pruefliste-mac.md")], { encoding: "utf8" });
const datei = path.join(mkdtempSync(path.join(os.tmpdir(), "pruefliste-")), "pruefliste.html");
writeFileSync(datei, html);
const browser = await chromium.launch({ executablePath: process.env.JARVIS_CHROME, args: ["--no-sandbox"] });
const seite = await browser.newPage();
await seite.goto(`file://${datei}`);
await seite.pdf({ path: ziel, format: "A4", printBackground: true });
await browser.close();
console.log(`Geschrieben: ${ziel}`);
