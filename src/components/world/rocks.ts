import * as THREE from "three";
import { SimplexNoise } from "three/addons/math/SimplexNoise.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { createPanel, PANEL_H, PANEL_W, type Panel } from "./panel";
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

// Ein Felsbrocken: oben flach wie ein Sockel, unten zu einer Spitze ausgezogen, die Flächen kantig.
export function rockGeometry(seed: number, size = 1): THREE.BufferGeometry {
  const random = seeded(seed);
  const noise = new SimplexNoise({ random });
  let geometry: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, 2);
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv");
  geometry = mergeVertices(geometry);
  const p = geometry.getAttribute("position") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(1 + noise.noise3d(v.x * 1.4, v.y * 1.4, v.z * 1.4) * 0.26 + noise.noise3d(v.x * 3.3, v.y * 3.3, v.z * 3.3) * 0.08);
    if (v.y > 0.2) v.y = 0.2 + (v.y - 0.2) * 0.12;
    if (v.y < 0) {
      v.y *= 1.9;
      const narrow = Math.max(0.12, 1 + v.y * 0.42);
      v.x *= narrow;
      v.z *= narrow;
    }
    v.set(v.x * 0.78 * size, v.y * 0.5 * size, v.z * 0.78 * size);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geometry.computeVertexNormals();
  return geometry;
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

  const geometry = rockGeometry(index * 7919 + 13);
  const stone = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: "#121a38", emissive: "#060b1f", roughness: 0.82, metalness: 0.15, flatShading: true }),
  );
  body.add(stone);
  const edges = new THREE.LineBasicMaterial({ color: color.clone().lerp(new THREE.Color("#7dd3fc"), 0.4), transparent: true, opacity: 0.55 });
  body.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 28), edges));

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
  panel.position.y = PANEL_LIFT;
  panel.renderOrder = 2;
  root.add(panel);

  // Unsichtbarer Kasten um Tafel und Stein: Dort reagiert der Fels auf Maus und Finger.
  const hit = new THREE.Mesh(new THREE.BoxGeometry(PANEL_WIDTH * 1.08, PANEL_LIFT + PANEL_HEIGHT / 2 + 0.55, 0.9), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = (PANEL_LIFT + PANEL_HEIGHT / 2 - 0.55) / 2;
  hit.userData.id = module.id;
  root.add(hit);

  return { module, root, body, panel, edges, beam: light.uniforms, hit, base: new THREE.Vector3(), phase: random() * Math.PI * 2, hover: 0, flare: 0, draw, painted: "" };
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
