import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { antwortBetreff, ENTWURF_GRENZEN, entwurfText, istAdresse, type Entwurf, type EntwuerfeSnapshot } from "../entwuerfe";
import { CONFIG_DIR, type MailConfig } from "./config";
import { explainMailError, MailFehlt, readAbsender } from "./mail";

// Antwortentwürfe auf dem Mac (~/.jarvis/entwuerfe.json). JARVIS legt hier nur Text ab; verschickt wird von
// hier aus nichts, und es gibt in JARVIS auch keinen Weg, eine Mail zu senden. An wen die Antwort geht und wie
// der Betreff lautet, liest der Server selbst aus dem Postfach: Weder das KI-Modell noch der Text der Mail
// können einen anderen Empfänger einsetzen.

const DATEI = path.join(CONFIG_DIR, "entwuerfe.json");

export class EntwurfFehler extends Error {}

type Shared = { liste: Entwurf[] | null; laden: Promise<Entwurf[]> | null; schlange: Promise<unknown> };
const holder = globalThis as typeof globalThis & { __jarvisEntwuerfe?: Shared };
const shared: Shared = (holder.__jarvisEntwuerfe ??= { liste: null, laden: null, schlange: Promise.resolve() });

const istZeit = (s: unknown): s is string => typeof s === "string" && !Number.isNaN(Date.parse(s));

// Liest nur, was ein Entwurf sein kann.
function saeubere(roh: unknown): Entwurf[] {
  const liste = roh && typeof roh === "object" && Array.isArray((roh as { entwuerfe?: unknown }).entwuerfe) ? (roh as { entwuerfe: unknown[] }).entwuerfe : [];
  const gut: Entwurf[] = [];
  for (const x of liste) {
    const e = x as Partial<Entwurf> | null;
    if (!e || typeof e !== "object" || typeof e.id !== "string" || !Number.isInteger(e.uid) || !istAdresse(e.an) || !istZeit(e.erstelltAm)) continue;
    const text = entwurfText(e.text);
    if (!text) continue;
    gut.push({
      id: e.id.slice(0, 40),
      uid: e.uid!,
      an: e.an,
      anName: typeof e.anName === "string" ? e.anName.slice(0, 120) : e.an,
      betreff: antwortBetreff(typeof e.betreff === "string" ? e.betreff : ""),
      text,
      erstelltAm: e.erstelltAm,
      geaendertAm: istZeit(e.geaendertAm) ? e.geaendertAm : null,
      kanal: e.kanal === "telegram" ? "telegram" : "mac",
      bearbeitet: e.bearbeitet === true,
    });
  }
  return gut.slice(-ENTWURF_GRENZEN.entwuerfe);
}

// Fehlt die Datei, gibt es keine Entwürfe. Ist sie nicht lesbar, wird sie beiseitegelegt und nicht
// überschrieben: Was darin stand, lässt sich so noch von Hand retten.
async function lies(): Promise<Entwurf[]> {
  let text: string;
  try {
    text = await fs.readFile(DATEI, "utf8");
  } catch {
    return [];
  }
  try {
    return saeubere(JSON.parse(text));
  } catch {
    await fs.rename(DATEI, `${DATEI}.beschaedigt`).catch(() => {});
    console.error("Die Datei mit den Antwortentwürfen war nicht lesbar und liegt jetzt als entwuerfe.json.beschaedigt daneben.");
    return [];
  }
}

async function lade(): Promise<Entwurf[]> {
  if (shared.liste) return shared.liste;
  shared.laden ??= lies()
    .then((liste) => (shared.liste = liste))
    .finally(() => (shared.laden = null));
  return shared.laden;
}

// Jede Änderung läuft einzeln und rechnet auf dem neuesten Stand. Sie gilt erst, wenn die Datei geschrieben
// ist: Klappt das nicht, bleibt alles, wie es war, und der Aufrufer erfährt es.
function aendere<T>(fn: (liste: Entwurf[]) => { liste: Entwurf[]; wert: T }): Promise<T> {
  const lauf = shared.schlange.then(async () => {
    const { liste, wert } = fn(await lade());
    try {
      await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(`${DATEI}.tmp`, JSON.stringify({ entwuerfe: liste }), { mode: 0o600 });
      await fs.rename(`${DATEI}.tmp`, DATEI);
    } catch (e) {
      console.error("Entwürfe nicht gespeichert:", e instanceof Error ? e.message : e);
      throw new EntwurfFehler("Die Entwürfe ließen sich auf dem Mac nicht speichern. Es hat sich nichts geändert.");
    }
    shared.liste = liste;
    return wert;
  });
  shared.schlange = lauf.catch(() => {});
  return lauf;
}

// Die neuesten zuerst.
export async function entwuerfeSnapshot(): Promise<EntwuerfeSnapshot> {
  return { entwuerfe: [...(await lade())].sort((a, b) => (b.geaendertAm ?? b.erstelltAm).localeCompare(a.geaendertAm ?? a.erstelltAm)) };
}

// Legt einen Entwurf für die Antwort auf eine Mail an. Vom Aufrufer kommen nur die Nummer der Mail und der
// Text; Empfänger und Betreff liest der Server aus dem Postfach. Je Mail gibt es einen Entwurf: Ein neuer
// ersetzt den alten, außer du hast den alten selbst geändert. Der bleibt, bis du ihn verwirfst.
export async function legeEntwurfAn(postfach: MailConfig, eingabe: { uid: unknown; text: unknown }, kanal: "mac" | "telegram", now = new Date()): Promise<Entwurf> {
  const uid = Number(eingabe.uid);
  if (!Number.isInteger(uid) || uid <= 0) throw new EntwurfFehler("Für den Entwurf fehlt die Mail, auf die geantwortet wird.");
  const text = entwurfText(eingabe.text);
  if (!text) throw new EntwurfFehler("Der Entwurf braucht einen Text.");
  const mail = await readAbsender(postfach, uid).catch((e) => {
    throw new EntwurfFehler(e instanceof MailFehlt ? "Die Mail finde ich im Posteingang nicht mehr." : explainMailError(e));
  });
  if (!istAdresse(mail.fromAddress)) throw new EntwurfFehler("Die Absenderadresse dieser Mail ist nicht verwendbar. Dafür lege ich keinen Entwurf an.");
  const an = mail.fromAddress;
  const betreff = antwortBetreff(mail.subject);
  return aendere((liste) => {
    // Dieselbe Mail ist es nur, wenn auch Absender und Betreff stimmen: Nach einem Wechsel des Postfachs
    // kann dieselbe Nummer zu einer ganz anderen Mail gehören.
    const alt = liste.find((e) => e.uid === uid && e.an === an && e.betreff === betreff);
    if (alt?.bearbeitet) throw new EntwurfFehler("Zu dieser Mail liegt schon ein Entwurf, der am Mac von Hand geändert wurde. Er bleibt, wie er ist. Für einen neuen Entwurf muss er zuerst in der Ansicht Post verworfen werden.");
    const entwurf: Entwurf = {
      id: alt?.id ?? `ew${randomUUID().replace(/-/g, "").slice(0, 10)}`,
      uid,
      an,
      anName: (mail.from || an).replace(/[\u0000-\u001f<>]+/g, " ").trim().slice(0, 120),
      betreff,
      text,
      erstelltAm: now.toISOString(),
      geaendertAm: null,
      kanal,
      bearbeitet: false,
    };
    return { liste: [...liste.filter((e) => e !== alt), entwurf].slice(-ENTWURF_GRENZEN.entwuerfe), wert: entwurf };
  });
}

// Du änderst den Text am Mac. Empfänger und Betreff bleiben, wie das Postfach sie genannt hat.
export async function aendereEntwurf(id: unknown, textRoh: unknown, now = new Date()): Promise<Entwurf> {
  const text = entwurfText(textRoh);
  return aendere((liste) => {
    const alt = liste.find((e) => e.id === id);
    if (!alt) throw new EntwurfFehler("Diesen Entwurf gibt es nicht mehr.");
    if (!text) throw new EntwurfFehler("Der Entwurf braucht einen Text.");
    const neu: Entwurf = { ...alt, text, geaendertAm: now.toISOString(), bearbeitet: true };
    return { liste: liste.map((e) => (e === alt ? neu : e)), wert: neu };
  });
}

export async function verwirfEntwurf(id: unknown): Promise<void> {
  return aendere((liste) => {
    if (!liste.some((e) => e.id === id)) throw new EntwurfFehler("Diesen Entwurf gibt es nicht mehr.");
    return { liste: liste.filter((e) => e.id !== id), wert: undefined };
  });
}

// Nur für Tests: vergisst den Stand im Speicher, damit die Datei neu gelesen wird.
export function vergissEntwuerfe() {
  shared.liste = null;
  shared.laden = null;
}
export const entwuerfeGeschrieben = () => shared.schlange;
