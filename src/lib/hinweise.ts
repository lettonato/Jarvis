import { isoDate } from "./dates";
import { fristText } from "./projekte";

// Hinweise am Tag: JARVIS meldet sich zwischendurch von selbst, wenn in einem Projekt etwas überfällig geworden
// ist, wenn jemand anderes mit einer Aufgabe im Verzug ist (es fehlt eine Rückmeldung) oder wenn am Nachmittag
// noch etwas von heute offen ist. Alles entsteht ohne KI aus bestätigten Einträgen und den eigenen Aufgaben.
//
// Die Regel gegen zu viele Meldungen steht hier an einer Stelle: nur tagsüber, höchstens drei Hinweise am Tag,
// mindestens eine Stunde Abstand, jedes Ding nur einmal, und alles, was gleichzeitig ansteht, kommt in einer
// einzigen Nachricht. Was Morgenbriefing oder Tagesabschluss schon gesagt haben, gilt als gemeldet.
// Für Projektinhalte gelten dieselben zwei Regeln wie in src/lib/routinen.ts: Vertrauliches nie beim Namen,
// und über Telegram stehen Namen und Inhalte nur, wenn du es eingeschaltet hast.

const MINUTE = 60_000;
export const HINWEIS_REGELN = { vonStunde: 9, bisStunde: 18, nachmittagStunde: 15, hoechstensJeTag: 3, abstandMs: 60 * MINUTE, zeilen: 5, merkenTage: 60 };
export const HINWEIS_TAKT = `zwischen ${HINWEIS_REGELN.vonStunde} und ${HINWEIS_REGELN.bisStunde} Uhr, höchstens ${HINWEIS_REGELN.hoechstensJeTag} am Tag, per Telegram`;

// Eine offene Projektaufgabe, die heute oder früher fällig ist.
export type FaelligeAufgabe = { id: string; projekt: string; vertraulich: boolean; text: string; zustaendig: string; faellig: string };

// ueberfaellig: deine eigene Aufgabe ist über der Frist. rueckmeldung: Jemand anderes ist zuständig und über der
// Frist. heute: heute fällig und noch offen (projekt null: eine Aufgabe aus deinem Tresor).
export type Anlass = { schluessel: string; art: "ueberfaellig" | "rueckmeldung" | "heute"; projekt: string | null; vertraulich: boolean; text: string; zustaendig: string; faellig: string };

// gesendet: wann heute schon ein Hinweis hinausging. gemeldet: welcher Anlass an welchem Tag gemeldet wurde.
export type HinweisStand = { gesendet: string[]; gemeldet: Record<string, string> };

const ICH = new Set(["ich", "mir", "mich", "selbst"]);
const klein = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// Ist für die Aufgabe jemand anderes zuständig als du? Leer heißt: du selbst. Vom Namen zählt der Vorname.
export function istAnderer(zustaendig: string, name: string): boolean {
  const z = klein(zustaendig);
  if (!z || ICH.has(z)) return false;
  const n = klein(name);
  return z !== n && z.split(" ")[0] !== n.split(" ")[0];
}

// Was gerade ein Anlass wäre, ohne Rücksicht darauf, ob es schon gemeldet ist. Alles, was heute fällig ist,
// teilt sich einen Schlüssel: Der Hinweis am Nachmittag kommt einmal am Tag, nicht je Aufgabe.
export function anlaesse(aufgaben: FaelligeAufgabe[], eigeneHeute: { text: string }[], heute: string, name: string): Anlass[] {
  const aus = (a: FaelligeAufgabe, art: Anlass["art"], schluessel: string): Anlass => ({ schluessel, art, projekt: a.projekt, vertraulich: a.vertraulich, text: a.text, zustaendig: a.zustaendig, faellig: a.faellig });
  const alt = aufgaben.filter((a) => a.faellig < heute);
  return [
    ...alt.filter((a) => !istAnderer(a.zustaendig, name)).map((a) => aus(a, "ueberfaellig", `u:${a.id}:${a.faellig}`)),
    ...alt.filter((a) => istAnderer(a.zustaendig, name)).map((a) => aus(a, "rueckmeldung", `u:${a.id}:${a.faellig}`)),
    ...aufgaben.filter((a) => a.faellig === heute).map((a) => aus(a, "heute", `heute:${heute}`)),
    ...eigeneHeute.map((t): Anlass => ({ schluessel: `heute:${heute}`, art: "heute", projekt: null, vertraulich: false, text: t.text, zustaendig: "", faellig: heute })),
  ];
}

const amTag = (stand: HinweisStand, tag: string) => stand.gesendet.filter((t) => isoDate(new Date(t)) === tag);

// Darf jetzt überhaupt ein Hinweis hinaus? Tageszeit, Obergrenze je Tag und Abstand zum letzten.
export function darfJetzt(stand: HinweisStand, now: Date): boolean {
  const stunde = now.getHours();
  if (stunde < HINWEIS_REGELN.vonStunde || stunde >= HINWEIS_REGELN.bisStunde) return false;
  const heute = amTag(stand, isoDate(now));
  if (heute.length >= HINWEIS_REGELN.hoechstensJeTag) return false;
  return heute.every((t) => now.getTime() - Date.parse(t) >= HINWEIS_REGELN.abstandMs);
}

// Was jetzt in einen Hinweis gehört: noch nicht gemeldet, und was heute fällig ist, erst am Nachmittag.
export function neueHinweise(alle: Anlass[], stand: HinweisStand, now: Date): Anlass[] {
  if (!darfJetzt(stand, now)) return [];
  const nachmittag = now.getHours() >= HINWEIS_REGELN.nachmittagStunde;
  return alle.filter((a) => !stand.gemeldet[a.schluessel] && (a.art !== "heute" || nachmittag));
}

// Merkt Anlässe als gemeldet. alsNachricht: Es ging dafür ein Hinweis hinaus, der zur Obergrenze zählt (sonst
// hat es das Briefing oder der Tagesabschluss gesagt). Alte Merker fallen nach 60 Tagen weg; ist etwas dann
// immer noch überfällig, erinnert JARVIS noch einmal.
export function merke(stand: HinweisStand, anlaesse: Anlass[], now: Date, alsNachricht: boolean): HinweisStand {
  const heute = isoDate(now);
  const grenze = isoDate(new Date(now.getTime() - HINWEIS_REGELN.merkenTage * 24 * 60 * MINUTE));
  const gemeldet = Object.fromEntries(Object.entries(stand.gemeldet).filter(([, tag]) => tag >= grenze));
  for (const a of anlaesse) gemeldet[a.schluessel] ??= heute;
  return { gesendet: [...amTag(stand, heute), ...(alsNachricht ? [now.toISOString()] : [])], gemeldet };
}

const zahl = (n: number, eins: string, viele: string) => (n === 1 ? eins : `${n} ${viele}`);
const gross = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function liste(anlaesse: Anlass[], zeile: (a: Anlass) => string): string[] {
  const offen = anlaesse.filter((a) => !a.vertraulich);
  const geheim = anlaesse.length - offen.length;
  const zeilen = offen.slice(0, HINWEIS_REGELN.zeilen).map(zeile);
  if (offen.length > HINWEIS_REGELN.zeilen) zeilen.push(`• und ${zahl(offen.length - HINWEIS_REGELN.zeilen, "ein weiterer", "weitere")}`);
  if (geheim > 0) zeilen.push(`• ${zahl(geheim, "ein Eintrag aus einem vertraulichen Projekt", "Einträge aus vertraulichen Projekten")}: Einzelheiten nur am Mac`);
  return zeilen;
}

// Der Hinweis als Nachricht aufs Handy. namen: Projektnamen und -inhalte dürfen über Telegram gehen.
export function hinweisNachricht(anlaesse: Anlass[], heute: string, namen: boolean): string {
  const von = (art: Anlass["art"]) => anlaesse.filter((a) => a.art === art && a.projekt !== null);
  const [ueber, rueck, offen] = [von("ueberfaellig"), von("rueckmeldung"), von("heute")];
  const eigene = anlaesse.filter((a) => a.projekt === null);
  const teile: string[] = ["Kurzer Hinweis:"];
  const eigeneZeilen = eigene.slice(0, HINWEIS_REGELN.zeilen).map((a) => `• ${a.text}`);
  if (eigene.length > HINWEIS_REGELN.zeilen) eigeneZeilen.push(`• und ${zahl(eigene.length - HINWEIS_REGELN.zeilen, "eine weitere", "weitere")}`);

  if (namen) {
    if (ueber.length) teile.push(["Überfällig:", ...liste(ueber, (a) => `• ${a.projekt}: ${a.text}, ${fristText(a.faellig, heute)}`)].join("\n"));
    if (rueck.length) teile.push(["Hier fehlt eine Rückmeldung:", ...liste(rueck, (a) => `• ${a.projekt}: ${a.text} (zuständig: ${a.zustaendig}), ${fristText(a.faellig, heute)}`)].join("\n"));
    if (offen.length || eigene.length) teile.push(["Heute noch offen:", ...liste(offen, (a) => `• ${a.projekt}: ${a.text}`), ...eigeneZeilen].join("\n"));
    return teile.join("\n\n");
  }

  const stuecke = [
    ueber.length ? `${zahl(ueber.length, "eine Aufgabe ist", "Aufgaben sind")} überfällig` : "",
    rueck.length ? `bei ${rueck.length === 1 ? "einer" : rueck.length} fehlt eine Rückmeldung` : "",
    offen.length ? `${zahl(offen.length, "eine von heute ist", "von heute sind")} noch offen` : "",
  ].filter(Boolean);
  if (stuecke.length) teile.push(`Projekte: ${gross(stuecke.join(", "))}. Einzelheiten am Mac unter „Heute“.`);
  if (eigene.length) teile.push(["Heute noch offen:", ...eigeneZeilen].join("\n"));
  return teile.join("\n\n");
}
