"use client";

import { useState, type FormEvent } from "react";
import { useJarvis } from "../JarvisProvider";
import { Button, inputClass, LinkButton, Notice, PageHeader, Panel } from "../ui";
import { postJson } from "@/lib/api";
import { BASE_TOPICS, MAX_TOPICS, MOOD_LABEL, TYPICAL_INTEL_COST_USD, type IntelItem, type IntelReport, type IntelSnapshot } from "@/lib/intel";
import { useNow } from "@/lib/useNow";

// Intel: das Lagebild aus Nachrichten und X, das Grok für dich liest. Oben die Lage und eine Warnung an
// den Trading-Desk, falls es eine gibt, darunter die Meldungen mit Quelle, dann Suche und Themen.

const usd = (n: number) => `${n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
const clock = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
const when = (iso: string, now: Date | null) => {
  const d = new Date(iso);
  const sameDay = now && d.toDateString() === now.toDateString();
  return sameDay ? `heute ${clock(iso)}` : d.toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
};

const MOOD_TONE: Record<IntelReport["mood"], string> = {
  positiv: "border-up/50 bg-up/10 text-green-200",
  gemischt: "border-sky-300/40 bg-sky-400/10 text-sky-100",
  negativ: "border-down/50 bg-down/10 text-red-200",
  ruhig: "border-sky-300/20 bg-sky-400/5 text-sky-200/80",
};

export function IntelView() {
  const { intel, setIntel } = useJarvis();
  const now = useNow();
  const [error, setError] = useState<string | null>(null);

  const refresh = async (thema?: string) => {
    setError(null);
    try {
      setIntel(await postJson<IntelSnapshot>("/api/intel", { action: "aktualisieren", thema }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const left = intel ? intel.budgetUsd - intel.spentTodayUsd : 0;
  const canRun = Boolean(intel?.configured && !intel.running && left >= TYPICAL_INTEL_COST_USD);
  const report = intel?.report ?? null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        icon="intel"
        holo="modul-intel"
        title="Intel"
        subtitle={intel?.configured ? `Nachrichten und X, gelesen von Grok · heute ${usd(intel.spentTodayUsd)} von ${usd(intel.budgetUsd)}` : "Nachrichten und X, gelesen von Grok"}
      >
        {intel?.configured && (
          <Button icon="laden" tone="primary" disabled={!canRun} onClick={() => refresh()} title={`Kostet etwa ${usd(TYPICAL_INTEL_COST_USD)}`}>
            {intel.running && !intel.running.focus ? "Liest …" : `Aktualisieren · ≈ ${usd(TYPICAL_INTEL_COST_USD)}`}
          </Button>
        )}
      </PageHeader>

      {!intel && <p className="text-sm text-quiet">Lade Intel …</p>}

      {intel && !intel.configured && (
        <Panel className="max-w-2xl">
          <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-sky-100">Mit Grok verbinden</h2>
          <p className="mb-4 text-sm text-quiet">
            Intel liest jeden Morgen und am Nachmittag die Nachrichten und X zu Bitcoin, Ethereum, Solana und deinen eigenen Themen, und JARVIS sagt dir im Briefing,
            was davon zählt. Er nutzt denselben xAI-Schlüssel wie der Crawler im Trading-Desk.
          </p>
          <LinkButton href="/einstellungen#crawler" icon="einstellungen">
            xAI-Schlüssel eintragen
          </LinkButton>
        </Panel>
      )}

      {intel?.warning && (
        <div role="alert" className="rounded-xl border border-down/60 bg-down/10 px-4 py-3 text-sm text-red-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-300">Warnung an den Trading-Desk · bis {clock(intel.warning.until)} Uhr</p>
          <p className="mt-1">{intel.warning.text}</p>
          <p className="mt-1 text-xs text-red-200/80">Solange kauft der Desk nichts Neues. Stop-Loss und Verkäufe laufen weiter. Intel kann den Desk nur bremsen, nie kaufen lassen.</p>
        </div>
      )}

      {error && <Notice tone="error">{error}</Notice>}
      {intel?.error && !intel.running && <Notice tone="error">Letzter Versuch: {intel.error}</Notice>}
      {intel?.running && <Running running={intel.running} now={now} />}

      {intel?.configured && report && (
        <Panel glow={!intel.running}>
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`rounded-full border px-2 py-0.5 font-bold uppercase tracking-widest ${MOOD_TONE[report.mood]}`}>Lage: {MOOD_LABEL[report.mood]}</span>
            <span className="text-quiet">
              Stand {when(report.at, now)} · {usd(report.costUsd)}
            </span>
            {intel.nextAt && <span className="ml-auto text-quiet">nächstes Lagebild {when(intel.nextAt, now)}</span>}
          </div>
          <p className="text-base leading-relaxed text-sky-50">{report.summary}</p>
          <Items items={report.items} />
        </Panel>
      )}

      {intel?.configured && !report && !intel.running && (
        <Panel>
          <p className="text-sm text-quiet">Noch kein Lagebild. Tipp auf „Aktualisieren“ oder sag: „Jarvis, aktualisiere die Nachrichten.“</p>
        </Panel>
      )}

      {intel?.configured && <Search intel={intel} canRun={canRun} onSearch={refresh} now={now} />}
      {intel?.configured && <Topics intel={intel} />}
    </main>
  );
}

function Running({ running, now }: { running: NonNullable<IntelSnapshot["running"]>; now: Date | null }) {
  const seconds = now ? Math.max(0, Math.round((now.getTime() - Date.parse(running.since)) / 1000)) : 0;
  return (
    <Panel className="border-sky-300/50">
      <p className="flex items-center gap-2 text-sm text-sky-100">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-sky-300 shadow-[0_0_10px_#7dd3fc]" />
        {running.focus ? `Grok sucht Nachrichten und Beiträge auf X zu ${running.focus}` : "Grok liest die Nachrichten und X"} … {seconds} s
      </p>
      <p className="mt-1 text-xs text-quiet">Das dauert meist eine halbe bis eine Minute. JARVIS sagt Bescheid, wenn es fertig ist.</p>
    </Panel>
  );
}

const EFFECT: Record<IntelItem["effect"], { label: string; tone: string }> = {
  positiv: { label: "▲ positiv", tone: "text-up" },
  negativ: { label: "▼ negativ", tone: "text-down" },
  neutral: { label: "● neutral", tone: "text-quiet" },
};

function Items({ items }: { items: IntelItem[] }) {
  if (items.length === 0) return <p className="mt-3 text-sm text-quiet">Keine Meldungen, die wirklich zählen.</p>;
  return (
    <ol className="mt-4 divide-y divide-sky-300/10">
      {items.map((item, i) => (
        <li key={`${item.title}-${i}`} className="flex gap-3 py-3">
          <span className="mt-1 h-10 w-1 shrink-0 overflow-hidden rounded bg-sky-300/10" title={`Wichtigkeit ${Math.round(item.importance * 100)} %`}>
            <span className="block w-full rounded bg-sky-300" style={{ height: `${Math.max(10, item.importance * 100)}%` }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] uppercase tracking-widest">
              <span className="rounded border border-sky-300/30 px-1.5 py-0.5 text-sky-200">{item.topic}</span>
              <span className={EFFECT[item.effect].tone}>{EFFECT[item.effect].label}</span>
              {item.fromX && <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-sky-100">auf X</span>}
            </p>
            <p className="mt-1 text-sm font-bold text-sky-50">{item.title}</p>
            <p className="mt-0.5 text-sm text-sky-50/80">{item.summary}</p>
            <p className="mt-1 text-[11px] text-quiet">
              {item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer noopener" className="underline decoration-sky-300/40 hover:text-sky-200">
                  {item.source}
                </a>
              ) : (
                item.source
              )}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Search({ intel, canRun, onSearch, now }: { intel: IntelSnapshot; canRun: boolean; onSearch: (thema: string) => Promise<void>; now: Date | null }) {
  const [topic, setTopic] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    await onSearch(topic.trim());
    setTopic("");
  };
  const search = intel.search;
  return (
    <Panel>
      <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-sky-100">Gezielt suchen</h2>
      <p className="mt-1 text-xs text-quiet">Grok sucht im Web und auf X nur zu diesem Thema. Das kostet wie ein Lagebild etwa {usd(TYPICAL_INTEL_COST_USD)}.</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="z. B. Tesla, Bitcoin-ETF, Deggendorf" aria-label="Thema" className={inputClass} maxLength={40} />
        <Button type="submit" tone="primary" icon="intel" disabled={!canRun || !topic.trim()}>
          Suchen
        </Button>
      </form>
      {search && (
        <div className="mt-4 border-t border-sky-300/15 pt-3">
          <p className="text-[11px] text-quiet">
            Zuletzt gesucht: <span className="font-bold text-sky-200">{search.focus}</span> · {when(search.at, now)} · {usd(search.costUsd)}
          </p>
          <p className="mt-1 text-sm text-sky-50">{search.summary}</p>
          <Items items={search.items} />
        </div>
      )}
    </Panel>
  );
}

function Topics({ intel }: { intel: IntelSnapshot }) {
  const { setIntel } = useJarvis();
  const own = intel.topics.filter((t) => !BASE_TOPICS.includes(t));
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const save = async (body: object, done: string) => {
    setMessage(null);
    try {
      setIntel(await postJson<IntelSnapshot>("/api/intel", { action: "einstellungen", ...body }));
      setMessage({ tone: "ok", text: done });
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : String(e) });
    }
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    void save({ topics: [...own, t] }, `„${t}“ kommt ins nächste Lagebild.`);
  };

  return (
    <Panel>
      <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-sky-100">Deine Themen</h2>
      <p className="mt-1 text-xs text-quiet">Die vier festen Themen liest Intel immer. Bis zu {MAX_TOPICS} eigene kommen dazu, etwa eine Firma, eine Aktie oder deine Stadt.</p>
      <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {BASE_TOPICS.map((t) => (
          <li key={t} className="rounded-full border border-sky-300/20 px-2.5 py-1 text-sky-200/70">
            {t}
          </li>
        ))}
        {own.map((t) => (
          <li key={t} className="flex items-center gap-1 rounded-full border border-sky-300/50 bg-sky-400/10 py-1 pl-2.5 pr-1 text-sky-50">
            {t}
            <button
              type="button"
              onClick={() => save({ topics: own.filter((o) => o !== t) }, `„${t}“ entfernt.`)}
              aria-label={`${t} entfernen`}
              className="grid h-5 w-5 place-items-center rounded-full text-sky-200 hover:bg-sky-400/20"
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      {own.length < MAX_TOPICS && (
        <form onSubmit={add} className="mt-3 flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Neues Thema" aria-label="Neues Thema" className={`${inputClass} sm:max-w-xs`} maxLength={40} />
          <Button type="submit" icon="neu" disabled={!draft.trim()}>
            Dazu
          </Button>
        </form>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-sky-300/15 pt-3 text-sm">
        <label className="flex items-center gap-2 text-sky-50/85">
          <input type="checkbox" checked={intel.auto} onChange={(e) => save({ auto: e.target.checked }, e.target.checked ? "Intel liest wieder von selbst." : "Intel liest nur noch auf Zuruf.")} className="h-4 w-4 accent-sky-400" />
          Von selbst lesen: morgens ab 6 Uhr und acht Stunden später
        </label>
        <BudgetForm key={intel.budgetUsd} budgetUsd={intel.budgetUsd} onSave={(budgetUsd) => save({ budgetUsd }, "Tagesbudget gespeichert.")} />
      </div>
      <p className="mt-2 text-xs text-quiet">
        Ein Lagebild kostet meist 25 bis 45 Cent, vor allem für die gelesenen X-Beiträge. Mit 1 $ am Tag reicht es für die beiden Lagebilder; für gezielte Suchen stell etwas mehr ein. Ist das Budget aufgebraucht, liest Intel
        erst morgen weiter.
      </p>
      {message && (
        <div className="mt-2">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}
    </Panel>
  );
}

function BudgetForm({ budgetUsd, onSave }: { budgetUsd: number; onSave: (usd: number) => void }) {
  const [budget, setBudget] = useState(String(budgetUsd).replace(".", ","));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(Number(budget.replace(",", ".")));
      }}
      className="flex items-center gap-2"
    >
      <label htmlFor="intel-budget" className="text-xs text-quiet">
        Tagesbudget in Dollar
      </label>
      <input id="intel-budget" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} className={`${inputClass} max-w-24`} />
      <Button type="submit">Speichern</Button>
    </form>
  );
}
