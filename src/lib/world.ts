// Die Landschaften der 3D-Welt hinter JARVIS. Jede Ansicht hat ihre eigene: In der Übersicht schwebt
// der Kopf über einem Tal, die Module stehen als Felsen im Bogen drumherum. Öffnest du ein Modul, fliegt
// die Kamera durch die Berge in seine Landschaft, Formen und Farben gehen dabei ineinander über.

export type BiomeId = "uebersicht" | "fokus" | "aufgaben" | "kalender" | "post" | "browser" | "trading" | "intel" | "agenten" | "einstellungen";

// Was eine Landschaft besonders macht: Zeitringe am Himmel, Kurs-Säulen in der Schlucht …
export type Feature = "ringe" | "leuchtfeuer" | "kristalle" | "saeulen" | "radar" | "netz" | "aura";

// So rahmt die Kamera das Bild: um den Kopf (Fokus), um die Bühne mit Kopf und Felsen (Übersicht)
// oder frei auf die Landschaft hinter einer Arbeitsansicht.
export type Frame = "kopf" | "buehne" | "frei";

export type Biome = {
  // Gelände: Höhe der Berge, wie fein, wie schroff (0 weich, 1 Grate), wie stark gestuft (0 bis 1),
  // wie breit das Tal in der Mitte ist und wo im unendlichen Gebirge wir gerade sind.
  height: number;
  scale: number;
  ridge: number;
  terrace: number;
  valley: number;
  seed: [number, number];
  // Farben: Tal und Gipfel, Gitterlinien, Himmel oben und am Horizont, Polarlicht, Akzent der Besonderheit.
  low: string;
  high: string;
  grid: string;
  zenith: string;
  horizon: string;
  aurora: string;
  accent: string;
  // Hinter Arbeitsansichten ist die Welt gedämpft, damit Text lesbar bleibt.
  light: number;
  eye: [number, number, number];
  look: [number, number, number];
  frame: Frame;
  // Ob Kopf und Felsen zu sehen sind.
  head: number;
  rocks: number;
  feature: Feature | null;
};

const WORK = { light: 0.62, eye: [0, 1.2, 9] as [number, number, number], look: [0, 2.2, -30] as [number, number, number], frame: "frei" as const, head: 0, rocks: 0 };

export const BIOMES: Record<BiomeId, Biome> = {
  uebersicht: {
    height: 11,
    scale: 0.035,
    ridge: 0.45,
    terrace: 0,
    valley: 7,
    seed: [0, 0],
    low: "#0b1a4a",
    high: "#5cc8ff",
    grid: "#2f9bff",
    zenith: "#03050f",
    horizon: "#1a2466",
    aurora: "#c026d3",
    accent: "#38bdf8",
    light: 1,
    eye: [0, 2.1, 11],
    look: [0, 1.5, 0],
    frame: "buehne",
    head: 1,
    rocks: 1,
    feature: null,
  },
  fokus: {
    height: 7,
    scale: 0.03,
    ridge: 0.35,
    terrace: 0,
    valley: 9,
    seed: [0, -14],
    low: "#08133a",
    high: "#7dd3fc",
    grid: "#1e6fd9",
    zenith: "#020309",
    horizon: "#131b4d",
    aurora: "#22d3ee",
    accent: "#7dd3fc",
    light: 0.8,
    eye: [0, 1.6, 6],
    look: [0, 1.2, 0],
    frame: "kopf",
    head: 1,
    rocks: 0,
    feature: "aura",
  },
  aufgaben: {
    ...WORK,
    height: 8,
    scale: 0.03,
    ridge: 0.2,
    terrace: 1,
    valley: 6,
    seed: [-34, -70],
    low: "#052e1f",
    high: "#4ade80",
    grid: "#10b981",
    zenith: "#020a07",
    horizon: "#0b3b2c",
    aurora: "#a3e635",
    accent: "#86efac",
    feature: "leuchtfeuer",
  },
  kalender: {
    ...WORK,
    height: 5,
    scale: 0.025,
    ridge: 0.1,
    terrace: 0,
    valley: 10,
    seed: [-14, -78],
    low: "#062f33",
    high: "#5eead4",
    grid: "#14b8a6",
    zenith: "#02090b",
    horizon: "#0e4a52",
    aurora: "#fbbf24",
    accent: "#fbbf24",
    feature: "ringe",
  },
  post: {
    ...WORK,
    height: 13,
    scale: 0.04,
    ridge: 0.9,
    terrace: 0,
    valley: 6,
    seed: [-52, -60],
    low: "#0c1d3a",
    high: "#e0f2fe",
    grid: "#7dd3fc",
    zenith: "#03060d",
    horizon: "#1e3a5f",
    aurora: "#67e8f9",
    accent: "#bae6fd",
    feature: "kristalle",
  },
  // Der Browser: ein türkises Hochland mit dem Netz der Seiten darüber, links bei den Assistenten.
  browser: {
    ...WORK,
    height: 7,
    scale: 0.045,
    ridge: 0.5,
    terrace: 0.35,
    valley: 9,
    seed: [-70, -44],
    low: "#03201f",
    high: "#5eead4",
    grid: "#14b8a6",
    zenith: "#010807",
    horizon: "#0b3b3a",
    aurora: "#3b82f6",
    accent: "#99f6e4",
    feature: "netz",
  },
  trading: {
    ...WORK,
    height: 12,
    scale: 0.045,
    ridge: 0.75,
    terrace: 0.35,
    valley: 5,
    seed: [32, -72],
    low: "#1c0628",
    high: "#f472b6",
    grid: "#d946ef",
    zenith: "#06020a",
    horizon: "#3b0a45",
    aurora: "#22c55e",
    accent: "#22c55e",
    feature: "saeulen",
  },
  intel: {
    ...WORK,
    height: 4,
    scale: 0.05,
    ridge: 0.3,
    terrace: 0,
    valley: 12,
    seed: [50, -58],
    low: "#2a1204",
    high: "#fb923c",
    grid: "#f59e0b",
    zenith: "#090401",
    horizon: "#4a1d06",
    aurora: "#ef4444",
    accent: "#fdba74",
    feature: "radar",
  },
  agenten: {
    ...WORK,
    height: 8,
    scale: 0.032,
    ridge: 0.55,
    terrace: 0,
    valley: 8,
    seed: [14, -84],
    low: "#150a33",
    high: "#c4b5fd",
    grid: "#8b5cf6",
    zenith: "#04020c",
    horizon: "#2a1660",
    aurora: "#ec4899",
    accent: "#c4b5fd",
    feature: "netz",
  },
  einstellungen: {
    ...WORK,
    height: 4,
    scale: 0.02,
    ridge: 0.2,
    terrace: 0,
    valley: 12,
    seed: [0, -100],
    low: "#0d1424",
    high: "#94a3b8",
    grid: "#475569",
    zenith: "#030509",
    horizon: "#1e293b",
    aurora: "#6366f1",
    accent: "#cbd5e1",
    feature: null,
  },
};

export function biomeOf(pathname: string): BiomeId {
  if (pathname === "/") return "uebersicht";
  const first = pathname.split("/")[1] as BiomeId;
  return first in BIOMES ? first : "uebersicht";
}
