import * as THREE from "three";
import { beam, seeded } from "./rocks";
import type { Feature } from "@/lib/world";

// Was jede Landschaft besonders macht. Kommst du an, schiebt sich das Besondere aus der Ferne heran
// und leuchtet auf; beim Wegfliegen verblasst es. „strength“ ist dabei 0 (weg) bis 1 (ganz da).

export type FeatureObject = { group: THREE.Group; update: (t: number, strength: number) => void };

const additive = (color: THREE.ColorRepresentation, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });

// Fade: alle Materialien in der Gruppe auf ihre Grunddeckkraft mal strength setzen.
function fader(group: THREE.Group) {
  const materials: { m: THREE.Material & { opacity: number }; base: number }[] = [];
  group.traverse((o) => {
    const m = (o as THREE.Mesh).material as (THREE.Material & { opacity: number }) | undefined;
    if (m && !materials.some((x) => x.m === m)) materials.push({ m, base: m.opacity });
  });
  return (strength: number) => {
    for (const { m, base } of materials) m.opacity = base * strength;
    group.visible = strength > 0.002;
    // Aus der Ferne heranschweben.
    group.position.z = -(1 - strength) * 45;
  };
}

// Kalender: Zeitringe am Himmel, die sich wie ein Uhrwerk gegeneinander drehen.
function rings(): FeatureObject {
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.position.set(0, 13, -62);
  group.add(holder);
  const amber = new THREE.Color("#fbbf24");
  const teal = new THREE.Color("#5eead4");
  const parts: THREE.Object3D[] = [];
  [11, 15.5, 20].forEach((r, i) => {
    const ring = new THREE.Group();
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.06 + i * 0.02, 6, 160), additive(i === 1 ? amber : teal, 0.9)));
    // Striche wie auf einem Zifferblatt.
    const ticks = i === 2 ? 60 : 12;
    const tick = new THREE.BoxGeometry(0.08, i === 2 ? 0.6 : 1.4, 0.08);
    const mat = additive(i === 1 ? amber : teal, 0.8);
    for (let k = 0; k < ticks; k++) {
      const a = (k / ticks) * Math.PI * 2;
      const m = new THREE.Mesh(tick, mat);
      m.position.set(Math.cos(a) * (r - 0.9), Math.sin(a) * (r - 0.9), 0);
      m.rotation.z = a + Math.PI / 2;
      if (i === 2 && k % 5 === 0) m.scale.y = 2.2;
      ring.add(m);
    }
    ring.rotation.x = 0.18 * (i - 1);
    holder.add(ring);
    parts.push(ring);
  });
  // Ein Zeiger, der langsam umläuft.
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 9.5, 0.12), additive(amber, 0.85));
  hand.geometry.translate(0, 4.75, 0);
  holder.add(hand);
  const fade = fader(group);
  return {
    group,
    update(t, s) {
      fade(s);
      parts.forEach((p, i) => (p.rotation.z = t * (i % 2 ? -0.05 : 0.035) * (i + 1)));
      hand.rotation.z = -t * 0.12;
    },
  };
}

// Aufgaben: Leuchtfeuer, die aus dem Gelände in den Himmel steigen, eins für jeden offenen Punkt.
function beacons(): FeatureObject {
  const group = new THREE.Group();
  const spots = [
    [-20, -28],
    [14, -36],
    [-7, -52],
    [27, -60],
    [-32, -66],
    [4, -82],
    [38, -44],
    [-16, -95],
  ];
  const beams = spots.map(([x, z], i) => {
    const b = beam(new THREE.Color(i % 3 ? "#4ade80" : "#a3e635"), 0.35, 0.05, 46);
    b.mesh.position.set(x, -6, z);
    group.add(b.mesh);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 40), additive("#86efac", 0.8));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, -4.2, z);
    group.add(ring);
    return { b, ring, phase: i * 0.8 };
  });
  const fade = fader(group);
  return {
    group,
    update(t, s) {
      fade(s);
      for (const { b, ring, phase } of beams) {
        b.uniforms.uTime.value = t;
        b.uniforms.uOpacity.value = s * (0.55 + 0.25 * Math.sin(t * 1.3 + phase));
        const k = (t * 0.5 + phase) % 1;
        ring.scale.setScalar(1 + k * 3);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k) * s;
      }
    },
  };
}

// Post: schwebende Eiskristalle wie Briefe in der kalten Luft.
function crystals(): FeatureObject {
  const group = new THREE.Group();
  const random = seeded(77);
  const geometry = new THREE.OctahedronGeometry(1, 0);
  const solid = additive("#bae6fd", 0.16);
  const edgeGeometry = new THREE.EdgesGeometry(geometry);
  const edge = new THREE.LineBasicMaterial({ color: "#e0f2fe", transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const shards = Array.from({ length: 26 }, () => {
    const m = new THREE.Group();
    m.add(new THREE.Mesh(geometry, solid), new THREE.LineSegments(edgeGeometry, edge));
    const scale = 0.6 + random() * 1.8;
    m.scale.set(scale * 0.55, scale * 1.4, scale * 0.55);
    m.position.set((random() - 0.5) * 90, 3 + random() * 20, -18 - random() * 80);
    group.add(m);
    return { m, y: m.position.y, spin: (random() - 0.5) * 0.6, phase: random() * 6 };
  });
  const fade = fader(group);
  return {
    group,
    update(t, s) {
      fade(s);
      for (const { m, y, spin, phase } of shards) {
        m.rotation.y = t * spin + phase;
        m.position.y = y + Math.sin(t * 0.5 + phase) * 0.8;
      }
    },
  };
}

// Trading: eine Schlucht, gesäumt von Kurs-Säulen wie Kerzen in einem Chart, grün und rot.
function pillars(): FeatureObject {
  const group = new THREE.Group();
  const random = seeded(311);
  const count = 44;
  const box = new THREE.BoxGeometry(1, 1, 1);
  box.translate(0, 0.5, 0);
  const up = additive("#22c55e", 0.55);
  const down = additive("#f43f5e", 0.55);
  const wick = new THREE.LineBasicMaterial({ color: "#f5d0fe", transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false });
  const items: { m: THREE.Mesh; h: number; phase: number }[] = [];
  let level = 8;
  const wickPoints: number[] = [];
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const row = Math.floor(i / 2);
    const change = (random() - 0.45) * 4;
    const open = level;
    level = Math.max(3, level + change);
    const low = Math.min(open, level);
    const h = Math.max(0.6, Math.abs(level - open));
    const m = new THREE.Mesh(box, change >= 0 ? up : down);
    const x = side * (8 + random() * 3);
    const z = -12 - row * 4.2;
    m.position.set(x, low - 5, z);
    m.scale.set(1.1, h, 1.1);
    group.add(m);
    items.push({ m, h, phase: random() * 6 });
    wickPoints.push(x, low - 6.2, z, x, low - 5 + h + 1.6, z);
  }
  const wicks = new THREE.BufferGeometry();
  wicks.setAttribute("position", new THREE.Float32BufferAttribute(wickPoints, 3));
  group.add(new THREE.LineSegments(wicks, wick));
  const fade = fader(group);
  return {
    group,
    update(t, s) {
      fade(s);
      for (const { m, h, phase } of items) m.scale.y = h * (0.9 + 0.1 * Math.sin(t * 0.8 + phase)) * (0.2 + 0.8 * s);
    },
  };
}

const RADAR_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uOpacity;
varying vec2 vUv;
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float a = atan(p.y, p.x);
  float rings = smoothstep(0.035, 0.0, abs(fract(r * 6.0) - 0.5) - 0.46);
  float cross = smoothstep(0.006, 0.0, min(abs(p.x), abs(p.y)));
  float sweep = mod(a - uTime * 0.9, 6.2831853) / 6.2831853;
  float trail = pow(1.0 - sweep, 6.0);
  // Ein paar Ziele, die aufleuchten, wenn der Strahl sie trifft.
  float blips = 0.0;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 b = vec2(cos(fi * 2.4 + 0.7), sin(fi * 2.4 + 0.7)) * (0.25 + fract(fi * 0.37) * 0.6);
    float ba = mod(atan(b.y, b.x) - uTime * 0.9, 6.2831853) / 6.2831853;
    blips += smoothstep(0.035, 0.0, length(p - b)) * pow(1.0 - ba, 3.0);
  }
  float edge = smoothstep(0.02, 0.0, abs(r - 0.985));
  float v = rings * 0.35 + cross * 0.25 + trail * 0.55 + blips * 1.6 + edge * 0.8;
  gl_FragColor = vec4(uColor * v * uOpacity, v * uOpacity);
}
`;

// Intel: ein riesiger Radarschirm im flachen Land, der Strahl sucht nach Neuigkeiten.
function radar(): FeatureObject {
  const group = new THREE.Group();
  const uniforms = { uColor: { value: new THREE.Color("#fb923c") }, uTime: { value: 0 }, uOpacity: { value: 1 } };
  const disc = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.ShaderMaterial({
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: RADAR_FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(0, -3.9, -48);
  group.add(disc);
  const mast = beam(new THREE.Color("#fdba74"), 0.2, 0.02, 30);
  mast.mesh.position.set(0, -4, -48);
  group.add(mast.mesh);
  return {
    group,
    update(t, s) {
      uniforms.uTime.value = t;
      uniforms.uOpacity.value = s;
      mast.uniforms.uOpacity.value = 0.7 * s;
      mast.uniforms.uTime.value = t;
      group.visible = s > 0.002;
      group.position.z = -(1 - s) * 45;
    },
  };
}

// Agenten: ein Sternbild aus Knoten, durch dessen Fäden Lichtpunkte laufen, wie Nachrichten zwischen Agenten.
function network(): FeatureObject {
  const group = new THREE.Group();
  const random = seeded(4242);
  const nodes = Array.from({ length: 34 }, () => new THREE.Vector3((random() - 0.5) * 84, 7 + random() * 22, -26 - random() * 64));
  const links: [number, number][] = [];
  nodes.forEach((n, i) => {
    const near = nodes
      .map((m, j) => ({ j, d: n.distanceTo(m) }))
      .filter((x) => x.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { j } of near) if (!links.some(([a, b]) => (a === j && b === i) || (a === i && b === j))) links.push([i, j]);
  });
  const linePoints = links.flatMap(([a, b]) => [...nodes[a].toArray(), ...nodes[b].toArray()]);
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePoints, 3));
  group.add(new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: "#8b5cf6", transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false })));
  const dot = new THREE.SphereGeometry(0.32, 12, 8);
  const nodeMaterial = additive("#ddd6fe", 0.95);
  for (const n of nodes) {
    const m = new THREE.Mesh(dot, nodeMaterial);
    m.position.copy(n);
    group.add(m);
  }
  // Lichtpunkte, die über die Fäden laufen.
  const pulseMaterial = additive("#f0abfc", 1);
  const pulses = links.slice(0, 22).map(([a, b], i) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), pulseMaterial);
    group.add(m);
    return { m, a: nodes[a], b: nodes[b], speed: 0.15 + (i % 5) * 0.05, phase: i * 0.37 };
  });
  const fade = fader(group);
  return {
    group,
    update(t, s) {
      fade(s);
      for (const p of pulses) p.m.position.lerpVectors(p.a, p.b, (t * p.speed + p.phase) % 1);
    },
  };
}

// Fokus: Ringe wie ein Kreiselkompass um JARVIS und ein Kranz aus Lichtpunkten.
function aura(): FeatureObject {
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.position.set(0, 1.45, 0);
  group.add(holder);
  const a = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.008, 4, 160), additive("#7dd3fc", 0.75));
  const b = new THREE.Mesh(new THREE.TorusGeometry(1.95, 0.006, 4, 160), additive("#c4b5fd", 0.55));
  a.rotation.x = Math.PI / 2 + 0.25;
  b.rotation.x = Math.PI / 2 - 0.35;
  holder.add(a, b);
  const count = 260;
  const positions = new Float32Array(count * 3);
  const random = seeded(9);
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const r = 2.2 + (random() - 0.5) * 0.25;
    positions.set([Math.cos(t) * r, (random() - 0.5) * 0.12, Math.sin(t) * r], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const dots = new THREE.Points(g, new THREE.PointsMaterial({ color: "#bae6fd", size: 0.035, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  dots.rotation.x = 0.12;
  holder.add(dots);
  const materials = [a.material, b.material, dots.material] as (THREE.Material & { opacity: number })[];
  const base = materials.map((m) => m.opacity);
  return {
    group,
    update(t, s) {
      materials.forEach((m, i) => (m.opacity = base[i] * s));
      group.visible = s > 0.002;
      a.rotation.z = t * 0.3;
      b.rotation.z = -t * 0.22;
      dots.rotation.y = t * 0.08;
      holder.scale.setScalar(0.85 + 0.15 * s);
    },
  };
}

export function createFeatures(): Record<Feature, FeatureObject> {
  return { ringe: rings(), leuchtfeuer: beacons(), kristalle: crystals(), saeulen: pillars(), radar: radar(), netz: network(), aura: aura() };
}
