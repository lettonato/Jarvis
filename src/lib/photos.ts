import type { BiomeId } from "./world";

// Die Fotos der Fotowelt, eins je Ansicht, mit Nachweis. Alle stehen unter freien Lizenzen (Creative Commons);
// sie stammen aus den Hintergrundbild-Paketen von Ubuntu und wurden auf 2560 × 1440 Pixel zugeschnitten.

export type Photo = { src: string; title: string; author: string; license: "CC BY 4.0" | "CC BY-SA 4.0" };

export const PHOTOS: Record<BiomeId, Photo> = {
  uebersicht: { src: "/welt/uebersicht.webp", title: "Bergsee unter Wolken", author: "the5sheepdev", license: "CC BY-SA 4.0" },
  fokus: { src: "/welt/fokus.webp", title: "Milchstraße über dem See", author: "Kristopher Roller", license: "CC BY-SA 4.0" },
  aufgaben: { src: "/welt/aufgaben.webp", title: "Reisterrassen von Banaue", author: "Jean-Daniel Bancal", license: "CC BY-SA 4.0" },
  kalender: { src: "/welt/kalender.webp", title: "Almwiese mit Heustadel", author: "Luca Reichmann", license: "CC BY 4.0" },
  post: { src: "/welt/post.webp", title: "Gipfel des Kangchendzönga", author: "Pushkar Deshpande", license: "CC BY 4.0" },
  browser: { src: "/welt/browser.webp", title: "Grünes Hochland", author: "Andrew Ridley", license: "CC BY-SA 4.0" },
  trading: { src: "/welt/trading.webp", title: "Lichtspuren bei Nacht", author: "Giridhar Mahadevan", license: "CC BY-SA 4.0" },
  intel: { src: "/welt/intel.webp", title: "Sonnenaufgang am Brauneck", author: "Uday Nakade", license: "CC BY-SA 4.0" },
  agenten: { src: "/welt/agenten.webp", title: "Milchstraße über dem Wald", author: "Jeff Morgan", license: "CC BY 4.0" },
  einstellungen: { src: "/welt/einstellungen.webp", title: "Berge bei Krasnaja Poljana", author: "Alexander Lyubavin", license: "CC BY-SA 4.0" },
};

// Wie die Welt aussieht: gerechnetes Gebirge oder echte Fotos. Gilt pro Browser, wie die Qualitätsstufe.
export type WorldStyle = "gebirge" | "fotos";
export const STYLE_KEY = "jarvis-welt-art";
export const STYLE_EVENT = "jarvis-welt-art";

export function readWorldStyle(): WorldStyle {
  try {
    return localStorage.getItem(STYLE_KEY) === "fotos" ? "fotos" : "gebirge";
  } catch {
    return "gebirge";
  }
}

export function saveWorldStyle(style: WorldStyle) {
  try {
    localStorage.setItem(STYLE_KEY, style);
  } catch {}
  window.dispatchEvent(new CustomEvent(STYLE_EVENT, { detail: style }));
}
