#!/usr/bin/env node
// Nachgebautes macOS-Werkzeug `security` für Tests (src/lib/server/schluesselbund.ts). Speichert in der
// JSON-Datei aus JARVIS_SECURITY_STORE und schreibt jeden Aufruf (nur die Argumente) nach
// JARVIS_SECURITY_LOG, damit Tests prüfen können, dass kein Schlüssel in einer Befehlszeile steht.
// JARVIS_SECURITY_KAPUTT=lesen|schreiben lässt den jeweiligen Befehl scheitern.
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";

const store = process.env.JARVIS_SECURITY_STORE;
const log = process.env.JARVIS_SECURITY_LOG;
const kaputt = process.env.JARVIS_SECURITY_KAPUTT ?? "";
const laden = () => {
  try {
    return JSON.parse(readFileSync(store, "utf8"));
  } catch {
    return {};
  }
};
const speichern = (d) => writeFileSync(store, JSON.stringify(d));
const arg = (args, flag) => args[args.indexOf(flag) + 1];

function befehl(args) {
  if (log) appendFileSync(log, `${JSON.stringify(args)}\n`);
  const [cmd, ...rest] = args;
  const key = `${arg(rest, "-s")}/${arg(rest, "-a")}`;
  const d = laden();
  if (cmd === "find-generic-password") {
    if (kaputt === "lesen") return 51;
    if (!(key in d)) return 44;
    process.stdout.write(`${d[key]}\n`);
    return 0;
  }
  if (cmd === "add-generic-password") {
    if (kaputt === "schreiben") {
      process.stderr.write("security: SecKeychainItemCreateFromContent: error\n");
      return 0;
    }
    d[key] = Buffer.from(arg(rest, "-X"), "hex").toString("utf8");
    speichern(d);
    return 0;
  }
  if (cmd === "delete-generic-password") {
    if (!(key in d)) return 44;
    delete d[key];
    speichern(d);
    return 0;
  }
  return 1;
}

// Wörter wie die Shell trennen, Anführungszeichen entfernen (genügt für die Befehle von JARVIS).
const woerter = (zeile) => [...zeile.matchAll(/"([^"]*)"|(\S+)/g)].map((m) => m[1] ?? m[2]);

const argv = process.argv.slice(2);
if (argv[0] === "-i") {
  if (log) appendFileSync(log, `${JSON.stringify(argv)}\n`);
  let eingabe = "";
  process.stdin.on("data", (c) => (eingabe += c));
  process.stdin.on("end", () => {
    let code = 0;
    for (const zeile of eingabe.split("\n").filter((z) => z.trim())) code ||= befehl(woerter(zeile));
    process.exit(code);
  });
} else process.exit(befehl(argv));
