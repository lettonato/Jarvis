// Startet für eine Handprüfung ein eigenes, leeres PostgreSQL auf diesem Rechner und räumt es danach weg.
// Es lauscht nur auf 127.0.0.1, die Daten liegen in einem Wegwerf-Ordner. Mit einer Datenbank in Azure oder
// sonst im Netz hat das nichts zu tun: Hier wird nichts angelegt, was Geld kostet.
//
// Die Programme von PostgreSQL (initdb, pg_ctl) müssen installiert sein. Gesucht wird in JARVIS_PG_BIN, dann
// an den üblichen Orten (Linux: /usr/lib/postgresql/<Version>/bin, Mac mit Homebrew: /opt/homebrew/opt/…).

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function findeProgramme(): string {
  const kandidaten: string[] = [];
  if (process.env.JARVIS_PG_BIN) kandidaten.push(process.env.JARVIS_PG_BIN);
  for (const wurzel of ["/usr/lib/postgresql", "/opt/homebrew/opt", "/usr/local/opt"]) {
    if (!existsSync(wurzel)) continue;
    for (const name of readdirSync(wurzel).sort().reverse()) {
      if (wurzel.endsWith("postgresql") || name.startsWith("postgresql")) kandidaten.push(path.join(wurzel, name, "bin"));
    }
  }
  const ort = kandidaten.find((k) => existsSync(path.join(k, "initdb")) && existsSync(path.join(k, "pg_ctl")));
  if (!ort) throw new Error("PostgreSQL ist auf diesem Rechner nicht installiert (initdb und pg_ctl nicht gefunden). Setz JARVIS_PG_BIN auf den Ordner mit den Programmen.");
  return ort;
}

// Ob die Programme von PostgreSQL auf diesem Rechner zu finden sind.
export function postgresVorhanden(): boolean {
  try {
    findeProgramme();
    return true;
  } catch {
    return false;
  }
}

export type TestPostgres = {
  url: string;
  port: number;
  stop: () => void;
  anhalten: () => void;
  weiter: () => void;
  // Startet den Server neu mit Verschlüsselung und einem selbst ausgestellten Zertifikat (dem niemand vertraut).
  mitSelbstAusgestelltemZertifikat: () => void;
};

// zweiteAdresse: Der Server lauscht zusätzlich auf 127.0.0.2. Das ist weiter nur dieser Rechner, gilt für JARVIS
// aber nicht als „dieser Rechner“; so lässt sich prüfen, dass dorthin nur verschlüsselt verbunden wird.
// (Linux kennt 127.0.0.2 von Haus aus; auf dem Mac müsste die Adresse erst eingerichtet werden.)
export function startePostgres(port = 54329, { zweiteAdresse = false } = {}): TestPostgres {
  const bin = findeProgramme();
  // PostgreSQL startet nicht als root. In der Sandbox läuft alles als root, deshalb dort als Benutzer „postgres“.
  const root = process.getuid?.() === 0;
  const als = (programm: string, args: string[]) => (root ? execFileSync("runuser", ["-u", "postgres", "--", programm, ...args], { stdio: "pipe" }) : execFileSync(programm, args, { stdio: "pipe" }));
  const ordner = mkdtempSync(path.join(os.tmpdir(), "jarvis-pg-"));
  if (root) execFileSync("chown", ["postgres", ordner]);
  const daten = path.join(ordner, "daten");
  // „trust“ gilt nur für diese Wegwerf-Datenbank auf 127.0.0.1; ein Kennwort gibt es hier nicht.
  als(path.join(bin, "initdb"), ["-D", daten, "-U", "jarvis", "-A", "trust", "-E", "UTF8", "--locale=C"]);
  let tls = false;
  const start = () => {
    const optionen = `-p ${port} -c listen_addresses=${zweiteAdresse ? "127.0.0.1,127.0.0.2" : "127.0.0.1"} -c unix_socket_directories='' -c fsync=off${tls ? " -c ssl=on" : ""}`;
    als(path.join(bin, "pg_ctl"), ["-D", daten, "-o", optionen, "-l", path.join(ordner, "log"), "-w", "start"]);
  };
  const halt = () => als(path.join(bin, "pg_ctl"), ["-D", daten, "-m", "fast", "-w", "stop"]);
  start();
  let laeuft = true;
  const anhalten = () => {
    if (laeuft) halt();
    laeuft = false;
  };
  const weiter = () => {
    if (!laeuft) start();
    laeuft = true;
  };
  return {
    url: `postgres://jarvis@127.0.0.1:${port}/postgres`,
    port,
    anhalten,
    weiter,
    mitSelbstAusgestelltemZertifikat: () => {
      anhalten();
      als("openssl", ["req", "-new", "-x509", "-days", "2", "-nodes", "-subj", "/CN=jarvis-test", "-keyout", path.join(daten, "server.key"), "-out", path.join(daten, "server.crt")]);
      als("chmod", ["600", path.join(daten, "server.key")]);
      tls = true;
      weiter();
    },
    stop: () => {
      try {
        if (laeuft) halt();
      } finally {
        rmSync(ordner, { recursive: true, force: true });
      }
    },
  };
}
