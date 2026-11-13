import fs from "node:fs/promises";
import path from "node:path";
import { isoDate } from "../dates";
import type { Dienst, KostenPosten, KostenUebersicht, TagesKosten } from "../kosten";
import { kostenVon, MODELLE, verbrauchVon, zahl, type ModellRolle, type Verbrauch } from "../modelle";
import { AGENTEN, type AgentName } from "../sicherheit";
import { CONFIG_DIR } from "./config";

// Das Kostenbuch: je Tag und Agent, was die bezahlten Dienste (Claude, Grok) nach Listenpreis gekostet haben.
// Es liegt in ~/.jarvis/kosten.json und enthält nur Zahlen: Beträge, Anfragen, Token, Websuchen. Kein Satz aus
// einem Gespräch und kein Schlüssel steht darin. Das Buch zählt nur mit; Budgets und Obergrenzen setzen die
// Agenten weiter selbst durch (Intel, Desk, Analyst). Ein Fehler beim Buchen hält deshalb nie einen Agenten auf.

const DATEI = path.join(CONFIG_DIR, "kosten.json");
// Gut ein Jahr reicht für Monats- und Jahresvergleiche; ältere Tage fallen heraus.
const TAGE_BEHALTEN = 400;
const DIENSTE: Dienst[] = ["claude", "grok"];

type Buch = { tage: Record<string, TagesKosten> };
// offen: Ein Schreiben ist schon vorgemerkt; weitere Buchungen bis dahin kommen mit demselben Schreiben in die Datei.
type Shared = { buch: Buch | null; laden: Promise<Buch> | null; speichern: Promise<void>; offen: boolean };
const holder = globalThis as typeof globalThis & { __jarvisKosten?: Shared };
const shared: Shared = (holder.__jarvisKosten ??= { buch: null, laden: null, speichern: Promise.resolve(), offen: false });

const istTag = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

// Liest nur, was ins Buch gehört: bekannte Agenten, bekannte Dienste, Zahlen. Alles andere bleibt draußen.
function saeubere(roh: unknown): Buch {
  const tage: Record<string, TagesKosten> = {};
  // Hat der Inhalt nicht die Form eines Kostenbuchs, gilt er als kaputt.
  if (!roh || typeof roh !== "object" || !("tage" in roh) || !roh.tage || typeof roh.tage !== "object" || Array.isArray(roh.tage)) throw new Error("kein Kostenbuch");
  const quelle = roh.tage as Record<string, unknown>;
  for (const [tag, wert] of Object.entries(quelle)) {
    if (!istTag(tag) || !wert || typeof wert !== "object") continue;
    const sauber: TagesKosten = {};
    for (const a of AGENTEN) {
      const jeDienst = (wert as Record<string, unknown>)[a.name];
      if (!jeDienst || typeof jeDienst !== "object") continue;
      for (const dienst of DIENSTE) {
        const p = (jeDienst as Record<string, unknown>)[dienst] as Partial<KostenPosten> | undefined;
        if (!p || typeof p !== "object") continue;
        (sauber[a.name] ??= {})[dienst] = { usd: zahl(p.usd), anfragen: zahl(p.anfragen), eingabe: zahl(p.eingabe), ausgabe: zahl(p.ausgabe), suchen: zahl(p.suchen) };
      }
    }
    tage[tag] = sauber;
  }
  return { tage };
}

// Liefert das Buch oder wirft. Drei Fälle: Die Datei fehlt (leeres Buch), ihr Inhalt ist kaputt (sie wird
// beiseitegelegt, das Buch beginnt neu), oder sie lässt sich gerade nicht lesen (dann wird nichts angefasst
// und nichts gemerkt, damit der nächste Versuch neu liest).
async function lade(): Promise<Buch> {
  if (shared.buch) return shared.buch;
  shared.laden ??= (async () => {
    try {
      let text: string | null = null;
      try {
        text = await fs.readFile(DATEI, "utf8");
      } catch (e) {
        if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") throw e;
      }
      let buch: Buch = { tage: {} };
      if (text !== null) {
        try {
          buch = saeubere(JSON.parse(text));
        } catch {
          const beiseite = `${DATEI}.defekt-${Date.now()}`;
          // Scheitert das Beiseitelegen, wirft es hier: Dann wird die kaputte Datei auch nicht überschrieben.
          await fs.rename(DATEI, beiseite);
          console.error(`Kostenbuch hatte einen kaputten Inhalt und liegt jetzt unter ${path.basename(beiseite)}; es wird neu gezählt.`);
        }
      }
      shared.buch = buch;
      return buch;
    } finally {
      shared.laden = null;
    }
  })();
  return shared.laden;
}

// Merkt ein Schreiben vor. Geschrieben wird der Stand im Augenblick des Schreibens: Viele Buchungen kurz
// nacheinander (ein Browser-Auftrag mit vielen Schritten) ergeben so ein Schreiben statt vieler.
function speichere(buch: Buch): void {
  if (shared.offen) return;
  shared.offen = true;
  shared.speichern = shared.speichern
    .then(async () => {
      shared.offen = false;
      const json = JSON.stringify({ tage: buch.tage });
      await fs.mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
      await fs.writeFile(`${DATEI}.tmp`, json, { mode: 0o600 });
      await fs.rename(`${DATEI}.tmp`, DATEI);
    })
    .catch((e) => console.error("Kostenbuch nicht gespeichert:", e instanceof Error ? e.message : e));
}

async function buche(agent: AgentName, dienst: Dienst, plus: KostenPosten, now: Date): Promise<void> {
  try {
    const buch = await lade();
    const heute = isoDate(now);
    // Beginnt ein neuer Tag im Buch, fallen die Tage heraus, die älter als gut ein Jahr sind.
    if (!buch.tage[heute]) {
      const grenze = isoDate(new Date(now.getTime() - TAGE_BEHALTEN * 86_400_000));
      for (const tag of Object.keys(buch.tage)) if (tag < grenze) delete buch.tage[tag];
    }
    const posten = (((buch.tage[heute] ??= {})[agent] ??= {})[dienst] ??= { usd: 0, anfragen: 0, eingabe: 0, ausgabe: 0, suchen: 0 });
    posten.usd += plus.usd;
    posten.anfragen += plus.anfragen;
    posten.eingabe += plus.eingabe;
    posten.ausgabe += plus.ausgabe;
    posten.suchen += plus.suchen;
    speichere(buch);
  } catch (e) {
    console.error("Kosten nicht gebucht:", e instanceof Error ? e.message : e);
  }
}

// Bucht eine Antwort von Claude. Gibt zurück, was sie nach Listenpreis gekostet hat, auch wenn das Buchen
// selbst scheitert. Wirft nie. Bricht eine Antwort mittendrin ab, kann der Aufrufer den Zwischenstand
// übergeben: Dann ist wenigstens die Eingabe gezählt, die Anthropic in jedem Fall berechnet.
export async function bucheClaude(agent: AgentName, rolle: ModellRolle, antwort: { model?: string | null; usage?: Verbrauch | null } | null | undefined, now = new Date()): Promise<number> {
  if (!antwort?.usage) return 0;
  const usd = zahl(kostenVon(MODELLE[rolle].id, antwort.usage, antwort.model));
  await buche(agent, "claude", { usd, anfragen: 1, ...verbrauchVon(antwort.usage) }, now);
  return usd;
}

// Bucht einen Betrag, den ein Dienst selbst ausgerechnet hat (Grok meldet seine Kosten je Anfrage). Wirft nie.
export async function bucheBetrag(agent: AgentName, dienst: Dienst, usd: number, now = new Date()): Promise<void> {
  if (zahl(usd) === 0) return;
  await buche(agent, dienst, { usd, anfragen: 1, eingabe: 0, ausgabe: 0, suchen: 0 }, now);
}

const summe = (tag: TagesKosten | undefined) => {
  let usd = 0;
  for (const jeDienst of Object.values(tag ?? {})) for (const p of Object.values(jeDienst ?? {})) usd += p.usd;
  return usd;
};

// Wirft, wenn sich das Buch gerade nicht lesen lässt. Die Übersicht zeigt dann keine Zahl statt einer falschen.
export async function kostenUebersicht(now = new Date()): Promise<KostenUebersicht> {
  const buch = await lade();
  const heute = isoDate(now);
  const monat = heute.slice(0, 7);
  let monatUsd = 0;
  for (const [tag, kosten] of Object.entries(buch.tage)) if (tag.startsWith(monat)) monatUsd += summe(kosten);
  return { heute: structuredClone(buch.tage[heute] ?? {}), heuteUsd: summe(buch.tage[heute]), monatUsd, seit: Object.keys(buch.tage).sort()[0] ?? null };
}

// Wartet, bis alles Gebuchte in der Datei steht. Für Tests und für das saubere Beenden.
export const kostenGeschrieben = () => shared.speichern;

// Nur für Tests: vergisst den Stand im Speicher, damit die Datei neu gelesen wird.
export function vergissKostenbuch() {
  shared.buch = null;
  shared.laden = null;
}
