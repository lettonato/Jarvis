// Was die Spracherkennung hört und was JARVIS sagt, als reine Textregeln (ohne Browser, damit testbar).

// „Jarvis“ hört der deutsche Erkenner auch als Jarwis, Dschawis oder Tscharvis.
const VORWEG = "hey|hallo|hi|ok|okay|he";
const WECKWORT =
  `(?:(?:${VORWEG})[\\s,]+)?(?:jarvis|jarwis|jervis|jarvi|javis|jaavis|dschawis|dschavis|dschärvis|tschawis|tscharvis|tscharwis|scharvis|scharwis|charvis|chavis)(?=$|[\\s,.!?:;-])[\\s,.!?:;-]*`;
const WAKE = new RegExp(`(?:^|[\\s,.!?])${WECKWORT}`, "i");
const WAKE_AGAIN = new RegExp(`^${WECKWORT}`, "i");
const WAKE_ALL = new RegExp(`(?:^|[\\s,.!?])${WECKWORT}`, "gi");

// Der Text nach dem Weckwort, "" wenn nur „Jarvis“ fiel, null ohne Weckwort. „Jarvis, Jarvis, Briefing“ (er hat
// beim ersten Mal nicht reagiert) ist ein Weckwort und kein Befehl, der mit „Jarvis“ anfängt; ein „Jarvis“ weiter
// hinten im Satz bleibt stehen.
export function afterWake(heard: string): string | null {
  const m = WAKE.exec(` ${heard}`);
  if (!m) return null;
  let rest = ` ${heard}`.slice(m.index + m[0].length);
  for (let again = WAKE_AGAIN.exec(rest); again && again[0]; again = WAKE_AGAIN.exec(rest)) rest = rest.slice(again[0].length);
  return rest.trim();
}

export const hasWake = (heard: string) => afterWake(heard) !== null;

// Getippt: „Jarvis, öffne Safari“ ohne die Anrede. Nur der Name selbst (getippt verhört sich niemand) und nur ganz
// am Anfang, auch nach einem Gruß und auch zweimal; ein Bindestrich dahinter („Jarvis-Projekt“) ist keine Anrede.
// Bleibt ohne sie nichts übrig, bleibt der Satz, wie er ist.
const ANREDE = new RegExp(`^(?:(?:${VORWEG}|guten morgen|guten tag|guten abend|moin|servus)[\\s,]+)?jarvis(?=[\\s,.!?:;…])[\\s,.!?:;…]*`, "i");
export function ohneAnrede(text: string): string {
  const ganz = text.trim();
  let rest = ganz;
  for (let m = ANREDE.exec(rest); m; m = ANREDE.exec(rest)) rest = rest.slice(m[0].length);
  return rest.trim() || ganz;
}

// Was im Eingabefeld und im leeren Gespräch steht. gesperrt: Die Spracherkennung meldet gerade einen Fehler (das
// Mikrofon ist nicht erlaubt oder nicht da, es fehlt das Netz); solange die Meldung dasteht, fordert JARVIS nicht
// zum Sprechen auf, auch nicht über den Mikrofon-Knopf. Der Grund steht als Meldung daneben.
export type Hoeren = { canListen: boolean; handsFree: boolean; gesperrt: boolean };
const KANN = "Ich kann dir alles beantworten, im Web nachsehen und mir Dinge über dich merken.";
export const eingabeText = (h: Hoeren) => (h.canListen && h.handsFree && !h.gesperrt ? "Sag „Jarvis“ oder tippe" : "Schreib hier, was du brauchst");
export function leerText(h: Hoeren): string {
  if (!h.canListen) return "Schreib mir unten. Sprechen geht in Chrome und Safari.";
  if (h.gesperrt) return `Schreib mir unten. ${KANN}`;
  if (h.handsFree) return `Sag „Jarvis“ und dann, was du brauchst. Oder schreib mir unten. ${KANN}`;
  return `Tippe aufs Mikrofon, drück die Leertaste oder schreib mir. ${KANN}`;
}

const glatt = (text: string) => text.replace(/[.!?,]+/g, " ").replace(/\s+/g, " ").trim();

// „Stopp“, „Ruhe“, „Danke“: JARVIS soll aufhören zu reden, kein Befehl. Auch höflich gesagt („Stopp bitte“,
// „Okay, stopp“, „Danke dir“). „Nein danke“ und „Ja“ gehören nicht dazu, das sind Antworten auf eine Rückfrage.
const HALT = "stopp?|halt|ruhe|still|sei still|sei ruhig|genug|abbrechen|aufhören|hör auf|schon gut|passt schon|egal";
const DANK = "(?:danke|danke schön|dankeschön|vielen dank)(?: dir)?";
const STOP = new RegExp(`^(?:(?:ok|okay) )?(?:${HALT})(?: (?:bitte|jetzt))*$|^${DANK}$`, "i");
export const isStop = (text: string) => STOP.test(glatt(text));

// „Okay, danke“ und „Super, danke“ nach einer Antwort: ein Dank und keine neue Frage. Hat JARVIS aber gerade
// etwas gefragt („Soll ich das so eintragen?“), ist dasselbe eine Antwort und geht weiter.
const DANK_NACH = new RegExp(`^(?:ok|okay|alles klar|gut|super|prima|perfekt|passt) ${DANK}$`, "i");
const fragt = (gesagt: string) => /\?["“”»)\s]*$/.test(gesagt);

// Ein ganzer gehörter Satz, der JARVIS nur anhalten soll, mit oder ohne seinen Namen davor oder dahinter
// („Jarvis, stopp“, „Danke, Dschawis“), oder ein Haltewort als alles, was nach seinem Namen kommt („Ach Jarvis,
// stopp“). gesagt: was JARVIS zuletzt gesagt hat.
export function isHalt(heard: string, gesagt = ""): boolean {
  const ohne = glatt(` ${heard}`.replace(WAKE_ALL, " "));
  if (STOP.test(ohne) || isStop(afterWake(heard) ?? "")) return true;
  return !fragt(gesagt) && DANK_NACH.test(ohne);
}

const words = (s: string) => s.toLowerCase().match(/[a-zäöüß0-9]+/g) ?? [];

// „Stopp“ ohne „Jarvis“, während JARVIS spricht: Er hört auf. Es zählen nur klare Haltewörter am Ende eines
// fertig gehörten Satzes (auch mit „bitte“ dahinter), kein „Danke“. Sagt JARVIS genau dieses Haltewort gerade selbst, war es wohl der Lautsprecher.
const BARGE = /(?:^|\s)(stopp?|halt|ruhe|sei still|sei ruhig|hör auf|aufhören|abbrechen)(?: bitte)?$/i;
export function stopsSpeech(heard: string, speaking: string): boolean {
  if (!speaking) return false;
  const m = BARGE.exec(heard.replace(/[.!?,]+/g, " ").replace(/\s+/g, " ").trim());
  if (!m) return false;
  return !` ${words(speaking).join(" ")} `.includes(` ${words(m[1]).join(" ")} `);
}

// Hat das Mikrofon nur JARVIS selbst gehört? Ab drei Wörtern, die fast alle eben gesagt wurden.
export function looksLikeEcho(heard: string, spoken: string): boolean {
  const h = words(heard);
  if (h.length < 3 || !spoken) return false;
  const said = new Set(words(spoken));
  return h.filter((w) => said.has(w)).length / h.length >= 0.7;
}

// Was auf dem Bildschirm gut aussieht, aber vorgelesen stört: Links, Sternchen, Pfeile, Emojis, $ vor Coins.
export function forSpeech(text: string): string {
  return text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*#`>]+/g, "")
    .replace(/_/g, " ")
    .replace(/\$(?=[A-Za-z])/g, "")
    .replace(/\s*[·•|]\s*/g, ", ")
    .replace(/\s*(→|->)\s*/g, ", dann ")
    // Ein Minuszeichen vor einer Zahl ausschreiben: Liest eine Stimme es nicht mit, wird aus einem Verlust ein Gewinn.
    .replace(/−(?=\d)/g, "minus ")
    .replace(/\p{Extended_Pictographic}\uFE0F?/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Lange Texte in Sätze teilen: Chrome bricht sonst nach etwa 15 Sekunden mitten im Satz ab.
export function sentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+["“”]?\s*|[^.!?]+$/g) ?? [text];
  const chunks: string[] = [];
  for (const p of parts.map((s) => s.trim()).filter(Boolean)) {
    const last = chunks[chunks.length - 1];
    if (last && last.length + p.length < 180) chunks[chunks.length - 1] = `${last} ${p}`;
    else chunks.push(p);
  }
  return chunks;
}

// Nach diesen Abkürzungen endet kein Satz, auch wenn ein Punkt folgt.
const ABBREVIATIONS = new Set(["bzw", "ca", "nr", "dr", "hr", "fr", "st", "str", "usw", "etc", "evtl", "ggf", "inkl", "max", "min", "mio", "mrd", "tsd", "vgl", "std", "bspw", "zb", "prof", "jh", "jhd", "mind", "sog", "abs"]);

// Eine Antwort, die noch entsteht, in fertige Sätze und den Rest teilen, damit JARVIS den ersten Satz schon
// spricht, während Claude den zweiten schreibt. last: Die Antwort ist komplett, der Rest ist auch ein Satz.
export function takeSentences(buffer: string, last = false): { ready: string[]; rest: string } {
  const ready: string[] = [];
  let start = 0;
  const end = /[.!?…]+["“”»)]*(?=\s)|\n+/g;
  for (let m = end.exec(buffer); m; m = end.exec(buffer)) {
    const stop = m.index + m[0].length;
    if (m[0][0] === ".") {
      const word = /([\p{L}\d]+)$/u.exec(buffer.slice(start, m.index))?.[1] ?? "";
      // „z. B.“, „Dr.“, „30. Oktober“: hier geht der Satz weiter.
      if (word.length === 1 || ABBREVIATIONS.has(word.toLowerCase()) || /^\d{1,2}$/.test(word)) continue;
    }
    const sentence = buffer.slice(start, stop).trim();
    if (sentence) ready.push(sentence);
    start = stop;
  }
  let rest = buffer.slice(start);
  if (last) {
    if (rest.trim()) ready.push(rest.trim());
    rest = "";
  }
  return { ready, rest };
}
