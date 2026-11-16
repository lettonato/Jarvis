"use client";

import { Abschnitt, Ladestand, Panel } from "./ui";
import { HINWEIS_REGELN } from "@/lib/hinweise";
import { usePolling } from "@/lib/usePolling";
import { useNow } from "@/lib/useNow";
import type { ZeitplanEintrag, ZeitplanSnapshot } from "@/lib/zeitplan";

// Der gemeinsame Zeitplan: alles, was JARVIS von selbst tut, in einer Liste. Je Zeile der Takt, der letzte Lauf
// mit Ausgang und der nächste Termin, oder der Grund, warum gerade keiner ansteht. Hier wird nur gezeigt;
// Uhrzeiten ändert man dort, wo die Aufgabe hingehört.

const UHR = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const TAG = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric" });

function wann(iso: string, jetzt: Date | null): string {
  const d = new Date(iso);
  if (!jetzt) return UHR.format(d);
  if (d.toDateString() === jetzt.toDateString()) return `heute ${UHR.format(d)}`;
  const morgen = new Date(jetzt);
  morgen.setDate(morgen.getDate() + 1);
  return d.toDateString() === morgen.toDateString() ? `morgen ${UHR.format(d)}` : `${TAG.format(d)}, ${UHR.format(d)}`;
}

function zuletzt(e: ZeitplanEintrag, jetzt: Date | null) {
  if (e.laeuft) return <span className="text-up">läuft gerade{e.letzterLauf ? `, seit ${wann(e.letzterLauf, jetzt)}` : ""}</span>;
  if (!e.letzterLauf) return <span className="text-quiet">{e.selbst ? "noch nie" : "wird hier nicht mitgeschrieben"}</span>;
  return (
    <>
      {wann(e.letzterLauf, jetzt)}
      {e.ergebnis === "fehler" && <span className="block text-down">Fehlgeschlagen{e.fehler ? `: ${e.fehler}` : "."}</span>}
    </>
  );
}

export function Zeitplan() {
  const { data, failed } = usePolling<ZeitplanSnapshot>("/api/zeitplan", 30_000);
  const now = useNow(30_000);
  return (
    <Panel id="zeitplan">
      <Abschnitt>Zeitplan</Abschnitt>
      <p className="mt-1 max-w-[46rem] text-sm text-quiet">
        Was JARVIS von selbst tut. Ein gemeinsamer Taktgeber sieht jede Minute nach, was dran ist: Intel, die Edelmetalle und alles, was per Telegram von selbst kommt. Steht der Not-Aus oder ist ein Agent
        gesperrt, läuft dieser Agent nicht; Nachrichten an dich kommen weiter. Zwei Läufe derselben Aufgabe überschneiden sich nie.
      </p>
      {!data ? (
        <Ladestand quelle="zeitplan" aus={failed} className="mt-3 text-sm text-quiet" />
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-schiefer/10">
          {data.eintraege.map((e) => (
            <li key={e.id} data-aufgabe={e.id} data-laeuft={e.laeuft || undefined} className="grid gap-x-6 gap-y-1 py-3 text-sm first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <p className="font-bold text-schiefer">{e.name}</p>
                <p className="text-xs text-quiet">{e.takt}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-quiet">Zuletzt nach Plan</p>
                <p className="text-schiefer">{zuletzt(e, now)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-quiet">Als Nächstes</p>
                <p className={e.naechsterLauf ? "text-schiefer" : e.hinweis ? "text-ocker" : "text-quiet"}>{e.naechsterLauf ? wann(e.naechsterLauf, now) : (e.hinweis ?? "Sobald etwas ansteht.")}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 max-w-[46rem] text-xs text-quiet">
        Hier stehen die Läufe nach Plan; einen Start von Hand siehst du oben in der Steuerung. War der Mac zur Uhrzeit aus, holt JARVIS einen Lauf für Gold und Silber bis zu zwei Stunden später nach, Briefing und
        Tagesabschluss bis zu drei Stunden, danach nicht mehr. Hinweise am Tag kommen nur zwischen {HINWEIS_REGELN.vonStunde} und {HINWEIS_REGELN.bisStunde} Uhr und höchstens {HINWEIS_REGELN.hoechstensJeTag} am Tag. Was aufs Handy kommt, stellst du unter Einstellungen beim Handy ein, die Mitteilung am Mac
        dort unter Mitteilungen, die Uhrzeiten für Gold und Silber im Raum Intel.
      </p>
    </Panel>
  );
}
