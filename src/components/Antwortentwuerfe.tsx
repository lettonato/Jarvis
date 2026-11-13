"use client";

import { useState } from "react";
import { Button, inputClass, Notice, Panel } from "./ui";
import { ApiError, postJson } from "@/lib/api";
import { ENTWURF_GRENZEN, linkInsMailprogramm, nimmtKeineAntwort, type Entwurf, type EntwuerfeSnapshot } from "@/lib/entwuerfe";
import { usePolling } from "@/lib/usePolling";

// Antwortentwürfe in der Ansicht Post. JARVIS legt hier nur Text ab: Du liest ihn, änderst ihn und schickst
// ihn selbst aus deinem Mailprogramm. Einen Knopf zum Senden gibt es in JARVIS nicht.

const ZEIT = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function Antwortentwuerfe() {
  const { data, set } = usePolling<EntwuerfeSnapshot>("/api/entwuerfe", 60_000);
  const entwuerfe = data?.entwuerfe ?? [];
  if (!entwuerfe.length) return null;
  return (
    <Panel id="entwuerfe">
      <h2 className="mb-1 text-xs font-bold text-see">
        Antwortentwürfe <span className="font-medium text-quiet">{entwuerfe.length}</span>
      </h2>
      <p className="mb-3 text-sm text-quiet">
        JARVIS verschickt nichts. Lies den Entwurf, ändere ihn, wenn nötig, und schick ihn selbst aus deinem Mailprogramm ab. Er ist aus dem Text einer fremden Mail
        entstanden: Sieh nach, ob wirklich nur drinsteht, was du sagen willst.
      </p>
      <ul className="flex flex-col gap-4">
        {entwuerfe.map((e) => (
          // Ersetzt JARVIS den Entwurf durch einen neuen, beginnt das Feld mit dem neuen Text.
          <Karte key={`${e.id}:${e.erstelltAm}`} entwurf={e} uebernimm={set} />
        ))}
      </ul>
    </Panel>
  );
}

function Karte({ entwurf, uebernimm }: { entwurf: Entwurf; uebernimm: (s: EntwuerfeSnapshot) => void }) {
  const [text, setText] = useState(entwurf.text);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const geaendert = text !== entwurf.text;
  const leer = !text.trim();
  // Der Link trägt, was gerade im Feld steht: Was du siehst, ist, was im Mailprogramm aufgeht.
  const link = leer ? null : linkInsMailprogramm({ an: entwurf.an, betreff: entwurf.betreff, text });
  const name = entwurf.anName && entwurf.anName !== entwurf.an ? `${entwurf.anName}, ${entwurf.an}` : entwurf.an;

  async function sende(body: Record<string, unknown>, fertig?: string) {
    setBusy(true);
    setNote(null);
    try {
      const stand = await postJson<EntwuerfeSnapshot>("/api/entwuerfe", body);
      // Der Server räumt den Text auf (überzählige Leerzeilen, Länge): Das Feld zeigt danach, was gespeichert ist.
      const meiner = stand.entwuerfe.find((x) => x.id === entwurf.id);
      if (meiner) setText(meiner.text);
      uebernimm(stand);
      if (fertig) setNote({ tone: "ok", text: fertig });
    } catch (e) {
      setNote({ tone: "error", text: e instanceof ApiError || e instanceof Error ? e.message : "Das hat nicht geklappt." });
    } finally {
      setBusy(false);
    }
  }

  async function kopiere() {
    try {
      await navigator.clipboard.writeText(text);
      setNote({ tone: "ok", text: "Der Text liegt in der Zwischenablage." });
    } catch {
      setNote({ tone: "error", text: "Kopieren hat nicht geklappt. Markier den Text und kopier ihn von Hand." });
    }
  }

  return (
    <li className="border-t border-schiefer/10 pt-3 first:border-t-0 first:pt-0">
      <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        <dt className="text-quiet">An</dt>
        <dd className="min-w-0 break-words text-schiefer">{name}</dd>
        <dt className="text-quiet">Betreff</dt>
        <dd className="min-w-0 break-words text-schiefer">{entwurf.betreff}</dd>
      </dl>
      {nimmtKeineAntwort(entwurf.an) && <Notice>Diese Adresse nimmt vermutlich keine Antworten an. Sieh in der Mail nach, wohin du schreiben sollst.</Notice>}
      <label className="mt-2 block">
        <span className="sr-only">Text des Entwurfs an {entwurf.anName || entwurf.an}</span>
        <textarea
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          maxLength={ENTWURF_GRENZEN.text}
          rows={Math.min(14, Math.max(5, text.split("\n").length + 1))}
          className={`${inputClass} leading-relaxed`}
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {link && (
          <a
            href={link.href}
            title="Öffnet eine neue Mail in deinem Mailprogramm. Abschicken musst du sie dort selbst."
            className="inline-flex items-center rounded-full border border-schiefer bg-schiefer px-3 py-1 text-xs font-semibold text-kalk transition-colors hover:bg-stein"
          >
            Im Mailprogramm öffnen
          </a>
        )}
        <Button small disabled={leer} onClick={kopiere}>
          Kopieren
        </Button>
        {geaendert && (
          <Button small disabled={busy || leer} onClick={() => sende({ action: "aendern", id: entwurf.id, text }, "Gespeichert.")}>
            Speichern
          </Button>
        )}
        <Button small tone="danger" disabled={busy} onClick={() => sende({ action: "verwerfen", id: entwurf.id })}>
          Verwerfen
        </Button>
        <span className="ml-auto text-xs text-quiet">
          {entwurf.bearbeitet && entwurf.geaendertAm ? `von dir geändert ${ZEIT.format(new Date(entwurf.geaendertAm))}` : `entworfen ${ZEIT.format(new Date(entwurf.erstelltAm))}`}
          {entwurf.kanal === "telegram" ? ", vom Handy aus" : ""}
        </span>
      </div>
      {link && !link.mitText && <p className="mt-1 text-xs text-quiet">Der Text ist für den Link zu lang: Der Knopf öffnet die Mail mit Empfänger und Betreff, den Text fügst du mit „Kopieren“ ein.</p>}
      {note && <p className={`mt-1 text-xs ${note.tone === "ok" ? "text-up" : "text-down"}`}>{note.text}</p>}
    </li>
  );
}
