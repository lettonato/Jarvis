import * as THREE from "three";
import type { BiomeId } from "@/lib/world";
import { PHOTOS } from "@/lib/photos";

// Die Fotowelt: echte Landschaftsfotos statt des gerechneten Gebirges. Der Kopf, die Felsen und der
// Lichtstaub schweben davor wie gewohnt. Ein Foto füllt immer den ganzen Bildschirm (wie „cover“), zoomt
// ganz langsam und folgt leicht der Maus. Beim Wechsel der Ansicht fliegt die Kamera in das alte Foto hinein,
// während das neue aus der Tiefe herankommt.

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;
uniform vec2 uFitA;
uniform vec2 uFitB;
uniform float uZoomA;
uniform float uZoomB;
uniform vec2 uPanA;
uniform vec2 uPanB;
uniform vec3 uTint;
uniform float uLight;
varying vec2 vUv;

vec3 photo(sampler2D t, vec2 fit, float zoom, vec2 pan) {
  vec2 uv = (vUv - 0.5) * fit / zoom + 0.5 + pan;
  return texture2D(t, clamp(uv, 0.001, 0.999)).rgb;
}

void main() {
  vec3 c = mix(photo(uA, uFitA, uZoomA, uPanA), photo(uB, uFitB, uZoomB, uPanB), smoothstep(0.0, 1.0, uMix));
  // Wie in der Dämmerung: etwas dunkler und leicht in die Farbe der Ansicht getaucht, damit JARVIS und die
  // Felsen leuchten und Text davor lesbar bleibt. Zum Rand hin dunkler.
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(c, uTint * l * 1.4, 0.14) * 0.78;
  float v = smoothstep(1.2, 0.3, length((vUv - vec2(0.5, 0.45)) * vec2(1.2, 1.0)));
  c *= mix(0.42, 1.0, v) * uLight;
  // Helle Stellen (Wolken, Schnee) sanft kappen, sonst greift das Nachleuchten auf das Foto über und der Kopf
  // davor verschwimmt in einem weißen Schein.
  float m = max(max(c.r, c.g), c.b);
  c /= 1.0 + max(0.0, m - 0.42) * 1.2;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}
`;

export type Photos = {
  scene: THREE.Scene;
  camera: THREE.Camera;
  set: (id: BiomeId, side: number, duration: number) => void;
  update: (dt: number, time: number, parallax: THREE.Vector2, tint: THREE.Color, light: number) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
};

type Slot = { tex: THREE.Texture | null; aspect: number; zoom: number; pan: THREE.Vector2 };

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const aspectOf = (t: THREE.Texture) => {
  const img = t.image as { width: number; height: number };
  return img.width / img.height;
};

export function createPhotos(initial: BiomeId, reduced: boolean): Photos {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const blank = new THREE.DataTexture(new Uint8Array([4, 6, 15, 255]), 1, 1);
  blank.needsUpdate = true;
  const uniforms = {
    uA: { value: blank as THREE.Texture },
    uB: { value: blank as THREE.Texture },
    uMix: { value: 1 },
    uFitA: { value: new THREE.Vector2(1, 1) },
    uFitB: { value: new THREE.Vector2(1, 1) },
    uZoomA: { value: 1 },
    uZoomB: { value: 1 },
    uPanA: { value: new THREE.Vector2() },
    uPanB: { value: new THREE.Vector2() },
    uTint: { value: new THREE.Color() },
    uLight: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  // Fotos laden, wenn sie gebraucht werden; die übrigen danach im Leerlauf, damit der erste Flug nicht wartet.
  const loader = new THREE.TextureLoader();
  const cache = new Map<BiomeId, Promise<THREE.Texture>>();
  const load = (id: BiomeId) => {
    let p = cache.get(id);
    if (!p) {
      p = loader.loadAsync(PHOTOS[id].src).then((t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        return t;
      });
      cache.set(id, p);
    }
    return p;
  };

  const a: Slot = { tex: null, aspect: 16 / 9, zoom: 1, pan: new THREE.Vector2() };
  const b: Slot = { tex: null, aspect: 16 / 9, zoom: 1, pan: new THREE.Vector2() };
  let current: BiomeId = initial;
  let progress = 1;
  let duration = 2;
  let side = 0;
  let zoomFromA = 1;
  let screen = 16 / 9;
  let disposed = false;

  const fit = (slot: Slot, out: THREE.Vector2) => (screen > slot.aspect ? out.set(1, slot.aspect / screen) : out.set(screen / slot.aspect, 1));

  load(initial).then((t) => {
    if (disposed || current !== initial) return;
    b.tex = t;
    b.aspect = aspectOf(t);
    uniforms.uB.value = t;
    uniforms.uMix.value = 1;
    const idle = (cb: () => void) => ("requestIdleCallback" in window ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 1500));
    idle(() => (Object.keys(PHOTOS) as BiomeId[]).forEach((id) => void load(id).catch(() => {})));
  });

  return {
    scene,
    camera,
    set(id, nextSide, nextDuration) {
      if (id === current) return;
      current = id;
      load(id)
        .then((t) => {
          if (disposed || current !== id) return;
          // Das bisherige Foto wandert nach A, das neue kommt nach B und blendet darüber.
          Object.assign(a, { tex: b.tex, aspect: b.aspect, zoom: b.zoom });
          a.pan.copy(b.pan);
          uniforms.uA.value = b.tex ?? blank;
          b.tex = t;
          b.aspect = aspectOf(t);
          uniforms.uB.value = t;
          zoomFromA = a.zoom;
          side = nextSide;
          duration = reduced ? 0 : Math.max(0.6, nextDuration * 0.9);
          progress = reduced ? 1 : 0;
        })
        .catch(() => {});
    },
    update(dt, time, parallax, tint, light) {
      if (progress < 1) progress = duration > 0 ? Math.min(1, progress + dt / duration) : 1;
      const e = ease(progress);
      // Langsames Atmen des Bildes und ein wenig Mitgehen mit der Maus.
      const drift = reduced ? 0 : 0.5 - 0.5 * Math.cos(time * 0.045);
      b.zoom = 1.04 + 0.05 * drift + (1 - e) * 0.16;
      b.pan.set(parallax.x * 0.012 + Math.sin(time * 0.03) * 0.006 + side * (1 - e) * 0.05, -parallax.y * 0.008 + Math.cos(time * 0.021) * 0.004);
      a.zoom = zoomFromA * (1 + e * 0.35);
      uniforms.uMix.value = b.tex ? e : 0;
      uniforms.uZoomA.value = a.zoom;
      uniforms.uZoomB.value = b.zoom;
      uniforms.uPanA.value.set(a.pan.x - side * e * 0.06, a.pan.y);
      uniforms.uPanB.value.copy(b.pan);
      fit(a, uniforms.uFitA.value);
      fit(b, uniforms.uFitB.value);
      uniforms.uTint.value.copy(tint);
      uniforms.uLight.value = light;
    },
    resize(w, h) {
      screen = w / Math.max(1, h);
    },
    dispose() {
      disposed = true;
      quad.geometry.dispose();
      material.dispose();
      blank.dispose();
      for (const p of cache.values()) p.then((t) => t.dispose()).catch(() => {});
    },
  };
}
