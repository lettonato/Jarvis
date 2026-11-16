// Programme und Ordner am Mac auf Zuruf öffnen („Jarvis, öffne Excel“). Die Regeln stehen hier an einer Stelle:
//
// 1. JARVIS öffnet nur, was in dieser Liste steht und in den Einstellungen eingeschaltet ist. Die festen Ziele
//    sind übliche Programme und vier Ordner im Benutzerordner; dazu kommen bis zu zwölf eigene Programme, die du
//    selbst am Mac in den Einstellungen einträgst.
// 2. Er öffnet nur. Er tippt, klickt und liest in den Programmen nichts, und er schließt nichts.
// 3. An den Mac geht nie ein Pfad und nie ein Text aus dem Gespräch: bei festen Programmen der Name oder die
//    Kennung aus dieser Datei, bei eigenen der geprüfte Name aus den Einstellungen (programmName).
// 4. Nur am Mac selbst, nie über Telegram.
//
// Diese Datei kennt weder den Mac noch die Einstellungsdatei; geöffnet wird in src/lib/server/desktop.ts.

export type ZielArt = "programm" | "ordner";

export type FestesZiel = {
  id: string;
  art: ZielArt;
  // So heißt es in JARVIS.
  name: string;
  // So steht es in einem Satz, wenn der Name allein falsch klingt: „Ich öffne den Finder.“
  imSatz?: string;
  // Programme von Apple über ihre Kennung: Sie ist auf jedem Mac und in jeder Sprache dieselbe.
  paket?: string;
  // Andere Programme über ihren Namen im Ordner Programme.
  app?: string;
  // Ordner: der Name im Benutzerordner, wie macOS ihn auf der Platte führt.
  ordner?: string;
  // Wörter, die allein reichen („öffne safari“), klein geschrieben und ohne Satzzeichen. Bei Programmen von Apple
  // auch der englische Name, unter dem der Mac sie führt („notes“).
  woerter: string[];
  // Wörter, die in JARVIS schon etwas anderes heißen und deshalb nur mit „Ordner“ oder „Programm“ davor gelten:
  // „öffne Dokumente“ bleibt der Raum Dokumente, „öffne den Ordner Dokumente“ ist der Ordner.
  nurMitArt?: string[];
};

export const FESTE_ZIELE: FestesZiel[] = [
  { id: "safari", art: "programm", name: "Safari", paket: "com.apple.Safari", woerter: ["safari"] },
  { id: "chrome", art: "programm", name: "Chrome", app: "Google Chrome", woerter: ["chrome", "google chrome"] },
  { id: "outlook", art: "programm", name: "Outlook", app: "Microsoft Outlook", woerter: ["outlook", "microsoft outlook"] },
  { id: "teams", art: "programm", name: "Teams", app: "Microsoft Teams", woerter: ["teams", "microsoft teams"] },
  { id: "word", art: "programm", name: "Word", app: "Microsoft Word", woerter: ["word", "microsoft word"] },
  { id: "excel", art: "programm", name: "Excel", app: "Microsoft Excel", woerter: ["excel", "microsoft excel"] },
  { id: "powerpoint", art: "programm", name: "PowerPoint", app: "Microsoft PowerPoint", woerter: ["powerpoint", "power point", "microsoft powerpoint"] },
  { id: "mail", art: "programm", name: "Apple Mail", paket: "com.apple.mail", woerter: ["apple mail", "mail app", "mailprogramm", "mail programm"] },
  { id: "notizen", art: "programm", name: "Apple Notizen", paket: "com.apple.Notes", woerter: ["apple notizen", "notizen app", "notes"] },
  { id: "erinnerungen", art: "programm", name: "Erinnerungen", imSatz: "die Erinnerungen", paket: "com.apple.reminders", woerter: ["erinnerungen", "erinnerungen app", "reminders"] },
  { id: "finder", art: "programm", name: "Finder", imSatz: "den Finder", paket: "com.apple.finder", woerter: ["finder"] },
  { id: "musik", art: "programm", name: "Musik", paket: "com.apple.Music", woerter: ["musik", "apple music", "musik app", "music"] },
  { id: "fotos", art: "programm", name: "Fotos", paket: "com.apple.Photos", woerter: ["fotos", "fotos app", "photos"] },
  { id: "karten", art: "programm", name: "Karten", paket: "com.apple.Maps", woerter: ["karten", "apple karten", "karten app", "maps"] },
  { id: "rechner", art: "programm", name: "Rechner", imSatz: "den Rechner", paket: "com.apple.calculator", woerter: ["rechner", "taschenrechner", "calculator"] },
  { id: "vorschau", art: "programm", name: "Vorschau", imSatz: "die Vorschau", paket: "com.apple.Preview", woerter: ["vorschau", "preview"] },
  { id: "systemeinstellungen", art: "programm", name: "Systemeinstellungen", imSatz: "die Systemeinstellungen", paket: "com.apple.systempreferences", woerter: ["systemeinstellungen", "system settings"] },
  { id: "spotify", art: "programm", name: "Spotify", app: "Spotify", woerter: ["spotify"] },
  { id: "whatsapp", art: "programm", name: "WhatsApp", app: "WhatsApp", woerter: ["whatsapp", "whats app", "what s app"] },
  { id: "dokumente", art: "ordner", name: "Dokumente", ordner: "Documents", woerter: ["dokumentenordner", "dokumente ordner"], nurMitArt: ["dokumente"] },
  { id: "downloads", art: "ordner", name: "Downloads", ordner: "Downloads", woerter: ["downloads", "download ordner", "downloads ordner", "downloadordner"] },
  { id: "schreibtisch", art: "ordner", name: "Schreibtisch", ordner: "Desktop", woerter: ["schreibtisch", "desktop"] },
  { id: "bilder", art: "ordner", name: "Bilder", ordner: "Pictures", woerter: ["bilderordner", "bilder ordner"], nurMitArt: ["bilder"] },
];

// So viele eigene Programme lassen sich eintragen.
export const EIGENE_HOECHSTENS = 12;

// Was davon in ~/.jarvis/config.json steht: die Kennungen der ausgeschalteten Ziele und die Namen der eigenen
// Programme. Fehlt alles, sind die festen Ziele an.
export type DesktopConfig = { aus?: string[]; eigene?: string[] };

// Ein Ziel, wie die Seite es sieht. Wie der Mac es öffnet, bleibt auf dem Server.
export type DesktopZiel = { id: string; art: ZielArt; name: string; an: boolean; eigen: boolean };

// moeglich: JARVIS läuft auf einem Mac.
export type DesktopStatus = { moeglich: boolean; ziele: DesktopZiel[] };

// Zum Vergleichen: klein, ohne Satz- und Sonderzeichen, einfache Leerzeichen. So ist „Mail-App“ dasselbe wie
// „mail app“, egal wie der Erkenner es schreibt.
const glatt = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// Der Name eines eigenen Programms, wie er im Ordner Programme steht. Er geht später als ein Argument an den
// Befehl „open -a“; deshalb ist hier alles ausgeschlossen, was ein Pfad oder ein Schalter für den Befehl sein
// könnte: Er beginnt mit einem Buchstaben oder einer Ziffer und enthält nur Buchstaben, Ziffern, Leerzeichen und
// die Zeichen, die in Programmnamen vorkommen („Microsoft Teams (work or school)“). Schrägstrich, Doppelpunkt und
// alles, was eine Shell deuten könnte, gehören nicht dazu. Liefert den bereinigten Namen oder null.
export function programmName(roh: unknown): string | null {
  if (typeof roh !== "string") return null;
  const name = roh
    .replace(/ +/g, " ")
    .trim()
    .replace(/\.app$/i, "")
    .trim();
  if (name.length < 2 || name.length > 60) return null;
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .&+'()!,_–-]*$/u.test(name)) return null;
  return name;
}

export const eigeneId = (name: string) => `eigen:${name.toLowerCase()}`;

// Wie die Einstellungsdatei die ausgeschalteten Ziele führt, bereinigt: nur Kennungen, auch wenn von Hand etwas
// anderes hineingeschrieben wurde.
export const ausVon = (desktop: DesktopConfig | undefined | null): string[] => (Array.isArray(desktop?.aus) ? desktop.aus.filter((x): x is string => typeof x === "string") : []);

const FESTE_ALS_ZIELE: DesktopZiel[] = FESTE_ZIELE.map((z) => ({ id: z.id, art: z.art, name: z.name, an: true, eigen: false }));
const FESTE_NAMEN = new Set(FESTE_ZIELE.flatMap((z) => [glatt(z.name), glatt(z.app ?? z.name), ...(z.nurMitArt ?? [])]));

// Heißt ein eigenes Programm so, dass „öffne …“ damit schon ein festes Ziel meint? Das gilt für den Namen in
// JARVIS, den Namen am Mac („Microsoft Excel“, „Notes“) und für Umwege wie „Ordner Downloads“ oder „Programm
// Safari“. Dann wäre es zweimal dasselbe, und das KI-Gehirn könnte die beiden nicht unterscheiden.
export const istFestesWort = (name: string) => FESTE_NAMEN.has(glatt(name)) || findeZiel(`öffne ${name}`, FESTE_ALS_ZIELE) !== null;

// Wörter, die in JARVIS schon etwas heißen: die Räume und die festen Befehle. Ein eigenes Programm mit so einem
// Namen nähme ihnen den Satz weg („öffne Mail“), weil die Programme vor den festen Befehlen geprüft werden.
const VERGEBEN = new Set([
  "mail",
  "mails",
  "post",
  "postfach",
  "kalender",
  "calendar",
  "termine",
  "notizen",
  "obsidian",
  "tresor",
  "eingang",
  "dokumente",
  "bilder",
  "aufgaben",
  "projekte",
  "einstellungen",
  "browser",
  "intel",
  "nachrichten",
  "trading",
  "handel",
  "desk",
  "agenten",
  "heute",
  "briefing",
  "wetter",
  "übersicht",
  "fokus",
  "jarvis",
]);
export const istVergeben = (name: string) => VERGEBEN.has(glatt(name));

// Die ganze Liste: erst die festen Ziele, dann die eigenen Programme. Was in der Einstellungsdatei steht, wird
// hier noch einmal geprüft, damit auch ein von Hand eingetragener Pfad nie beim Mac ankommt.
export function zieleVon(desktop: DesktopConfig | undefined | null): DesktopZiel[] {
  const aus = new Set(ausVon(desktop));
  const ziele: DesktopZiel[] = FESTE_ZIELE.map((z) => ({ id: z.id, art: z.art, name: z.name, an: !aus.has(z.id), eigen: false }));
  const gesehen = new Set<string>();
  for (const roh of Array.isArray(desktop?.eigene) ? desktop.eigene : []) {
    const name = programmName(roh);
    if (!name || istFestesWort(name) || istVergeben(name)) continue;
    const id = eigeneId(name);
    if (gesehen.has(id)) continue;
    if (gesehen.size >= EIGENE_HOECHSTENS) break;
    gesehen.add(id);
    ziele.push({ id, art: "programm", name, an: !aus.has(id), eigen: true });
  }
  return ziele;
}

// So steht ein Ziel im Satz: „Safari“, „den Finder“, „den Ordner Downloads“.
export const zielImSatz = (z: DesktopZiel) => (z.art === "ordner" ? `den Ordner ${z.name}` : ((z.eigen ? undefined : FESTE_ZIELE.find((f) => f.id === z.id)?.imSatz) ?? z.name));
// So nennt JARVIS es dem KI-Modell und im Protokoll: „Safari“, „Ordner Downloads“.
export const zielName = (z: Pick<DesktopZiel, "art" | "name">) => (z.art === "ordner" ? `Ordner ${z.name}` : z.name);

const FUELLWORT = new Set(["bitte", "mal", "mir", "kurz", "doch", "einmal", "jetzt"]);
const ARTIKEL = new Set(["den", "die", "das", "der", "mein", "meine", "meinen"]);
const ART_WORT: Record<string, ZielArt> = { programm: "programm", app: "programm", anwendung: "programm", ordner: "ordner" };
// Womit ein Satz beginnt („öffne …“) oder endet („… öffnen“). zeigen gilt nur für Ordner; „mach“ braucht „auf“.
const VORN = new Set(["öffne", "starte", "start", "zeig", "zeige", "mach", "mache"]);
const HINTEN = new Set(["öffnen", "starten", "aufmachen", "zeigen"]);
const NUR_ORDNER = new Set(["zeig", "zeige", "zeigen"]);

// Die Wörter eines Satzes zum Vergleichen, ohne Füllwörter. Für den Namen eines eigenen Programms gilt dasselbe,
// damit beide Seiten gleich aussehen.
const kern = (text: string) =>
  glatt(text)
    .split(" ")
    .filter((x) => x && !FUELLWORT.has(x));

const woerterVon = (z: DesktopZiel): { allein: string[]; mitArt: string[] } => {
  if (z.eigen) return { allein: [kern(z.name).join(" ")], mitArt: [] };
  const fest = FESTE_ZIELE.find((f) => f.id === z.id);
  return { allein: fest?.woerter ?? [], mitArt: fest?.nurMitArt ?? [] };
};

// Ist der ganze Satz die Bitte, genau ein Ziel aus der Liste zu öffnen? Dann dieses Ziel (auch ein ausgeschaltetes,
// damit JARVIS das sagen kann), sonst null. Ein Satz, der danach noch weitergeht („… und such nach Hotels“), ist
// keiner: Den versteht das KI-Gehirn besser.
export function findeZiel(satz: string, ziele: DesktopZiel[]): DesktopZiel | null {
  let w = kern(satz);
  if (w.length >= 2 && ["kannst", "könntest", "würdest"].includes(w[0]) && w[1] === "du") w = w.slice(2);
  if (w.length < 2) return null;
  let verb: string;
  if (VORN.has(w[0])) {
    verb = w[0];
    w = w.slice(1);
    const auf = w.at(-1) === "auf";
    if ((verb === "mach" || verb === "mache") !== auf) return null;
    if (auf) w = w.slice(0, -1);
  } else if (HINTEN.has(w.at(-1)!)) {
    verb = w.at(-1)!;
    w = w.slice(0, -1);
  } else return null;
  if (!w.length) return null;
  // Drei Lesarten, die vollständigste zuerst: der ganze Rest (ein eigenes Programm darf „App Store“ oder „Die Zeit“
  // heißen), dann ohne Artikel, dann ohne „Programm“ oder „Ordner“ davor.
  const ohneArtikel = ARTIKEL.has(w[0]) ? w.slice(1) : w;
  const art = ohneArtikel.length > 1 ? ART_WORT[ohneArtikel[0]] : undefined;
  const lesarten: { wort: string; art?: ZielArt }[] = [{ wort: w.join(" ") }, { wort: ohneArtikel.join(" ") }];
  if (art) lesarten.push({ wort: ohneArtikel.slice(1).join(" "), art });
  for (const lesart of lesarten) {
    if (!lesart.wort) continue;
    for (const z of ziele) {
      if (lesart.art && lesart.art !== z.art) continue;
      if (NUR_ORDNER.has(verb) && z.art !== "ordner") continue;
      const { allein, mitArt } = woerterVon(z);
      if (allein.includes(lesart.wort) || (lesart.art && mitArt.includes(lesart.wort))) return z;
    }
  }
  return null;
}
