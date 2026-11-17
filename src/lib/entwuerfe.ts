// Antwortentwürfe: JARVIS bereitet eine Antwort auf eine Mail vor, verschickt aber nie etwas. Ein Entwurf ist
// Text, der auf dem Mac liegt. Du liest ihn, änderst ihn und sendest selbst aus deinem Mailprogramm; dorthin
// führt ein Link, der Empfänger, Betreff und Text schon einträgt.
//
// Zwei feste Regeln: Der Empfänger ist immer der Absender der Mail, so wie das Postfach ihn nennt, nie etwas,
// das ein KI-Modell oder der Text der Mail vorgibt. Und der Link ins Mailprogramm enthält von sich aus genau
// einen Empfänger, einen Betreff und einen Text.
//
// Mehr trägt der Link nur auf deinen Haken am Mac, nie durch das KI-Modell, und beides liest der Server dafür
// frisch aus dem Postfach, ohne es zu speichern: das Zitat der ursprünglichen Mail unter dem Text, und
// „Allen antworten“ (die übrigen Empfänger der Mail als Feld „Kopie“; nur schlichte Adressen, höchstens zehn).

// link: Längere Links schneiden manche Mailprogramme ab; dann öffnet der Link nur Empfänger und Betreff.
// kopie: So viele weitere Empfänger trägt „Allen antworten“ höchstens. zitat: So lang wird die ursprüngliche
// Mail höchstens zitiert.
export const ENTWURF_GRENZEN = { text: 4000, betreff: 200, entwuerfe: 50, adresse: 200, link: 1900, kopie: 10, zitat: 6000 };

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

// Was der Server auf deinen Klick aus der ursprünglichen Mail holt. zitat: leer, wenn die Mail keinen lesbaren
// Text hat. kopie: die übrigen Empfänger für „Allen antworten“. ausgelassen: so viele Adressen waren keine
// schlichten Adressen. zuViele: Es wären mehr als erlaubt; dann wird keiner übernommen.
export type EntwurfMail = { zitat: string; kopie: string[]; ausgelassen: number; zuViele: boolean };

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

// Die ursprüngliche Mail als Zitat: eine Zeile, wer wann geschrieben hat, darunter jede Zeile mit „>“. Zitiert
// wird die ganze Mail, wie ein Mailprogramm es tut; ist sie sehr lang, wird an einem Zeilenende gekürzt, und
// das steht als letzte Zeile da. Name und Text stammen von Dritten: Steuerzeichen fallen weg, der Name bleibt
// einzeilig und ohne spitze Klammern. Das Zitat geht nur in deine Zwischenablage oder dein Mailprogramm, nie an
// das KI-Modell und in keine Datei.
export function zitatText(mail: { from: string; fromAddress?: string; date: string; text: string }): string {
  const sauber = mail.text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .trim();
  if (!sauber) return "";
  const zeilen = sauber.split("\n");
  if (sauber.length > ENTWURF_GRENZEN.zitat) {
    const stueck = sauber.slice(0, ENTWURF_GRENZEN.zitat);
    // Am letzten Zeilenende davor; eine einzige überlange Zeile wird an der Grenze geschnitten.
    const ende = stueck.lastIndexOf("\n");
    zeilen.splice(0, zeilen.length, ...(ende > 0 ? stueck.slice(0, ende) : stueck).split("\n"), "[…] (hier gekürzt)");
  }
  const adresse = istAdresse(mail.fromAddress) ? mail.fromAddress : "";
  const name = einzeilig(mail.from.replace(/[<>]/g, " ")).slice(0, 120);
  const wer = name && name !== adresse ? `${name}${adresse ? ` <${adresse}>` : ""}` : adresse || "der Absender";
  const d = new Date(mail.date);
  const wann = Number.isNaN(d.getTime()) ? "" : `Am ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} um ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr schrieb `;
  return [wann ? `${wann}${wer}:` : `${wer} schrieb:`, ...zeilen.map((z) => (z.trim() ? `> ${z}` : ">"))].join("\n");
}

export const mitZitat = (text: string, zitat: string): string => (zitat ? `${text.trimEnd()}\n\n${zitat}` : text);

// „Allen antworten“: die übrigen Empfänger der Mail (An und Kopie), so wie das Postfach sie nennt. Ohne die
// Adressen in `ohne` (du selbst und der Absender, der ohnehin der Empfänger ist), jede einmal. Was keine
// schlichte Adresse ist, bleibt weg und wird gezählt. Wären es mehr als erlaubt, wird keiner übernommen:
// Still zu kürzen hieße, dass jemand die Antwort nicht bekommt, ohne dass du es merkst.
export function kopieEmpfaenger(adressen: string[], ohne: string[]): Omit<EntwurfMail, "zitat"> {
  const gesehen = new Set(ohne.map((a) => a.toLowerCase()));
  const kopie: string[] = [];
  let ausgelassen = 0;
  for (const a of adressen) {
    if (!a) continue;
    if (!istAdresse(a)) ausgelassen += 1;
    else if (!gesehen.has(a.toLowerCase())) {
      gesehen.add(a.toLowerCase());
      kopie.push(a);
    }
  }
  return kopie.length > ENTWURF_GRENZEN.kopie ? { kopie: [], ausgelassen, zuViele: true } : { kopie, ausgelassen, zuViele: false };
}

// Empfänger, dazu die Kopie-Empfänger als eigenes Feld, und der Betreff. null, wenn eine Adresse nicht schlicht
// genug ist oder es zu viele sind.
function linkKopf(e: Pick<Entwurf, "an" | "betreff">, kopie: string[]): string | null {
  if (!istAdresse(e.an) || kopie.length > ENTWURF_GRENZEN.kopie || !kopie.every((a) => istAdresse(a) && a.toLowerCase() !== e.an.toLowerCase())) return null;
  return `mailto:${e.an}?${kopie.length ? `cc=${kopie.map(encodeURIComponent).join(",")}&` : ""}subject=${encodeURIComponent(einzeilig(e.betreff))}`;
}

// Der Link, der die Antwort im Mailprogramm öffnet. null, wenn die Adresse nicht schlicht genug ist.
export function mailtoLink(e: Pick<Entwurf, "an" | "betreff" | "text">, kopie: string[] = []): string | null {
  const kopf = linkKopf(e, kopie);
  return kopf && `${kopf}&body=${encodeURIComponent(e.text.replace(/\r?\n/g, "\r\n"))}`;
}

// Was der Knopf „Im Mailprogramm öffnen“ aufruft. Ist der Link mit Text zu lang, trägt er nur Empfänger und
// Betreff (mitText: false); den Text fügst du dann über „Kopieren“ ein. So kommt nie ein abgeschnittener Text an.
export function linkInsMailprogramm(e: Pick<Entwurf, "an" | "betreff" | "text">, kopie: string[] = []): { href: string; mitText: boolean } | null {
  const voll = mailtoLink(e, kopie);
  if (!voll) return null;
  if (voll.length <= ENTWURF_GRENZEN.link) return { href: voll, mitText: true };
  // Passen nicht einmal Empfänger, Kopie und Betreff hinein, gibt es keinen Link statt eines abgeschnittenen.
  const kopf = linkKopf(e, kopie)!;
  return kopf.length <= ENTWURF_GRENZEN.link ? { href: kopf, mitText: false } : null;
}
