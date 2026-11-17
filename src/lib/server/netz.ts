import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIpLiteral, privateAddress, privateName } from "../netzregeln";

export { privateAddress, privateName };

// Der gemeinsame Netzschutz für alles, was JARVIS selbst aus dem Netz holt (Crawler, Browser-Agent und
// später weitere Agenten). Er verhindert Zugriffe auf das Heimnetz, auf JARVIS selbst und auf
// Cloud-Metadaten-Dienste (SSRF). Zwei Regeln:
// 1. Jede IP-Adresse wird vollständig geprüft, auch in IPv6-Schreibweisen, die eine IPv4-Adresse
//    einbetten (::ffff:, NAT64 64:ff9b::, 6to4 2002::).
// 2. Die Prüfung sitzt in der Namensauflösung der Verbindung selbst. Die geprüfte Adresse ist genau die,
//    zu der verbunden wird; ein Angreifer kann zwischen Prüfung und Abruf nicht umschalten (DNS-Rebinding).

export type Lookup = (host: string) => Promise<LookupAddress[]>;

export const systemLookup: Lookup = (host) =>
  new Promise((resolve, reject) => dnsLookup(host, { all: true, verbatim: true }, (err, addresses) => (err ? reject(err) : resolve(addresses))));

export class NetzSperre extends Error {}

// Löst einen Namen auf und sperrt, sobald auch nur eine Adresse privat ist. Für Chrome (Browser-Agent),
// das selbst verbindet: Dort prüft JARVIS jede Anfrage vorher.
export async function adresseProblem(raw: string, { lookup = systemLookup }: { lookup?: Lookup } = {}): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "Das ist keine Webadresse.";
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (privateName(host)) return "Seiten im Heimnetz öffne ich nicht, nur Seiten im Internet.";
  if (isIpLiteral(host)) return null;
  let addresses: LookupAddress[];
  try {
    addresses = await lookup(host);
  } catch {
    return "Diese Adresse gibt es nicht.";
  }
  if (!addresses.length || addresses.some((a) => privateAddress(a.address))) return "Diese Adresse zeigt ins Heimnetz oder auf einen internen Dienst. Die öffne ich nicht.";
  return null;
}

export type SichererAbruf = { status: number; headers: http.IncomingHttpHeaders; body: string; url: string };

// Holt eine Seite mit Node selbst. Die Verbindung nutzt genau die Adresse, die geprüft wurde.
export function sichererAbruf(
  raw: string,
  { lookup = systemLookup, timeoutMs = 8000, maxBytes = 300_000, nurHttps = true, accept = "text/html", userAgent = "Mozilla/5.0 (JARVIS Crawler)" }: { lookup?: Lookup; timeoutMs?: number; maxBytes?: number; nurHttps?: boolean; accept?: string; userAgent?: string } = {},
): Promise<SichererAbruf> {
  return new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return reject(new NetzSperre("keine gültige Adresse"));
    }
    if (url.protocol !== "https:" && (nurHttps || url.protocol !== "http:")) return reject(new NetzSperre("keine sichere https-Adresse"));
    if (url.username || url.password) return reject(new NetzSperre("Adresse mit Zugangsdaten"));
    if (privateName(url.hostname)) return reject(new NetzSperre("Adresse zeigt ins Heimnetz"));

    // Die Namensauflösung der Verbindung: prüft jede Adresse und gibt nur eine geprüfte weiter.
    const checkedLookup = (host: string, _opts: unknown, cb: (err: Error | null, address: string | LookupAddress[], family?: number) => void) => {
      lookup(host).then(
        (addresses) => {
          const safe = addresses.length > 0 && !addresses.some((a) => privateAddress(a.address));
          if (!safe) return cb(new NetzSperre("Adresse zeigt ins Heimnetz"), "", 0);
          const first = addresses[0];
          const wantsAll = typeof _opts === "object" && _opts !== null && (_opts as { all?: boolean }).all;
          if (wantsAll) cb(null, [first]);
          else cb(null, first.address, first.family);
        },
        (err: Error) => cb(err, "", 0),
      );
    };

    const lib = url.protocol === "https:" ? https : http;
    const req = lib.request(
      url,
      {
        method: "GET",
        headers: { accept, "user-agent": userAgent },
        lookup: checkedLookup as never,
        timeout: timeoutMs,
        // IP-Literale prüft die Auflösung nicht, sie sind oben schon geprüft.
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          if (size >= maxBytes) return;
          chunks.push(c);
          size += c.length;
          if (size >= maxBytes) res.destroy();
        });
        const done = () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).subarray(0, maxBytes).toString("utf8"), url: url.toString() });
        res.on("end", done);
        res.on("close", done);
        res.on("error", (e) => (size ? done() : reject(e)));
      },
    );
    req.on("timeout", () => req.destroy(Object.assign(new Error("Zeitüberschreitung"), { name: "TimeoutError" })));
    req.on("error", reject);
    req.end();
  });
}
