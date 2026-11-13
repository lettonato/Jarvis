"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useJarvis } from "../JarvisProvider";
import { Button, inputClass, Notice, PageHeader, Panel } from "../ui";
import { getJson, postJson } from "@/lib/api";
import { isoDate } from "@/lib/dates";
import {
  ART_LABEL,
  ART_MEHRZAHL,
  EINTRAG_ARTEN,
  fristText,
  GRENZEN,
  QUELLE_LABEL,
  quelleText,
  STATUS_LABEL,
  vorbereitung,
  type Eintrag,
  type EintragArt,
  type EintragFelder,
  type ProjektAkte,
  type ProjektKarte,
  type ProjektStatus,
  type ProjekteAntwort,
  type VorschlagAnzeige,
} from "@/lib/projekte";
import { useNow } from "@/lib/useNow";

// Projekte: das Projektgedächtnis. Oben liegt, was JARVIS vorschlägt und noch auf dein Ja wartet; darunter
// die Projekte und, wenn eines offen ist, seine Akte. Nur hier kommt etwas dauerhaft hinein: Du übernimmst
// einen Vorschlag (auch geändert), trägst selbst ein, korrigierst oder ziehst zurück. Gelöscht wird nichts.

const tag = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("de-DE", { day: "numeric", month: "numeric", year: "2-digit" });
const zeit = (iso: string) => new Date(iso).toLocaleString("de-DE", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
const chip = "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest";
const CHIP = { ruhig: "border-sky-300/25 bg-sky-400/5 text-sky-200/80", gut: "border-up/40 bg-up/10 text-green-200", warn: "border-amber-300/40 bg-amber-300/10 text-amber-100", rot: "border-down/50 bg-down/10 text-red-200" };
const ABHAKBAR: EintragArt[] = ["aufgabe", "risiko", "naechster_schritt"];
// In dieser Reihenfolge steht die Akte: erst was zu tun ist, dann was feststeht.
const REIHENFOLGE: EintragArt[] = ["aufgabe", "naechster_schritt", "entscheidung", "notiz", "risiko"];

type Aktion = (body: Record<string, unknown>) => Promise<boolean>;

export function ProjectsView() {
  const { projekte, setProjekte } = useJarvis();
  const now = useNow();
  const heute = now ? isoDate(now) : null;
  const [offen, setOffen] = useState<string | null>(null);
  const [akte, setAkte] = useState<ProjektAkte | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [neu, setNeu] = useState(false);

  const nimm = ({ akte: a, message, ...snapshot }: ProjekteAntwort) => {
    setProjekte(snapshot);
    setAkte(a);
    if (a) setOffen(a.projekt.id);
    setInfo(message ?? null);
  };

  const act: Aktion = async (body) => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      nimm(await postJson<ProjekteAntwort>("/api/projekte", { ...body, zeige: offen ?? "" }));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Die offene Akte bleibt frisch, auch wenn JARVIS im Gespräch nebenher etwas vorschlägt.
  useEffect(() => {
    if (!offen) return;
    let aktuell = true;
    getJson<ProjekteAntwort>(`/api/projekte?projekt=${encodeURIComponent(offen)}`)
      .then((a) => aktuell && setAkte(a.akte))
      .catch(() => {});
    return () => {
      aktuell = false;
    };
  }, [offen, projekte]);

  const schliesse = () => {
    setOffen(null);
    setAkte(null);
  };
  const liste = projekte?.projekte ?? [];
  const vorschlaege = projekte?.vorschlaege ?? [];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader icon="projekte" title="Projekte" subtitle="Was JARVIS dauerhaft über eure Projekte weiß. Es zählt nur, was du bestätigt hast.">
        <Button icon="projekte" tone={neu ? "ghost" : "primary"} onClick={() => setNeu((v) => !v)}>
          {neu ? "Schließen" : "Neues Projekt"}
        </Button>
      </PageHeader>

      {!projekte && <p className="text-sm text-quiet">Lade Projekte …</p>}
      {error && <Notice tone="error">{error}</Notice>}
      {info && !error && <Notice tone="ok">{info}</Notice>}

      {neu && (
        <Panel>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-sky-100">Neues Projekt</h2>
          <ProjektFormular busy={busy} onSave={async (felder) => (await act({ aktion: "projekt_anlegen", ...felder })) && (setNeu(false), true)} />
        </Panel>
      )}

      {vorschlaege.length > 0 && (
        <Panel glow>
          <h2 className="text-sm font-bold uppercase tracking-[0.25em] text-sky-100">Wartet auf deine Bestätigung ({vorschlaege.length})</h2>
          <p className="mt-1 text-xs text-quiet">Das hat JARVIS vorgeschlagen. Nichts davon gilt, bevor du es übernimmst. Du kannst jeden Vorschlag vorher ändern oder ablehnen.</p>
          <div className="mt-3 flex flex-col gap-3">
            {vorschlaege.map((v) => (
              <VorschlagKarte key={v.id} v={v} busy={busy} act={act} />
            ))}
          </div>
        </Panel>
      )}

      {projekte && liste.length === 0 && vorschlaege.length === 0 && !neu && (
        <Panel>
          <p className="text-sm text-quiet">
            Noch kein Projekt. Leg oben eines an oder erzähl JARVIS davon, zum Beispiel:{" "}
            <span className="text-sky-100">„Jarvis, im Projekt Hallenneubau haben wir heute entschieden, dass der Bauantrag bis Ende des Monats rausgeht. Zuständig ist Thomas.“</span> JARVIS
            schlägt dann Einträge vor, und du bestätigst sie hier.
          </p>
        </Panel>
      )}

      {liste.length > 0 && (
        <section aria-label="Projekte" className="grid gap-3 sm:grid-cols-2">
          {liste.map((p) => (
            <ProjektKachel key={p.id} p={p} heute={heute} aktiv={offen === p.id} onOpen={() => (offen === p.id ? schliesse() : (setAkte(null), setOffen(p.id)))} />
          ))}
        </section>
      )}

      {offen && akte && akte.projekt.id === offen && <Akte akte={akte} heute={heute} busy={busy} act={act} onClose={schliesse} />}
      {offen && (!akte || akte.projekt.id !== offen) && <p className="text-sm text-quiet">Lade die Akte …</p>}

      {projekte && (
        <p className="text-xs text-quiet">
          Gespeichert auf diesem Mac in {projekte.ablage}. Fragst du JARVIS nach einem Projekt, liest das KI-Gehirn die Akte mit; dabei geht ihr Inhalt an Anthropic. Ein Projekt, das du als
          vertraulich markierst, bleibt davon ausgenommen und ist nur hier zu sehen.
        </p>
      )}
    </main>
  );
}

function ProjektKachel({ p, heute, aktiv, onOpen }: { p: ProjektKarte; heute: string | null; aktiv: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-expanded={aktiv}
      className={`relative rounded-xl border bg-panel/95 p-4 text-left transition hover:border-sky-300/60 ${aktiv ? "border-sky-300/70 shadow-[0_0_28px_rgba(56,189,248,0.28)]" : "border-sky-300/20"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`${chip} ${p.status === "aktiv" ? CHIP.gut : CHIP.ruhig}`}>{STATUS_LABEL[p.status]}</span>
        {p.vertraulich && <span className={`${chip} ${CHIP.warn}`}>vertraulich</span>}
        {p.ueberfaellig > 0 && <span className={`${chip} ${CHIP.rot}`}>{p.ueberfaellig} überfällig</span>}
      </div>
      <h2 className="mt-2 text-base font-bold text-sky-50">{p.name}</h2>
      {p.verantwortliche.length > 0 && <p className="text-xs text-quiet">{p.verantwortliche.join(", ")}</p>}
      {p.fortschritt !== null && (
        <div className="mt-2 flex items-center gap-2" aria-label={`Fortschritt ${p.fortschritt} Prozent`}>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sky-300/15">
            <span className="block h-full rounded-full bg-sky-300" style={{ width: `${p.fortschritt}%` }} />
          </span>
          <span className="text-xs font-bold tabular-nums text-sky-100">{p.fortschritt} %</span>
        </div>
      )}
      <p className="mt-2 text-xs text-sky-50/85">
        {p.offeneAufgaben} offene {p.offeneAufgaben === 1 ? "Aufgabe" : "Aufgaben"}
        {p.risiken > 0 ? ` · ${p.risiken} ${p.risiken === 1 ? "Risiko" : "Risiken"}` : ""}
        {p.naechsteFrist && heute ? ` · nächste Frist: ${p.naechsteFrist.text.slice(0, 50)}, ${fristText(p.naechsteFrist.faellig, heute)}` : ""}
      </p>
      {p.naechsterSchritt && <p className="mt-1 text-xs text-quiet">Nächster Schritt: {p.naechsterSchritt}</p>}
      {p.eintraege === 0 && <p className="mt-1 text-xs text-quiet">Noch nichts festgehalten.</p>}
    </button>
  );
}

// ---------- Vorschläge ----------

const VORSCHLAG_LABEL = { projekt: "Neues Projekt", eintrag: "Neuer Eintrag", korrektur: "Korrektur" };

function VorschlagKarte({ v, busy, act }: { v: VorschlagAnzeige; busy: boolean; act: Aktion }) {
  const [aendern, setAendern] = useState(false);
  const i = v.inhalt;
  const b = v.bisher;
  const neuer = (k: keyof EintragFelder) => b && i[k] !== undefined && i[k] !== b[k];
  return (
    <article className="rounded-lg border border-sky-300/20 bg-sky-400/5 p-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`${chip} ${CHIP.ruhig}`}>
          {VORSCHLAG_LABEL[v.art]}
          {v.art !== "projekt" && i.art ? ` · ${ART_LABEL[i.art]}` : ""}
        </span>
        <span className="font-bold text-sky-100">{v.projektName}</span>
        {v.art === "eintrag" && !v.projektId && <span className="text-quiet">(Projekt wird mit angelegt)</span>}
        <span className="text-quiet">
          {zeit(v.erstelltAm)} · {QUELLE_LABEL[v.quelle.art]}
          {v.quelle.hinweis ? `: ${v.quelle.hinweis}` : ""}
          {v.quelle.kanal === "telegram" ? " · per Telegram" : ""}
        </span>
      </div>

      {v.art === "projekt" ? (
        <p className="mt-2 text-sm text-sky-50">{i.beschreibung || "Ohne Beschreibung."}</p>
      ) : (
        <>
          {b && neuer("text") && <p className="mt-2 text-sm text-quiet line-through">{b.text}</p>}
          <p className="mt-2 text-sm text-sky-50">{i.text}</p>
          <p className="mt-1 text-xs text-quiet">
            {[
              i.zustaendig && `Zuständig: ${i.zustaendig}${neuer("zustaendig") ? ` (bisher ${b!.zustaendig || "niemand"})` : ""}`,
              i.faellig && `Frist: ${tag(i.faellig)}${neuer("faellig") ? ` (bisher ${b!.faellig ? tag(b!.faellig) : "keine"})` : ""}`,
              i.datum && `Datum: ${tag(i.datum)}`,
              i.erledigt && (!b || neuer("erledigt")) && "als erledigt markieren",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </>
      )}

      {v.quelle.fremd && (
        <p className="mt-2 rounded border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs text-amber-100">
          Beruht auf Text von Dritten (Mail, Webseite oder Termin). Lies bitte genau, bevor du übernimmst.
        </p>
      )}

      {aendern ? (
        v.art === "projekt" ? (
          <ProjektFormular
            kurz
            start={{ name: v.projektName, beschreibung: i.beschreibung ?? "" }}
            busy={busy}
            knopf="Geändert übernehmen"
            onSave={({ name, beschreibung }) => act({ aktion: "vorschlag", id: v.id, ja: true, aenderung: { projektName: name, beschreibung } })}
          />
        ) : (
          <EintragFormular start={{ art: i.art ?? "notiz", text: i.text ?? "", zustaendig: i.zustaendig ?? "", faellig: i.faellig ?? null, datum: i.datum ?? null }} artFest={v.art === "korrektur"} busy={busy} knopf="Geändert übernehmen" onSave={(felder) => act({ aktion: "vorschlag", id: v.id, ja: true, aenderung: felder })} />
        )
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {!aendern && (
          <Button small tone="primary" disabled={busy} onClick={() => void act({ aktion: "vorschlag", id: v.id, ja: true })}>
            Übernehmen
          </Button>
        )}
        <Button small disabled={busy} onClick={() => setAendern((x) => !x)}>
          {aendern ? "Doch nicht ändern" : "Ändern"}
        </Button>
        <Button small tone="danger" disabled={busy} onClick={() => void act({ aktion: "vorschlag", id: v.id, ja: false })}>
          Ablehnen
        </Button>
      </div>
    </article>
  );
}

// ---------- Die Akte eines Projekts ----------

function Akte({ akte, heute, busy, act, onClose }: { akte: ProjektAkte; heute: string | null; busy: boolean; act: Aktion; onClose: () => void }) {
  const p = akte.projekt;
  const [bearbeiten, setBearbeiten] = useState(false);
  const [eintragen, setEintragen] = useState(false);
  return (
    <Panel glow>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-sky-300">Projektakte</p>
          <h2 className="mt-1 text-lg font-bold text-sky-50">{p.name}</h2>
          {p.beschreibung && <p className="mt-1 text-sm text-sky-50/85">{p.beschreibung}</p>}
          <p className="mt-1 text-xs text-quiet">
            {STATUS_LABEL[p.status]}
            {p.verantwortliche.length ? ` · Verantwortlich: ${p.verantwortliche.join(", ")}` : ""}
            {p.fortschritt !== null ? ` · ${p.fortschritt} %` : ""}
            {p.stichworte.length ? ` · auch bekannt als: ${p.stichworte.join(", ")}` : ""} · angelegt am {tag(p.erstelltAm)}, {quelleText(p.quelle)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button small onClick={() => setBearbeiten((x) => !x)}>
            {bearbeiten ? "Schließen" : "Projekt bearbeiten"}
          </Button>
          <Button small onClick={onClose}>
            Akte schließen
          </Button>
        </div>
      </div>

      {bearbeiten && (
        <div className="mt-3 border-t border-sky-300/15 pt-3">
          <ProjektFormular
            start={{ name: p.name, beschreibung: p.beschreibung, verantwortliche: p.verantwortliche.join(", "), stichworte: p.stichworte.join(", "), fortschritt: p.fortschritt === null ? "" : String(p.fortschritt), status: p.status, vertraulich: p.vertraulich }}
            busy={busy}
            knopf="Speichern"
            onSave={async (felder) => (await act({ aktion: "projekt_aendern", id: p.id, ...felder })) && (setBearbeiten(false), true)}
          />
        </div>
      )}

      {akte.vorschlaege.length > 0 && (
        <p className="mt-3 rounded border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-xs text-sky-100">
          Zu diesem Projekt {akte.vorschlaege.length === 1 ? "wartet ein Vorschlag" : `warten ${akte.vorschlaege.length} Vorschläge`} oben auf deine Bestätigung.
        </p>
      )}

      {heute && akte.eintraege.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-sky-200">Vorbereitung für die nächste Besprechung</summary>
          <p className="mt-2 whitespace-pre-line rounded-lg border border-sky-300/15 bg-sky-400/5 p-3 text-sm text-sky-50/90">{vorbereitung(akte, heute)}</p>
        </details>
      )}

      <div className="mt-3">
        <Button small tone={eintragen ? "ghost" : "primary"} onClick={() => setEintragen((x) => !x)}>
          {eintragen ? "Schließen" : "Eintrag hinzufügen"}
        </Button>
        {eintragen && <EintragFormular busy={busy} knopf="Eintragen" onSave={async (felder) => (await act({ aktion: "eintrag_anlegen", projektId: p.id, ...felder })) && (setEintragen(false), true)} />}
      </div>

      {REIHENFOLGE.map((art) => {
        const gruppe = akte.eintraege.filter((e) => e.art === art);
        if (!gruppe.length) return null;
        // Offenes zuerst, Erledigtes darunter.
        const sortiert = ABHAKBAR.includes(art) ? [...gruppe.filter((e) => !e.erledigt), ...gruppe.filter((e) => e.erledigt)] : gruppe;
        return (
          <section key={art} className="mt-4 border-t border-sky-300/15 pt-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-sky-200">
              {ART_MEHRZAHL[art]} ({gruppe.length})
            </h3>
            <ul className="mt-2 flex flex-col gap-2">
              {sortiert.map((e) => (
                <EintragZeile key={e.id} e={e} heute={heute} busy={busy} act={act} />
              ))}
            </ul>
          </section>
        );
      })}
      {akte.eintraege.length === 0 && <p className="mt-3 text-sm text-quiet">Zu diesem Projekt ist noch nichts festgehalten.</p>}

      {akte.zurueckgezogen.length > 0 && (
        <details className="mt-4 border-t border-sky-300/15 pt-3">
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-quiet">Zurückgezogen ({akte.zurueckgezogen.length})</summary>
          <ul className="mt-2 space-y-2 text-xs text-quiet">
            {akte.zurueckgezogen.map((e) => (
              <li key={e.id}>
                <span className="line-through">
                  {ART_LABEL[e.art]}: {e.text}
                </span>{" "}
                · zurückgezogen am {tag(e.zurueckgezogen!.am)}
                {e.zurueckgezogen!.grund ? `: ${e.zurueckgezogen!.grund}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Panel>
  );
}

function EintragZeile({ e, heute, busy, act }: { e: Eintrag; heute: string | null; busy: boolean; act: Aktion }) {
  const [modus, setModus] = useState<"korrigieren" | "zurueckziehen" | null>(null);
  const [grund, setGrund] = useState("");
  const abhakbar = ABHAKBAR.includes(e.art);
  const meta = [
    e.zustaendig && `Zuständig: ${e.zustaendig}`,
    e.faellig && (heute && !e.erledigt ? fristText(e.faellig, heute) : `Frist ${tag(e.faellig)}`),
    e.datum && `vom ${tag(e.datum)}`,
    quelleText(e.quelle),
    `bestätigt am ${tag(e.bestaetigtAm)}`,
  ].filter(Boolean);
  const ueberfaellig = Boolean(heute && e.faellig && !e.erledigt && e.faellig < heute);
  return (
    <li className="rounded-lg border border-sky-300/15 bg-sky-400/5 p-3">
      <div className="flex items-start gap-3">
        {abhakbar && (
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 accent-sky-400"
            checked={e.erledigt}
            disabled={busy}
            aria-label={e.erledigt ? "Wieder öffnen" : "Als erledigt abhaken"}
            onChange={() => void act({ aktion: "eintrag_korrigieren", id: e.id, erledigt: !e.erledigt, grund: e.erledigt ? "wieder geöffnet" : "erledigt" })}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={`text-sm ${e.erledigt ? "text-quiet line-through" : "text-sky-50"}`}>{e.text}</p>
          <p className={`mt-1 text-xs ${ueberfaellig ? "text-red-200" : "text-quiet"}`}>{meta.join(" · ")}</p>
          {e.quelle.fremd && <p className="mt-1 text-xs text-amber-200/90">Stammt aus Text von Dritten.</p>}
          {e.verlauf.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-sky-200">
                {e.verlauf.length === 1 ? "Einmal korrigiert" : `${e.verlauf.length}-mal korrigiert`}
                {e.geaendertAm ? `, zuletzt am ${tag(e.geaendertAm)}` : ""}
              </summary>
              <ul className="mt-1 space-y-1 text-xs text-quiet">
                {e.verlauf.map((a, n) => (
                  <li key={n}>
                    {zeit(a.am)}
                    {a.grund ? ` (${a.grund})` : ""}: vorher {vorherText(a.vorher)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
          <Button small disabled={busy} onClick={() => setModus((m) => (m === "korrigieren" ? null : "korrigieren"))}>
            Korrigieren
          </Button>
          <Button small tone="danger" disabled={busy} onClick={() => setModus((m) => (m === "zurueckziehen" ? null : "zurueckziehen"))}>
            Zurückziehen
          </Button>
        </div>
      </div>
      {modus === "korrigieren" && (
        <EintragFormular
          start={e}
          mitGrund
          busy={busy}
          knopf="Korrektur speichern"
          onSave={async (felder) => (await act({ aktion: "eintrag_korrigieren", id: e.id, ...felder })) && (setModus(null), true)}
        />
      )}
      {modus === "zurueckziehen" && (
        <form
          className="mt-2 flex flex-wrap items-center gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            void act({ aktion: "eintrag_zurueckziehen", id: e.id, grund });
          }}
        >
          <input value={grund} onChange={(ev) => setGrund(ev.target.value)} placeholder="Warum? z. B. war falsch, hat sich erledigt" aria-label="Grund" maxLength={GRENZEN.grund} className={`${inputClass} flex-1`} />
          <Button small tone="danger" type="submit" disabled={busy}>
            Wirklich zurückziehen
          </Button>
          <span className="w-full text-xs text-quiet">Der Eintrag verschwindet aus der Akte und aus dem, was JARVIS liest. Er bleibt unter „Zurückgezogen“ nachvollziehbar.</span>
        </form>
      )}
    </li>
  );
}

const vorherText = (v: Partial<EintragFelder>): string =>
  [
    v.text !== undefined && `„${v.text}“`,
    v.art !== undefined && `Art ${ART_LABEL[v.art]}`,
    v.zustaendig !== undefined && `zuständig ${v.zustaendig || "niemand"}`,
    v.faellig !== undefined && `Frist ${v.faellig ? tag(v.faellig) : "keine"}`,
    v.datum !== undefined && `Datum ${v.datum ? tag(v.datum) : "keins"}`,
    v.erledigt !== undefined && (v.erledigt ? "erledigt" : "offen"),
  ]
    .filter(Boolean)
    .join(", ");

// ---------- Formulare ----------

function Feld({ label, children, breit }: { label: string; children: ReactNode; breit?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-quiet ${breit ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
    </label>
  );
}

type EintragStart = { art: EintragArt; text: string; zustaendig: string; faellig: string | null; datum: string | null };

function EintragFormular({ start, busy, knopf, onSave, mitGrund, artFest }: { start?: EintragStart; busy: boolean; knopf: string; onSave: (felder: Record<string, unknown>) => Promise<boolean>; mitGrund?: boolean; artFest?: boolean }) {
  const [art, setArt] = useState<EintragArt>(start?.art ?? "aufgabe");
  const [text, setText] = useState(start?.text ?? "");
  const [zustaendig, setZustaendig] = useState(start?.zustaendig ?? "");
  const [faellig, setFaellig] = useState(start?.faellig ?? "");
  const [datum, setDatum] = useState(start?.datum ?? "");
  const [grund, setGrund] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || busy) return;
    const ok = await onSave({ art, text, zustaendig, faellig: faellig || null, datum: datum || null, ...(mitGrund ? { grund } : {}) });
    if (ok && !start) {
      setText("");
      setZustaendig("");
      setFaellig("");
      setDatum("");
    }
  };
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-2">
      <Feld label="Art">
        <select value={art} onChange={(e) => setArt(e.target.value as EintragArt)} disabled={artFest} className={inputClass}>
          {EINTRAG_ARTEN.map((a) => (
            <option key={a} value={a}>
              {ART_LABEL[a]}
            </option>
          ))}
        </select>
      </Feld>
      <Feld label="Zuständig (optional)">
        <input value={zustaendig} onChange={(e) => setZustaendig(e.target.value)} maxLength={GRENZEN.person} className={inputClass} />
      </Feld>
      <Feld label="Text" breit>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={GRENZEN.text} className={`${inputClass} resize-y`} required />
      </Feld>
      <Feld label="Frist (optional)">
        <input type="date" value={faellig} onChange={(e) => setFaellig(e.target.value)} className={inputClass} />
      </Feld>
      <Feld label="Datum der Entscheidung oder Besprechung (optional)">
        <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={inputClass} />
      </Feld>
      {mitGrund && (
        <Feld label="Grund der Korrektur (optional)" breit>
          <input value={grund} onChange={(e) => setGrund(e.target.value)} maxLength={GRENZEN.grund} className={inputClass} />
        </Feld>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" tone="primary" small disabled={busy || !text.trim()}>
          {knopf}
        </Button>
      </div>
    </form>
  );
}

type ProjektStart = { name?: string; beschreibung?: string; verantwortliche?: string; stichworte?: string; fortschritt?: string; status?: ProjektStatus; vertraulich?: boolean };

// kurz: nur Name und Beschreibung, für einen Vorschlag, den du vor dem Übernehmen änderst.
function ProjektFormular({ start, busy, knopf = "Projekt anlegen", onSave, kurz }: { start?: ProjektStart; busy: boolean; knopf?: string; onSave: (felder: Record<string, unknown> & { name: string; beschreibung: string }) => Promise<boolean>; kurz?: boolean }) {
  const [name, setName] = useState(start?.name ?? "");
  const [beschreibung, setBeschreibung] = useState(start?.beschreibung ?? "");
  const [verantwortliche, setVerantwortliche] = useState(start?.verantwortliche ?? "");
  const [stichworte, setStichworte] = useState(start?.stichworte ?? "");
  const [fortschritt, setFortschritt] = useState(start?.fortschritt ?? "");
  const [status, setStatus] = useState<ProjektStatus>(start?.status ?? "aktiv");
  const [vertraulich, setVertraulich] = useState(start?.vertraulich ?? false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    void onSave(kurz ? { name, beschreibung } : { name, beschreibung, verantwortliche, stichworte, fortschritt: fortschritt === "" ? null : Number(fortschritt), status, vertraulich });
  };
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2 sm:grid-cols-2">
      <Feld label="Name" breit={kurz}>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={GRENZEN.name} className={inputClass} required />
      </Feld>
      {!kurz && (
        <Feld label="Verantwortliche (mit Komma getrennt)">
          <input value={verantwortliche} onChange={(e) => setVerantwortliche(e.target.value)} className={inputClass} />
        </Feld>
      )}
      <Feld label="Worum geht es?" breit>
        <textarea value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} rows={2} maxLength={GRENZEN.beschreibung} className={`${inputClass} resize-y`} />
      </Feld>
      {!kurz && (
        <>
          <Feld label="Weitere Namen in Terminen und Mails (mit Komma getrennt)">
            <input value={stichworte} onChange={(e) => setStichworte(e.target.value)} placeholder="z. B. Halle 3, HN-26" className={inputClass} />
          </Feld>
          <Feld label="Fortschritt in Prozent (leer lassen, wenn offen)">
            <input type="number" min={0} max={100} value={fortschritt} onChange={(e) => setFortschritt(e.target.value)} className={inputClass} />
          </Feld>
          <Feld label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as ProjektStatus)} className={inputClass}>
              {(Object.keys(STATUS_LABEL) as ProjektStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </Feld>
          <label className="flex items-start gap-3 self-end text-xs text-sky-50/85">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-sky-400" checked={vertraulich} onChange={(e) => setVertraulich(e.target.checked)} />
            <span>
              Vertraulich
              <span className="block text-quiet">Der Inhalt bleibt auf dem Mac: nichts davon geht an das KI-Gehirn oder über Telegram.</span>
            </span>
          </label>
        </>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" tone="primary" small disabled={busy || !name.trim()}>
          {knopf}
        </Button>
      </div>
    </form>
  );
}
