// Was die Spracherkennung hört und was JARVIS sagt, als reine Textregeln (ohne Browser, damit testbar).

// „Jarvis“ hört der deutsche Erkenner auch als Jarwis, Dschawis oder Tscharvis.
const WAKE = /(?:^|[\s,.!?])(?:(?:hey|hallo|hi|ok|okay|he)[\s,]+)?(?:jarvis|jarwis|jervis|jarvi|javis|jaavis|dschawis|dschavis|dschärvis|tschawis|tscharvis|tscharwis|scharvis|scharwis|charvis|chavis)(?=$|[\s,.!?:;-])[\s,.!?:;-]*/i;

// Der Text nach dem Weckwort, "" wenn nur „Jarvis“ fiel, null ohne Weckwort.
export function afterWake(heard: string): string | null {
  const m = WAKE.exec(` ${heard}`);
  if (!m) return null;
  return ` ${heard}`.slice(m.index + m[0].length).trim();
}

export const hasWake = (heard: string) => afterWake(heard) !== null;

// „Stopp“, „Ruhe“, „Danke“: JARVIS soll aufhören zu reden, kein Befehl.
const STOP = /^(stopp?|halt|ruhe|still|sei still|sei ruhig|genug|abbrechen|aufhören|hör auf|danke|danke schön|vielen dank|schon gut|passt schon|egal)$/i;
export const isStop = (text: string) => STOP.test(text.replace(/[.!?,]+/g, "").trim());

const words = (s: string) => s.toLowerCase().match(/[a-zäöüß0-9]+/g) ?? [];

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
