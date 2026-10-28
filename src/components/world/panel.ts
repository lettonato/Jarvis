import * as THREE from "three";
import { iconSvg } from "../icons";
import { isActive, type JarvisModule } from "@/lib/modules";

// Die Glas-Tafel über einem Felsen, wie in der NEXUS-Oberfläche: Kennung, Zustand, Symbol, Name und
// die aktuelle Zahl des Moduls. Sie wird in ein Bild gemalt, das als Textur auf einer Fläche in der Welt liegt.
// Auf dem Handy ist die Tafel klein; dort steht nur das Wichtigste darauf, dafür größer.

export type PanelData = { value: string; detail: string; alert?: boolean };

export const PANEL_W = 512;
export const PANEL_H = 688;
const FONT = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const icons = new Map<string, HTMLImageElement>();

function icon(name: JarvisModule["id"], color: string, onLoad: () => void): HTMLImageElement {
  const key = `${name}|${color}`;
  let img = icons.get(key);
  if (!img) {
    img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(name, color, 1.5))}`;
    icons.set(key, img);
  }
  if (!img.complete) img.addEventListener("load", onLoad, { once: true });
  return img;
}

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Bricht Text in höchstens `lines` Zeilen um und kürzt den Rest mit „…“.
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, lines: number): string[] {
  const words = text.split(/\s+/);
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= width) {
      line = next;
      continue;
    }
    if (line) out.push(line);
    line = word;
    if (out.length === lines) break;
  }
  if (out.length < lines && line) out.push(line);
  if (out.length > lines || (out.length === lines && words.join(" ") !== out.join(" "))) {
    let last = out[lines - 1] ?? "";
    while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1);
    out.length = lines;
    out[lines - 1] = `${last.trimEnd()}…`;
  }
  return out;
}

function fit(ctx: CanvasRenderingContext2D, text: string, width: number, weight: string, size: number, min: number): number {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > min && ctx.measureText(text).width > width) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  return s;
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: "left" | "center" | "right") {
  ctx.letterSpacing = `${spacing}px`;
  ctx.textAlign = align;
  ctx.fillText(text, x, y);
  ctx.letterSpacing = "0px";
}

export type Panel = { texture: THREE.CanvasTexture; draw: (data: PanelData | undefined, brain: boolean, compact: boolean) => void };

export function createPanel(module: JarvisModule, accent: string): Panel {
  const canvas = document.createElement("canvas");
  canvas.width = PANEL_W;
  canvas.height = PANEL_H;
  const ctx = canvas.getContext("2d")!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  let last: [PanelData | undefined, boolean, boolean] = [undefined, false, false];

  const draw = (data: PanelData | undefined, brain: boolean, compact: boolean) => {
    last = [data, brain, compact];
    const active = isActive(module, brain);
    const W = PANEL_W;
    const H = PANEL_H;
    ctx.clearRect(0, 0, W, H);

    // Glas: oben heller, unten fast durchsichtig, mit feinen Scanlinien.
    const glass = ctx.createLinearGradient(0, 0, 0, H);
    glass.addColorStop(0, "rgba(56,189,248,0.30)");
    glass.addColorStop(0.55, "rgba(30,64,175,0.16)");
    glass.addColorStop(1, "rgba(14,22,60,0.30)");
    rounded(ctx, 6, 6, W - 12, H - 12, 26);
    ctx.fillStyle = glass;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(186,230,253,0.05)";
    for (let y = 10; y < H; y += 6) ctx.fillRect(0, y, W, 2);
    // Ein Lichtschimmer schräg über das Glas.
    const sheen = ctx.createLinearGradient(0, 0, W, H * 0.6);
    sheen.addColorStop(0, "rgba(255,255,255,0.10)");
    sheen.addColorStop(0.35, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Rahmen und Eckwinkel.
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(125,211,252,0.75)";
    rounded(ctx, 6, 6, W - 12, H - 12, 26);
    ctx.stroke();
    ctx.lineWidth = 7;
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineCap = "round";
    const c = 52;
    for (const [x, y, dx, dy] of [
      [14, 14, 1, 1],
      [W - 14, 14, -1, 1],
      [14, H - 14, 1, -1],
      [W - 14, H - 14, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x, y + dy * c);
      ctx.lineTo(x, y);
      ctx.lineTo(x + dx * c, y);
      ctx.stroke();
    }
    // Farbstreifen der Landschaft, in die das Modul führt.
    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 - 60, 6, 120, 6);

    ctx.textBaseline = "alphabetic";
    const pad = 44;

    if (compact) {
      ctx.drawImage(icon(module.id, "#e0f2fe", () => draw(...last)), W / 2 - 100, 70, 200, 200);
      ctx.fillStyle = "#f0f9ff";
      const size = fit(ctx, module.name.toUpperCase(), W - 2 * pad, "bold", 74, 44);
      ctx.font = `bold ${size}px ${FONT}`;
      spaced(ctx, module.name.toUpperCase(), W / 2, 372, 4, "center");
      const value = data?.value ?? (active ? "…" : "später");
      ctx.fillStyle = data?.alert ? "#f9a8d4" : "#ffffff";
      const vs = fit(ctx, value, W - 2 * pad, "bold", 120, 56);
      ctx.font = `bold ${vs}px ${FONT}`;
      spaced(ctx, value, W / 2, 530, 0, "center");
      ctx.fillStyle = "rgba(186,230,253,0.85)";
      ctx.font = `bold 34px ${FONT}`;
      spaced(ctx, "ÖFFNEN ›", W / 2, H - 56, 6, "center");
      texture.needsUpdate = true;
      return;
    }

    ctx.font = `bold 28px ${FONT}`;
    ctx.fillStyle = "rgba(186,230,253,0.7)";
    spaced(ctx, module.code, pad, 70, 5, "left");
    ctx.fillStyle = active ? "#4ade80" : "#94a3b8";
    spaced(ctx, active ? "● AKTIV" : module.phase >= 6 ? "SPÄTER" : `PHASE ${module.phase}`, W - pad, 70, 4, "right");

    // Symbol mit Leuchten, daneben der Name, darunter wofür das Modul da ist.
    const img = icon(module.id, "#e0f2fe", () => draw(...last));
    ctx.save();
    ctx.shadowColor = "rgba(125,211,252,0.95)";
    ctx.shadowBlur = 24;
    ctx.drawImage(img, pad - 8, 100, 104, 104);
    ctx.restore();

    ctx.fillStyle = "#f0f9ff";
    const size = fit(ctx, module.name.toUpperCase(), W - pad - 150, "bold", 62, 36);
    ctx.font = `bold ${size}px ${FONT}`;
    spaced(ctx, module.name.toUpperCase(), pad + 116, 172, 2, "left");
    ctx.fillStyle = "rgba(165,180,252,0.95)";
    ctx.font = `30px ${FONT}`;
    spaced(ctx, wrap(ctx, module.tagline, W - 2 * pad, 1)[0] ?? "", pad, 250, 0, "left");

    ctx.fillStyle = "rgba(125,211,252,0.35)";
    ctx.fillRect(pad, 280, W - 2 * pad, 2);

    const value = data?.value ?? (active ? "lädt …" : "–");
    ctx.fillStyle = data?.alert ? "#f9a8d4" : "#ffffff";
    const vs = fit(ctx, value, W - 2 * pad, "bold", 124, 52);
    ctx.font = `bold ${vs}px ${FONT}`;
    ctx.save();
    ctx.shadowColor = data?.alert ? "rgba(236,72,153,0.9)" : "rgba(125,211,252,0.8)";
    ctx.shadowBlur = 20;
    spaced(ctx, value, pad, 402, 0, "left");
    ctx.restore();

    ctx.fillStyle = "rgba(226,232,240,0.95)";
    ctx.font = `38px ${FONT}`;
    const detail = data?.detail ?? (active ? "" : "ansehen, was kommt");
    wrap(ctx, detail, W - 2 * pad, 2).forEach((l, i) => spaced(ctx, l, pad, 466 + i * 46, 0, "left"));

    ctx.fillStyle = "rgba(125,211,252,0.35)";
    ctx.fillRect(pad, H - 112, W - 2 * pad, 2);
    ctx.fillStyle = "rgba(186,230,253,0.9)";
    ctx.font = `bold 32px ${FONT}`;
    spaced(ctx, "ÖFFNEN ›", W - pad, H - 58, 6, "right");
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(pad + 8, H - 70, 8, 0, Math.PI * 2);
    ctx.fill();
    texture.needsUpdate = true;
  };

  return { texture, draw };
}
