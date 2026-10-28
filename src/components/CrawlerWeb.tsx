"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getJson } from "@/lib/api";
import { formatClock } from "@/lib/format";
import type { MarketSnapshot } from "@/lib/market";
import type { CoinVerdict, CrawlEvent, CrawlState, CrawlStep, CrawlTrail, DeskSnapshot } from "@/lib/paper";
import { useNow } from "@/lib/useNow";

// Die Spinne aus dem GrokBot-Video. Das Netz ist filter.py: Jeder Coin hängt an einem Faden. Außen kommen
// sie aus dem Scan herein, jede Prüfung ist ein Ring weiter innen (vet, chain_kill, skin_kill, x_kill,
// pick), in der Mitte liegt, was gekauft ist. Wo ein Coin hängen bleibt, ist er dort rausgeflogen.
// Die Spinne ist der Crawler: Sie läuft in Echtzeit zu dem Coin, den der Desk gerade prüft, und spannt
// einen Faden zu der Quelle, die sie liest. Die Schritte kommen jede Sekunde von /api/handel/spur.

type Ring = 0 | 1 | 2 | 3 | 4 | 5;
type NodeState = CrawlState | "wartet";
type SourceId = "chain" | "site" | "x" | "chief";
type Pt = { x: number; y: number };

const RING_LABELS = ["vet", "chain_kill", "skin_kill", "x_kill", "pick"];
const RADII = [1, 0.8, 0.62, 0.45, 0.29, 0.11];
const RING_OF: Record<CrawlStep, Ring> = { scan: 0, chain: 1, site: 2, x: 3, chief: 4, fills: 5, guard: 5, intel: 0 };
const VERDICT_AT: Record<CoinVerdict["stage"], [Ring, NodeState]> = {
  chain_kill: [1, "raus"],
  skin_kill: [2, "raus"],
  x_kill: [3, "raus"],
  chief_nein: [4, "raus"],
  nicht_gekauft: [4, "warn"],
  nicht_geprueft: [1, "warn"],
  gekauft: [5, "gekauft"],
};

const SOURCES: { id: SourceId; label: string; detail: string }[] = [
  { id: "chain", label: "RugCheck", detail: "Blockchain" },
  { id: "site", label: "Webseite", detail: "Projekt" },
  { id: "chief", label: "Chief", detail: "weiche Filter" },
  { id: "x", label: "X · Grok", detail: "Beiträge" },
];
const SOURCE_OF: Partial<Record<CrawlStep, SourceId>> = { chain: "chain", guard: "chain", site: "site", x: "x", chief: "chief" };

const COLOR: Record<NodeState, string> = {
  wartet: "#4ade80",
  ok: "#22c55e",
  laeuft: "#e0f2fe",
  raus: "#ef4444",
  warn: "#f59e0b",
  gekauft: "#38bdf8",
};
// Wie im Video: orange Fäden, grüne Gelenke.
const SILK = "#fb923c";
const JOINT = "#4ade80";

const STATE_ICON: Record<CrawlState, { icon: string; tone: string; label: string }> = {
  laeuft: { icon: "◌", tone: "text-sky-200", label: "läuft" },
  ok: { icon: "✓", tone: "text-up", label: "weiter" },
  raus: { icon: "✕", tone: "text-down", label: "raus" },
  warn: { icon: "!", tone: "text-amber-300", label: "unklar" },
  gekauft: { icon: "★", tone: "text-sky-300", label: "gekauft" },
};

// Ein Schritt bleibt mindestens so lange auf dem Bildschirm, damit du ihn siehst, auch wenn RugCheck
// in einer Zehntelsekunde antwortet. Stauen sich viele, läuft die Spinne schneller.
const stepMs = (queued: number) => (queued > 12 ? 160 : queued > 5 ? 380 : 700);
// Ein Schritt, der so lange „läuft“, ist liegen geblieben, etwa weil der Server neu gestartet wurde.
const STALE_MS = 3 * 60_000;
const LINGER_MS = 2500;

// ---------- Geometrie ----------

type Geo = { W: number; H: number; cx: number; cy: number; R: number; slots: number; s: number; sources: Record<SourceId, Pt & { side: "links" | "rechts" }> };

function geometry(W: number): Geo {
  const wide = W >= 600;
  const H = wide ? 400 : Math.round(W * 1.12);
  const cx = W / 2;
  const cy = H / 2;
  const R = wide ? Math.min(H / 2 - 34, W / 2 - 150) : Math.min(W / 2 - 54, H / 2 - 62);
  const slots = wide ? 20 : 14;
  const off = wide ? Math.min(W / 2 - 18, R + 170) : W / 2 - 18;
  const dy = wide ? R * 0.62 : H / 2 - 22;
  return {
    W,
    H,
    cx,
    cy,
    R,
    slots,
    s: R / 160,
    sources: {
      chain: { x: cx - off, y: cy - dy, side: "links" },
      site: { x: cx + off, y: cy - dy, side: "rechts" },
      chief: { x: cx - off, y: cy + dy, side: "links" },
      x: { x: cx + off, y: cy + dy, side: "rechts" },
    },
  };
}

const angleOf = (g: Geo, slot: number) => -Math.PI / 2 + ((slot + 0.5) * 2 * Math.PI) / g.slots;

function pointOf(g: Geo, slot: number, ring: number): Pt {
  const r = g.R * RADII[ring];
  const a = angleOf(g, slot);
  return { x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a) };
}

// Das Netz: Speichen von außen zur Mitte und die Ringe als leicht durchhängende Fäden.
function webPaths(g: Geo): { spokes: string; rings: string[] } {
  const f = (n: number) => n.toFixed(1);
  let spokes = "";
  for (let k = 0; k < g.slots; k++) {
    const a = angleOf(g, k);
    const r = g.R * 1.07;
    spokes += `M${f(g.cx + r * Math.cos(a))},${f(g.cy + r * Math.sin(a))}L${f(g.cx)},${f(g.cy)}`;
  }
  const rings = RADII.slice(0, 5).map((radius) => {
    const r = g.R * radius;
    let d = "";
    for (let k = 0; k <= g.slots; k++) {
      const a = angleOf(g, k % g.slots);
      const p = { x: g.cx + r * Math.cos(a), y: g.cy + r * Math.sin(a) };
      if (k === 0) {
        d += `M${f(p.x)},${f(p.y)}`;
        continue;
      }
      const m = a - Math.PI / g.slots;
      const sag = r * Math.cos(Math.PI / g.slots) * 0.93;
      d += `Q${f(g.cx + sag * Math.cos(m))},${f(g.cy + sag * Math.sin(m))} ${f(p.x)},${f(p.y)}`;
    }
    return d;
  });
  return { spokes, rings };
}

// ---------- Daten ----------

type Coin = { address: string; symbol: string; ring: Ring; state: NodeState; text: string; held: boolean; recent: boolean };

function coinsOf(snap: MarketSnapshot | null, desk: DeskSnapshot | null, events: CrawlEvent[], now: number, slots: number): Coin[] {
  const coins = new Map<string, Coin>();
  const verdicts = desk?.verdicts ?? {};
  for (const c of snap?.scan.candidates ?? []) {
    const failed = c.checks.find((check) => !check.ok);
    const coin: Coin = c.passed
      ? { address: c.address, symbol: c.symbol, ring: 0, state: "wartet", text: "hat die harten Filter bestanden, der Crawler prüft ihn als Nächstes", held: false, recent: false }
      : { address: c.address, symbol: c.symbol, ring: 0, state: "raus", text: `raus bei vet: ${failed?.label ?? "harte Filter"}`, held: false, recent: false };
    const v = verdicts[c.address];
    if (c.passed && v) {
      const [ring, state] = VERDICT_AT[v.stage];
      Object.assign(coin, { ring: v.stage === "nicht_geprueft" && v.text.startsWith("X") ? 3 : ring, state, text: v.text });
    }
    coins.set(c.address, coin);
  }
  for (const p of desk?.positions ?? []) {
    coins.set(p.address, { address: p.address, symbol: p.symbol, ring: 5, state: "gekauft", text: `gekauft: ${p.why}`, held: true, recent: false });
  }
  // Was die Spinne eben gemeldet hat, ist neuer als der Stand der letzten Abfrage.
  for (const e of events) {
    if (!e.address) continue;
    const coin = coins.get(e.address);
    const verdict = verdicts[e.address];
    if (verdict && Date.parse(verdict.at) > Date.parse(e.at)) continue;
    if (coin?.held && e.step !== "guard" && e.step !== "fills") continue;
    if (!coin && now - Date.parse(e.at) > 15 * 60_000) continue;
    const ring = e.step === "fills" && e.state === "warn" ? 4 : RING_OF[e.step];
    const state: NodeState = coin?.held && e.state === "ok" ? "gekauft" : e.state;
    coins.set(e.address, { address: e.address, symbol: e.symbol, ring, state, text: e.text, held: coin?.held ?? e.state === "gekauft", recent: now - Date.parse(e.at) < 15 * 60_000 });
  }
  // Mehr Coins als Fäden: Gekaufte und gerade geprüfte zuerst, dann die, die den Vet bestanden haben.
  const rank = (c: Coin) => (c.held ? 0 : c.recent ? 1 : c.state !== "raus" || c.ring > 0 ? 2 : 3);
  return [...coins.values()].sort((a, b) => rank(a) - rank(b)).slice(0, slots);
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

// Liest die Spur jede Sekunde, solange der Desk arbeitet, sonst alle fünf Sekunden.
function useTrail(fast: boolean) {
  const [trail, setTrail] = useState<{ events: CrawlEvent[]; info: Omit<CrawlTrail, "events">; first: number } | null>(null);
  const seq = useRef(0);
  const events = useRef<CrawlEvent[]>([]);
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (!document.hidden) {
        try {
          const next = await getJson<CrawlTrail>(`/api/handel/spur?nach=${seq.current}`);
          if (stop) return;
          const restarted = next.seq < seq.current;
          const first = restarted || seq.current === 0;
          const known = restarted ? [] : events.current;
          events.current = [...known, ...next.events.filter((e) => !known.some((k) => k.seq === e.seq))].slice(-150);
          seq.current = next.seq;
          setTrail((prev) => ({ events: events.current, info: { seq: next.seq, status: next.status, lastTickAt: next.lastTickAt, tickMs: next.tickMs }, first: first ? next.seq : (prev?.first ?? next.seq) }));
        } catch {
          // Beim nächsten Mal wieder.
        }
      }
      if (!stop) timer = setTimeout(poll, fast ? 1000 : 5000);
    };
    void poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [fast]);
  return trail;
}

// Spielt neue Schritte nacheinander ab. Was beim Öffnen der Seite schon geschehen war, steht sofort da.
function usePlayback(events: CrawlEvent[], first: number): { cursor: number; playedAt: number } {
  const [play, setPlay] = useState({ cursor: 0, playedAt: 0 });
  const latest = useRef({ events, first });
  useEffect(() => {
    latest.current = { events, first };
  }, [events, first]);
  useEffect(() => {
    const timer = setInterval(() => {
      setPlay((p) => {
        const from = Math.max(p.cursor, latest.current.first);
        const queue = latest.current.events.filter((e) => e.seq > from);
        if (queue.length === 0 || Date.now() - p.playedAt < stepMs(queue.length)) return from === p.cursor ? p : { ...p, cursor: from };
        return { cursor: queue[0].seq, playedAt: Date.now() };
      });
    }, 100);
    return () => clearInterval(timer);
  }, []);
  return { cursor: Math.max(play.cursor, first), playedAt: play.playedAt };
}

// ---------- Die Spinne ----------

type Leg = { foot: Pt; from: Pt; to: Pt; t: number };
type Mode = { kind: "arbeit" | "frei" | "schlaf"; target: Pt | null; source: Pt | null };

const LEG_ANGLES = [-0.55, -1.15, -1.9, -2.55, 0.55, 1.15, 1.9, 2.55];
const LEG_LENGTH = [56, 48, 46, 52, 56, 48, 46, 52];
// Zwei Vierergruppen, die abwechselnd treten, wie bei echten Spinnen.
const GROUP = [0, 1, 0, 1, 1, 0, 1, 0];
const BODY = [
  [0, 14],
  [1.05, 10],
  [2.1, 12],
  [Math.PI, 10],
  [-2.1, 12],
  [-1.05, 10],
  [Math.PI - 0.35, 22],
  [Math.PI + 0.35, 22],
  [Math.PI, 31],
] as const;
const EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [0, 2],
  [2, 4],
  [4, 0],
  [1, 4],
  [2, 6],
  [3, 6],
  [3, 7],
  [4, 7],
  [6, 7],
  [6, 8],
  [7, 8],
];

// Der Umriss von Kopf und Hinterleib, leicht gefüllt, damit man den Körper erkennt.
const HULL = [0, 1, 2, 6, 8, 7, 4, 5];

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const polar = (p: Pt, angle: number, r: number): Pt => ({ x: p.x + Math.cos(angle) * r, y: p.y + Math.sin(angle) * r });
const turn = (from: number, to: number, k: number) => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k;

function Spider({ geo, mode }: { geo: Geo; mode: Mode }) {
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  const bodyEdges = useRef<SVGPathElement>(null);
  const hull = useRef<SVGPathElement>(null);
  const legPath = useRef<SVGPathElement>(null);
  const silk = useRef<SVGPathElement>(null);
  const joints = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const g = geo;
    const s = g.s;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Die Füße greifen an den Kreuzungen des Netzes.
    const anchors: Pt[] = [{ x: g.cx, y: g.cy }];
    for (let k = 0; k < g.slots; k++) for (let r = 0; r < 5; r++) anchors.push(pointOf(g, k, r));
    let pos: Pt = { x: g.cx, y: g.cy };
    let heading = -Math.PI / 2;
    let wander: Pt | null = null;
    let wanderAt = 0;
    const legs: Leg[] = LEG_ANGLES.map((a, i) => {
      const foot = polar(pos, heading + a, LEG_LENGTH[i] * s);
      return { foot, from: foot, to: foot, t: 1 };
    });
    let last = performance.now();
    let raf = 0;
    const f = (n: number) => n.toFixed(1);

    const nearestAnchor = (want: Pt, reach: number): Pt => {
      let best: Pt | null = null;
      let bestD = reach * 0.35;
      for (const a of anchors) {
        const d = dist(a, want);
        if (d < bestD && dist(a, pos) > reach * 0.45) {
          best = a;
          bestD = d;
        }
      }
      return best ?? want;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = modeRef.current;
      const asleep = m.kind === "schlaf";

      // Ohne Auftrag streift die Spinne langsam durchs Netz.
      let target = m.target;
      if (m.kind === "frei") {
        if (!wander || now > wanderAt || dist(pos, wander) < 2) {
          const slot = Math.floor(Math.random() * g.slots);
          wander = pointOf(g, slot, 1 + Math.floor(Math.random() * 4));
          wanderAt = now + 4000 + Math.random() * 4000;
        }
        target = wander;
      }
      if (asleep) target = { x: g.cx, y: g.cy };
      if (target) {
        const d = dist(pos, target);
        if (reduce) pos = target;
        else if (d > 0.5) {
          const speed = (m.kind === "arbeit" ? 150 : 28) * s;
          const step = Math.min(d, speed * dt * (d < 20 * s ? Math.max(0.35, d / (20 * s)) : 1));
          const a = Math.atan2(target.y - pos.y, target.x - pos.x);
          pos = polar(pos, a, step);
          if (d > 3) heading = turn(heading, a, 1 - Math.exp(-dt * 7));
        }
      }

      // Körper: ein kleines Netz aus Knoten wie im Video, das leicht atmet.
      const breathe = asleep ? 0.03 : 0.07;
      const body = BODY.map(([a, r], j) => polar(pos, heading + a + Math.sin(now / 900 + j) * 0.04, r * s * (1 + Math.sin(now / 420 + j * 1.7) * breathe)));
      let d = "";
      for (const [a, b] of EDGES) d += `M${f(body[a].x)},${f(body[a].y)}L${f(body[b].x)},${f(body[b].y)}`;
      bodyEdges.current?.setAttribute("d", d);
      hull.current?.setAttribute("d", `M${HULL.map((j) => `${f(body[j].x)},${f(body[j].y)}`).join("L")}Z`);

      // Beine: Ein Fuß bleibt stehen, bis er zu weit hinten ist; dann greift er die nächste Kreuzung.
      const stepping = [0, 0];
      legs.forEach((l, i) => {
        if (l.t < 1) stepping[GROUP[i]]++;
      });
      let legsD = "";
      legs.forEach((l, i) => {
        const reach = LEG_LENGTH[i] * s * (asleep ? 0.5 : 1);
        const hip = polar(pos, heading + LEG_ANGLES[i] * 0.8, 8 * s);
        const want = polar(pos, heading + LEG_ANGLES[i], reach);
        if (asleep || reduce) {
          l.foot = want;
          l.t = 1;
        } else if (l.t < 1) {
          l.t = Math.min(1, l.t + dt / 0.13);
          const e = l.t < 0.5 ? 2 * l.t * l.t : 1 - (-2 * l.t + 2) ** 2 / 2;
          l.foot = lerp(l.from, l.to, e);
        } else if (dist(l.foot, want) > reach * 0.45 && stepping[1 - GROUP[i]] === 0) {
          l.from = l.foot;
          l.to = nearestAnchor(want, reach);
          l.t = 0;
          stepping[GROUP[i]]++;
        }
        // Zwei Glieder: Das Knie liegt dort, wo beide Längen passen, und zeigt vom Körper weg.
        const seg = (LEG_LENGTH[i] * s * 0.62) * (asleep ? 0.6 : 1);
        const span = Math.min(dist(hip, l.foot), 2 * seg - 0.01) || 0.01;
        const ux = (l.foot.x - hip.x) / (dist(hip, l.foot) || 1);
        const uy = (l.foot.y - hip.y) / (dist(hip, l.foot) || 1);
        const h = Math.sqrt(Math.max(0, seg * seg - (span / 2) ** 2));
        const base = { x: hip.x + (ux * span) / 2, y: hip.y + (uy * span) / 2 };
        const k1 = { x: base.x - uy * h, y: base.y + ux * h };
        const k2 = { x: base.x + uy * h, y: base.y - ux * h };
        const out = dist(k1, pos) > dist(k2, pos) ? k1 : k2;
        const lift = l.t < 1 ? Math.sin(Math.PI * l.t) * 6 * s : 0;
        const away = dist(out, pos) || 1;
        const knee = { x: out.x + ((out.x - pos.x) / away) * lift, y: out.y + ((out.y - pos.y) / away) * lift };
        legsD += `M${f(hip.x)},${f(hip.y)}L${f(knee.x)},${f(knee.y)}L${f(l.foot.x)},${f(l.foot.y)}`;
        joints.current[8 + i * 2]?.setAttribute("cx", f(knee.x));
        joints.current[8 + i * 2]?.setAttribute("cy", f(knee.y));
        joints.current[9 + i * 2]?.setAttribute("cx", f(l.foot.x));
        joints.current[9 + i * 2]?.setAttribute("cy", f(l.foot.y));
      });
      legPath.current?.setAttribute("d", legsD);
      body.forEach((p, j) => {
        joints.current[j]?.setAttribute("cx", f(p.x));
        joints.current[j]?.setAttribute("cy", f(p.y));
      });

      // Der Faden zur Quelle, die gerade gelesen wird.
      if (silk.current) {
        if (m.source && !asleep) {
          const ctrl = { x: (pos.x + m.source.x) / 2, y: Math.max(pos.y, m.source.y) + 24 * s };
          silk.current.setAttribute("d", `M${f(pos.x)},${f(pos.y)}Q${f(ctrl.x)},${f(ctrl.y)} ${f(m.source.x)},${f(m.source.y)}`);
          silk.current.style.opacity = "1";
        } else silk.current.style.opacity = "0";
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geo]);

  const asleep = mode.kind === "schlaf";
  return (
    <g aria-hidden className="transition-opacity duration-700" style={{ opacity: asleep ? 0.5 : 1 }}>
      <path ref={silk} fill="none" stroke="#fde68a" strokeWidth={1.2} strokeDasharray="2 5" className="spider-silk" style={{ opacity: 0 }} />
      <g style={{ filter: asleep ? undefined : "drop-shadow(0 0 5px rgba(251,146,60,0.65))" }}>
        <path ref={hull} fill={SILK} fillOpacity={0.16} stroke="none" />
        <path ref={legPath} fill="none" stroke={SILK} strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" />
        <path ref={bodyEdges} fill="none" stroke={SILK} strokeWidth={1.2} strokeLinecap="round" />
        {Array.from({ length: 24 }, (_, i) => (
          <circle
            key={i}
            ref={(el) => {
              joints.current[i] = el;
            }}
            r={i < 8 ? 2.4 : i % 2 === 0 ? 1.9 : 1.6}
            fill={JOINT}
            cx={geo.cx}
            cy={geo.cy}
          />
        ))}
      </g>
    </g>
  );
}

// ---------- Die Ansicht ----------

export function CrawlerWeb({ snap, desk }: { snap: MarketSnapshot | null; desk: DeskSnapshot | null }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const working = desk?.status === "laeuft" || desk?.status === "tageslimit" || desk?.status === "pausiert";
  const trail = useTrail(working);
  const events = useMemo(() => trail?.events ?? [], [trail]);
  const { cursor, playedAt } = usePlayback(events, trail?.first ?? 0);
  const now = useNow(1000);
  const nowMs = now?.getTime() ?? 0;

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => (width ? geometry(width) : null), [width]);
  const paths = useMemo(() => (geo ? webPaths(geo) : null), [geo]);
  const shown = useMemo(() => events.filter((e) => e.seq <= cursor), [events, cursor]);
  const current = shown.at(-1) ?? null;
  const coins = useMemo(() => coinsOf(snap, desk, shown, nowMs, geo?.slots ?? 20), [snap, desk, shown, nowMs, geo?.slots]);

  // Jeder Coin hat seinen Faden aus seiner Adresse, damit er nicht springt, wenn andere dazukommen.
  const placed = useMemo(() => {
    const slots = geo?.slots ?? 20;
    const used = new Set<number>();
    const slotOf = new Map<string, number>();
    for (const c of [...coins].sort((a, b) => hash(a.address) - hash(b.address))) {
      let k = hash(c.address) % slots;
      while (used.has(k)) k = (k + 1) % slots;
      used.add(k);
      slotOf.set(c.address, k);
    }
    return coins.map((c) => ({ ...c, slot: slotOf.get(c.address)! }));
  }, [coins, geo?.slots]);

  // Wohin die Spinne läuft und welche Quelle sie liest.
  const fresh = current && nowMs - Date.parse(current.at) < STALE_MS;
  const busy = Boolean(fresh && current!.state === "laeuft");
  const lingering = current && nowMs - playedAt < LINGER_MS;
  const focus = current?.address ? placed.find((c) => c.address === current.address) : undefined;
  const sourceId = busy ? SOURCE_OF[current!.step] : undefined;
  const mode: Mode = useMemo(() => {
    if (!desk || desk.status === "aus" || desk.status === "notaus" || !geo) return { kind: "schlaf", target: null, source: null };
    if (focus && (busy || lingering)) {
      const ring = current!.step === "fills" && current!.state === "warn" ? 4 : RING_OF[current!.step];
      const src = sourceId ? geo.sources[sourceId] : null;
      return { kind: "arbeit", target: pointOf(geo, focus.slot, ring), source: src ? { x: src.x + (src.side === "links" ? 7 : -7), y: src.y } : null };
    }
    return { kind: "frei", target: null, source: null };
  }, [desk, geo, focus, busy, lingering, current, sourceId]);

  const sweepKey = current?.step === "scan" && current.state === "ok" ? current.seq : null;
  const xOff = desk ? !desk.x.enabled : false;

  return (
    <section className="grid gap-3 rounded-md border border-line bg-panel p-3 lg:grid-cols-3">
      <div className="min-w-0 lg:col-span-2">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: SILK }}>
            Crawler · live
          </h2>
          <span className="text-[11px] text-quiet">die Spinne aus dem Video: jeder Coin, jede Prüfung, in Echtzeit</span>
        </div>
        <div ref={box} className="relative w-full" style={{ height: geo?.H ?? 400 }}>
          {geo && paths && (
            <svg width={geo.W} height={geo.H} viewBox={`0 0 ${geo.W} ${geo.H}`} className="absolute inset-0" role="img" aria-label="Netz der Prüfungen mit der Crawler-Spinne">
              <defs>
                <radialGradient id="web-glow">
                  <stop offset="0%" stopColor="#fb923c" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                </radialGradient>
              </defs>
              <circle cx={geo.cx} cy={geo.cy} r={geo.R * 1.1} fill="url(#web-glow)" />
              <path d={paths.spokes} stroke="rgba(186,230,253,0.16)" strokeWidth={1} fill="none" />
              {paths.rings.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={i === 3 && xOff ? "rgba(186,230,253,0.07)" : "rgba(186,230,253,0.2)"} strokeWidth={1} strokeDasharray={i === 3 && xOff ? "3 4" : undefined} />
              ))}
              {RING_LABELS.map((label, i) => (
                <text key={label} x={geo.cx} y={geo.cy - geo.R * RADII[i] + 11} textAnchor="middle" fontSize={9} fill="#8b90b5" letterSpacing={0.5}>
                  {i === 3 && xOff ? "x_kill · aus" : label}
                </text>
              ))}
              {sweepKey !== null && (
                <line
                  key={sweepKey}
                  x1={geo.cx}
                  y1={geo.cy}
                  x2={geo.cx}
                  y2={geo.cy - geo.R * 1.07}
                  stroke={SILK}
                  strokeWidth={1.5}
                  className="spider-sweep"
                  style={{ transformOrigin: `${geo.cx}px ${geo.cy}px` }}
                />
              )}

              {SOURCES.map((src) => {
                const p = geo.sources[src.id];
                const active = sourceId === src.id;
                const dim = src.id === "x" && xOff;
                const left = p.side === "links";
                const dot = left ? p.x + 7 : p.x - 7;
                return (
                  <g key={src.id} opacity={dim ? 0.35 : 1}>
                    {active && <circle cx={dot} cy={p.y} r={7} fill="none" stroke="#fde68a" strokeWidth={1.5} className="spider-pulse" />}
                    <circle cx={dot} cy={p.y} r={4.5} fill={active ? "#fde68a" : "#151938"} stroke={active ? "#fde68a" : SILK} strokeWidth={1.2} />
                    <text x={left ? dot + 10 : dot - 10} y={p.y - 1} textAnchor={left ? "start" : "end"} fontSize={11} fontWeight={700} fill={active ? "#fde68a" : "#e5e7eb"}>
                      {src.label}
                    </text>
                    <text x={left ? dot + 10 : dot - 10} y={p.y + 11} textAnchor={left ? "start" : "end"} fontSize={9} fill="#8b90b5">
                      {dim ? "aus, kein xAI-Schlüssel" : src.detail}
                    </text>
                  </g>
                );
              })}

              {placed.map((c) => {
                const p = pointOf(geo, c.slot, c.ring);
                const outer = pointOf(geo, c.slot, 0);
                const a = angleOf(geo, c.slot);
                const lx = geo.cx + (geo.R + 9) * Math.cos(a);
                const ly = geo.cy + (geo.R + 9) * Math.sin(a);
                const anchor = Math.cos(a) > 0.25 ? "start" : Math.cos(a) < -0.25 ? "end" : "middle";
                const working = focus?.address === c.address && busy;
                const color = working ? COLOR.laeuft : COLOR[c.state];
                const label = c.state === "wartet" ? "wartet" : STATE_ICON[c.state as CrawlState].label;
                return (
                  <g key={c.address}>
                    <title>{`$${c.symbol} · ${RING_LABELS[c.ring] ?? "gekauft"} · ${label}: ${c.text}`}</title>
                    {c.ring > 0 && <line x1={outer.x} y1={outer.y} x2={p.x} y2={p.y} stroke={color} strokeOpacity={0.45} strokeWidth={1.4} />}
                    {working && <circle cx={p.x} cy={p.y} r={6} fill="none" stroke={color} strokeWidth={1.5} className="spider-pulse" />}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={c.state === "gekauft" ? 5 : 4}
                      fill={c.state === "wartet" ? "#10132a" : color}
                      stroke={color}
                      strokeWidth={1.5}
                      opacity={c.state === "raus" && c.ring === 0 ? 0.55 : 1}
                    />
                    <text
                      x={lx}
                      y={ly + (anchor === "middle" ? (Math.sin(a) > 0 ? 9 : -3) : 3)}
                      textAnchor={anchor}
                      fontSize={geo.W < 600 ? 9 : 10}
                      fontWeight={working || c.held ? 700 : 400}
                      fill={working ? "#fde68a" : c.held ? "#7dd3fc" : c.state === "raus" && c.ring === 0 ? "#5d6390" : "#c7cbe6"}
                    >
                      ${c.symbol.slice(0, 9)}
                    </text>
                  </g>
                );
              })}

              <Spider geo={geo} mode={mode} />

              {mode.kind === "schlaf" && (
                <text x={geo.cx} y={geo.cy + geo.R * 0.42} textAnchor="middle" fontSize={11} fill="#8b90b5">
                  {desk?.status === "notaus" ? "Not-Aus: die Spinne steht" : "schläft, bis der Spielgeld-Handel läuft"}
                </text>
              )}
            </svg>
          )}
        </div>
        <Legend />
      </div>
      <Feed events={shown} current={current} busy={busy} desk={desk} trail={trail?.info ?? null} now={now} />
    </section>
  );
}

function Legend() {
  const items: [NodeState, string][] = [
    ["wartet", "wartet auf den Crawler"],
    ["ok", "Prüfung bestanden"],
    ["raus", "dort rausgeflogen"],
    ["warn", "nicht sicher prüfbar, kein Kauf"],
    ["gekauft", "gekauft, wird bewacht"],
  ];
  return (
    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-quiet">
      {items.map(([state, text]) => (
        <li key={state} className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full border" style={{ borderColor: COLOR[state], background: state === "wartet" ? "transparent" : COLOR[state] }} />
          {text}
        </li>
      ))}
    </ul>
  );
}

const STEP_LABEL: Record<CrawlStep, string> = {
  scan: "scan",
  chain: "chain",
  site: "seite",
  x: "x",
  chief: "chief",
  fills: "fills",
  guard: "wache",
  intel: "intel",
};

function Feed({
  events,
  current,
  busy,
  desk,
  trail,
  now,
}: {
  events: CrawlEvent[];
  current: CrawlEvent | null;
  busy: boolean;
  desk: DeskSnapshot | null;
  trail: Omit<CrawlTrail, "events"> | null;
  now: Date | null;
}) {
  // Gleiche Scan-Runden hintereinander nur einmal, mit Zähler.
  const latest: (CrawlEvent & { times: number })[] = [];
  for (const e of [...events].reverse()) {
    const prev = latest.at(-1);
    if (prev && e.step === "scan" && prev.step === "scan" && prev.text === e.text) prev.times++;
    else latest.push({ ...e, times: 1 });
    if (latest.length >= 12) break;
  }
  const seconds = busy && current && now ? Math.max(0, Math.round((now.getTime() - Date.parse(current.at)) / 1000)) : 0;
  const nextTick = trail?.lastTickAt && now ? Math.max(0, Math.round((Date.parse(trail.lastTickAt) + trail.tickMs - now.getTime()) / 1000)) : null;
  let headline: string;
  if (!desk || desk.status === "aus") headline = "Die Spinne schläft. Sie läuft los, sobald du den Spielgeld-Handel startest.";
  else if (desk.status === "notaus") headline = "Not-Aus: Die Spinne steht, bis du weitermachst.";
  else if (busy && current) headline = `${current.symbol ? `$${current.symbol}: ` : ""}${current.text} · ${seconds} s`;
  else if (desk.status === "laeuft") headline = `Wartet auf neue Coins${nextTick !== null ? ` · nächste Runde in ${nextTick} s` : ""}`;
  else headline = desk.status === "pausiert" ? "Pause: Die Spinne bewacht nur die gekauften Coins." : "Tageslimit: Heute kauft der Desk nichts mehr, die Spinne bewacht die gekauften Coins.";

  return (
    <div className="flex min-w-0 flex-col gap-2 text-xs">
      <div className="rounded border border-line bg-panel-2 px-3 py-2" aria-live="polite">
        <p className="text-[10px] uppercase tracking-widest text-quiet">Gerade</p>
        <p className={`mt-0.5 ${busy ? "text-amber-100" : "text-ink"}`}>{headline}</p>
      </div>
      <ol className="flex max-h-[330px] flex-col gap-1 overflow-y-auto">
        {latest.map((e) => {
          const s = STATE_ICON[e.state];
          return (
            <li key={e.seq} className="flex gap-2 rounded px-1 py-0.5 hover:bg-panel-2">
              <span className="shrink-0 tabular-nums text-quiet">{formatClock(new Date(e.at))}</span>
              <span className={`w-3 shrink-0 text-center font-bold ${s.tone} ${e.seq === current?.seq && busy ? "animate-pulse" : ""}`} title={s.label}>
                {s.icon}
              </span>
              <span className="w-10 shrink-0 font-bold uppercase" style={{ color: SILK }}>
                {STEP_LABEL[e.step]}
              </span>
              <span className="min-w-0">
                {e.symbol && <span className="font-bold">${e.symbol} </span>}
                <span className={e.state === "raus" ? "text-down" : e.state === "warn" ? "text-amber-200" : e.state === "gekauft" ? "text-sky-300" : "text-quiet"}>{e.text}</span>
                {e.times > 1 && <span className="text-quiet"> · {e.times} Runden</span>}
              </span>
            </li>
          );
        })}
        {latest.length === 0 && (
          <li className="text-quiet">{desk && desk.status !== "aus" ? "Noch keine Schritte seit dem Start von JARVIS. Die nächste Runde kommt gleich." : "Hier steht gleich jeder Schritt der Spinne."}</li>
        )}
      </ol>
    </div>
  );
}
