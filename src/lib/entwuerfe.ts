// Antwortentwürfe: JARVIS bereitet eine Antwort auf eine Mail vor, verschickt aber nie etwas. Ein Entwurf ist
// Text, der auf dem Mac liegt. Du liest ihn, änderst ihn und sendest selbst aus deinem Mailprogramm; dorthin
// führt ein Link, der Empfänger, Betreff und Text schon einträgt.
//
// Zwei feste Regeln: Der Empfänger ist immer der Absender der Mail, so wie das Postfach ihn nennt, nie etwas,
// das ein KI-Modell oder der Text der Mail vorgibt. Und der Link ins Mailprogramm enthält genau einen
// Empfänger, einen Betreff und einen Text, sonst nichts.

// link: Längere Links schneiden manche Mailprogramme ab; dann öffnet der Link nur Empfänger und Betreff.
export const ENTWURF_GRENZEN = { text: 4000, betreff: 200, entwuerfe: 50, adresse: 200, link: 1900 };

export type Entwurf = {
  id: string;
  // Die Mail im Posteingang, auf die geantwortet wird.
  uid: number;
  an: string;
  anName: string;
  betreff: string;
  text: string;
  erstelltAm: string;
  geaendertAm: string | null;
  // Von wo der Auftrag kam.
  kanal: "mac" | "telegram";
  // Hast du den Text von JARVIS am Mac geändert?
  bearbeitet: boolean;
};

export type EntwuerfeSnapshot = { entwuerfe: Entwurf[] };

const einzeilig = (s: string) => s.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();

// „Re: …“, ohne ein zweites davor zu setzen. Zeilenumbrüche fallen weg.
export function antwortBetreff(betreff: string): string {
  const b = einzeilig(betreff ?? "").slice(0, ENTWURF_GRENZEN.betreff);
  if (/^(re|aw|antwort)\s*:/i.test(b)) return b;
  return `Re: ${b || "(ohne Betreff)"}`;
}

// Der Text eines Entwurfs: Absätze bleiben, Steuerzeichen und überzählige Leerzeilen nicht.
export function entwurfText(text: unknown): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, ENTWURF_GRENZEN.text);
}

// Eine einzelne, schlichte Mailadresse. Alles, was in einem mailto-Link eine zweite Adresse oder ein weiteres
// Feld aufmachen könnte (Komma, Semikolon, Fragezeichen, &, %, #, Leerzeichen, Klammern), gilt nicht.
export const istAdresse = (s: unknown): s is string => typeof s === "string" && s.length <= ENTWURF_GRENZEN.adresse && /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(s);

// Adressen, die erkennbar keine Antwort lesen, auch mit Zusatz davor oder dahinter („shop.no-reply@“, „noreply+abc@“).
export const nimmtKeineAntwort = (adresse: string): boolean =>
  /(^|[._+-])(no[-_.]?reply|do[-_.]?not[-_.]?reply|nicht[-_.]?antworten|keine[-_.]?antwort|mailer-daemon|postmaster|bounces?)([._+-]|$)/i.test(adresse.split("@")[0]);

// Der Link, der die Antwort im Mailprogramm öffnet. null, wenn die Adresse nicht schlicht genug ist.
export function mailtoLink(e: Pick<Entwurf, "an" | "betreff" | "text">): string | null {
  if (!istAdresse(e.an)) return null;
  return `mailto:${e.an}?subject=${encodeURIComponent(einzeilig(e.betreff))}&body=${encodeURIComponent(e.text.replace(/\r?\n/g, "\r\n"))}`;
}

// Was der Knopf „Im Mailprogramm öffnen“ aufruft. Ist der Link mit Text zu lang, trägt er nur Empfänger und
// Betreff (mitText: false); den Text fügst du dann über „Kopieren“ ein. So kommt nie ein abgeschnittener Text an.
export function linkInsMailprogramm(e: Pick<Entwurf, "an" | "betreff" | "text">): { href: string; mitText: boolean } | null {
  const voll = mailtoLink(e);
  if (!voll) return null;
  if (voll.length <= ENTWURF_GRENZEN.link) return { href: voll, mitText: true };
  return { href: `mailto:${e.an}?subject=${encodeURIComponent(einzeilig(e.betreff))}`, mitText: false };
}
