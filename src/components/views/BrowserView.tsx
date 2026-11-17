"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "../icons";
import { Button, inputClass, Ladestand, LinkButton, Notice, PageHeader, Panel } from "../ui";
import { getJson, postJson } from "@/lib/api";
import { BROWSER_RULES, hostLabel, MAX_MINUTES, TASK_LABEL, type BrowserStatus, type BrowserTask } from "@/lib/browser";

// Browser: Hier gibst du JARVIS einen Auftrag fürs Web und siehst live zu, wie er sucht, klickt und tippt.
// Sagst du „Jarvis, such mir …“, geht diese Ansicht von selbst auf und das Fenster fliegt heran.
// Den letzten Klick (anmelden, bestellen, absenden) machst du nach „Selbst übernehmen“ im echten Chrome.

const EXAMPLES = [
  "Such mir auf Amazon Magnesium-Tabletten mit guten Bewertungen und vergleich drei Angebote.",
  "Wann hat der Wertstoffhof in Deggendorf am Samstag offen?",
  "Such mir die drei günstigsten Winterreifen 205/55 R16 von Michelin und nenn Preis und Shop.",
];

const clock = (iso: string) => new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

// Die Adresse so, wie Chrome sie oben zeigt: ohne https:// und www.
function shortUrl(raw: string) {
  try {
    const u = new URL(raw);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname === "/" ? "" : u.pathname}${u.search}`;
  } catch {
    return raw;
  }
}

export function BrowserView() {
  const [status, setStatus] = useState<BrowserStatus | null>(null);
  // Der Zustand des Browsers ließ sich zuletzt nicht lesen. Gezeigt wird das nur, solange noch keiner da ist
  // (dann ist es nicht „lädt noch“); ein vorhandener bleibt stehen. Eigene Abfrage statt usePolling, weil der
  // Takt wechselt (jede Sekunde, solange ein Auftrag läuft): Dort ginge beim Wechsel der Stand kurz verloren.
  const [statusAus, setStatusAus] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const running = status?.task?.state === "laeuft";

  // Läuft ein Auftrag, schaut die Seite jede Sekunde nach, sonst alle paar Sekunden.
  useEffect(() => {
    let alive = true;
    // Solange eine Abfrage unterwegs ist, kommt keine weitere dazu: Hängt JARVIS, stauten sie sich sonst, und der
    // Browser lässt zu einem Server nur wenige zugleich zu.
    let unterwegs = false;
    // Wird der Raum verlassen, endet auch, was noch unterwegs ist.
    const abbruch = new AbortController();
    const load = () => {
      if (unterwegs) return;
      unterwegs = true;
      getJson<BrowserStatus>("/api/browser", abbruch.signal)
        .then((next) => {
          if (!alive) return;
          setStatus(next);
          setStatusAus(false);
        })
        .catch(() => alive && setStatusAus(true))
        .finally(() => (unterwegs = false));
    };
    load();
    const timer = setInterval(load, running ? 1_000 : 2_500);
    return () => {
      alive = false;
      clearInterval(timer);
      abbruch.abort();
    };
  }, [running]);

  async function send(body: object) {
    setBusy(true);
    setError(null);
    try {
      setStatus(await postJson<BrowserStatus>("/api/browser", body));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (await send({ action: "auftrag", text })) setText("");
  };

  const task = status?.task ?? null;
  const subtitle = running ? "JARVIS ist im Web unterwegs, du siehst live zu" : status?.visible ? "Chrome ist auf deinem Mac offen" : "sucht und erledigt im Web für dich";
  const takeOverLabel = status?.visible ? "Fenster zeigen" : "Selbst übernehmen";

  const form = status?.ready && (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={task ? "Neuer Auftrag …" : "Was soll ich im Web erledigen?"}
        aria-label="Auftrag für den Browser"
        disabled={running}
        className={inputClass}
      />
      <Button type="submit" tone="primary" icon="browser" disabled={busy || running || !text.trim()}>
        {running ? "Läuft …" : "Los"}
      </Button>
    </form>
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="browser" holo="modul-browser" title="Browser" subtitle={subtitle}>
        {running && (
          <Button icon="stopp" tone="danger" disabled={busy} onClick={() => send({ action: "stopp" })}>
            Anhalten
          </Button>
        )}
        {status?.open && (
          <Button icon="extern" disabled={busy} onClick={() => send({ action: "uebernehmen" })} title="Öffnet Chrome als echtes Fenster auf deinem Mac, an derselben Seite">
            {takeOverLabel}
          </Button>
        )}
        {status?.open && !running && (
          <Button disabled={busy} onClick={() => send({ action: "schliessen" })}>
            Chrome schließen
          </Button>
        )}
      </PageHeader>

      {!status && <Ladestand quelle="browser" aus={statusAus} />}
      {status && !status.ready && (
        <Panel className="max-w-2xl">
          <p className="mb-3 text-sm text-quiet">Den Browser bedient Claude, das KI-Gehirn von JARVIS. Dafür braucht es den Claude-Schlüssel.</p>
          <LinkButton href="/einstellungen#gehirn" icon="einstellungen">
            Claude-Schlüssel eintragen
          </LinkButton>
        </Panel>
      )}

      {(error || status?.error) && <Notice meldung={Boolean(error)} tone="error">{error ?? status?.error}</Notice>}

      {task && status ? (
        <>
          <Stage key={task.id} task={task} status={status} running={running} busy={busy} onTakeOver={() => send({ action: "uebernehmen" })} />
          {form && <Panel>{form}</Panel>}
        </>
      ) : (
        status?.ready && (
          <Panel>
            {form}
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="rounded-full border border-schiefer/25 bg-gletscher/5 px-3 py-1 text-left text-xs text-schiefer/80 transition hover:border-schiefer/60 hover:text-schiefer"
                >
                  {ex}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-quiet">
              Oder sag einfach „Jarvis, such mir …“; dann geht diese Ansicht von selbst auf. Per Telegram geht es auch. Ein Auftrag dauert meist ein bis drei Minuten,
              höchstens {MAX_MINUTES}.
            </p>
          </Panel>
        )
      )}

      <Panel className="max-w-3xl">
        <details open={!task}>
          <summary className="cursor-pointer text-sm font-bold text-schiefer">Was JARVIS im Browser nie tut</summary>
          <ul className="mt-2 space-y-1.5 text-sm text-schiefer/85">
            {BROWSER_RULES.map((r) => (
              <li key={r} className="flex gap-2">
                <Icon name="schild" className="mt-0.5 h-4 w-4 shrink-0 text-see" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-quiet">
            Chrome läuft mit einem eigenen Profil, getrennt von deinem normalen Chrome, und ohne eigenes Fenster: Du siehst es hier. Mit „Selbst übernehmen“ öffnet es sich
            als echtes Fenster auf deinem Mac. Meldest du dich dort irgendwo an, bleibt das gespeichert, und JARVIS kann beim nächsten Mal angemeldet weitermachen.
          </p>
        </details>
      </Panel>
    </main>
  );
}

// Die Bühne: links das Fenster, das bei jedem neuen Auftrag aus der Tiefe heranfliegt und live zeigt, was
// JARVIS tut; rechts seine Schritte und am Ende das Ergebnis.
function Stage({ task, status, running, busy, onTakeOver }: { task: BrowserTask; status: BrowserStatus; running: boolean; busy: boolean; onTakeOver: () => void }) {
  const last = task.steps.at(-1);
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]">
      <LiveWindow status={status} running={running} caption={running && last ? last : null} taskId={task.id} />
      <section className="relative rounded-xl border border-gletscher/25 bg-panel/90 p-4">
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-see">Auftrag</h2>
          <span className={`text-xs font-bold ${running ? "text-see" : task.state === "fertig" ? "text-up" : "text-down"}`}>
            {running && <span className="browser-live-dot mr-1.5 inline-block h-2 w-2 rounded-full bg-gletscher align-middle" aria-hidden />}
            {TASK_LABEL[task.state]}
          </span>
        </div>
        <p className="mb-3 text-sm text-schiefer/90">„{task.auftrag}“</p>
        <ol className="max-h-[19rem] space-y-1.5 overflow-y-auto pr-1 text-xs" aria-live="polite">
          {task.steps.map((s, i) => (
            <li
              key={`${s.at}-${i}`}
              className={`browser-step flex gap-2 ${s.blocked ? "text-ocker" : i === task.steps.length - 1 && running ? "text-see" : "text-schiefer/70"}`}
            >
              <span className="shrink-0 font-mono text-quiet">{clock(s.at)}</span>
              {s.blocked && <Icon name="schild" className="mt-px h-3.5 w-3.5 shrink-0" />}
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
        {task.result && (
          <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${task.state === "fertig" ? "border-up/40 bg-up/10 text-up" : "border-schiefer/30 bg-gletscher/10 text-schiefer"}`}>
            {task.result}
          </div>
        )}
        {!running && status.open && task.result && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button icon="extern" tone="primary" small disabled={busy} onClick={onTakeOver}>
              {status.visible ? "Fenster zeigen" : "Selbst übernehmen"}
            </Button>
            <span className="text-xs text-quiet">öffnet die Seite im echten Chrome, zum Anmelden, Prüfen und für den letzten Klick</span>
          </div>
        )}
      </section>
    </div>
  );
}

// Das Fenster: eine Kopfzeile wie bei Chrome mit der Adresse und darunter das Live-Bild (ein laufendes
// MJPEG-Video vom Server). Klappt das Video nicht, zeigt es das letzte Standbild.
function LiveWindow({ status, running, caption, taskId }: { status: BrowserStatus; running: boolean; caption: BrowserTask["steps"][number] | null; taskId: string }) {
  const [broken, setBroken] = useState(false);
  const still = status.shotAt ? `/api/browser/bild?t=${encodeURIComponent(status.shotAt)}` : null;
  const src = status.open && !broken ? `/api/browser/live?k=${taskId}-${status.visible ? "f" : "j"}` : still;
  return (
    <div className="browser-fly">
      <div className="browser-scan relative overflow-hidden rounded-2xl border border-gletscher/45 bg-[#04090f]/95">
        <div className="flex items-center gap-3 border-b border-gletscher/20 bg-schiefer/50 px-3 py-2">
          <span className="flex shrink-0 gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-rot/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-sonne/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-up/70" />
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gletscher/15 bg-black/45 px-3 py-1 text-xs text-see/90">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-see" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <span className="truncate">{status.url ? shortUrl(status.url) : running ? "Chrome startet …" : "Neuer Tab"}</span>
          </div>
          {running ? (
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-down">
              <span className="browser-live-dot h-2 w-2 rounded-full bg-rot" aria-hidden />
              Live
            </span>
          ) : (
            status.url && <span className="hidden shrink-0 text-xs text-quiet sm:inline">{hostLabel(status.url)}</span>
          )}
        </div>
        <div className="relative aspect-[1280/820] bg-black">
          <div className="browser-boot absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(45,212,191,0.18),transparent_65%)]">
            <span className="text-xs text-see/80">{running ? "JARVIS öffnet Chrome" : "Kein Bild"}</span>
          </div>
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt="Live-Bild vom Chrome, den JARVIS gerade bedient"
              onError={() => setBroken(true)}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          )}
          {caption && (
            <div key={`${caption.at}-${caption.text}`} className="browser-step absolute inset-x-0 bottom-0 flex items-center gap-2.5 bg-gradient-to-t from-black/85 via-black/60 to-transparent px-4 pb-3 pt-8">
              <span className="browser-live-dot h-3 w-3 shrink-0 rounded-full bg-gletscher" aria-hidden />
              <span className={`truncate text-sm font-semibold ${caption.blocked ? "text-ocker" : "text-see"}`}>{caption.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
