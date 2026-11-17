import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";

// Der macOS-Schlüsselbund als Ablage für Zugangsdaten. JARVIS ruft dafür das Bordwerkzeug `security` auf.
// Geschrieben wird über die Eingabe von `security -i` mit dem Wert als Hex-Zeichenkette (-X), damit kein
// Schlüssel in der Prozessliste oder in einer Befehlszeile auftaucht. Gelesen wird mit
// find-generic-password -w; dabei steht der Wert nur in der Ausgabe an JARVIS.
// Der Wert liegt als „b64:“ plus Base64 im Eintrag: `security -w` gibt Werte mit Umlauten oder
// Sonderzeichen sonst als Hex aus, und dann ließe sich nicht mehr sicher sagen, was gemeint war.
// Für Tests lässt sich ein nachgebautes `security` über JARVIS_SECURITY_BIN einsetzen.

export const DIENST = "JARVIS";
const bin = () => process.env.JARVIS_SECURITY_BIN ?? "/usr/bin/security";
const NICHT_GEFUNDEN = 44;

export class SchluesselbundFehler extends Error {}

export const schluesselbundVerfuegbar = () => (process.platform === "darwin" || Boolean(process.env.JARVIS_SECURITY_BIN)) && existsSync(bin());

const konto = (name: string) => {
  if (!/^[a-z][a-zA-Z.]{2,40}$/.test(name)) throw new SchluesselbundFehler("Ungültiger Name für einen Eintrag.");
  return name;
};

function lauf(args: string[], eingabe?: string): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    if (eingabe === undefined) {
      execFile(bin(), args, { timeout: 15_000, maxBuffer: 64 * 1024 }, (e, out, err) => {
        const code = e ? (typeof (e as NodeJS.ErrnoException & { code?: unknown }).code === "number" ? Number((e as { code: number }).code) : -1) : 0;
        if (e && code === -1) return reject(new SchluesselbundFehler(`Der Schlüsselbund antwortet nicht (${e.message.split("\n")[0]}).`));
        resolve({ code, out: String(out), err: String(err) });
      });
      return;
    }
    const p = spawn(bin(), args, { stdio: ["pipe", "pipe", "pipe"], timeout: 15_000 });
    let out = "";
    let err = "";
    p.stdout.on("data", (c) => (out += c));
    p.stderr.on("data", (c) => (err += c));
    p.on("error", (e) => reject(new SchluesselbundFehler(`Der Schlüsselbund antwortet nicht (${e.message}).`)));
    p.on("close", (code) => resolve({ code: code ?? -1, out, err }));
    p.stdin.end(eingabe);
  });
}

export async function lies(name: string): Promise<string | null> {
  const r = await lauf(["find-generic-password", "-s", DIENST, "-a", konto(name), "-w"]);
  if (r.code === NICHT_GEFUNDEN) return null;
  if (r.code !== 0) throw new SchluesselbundFehler(`Der Schlüsselbund gibt „${name}“ nicht heraus (Fehler ${r.code}).`);
  const roh = r.out.replace(/\n$/, "");
  return roh.startsWith("b64:") ? Buffer.from(roh.slice(4), "base64").toString("utf8") : roh;
}

export async function schreibe(name: string, wert: string): Promise<void> {
  const hex = Buffer.from(`b64:${Buffer.from(wert, "utf8").toString("base64")}`, "utf8").toString("hex");
  // -U ersetzt einen vorhandenen Eintrag. Der Wert steht nur in der Eingabe, nicht in den Argumenten.
  const r = await lauf(["-i"], `add-generic-password -U -s ${DIENST} -a ${konto(name)} -l "JARVIS ${name}" -X ${hex}\n`);
  if (r.code !== 0 || /error/i.test(r.err)) throw new SchluesselbundFehler(`„${name}“ ließ sich nicht im Schlüsselbund speichern.`);
}

export async function loesche(name: string): Promise<void> {
  const r = await lauf(["delete-generic-password", "-s", DIENST, "-a", konto(name)]);
  if (r.code !== 0 && r.code !== NICHT_GEFUNDEN) throw new SchluesselbundFehler(`„${name}“ ließ sich nicht aus dem Schlüsselbund löschen.`);
}
