import * as THREE from "three";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";
import { mergeVertices, toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import { createPanel, PANEL_H, PANEL_W, type Panel } from "./panel";
import { createStone, type StoneUniforms } from "./stone";
import type { ModuleId, JarvisModule } from "@/lib/modules";

// Die schwebenden Felsen der Übersicht. Jeder trägt die Glas-Tafel eines Moduls; ein Lichtkegel
// projiziert sie aus dem Stein. Auf dem großen Bildschirm stehen sie links und rechts von JARVIS in zwei
// Reihen, die sich zu dir hin wölben; auf dem Handy kreisen sie wie ein Karussell um ihn.

// Zufall mit festem Startwert: Jeder Fels sieht bei jedem Laden gleich aus.
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ein Felsbrocken: oben flach wie ein Sockel, unten zu einer Spitze ausgezogen. Fein unterteilt und mit
// Kanten nur dort, wo der Stein wirklich abknickt (am Rand des Sockels), sonst weich schattiert; die
// Körnung kommt aus dem Shader (stone.ts).
function rockShape(seed: number, size: number, detail: number): THREE.BufferGeometry {
  const random = seeded(seed);
  const noise = new SimplexNoise({ random });
  let geometry: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv");
  geometry = mergeVertices(geometry);
  const p = geometry.getAttribute("position") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise.noise3d(v.x * 1.4, v.y * 1.4, v.z * 1.4) * 0.26 + noise.noise3d(v.x * 3.3, v.y * 3.3, v.z * 3.3) * 0.08 + noise.noise3d(v.x * 7.5, v.y * 7.5, v.z * 7.5) * 0.025;
    v.multiplyScalar(1 + n);
    if (v.y > 0.2) v.y = 0.2 + (v.y - 0.2) * 0.12;
    if (v.y < 0) {
      v.y *= 1.9;
      const narrow = Math.max(0.12, 1 + v.y * 0.42);
      // Abbruchkanten: der Fels springt in Stufen nach innen.
      const ledge = 1 + 0.035 * Math.sin(v.y * 9 + noise.noise3d(v.x * 2, 0, v.z * 2) * 2.5);
      v.x *= narrow * ledge;
      v.z *= narrow * ledge;
    }
    v.set(v.x * 0.78 * size, v.y * 0.5 * size, v.z * 0.78 * size);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  return geometry;
}

// Die Kante des Sockels als feine Leuchtlinie: je Winkel der äußerste Punkt oben auf dem Stein.
function rimOf(geometry: THREE.BufferGeometry, size: number): THREE.BufferGeometry {
  const p = geometry.getAttribute("position") as THREE.BufferAttribute;
  const bins = 120;
  const radius = new Array<number>(bins).fill(0);
  const height = new Array<number>(bins).fill(0);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    if (y < 0.092 * size) continue;
    const b = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * bins) % bins;
    const d = Math.hypot(x, z);
    if (d > radius[b]) {
      radius[b] = d;
      height[b] = y;
    }
  }
  // Lücken schließen und glätten, damit die Linie ruhig läuft.
  for (let pass = 0; pass < 3; pass++) {
    const r = radius.slice();
    const h = height.slice();
    for (let b = 0; b < bins; b++) {
      const prev = (b + bins - 1) % bins;
      const next = (b + 1) % bins;
      if (!r[b]) {
        radius[b] = (r[prev] + r[next]) / 2;
        height[b] = (h[prev] + h[next]) / 2;
      } else if (pass > 0) {
        radius[b] = (r[prev] + 2 * r[b] + r[next]) / 4;
        height[b] = (h[prev] + 2 * h[b] + h[next]) / 4;
      }
    }
  }
  const points: THREE.Vector3[] = [];
  for (let b = 0; b < bins; b++) {
    const a = ((b + 0.5) / bins) * Math.PI * 2 - Math.PI;
    points.push(new THREE.Vector3(Math.cos(a) * radius[b] * 1.004, height[b] + 0.004 * size, Math.sin(a) * radius[b] * 1.004));
  }
  return new THREE.BufferGeometry().setFromPoints(points);
}

let glowTexture: THREE.Texture | null = null;
// Weicher Lichtpunkt für das Glimmen unter der Spitze, einmal gemalt und von allen Inseln geteilt.
function glow(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowTexture = new THREE.CanvasTexture(canvas);
  return glowTexture;
}

export type Island = { group: THREE.Group; edges: THREE.LineBasicMaterial; stone: StoneUniforms; debris: THREE.Group };

// Eine schwebende Insel: Stein, Leuchtkante am Sockel, ein Glimmen unter der Spitze und ein paar kleine
// Brocken, die langsam um sie kreisen.
export function createIsland(seed: number, size: number, accent: THREE.Color): Island {
  const group = new THREE.Group();
  const shape = rockShape(seed, size, 4);
  const { material, uniforms: stone } = createStone(accent, size);
  group.add(new THREE.Mesh(toCreasedNormals(shape, 0.9), material));

  const edges = new THREE.LineBasicMaterial({ color: accent.clone().lerp(new THREE.Color("#7dd3fc"), 0.5), transparent: true, opacity: 0.55, toneMapped: false });
  group.add(new THREE.LineLoop(rimOf(shape, size), edges));

  shape.computeBoundingBox();
  const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: accent.clone().multiplyScalar(0.9), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  tip.position.y = shape.boundingBox!.min.y + 0.04 * size;
  tip.scale.setScalar(0.42 * size);
  group.add(tip);

  const debris = new THREE.Group();
  const random = seeded(seed * 3 + 1);
  for (let k = 0; k < 3; k++) {
    const piece = rockShape(seed + 101 * (k + 1), 0.14 + random() * 0.08, 2);
    const mesh = new THREE.Mesh(toCreasedNormals(piece, 0.9), material);
    const a = (k / 3) * Math.PI * 2 + random() * 1.2;
    const r = (0.55 + random() * 0.2) * size;
    mesh.position.set(Math.cos(a) * r, (-0.18 - random() * 0.3) * size, Math.sin(a) * r);
    mesh.rotation.set(random() * 0.5, random() * 6, random() * 0.5);
    debris.add(mesh);
  }
  group.add(debris);
  return { group, edges, stone, debris };
}

const BEAM_VERTEX = /* glsl */ `
varying float vUp;
void main() {
  vUp = uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const BEAM_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
varying float vUp;
void main() {
  float scan = 0.75 + 0.25 * sin(vUp * 26.0 - uTime * 4.0);
  float a = pow(1.0 - vUp, 1.6) * uOpacity * scan;
  gl_FragColor = vec4(uColor * a, a);
}
`;

// Ein Lichtkegel, der vom Stein nach oben breiter wird und verblasst.
export function beam(color: THREE.Color, bottom: number, top: number, height: number): { mesh: THREE.Mesh; uniforms: { uColor: { value: THREE.Color }; uOpacity: { value: number }; uTime: { value: number } } } {
  const uniforms = { uColor: { value: color }, uOpacity: { value: 0.35 }, uTime: { value: 0 } };
  const geometry = new THREE.CylinderGeometry(top, bottom, height, 32, 1, true);
  geometry.translate(0, height / 2, 0);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      vertexShader: BEAM_VERTEX,
      fragmentShader: BEAM_FRAGMENT,
      uniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
  );
  return { mesh, uniforms };
}

export const PANEL_WIDTH = 1.5;
// Die Tafeln liegen auf einer eigenen Ebene: Sie werden erst nach dem Nachleuchten gezeichnet, damit ihre
// Schrift scharf bleibt und nicht im Schein verschwimmt.
export const PANEL_LAYER = 1;
// So viel größer steht JARVIS in der Übersicht da als im Fokus.
export const HEAD_STAGE = 1.3;
const PANEL_HEIGHT = (PANEL_WIDTH * PANEL_H) / PANEL_W;
// So weit über dem Stein schwebt die Mitte der Tafel.
export const PANEL_LIFT = 0.3 + PANEL_HEIGHT / 2;

export type Rock = {
  module: JarvisModule;
  root: THREE.Group;
  body: THREE.Group;
  panel: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  edges: THREE.LineBasicMaterial;
  stone: StoneUniforms;
  debris: THREE.Group;
  beam: { uOpacity: { value: number }; uTime: { value: number } };
  hit: THREE.Mesh;
  base: THREE.Vector3;
  phase: number;
  hover: number;
  flare: number;
  draw: Panel["draw"];
  painted: string;
};

export function createRock(module: JarvisModule, accent: string, index: number): Rock {
  const color = new THREE.Color(accent);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const island = createIsland(index * 7919 + 13, 1, color);
  body.add(island.group);

  // Ein leuchtender Ring auf dem Sockel, aus dem die Tafel projiziert wird.
  const pad = new THREE.Mesh(
    new THREE.RingGeometry(0.22, 0.3, 40),
    new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.6), transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }),
  );
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.11;
  body.add(pad);

  // Kleine Kristalle in der Farbe der Landschaft, in die der Fels führt.
  const random = seeded(index * 31 + 5);
  const crystal = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.4), toneMapped: false });
  for (let k = 0; k < 3; k++) {
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.05 + random() * 0.06), crystal);
    const a = random() * Math.PI * 2;
    shard.position.set(Math.cos(a) * (0.42 + random() * 0.15), 0.06 - random() * 0.25, Math.sin(a) * (0.42 + random() * 0.15));
    shard.scale.y = 2.2;
    shard.rotation.set(random() * 0.6, random() * 3, random() * 0.6);
    body.add(shard);
  }

  const light = beam(color.clone().lerp(new THREE.Color("#7dd3fc"), 0.5), 0.26, 0.6, 0.55);
  light.mesh.position.y = 0.12;
  body.add(light.mesh);

  const { texture, draw } = createPanel(module, accent);
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(PANEL_WIDTH, PANEL_HEIGHT),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
  );
  // Aus der Ferne nimmt die Grafikkarte sonst eine gröbere Stufe der Textur; etwas feiner abgetastet
  // bleibt die Schrift klar, ohne zu flimmern.
  panel.material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", "diffuseColor *= texture2D( map, vMapUv, -0.7 );");
  };
  panel.material.customProgramCacheKey = () => "jarvis-panel";
  panel.position.y = PANEL_LIFT;
  panel.renderOrder = 2;
  panel.layers.set(PANEL_LAYER);
  root.add(panel);

  // Unsichtbarer Kasten um Tafel und Stein: Dort reagiert der Fels auf Maus und Finger.
  const hit = new THREE.Mesh(new THREE.BoxGeometry(PANEL_WIDTH * 1.08, PANEL_LIFT + PANEL_HEIGHT / 2 + 0.55, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = (PANEL_LIFT + PANEL_HEIGHT / 2 - 0.55) / 2;
  hit.userData.id = module.id;
  root.add(hit);

  return { module, root, body, panel, edges: island.edges, stone: island.stone, debris: island.debris, beam: light.uniforms, hit, base: new THREE.Vector3(), phase: random() * Math.PI * 2, hover: 0, flare: 0, draw, painted: "" };
}

// Wo die Felsen stehen. Unten und innen, also nah an JARVIS und groß im Bild, die wichtigsten Module.
const SLOTS: Record<"links" | "rechts", ModuleId[]> = {
  links: ["aufgaben", "kalender", "post", "telefon", "browser"],
  rechts: ["trading", "intel", "markt", "cognition", "wetter"],
};
// Reihenfolge im Karussell auf dem Handy, einmal rundherum.
const CAROUSEL: ModuleId[] = ["aufgaben", "kalender", "post", "telefon", "browser", "wetter", "cognition", "markt", "intel", "trading"];
export const CAROUSEL_RADIUS = 3.5;
export const CAROUSEL_STEP = (Math.PI * 2) / CAROUSEL.length;

export function layoutRocks(rocks: Rock[], portrait: boolean) {
  for (const rock of rocks) {
    if (portrait) {
      const a = CAROUSEL.indexOf(rock.module.id) * CAROUSEL_STEP;
      rock.base.set(Math.sin(a) * CAROUSEL_RADIUS, -2.5, Math.cos(a) * CAROUSEL_RADIUS);
      continue;
    }
    const s = rock.module.side === "links" ? -1 : 1;
    const k = SLOTS[rock.module.side].indexOf(rock.module.id);
    // Untere Reihe drei Felsen, obere zwei dazwischen und weiter hinten. Außen kommen sie dir näher.
    const top = k >= 3;
    const u = top ? k - 2.5 : k;
    rock.base.set(s * (2.6 + u * 1.75), top ? 2.15 : -0.35, (top ? -1.7 : 0.5) + u * 0.5);
  }
}

// Die Punkte, die auf jeden Fall im Bild sein sollen: Kopf, Tafeln und Steine. Im Karussell zählen
// nur Kopf und der vordere Fels; die seitlichen dürfen über den Rand hinausragen.
export function stagePoints(rocks: Rock[], portrait: boolean): THREE.Vector3[] {
  const k = HEAD_STAGE;
  const points = [new THREE.Vector3(-1.4 * k, -0.6 * k, 0), new THREE.Vector3(1.4 * k, -0.6 * k, 0), new THREE.Vector3(0, 2.6 * k, 0)];
  const top = PANEL_LIFT + PANEL_HEIGHT / 2;
  if (portrait) {
    const r = CAROUSEL_RADIUS;
    points.push(new THREE.Vector3(-PANEL_WIDTH / 2, -2.5 - 0.85, r), new THREE.Vector3(PANEL_WIDTH / 2, -2.5 - 0.85, r));
    points.push(new THREE.Vector3(-r * 0.59, -2.5 + top, r * 0.81), new THREE.Vector3(r * 0.59, -2.5 + top, r * 0.81));
    return points;
  }
  for (const r of rocks) {
    for (const dx of [-PANEL_WIDTH / 2, PANEL_WIDTH / 2]) points.push(r.base.clone().add(new THREE.Vector3(dx, top, 0)));
    points.push(r.base.clone().add(new THREE.Vector3(0, -0.85, 0)));
  }
  return points;
}
