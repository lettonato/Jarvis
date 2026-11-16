"use client";

import { useJarvis } from "./JarvisProvider";
import { RaumLink } from "./RaumLink";
import { Abschnitt, Ladestand, Panel } from "./ui";
import { marktlage, type MarktZeile } from "@/lib/marktlage";

// Die Marktlage im Raum Intel: Krypto, Edelmetalle und der Spielgeld-Desk nebeneinander, darüber, was auffällt.
// Zusammengestellt ohne KI aus den Daten, die die anderen Räume ohnehin laden (src/lib/marktlage.ts); hier wird
// nichts abgefragt und nichts gerechnet. Die Warnung von Intel steht in diesem Raum schon groß über dem
// Lagebild, deshalb wiederholt die Liste sie nicht.

function Gruppe({ titel, href, zeilen, fuss }: { titel: string; href: string; zeilen: MarktZeile[]; fuss?: string }) {
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-bold text-schiefer">
        <RaumLink href={href} className="griff hover:text-see">
          {titel}
        </RaumLink>
      </h3>
      <dl className="mt-1">
        {zeilen.map((z) => (
          <div key={z.id} className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-schiefer/15 py-1.5">
            <dt className="min-w-0 text-[0.95rem] text-schiefer">{z.name}</dt>
            <dd className="shrink-0 text-right text-[0.95rem] font-medium tabular-nums text-schiefer">{z.wert}</dd>
            {/* Die Veränderung steht in einer eigenen Zeile über die ganze Breite, damit lange Namen nicht umbrechen. */}
            {(z.aenderungText || z.zusatz) && (
              <dd className={`w-full text-right text-xs tabular-nums ${z.aenderung !== null && z.aenderung < 0 ? "text-down" : "text-quiet"}`}>{[z.aenderungText, z.zusatz].filter(Boolean).join(" ")}</dd>
            )}
          </div>
        ))}
      </dl>
      {fuss && <p className="mt-1.5 text-xs text-quiet">{fuss}</p>}
    </div>
  );
}

export function Marktlage() {
  const { market, metalle, desk, intel, ausfall } = useJarvis();
  const lage = marktlage({ market, metalle, desk, intel });
  const auffaellig = lage.auffaellig.filter((a) => a.art !== "warnung");
  const leer = !lage.krypto && !lage.metalle && !lage.desk;

  return (
    <Panel id="marktlage" glow={auffaellig.some((a) => a.art !== "daten")}>
      <Abschnitt>Marktlage</Abschnitt>
      <p className="mt-0.5 text-sm text-quiet">Zusammengestellt ohne KI aus den Kursen, die JARVIS schon hat. Keine Prognose und keine Anlageberatung.</p>

      {/* Auch ohne Kurse kann etwas dastehen, etwa dass der Abruf der Edelmetalle gescheitert ist. */}
      {auffaellig.length > 0 ? (
        <ul className="mt-2" aria-label="Auffällig">
          {auffaellig.map((a, i) => (
            <li key={i} className="border-b border-schiefer/15">
              <RaumLink href={a.href} className="group flex items-center gap-3 py-2 text-base font-medium leading-snug">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.art === "daten" ? "bg-schiefer/40" : "bg-sonne"}`} aria-hidden />
                <span className="min-w-0 flex-1">{a.text}</span>
                <span className="shrink-0 text-sm font-bold text-see group-hover:text-schiefer">Ansehen</span>
              </RaumLink>
            </li>
          ))}
        </ul>
      ) : (
        !leer && <p className="mt-3 text-[0.95rem] text-schiefer">Nichts Auffälliges.</p>
      )}

      {/* Sind die Krypto-Kurse noch nicht da (lädt noch, oder JARVIS antwortet nicht), steht das da, auch wenn
          Edelmetalle oder Desk schon etwas zeigen. „Noch keine Kurse“ heißt: gelesen, aber leer. */}
      {!market && <Ladestand quelle="kurse" aus={ausfall.market} className="mt-3 text-[0.95rem] text-quiet" />}
      {leer ? (
        market && <p className="mt-3 text-[0.95rem] text-quiet">Noch keine Kurse.</p>
      ) : (
        <div className="mt-4 grid gap-x-8 gap-y-5 md:grid-cols-3">
          {lage.krypto && <Gruppe titel="Krypto" href="/trading" zeilen={lage.krypto.zeilen} fuss={lage.krypto.beispiel ? "Beispielkurse, keine echten Daten." : undefined} />}
          {lage.metalle && <Gruppe titel="Edelmetalle" href="/intel#edelmetalle" zeilen={lage.metalle.zeilen} fuss={lage.metalle.fuss} />}
          {lage.desk && <Gruppe titel="Spielgeld-Desk" href="/trading" zeilen={lage.desk.zeilen} fuss="Der Desk handelt nur mit Spielgeld." />}
        </div>
      )}
    </Panel>
  );
}
