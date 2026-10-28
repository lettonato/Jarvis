import * as THREE from "three";

// Der JARVIS-Kopf aus Partikeln, wie im NEXUS-Video: eine Büste aus Punkten.
// Die Punkte liegen auf einfachen Formen (Kopf, Hals, Schultern); Augen, Nase und Mund sind
// kleine Ein- und Ausbuchtungen. Beim Sprechen bewegen sich die Punkte am Mund.
// Die Büste steht auf y = 0 und ist etwa 2,4 hoch.

// Die Punkte am Mund liegen am Ende der Liste (ab mouthStart): Beim Sprechen muss nur dieses kurze Stück
// neu zur Grafikkarte, nicht die ganze Büste.
export type Bust = { positions: Float32Array; colors: Float32Array; mouthStart: number; mouthWeight: Float32Array };

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

  const moves = (q: Particle) => Math.abs(q.mouth) > 0.1;
  const ordered = [...particles.filter((q) => !moves(q)), ...particles.filter(moves)];
  const mouthStart = ordered.length - particles.filter(moves).length;
  const positions = new Float32Array(ordered.length * 3);
  const colors = new Float32Array(ordered.length * 3);
  const mouthWeight = new Float32Array(ordered.length - mouthStart);
  const c = new THREE.Color();
  ordered.forEach(({ p, glow, feature, mouth: m }, i) => {
    p.toArray(positions, i * 3);
    // Rote Akzente auf der rechten Schulter, wie im Video.
    const accent = p.x > 0.55 && p.y < 0.75 && Math.random() < 0.35;
    if (accent) c.copy(PINK);
    else c.copy(BLUE).lerp(CYAN, glow * 0.6).lerp(WHITE, Math.min(feature, 1) * 0.8);
    // Kanten leuchten, die Fläche zur Kamera bleibt dunkler: so wirkt der Kopf räumlich.
    c.multiplyScalar(0.3 + 0.7 * Math.max(glow * glow, feature));
    c.toArray(colors, i * 3);
    if (i >= mouthStart) mouthWeight[i - mouthStart] = m;
  });
  return { positions, colors, mouthStart, mouthWeight };
}

// Die Büste wird nur einmal berechnet; jeder Kopf auf der Seite bekommt eine eigene Kopie der Punkte,
// weil sich der Mund beim Sprechen bewegt.
let built: Bust | null = null;
export function bust(): Bust {
  built ??= buildBust();
  return { ...built, positions: built.positions.slice() };
}
