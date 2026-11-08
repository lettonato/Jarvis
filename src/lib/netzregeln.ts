// Feste Netzregeln ohne Netzzugriff, damit sie überall gelten (Server und Browser-Regeln) und testbar sind:
// Welche IP-Adressen und Namen nie aus dem Internet stammen. Die Verbindung selbst prüft
// src/lib/server/netz.ts. Gesperrt sind Heimnetz, dieser Rechner, Cloud-Metadaten (169.254.169.254,
// Azure 168.63.129.16) und alle Sonderbereiche, auch in IPv6-Schreibweisen mit eingebetteter IPv4
// (::ffff:, NAT64 64:ff9b::, 6to4 2002::).

type V4 = [number, number, number, number];

// Bereiche, die nie aus dem Internet stammen dürfen (IANA Special-Purpose Registry plus Cloud-Dienste).
const V4_BLOCKED: [V4, number][] = [
  [[0, 0, 0, 0], 8], // „dieses Netz“
  [[10, 0, 0, 0], 8], // privat
  [[100, 64, 0, 0], 10], // Carrier-Grade-NAT
  [[127, 0, 0, 0], 8], // dieser Rechner
  [[169, 254, 0, 0], 16], // Link-Local, Cloud-Metadaten (169.254.169.254)
  [[172, 16, 0, 0], 12], // privat
  [[192, 0, 0, 0], 24], // IETF-Protokolle
  [[192, 0, 2, 0], 24], // Dokumentation
  [[192, 88, 99, 0], 24], // 6to4-Relay
  [[192, 168, 0, 0], 16], // privat, Heimnetz
  [[198, 18, 0, 0], 15], // Messnetze
  [[198, 51, 100, 0], 24], // Dokumentation
  [[203, 0, 113, 0], 24], // Dokumentation
  [[224, 0, 0, 0], 4], // Multicast
  [[240, 0, 0, 0], 4], // reserviert, Broadcast
  [[168, 63, 129, 16], 32], // Azure WireServer und Plattform-DNS
];

function v4Of(ip: string): V4 | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => (/^\d{1,3}$/.test(p) ? Number(p) : NaN));
  return nums.every((n) => n >= 0 && n <= 255) ? (nums as V4) : null;
}

function inV4(ip: V4, [net, bits]: [V4, number]): boolean {
  const a = ((ip[0] << 24) | (ip[1] << 16) | (ip[2] << 8) | ip[3]) >>> 0;
  const b = ((net[0] << 24) | (net[1] << 16) | (net[2] << 8) | net[3]) >>> 0;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

const v4Blocked = (ip: V4) => V4_BLOCKED.some((r) => inV4(ip, r));

// IPv6 in 16 Bytes. Akzeptiert auch eine eingebettete IPv4 am Ende (::ffff:1.2.3.4).
function v6Bytes(raw: string): number[] | null {
  let ip = raw.toLowerCase().replace(/^\[|\]$/g, "");
  const zone = ip.indexOf("%");
  if (zone >= 0) ip = ip.slice(0, zone);
  let tail: number[] = [];
  const lastColon = ip.lastIndexOf(":");
  const last = ip.slice(lastColon + 1);
  if (last.includes(".")) {
    const v4 = v4Of(last);
    if (!v4) return null;
    tail = [...v4];
    ip = `${ip.slice(0, lastColon + 1)}0:0`;
  }
  const halves = ip.split("::");
  if (halves.length > 2) return null;
  const group = (s: string) => (s ? s.split(":") : []);
  const head = group(halves[0]);
  const rest = halves.length === 2 ? group(halves[1]) : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  const bytes: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    bytes.push(n >> 8, n & 0xff);
  }
  if (tail.length) bytes.splice(12, 4, ...tail);
  return bytes.length === 16 ? bytes : null;
}

const startsWith = (b: number[], prefix: number[], bits: number) => {
  for (let i = 0; i < bits; i++) {
    const byte = i >> 3;
    const bit = 7 - (i & 7);
    if (((b[byte] >> bit) & 1) !== ((prefix[byte] >> bit) & 1)) return false;
  }
  return true;
};

function v6Blocked(b: number[]): boolean {
  const embedded = (from: number): V4 => [b[from], b[from + 1], b[from + 2], b[from + 3]];
  const zeros = Array(16).fill(0);
  // ::/96 (auch :: und ::1) und ::ffff:0:0/96 (IPv4 in IPv6): eingebettete IPv4 entscheidet, :: und ::1 sind gesperrt.
  if (startsWith(b, zeros, 96)) return true;
  if (startsWith(b, [...Array(10).fill(0), 0xff, 0xff, 0, 0, 0, 0], 96)) return v4Blocked(embedded(12));
  // NAT64 (64:ff9b::/96 und 64:ff9b:1::/48): übersetzt auf eine IPv4-Adresse.
  if (startsWith(b, [0, 0x64, 0xff, 0x9b, ...Array(12).fill(0)], 96)) return v4Blocked(embedded(12));
  if (startsWith(b, [0, 0x64, 0xff, 0x9b, 0, 1, ...Array(10).fill(0)], 48)) return true;
  // 6to4 (2002::/16): die IPv4 steht in Byte 2 bis 5.
  if (startsWith(b, [0x20, 0x02, ...Array(14).fill(0)], 16)) return v4Blocked(embedded(2));
  // Teredo (2001::/32), Dokumentation (2001:db8::/32), Discard (100::/64).
  if (startsWith(b, [0x20, 0x01, 0, 0, ...Array(12).fill(0)], 32)) return true;
  if (startsWith(b, [0x20, 0x01, 0x0d, 0xb8, ...Array(12).fill(0)], 32)) return true;
  if (startsWith(b, [0x01, ...Array(15).fill(0)], 64)) return true;
  // Unique Local (fc00::/7), Link-Local (fe80::/10), Site-Local (fec0::/10), Multicast (ff00::/8).
  if ((b[0] & 0xfe) === 0xfc) return true;
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true;
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0xc0) return true;
  if (b[0] === 0xff) return true;
  // Öffentlich ist nur Global Unicast (2000::/3).
  return (b[0] & 0xe0) !== 0x20;
}

// Darf zu dieser IP-Adresse verbunden werden? true heißt: gesperrt. Unbekanntes Format ist gesperrt.
export function privateAddress(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, "");
  const v4 = v4Of(clean);
  if (v4) return v4Blocked(v4);
  const bytes = clean.includes(":") ? v6Bytes(clean) : null;
  return bytes ? v6Blocked(bytes) : true;
}

// Namen, die nie ins Internet zeigen.
export function privateName(name: string): boolean {
  const host = name.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
  if (isIpLiteral(host)) return privateAddress(host);
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (/\.(local|lan|home|internal|intranet|corp|box|fritz\.box|arpa)$/.test(host)) return true;
  // Ohne Punkt ist es ein Name im eigenen Netz.
  return !host.includes(".");
}

// Ist der Name eine IP-Adresse (IPv4 oder IPv6)?
export const isIpLiteral = (host: string) => {
  const clean = host.replace(/^\[|\]$/g, "");
  return v4Of(clean) !== null || (clean.includes(":") && v6Bytes(clean) !== null);
};
