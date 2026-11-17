import { randomUUID } from "node:crypto";
import { isoDate } from "../../dates";
import {
  datumOderNull,
  EINTRAG_ARTEN,
  findeProjekt,
  fortschrittOderNull,
  GRENZEN,
  karteVon,
  namensliste,
  projekteImText,
  sauber,
  vorbereitung,
  type Eintrag,
  type EintragArt,
  type EintragFelder,
  type Projekt,
  type ProjektAkte,
  type ProjekteSnapshot,
  type ProjektStatus,
  type Quelle,
  type QuellenArt,
  type Vorschlag,
  type VorschlagAnzeige,
  type VorschlagInhalt,
} from "../../projekte";
import type { FaelligeAufgabe } from "../../hinweise";
import type { Wer } from "../../sicherheit";
import { protokolliere } from "../gateway/audit";
import { speicher } from "./speicher";

// Die Abläufe des Projektgedächtnisses. Zwei Wege führen hinein:
// 1. Ein Mensch trägt am Mac selbst ein, korrigiert oder zieht zurück.
// 2. JARVIS schlägt vor (schlageVor). Ein Vorschlag ist noch kein Wissen: Das Gehirn bekommt ihn nicht als
//    Tatsache zu lesen, und er wird erst zum Eintrag, wenn ein Mensch ihn am Mac übernimmt (entscheide).
// Gelöscht wird nichts: Korrekturen stehen im Verlauf des Eintrags, Zurückgezogenes bleibt als zurückgezogen
// sichtbar. Ins Audit-Log kommen nur Nummern und Arten, keine Inhalte.

export class ProjektFehler extends Error {}

const id = (vorsatz: string) => `${vorsatz}${randomUUID().replace(/-/g, "").slice(0, 10)}`;
const STATUS: ProjektStatus[] = ["aktiv", "pausiert", "abgeschlossen"];
const QUELLEN: QuellenArt[] = ["eingabe", "gespraech", "mail", "termin", "dokument", "web"];
const FELDER = ["art", "text", "zustaendig", "faellig", "datum", "erledigt"] as const;
const gleich = (a: string, b: string) => a.toLowerCase().replace(/\s+/g, " ").trim() === b.toLowerCase().replace(/\s+/g, " ").trim();

// Bestätigen, eintragen und korrigieren darf nur ein Mensch am Mac. Weder das System noch ein Agent.
function mensch(von: Wer): "mac" {
  if (von !== "mac") throw new ProjektFehler("Das Projektgedächtnis ändert nur ein Mensch am Mac.");
  return von;
}

const selbst = (von: "mac"): Quelle => ({ art: "eingabe", hinweis: "", kanal: von, fremd: false, von: "mensch" });

function felder(roh: Partial<Record<keyof EintragFelder, unknown>>, basis?: EintragFelder): EintragFelder {
  const art = EINTRAG_ARTEN.includes(roh.art as EintragArt) ? (roh.art as EintragArt) : (basis?.art ?? "notiz");
  const text = roh.text === undefined ? (basis?.text ?? "") : sauber(roh.text, GRENZEN.text);
  if (!text) throw new ProjektFehler("Der Eintrag braucht einen Text.");
  if (roh.faellig && !datumOderNull(roh.faellig)) throw new ProjektFehler("Das Fälligkeitsdatum bitte als JJJJ-MM-TT angeben.");
  if (roh.datum && !datumOderNull(roh.datum)) throw new ProjektFehler("Das Datum bitte als JJJJ-MM-TT angeben.");
  return {
    art,
    text,
    zustaendig: roh.zustaendig === undefined ? (basis?.zustaendig ?? "") : sauber(roh.zustaendig, GRENZEN.person),
    faellig: roh.faellig === undefined ? (basis?.faellig ?? null) : datumOderNull(roh.faellig),
    datum: roh.datum === undefined ? (basis?.datum ?? null) : datumOderNull(roh.datum),
    erledigt: roh.erledigt === undefined ? (basis?.erledigt ?? false) : roh.erledigt === true,
  };
}

// ---------- Lesen ----------

const mitBisher = (vorschlaege: Vorschlag[], eintraege: Eintrag[]): VorschlagAnzeige[] =>
  vorschlaege
    .sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm))
    .map((v) => {
      const e = v.eintragId ? eintraege.find((x) => x.id === v.eintragId) : undefined;
      return { ...v, bisher: e ? { art: e.art, text: e.text, zustaendig: e.zustaendig, faellig: e.faellig, datum: e.datum, erledigt: e.erledigt } : null };
    });

export async function uebersicht(jetzt = new Date()): Promise<ProjekteSnapshot> {
  const s = speicher();
  const [projekte, eintraege, vorschlaege] = await Promise.all([s.projekte(), s.eintraege(), s.vorschlaege("offen")]);
  const heute = isoDate(jetzt);
  const rang = { aktiv: 0, pausiert: 1, abgeschlossen: 2 };
  return {
    projekte: projekte.map((p) => karteVon(p, eintraege, heute)).sort((a, b) => rang[a.status] - rang[b.status] || b.ueberfaellig + b.risikenUeberfaellig - (a.ueberfaellig + a.risikenUeberfaellig) || a.name.localeCompare(b.name, "de")),
    vorschlaege: mitBisher(vorschlaege, eintraege),
    ablage: s.ort,
    ...(s.art === "datenbank" ? { ablageArt: "datenbank" as const } : {}),
  };
}

// Offene Aufgaben aus laufenden Projekten, die heute oder früher fällig sind: die Grundlage für die Hinweise am
// Tag (src/lib/hinweise.ts). Nur bestätigte, nicht zurückgezogene Einträge; die ältesten Fristen zuerst.
export async function faelligeAufgaben(jetzt = new Date()): Promise<FaelligeAufgabe[]> {
  const s = speicher();
  const [projekte, eintraege] = await Promise.all([s.projekte(), s.eintraege()]);
  const heute = isoDate(jetzt);
  const aktiv = new Map(projekte.filter((p) => p.status === "aktiv").map((p) => [p.id, p]));
  return eintraege
    .filter((e) => !e.zurueckgezogen && e.art === "aufgabe" && !e.erledigt && e.faellig !== null && e.faellig <= heute && aktiv.has(e.projektId))
    .map((e) => ({ id: e.id, projekt: aktiv.get(e.projektId)!.name, vertraulich: aktiv.get(e.projektId)!.vertraulich, text: e.text, zustaendig: e.zustaendig, faellig: e.faellig! }))
    .sort((a, b) => a.faellig.localeCompare(b.faellig) || a.projekt.localeCompare(b.projekt, "de") || a.id.localeCompare(b.id));
}

export async function akte(gesucht: string, jetzt = new Date()): Promise<ProjektAkte> {
  const s = speicher();
  const projekte = await s.projekte();
  const projekt = findeProjekt(projekte, gesucht);
  if (!projekt) {
    // Diese Meldung geht auch an das Modell (projekt_lesen). Vertrauliche Projekte nennt sie deshalb nie beim Namen.
    const offene = projekte.filter((p) => !p.vertraulich).map((p) => p.name);
    if (!projekte.length) throw new ProjektFehler("Es ist noch kein Projekt angelegt.");
    throw new ProjektFehler(`Ein Projekt „${sauber(gesucht, 60)}“ finde ich nicht eindeutig.${offene.length ? ` Es gibt: ${offene.join(", ")}.` : ""}`);
  }
  const alle = await s.eintraege(projekt.id);
  const neuZuerst = (a: Eintrag, b: Eintrag) => (b.datum ?? b.erstelltAm).localeCompare(a.datum ?? a.erstelltAm);
  return {
    projekt: karteVon(projekt, alle, isoDate(jetzt)),
    eintraege: alle.filter((e) => !e.zurueckgezogen).sort(neuZuerst),
    zurueckgezogen: alle.filter((e) => e.zurueckgezogen).sort(neuZuerst),
    vorschlaege: mitBisher(
      (await s.vorschlaege("offen")).filter((v) => v.projektId === projekt.id || (!v.projektId && gleich(v.projektName, projekt.name))),
      alle,
    ),
  };
}

// Die Vorbereitung auf einen Termin: Kommt im Titel ein Projekt vor (Name oder Stichwort, als ganzes Wort),
// gibt es je Projekt einen kurzen Text aus bestätigten Einträgen. Der Titel wird nur im Code verglichen, nie
// als Anweisung gelesen. Vertrauliche Projekte bleiben außen vor: Der Text geht aufs Handy oder ins Gespräch.
export type Vorbereitung = { projekt: string; text: string; fremd: boolean };

export async function terminVorbereitung(titel: string, jetzt = new Date()): Promise<Vorbereitung[]> {
  const s = speicher();
  const treffer = projekteImText(
    (await s.projekte()).filter((p) => p.status !== "abgeschlossen" && !p.vertraulich),
    titel,
  ).slice(0, 2);
  const heute = isoDate(jetzt);
  const fertig: Vorbereitung[] = [];
  for (const projekt of treffer) {
    const eintraege = (await s.eintraege(projekt.id)).filter((e) => !e.zurueckgezogen);
    fertig.push({ projekt: projekt.name, text: vorbereitung({ projekt: karteVon(projekt, eintraege, heute), eintraege }, heute), fremd: projekt.quelle.fremd || eintraege.some((e) => e.quelle.fremd) });
  }
  return fertig;
}

// ---------- Ein Mensch trägt selbst ein ----------

type ProjektEingabe = { name?: unknown; beschreibung?: unknown; status?: unknown; verantwortliche?: unknown; fortschritt?: unknown; stichworte?: unknown; vertraulich?: unknown };

async function neuesProjekt(eingabe: ProjektEingabe, quelle: Quelle, jetzt: Date): Promise<Projekt> {
  const s = speicher();
  const name = sauber(eingabe.name, GRENZEN.name);
  if (!name) throw new ProjektFehler("Das Projekt braucht einen Namen.");
  const vorhandene = await s.projekte();
  if (vorhandene.some((p) => gleich(p.name, name))) throw new ProjektFehler(`Das Projekt „${name}“ gibt es schon.`);
  if (vorhandene.length >= GRENZEN.projekte) throw new ProjektFehler("Es sind schon sehr viele Projekte angelegt. Schließ bitte erst alte ab.");
  const projekt: Projekt = {
    id: id("p"),
    name,
    beschreibung: sauber(eingabe.beschreibung, GRENZEN.beschreibung),
    status: STATUS.includes(eingabe.status as ProjektStatus) ? (eingabe.status as ProjektStatus) : "aktiv",
    verantwortliche: namensliste(eingabe.verantwortliche, GRENZEN.personen, GRENZEN.person),
    fortschritt: fortschrittOderNull(eingabe.fortschritt),
    stichworte: namensliste(eingabe.stichworte, GRENZEN.stichworte, GRENZEN.person),
    vertraulich: eingabe.vertraulich === true,
    quelle,
    erstelltAm: jetzt.toISOString(),
    geaendertAm: jetzt.toISOString(),
  };
  await s.speichereProjekt(projekt);
  return projekt;
}

export async function legeProjektAn(eingabe: ProjektEingabe, von: Wer, jetzt = new Date()): Promise<Projekt> {
  const wer = mensch(von);
  const projekt = await speicher().transaktion(() => neuesProjekt(eingabe, selbst(wer), jetzt));
  await protokolliere({ art: "projekt", agent: "mensch", kanal: wer, was: "Projekt angelegt", ergebnis: "gespeichert", daten: { projekt: projekt.id } });
  return projekt;
}

export async function aendereProjekt(projektId: string, eingabe: ProjektEingabe, von: Wer, jetzt = new Date()): Promise<Projekt> {
  const wer = mensch(von);
  const s = speicher();
  const projekt = await s.transaktion(async () => {
    const alle = await s.projekte();
    const alt = alle.find((p) => p.id === projektId);
    if (!alt) throw new ProjektFehler("Dieses Projekt gibt es nicht.");
    const name = eingabe.name === undefined ? alt.name : sauber(eingabe.name, GRENZEN.name);
    if (!name) throw new ProjektFehler("Das Projekt braucht einen Namen.");
    if (alle.some((p) => p.id !== projektId && gleich(p.name, name))) throw new ProjektFehler(`Das Projekt „${name}“ gibt es schon.`);
    const neu: Projekt = {
      ...alt,
      name,
      beschreibung: eingabe.beschreibung === undefined ? alt.beschreibung : sauber(eingabe.beschreibung, GRENZEN.beschreibung),
      status: STATUS.includes(eingabe.status as ProjektStatus) ? (eingabe.status as ProjektStatus) : alt.status,
      verantwortliche: eingabe.verantwortliche === undefined ? alt.verantwortliche : namensliste(eingabe.verantwortliche, GRENZEN.personen, GRENZEN.person),
      fortschritt: eingabe.fortschritt === undefined ? alt.fortschritt : fortschrittOderNull(eingabe.fortschritt),
      stichworte: eingabe.stichworte === undefined ? alt.stichworte : namensliste(eingabe.stichworte, GRENZEN.stichworte, GRENZEN.person),
      vertraulich: typeof eingabe.vertraulich === "boolean" ? eingabe.vertraulich : alt.vertraulich,
      geaendertAm: jetzt.toISOString(),
    };
    await s.speichereProjekt(neu);
    return neu;
  });
  await protokolliere({ art: "projekt", agent: "mensch", kanal: wer, was: "Projekt geändert", ergebnis: "gespeichert", daten: { projekt: projekt.id } });
  return projekt;
}

async function neuerEintrag(projektId: string, roh: Partial<Record<keyof EintragFelder, unknown>>, quelle: Quelle, jetzt: Date): Promise<Eintrag> {
  const s = speicher();
  if (!(await s.projekte()).some((p) => p.id === projektId)) throw new ProjektFehler("Dieses Projekt gibt es nicht.");
  if ((await s.eintraege(projektId)).length >= GRENZEN.eintraegeJeProjekt) throw new ProjektFehler("Dieses Projekt hat schon sehr viele Einträge.");
  const eintrag: Eintrag = {
    ...felder(roh),
    id: id("e"),
    projektId,
    quelle,
    erstelltAm: jetzt.toISOString(),
    bestaetigtAm: jetzt.toISOString(),
    geaendertAm: null,
    verlauf: [],
    zurueckgezogen: null,
  };
  await s.speichereEintrag(eintrag);
  return eintrag;
}

export async function trageEin(projektId: string, roh: Partial<Record<keyof EintragFelder, unknown>>, von: Wer, jetzt = new Date()): Promise<Eintrag> {
  const wer = mensch(von);
  const eintrag = await speicher().transaktion(() => neuerEintrag(projektId, roh, selbst(wer), jetzt));
  await protokolliere({ art: "projekt", agent: "mensch", kanal: wer, was: "Eintrag angelegt", ergebnis: "gespeichert", daten: { projekt: projektId, eintrag: eintrag.id, art: eintrag.art } });
  return eintrag;
}

// Ändert einen Eintrag. Was vorher dastand, bleibt im Verlauf.
async function aendereEintrag(eintragId: string, roh: Partial<Record<keyof EintragFelder, unknown>>, grund: string, wer: "mac", jetzt: Date): Promise<Eintrag> {
  const s = speicher();
  const alt = (await s.eintraege()).find((e) => e.id === eintragId);
  if (!alt) throw new ProjektFehler("Diesen Eintrag gibt es nicht.");
  if (alt.zurueckgezogen) throw new ProjektFehler("Dieser Eintrag ist zurückgezogen und lässt sich nicht mehr ändern.");
  const neu = felder(roh, alt);
  const vorher: Partial<EintragFelder> = {};
  for (const k of FELDER) if (neu[k] !== alt[k]) Object.assign(vorher, { [k]: alt[k] });
  if (!Object.keys(vorher).length) return alt;
  const eintrag: Eintrag = { ...alt, ...neu, geaendertAm: jetzt.toISOString(), verlauf: [...alt.verlauf, { am: jetzt.toISOString(), von: wer, grund: sauber(grund, GRENZEN.grund), vorher }].slice(-50) };
  await s.speichereEintrag(eintrag);
  return eintrag;
}

export async function korrigiere(eintragId: string, roh: Partial<Record<keyof EintragFelder, unknown>>, grund: string, von: Wer, jetzt = new Date()): Promise<Eintrag> {
  const wer = mensch(von);
  const eintrag = await speicher().transaktion(() => aendereEintrag(eintragId, roh, grund, wer, jetzt));
  await protokolliere({ art: "projekt", agent: "mensch", kanal: wer, was: "Eintrag korrigiert", ergebnis: "gespeichert", daten: { projekt: eintrag.projektId, eintrag: eintrag.id } });
  return eintrag;
}

// Zieht einen Eintrag zurück (falsch, überholt). Er verschwindet aus der Akte und aus dem, was JARVIS liest,
// bleibt aber als zurückgezogen nachvollziehbar.
export async function zieheZurueck(eintragId: string, grund: string, von: Wer, jetzt = new Date()): Promise<Eintrag> {
  const wer = mensch(von);
  const s = speicher();
  const eintrag = await s.transaktion(async () => {
    const alt = (await s.eintraege()).find((e) => e.id === eintragId);
    if (!alt) throw new ProjektFehler("Diesen Eintrag gibt es nicht.");
    if (alt.zurueckgezogen) return alt;
    const neu: Eintrag = { ...alt, zurueckgezogen: { am: jetzt.toISOString(), grund: sauber(grund, GRENZEN.grund) } };
    await s.speichereEintrag(neu);
    return neu;
  });
  await protokolliere({ art: "projekt", agent: "mensch", kanal: wer, was: "Eintrag zurückgezogen", ergebnis: "gespeichert", daten: { projekt: eintrag.projektId, eintrag: eintrag.id } });
  return eintrag;
}

// ---------- JARVIS schlägt vor ----------

export type VorschlagEingabe = {
  projekt: unknown;
  beschreibung?: unknown;
  eintraege?: unknown;
  quelle_art?: unknown;
  quelle_hinweis?: unknown;
};

export type VorschlagErgebnis = { angelegt: Vorschlag[]; uebersprungen: string[] };

// Legt Vorschläge in den Eingang. lage kommt vom Server (Kanal und ob Text von Dritten im Gespräch war), nie
// vom Modell. Doppeltes und Ungültiges wird übersprungen; der Eingang hat eine Obergrenze, damit ihn niemand
// über eingeschleuste Texte fluten kann.
export async function schlageVor(eingabe: VorschlagEingabe, lage: { kanal: "mac" | "telegram"; fremd: boolean }, jetzt = new Date()): Promise<VorschlagErgebnis> {
  const s = speicher();
  const name = sauber(eingabe.projekt, GRENZEN.name);
  if (!name) throw new ProjektFehler("Zu welchem Projekt gehört das?");
  const art = QUELLEN.includes(eingabe.quelle_art as QuellenArt) && eingabe.quelle_art !== "eingabe" ? (eingabe.quelle_art as QuellenArt) : "gespraech";
  // Aus einer Mail, einem Termin oder dem Web heißt immer: Text von Dritten, auch wenn das Gespräch sonst sauber ist.
  const quelle: Quelle = { art, hinweis: sauber(eingabe.quelle_hinweis, GRENZEN.hinweis), kanal: lage.kanal, fremd: lage.fremd || art === "mail" || art === "termin" || art === "web", von: "jarvis" };
  const rohe = Array.isArray(eingabe.eintraege) ? (eingabe.eintraege as Record<string, unknown>[]).slice(0, 20) : [];

  const ergebnis = await s.transaktion(async (): Promise<VorschlagErgebnis> => {
    const projekte = await s.projekte();
    const projekt = findeProjekt(projekte, name);
    const offen = await s.vorschlaege("offen");
    const angelegt: Vorschlag[] = [];
    const uebersprungen: string[] = [];
    let frei = GRENZEN.offeneVorschlaege - offen.length;
    const lege = async (v: Omit<Vorschlag, "id" | "quelle" | "erstelltAm" | "zustand" | "entschiedenAm">) => {
      if (frei <= 0) return void uebersprungen.push("Der Eingang für Vorschläge ist voll. Erst vorhandene Vorschläge bestätigen oder ablehnen.");
      frei -= 1;
      const vorschlag: Vorschlag = { ...v, id: id("v"), quelle, erstelltAm: jetzt.toISOString(), zustand: "offen", entschiedenAm: null };
      await s.speichereVorschlag(vorschlag);
      angelegt.push(vorschlag);
    };

    const projektName = projekt?.name ?? name;
    const schonVorgeschlagen = offen.some((v) => v.art === "projekt" && gleich(v.projektName, projektName));
    if (!projekt && !schonVorgeschlagen) {
      await lege({ art: "projekt", projektId: null, projektName, eintragId: null, inhalt: { beschreibung: sauber(eingabe.beschreibung, GRENZEN.beschreibung) } });
    }
    const vorhandene = projekt ? (await s.eintraege(projekt.id)).filter((e) => !e.zurueckgezogen) : [];
    const leerZuNichts = (w: unknown) => (w === "" || w === null ? undefined : w);
    for (const roh of rohe) {
      const ersetzt = sauber(roh.ersetzt, 40);
      const ziel = ersetzt ? vorhandene.find((e) => e.id === ersetzt) : undefined;
      if (ersetzt && !ziel) {
        uebersprungen.push(`Den Eintrag ${ersetzt} gibt es in diesem Projekt nicht.`);
        continue;
      }
      let f: EintragFelder;
      try {
        // Eine Korrektur baut auf dem bestehenden Eintrag auf: Was JARVIS nicht nennt, bleibt, wie es ist.
        f = felder(
          { art: ziel ? undefined : roh.art, text: ziel ? leerZuNichts(roh.text) : roh.text, zustaendig: ziel ? leerZuNichts(roh.zustaendig) : roh.zustaendig, faellig: leerZuNichts(roh.faellig), datum: leerZuNichts(roh.datum), erledigt: roh.erledigt === true ? true : undefined },
          ziel,
        );
      } catch (e) {
        uebersprungen.push(e instanceof Error ? e.message : String(e));
        continue;
      }
      const inhalt: VorschlagInhalt = { art: f.art, text: f.text, zustaendig: f.zustaendig, faellig: f.faellig, datum: f.datum, erledigt: f.erledigt };
      if (ziel) {
        if (FELDER.every((k) => ziel[k] === f[k])) {
          uebersprungen.push(`Das steht schon so da: ${f.text.slice(0, 60)}`);
          continue;
        }
        if ([...offen, ...angelegt].some((v) => v.eintragId === ziel.id && FELDER.every((k) => v.inhalt[k] === f[k]))) {
          uebersprungen.push(`Schon vorgeschlagen: ${f.text.slice(0, 60)}`);
          continue;
        }
        await lege({ art: "korrektur", projektId: ziel.projektId, projektName, eintragId: ziel.id, inhalt, geaendert: FELDER.filter((k) => ziel[k] !== f[k]) });
        continue;
      }
      const doppelt = vorhandene.some((e) => e.art === f.art && gleich(e.text, f.text)) || [...offen, ...angelegt].some((v) => v.art === "eintrag" && gleich(v.projektName, projektName) && v.inhalt.art === f.art && gleich(v.inhalt.text ?? "", f.text));
      if (doppelt) {
        uebersprungen.push(`Schon vorhanden: ${f.text.slice(0, 60)}`);
        continue;
      }
      await lege({ art: "eintrag", projektId: projekt?.id ?? null, projektName, eintragId: null, inhalt });
    }
    return { angelegt, uebersprungen };
  });
  if (ergebnis.angelegt.length) {
    await protokolliere({ art: "projekt", agent: "gehirn", kanal: lage.kanal, was: "Vorschläge für das Projektgedächtnis", ergebnis: "wartet auf Bestätigung", daten: { anzahl: ergebnis.angelegt.length, fremd: lage.fremd, vorschlaege: ergebnis.angelegt.map((v) => v.id) } });
  }
  return ergebnis;
}

// ---------- Ein Mensch entscheidet über einen Vorschlag ----------

export type Entscheidung = { vorschlag: Vorschlag; projekt?: Projekt; eintrag?: Eintrag };

// Übernimmt oder verwirft einen Vorschlag, genau einmal. Beim Übernehmen darf der Mensch den Inhalt vorher
// ändern (aenderung). Gehört ein Eintrag zu einem Projekt, das es noch nicht gibt, wird es mit angelegt.
export async function entscheide(vorschlagId: string, ja: boolean, von: Wer, aenderung: Record<string, unknown> = {}, jetzt = new Date()): Promise<Entscheidung> {
  const wer = mensch(von);
  const s = speicher();
  const ergebnis = await s.transaktion(async (): Promise<Entscheidung> => {
    const v = (await s.vorschlaege()).find((x) => x.id === vorschlagId);
    if (!v) throw new ProjektFehler("Diesen Vorschlag gibt es nicht mehr.");
    if (v.zustand !== "offen") throw new ProjektFehler(v.zustand === "uebernommen" ? "Dieser Vorschlag ist schon übernommen." : "Dieser Vorschlag ist schon abgelehnt.");
    const fertig: Vorschlag = { ...v, zustand: ja ? "uebernommen" : "abgelehnt", entschiedenAm: jetzt.toISOString() };
    if (!ja) {
      await s.speichereVorschlag(fertig);
      return { vorschlag: fertig };
    }
    const quelle: Quelle = { ...v.quelle };
    // Was der Mensch geändert hat, geht vor. Geprüft und gekürzt wird alles beim Speichern (felder, sauber).
    const inhalt: Record<string, unknown> = { ...v.inhalt, ...Object.fromEntries(Object.entries(aenderung).filter(([k, w]) => k !== "projektName" && w !== undefined)) };
    const projektName = sauber(aenderung.projektName ?? v.projektName, GRENZEN.name);

    if (v.art === "korrektur") {
      // Übernommen wird nur, was JARVIS ändern wollte, und was der Mensch beim Übernehmen selbst eingetragen hat.
      // Alles andere bleibt, wie der Eintrag jetzt ist, auch wenn er seit dem Vorschlag von Hand geändert wurde.
      const nur = v.geaendert ? new Set<string>([...v.geaendert, ...Object.keys(aenderung).filter((k) => aenderung[k] !== undefined && aenderung[k] !== v.inhalt[k as keyof VorschlagInhalt])]) : null;
      const felderDazu = nur ? Object.fromEntries(Object.entries(inhalt).filter(([k]) => nur.has(k))) : inhalt;
      const eintrag = await aendereEintrag(v.eintragId!, felderDazu, `Vorschlag von JARVIS (${quelle.hinweis || quelle.art})`, wer, jetzt);
      await s.speichereVorschlag(fertig);
      return { vorschlag: fertig, eintrag };
    }

    let projekt = v.projektId ? ((await s.projekte()).find((p) => p.id === v.projektId) ?? null) : findeProjekt(await s.projekte(), projektName);
    if (v.art === "projekt") {
      if (projekt) throw new ProjektFehler(`Das Projekt „${projekt.name}“ gibt es inzwischen schon.`);
      projekt = await neuesProjekt({ name: projektName, beschreibung: inhalt.beschreibung, verantwortliche: inhalt.verantwortliche }, quelle, jetzt);
      await s.speichereVorschlag({ ...fertig, projektId: projekt.id });
      // Einträge, die auf dieses Projekt gewartet haben, hängen jetzt fest an ihm, auch wenn der Mensch es beim
      // Übernehmen umbenannt hat. Sonst entstünde mit dem ersten Eintrag ein zweites Projekt unter dem alten Namen.
      for (const x of await s.vorschlaege("offen")) {
        if (x.id !== v.id && x.art !== "projekt" && !x.projektId && gleich(x.projektName, v.projektName)) await s.speichereVorschlag({ ...x, projektId: projekt.id, projektName: projekt.name });
      }
      return { vorschlag: { ...fertig, projektId: projekt.id }, projekt };
    }
    // Ein Eintrag für ein Projekt, das noch nicht bestätigt ist: Mit dem Eintrag bestätigt der Mensch auch das Projekt.
    let neu: Projekt | undefined;
    if (!projekt) {
      const dazu = (await s.vorschlaege("offen")).find((x) => x.art === "projekt" && gleich(x.projektName, v.projektName));
      neu = projekt = await neuesProjekt({ name: projektName, beschreibung: dazu?.inhalt.beschreibung }, dazu?.quelle ?? quelle, jetzt);
      if (dazu) await s.speichereVorschlag({ ...dazu, zustand: "uebernommen", entschiedenAm: jetzt.toISOString(), projektId: projekt.id });
    }
    const eintrag = await neuerEintrag(projekt.id, inhalt, quelle, jetzt);
    await s.speichereVorschlag({ ...fertig, projektId: projekt.id });
    return { vorschlag: { ...fertig, projektId: projekt.id }, eintrag, projekt: neu };
  });
  await protokolliere({
    art: "projekt",
    agent: "mensch",
    kanal: wer,
    was: ja ? "Vorschlag übernommen" : "Vorschlag abgelehnt",
    ergebnis: ja ? "gespeichert" : "verworfen",
    daten: { vorschlag: vorschlagId, art: ergebnis.vorschlag.art, projekt: ergebnis.vorschlag.projektId, eintrag: ergebnis.eintrag?.id, fremd: ergebnis.vorschlag.quelle.fremd },
  });
  return ergebnis;
}
