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
// erst erscheint, nachdem die Daten geladen sind.
function useAnker(wand: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const flaeche = wand.current;
    if (!flaeche) return;
    const springe = () => {
      let id = location.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        // Ein kaputt kodierter Anker ist kein Grund für einen Fehler: dann eben wörtlich.
      }
      if (!id) return true;
      const ziel = document.getElementById(id);
      if (!ziel || !flaeche.contains(ziel)) return false;
      ziel.scrollIntoView({ block: "start" });
      return true;
    };
    const warte = new MutationObserver(() => springe() && warte.disconnect());
    if (!springe()) warte.observe(flaeche, { childList: true, subtree: true });
    const schluss = setTimeout(() => warte.disconnect(), 5000);
    window.addEventListener("hashchange", springe);
    return () => {
      warte.disconnect();
      clearTimeout(schluss);
      window.removeEventListener("hashchange", springe);
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
