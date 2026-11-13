"use client";

import { createContext, useContext, useEffect, useRef, useState, ViewTransition, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { RaumLink } from "./RaumLink";
import { FAHRTEN, raumVon } from "@/lib/raeume";

// Ein Raum des Glashauses: links die Wand mit dem Inhalt, rechts die Fensterfront mit der Aussicht, unten der
// Boden. Jede Seite steht in ihrem eigenen Raum; beim Wechsel fährt die Kamera seitlich in den nächsten
// (die Bewegung selbst steht in globals.css, die Richtung in src/lib/raeume.ts).

const nachArt = Object.fromEntries([...FAHRTEN.map((f) => [f, f]), ["default", "raum-blende"]]);

// Wohin die Scheiben einer Ansicht gehängt werden: vor das Fenster ihres Raums.
const ScheibenOrt = createContext<HTMLElement | null>(null);

// Ein Sprung zu einem Abschnitt (etwa /einstellungen#sicherheit): Die Wand rollt dorthin, auch wenn der Abschnitt
// erst erscheint, nachdem die Daten geladen sind. Wächst die Seite danach noch (Daten kommen nach, der Abschnitt
// rutscht), rollt die Wand ein paar Sekunden lang mit. Sie lässt los, sobald du selbst rollst, tippst oder
// schreibst oder etwas anderes die Seite bewegt (etwa ein Sprachbefehl).
const FOLGEN_MS = 5000;
const GRIFFE = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

function useAnker(wand: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const flaeche = wand.current;
    if (!flaeche) return;
    const zielVon = () => {
      let id = location.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        // Ein kaputt kodierter Anker ist kein Grund für einen Fehler: dann eben wörtlich.
      }
      const ziel = id ? document.getElementById(id) : null;
      return ziel && flaeche.contains(ziel) ? ziel : null;
    };
    // Wo der Abschnitt nach dem eigenen Sprung steht. Steht er bei einem Rollen woanders, hat jemand anderes gerollt.
    let soll: number | null = null;
    const springe = () => {
      const ziel = zielVon();
      if (!ziel) return;
      ziel.scrollIntoView({ block: "start" });
      soll = ziel.getBoundingClientRect().top;
    };
    const warte = new MutationObserver(springe);
    let schluss: ReturnType<typeof setTimeout> | undefined;
    const lassLos = () => {
      warte.disconnect();
      clearTimeout(schluss);
      soll = null;
      for (const griff of GRIFFE) window.removeEventListener(griff, lassLos, true);
      window.removeEventListener("scroll", fremdGerollt, true);
    };
    const fremdGerollt = () => {
      const ziel = zielVon();
      if (soll !== null && ziel && Math.abs(ziel.getBoundingClientRect().top - soll) > 2) lassLos();
    };
    const folge = () => {
      lassLos();
      if (!location.hash.slice(1)) return;
      springe();
      warte.observe(flaeche, { childList: true, subtree: true });
      schluss = setTimeout(lassLos, FOLGEN_MS);
      // Am Fenster, nicht an der Wand: Auf dem Handy rollt der ganze Raum, und Tasten kommen nicht immer an der Wand an.
      for (const griff of GRIFFE) window.addEventListener(griff, lassLos, { passive: true, capture: true });
      window.addEventListener("scroll", fremdGerollt, { passive: true, capture: true });
    };
    folge();
    window.addEventListener("hashchange", folge);
    return () => {
      lassLos();
      window.removeEventListener("hashchange", folge);
    };
  }, [wand]);
}

export function RaumSeite({ ort, children }: { ort: string; children: ReactNode }) {
  const raum = raumVon(ort);
  const [scheiben, setScheiben] = useState<HTMLElement | null>(null);
  const wand = useRef<HTMLDivElement>(null);
  useAnker(wand);
  const stil = { "--foto": `url(/welt/${raum.foto}.webp)`, "--foto-lage": raum.lage ?? "center 40%" } as CSSProperties;
  return (
    <ViewTransition enter={nachArt} exit={nachArt} default="none">
      <div className="raum" data-licht={raum.licht} data-fenster={raum.fenster} style={stil}>
        <div className="raum-schein" aria-hidden />
        <div className="raum-fenster" aria-hidden />
        <div className="raum-boden" aria-hidden>
          <div className="raum-spiegel" />
          <div className="raum-sonne" />
        </div>
        <ScheibenOrt.Provider value={scheiben}>
          <div className="raum-wand" ref={wand}>
            {children}
          </div>
        </ScheibenOrt.Provider>
        <div className="raum-scheiben" ref={setScheiben} />
      </div>
    </ViewTransition>
  );
}

// Hängt Scheiben vor das Fenster des Raums. Auf schmalen Bildschirmen stehen sie unter dem Text.
export function Scheiben({ children }: { children: ReactNode }) {
  const ort = useContext(ScheibenOrt);
  return ort ? createPortal(children, ort) : null;
}

// Eine Scheibe aus Milchglas mit Überschrift. Mit href führt die Überschrift in den Raum dahinter.
// Die Schrift folgt der Tönung des Glases (hell vor dunkler Aussicht), deshalb stehen hier keine festen Textfarben.
export function Scheibe({ titel, href, children }: { titel: string; href?: string; children: ReactNode }) {
  return (
    <section className="glas">
      <h2 className="mb-2.5 text-base font-bold">
        {href ? (
          <RaumLink href={href} className="underline-offset-4 hover:underline">
            {titel}
          </RaumLink>
        ) : (
          titel
        )}
      </h2>
      {children}
    </section>
  );
}

// Eine Zeile in einer Scheibe: links das Was, rechts der Wert.
export function ScheibenZeile({ vorn, children, wert, stark }: { vorn?: ReactNode; children: ReactNode; wert?: ReactNode; stark?: boolean }) {
  return (
    <li className={`flex items-baseline gap-3 py-1 text-[1.05rem] leading-snug ${stark ? "font-bold" : "font-medium"}`}>
      {vorn !== undefined && <span className="w-12 shrink-0 opacity-75">{vorn}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {wert !== undefined && <span className="shrink-0 text-[0.95rem] font-bold">{wert}</span>}
    </li>
  );
}
