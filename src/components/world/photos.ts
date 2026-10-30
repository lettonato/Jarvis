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

// Bis zu drei Fotos liegen übereinander: das unterste ganz, die beiden darüber blenden ein. Wechselst du
// schnell hintereinander die Ansicht, blendet das nächste Foto über das halb sichtbare, statt dass etwas springt.
const FRAGMENT = /* glsl */ `
uniform sampler2D uA;
uniform sampler2D uB;
uniform sampler2D uC;
uniform float uMixB;
uniform float uMixC;
uniform vec2 uFitA;
uniform vec2 uFitB;
uniform vec2 uFitC;
uniform float uZoomA;
uniform float uZoomB;
uniform float uZoomC;
uniform vec2 uPanA;
uniform vec2 uPanB;
uniform vec2 uPanC;
uniform vec3 uTint;
uniform float uLight;
varying vec2 vUv;

vec3 photo(sampler2D t, vec2 fit, float zoom, vec2 pan) {
  vec2 uv = (vUv - 0.5) * fit / zoom + 0.5 + pan;
  return texture2D(t, clamp(uv, 0.001, 0.999)).rgb;
}

void main() {
  vec3 c = photo(uA, uFitA, uZoomA, uPanA);
  if (uMixB > 0.0) c = mix(c, photo(uB, uFitB, uZoomB, uPanB), smoothstep(0.0, 1.0, uMixB));
  if (uMixC > 0.0) c = mix(c, photo(uC, uFitC, uZoomC, uPanC), smoothstep(0.0, 1.0, uMixC));
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

// Ein Foto im Stapel. progress läuft beim Einblenden von 0 bis 1; das unterste Foto ist immer ganz da.
type Layer = { id: BiomeId; tex: THREE.Texture; aspect: number; side: number; progress: number; duration: number };

const ease = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);
const aspectOf = (t: THREE.Texture) => {
  const img = t.image as { width: number; height: number };
  return img.width / img.height;
};
const idle = (cb: () => void) => ("requestIdleCallback" in window ? window.requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 1500));

// prepare lädt ein Foto vorab auf die Grafikkarte, damit der erste Flug dorthin nicht kurz hängt.
export function createPhotos(initial: BiomeId, reduced: boolean, prepare: (t: THREE.Texture) => void): Photos {
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const blank = new THREE.DataTexture(new Uint8Array([4, 6, 15, 255]), 1, 1);
  blank.needsUpdate = true;
  const slot = () => ({ tex: { value: blank as THREE.Texture }, fit: { value: new THREE.Vector2(1, 1) }, zoom: { value: 1 }, pan: { value: new THREE.Vector2() } });
  const slots = [slot(), slot(), slot()];
  const mixB = { value: 0 };
  const mixC = { value: 0 };
  const uniforms = {
    uA: slots[0].tex,
    uB: slots[1].tex,
    uC: slots[2].tex,
    uMixB: mixB,
    uMixC: mixC,
    uFitA: slots[0].fit,
    uFitB: slots[1].fit,
    uFitC: slots[2].fit,
    uZoomA: slots[0].zoom,
    uZoomB: slots[1].zoom,
    uZoomC: slots[2].zoom,
    uPanA: slots[0].pan,
    uPanB: slots[1].pan,
    uPanC: slots[2].pan,
    uTint: { value: new THREE.Color() },
    uLight: { value: 1 },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  // Fotos laden, wenn sie gebraucht werden; die übrigen danach im Leerlauf, eins nach dem anderen fertig
  // entpackt und auf die Grafikkarte gelegt.
  const loader = new THREE.TextureLoader();
  const cache = new Map<BiomeId, Promise<THREE.Texture>>();
  const load = (id: BiomeId) => {
    let p = cache.get(id);
    if (!p) {
      p = loader.loadAsync(PHOTOS[id].src).then(async (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        await (t.image as HTMLImageElement).decode?.().catch(() => {});
        return t;
      });
      cache.set(id, p);
    }
    return p;
  };

  let layers: Layer[] = [];
  let wanted: BiomeId = initial;
  let screen = 16 / 9;
  let disposed = false;

  const push = (id: BiomeId, tex: THREE.Texture, side: number, duration: number) => {
    const layer: Layer = { id, tex, aspect: aspectOf(tex), side, progress: layers.length === 0 || reduced ? 1 : 0, duration };
    if (layer.progress === 1) layers = [];
    // Schon drei im Stapel: das Foto, das gerade am wenigsten zu sehen ist, fällt weg.
    if (layers.length === 3) {
      const shown = layers.map((_, i) => visibility(i));
      const drop = shown.indexOf(Math.min(...shown));
      layers.splice(drop, 1);
      layers[0].progress = 1;
    }
    layers.push(layer);
  };
  // Wie viel von Foto i noch zu sehen ist, mit allem, was darüber liegt.
  const opacity = (l: Layer) => smooth(ease(l.progress));
  const visibility = (i: number) => {
    let v = i === 0 ? 1 : opacity(layers[i]);
    for (let j = i + 1; j < layers.length; j++) v *= 1 - opacity(layers[j]);
    return v;
  };

  // Erst das Foto der Ansicht, in der du startest, danach die übrigen.
  const queue = [initial, ...(Object.keys(PHOTOS) as BiomeId[]).filter((id) => id !== initial)];
  const next = () => {
    const id = queue.shift();
    if (!id || disposed) return;
    load(id)
      .then((t) => {
        if (disposed) return;
        prepare(t);
        if (id === initial && wanted === initial && layers.length === 0) push(initial, t, 0, 0);
      })
      .catch(() => {})
      .finally(() => idle(next));
  };
  next();

  return {
    scene,
    camera,
    set(id, side, duration) {
      if (id === wanted) return;
      wanted = id;
      load(id)
        .then((t) => {
          if (disposed || wanted !== id) return;
          push(id, t, side, reduced ? 0 : Math.max(0.6, duration * 0.9));
        })
        .catch(() => {});
    },
    update(dt, time, parallax, tint, light) {
      for (const l of layers) if (l.progress < 1) l.progress = l.duration > 0 ? Math.min(1, l.progress + dt / l.duration) : 1;
      // Ist das oberste Foto ganz da, braucht es die darunter nicht mehr.
      const top = layers.findLastIndex((l) => l.progress >= 1);
      if (top > 0) layers = layers.slice(top);
      // Langsames Atmen des Bildes und ein wenig Mitgehen mit der Maus.
      const drift = reduced ? 0 : 0.5 - 0.5 * Math.cos(time * 0.045);
      layers.forEach((l, i) => {
        const s = slots[i];
        const e = ease(l.progress);
        // Das neue Foto kommt aus der Tiefe heran, das darunter fliegt dabei auf dich zu und zur Seite weg.
        const over = layers[i + 1];
        const away = over ? ease(over.progress) : 0;
        s.tex.value = l.tex;
        s.zoom.value = (1.04 + 0.05 * drift + (1 - e) * 0.16) * (1 + away * 0.35);
        s.pan.value.set(
          parallax.x * 0.012 + Math.sin(time * 0.03) * 0.006 + l.side * (1 - e) * 0.05 - (over?.side ?? 0) * away * 0.06,
          -parallax.y * 0.008 + Math.cos(time * 0.021) * 0.004,
        );
        if (screen > l.aspect) s.fit.value.set(1, l.aspect / screen);
        else s.fit.value.set(screen / l.aspect, 1);
      });
      for (let i = layers.length; i < 3; i++) slots[i].tex.value = blank;
      mixB.value = layers[1] ? ease(layers[1].progress) : 0;
      mixC.value = layers[2] ? ease(layers[2].progress) : 0;
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
