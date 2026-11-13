"use client";

import type { ReactNode } from "react";
import { HoloLink } from "../HoloLink";
import { Icon, type IconName } from "../icons";
import { useJarvis } from "../JarvisProvider";
import { PageHeader, Panel } from "../ui";
import { clock } from "@/lib/calendar";
import { spokenDue } from "@/lib/dates";
import { formatEur, formatPct, formatSignedUsd } from "@/lib/format";
import { tageslage, type Hinweis } from "@/lib/heute";
import { MOOD_LABEL } from "@/lib/intel";
import { SAFETY, STATUS_LABEL } from "@/lib/paper";
import { AGENTEN, type SicherheitsLage } from "@/lib/sicherheit";
import { dateOf } from "@/lib/tasks";
import { useNow } from "@/lib/useNow";
import { usePolling } from "@/lib/usePolling";

// Heute: die Tagesübersicht für die Geschäftsführung. Oben, was auf dich wartet; darunter der Tag (Termine,
// Aufgaben, Post), die Projekte, die heute auffallen, Märkte und Nachrichten und was die Agenten gerade tun.
// Alles stammt aus den Ansichten dahinter und führt mit einem Klick dorthin. Zusammengestellt wird ohne KI.

const DATUM = new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" });

const HINWEIS_ICON: Record<Hinweis["art"], IconName> = {
  notaus: "einstellungen",
  freigabe: "einstellungen",
  rueckfrage: "trading",
  vorschlag: "projekte",
  warnung: "intel",
  aufgaben: "aufgaben",
  projekt: "projekte",
  post: "post",
  dokument: "dokumente",
};

function Karte({ titel, href, children, zahl }: { titel: string; href: string; children: ReactNode; zahl?: string }) {
  return (
    <Panel>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-sky-100">{titel}</h2>
        <HoloLink href={href} className="shrink-0 text-[11px] font-bold uppercase tracking-widest text-sky-300 hover:text-sky-100">
          {zahl ? `${zahl} · ` : ""}öffnen ›
        </HoloLink>
      </div>
      {children}
    </Panel>
  );
}

const leer = "text-sm text-quiet";

export function TodayView() {
  const { name, calendar, tasks, mail, projekte, desk, intel, documents, market, weather, settings } = useJarvis();
  const now = useNow();
  const { data: sicherheit } = usePolling<SicherheitsLage>("/api/sicherheit", 10_000);
  if (!now) return <main className="p-6 text-sm text-quiet">Lade den Tag …</main>;

  const heute = tageslage({ calendar, tasks, mail, projekte, desk, intel, documents, freigabenOffen: sicherheit?.freigaben.filter((f) => f.zustand === "offen").length ?? 0, notaus: sicherheit?.zustand.notaus.an ?? false }, now);
  const stunde = now.getHours();
  const gruss = stunde < 11 ? "Guten Morgen" : stunde < 18 ? "Guten Tag" : "Guten Abend";
  const gesperrt = AGENTEN.filter((a) => sicherheit?.zustand.sperren[a.name]);
  const majors = market?.majors.quotes ?? [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <PageHeader
        icon="heute"
        title="Heute"
        subtitle={`${gruss}, ${name}. ${DATUM.format(now)}${weather ? ` · ${Math.round(weather.temperature)} °C, ${weather.description} in ${weather.place}` : ""}`}
      />

      <Panel glow={heute.brauchtDich.some((h) => h.dringend)}>
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-sky-100">Wartet auf dich</h2>
        {heute.brauchtDich.length === 0 ? (
          <p className={`mt-2 ${leer}`}>Nichts wartet auf dich.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {heute.brauchtDich.map((h, i) => (
              <li key={i}>
                <HoloLink
                  href={h.href}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition hover:border-sky-300/60 ${h.dringend ? "border-amber-300/40 bg-amber-300/10 text-amber-50" : "border-sky-300/20 bg-sky-400/5 text-sky-50"}`}
                >
                  <span className={`shrink-0 ${h.dringend ? "text-amber-200" : "text-sky-300"}`} aria-hidden>
                    <Icon name={HINWEIS_ICON[h.art]} className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">{h.text}</span>
                  <span className="shrink-0 text-xs text-quiet" aria-hidden>
                    ›
                  </span>
                </HoloLink>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Karte titel="Termine" href="/kalender" zahl={heute.termine.length ? String(heute.termine.length) : undefined}>
          {calendar && calendar.access !== "ok" ? (
            <p className={leer}>{calendar.access === "kein-mac" ? "Den Kalender gibt es nur auf dem Mac." : "Der Kalender ist noch nicht verbunden."}</p>
          ) : heute.termine.length === 0 ? (
            <p className={leer}>Heute steht kein Termin an.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {heute.termine.map((t) => (
                <li key={`${t.id}-${t.start}`} className={`text-sm ${t.vorbei ? "text-quiet" : "text-sky-50"}`}>
                  <span className={`mr-2 inline-block w-14 font-bold tabular-nums ${t.laeuft ? "text-amber-200" : heute.naechster?.id === t.id ? "text-sky-200" : ""}`}>{t.ganztags ? "ganzt." : clock(t.start)}</span>
                  <span className={t.vorbei ? "line-through" : ""}>{t.titel}</span>
                  {t.laeuft && <span className="ml-2 text-xs text-amber-200">läuft</span>}
                  {t.ort && <span className="block pl-16 text-xs text-quiet">{t.ort}</span>}
                  {t.projekte.map((p) => (
                    <HoloLink key={p.id} href="/projekte" className="ml-16 mt-0.5 block w-fit rounded-full border border-sky-300/30 px-2 text-[10px] font-bold uppercase tracking-widest text-sky-200 hover:border-sky-300/70">
                      Projekt {p.name}: Vorbereitung in der Akte
                    </HoloLink>
                  ))}
                </li>
              ))}
            </ul>
          )}
          {heute.termineMorgen > 0 && <p className="mt-2 text-xs text-quiet">Morgen: {heute.termineMorgen === 1 ? "ein Termin" : `${heute.termineMorgen} Termine`}</p>}
        </Karte>

        <Karte titel="Aufgaben" href="/aufgaben" zahl={heute.aufgaben.ueberfaellig.length + heute.aufgaben.heute.length ? String(heute.aufgaben.ueberfaellig.length + heute.aufgaben.heute.length) : undefined}>
          {tasks && !tasks.configured ? (
            <p className={leer}>Obsidian ist noch nicht verbunden.</p>
          ) : heute.aufgaben.ueberfaellig.length + heute.aufgaben.heute.length === 0 ? (
            <p className={leer}>Heute ist nichts fällig.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {[...heute.aufgaben.ueberfaellig, ...heute.aufgaben.heute].slice(0, 7).map((t) => (
                <li key={t.id} className="flex gap-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dateOf(t)! < heute.datum ? "bg-down" : "bg-sky-300"}`} aria-hidden />
                  <span className="min-w-0">
                    <span className="text-sky-50">{t.text}</span>
                    <span className={`block text-xs ${dateOf(t)! < heute.datum ? "text-red-200" : "text-quiet"}`}>{spokenDue(dateOf(t)!, heute.datum)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {heute.aufgaben.dieseWoche > 0 && <p className="mt-2 text-xs text-quiet">In den nächsten sieben Tagen: {heute.aufgaben.dieseWoche === 1 ? "eine weitere" : `${heute.aufgaben.dieseWoche} weitere`}</p>}
        </Karte>

        <Karte titel="Post" href="/post" zahl={mail?.configured && !mail.error && mail.importantUnread ? String(mail.importantUnread) : undefined}>
          {mail && !mail.configured ? (
            <p className={leer}>Das Postfach ist noch nicht verbunden.</p>
          ) : mail?.error ? (
            <p className="text-sm text-red-200">Das Postfach antwortet nicht.</p>
          ) : heute.post.length === 0 ? (
            <p className={leer}>Keine neuen wichtigen Mails.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {heute.post.map((m) => (
                <li key={m.uid} className="min-w-0">
                  <span className="block truncate text-sky-50">{m.subject || "(ohne Betreff)"}</span>
                  <span className="block truncate text-xs text-quiet">{m.from}</span>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Karte titel="Projekte" href="/projekte" zahl={projekte ? `${projekte.projekte.filter((p) => p.status === "aktiv").length} aktiv` : undefined}>
          {projekte && projekte.projekte.length === 0 ? (
            <p className={leer}>Noch kein Projekt angelegt.</p>
          ) : heute.projekte.length === 0 ? (
            <p className={leer}>In den nächsten drei Tagen ist in keinem Projekt etwas fällig.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {heute.projekte.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <span className="font-bold text-sky-50">{p.name}</span>
                  <span className={`block text-xs ${p.dringend ? "text-amber-100" : "text-quiet"}`}>{p.grund}</span>
                </li>
              ))}
            </ul>
          )}
        </Karte>

        <Karte titel="Märkte und Nachrichten" href="/intel">
          {majors.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {majors.map((q) => (
                <li key={q.symbol} className="flex items-baseline justify-between gap-2">
                  <span className="text-sky-50">{q.name}</span>
                  <span className="tabular-nums text-sky-50">
                    {formatEur(q.eur)} <span className={q.change24h >= 0 ? "text-up" : "text-down"}>{formatPct(q.change24h)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {market?.majors.source === "demo" && <p className="mt-1 text-xs text-amber-200/90">Beispielkurse, keine echten Daten.</p>}
          <p className="mt-2 text-xs text-quiet">
            {!intel ? "Lade Nachrichten …" : !intel.configured ? "Nachrichten: kein xAI-Schlüssel eingetragen." : intel.report ? `Lage laut Intel: ${MOOD_LABEL[intel.report.mood]}. ${intel.report.items[0]?.title ?? ""}` : "Noch kein Lagebild."}
          </p>
        </Karte>

        <Karte titel="Agenten" href="/agenten">
          <ul className="flex flex-col gap-1.5 text-sm">
            <li className="flex justify-between gap-2">
              <span className="text-sky-50">KI-Gehirn</span>
              <span className="text-quiet">{settings ? (settings.brain.configured ? "bereit" : "kein Schlüssel") : "…"}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-sky-50">Analyst</span>
              <span className={documents?.running ? "text-sky-200" : "text-quiet"}>{documents?.running ? `schreibt: ${documents.running.thema}` : "frei"}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-sky-50">Intel</span>
              <span className={intel?.running ? "text-sky-200" : "text-quiet"}>{intel?.running ? "liest gerade" : intel?.configured ? "wartet auf den nächsten Lauf" : "nicht eingerichtet"}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-sky-50">Spielgeld-Desk</span>
              <span className="text-quiet">
                {desk ? (desk.status === "aus" ? "nicht gestartet" : `${STATUS_LABEL[desk.status]} · ${formatSignedUsd(desk.pnlUsd)} · Tag ${Math.min(desk.testDay, SAFETY.testDays)}/${SAFETY.testDays}`) : "…"}
              </span>
            </li>
          </ul>
          {gesperrt.length > 0 && <p className="mt-2 text-xs text-amber-200/90">Gesperrt: {gesperrt.map((a) => a.label).join(", ")}</p>}
          <p className="mt-2 text-xs text-quiet">Der Desk handelt nur mit Spielgeld.</p>
        </Karte>
      </div>
    </main>
  );
}
