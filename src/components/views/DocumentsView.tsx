"use client";

import { useState, type FormEvent } from "react";
import { useJarvis } from "../JarvisProvider";
import { Button, inputClass, LinkButton, Notice, PageHeader, Panel } from "../ui";
import { postJson } from "@/lib/api";
import { DOC_LIMITS, PHASE_LABEL, PHASE_SHORT, plainPoint, type DocJob, type DocsSnapshot } from "@/lib/documents";
import { useNow } from "@/lib/useNow";

// Dokumente: Oben, was der Analyst gerade schreibt (mit Abbrechen), darunter ein Auftrag von Hand und
// die fertigen Dokumente zum Öffnen. Meist bestellst du sie einfach bei JARVIS: „Erstell mir ein Dokument über …“.

const usd = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
const when = (iso: string, now: Date | null) => {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (now && d.toDateString() === now.toDateString()) return `heute ${time}`;
  return d.toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "numeric", year: "2-digit", hour: "2-digit", minute: "2-digit" });
};
const duration = (from: string, to: number) => {
  const s = Math.max(0, Math.round((to - Date.parse(from)) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const PHASES = Object.keys(PHASE_SHORT) as NonNullable<DocJob["phase"]>[];
const EXAMPLE = "Erstell mir ein Dokument über die KI-Wertschöpfungskette: Markt, alle beteiligten Firmen, gern mit Grafiken.";

export function DocumentsView() {
  const { documents, setDocuments } = useJarvis();
  const now = useNow(1000);
  const [error, setError] = useState<string | null>(null);

  const act = async (body: object) => {
    setError(null);
    try {
      setDocuments(await postJson<DocsSnapshot>("/api/dokumente", body));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    }
  };

  const running = documents?.running ?? null;
  const list = documents?.jobs.filter((j) => j.id !== running?.id) ?? [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="dokumente" title="Dokumente" subtitle="Recherchiert von Claude, als PDF in deinem Ordner Dokumente/JARVIS">
        <Button icon="ordner" onClick={() => act({ action: "ordner" })} title={documents?.folder}>
          Ordner öffnen
        </Button>
      </PageHeader>

      {!documents && <p className="text-sm text-quiet">Lade Dokumente …</p>}

      {documents && !documents.configured && (
        <Panel className="max-w-2xl">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-sky-100">Erst das KI-Gehirn verbinden</h2>
          <p className="mb-4 text-sm text-quiet">Dokumente schreibt Claude. Dafür braucht JARVIS denselben Claude-Schlüssel wie im Gespräch.</p>
          <LinkButton href="/einstellungen#gehirn" icon="einstellungen">
            Claude-Schlüssel eintragen
          </LinkButton>
        </Panel>
      )}

      {error && <Notice tone="error">{error}</Notice>}
      {running && <Running job={running} now={now} onCancel={() => act({ action: "abbrechen" })} />}
      {documents?.configured && <Order busy={Boolean(running)} onOrder={(thema, auftrag) => act({ action: "erstellen", thema, auftrag })} />}

      {documents && list.length === 0 && !running && documents.configured && (
        <Panel>
          <p className="text-sm text-quiet">
            Noch keine Dokumente. Sag zum Beispiel: <span className="text-sky-100">„Jarvis, {EXAMPLE.charAt(0).toLowerCase() + EXAMPLE.slice(1)}“</span> Das geht auch per Telegram; das PDF kommt
            dann dorthin.
          </p>
        </Panel>
      )}

      {list.length > 0 && (
        <section aria-label="Deine Dokumente" className="flex flex-col gap-3">
          {list.map((job) => (
            <Item key={job.id} job={job} now={now} onAction={(action) => act({ action, id: job.id })} />
          ))}
        </section>
      )}
    </main>
  );
}

function Running({ job, now, onCancel }: { job: DocJob; now: Date | null; onCancel: () => void }) {
  const at = job.phase ? PHASES.indexOf(job.phase) : 0;
  const steps = job.steps.slice(-6);
  return (
    <Panel glow>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-sky-300">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-300 shadow-[0_0_10px_#7dd3fc]" />
            Der Analyst {job.phase ? PHASE_LABEL[job.phase] : "arbeitet"}
          </p>
          <h2 className="mt-1 text-lg font-bold text-sky-50">{job.thema}</h2>
        </div>
        <Button tone="danger" icon="stopp" onClick={onCancel}>
          Abbrechen
        </Button>
      </div>

      <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Fortschritt">
        {PHASES.map((p, i) => (
          <li key={p} className="min-w-0">
            <span className={`block h-1.5 rounded-full ${i < at ? "bg-sky-300" : i === at ? "animate-pulse bg-sky-300/80" : "bg-sky-300/15"}`} />
            <span className={`mt-1 block truncate text-[10px] uppercase tracking-wider ${i <= at ? "text-sky-100" : "text-quiet"}`}>{PHASE_SHORT[p]}</span>
          </li>
        ))}
      </ol>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="Zeit" value={now ? duration(job.startedAt, now.getTime()) : "–"} />
        <Stat label="Suchen" value={`${job.searches} von ${DOC_LIMITS.searches}`} />
        <Stat label="Seiten gelesen" value={`${job.pagesRead} von ${DOC_LIMITS.fetches}`} />
        <Stat label="Kosten bisher" value={job.costUsd > 0 ? usd(job.costUsd) : "–"} />
      </dl>

      {steps.length > 0 && (
        <ol className="mt-3 space-y-1 border-t border-sky-300/15 pt-3 text-xs" aria-live="polite">
          {steps.map((s, i) => (
            <li key={`${s.at}-${i}`} className={`flex gap-2 ${i === steps.length - 1 ? "text-sky-50" : "text-quiet"}`}>
              <span className="shrink-0 tabular-nums">{new Date(s.at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              <span className="min-w-0 truncate">{s.text}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-quiet">
        Meist dauert ein Dokument fünf bis fünfzehn Minuten. Du kannst solange weiterreden; JARVIS sagt Bescheid, wenn das PDF fertig ist
        {job.from === "telegram" ? ", und schickt es dir per Telegram." : "."}
      </p>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-sky-300/15 bg-sky-400/5 px-3 py-2">
      <dt className="text-[10px] uppercase tracking-widest text-quiet">{label}</dt>
      <dd className="mt-0.5 font-bold tabular-nums text-sky-50">{value}</dd>
    </div>
  );
}

function Order({ busy, onOrder }: { busy: boolean; onOrder: (thema: string, auftrag: string) => Promise<boolean> }) {
  const [thema, setThema] = useState("");
  const [auftrag, setAuftrag] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!thema.trim() || busy || sending) return;
    setSending(true);
    if (await onOrder(thema.trim(), auftrag.trim())) {
      setThema("");
      setAuftrag("");
    }
    setSending(false);
  };
  return (
    <Panel>
      <details>
        <summary className="cursor-pointer text-sm font-bold uppercase tracking-[0.25em] text-sky-100">Neues Dokument von Hand</summary>
        <p className="mt-2 text-xs text-quiet">
          Am einfachsten sagst du es JARVIS. Hier geht es auch zum Tippen. Ein Dokument kostet bei Anthropic meist ein paar Dollar; ab etwa {DOC_LIMITS.maxUsd} Dollar hört der Analyst auf zu
          suchen und schreibt mit dem, was er hat.
        </p>
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
          <input value={thema} onChange={(e) => setThema(e.target.value)} placeholder="Thema, z. B. Die KI-Wertschöpfungskette" aria-label="Thema" className={inputClass} maxLength={140} />
          <textarea
            value={auftrag}
            onChange={(e) => setAuftrag(e.target.value)}
            placeholder="Was soll hinein? z. B. Markt analysieren, alle beteiligten Firmen je Stufe, mit Grafiken"
            aria-label="Wünsche"
            rows={3}
            className={`${inputClass} resize-y`}
            maxLength={4000}
          />
          <div>
            <Button type="submit" tone="primary" icon="dokumente" disabled={busy || sending || !thema.trim()} title={busy ? "Es läuft schon ein Dokument." : undefined}>
              {busy ? "Es läuft schon eins" : "Dokument erstellen"}
            </Button>
          </div>
        </form>
      </details>
    </Panel>
  );
}

const STATE_LABEL: Record<Exclude<DocJob["state"], "laeuft">, { text: string; tone: string }> = {
  fertig: { text: "fertig", tone: "border-up/40 bg-up/10 text-green-200" },
  fehler: { text: "nicht fertig geworden", tone: "border-down/50 bg-down/10 text-red-200" },
  abgebrochen: { text: "abgebrochen", tone: "border-sky-300/25 bg-sky-400/5 text-sky-200/80" },
};

function Item({ job, now, onAction }: { job: DocJob; now: Date | null; onAction: (action: "oeffnen" | "finder") => void }) {
  if (job.state === "laeuft") return null;
  const label = STATE_LABEL[job.state];
  const took = job.endedAt ? Math.max(1, Math.round((Date.parse(job.endedAt) - Date.parse(job.startedAt)) / 60_000)) : null;
  const art = job.pdf ? "pdf" : "html";
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`rounded-full border px-2 py-0.5 font-bold uppercase tracking-widest ${label.tone}`}>{label.text}</span>
        <span className="text-quiet">
          {when(job.endedAt ?? job.startedAt, now)}
          {took ? ` · ${took} Min.` : ""} · {usd(job.costUsd)}
          {job.from === "telegram" ? " · per Telegram bestellt" : ""}
        </span>
      </div>
      <h2 className="mt-2 text-base font-bold text-sky-50">{job.title ?? job.thema}</h2>
      {job.state === "fertig" && (
        <>
          <p className="mt-0.5 text-xs text-quiet">
            {job.sections} Abschnitte · {job.sources} Quellen · {job.searches} Suchen · {job.pdf ? "PDF" : "Webseite"}
          </p>
          {job.points.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-sky-50/85">
              {job.points.slice(0, 3).map((p, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-300" />
                  <span>{plainPoint(p)}</span>
                </li>
              ))}
            </ul>
          )}
          {job.note && <p className="mt-2 text-xs text-amber-200/90">{job.note}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button small tone="primary" icon="dokumente" onClick={() => onAction("oeffnen")}>
              Öffnen
            </Button>
            <a
              href={`/api/dokumente/datei?id=${encodeURIComponent(job.id)}&art=${art}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300/30 bg-sky-400/5 px-2 py-1 text-[11px] font-bold text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-400/15"
            >
              Im Browser ansehen
            </a>
            <Button small icon="ordner" onClick={() => onAction("finder")}>
              Im Finder zeigen
            </Button>
          </div>
        </>
      )}
      {job.state !== "fertig" && job.error && <p className="mt-1 text-sm text-red-200/90">{job.error}</p>}
    </Panel>
  );
}
