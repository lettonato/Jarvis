import * as THREE from "three";

// Das Gebirge: eine große Fläche, deren Höhen erst auf der Grafikkarte aus Rauschen entstehen. So kann
// die Landschaft fließend in eine andere übergehen und die Kamera scheinbar darüber hinwegfliegen,
// ohne dass ein Punkt neu berechnet und hochgeladen werden muss.

// 2D-Simplex-Rauschen von Ian McEwan und Stefan Gustavson (MIT-Lizenz).
export const NOISE = /* glsl */ `
vec3 permute3(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute3(permute3(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`;

const VERTEX = /* glsl */ `
uniform float uHeight;
uniform float uScale;
uniform float uRidge;
uniform float uTerrace;
uniform float uValley;
uniform vec2 uOffset;
varying vec3 vWorld;
varying vec2 vGround;
varying float vLevel;
${NOISE}

// Höhe 0 bis 1: weiche Hügel und scharfe Grate gemischt, auf Wunsch in Stufen.
float level(vec2 q) {
  float n = 0.0;
  float r = 0.0;
  float amp = 0.5;
  float f = 1.0;
  for (int i = 0; i < 5; i++) {
    float s = snoise(q * f);
    n += s * amp;
    r += (1.0 - abs(s)) * amp;
    f *= 2.03;
    amp *= 0.5;
  }
  float h = mix(clamp(n * 0.6 + 0.5, 0.0, 1.0), r * r * 1.1, uRidge);
  float steps = floor(h * 7.0 + 0.5) / 7.0;
  return mix(h, steps, uTerrace * 0.8);
}

void main() {
  vec3 p = position;
  vec2 ground = p.xz + uOffset;
  float h = level(ground * uScale);
  // In der Mitte ein flaches Tal, zu den Seiten und nach hinten steigen die Berge.
  float side = smoothstep(uValley, uValley * 2.6 + 6.0, abs(p.x));
  float far = smoothstep(14.0, 70.0, -p.z);
  float lift = max(side, far * 0.9);
  p.y = h * uHeight * mix(0.1, 1.0, lift) - 5.0;
  vLevel = h * mix(0.35, 1.0, lift);
  vGround = ground;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uLow;
uniform vec3 uHigh;
uniform vec3 uGrid;
uniform vec3 uFog;
uniform float uLight;
uniform float uTime;
varying vec3 vWorld;
varying vec2 vGround;
varying float vLevel;

float line(vec2 g, float width) {
  vec2 d = abs(fract(g - 0.5) - 0.5) / max(fwidth(g), vec2(1e-4));
  return 1.0 - min(min(d.x, d.y) / width, 1.0);
}

void main() {
  float dist = length(vWorld - cameraPosition);
  float near = 1.0 - smoothstep(35.0, 110.0, dist);
  // Dunkle Flächen, darauf ein Gitter und Höhenlinien, die zu den Gipfeln hin heller werden.
  vec3 col = mix(uLow * 0.28, uHigh * 0.22, vLevel);
  float grid = line(vGround * 0.5, 1.1) * near;
  float contour = 1.0 - min(abs(fract(vLevel * 9.0 - 0.5) - 0.5) / max(fwidth(vLevel * 9.0), 1e-4), 1.0);
  col += uGrid * grid * (0.3 + 0.9 * vLevel);
  col += uHigh * contour * vLevel * 0.55 * (0.4 + 0.6 * near);
  col += uHigh * smoothstep(0.62, 1.0, vLevel) * 0.35;
  // Eine Lichtwelle läuft über das Land, wie ein Scan.
  float wave = fract((dist - uTime * 7.0) / 55.0);
  col += uGrid * smoothstep(0.96, 1.0, wave) * 0.35 * near;
  col *= uLight;
  float fog = 1.0 - exp(-pow(dist * 0.0105, 2.0));
  gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
}
`;

export type TerrainUniforms = {
  uHeight: { value: number };
  uScale: { value: number };
  uRidge: { value: number };
  uTerrace: { value: number };
  uValley: { value: number };
  uOffset: { value: THREE.Vector2 };
  uLow: { value: THREE.Color };
  uHigh: { value: THREE.Color };
  uGrid: { value: THREE.Color };
  uFog: { value: THREE.Color };
  uLight: { value: number };
  uTime: { value: number };
};

export function createTerrain(segments: number): { mesh: THREE.Mesh; uniforms: TerrainUniforms } {
  const geometry = new THREE.PlaneGeometry(260, 260, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  // Die Fläche liegt etwas vor der Kamera, damit hinten mehr Gebirge ist.
  geometry.translate(0, 0, -60);
  const uniforms: TerrainUniforms = {
    uHeight: { value: 9 },
    uScale: { value: 0.035 },
    uRidge: { value: 0.4 },
    uTerrace: { value: 0 },
    uValley: { value: 7 },
    uOffset: { value: new THREE.Vector2() },
    uLow: { value: new THREE.Color() },
    uHigh: { value: new THREE.Color() },
    uGrid: { value: new THREE.Color() },
    uFog: { value: new THREE.Color() },
    uLight: { value: 1 },
    uTime: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms });
  const mesh = new THREE.Mesh(geometry, material);
  // Die Höhen entstehen erst im Shader; ohne das würde three.js die Fläche manchmal fälschlich wegschneiden.
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}
