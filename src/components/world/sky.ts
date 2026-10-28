import * as THREE from "three";
import { NOISE } from "./terrain";

// Der Himmel über dem Gebirge: oben fast schwarz, zum Horizont hin in der Farbe der Landschaft,
// darin ein Polarlicht, das langsam weht, und eine leuchtende Linie am Horizont. Dazu Sterne, die funkeln.

const SKY_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 world = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const SKY_FRAGMENT = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uAurora;
uniform vec3 uAccent;
uniform float uLight;
uniform float uTime;
varying vec3 vDir;
${NOISE}

void main() {
  vec3 d = normalize(vDir);
  float up = clamp(d.y, -1.0, 1.0);
  vec3 col = mix(uHorizon, uZenith, smoothstep(-0.02, 0.55, up));
  // Polarlicht: Vorhänge aus Licht, die sich mit der Zeit verschieben und nach oben ausfransen.
  float around = atan(d.x, -d.z);
  float band = smoothstep(0.05, 0.22, up) * (1.0 - smoothstep(0.32, 0.75, up));
  float curtain = snoise(vec2(around * 3.0, uTime * 0.05)) * 0.5 + 0.5;
  float streaks = snoise(vec2(around * 26.0 + curtain * 3.0, up * 3.0 - uTime * 0.18)) * 0.5 + 0.5;
  float glow = band * curtain * curtain * (0.35 + 0.65 * streaks);
  col += mix(uAurora, uAccent, smoothstep(0.1, 0.5, up)) * glow * 0.55;
  // Die Lichtlinie am Horizont, wie bei einem Hologramm-Raum.
  col += uAccent * exp(-abs(up - 0.01) * 90.0) * 0.45;
  gl_FragColor = vec4(col * uLight, 1.0);
}
`;

const STAR_VERTEX = /* glsl */ `
attribute float aPhase;
attribute float aSize;
uniform float uTime;
uniform float uPixel;
varying float vTwinkle;
void main() {
  vTwinkle = 0.55 + 0.45 * sin(uTime * (0.8 + aPhase) + aPhase * 40.0);
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * view;
  gl_PointSize = aSize * uPixel;
}
`;

const STAR_FRAGMENT = /* glsl */ `
uniform float uLight;
varying float vTwinkle;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vec3(0.75, 0.85, 1.0) * a * vTwinkle * uLight, a);
}
`;

export type SkyUniforms = {
  uZenith: { value: THREE.Color };
  uHorizon: { value: THREE.Color };
  uAurora: { value: THREE.Color };
  uAccent: { value: THREE.Color };
  uLight: { value: number };
  uTime: { value: number };
};

export function createSky(): { group: THREE.Group; uniforms: SkyUniforms; starUniforms: { uTime: { value: number }; uPixel: { value: number }; uLight: { value: number } } } {
  const uniforms: SkyUniforms = {
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uAurora: { value: new THREE.Color() },
    uAccent: { value: new THREE.Color() },
    uLight: { value: 1 },
    uTime: { value: 0 },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(400, 48, 24),
    new THREE.ShaderMaterial({ vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, uniforms, side: THREE.BackSide, depthWrite: false }),
  );
  dome.renderOrder = -2;

  // Sterne nur am oberen Himmel; die unteren verschwinden hinter den Bergen.
  const count = 1400;
  const positions = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const size = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = 0.04 + Math.pow(Math.random(), 0.7) * 0.96;
    const r = Math.sqrt(1 - y * y);
    positions.set([Math.cos(a) * r * 360, y * 360, Math.sin(a) * r * 360], i * 3);
    phase[i] = Math.random();
    size[i] = Math.random() < 0.06 ? 3.2 : 1.2 + Math.random() * 1.4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const starUniforms = { uTime: { value: 0 }, uPixel: { value: 1 }, uLight: { value: 1 } };
  const stars = new THREE.Points(
    geometry,
    new THREE.ShaderMaterial({
      vertexShader: STAR_VERTEX,
      fragmentShader: STAR_FRAGMENT,
      uniforms: starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  stars.renderOrder = -1;
  stars.frustumCulled = false;

  const group = new THREE.Group();
  group.add(dome, stars);
  return { group, uniforms, starUniforms };
}
