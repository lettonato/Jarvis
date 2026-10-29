import * as THREE from "three";

// Der Stein der schwebenden Inseln: Gesteinsschichten und feine Körnung im Shader, oben ein glatter Sockel
// mit leuchtendem Raster, unten Adern in der Farbe der Landschaft, die langsam pulsieren. Dazu ein
// Schimmer an der Kante, damit sich die Insel vor jedem Hintergrund abhebt. Alles wird pro Bildpunkt
// gerechnet, deshalb bleibt der Stein auch ganz nah und auf scharfen Bildschirmen fein.

const NOISE = /* glsl */ `
vec3 stoneMod(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 stoneMod(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 stonePermute(vec4 x) { return stoneMod(((x * 34.0) + 10.0) * x); }
float stoneNoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - 0.5;
  i = stoneMod(i);
  vec4 p = stonePermute(stonePermute(stonePermute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec4 j = p - 49.0 * floor(p * (1.0 / 49.0));
  vec4 x_ = floor(j * (1.0 / 7.0));
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = (x_ * 2.0 + 0.5) / 7.0 - 1.0;
  vec4 y = (y_ * 2.0 + 0.5) / 7.0 - 1.0;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 g0 = vec3(a0.xy, h.x);
  vec3 g1 = vec3(a0.zw, h.y);
  vec3 g2 = vec3(a1.xy, h.z);
  vec3 g3 = vec3(a1.zw, h.w);
  vec4 norm = inversesqrt(vec4(dot(g0, g0), dot(g1, g1), dot(g2, g2), dot(g3, g3)));
  g0 *= norm.x; g1 *= norm.y; g2 *= norm.z; g3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(g0, x0), dot(g1, x1), dot(g2, x2), dot(g3, x3)));
}
float stoneFbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * stoneNoise(p);
    p = p * 2.07 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}
`;

export type StoneUniforms = { uAccent: { value: THREE.Color }; uGlow: { value: number }; uTime: { value: number }; uSize: { value: number } };

export function createStone(accent: THREE.Color, size = 1): { material: THREE.MeshStandardMaterial; uniforms: StoneUniforms } {
  const uniforms: StoneUniforms = { uAccent: { value: accent.clone() }, uGlow: { value: 0 }, uTime: { value: 0 }, uSize: { value: size } };
  const material = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.78, metalness: 0.12 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vStone;\nvarying vec3 vStoneNormal;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvStone = position;\nvStoneNormal = objectNormal;");
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform vec3 uAccent;
uniform float uGlow;
uniform float uTime;
uniform float uSize;
varying vec3 vStone;
varying vec3 vStoneNormal;
${NOISE}`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
  vec3 sp = vStone / uSize;
  float grain = stoneFbm(sp * 3.4);
  // Waagrechte Gesteinsschichten, vom Rauschen leicht gewellt.
  float strata = 0.5 + 0.5 * sin(sp.y * 54.0 + grain * 5.0);
  float top = smoothstep(0.6, 0.9, normalize(vStoneNormal).y);
  vec3 rock = mix(vec3(0.03, 0.036, 0.07), vec3(0.13, 0.14, 0.2), clamp(grain * 0.8 + 0.45, 0.0, 1.0));
  rock *= 0.78 + 0.4 * strata;
  rock = mix(rock, rock + uAccent * 0.05, smoothstep(0.0, -0.4, sp.y));
  vec3 plinth = mix(vec3(0.06, 0.075, 0.13), uAccent * 0.16, 0.35) * (0.9 + 0.2 * grain);
  diffuseColor.rgb = mix(rock, plinth, top);`,
      )
      .replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
  {
    // Feine Unebenheiten aus Körnung und Schichten, ohne zusätzliche Dreiecke.
    float bump = (grain * 0.018 + strata * 0.006) * uSize * (1.0 - top * 0.8);
    vec3 dpdx = dFdx(-vViewPosition);
    vec3 dpdy = dFdy(-vViewPosition);
    float dhx = dFdx(bump);
    float dhy = dFdy(bump);
    vec3 r1 = cross(dpdy, normal);
    vec3 r2 = cross(normal, dpdx);
    float det = dot(dpdx, r1);
    vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
    normal = normalize(abs(det) * normal - grad);
  }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
  {
    // Leuchtende Adern unten im Fels, die langsam pulsieren.
    float vein = 1.0 - abs(stoneNoise(sp * vec3(4.2, 2.6, 4.2) + vec3(0.0, uTime * 0.04, 0.0)));
    vein = pow(vein, 28.0) * smoothstep(0.0, -0.3, sp.y);
    float pulse = 0.7 + 0.3 * sin(uTime * 1.3 + sp.y * 9.0);
    totalEmissiveRadiance += uAccent * vein * (0.75 + uGlow * 2.0) * pulse;
    // Feines Raster auf dem Sockel, kantenscharf auf jeder Bildschirmgröße.
    vec2 gp = sp.xz * 6.0;
    vec2 gd = abs(fract(gp - 0.5) - 0.5) / max(fwidth(gp), vec2(1e-4));
    float grid = (1.0 - clamp(min(gd.x, gd.y), 0.0, 1.0)) * top;
    totalEmissiveRadiance += uAccent * grid * (0.09 + uGlow * 0.5);
    // Schimmer an der Kante.
    float rim = pow(1.0 - abs(dot(normal, normalize(vViewPosition))), 3.0);
    totalEmissiveRadiance += mix(vec3(0.49, 0.83, 0.99), uAccent, 0.5) * rim * (0.28 + uGlow * 0.7);
  }`,
      );
  };
  // Alle Inseln teilen sich ein Programm; die Farbe kommt über die Uniforms.
  material.customProgramCacheKey = () => "jarvis-stone";
  return { material, uniforms };
}
