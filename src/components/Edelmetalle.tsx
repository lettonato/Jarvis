"use client";

import { useState, type FormEvent } from "react";
import { Abschnitt, Button, inputClass, Ladestand, LinkButton, Notice, Panel } from "./ui";
import { postJson } from "@/lib/api";
import { formatUsd } from "@/lib/format";
import { datum, fondsSatz, prozent, type MetallLage, type MetalleSnapshot } from "@/lib/metalle";
import { MAX_ZEITEN } from "@/lib/zeitplan";
import { useNow } from "@/lib/useNow";
import { usePolling } from "@/lib/usePolling";

// Das Lagebild für Gold und Silber: oben die Zahlen mit Datum und Quelle, darunter getrennt die Einordnung
// nach festen Regeln (der Trend steht nur dort, nicht bei den Zahlen). Gerechnet wird auf dem Server (src/lib/metalle.ts), ohne KI-Modell. „Jetzt lesen“ holt
// die Tageskurse neu; Twelve Data zählt dafür je Kursreihe einen Abruf aus dem Kontingent (zwei bis drei je Lauf).

const UHR = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" });
const TAG = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
const wann = (iso: string, jetzt: Date | null) => {
  const d = new Date(iso);
  return jetzt && d.toDateString() === jetzt.toDateString() ? `heute ${UHR.format(d)}` : TAG.format(d);
};

const farbe = (n: number | null) => (n === null || Math.abs(n) < 0.05 ? "text-schiefer" : n > 0 ? "text-up" : "text-down");

export function Edelmetalle() {
  const { data, failed, set } = usePolling<MetalleSnapshot>("/api/metalle", 60_000);
  const now = useNow(30_000);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const sende = async (body: object, fertig: string) => {
    setBusy(true);
    setNote(null);
    try {
      set(await postJson<MetalleSnapshot>("/api/metalle", body));
      setNote({ tone: "ok", text: fertig });
    } catch (e) {
      setNote({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };

  const b = data?.bericht ?? null;
  return (
    <Panel id="edelmetalle">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <Abschnitt>Gold und Silber</Abschnitt>
          <p className="mt-1 max-w-[40rem] text-sm text-quiet">
            Tageskurse, zweimal am Tag gelesen und nach festen Regeln eingeordnet. Hier rechnet kein KI-Modell, und gehandelt wird damit nichts.
          </p>
        </div>
        {data?.eingerichtet && (
          <Button tone="primary" icon="laden" disabled={busy || data.laeuft} onClick={() => void sende({ action: "aktualisieren" }, "Die Kurse sind neu gelesen.")} title="Verbraucht zwei bis drei Abrufe aus deinem Kontingent bei Twelve Data">
            {busy || data.laeuft ? "Liest …" : "Jetzt lesen"}
          </Button>
        )}
      </div>

      {!data && <Ladestand quelle="metalle" aus={failed} className="mt-3 text-sm text-quiet" />}

      {data && !data.eingerichtet && (
        <div className="mt-3 max-w-2xl">
          <p className="mb-3 text-sm text-schiefer/85">
            Für die Kurse braucht JARVIS den Schlüssel von Twelve Data. Es ist derselbe, den der Spielgeld-Desk für Rohstoffe nutzt; ein neuer Dienst kommt nicht dazu.
          </p>
          <LinkButton href="/einstellungen#rohstoffe" icon="einstellungen">
            Twelve-Data-Schlüssel eintragen
          </LinkButton>
        </div>
      )}

      {(note || (data?.fehler && !data.laeuft) || data?.veraltet) && (
        <div className="mt-3 flex flex-col gap-2">
          {note && <Notice meldung tone={note.tone}>{note.text}</Notice>}
          {data?.fehler && !data.laeuft && note?.tone !== "error" && <Notice tone="error">Letzter Versuch{data.letzterVersuch ? ` (${wann(data.letzterVersuch, now)})` : ""}: {data.fehler}</Notice>}
          {data?.veraltet && <Notice>Der jüngste Kurs ist mehr als vier Tage alt. Lies neu, bevor du dich darauf verlässt.</Notice>}
        </div>
      )}

      {data?.eingerichtet && !b && !data.laeuft && <p className="mt-3 text-sm text-quiet">Noch kein Lagebild. Tipp auf „Jetzt lesen“.</p>}

      {b && (
        <>
          <h3 className="mt-5 text-xs font-bold text-schiefer">Fakten</h3>
          <div className="mt-2 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {b.metalle.map((m) => (
              <Metall key={m.id} m={m} />
            ))}
          </div>
          {b.verhaeltnis !== null && (
            <p className="mt-4 text-sm text-schiefer/85">
              Eine Unze Gold kostet so viel wie <span className="font-bold text-schiefer">{Math.round(b.verhaeltnis).toLocaleString("de-DE")}</span> Unzen Silber.
            </p>
          )}
          {b.metalle
            .filter((m) => m.art === "fonds")
            .map((m) => (
              <p key={m.id} data-fonds={m.id} className="mt-3 max-w-[46rem] text-sm text-ocker">
                {fondsSatz(m)}
              </p>
            ))}
          {b.fehlend.map((name) => (
            <p key={name} className="mt-2 text-sm text-ocker">
              {name}: gerade ohne Kurs.
            </p>
          ))}
          <p className="mt-2 text-xs text-quiet">
            Gelesen {wann(b.erstelltAm, now)}. Quelle: {b.quelle}.
          </p>

          <h3 className="mt-6 text-xs font-bold text-schiefer">Einordnung nach festen Regeln</h3>
          <ul data-einordnung className="mt-2 flex max-w-[46rem] flex-col gap-1.5 text-sm leading-relaxed text-schiefer/85">
            {data!.einordnung.map((satz) => (
              <li key={satz}>{satz}</li>
            ))}
          </ul>
          <p className="mt-2 max-w-[46rem] text-xs text-quiet">{data!.hinweis}</p>
        </>
      )}

      {data?.eingerichtet && <Takt key={`${data.auto}-${data.zeiten.join()}`} data={data} now={now} busy={busy} sende={sende} />}
    </Panel>
  );
}

function Metall({ m }: { m: MetallLage }) {
  const zeilen: [string, number | null][] = [
    ["zum Vortag", m.aenderung.tag],
    ["in 5 Handelstagen", m.aenderung.woche],
    ["in 21 Handelstagen", m.aenderung.monat],
  ];
  return (
    <div data-metall={m.id} className="min-w-0">
      <p className="text-sm font-bold text-schiefer">{m.bezeichnung}</p>
      <p className="mt-0.5 text-3xl font-bold tabular-nums leading-tight text-schiefer">{formatUsd(m.kurs)}</p>
      <p className="text-xs text-quiet">
        je {m.einheit}, Kurs vom {datum(m.kursVom)}
      </p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {zeilen.map(([was, wert]) => (
          <div key={was} className="contents">
            <dt className="text-quiet">{was}</dt>
            <dd className={`tabular-nums ${farbe(wert)}`}>{wert === null ? "noch zu wenige Kurse" : prozent(wert)}</dd>
          </div>
        ))}
        <div className="contents">
          <dt className="text-quiet">Hoch, 21 Handelstage</dt>
          <dd className="tabular-nums text-schiefer">{formatUsd(m.hoch)}</dd>
        </div>
        <div className="contents">
          <dt className="text-quiet">Tief, 21 Handelstage</dt>
          <dd className="tabular-nums text-schiefer">{formatUsd(m.tief)}</dd>
        </div>
        <div className="contents">
          <dt className="text-quiet">Tagesspanne im Schnitt</dt>
          <dd className="tabular-nums text-schiefer">{m.schwankungPct.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} % vom Kurs</dd>
        </div>
      </dl>
    </div>
  );
}

function Takt({ data, now, busy, sende }: { data: MetalleSnapshot; now: Date | null; busy: boolean; sende: (body: object, fertig: string) => Promise<void> }) {
  const [zeiten, setZeiten] = useState(data.zeiten.join(", "));
  const speichern = (e: FormEvent) => {
    e.preventDefault();
    const liste = zeiten.split(/[,;\s]+/).filter(Boolean);
    void sende({ action: "einstellungen", zeiten: liste }, "Uhrzeiten gespeichert.");
  };
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-schiefer/15 pt-3 text-sm">
      <p className="text-xs text-quiet">
        {data.naechsterLauf ? `Nächstes Lagebild ${wann(data.naechsterLauf, now)}.` : data.auto ? "Gerade steht kein Lauf an." : "Liest nur, wenn du auf „Jetzt lesen“ tippst."} Jeder Lauf
        verbraucht bei Twelve Data zwei bis drei Abrufe aus deinem Kontingent, einen je Kursreihe.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-schiefer/85">
          <input
            type="checkbox"
            checked={data.auto}
            disabled={busy}
            onChange={(e) => void sende({ action: "einstellungen", auto: e.target.checked }, e.target.checked ? "Die Kurse werden wieder von selbst gelesen." : "Die Kurse werden nur noch auf Zuruf gelesen.")}
            className="h-4 w-4 accent-gletscher"
          />
          Von selbst lesen
        </label>
        <form onSubmit={speichern} className="flex flex-wrap items-center gap-2">
          <label htmlFor="metalle-zeiten" className="text-xs text-quiet">
            Uhrzeiten, bis zu {MAX_ZEITEN}
          </label>
          <input id="metalle-zeiten" value={zeiten} onChange={(e) => setZeiten(e.target.value)} placeholder="07:30, 17:30" className={`${inputClass} max-w-44`} />
          <Button type="submit" fest disabled={busy || zeiten.trim() === data.zeiten.join(", ")}>
            Speichern
          </Button>
        </form>
      </div>
    </div>
  );
}
