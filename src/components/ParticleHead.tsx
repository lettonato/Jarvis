"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type AvatarState = "idle" | "listening" | "thinking" | "speaking";

// Der JARVIS-Kopf aus Partikeln, wie im NEXUS-Video: eine Büste aus Punkten auf einem Gitterboden.
// Die Punkte liegen auf einfachen Formen (Kopf, Hals, Schultern); Augen, Nase und Mund sind
// kleine Ein- und Ausbuchtungen. Beim Sprechen bewegen sich die Punkte am Mund.

type Bust = { positions: Float32Array; colors: Float32Array; mouth: number[]; mouthWeight: number[] };

const BLUE = new THREE.Color("#3f7bff");
const CYAN = new THREE.Color("#8fdcff");
const WHITE = new THREE.Color("#e8f6ff");
const PINK = new THREE.Color("#ff4f7b");

const gauss = (d: number, sigma: number) => Math.exp(-(d * d) / (2 * sigma * sigma));

function randomDirection(): THREE.Vector3 {
  const u = Math.random() * 2 - 1;
  const phi = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return new THREE.Vector3(r * Math.cos(phi), u, r * Math.sin(phi));
}

type Particle = { p: THREE.Vector3; glow: number; feature: number; mouth: number };

// Gesichtszüge auf der Vorderseite des Kopfes: wie stark ein Punkt zu Brauen, Nase, Lippen
// oder Augenrand gehört, und wie weit er nach innen oder außen verschoben wird.
function face(x: number, y: number) {
  const eye = Math.min(Math.hypot(x - 0.21, y - 1.72), Math.hypot(x + 0.21, y - 1.72));
  const brow = gauss(y - 1.86, 0.025) * gauss(Math.abs(x) - 0.21, 0.08);
  const ridge = gauss(x, 0.03) * gauss(y - 1.6, 0.1);
  const tip = gauss(Math.hypot(x, y - 1.47), 0.05);
  const upperLip = gauss(y - 1.24, 0.02) * gauss(x, 0.14);
  const lowerLip = gauss(y - 1.15, 0.024) * gauss(x, 0.12);
  const eyeRim = gauss(eye - 0.085, 0.014);
  return {
    hole: eye < 0.065,
    feature: Math.max(brow, ridge, tip, upperLip, lowerLip, eyeRim),
    push: 0.15 * gauss(x, 0.055) * gauss(y - 1.52, 0.11) - 0.08 * gauss(eye, 0.07) + 0.03 * brow - 0.02 * (upperLip + lowerLip),
    mouth: lowerLip - 0.4 * upperLip,
  };
}

function buildBust(): Bust {
  const particles: Particle[] = [];

  // Kopf: Ellipsoid, unten zum Kinn hin schmaler, vorne mit Gesichtszügen.
  for (let i = 0; i < 5200; i++) {
    const n = randomDirection();
    const chin = 0.78 + 0.22 * THREE.MathUtils.smoothstep(n.y, -0.9, 0.1);
    const p = new THREE.Vector3(n.x * 0.6 * chin, 1.6 + n.y * 0.82, n.z * 0.68 * chin);
    const glow = 1 - Math.abs(n.z) * 0.6;
    if (n.z < 0.3) {
      particles.push({ p, glow, feature: 0, mouth: 0 });
      continue;
    }
    const f = face(p.x, p.y);
    if (f.hole && Math.random() < 0.9) continue;
    p.addScaledVector(n, f.push);
    particles.push({ p, glow, feature: f.feature, mouth: f.mouth });
    // Gesichtszüge bekommen zusätzliche Punkte, damit sie sich abheben.
    if (f.feature > 0.35) {
      for (let k = 0; k < 3; k++) {
        const q = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, 0.01));
        particles.push({ p: q, glow: 1, feature: f.feature, mouth: f.mouth });
      }
    }
  }

  // Hals: Zylindermantel.
  for (let i = 0; i < 900; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = 0.62 + Math.random() * 0.42;
    particles.push({ p: new THREE.Vector3(Math.cos(a) * 0.27, y, Math.sin(a) * 0.25), glow: 0.5 + 0.5 * Math.abs(Math.cos(a)), feature: 0, mouth: 0 });
  }

  // Schultern und Brust: obere Hälfte eines flachen Ellipsoids.
  for (let i = 0; i < 3800; i++) {
    const n = randomDirection();
    if (n.y < -0.05) n.y = -n.y;
    particles.push({ p: new THREE.Vector3(n.x * 1.35, 0.05 + n.y * 0.62, n.z * 0.5), glow: 1 - Math.abs(n.z) * 0.5, feature: 0, mouth: 0 });
  }

  const positions = new Float32Array(particles.length * 3);
  const colors = new Float32Array(particles.length * 3);
  const mouth: number[] = [];
  const mouthWeight: number[] = [];
  const c = new THREE.Color();
  particles.forEach(({ p, glow, feature, mouth: m }, i) => {
    p.toArray(positions, i * 3);
    // Rote Akzente auf der rechten Schulter, wie im Video.
    const accent = p.x > 0.55 && p.y < 0.75 && Math.random() < 0.35;
    if (accent) c.copy(PINK);
    else c.copy(BLUE).lerp(CYAN, glow * 0.6).lerp(WHITE, Math.min(feature, 1) * 0.8);
    // Kanten leuchten, die Fläche zur Kamera bleibt dunkler: so wirkt der Kopf räumlich.
    c.multiplyScalar(0.3 + 0.7 * Math.max(glow * glow, feature));
    c.toArray(colors, i * 3);
    if (Math.abs(m) > 0.1) {
      mouth.push(i);
      mouthWeight.push(m);
    }
  });
  return { positions, colors, mouth, mouthWeight };
}

function buildDust(count: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 12;
    positions[i * 3 + 1] = Math.random() * 5 - 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ size: 0.02, color: "#93c5fd", transparent: true, opacity: 0.5, depthWrite: false });
  return new THREE.Points(geometry, material);
}

export function ParticleHead({ state }: { state: AvatarState }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<AvatarState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#090b18", 6, 16);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
    camera.position.set(0, 1.35, 6.4);
    camera.lookAt(0, 1.05, 0);

    const bust = buildBust();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(bust.positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(bust.colors, 3));
    const material = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const head = new THREE.Points(geometry, material);
    scene.add(head);

    const restY = bust.mouth.map((i) => bust.positions[i * 3 + 1]);
    const dust = buildDust(500);
    scene.add(dust);

    const grid = new THREE.GridHelper(40, 80, "#2b4aa8", "#1b2a63");
    grid.position.y = -0.58;
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.45;
    scene.add(grid);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    const start = performance.now();
    let frame = 0;
    let spin = 0;
    const position = geometry.getAttribute("position") as THREE.BufferAttribute;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = (performance.now() - start) / 1000;
      const s = stateRef.current;

      spin += s === "thinking" ? 0.02 : 0;
      head.rotation.y = Math.sin(t * 0.25) * 0.35 + spin;
      head.scale.setScalar(1 + Math.sin(t * 1.2) * 0.008);
      material.size = s === "listening" ? 0.038 : 0.03;
      material.opacity = s === "idle" ? 0.85 : 1;

      // Beim Sprechen öffnet sich der Mund: die Unterlippe geht nach unten, die Oberlippe leicht nach oben.
      const talk = s === "speaking" ? Math.abs(Math.sin(t * 9) * Math.sin(t * 2.7)) : 0;
      bust.mouth.forEach((i, k) => {
        position.setY(i, restY[k] - talk * 0.07 * bust.mouthWeight[k]);
      });
      position.needsUpdate = true;

      dust.rotation.y = t * 0.02;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      dust.geometry.dispose();
      (dust.material as THREE.Material).dispose();
      grid.geometry.dispose();
      gridMaterial.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" aria-label="JARVIS-Avatar" role="img" />;
}
