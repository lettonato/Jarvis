import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Pass } from "three/addons/postprocessing/Pass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { anchorRect } from "./anchor";
import { bust } from "./bust";
import { createFeatures } from "./features";
import { createPhotos } from "./photos";
import type { PanelData } from "./panel";
import { beam, CAROUSEL_STEP, createIsland, createRock, HEAD_STAGE, layoutRocks, PANEL_LAYER, stagePoints, type Rock } from "./rocks";
import { createSky } from "./sky";
import { createTerrain } from "./terrain";
import type { AvatarState } from "@/lib/avatar";
import { MODULES, type ModuleId } from "@/lib/modules";
import { QUALITY_SHOWN_EVENT, readQuality, readQualityCap, saveQuality, saveQualityCap, type QualityChoice, type QualityLevel } from "@/lib/quality";
import { BIOMES, biomeOf, type Biome, type BiomeId, type Feature } from "@/lib/world";

// Die 3D-Welt hinter JARVIS: Gebirge, Himmel, der schwebende Kopf und die Felsen mit den Modulen.
// Sie läuft die ganze Zeit in einem einzigen Bild hinter allen Ansichten. Wechselt die Ansicht,
// fliegt die Kamera über das Gebirge in die neue Landschaft, während Farben und Formen ineinander übergehen.

export type World = {
  setBiome: (id: BiomeId) => void;
  setPanels: (data: Partial<Record<ModuleId, PanelData>>, brain: boolean) => void;
  setAvatar: (state: AvatarState) => void;
  setInteractive: (on: boolean) => void;
  // Echte Landschaftsfotos statt des gerechneten Gebirges.
  setPhotos: (on: boolean) => void;
  // Bildqualität aus den Einstellungen: automatisch oder eine feste Stufe.
  setQuality: (choice: QualityChoice) => void;
  focus: (id: string | null) => void;
  dispose: () => void;
};

type Options = { initial: BiomeId; photos: boolean; onOpen: (href: string) => void; onLost: (lost: boolean) => void };

// Die Werte einer Landschaft, die beim Flug ineinander übergehen.
type Look = {
  height: number;
  scale: number;
  ridge: number;
  terrace: number;
  valley: number;
  light: number;
  low: THREE.Color;
  high: THREE.Color;
  grid: THREE.Color;
  zenith: THREE.Color;
  horizon: THREE.Color;
  aurora: THREE.Color;
  accent: THREE.Color;
};

const NUMBERS = ["height", "scale", "ridge", "terrace", "valley", "light"] as const;
const COLORS = ["low", "high", "grid", "zenith", "horizon", "aurora", "accent"] as const;

function lookOf(b: Biome): Look {
  return {
    height: b.height,
    scale: b.scale,
    ridge: b.ridge,
    terrace: b.terrace,
    valley: b.valley,
    light: b.light,
    low: new THREE.Color(b.low),
    high: new THREE.Color(b.high),
    grid: new THREE.Color(b.grid),
    zenith: new THREE.Color(b.zenith),
    horizon: new THREE.Color(b.horizon),
    aurora: new THREE.Color(b.aurora),
    accent: new THREE.Color(b.accent),
  };
}

function copyLook(l: Look): Look {
  const c = { ...l } as Look;
  for (const k of COLORS) c[k] = l[k].clone();
  return c;
}

function mixLook(out: Look, a: Look, b: Look, t: number) {
  for (const k of NUMBERS) out[k] = a[k] + (b[k] - a[k]) * t;
  for (const k of COLORS) out[k].copy(a[k]).lerp(b[k], t);
}

const WHITE = new THREE.Color("#ffffff");
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const damp = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

// Die Farbe des Felsens: die der Landschaft, in die er führt.
const ACCENT: Partial<Record<ModuleId, string>> = { cognition: "#c084fc", wetter: "#7dd3fc", telefon: "#a5b4fc", browser: "#a5b4fc" };
const accentOf = (id: ModuleId, href: string) => ACCENT[id] ?? BIOMES[biomeOf(href)].high;

const DUST_VERTEX = /* glsl */ `
uniform vec2 uOffset;
uniform float uTime;
uniform float uPixel;
attribute float aSize;
void main() {
  vec3 p = position;
  p.x = mod(p.x - uOffset.x + 40.0, 80.0) - 40.0;
  p.z = mod(p.z - uOffset.y + 72.0, 86.0) - 72.0;
  p.y += sin(uTime * 0.4 + position.x * 0.7) * 0.25;
  vec4 view = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = clamp(aSize * uPixel * 14.0 / -view.z, 1.0, 9.0);
}
`;
const DUST_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uLight;
void main() {
  float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)) * 0.7 * uLight;
  gl_FragColor = vec4(uColor * a, a);
}
`;

// Zeichnet nur eine Ebene der Szene in das fertige Bild, ohne es zu löschen. So kommen die Glas-Tafeln
// nach dem Nachleuchten dazu; die Tiefe aus dem ersten Durchgang gilt weiter, Felsen davor verdecken sie.
class LayerPass extends Pass {
  scene: THREE.Scene;
  camera: THREE.Camera;
  layer: number;
  constructor(scene: THREE.Scene, camera: THREE.Camera, layer: number) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.layer = layer;
    this.needsSwap = false;
  }
  render(renderer: THREE.WebGLRenderer, _writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget) {
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    renderLayer(renderer, this.scene, this.camera, this.layer);
  }
}

function renderLayer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, layer: number) {
  const mask = camera.layers.mask;
  const clear = renderer.autoClear;
  camera.layers.set(layer);
  renderer.autoClear = false;
  renderer.render(scene, camera);
  renderer.autoClear = clear;
  camera.layers.mask = mask;
}

export function createWorld(container: HTMLElement, { initial, photos: photosOn, onOpen, onLost }: Options): World {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const quality = readQuality();

  const canvas = document.createElement("canvas");
  canvas.className = "block h-full w-full";
  // Die Welt blendet über den Hintergrund der Seite ein, statt ihn mit einem dunklen Bild abzulösen. Ebenso,
  // wenn der Browser die Grafik verliert und wieder zurückgibt. Die Schleife selbst blendet, Bild für Bild.
  canvas.style.opacity = "0";
  let shown = 0;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  container.appendChild(canvas);
  renderer.setClearColor("#04060f");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 900);

  // ───────── Landschaft ─────────
  const terrain = createTerrain(small ? 150 : 230);
  scene.add(terrain.mesh);
  const sky = createSky();
  scene.add(sky.group);

  const dustCount = small ? 380 : 700;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustSize = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dustPositions.set([(Math.random() - 0.5) * 80, -3.5 + Math.random() * 18, -72 + Math.random() * 86], i * 3);
    dustSize[i] = 0.6 + Math.random() * 1.4;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  dustGeometry.setAttribute("aSize", new THREE.BufferAttribute(dustSize, 1));
  const dustUniforms = { uOffset: terrain.uniforms.uOffset, uTime: { value: 0 }, uPixel: { value: 1 }, uColor: { value: new THREE.Color() }, uLight: { value: 1 } };
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.ShaderMaterial({ vertexShader: DUST_VERTEX, fragmentShader: DUST_FRAGMENT, uniforms: dustUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  dust.frustumCulled = false;
  scene.add(dust);

  // Die Fotowelt: ein Foto hinter allem, Gebirge, Himmel und Besonderheiten der Landschaft sind dann aus.
  const photos = createPhotos(initial, reduced, (t) => renderer.initTexture(t));
  let usePhotos = photosOn;
  const showLandscape = () => {
    terrain.mesh.visible = !usePhotos;
    sky.group.visible = !usePhotos;
  };
  showLandscape();

  const features = createFeatures();
  const strength = Object.fromEntries(Object.keys(features).map((k) => [k, 0])) as Record<Feature, number>;
  for (const f of Object.values(features)) scene.add(f.group);

  // ───────── Licht ─────────
  const hemi = new THREE.HemisphereLight("#7dd3fc", "#060a1c", 1.1);
  const sun = new THREE.DirectionalLight("#c7d2fe", 1.6);
  sun.position.set(4, 9, 12);
  const glow = new THREE.PointLight("#38bdf8", 14, 16, 1.4);
  glow.position.set(0, 1.4, 0.5);
  scene.add(hemi, sun, glow);

  // ───────── JARVIS ─────────
  const head = new THREE.Group();
  scene.add(head);
  const { positions, colors, mouthStart, mouthWeight } = bust();
  const bustGeometry = new THREE.BufferGeometry();
  bustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  bustGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const bustMaterial = new THREE.PointsMaterial({ size: 0.03, vertexColors: true, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  const face = new THREE.Points(bustGeometry, bustMaterial);
  head.add(face);
  const restY = mouthWeight.map((_, k) => positions[(mouthStart + k) * 3 + 1]);
  const mouth = bustGeometry.getAttribute("position") as THREE.BufferAttribute;
  let mouthMoving = false;

  // Er schwebt über einer Felsinsel, aus der ihn ein Lichtkegel projiziert.
  const island = new THREE.Group();
  island.position.y = -0.62;
  const headIsland = createIsland(4711, 1.45, new THREE.Color("#38bdf8"));
  island.add(headIsland.group);
  const islandEdges = headIsland.edges;
  const projector = new THREE.Group();
  projector.position.y = 0.16;
  for (const [r, w, o] of [
    [0.82, 0.03, 0.95],
    [1.04, 0.01, 0.6],
    [0.4, 0.018, 0.8],
  ]) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - w, r + w, 96),
      new THREE.MeshBasicMaterial({ color: "#7dd3fc", transparent: true, opacity: o, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    projector.add(ring);
  }
  island.add(projector);
  const headBeam = beam(new THREE.Color("#38bdf8"), 0.75, 1.4, 1.3);
  headBeam.uniforms.uOpacity.value = 0.12;
  headBeam.mesh.position.y = 0.16;
  island.add(headBeam.mesh);
  head.add(island);
  const headHit = new THREE.Mesh(new THREE.SphereGeometry(1.25, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  headHit.position.y = 1.4;
  headHit.userData.id = "fokus";
  head.add(headHit);

  // ───────── Felsen ─────────
  const ring = new THREE.Group();
  scene.add(ring);
  const rocks: Rock[] = MODULES.map((m, i) => createRock(m, accentOf(m.id, m.href), i));
  // Schräg gesehen bleibt die Schrift nur mit voller anisotroper Filterung scharf.
  const anisotropy = renderer.capabilities.getMaxAnisotropy();
  for (const r of rocks) r.panel.material.map!.anisotropy = anisotropy;
  for (const r of rocks) ring.add(r.root);
  let portrait = false;
  let panels: Partial<Record<ModuleId, PanelData>> = {};
  let brain = false;
  const paint = () => {
    for (const r of rocks) {
      const key = JSON.stringify([panels[r.module.id] ?? null, brain, portrait]);
      if (key === r.painted) continue;
      r.painted = key;
      r.draw(panels[r.module.id], brain, portrait);
    }
  };

  // ───────── Nachleuchten ─────────
  // Kantenglättung nur, wo die Pixel grob sind; auf scharfen Bildschirmen kostet sie viel und bringt wenig.
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: quality.level === 2 && window.devicePixelRatio < 1.5 ? 4 : 0 });
  const composer = new EffectComposer(renderer, target);
  const photoPass = new RenderPass(photos.scene, photos.camera);
  const mainPass = new RenderPass(scene, camera);
  composer.addPass(photoPass);
  composer.addPass(mainPass);
  const passesFor = () => {
    photoPass.enabled = usePhotos;
    mainPass.clear = !usePhotos;
  };
  passesFor();
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.5, 0.7);
  // Ein einzelner kaputter Bildpunkt (keine Zahl oder unendlich hell) würde im Nachleuchten zu einem Blitz über
  // den halben Bildschirm. Solche Punkte fallen vor dem Leuchten weg.
  bloom.materialHighPassFilter.fragmentShader = bloom.materialHighPassFilter.fragmentShader.replace(
    "vec4 texel = texture2D( tDiffuse, vUv );",
    "vec4 texel = texture2D( tDiffuse, vUv );\n\t\t\tif ( ! all( lessThan( abs( texel ), vec4( 1e4 ) ) ) ) texel = vec4( 0.0 );",
  );
  composer.addPass(bloom);
  composer.addPass(new LayerPass(scene, camera, PANEL_LAYER));
  composer.addPass(new OutputPass());

  type Fit = { eye: THREE.Vector3; look: THREE.Vector3; ex: number; ey: number };
  const fitCache = new Map<string, Fit>();
  let W = 1;
  let H = 1;
  let level: QualityLevel = quality.level;
  let layoutDone = false;
  let stage: THREE.Vector3[] = [];
  const applySize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, level === 2 ? 2 : level === 1 ? 1.25 : 1);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    composer.setPixelRatio(dpr);
    composer.setSize(W, H);
    camera.aspect = W / H;
    photos.resize(W, H);
    sky.starUniforms.uPixel.value = dpr;
    dustUniforms.uPixel.value = dpr;
    const nextPortrait = W / H < 0.85;
    camera.fov = nextPortrait ? 52 : 42;
    camera.updateProjectionMatrix();
    if (nextPortrait !== portrait || !layoutDone) {
      portrait = nextPortrait;
      layoutDone = true;
      layoutRocks(rocks, portrait);
      stage = stagePoints(rocks, portrait);
      ringYaw = ringYawTarget = 0;
      fitCache.clear();
      paint();
    }
  };
  // Beim Ziehen am Fensterrand kommen viele Größenänderungen; angepasst wird einmal pro Bild.
  let resized = false;
  const onResize = () => (resized = true);
  window.addEventListener("resize", onResize);

  // ───────── Kamera rahmen ─────────
  // Kopf und Felsen sollen genau in den Platz passen, den die Ansicht dafür frei lässt. Dazu wird die Kamera
  // so weit zurückgesetzt, dass alle Eckpunkte hineinpassen, und das Bild dann auf diesen Platz verschoben.
  const HEAD_POINTS = [
    new THREE.Vector3(-1.3, 0.12, 0),
    new THREE.Vector3(1.3, 0.12, 0),
    new THREE.Vector3(0, 2.48, 0),
    new THREE.Vector3(0, 1.5, 0.7),
    new THREE.Vector3(0, -0.1, 0),
  ];
  const UP = new THREE.Vector3(0, 1, 0);
  const basis = new THREE.Matrix4();
  const inv = new THREE.Matrix4();
  const tmp = new THREE.Vector3();
  function fit(points: THREE.Vector3[], dir: THREE.Vector3, w: number, h: number): Fit {
    const key = `${points.length}|${dir.x.toFixed(3)},${dir.y.toFixed(3)}|${Math.round(w)}x${Math.round(h)}|${W}x${H}|${camera.fov}`;
    const cached = fitCache.get(key);
    if (cached) return cached;
    const look = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
    const f = H / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let d = 12;
    let ex = 0;
    let ey = 0;
    const eye = new THREE.Vector3();
    for (let i = 0; i < 7; i++) {
      eye.copy(look).addScaledVector(dir, -d);
      basis.lookAt(eye, look, UP);
      inv.copy(basis).transpose();
      let x0 = Infinity;
      let x1 = -Infinity;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (const p of points) {
        tmp.copy(p).sub(eye).applyMatrix4(inv);
        const z = Math.max(0.5, -tmp.z);
        const x = (tmp.x / z) * f;
        const y = (tmp.y / z) * f;
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
      const s = Math.max((x1 - x0) / (w * 0.94), (y1 - y0) / (h * 0.94));
      ex = (x0 + x1) / 2;
      ey = -(y0 + y1) / 2;
      d = THREE.MathUtils.clamp(d * s, 2.5, 90);
    }
    eye.copy(look).addScaledVector(dir, -d);
    const result = { eye: eye.clone(), look, ex, ey };
    if (fitCache.size > 40) fitCache.clear();
    fitCache.set(key, result);
    return result;
  }

  // ───────── Zustand ─────────
  let biomeId: BiomeId = initial;
  let biome = BIOMES[initial];
  const from = lookOf(BIOMES[initial]);
  const to = lookOf(BIOMES[initial]);
  const look = copyLook(to);
  let progress = 1;
  let duration = 2;
  let side = 0;
  const offsetFrom = new THREE.Vector2();
  const offsetTo = new THREE.Vector2();
  let headVis = biome.head;
  let rocksVis = biome.rocks;
  let avatar: AvatarState = "idle";
  let interactive = false;
  let hoverId: string | null = null;
  let focusId: string | null = null;
  let ringYaw = 0;
  let ringYawTarget = 0;
  const parallax = new THREE.Vector2();
  const parallaxTarget = new THREE.Vector2();

  const eye = new THREE.Vector3();
  const aim = new THREE.Vector3();
  const offset = new THREE.Vector2();
  const viewOffset = { x: 0, y: 0 };
  const goalEye = new THREE.Vector3();
  const goalLook = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const lift = new THREE.Vector3();
  let snapped = false;

  // Beim ersten Laden fliegt die Kamera aus dem Dunkeln heran.
  if (!reduced) {
    from.light = 0;
    offsetFrom.set(0, 110);
    offsetTo.set(0, 0);
    headVis = 0;
    rocksVis = 0;
    progress = 0;
    duration = 2.8;
  }

  function setBiome(id: BiomeId) {
    if (id === biomeId) return;
    const prev = biome;
    biomeId = id;
    biome = BIOMES[id];
    Object.assign(from, copyLook(look));
    Object.assign(to, lookOf(biome));
    // Zur Seite des Felsens hin abbiegen, aus dem das Modul kam; sonst geradeaus.
    const mod = MODULES.find((m) => m.href.split(/[?#]/)[0] === `/${id}`);
    side = mod ? (mod.side === "links" ? -1 : 1) : 0;
    const t = terrain.uniforms.uOffset.value;
    offsetFrom.copy(t);
    // Zwischen Übersicht und Fokus ist der Weg kurz, in eine Arbeitsansicht weit.
    const near = prev.frame !== "frei" && biome.frame !== "frei";
    offsetTo.set(t.x + side * 26, t.y - (near ? 18 : 84));
    duration = reduced ? 0 : near ? 1.4 : 2.1;
    photos.set(id, side, duration);
    progress = reduced ? 1 : 0;
    if (reduced) {
      mixLook(look, from, to, 1);
      offset.copy(offsetTo);
    }
  }

  function open(id: string) {
    if (id === "fokus") return onOpen("/fokus");
    const rock = rocks.find((r) => r.module.id === id);
    if (!rock) return;
    rock.flare = 1;
    onOpen(rock.module.href);
  }

  // ───────── Maus und Finger ─────────
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const hits = [...rocks.map((r) => r.hit), headHit];
  function pick(x: number, y: number): string | null {
    if (!interactive || rocksVis < 0.6) return null;
    ndc.set((x / W) * 2 - 1, -(y / H) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const [first] = raycaster.intersectObjects(hits, false);
    return (first?.object.userData.id as string | undefined) ?? null;
  }
  let drag: { x: number; yaw: number; moved: boolean; id: number } | null = null;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "mouse") parallaxTarget.set((e.clientX / W) * 2 - 1, (e.clientY / H) * 2 - 1);
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) drag.moved = true;
      // Auf dem Handy dreht sich das Karussell ganz herum, am großen Bildschirm schwenkt der Kreis nur etwas.
      if (drag.moved) ringYawTarget = portrait ? drag.yaw + dx * 0.008 : THREE.MathUtils.clamp(drag.yaw + dx * 0.0032, -0.45, 0.45);
      return;
    }
    hoverId = pick(e.clientX, e.clientY);
    canvas.style.cursor = hoverId ? "pointer" : interactive ? "grab" : "";
  };
  const onDown = (e: PointerEvent) => {
    if (!interactive || e.button !== 0) return;
    drag = { x: e.clientX, yaw: ringYawTarget, moved: false, id: e.pointerId };
    hoverId = pick(e.clientX, e.clientY);
    canvas.setPointerCapture(e.pointerId);
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || drag.id !== e.pointerId) return;
    const wasDrag = drag.moved;
    drag = null;
    // Das Karussell rastet so ein, dass ein Fels genau vorne steht.
    if (portrait) ringYawTarget = Math.round(ringYawTarget / CAROUSEL_STEP) * CAROUSEL_STEP;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (wasDrag) return;
    const id = pick(e.clientX, e.clientY);
    if (id) open(id);
  };
  // Übernimmt der Browser die Geste (etwa beim Scrollen), öffnet nichts.
  const onCancel = (e: PointerEvent) => {
    if (drag?.id !== e.pointerId) return;
    drag = null;
    if (portrait) ringYawTarget = Math.round(ringYawTarget / CAROUSEL_STEP) * CAROUSEL_STEP;
  };
  const onLeave = () => {
    if (!drag) hoverId = null;
    parallaxTarget.set(0, 0);
  };
  // Verliert der Browser die Grafik (Treiber, zu viele offene Tabs), zeigt die Seite solange einfache Kacheln.
  const onContextLost = (e: Event) => {
    e.preventDefault();
    shown = 0;
    canvas.style.opacity = "0";
    onLost(true);
  };
  const onContextRestored = () => onLost(false);
  canvas.addEventListener("webglcontextlost", onContextLost);
  canvas.addEventListener("webglcontextrestored", onContextRestored);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("pointerleave", onLeave);

  // ───────── Schleife ─────────
  let frame = 0;
  let last = performance.now();
  let lastDraw = 0;
  let time = 0;
  const roll = { value: 0 };

  // ───────── Bildqualität ─────────
  // Ruckelt es länger, geht die Welt eine Stufe herunter. Läuft es auf einer niedrigeren Stufe lange flüssig
  // (etwa nach einem Ruckler beim Start), einmal je Laden wieder eine hinauf. Gewechselt wird nur während
  // eines Flugs, wenn sich ohnehin alles bewegt, damit das Bild nie im Stillstand springt; nur wenn es arg
  // ruckelt, sofort. Das Leuchten blendet dabei weich aus und ein, statt einfach auszugehen.
  const samples: number[] = [];
  let warmup = 45;
  let pending: { level: QualityLevel; since: number } | null = null;
  let dropped = false;
  let climbedAt = -Infinity;
  let glowMix = level > 0 ? 1 : 0;
  const average = (n: number) => samples.slice(-n).reduce((a, b) => a + b, 0) / n;

  function applyQuality(next: QualityLevel, now: number) {
    pending = null;
    samples.length = 0;
    if (next === level) return;
    if (next < level) {
      // Gerade erst hinaufgestiegen und schon wieder zu langsam: ein paar Tage nicht mehr so hoch.
      if (!dropped && now - climbedAt < 120_000) saveQualityCap(next);
      dropped = true;
    } else climbedAt = now;
    level = next;
    if (!quality.fixed) saveQuality(level, false);
    if (level < 2 && target.samples > 0) {
      for (const t of [composer.renderTarget1, composer.renderTarget2]) {
        t.samples = 0;
        t.dispose();
      }
    }
    // Ohne Leuchten wird direkt auf den Bildschirm gezeichnet; die Shader dafür vorab übersetzen, solange
    // das Leuchten noch ausblendet.
    if (level === 0) void compileAll(null, true);
    applySize();
    window.dispatchEvent(new CustomEvent(QUALITY_SHOWN_EVENT, { detail: level }));
  }

  function judgeQuality(dt: number, now: number, calm: boolean, flying: boolean) {
    if (quality.fixed) return;
    if (warmup > 0) {
      warmup--;
      return;
    }
    // In den Arbeitsansichten läuft die Welt absichtlich mit 30 Bildern; das zählt nicht als Ruckeln.
    if (!calm && !document.hidden) {
      samples.push(dt);
      if (samples.length > 240) samples.shift();
    }
    if (samples.length >= 90) {
      const recent = average(90);
      if (level > 0 && recent > 1 / 38 && !(pending && pending.level < level)) pending = { level: (level - 1) as QualityLevel, since: now };
      // Nur ein kurzer Ruckler: dann bleibt alles, wie es ist.
      else if (pending && pending.level < level && recent < 1 / 50) pending = null;
      else if (pending && pending.level > level && recent > 1 / 45) pending = null;
      if (pending && pending.level < level && recent > 1 / 24) return applyQuality(pending.level, now);
    }
    if (!pending && !dropped && climbedAt === -Infinity && level < 2 && samples.length >= 240 && average(240) < 1 / 56 && level < readQualityCap()) {
      pending = { level: (level + 1) as QualityLevel, since: now };
    }
    // Mitten im Flug fällt der Wechsel nicht auf. Ruckelt es weiter und kommt lange kein Flug, gilt ein Schritt
    // nach unten auch so; in den ruhigen Arbeitsansichten wartet er auf den nächsten Flug.
    if (pending && ((flying && progress < 0.8) || (!calm && pending.level < level && now - pending.since > 8000))) applyQuality(pending.level, now);
  }

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const flying = progress < 1;
    // Höchstens 60 Bilder pro Sekunde, auch auf 120-Hz-Bildschirmen. In den Arbeitsansichten steht die Welt
    // meist still hinter dem Text: Dort reichen 30.
    const calm = biome.frame === "frei" && !flying && avatar === "idle";
    if (now - lastDraw < (calm ? 31 : 14)) return;
    // Hing der Browser kurz (etwa beim Aufbau einer Ansicht), läuft die Bewegung weich weiter, statt zu springen.
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    lastDraw = now;
    if (resized) {
      resized = false;
      applySize();
    }
    time += dt * (reduced ? 0.25 : 1);
    judgeQuality(dt, now, calm, flying);

    // Flug: Landschaft und Weg.
    if (flying) progress = duration > 0 ? Math.min(1, progress + dt / duration) : 1;
    const e = ease(progress);
    mixLook(look, from, to, e);
    offset.lerpVectors(offsetFrom, offsetTo, e);
    const u = terrain.uniforms;
    u.uHeight.value = look.height;
    u.uScale.value = look.scale;
    u.uRidge.value = look.ridge;
    u.uTerrace.value = look.terrace;
    u.uValley.value = look.valley;
    u.uOffset.value.copy(offset);
    u.uLow.value.copy(look.low);
    u.uHigh.value.copy(look.high);
    u.uGrid.value.copy(look.grid);
    u.uFog.value.copy(look.horizon);
    u.uLight.value = look.light;
    u.uTime.value = time;
    const s = sky.uniforms;
    s.uZenith.value.copy(look.zenith);
    s.uHorizon.value.copy(look.horizon);
    s.uAurora.value.copy(look.aurora);
    s.uAccent.value.copy(look.accent);
    s.uLight.value = look.light;
    s.uTime.value = time;
    sky.starUniforms.uTime.value = time;
    sky.starUniforms.uLight.value = look.light;
    dustUniforms.uTime.value = time;
    dustUniforms.uColor.value.copy(look.grid);
    dustUniforms.uLight.value = look.light;
    hemi.color.copy(look.high).lerp(WHITE, 0.35);
    glow.color.copy(look.accent);

    // Kopf und Felsen verschwinden zu Beginn des Flugs schnell und tauchen erst bei der Ankunft auf.
    const headGoal = biome.head < headVis || progress > 0.55 ? biome.head : headVis;
    const rocksGoal = biome.rocks < rocksVis || progress > 0.5 ? biome.rocks : rocksVis;
    headVis += (headGoal - headVis) * damp(headGoal < headVis ? 6 : 3, dt);
    rocksVis += (rocksGoal - rocksVis) * damp(rocksGoal < rocksVis ? 7 : 3, dt);

    // Hinter Text bleibt das Besondere der Landschaft gedämpft, damit es nicht ablenkt. Vor Fotos fehlt es,
    // denn Säulen, Radar und Leuchtfeuer stehen auf dem gerechneten Gebirge; nur die Kreiselringe um den Kopf bleiben.
    const featureGoal = biome.frame === "frei" ? 0.5 : 1;
    for (const [name, f] of Object.entries(features) as [Feature, (typeof features)[Feature]][]) {
      const goal = biome.feature === name && progress > 0.35 && (!usePhotos || name === "aura") ? featureGoal : 0;
      strength[name] += (goal - strength[name]) * damp(goal ? 1.6 : 4, dt);
      if (strength[name] < 0.002 && goal === 0) strength[name] = 0;
      f.update(time, strength[name]);
    }

    // JARVIS: dreht sich leicht, denkt mit schnellerer Drehung, hört mit größeren Punkten zu, spricht mit dem Mund.
    head.visible = headVis > 0.01;
    // Auf der Bühne der Übersicht ist JARVIS größer als die Felsen um ihn; im Fokus rahmt ihn die Kamera.
    head.scale.setScalar(head.scale.x + ((biome.frame === "buehne" ? HEAD_STAGE : 1) - head.scale.x) * damp(3, dt));
    if (head.visible) {
      face.rotation.y = Math.sin(time * 0.25) * 0.35 + (avatar === "thinking" ? time * 1.2 : 0);
      face.position.y = Math.sin(time * 0.9) * (reduced ? 0 : 0.04);
      const hovered = hoverId === "fokus" || focusId === "fokus";
      bustMaterial.size = (avatar === "listening" ? 0.038 : 0.03) * (hovered ? 1.15 : 1);
      // Mit Nachleuchten addieren sich die Punkte schneller zu Weiß; dann etwas zurückhaltender, vor hellen
      // Fotos (Wolken, Schnee) noch etwas mehr.
      bustMaterial.opacity = (avatar === "idle" ? 0.8 : 0.95) * headVis * (1 - 0.38 * glowMix) * (usePhotos ? 0.78 : 1);
      projector.rotation.y = time * (avatar === "thinking" ? 1.6 : 0.25);
      headBeam.uniforms.uTime.value = time;
      headBeam.uniforms.uOpacity.value = (avatar === "speaking" ? 0.2 : 0.1) * headVis;
      // Die Insel gehört zur Bühne der Übersicht; im Fokus schwebt der Kopf frei.
      const ground = Math.min(headVis, rocksVis);
      island.visible = ground > 0.01;
      island.scale.setScalar(0.4 + 0.6 * ground);
      island.position.y = -0.62 - (1 - ground) * 1.5;
      islandEdges.opacity = 0.6 * ground;
      headIsland.stone.uTime.value = time;
      headIsland.debris.rotation.y = time * (reduced ? 0 : 0.08);
      const talk = avatar === "speaking" ? Math.abs(Math.sin(time * 9) * Math.sin(time * 2.7)) : 0;
      if (talk > 0 || mouthMoving) {
        for (let k = 0; k < mouthWeight.length; k++) mouth.setY(mouthStart + k, restY[k] - talk * 0.07 * mouthWeight[k]);
        mouth.clearUpdateRanges();
        mouth.addUpdateRange(mouthStart * 3, mouthWeight.length * 3);
        mouth.needsUpdate = true;
        mouthMoving = talk > 0;
      }
    }
    glow.intensity = 14 * Math.max(headVis, rocksVis * 0.6);

    // Felsen: schweben, wenden die Tafel zu dir, heben sich unter der Maus und leuchten auf.
    ring.visible = rocksVis > 0.01;
    if (ring.visible) {
      ringYaw += (ringYawTarget + (reduced ? 0 : Math.sin(time * 0.12) * 0.04) - ringYaw) * damp(5, dt);
      ring.rotation.y = ringYaw;
      const active = focusId ?? hoverId;
      rocks.forEach((r, i) => {
        r.hover += ((active === r.module.id ? 1 : 0) - r.hover) * damp(10, dt);
        r.flare = Math.max(0, r.flare - dt * 0.9);
        // Beim Auftauchen steigen die Felsen nacheinander aus der Tiefe.
        const delay = (i % 5) * 0.06;
        const vis = THREE.MathUtils.clamp((rocksVis - delay) / (1 - delay), 0, 1);
        const bob = reduced ? 0 : Math.sin(time * 0.7 + r.phase) * 0.09;
        r.root.position.set(r.base.x, r.base.y + bob + r.hover * 0.22 - (1 - vis) * 2.4, r.base.z);
        // Im Karussell treten die hinteren Felsen zurück, damit die vorderen lesbar bleiben.
        const front = portrait ? Math.cos(Math.atan2(r.base.x, r.base.z) + ringYaw) : 1;
        const depth = portrait ? THREE.MathUtils.clamp(0.5 + 0.5 * front, 0, 1) : 1;
        r.root.scale.setScalar((0.55 + 0.45 * vis) * (1 + r.hover * 0.07 + r.flare * 0.12) * (0.75 + 0.25 * depth));
        r.root.visible = vis > 0.01;
        // Die Tafel dreht sich zur Kamera (nur um die Hochachse), der Stein ein wenig mit.
        r.root.getWorldPosition(tmp);
        const yaw = Math.atan2(camera.position.x - tmp.x, camera.position.z - tmp.z) - ringYaw;
        r.panel.rotation.y = yaw;
        r.body.rotation.y = yaw * 0.3 + r.phase;
        r.panel.material.opacity = vis * (0.12 + 0.88 * depth * depth);
        r.panel.material.color.setScalar(0.96 + r.hover * 0.3 + r.flare * 1.2);
        r.edges.opacity = (0.5 + r.hover * 0.5) * vis;
        r.stone.uTime.value = time;
        r.stone.uGlow.value = r.hover + r.flare;
        r.debris.rotation.y = r.phase + time * (reduced ? 0 : 0.12);
        r.beam.uTime.value = time;
        r.beam.uOpacity.value = (0.28 + r.hover * 0.4 + r.flare) * vis;
      });
    }

    // Kamera: Ziel aus der Rahmung der Ansicht, dann weich dorthin gleiten.
    let cx = W / 2;
    let cy = H / 2;
    const rect = biome.frame === "frei" ? null : anchorRect();
    if (biome.frame !== "frei" && rect && rect.width > 40 && rect.height > 40) {
      dir.set(...biome.look).sub(tmp.set(...biome.eye)).normalize();
      if (portrait && biome.frame === "buehne") dir.set(0, -0.3, -1).normalize();
      const fitted = fit(biome.frame === "kopf" ? HEAD_POINTS : stage, dir, rect.width, rect.height);
      goalEye.copy(fitted.eye);
      goalLook.copy(fitted.look);
      cx = rect.left + rect.width / 2 - fitted.ex;
      cy = rect.top + rect.height / 2 - fitted.ey;
    } else {
      goalEye.set(...biome.eye);
      goalLook.set(...biome.look);
    }
    // Mitten im Flug steigt die Kamera etwas und legt sich in die Kurve.
    const arc = Math.sin(Math.PI * e) * (flying ? 1 : 0);
    const k = snapped ? damp(flying ? 3.2 : 4.5, dt) : 1;
    parallax.lerp(parallaxTarget, damp(3, dt));
    eye.lerp(lift.copy(goalEye).add(tmp.set(parallax.x * 0.35, -parallax.y * 0.2 + arc * 1.4, 0)), k);
    aim.lerp(goalLook, k);
    const ox = W / 2 - cx;
    const oy = H / 2 - cy;
    viewOffset.x += (ox - viewOffset.x) * k;
    viewOffset.y += (oy - viewOffset.y) * k;
    snapped = true;
    camera.position.copy(eye);
    camera.lookAt(aim);
    roll.value += (-side * arc * 0.09 - roll.value) * damp(4, dt);
    camera.rotateZ(roll.value);
    camera.setViewOffset(W, H, viewOffset.x, viewOffset.y, W, H);
    sky.group.position.copy(camera.position);
    if (usePhotos) photos.update(dt, time, parallax, look.accent, look.light);

    glowMix = level > 0 ? Math.min(1, glowMix + dt / 1.2) : Math.max(0, glowMix - dt / 1.2);
    bloom.strength = 0.7 * glowMix;
    bloom.enabled = glowMix > 0;
    if (level > 0 || glowMix > 0) composer.render(dt);
    else {
      if (usePhotos) {
        renderer.render(photos.scene, photos.camera);
        renderer.autoClear = false;
      }
      renderer.render(scene, camera);
      renderer.autoClear = true;
      if (ring.visible) renderLayer(renderer, scene, camera, PANEL_LAYER);
    }
    if (shown < 1 && !renderer.getContext().isContextLost()) {
      shown = reduced ? 1 : Math.min(1, shown + dt / 0.9);
      canvas.style.opacity = shown < 1 ? shown.toFixed(3) : "";
    }
  };

  // Alle Shader übersetzen, auch die der Landschaften, die noch nicht zu sehen sind. Sonst stockt der erste
  // Flug dorthin kurz. Mit Nachleuchten wird erst in ein Zwischenbild gezeichnet; dafür braucht es eigene
  // Shader-Varianten.
  function compileAll(into: THREE.WebGLRenderTarget | null, later = false) {
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    renderer.setRenderTarget(into);
    camera.layers.enable(PANEL_LAYER);
    const done = later ? renderer.compileAsync(scene, camera).catch(() => {}) : (renderer.compile(scene, camera), Promise.resolve());
    camera.layers.disable(PANEL_LAYER);
    renderer.setRenderTarget(null);
    for (const o of hidden) o.visible = false;
    return done;
  }

  applySize();
  bloom.enabled = glowMix > 0;
  paint();
  void compileAll(level > 0 ? composer.renderTarget1 : null);
  tick(performance.now());

  return {
    setBiome,
    setPanels(data, b) {
      panels = data;
      brain = b;
      paint();
    },
    setAvatar(s) {
      avatar = s;
    },
    setInteractive(on) {
      interactive = on;
      canvas.style.touchAction = on ? "none" : "";
      if (!on) {
        hoverId = null;
        drag = null;
        canvas.style.cursor = "";
      }
    },
    setPhotos(on) {
      usePhotos = on;
      showLandscape();
      passesFor();
    },
    setQuality(choice) {
      quality.fixed = choice !== "auto";
      saveQuality(choice === "auto" ? level : choice, quality.fixed);
      dropped = false;
      climbedAt = -Infinity;
      warmup = 45;
      applyQuality(choice === "auto" ? level : choice, performance.now());
    },
    focus(id) {
      focusId = id;
    },
    dispose() {
      cancelAnimationFrame(frame);
      photos.dispose();
      window.removeEventListener("resize", onResize);
      scene.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : mesh.material ? [mesh.material] : [];
        for (const m of materials) {
          for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
          m.dispose();
        }
      });
      composer.dispose();
      target.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
