"use client";

import type { ReactNode } from "react";
import { useJarvis } from "../JarvisProvider";
import { Scheibe, Scheiben, ScheibenZeile } from "../Raum";
import { RaumLink } from "../RaumLink";
import { Abschnitt, PageHeader, Panel } from "../ui";
import { clock } from "@/lib/calendar";
import { spokenDue } from "@/lib/dates";
import { ZUSTAND_LABEL, type AgentenSnapshot } from "@/lib/agenten";
import { formatPct, ohnePunkt } from "@/lib/format";
import { kopfSatz, luecken, mehrzahl, restStand, tageslage, tagesSatz, terminImKopf, wartetLeer } from "@/lib/heute";
import { marktlage } from "@/lib/marktlage";
import { MOOD_LABEL } from "@/lib/intel";
import type { SicherheitsLage } from "@/lib/sicherheit";
import { dateOf } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";
import { wetterKurz } from "@/lib/weather";
import { usePolling } from "@/lib/usePolling";

// Heute: der Eingangsraum. An der Wand steht groß, was als Nächstes kommt, darunter, was auf dich wartet, und
// der Rest des Tages (Aufgaben, Post, Projekte). Vor dem Fenster hängen die Termine, die Märkte und die Agenten.
// Alles stammt aus den Räumen dahinter und führt mit einem Klick dorthin. Zusammengestellt wird ohne KI.

const DATUM = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

const leer = "text-[0.95rem] text-quiet";

function Liste({ titel, href, zahl, children }: { titel: string; href: string; zahl?: string; children: ReactNode }) {
  return (
    <Panel>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Abschnitt>{titel}</Abschnitt>
        <RaumLink href={href} className="shrink-0 text-sm font-bold text-see hover:text-schiefer">
          {zahl ?? "Öffnen"}
        </RaumLink>
      </div>
      {children}
    </Panel>
  );
}

export function TodayView() {
  const { name, calendar, tasks, mail, projekte, desk, intel, documents, market, weather, metalle, ausfall } = useJarvis();
  const now = useNow();
  // Dieselbe Abfrage wie die Hinweisleiste: kein zweiter Abruf, und ein Klick dort gilt hier sofort.
  const { data: sicherheit, failed: sicherheitAus } = usePolling<SicherheitsLage>("/api/sicherheit", 10_000);
  const { data: agenten, failed: agentenAus } = usePolling<AgentenSnapshot>("/api/agenten", 15_000);
  if (!now) return <main className="text-quiet">Lade den Tag …</main>;

  // Was noch lädt, nicht verbunden ist oder gerade nicht antwortet: Dazu behauptet der Raum nichts (heute.ts).
  const fehlt = luecken({ calendar, tasks, mail, projekte }, ausfall);
  // Das Übrige, aus dem „Wartet auf dich“ entsteht: gelesen, lädt noch oder antwortet nicht.
  const rest = restStand([
    [Boolean(sicherheit), sicherheitAus],
    [Boolean(desk), ausfall.desk],
    [Boolean(intel), ausfall.intel],
    [Boolean(documents), ausfall.documents],
  ]);
  const heute = tageslage({ calendar, tasks, mail, projekte, desk, intel, documents, freigabenOffen: sicherheit?.freigaben.filter((f) => f.zustand === "offen").length ?? 0, notaus: sicherheit?.zustand.notaus.an ?? false }, now);
  const stunde = now.getHours();
  const gruss = stunde < 11 ? "Guten Morgen" : stunde < 18 ? "Guten Tag" : "Guten Abend";
  const majors = market?.majors.quotes ?? [];
  // Aus der Marktlage stehen hier nur Bewegungen: Die Warnung von Intel steht schon unter „Wartet auf dich“,
  // Lücken in den Daten zeigt der Raum Intel. Beispielkurse und veraltete Kurse heißen aber auch hier so.
  const maerkte = marktlage({ market, metalle, desk, intel });
  const auffaellig = maerkte.auffaellig.filter((a) => a.art !== "warnung" && a.art !== "daten");
  const wichtigePost = heute.postNeu;
  const kurz = wetterKurz(weather);
  const wetter = kurz ? ` ${kurz}` : "";

  // Das große Wort: läuft gerade ein Termin, steht er dort; sonst die Uhrzeit des nächsten; sonst der Tag selbst.
  const imKopf = terminImKopf(heute);
  const dran = imKopf?.termin ?? null;
  const laeuft = Boolean(imKopf?.laeuft);
  const zeile = dran ? `${DATUM.format(now)}. ${laeuft ? "Läuft gerade, seit:" : "Als Nächstes:"}` : `${gruss}, ${name}. ${DATUM.format(now)}.${wetter}`;
  const faellig = [...heute.aufgaben.ueberfaellig, ...heute.aufgaben.heute];

  return (
    <main className="flex max-w-[52rem] flex-col gap-8">
      <PageHeader
        title="Heute"
        subtitle={zeile}
        gross={dran ? clock(dran.start) : undefined}
        satz={kopfSatz(heute, fehlt)}
      />
      <div className="-mt-4 max-w-[36rem] text-[1.05rem] leading-relaxed text-stein">
        {dran?.ort && <p>{dran.ort}</p>}
        {dran?.projekte.map((p) => (
          <p key={p.id}>
            Zum Projekt {p.name} liegt die{" "}
            <RaumLink href="/projekte" className="font-bold text-see underline-offset-4 hover:underline">
              Vorbereitung in der Akte
            </RaumLink>
            .
          </p>
        ))}
        <p>
          {tagesSatz(heute, fehlt)}
          {dran ? wetter : ""}
        </p>
      </div>

      <Panel glow={heute.brauchtDich.some((h) => h.dringend)}>
        <Abschnitt>Wartet auf dich</Abschnitt>
        {heute.brauchtDich.length === 0 ? (
          <p className={`mt-2 ${leer}`}>{wartetLeer(fehlt, rest)}</p>
        ) : (
          <ul className="mt-1">
            {heute.brauchtDich.map((h, i) => (
              <li key={i} className="border-b border-schiefer/15">
                <RaumLink href={h.href} className="group flex items-center gap-4 py-2.5 text-[1.1rem] font-medium leading-snug">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${h.dringend ? "bg-rot" : "bg-sonne"}`} aria-hidden />
                  <span className="min-w-0 flex-1">{h.text}</span>
                  <span className="shrink-0 text-sm font-bold text-see group-hover:text-schiefer">Ansehen</span>
                </RaumLink>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-x-8 gap-y-8 xl:grid-cols-3">
        <Liste titel="Aufgaben" href="/aufgaben" zahl={faellig.length ? mehrzahl(faellig.length, "Eine fällig", "fällig") : undefined}>
          {fehlt.aufgaben ? (
            <p className={fehlt.aufgaben.art === "gestoert" ? "text-[0.95rem] text-down" : leer}>{fehlt.aufgaben.text}</p>
          ) : faellig.length === 0 ? (
            <p className={leer}>Heute ist nichts fällig.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-[0.95rem]">
              {faellig.slice(0, 7).map((t) => (
                <li key={t.id}>
                  <span className="block font-medium leading-snug">{t.text}</span>
                  <span className={`block text-sm ${dateOf(t)! < heute.datum ? "font-bold text-down" : "text-quiet"}`}>{spokenDue(dateOf(t)!, heute.datum)}</span>
                </li>
              ))}
            </ul>
          )}
          {heute.aufgaben.dieseWoche > 0 && <p className="mt-2 text-sm text-quiet">In den nächsten sieben Tagen: {heute.aufgaben.dieseWoche === 1 ? "eine weitere" : `${heute.aufgaben.dieseWoche} weitere`}</p>}
        </Liste>

        <Liste titel="Post" href="/post" zahl={wichtigePost ? mehrzahl(wichtigePost, "Eine wichtige", "wichtige") : undefined}>
          {fehlt.post ? (
            <p className={fehlt.post.art === "gestoert" ? "text-[0.95rem] text-down" : leer}>{fehlt.post.text}</p>
          ) : heute.post.length === 0 ? (
            <p className={leer}>Keine neuen wichtigen Mails.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-[0.95rem]">
              {heute.post.map((m) => (
                <li key={m.uid} className="min-w-0">
                  <span className="block truncate font-medium">{m.subject || "(ohne Betreff)"}</span>
                  <span className="block truncate text-sm text-quiet">{m.from}</span>
                </li>
              ))}
            </ul>
          )}
        </Liste>

        <Liste titel="Projekte" href="/projekte" zahl={projekte ? `${projekte.projekte.filter((p) => p.status === "aktiv").length} aktiv` : undefined}>
          {fehlt.projekte ? (
            <p className={leer}>{fehlt.projekte.text}</p>
          ) : projekte && projekte.projekte.length === 0 ? (
            <p className={leer}>Noch kein Projekt angelegt.</p>
          ) : heute.projekte.length === 0 ? (
            <p className={leer}>In den nächsten drei Tagen ist in keinem Projekt etwas fällig.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-[0.95rem]">
              {heute.projekte.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <span className="block font-bold">{p.name}</span>
                  <span className={`block text-sm ${p.dringend ? "text-ocker" : "text-quiet"}`}>{p.grund}</span>
                </li>
              ))}
            </ul>
          )}
        </Liste>
      </div>

      <Scheiben>
        <Scheibe titel="Termine heute" href="/kalender">
          {fehlt.kalender ? (
            <p className="text-[0.95rem] opacity-80">{fehlt.kalender.text}</p>
          ) : heute.termine.length === 0 ? (
            <p className="text-[0.95rem] opacity-80">{fehlt.outlook ? "Im Kalender am Mac steht kein Termin." : "Kein Termin."}</p>
          ) : (
            <ul>
              {heute.termine.slice(0, 6).map((t) => (
                <ScheibenZeile key={`${t.id}-${t.start}`} vorn={t.ganztags ? "ganz" : clock(t.start)} stark={dran?.id === t.id}>
                  <span className={t.vorbei ? "line-through opacity-60" : ""}>{t.titel}</span>
                </ScheibenZeile>
              ))}
            </ul>
          )}
          {fehlt.outlook && <p className="mt-2 text-sm opacity-75">{fehlt.outlook.text}</p>}
          {heute.termineMorgen > 0 && <p className="mt-2 text-sm opacity-75">Morgen: {mehrzahl(heute.termineMorgen, "ein Termin", "Termine")}</p>}
        </Scheibe>

        <Scheibe titel="Märkte" href="/intel">
          <ul>
            {majors.map((q) => (
              <ScheibenZeile key={q.symbol} wert={<span className={q.change24h >= 0 ? "" : "opacity-70"}>{formatPct(q.change24h)}</span>}>
                {q.name}
              </ScheibenZeile>
            ))}
            {maerkte.metalle?.zeilen.map((z) => (
              <ScheibenZeile key={z.id} wert={z.aenderung === null ? z.wert : <span className={z.aenderung >= 0 ? "" : "opacity-70"}>{z.aenderungText}</span>}>
                {z.name}
              </ScheibenZeile>
            ))}
            {desk && desk.status !== "aus" && <ScheibenZeile wert={formatPct(desk.dayPnlPct)}>Spielgeld-Desk</ScheibenZeile>}
          </ul>
          {/* Antwortet die Abfrage der Kurse selbst nicht, steht das da; „Noch keine Kurse“ wäre dann falsch. */}
          {!market && ausfall.market ? (
            <p className="text-[0.95rem] opacity-80">Die Krypto-Kurse lassen sich gerade nicht laden.</p>
          ) : (
            majors.length === 0 && !maerkte.metalle && (!desk || desk.status === "aus") && <p className="text-[0.95rem] opacity-80">Noch keine Kurse.</p>
          )}
          {auffaellig.length > 0 && (
            <p className="mt-2 text-sm">
              Auffällig: {ohnePunkt(auffaellig[0].text)}
              {auffaellig.length > 1 ? `, und ${auffaellig.length === 2 ? "eines mehr" : `${auffaellig.length - 1} mehr`}` : ""}.
            </p>
          )}
          {market?.majors.source === "demo" && <p className="mt-2 text-sm opacity-75">Beispielkurse, keine echten Daten.</p>}
          {maerkte.metalle?.veraltet && <p className="mt-2 text-sm opacity-75">Edelmetalle: {maerkte.metalle.fuss}</p>}
          {intel?.report && <p className="mt-2 text-sm opacity-75">Lage laut Intel: {MOOD_LABEL[intel.report.mood]}</p>}
        </Scheibe>

        <Scheibe titel="Agenten" href="/agenten">
          {!agenten ? (
            <p className="text-[0.95rem] opacity-80">{agentenAus ? "Die Agenten lassen sich gerade nicht laden." : "Die Agenten melden sich …"}</p>
          ) : (
            <ul>
              {agenten.agenten.map((a) => (
                <ScheibenZeile key={a.name} wert={<span title={a.fehler ?? a.satz}>{ZUSTAND_LABEL[a.zustand]}</span>}>
                  {a.label}
                </ScheibenZeile>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm opacity-75">Der Desk handelt nur mit Spielgeld.</p>
        </Scheibe>
      </Scheiben>
    </main>
  );
}
