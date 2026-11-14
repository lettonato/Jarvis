// Antwortentwürfe (src/lib/entwuerfe.ts): die festen Regeln ohne Netz. JARVIS entwirft, verschickt aber nie.
// Geprüft wird, dass aus einem Entwurf nur eine Antwort an genau einen Empfänger werden kann und dass im Link
// zum Mailprogramm nichts steht, was dort weitere Empfänger oder Felder einschmuggelt.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { antwortBetreff, ENTWURF_GRENZEN, entwurfText, istAdresse, kopieEmpfaenger, linkInsMailprogramm, mailtoLink, mitZitat, nimmtKeineAntwort, zitatText, type Entwurf } from "../../src/lib/entwuerfe";

const entwurf = (mehr: Partial<Entwurf> = {}): Entwurf => ({
  id: "ew1",
  uid: 101,
  an: "petra.bauer@example.com",
  anName: "Petra Bauer",
  betreff: "Re: Angebot für den Stahlbau",
  text: "Hallo Petra,\n\nDienstag passt.\n\nViele Grüße\nBenedikt",
  erstelltAm: "2026-11-13T10:00:00.000Z",
  geaendertAm: null,
  kanal: "mac",
  bearbeitet: false,
  ...mehr,
});

describe("Antwortentwürfe: Betreff und Text", () => {
  test("der Betreff bekommt ein „Re:“, aber kein zweites", () => {
    assert.equal(antwortBetreff("Angebot für den Stahlbau"), "Re: Angebot für den Stahlbau");
    for (const schon of ["Re: Angebot", "RE: Angebot", "AW: Angebot", "Aw:Angebot", "  re: Angebot "]) assert.equal(antwortBetreff(schon), schon.trim());
    assert.equal(antwortBetreff(""), "Re: (ohne Betreff)");
    assert.equal(antwortBetreff("Zeile eins\r\nBcc: fremd@example.com"), "Re: Zeile eins Bcc: fremd@example.com", "Zeilenumbrüche im Betreff fallen weg");
  });

  test("der Text behält Absätze, verliert Steuerzeichen und ist begrenzt", () => {
    assert.equal(entwurfText("  Hallo\r\n\r\n\r\n\r\nWelt\u0000\u0007  "), "Hallo\n\nWelt");
    assert.equal(entwurfText(42), "");
    assert.equal(entwurfText("x".repeat(ENTWURF_GRENZEN.text + 500)).length, ENTWURF_GRENZEN.text);
  });
});

describe("Antwortentwürfe: der Empfänger", () => {
  test("nur eine einzelne, schlichte Adresse gilt", () => {
    for (const gut of ["petra.bauer@example.com", "j.mueller+bau@firma-sued.example", "a_b@x.de"]) assert.equal(istAdresse(gut), true, gut);
    for (const schlecht of ["", "petra", "a@b", "a@b.de, c@d.de", "a@b.de?bcc=c@d.de", "a@b.de&cc=x@y.de", "a b@c.de", "<a@b.de>", "a@b.de\nBcc: c@d.de", "a%40b.de@c.de", "a@b.de#x", "a;b@c.de"]) assert.equal(istAdresse(schlecht), false, JSON.stringify(schlecht));
    assert.equal(istAdresse(`${"a".repeat(250)}@example.com`), false, "überlange Adressen gelten nicht");
  });

  test("Adressen, die keine Antwort annehmen, werden erkannt", () => {
    for (const stumm of ["no-reply@bank.example", "noreply@x.de", "donotreply@x.de", "nicht-antworten@x.de", "mailer-daemon@x.de", "shop.no-reply@x.de", "noreply+abc123@x.de", "NoReply@x.de", "bounce-77@x.de"]) assert.equal(nimmtKeineAntwort(stumm), true, stumm);
    for (const echt of ["petra.bauer@example.com", "reply@x.de", "norbert@x.de", "nonoreply@x.de", "noreplying@x.de", "anna@no-reply.example", "anna@mail.no-reply.example"]) assert.equal(nimmtKeineAntwort(echt), false, echt);
  });
});

describe("Antwortentwürfe: der Link ins Mailprogramm", () => {
  test("Empfänger, Betreff und Text stehen verschlüsselt im Link", () => {
    const link = mailtoLink(entwurf())!;
    assert.ok(link.startsWith("mailto:petra.bauer@example.com?subject=Re%3A%20Angebot%20f%C3%BCr%20den%20Stahlbau&body=Hallo%20Petra%2C%0D%0A%0D%0ADienstag%20passt."), link);
  });

  test("Zeichen aus Betreff und Text können keine weiteren Felder aufmachen", () => {
    const link = mailtoLink(entwurf({ betreff: "Re: A&bcc=fremd@example.com", text: "Text&cc=fremd@example.com\nBcc: fremd@example.com?to=x" }))!;
    const [, nach] = link.split("?");
    assert.deepEqual(nach.split("&").map((p) => p.split("=")[0]), ["subject", "body"], "es bleibt bei Betreff und Text");
    assert.ok(!/[\r\n]/.test(link));
  });

  test("ohne brauchbare Adresse gibt es keinen Link", () => {
    assert.equal(mailtoLink(entwurf({ an: "a@b.de?bcc=fremd@example.com" })), null);
    assert.equal(mailtoLink(entwurf({ an: "" })), null);
    assert.equal(linkInsMailprogramm(entwurf({ an: "a@b.de,c@d.de" })), null);
  });

  test("ein kurzer Entwurf geht ganz in den Link; ist er zu lang, trägt der Link nur Empfänger und Betreff", () => {
    const kurz = linkInsMailprogramm(entwurf())!;
    assert.deepEqual([kurz.href, kurz.mitText], [mailtoLink(entwurf()), true]);
    // Umlaute werden im Link sechsmal so lang: 400 davon sprengen die Grenze sicher.
    const lang = linkInsMailprogramm(entwurf({ text: "ä".repeat(400) }))!;
    assert.equal(lang.mitText, false);
    assert.equal(lang.href, "mailto:petra.bauer@example.com?subject=Re%3A%20Angebot%20f%C3%BCr%20den%20Stahlbau");
    assert.ok(lang.href.length <= ENTWURF_GRENZEN.link);
    // Genau an der Grenze: bis einschließlich 1900 Zeichen mit Text, ein Zeichen mehr ohne.
    const rest = ENTWURF_GRENZEN.link - mailtoLink(entwurf({ text: "x" }))!.length;
    assert.equal(linkInsMailprogramm(entwurf({ text: "x".repeat(rest + 1) }))!.mitText, true);
    assert.equal(linkInsMailprogramm(entwurf({ text: "x".repeat(rest + 2) }))!.mitText, false);
  });
});

describe("Antwortentwürfe: Zitat der ursprünglichen Mail", () => {
  const mail = { from: "Petra Bauer", fromAddress: "petra.bauer@example.com", date: new Date(2026, 10, 12, 14, 5).toISOString(), text: "Hallo Benedikt,\n\ndas Angebot liegt bei 184.000 Euro.\nPasst dir Dienstag?" };

  test("jede Zeile bekommt ein „>“, davor steht, wer wann geschrieben hat", () => {
    assert.equal(zitatText(mail), "Am 12.11.2026 um 14:05 Uhr schrieb Petra Bauer <petra.bauer@example.com>:\n> Hallo Benedikt,\n>\n> das Angebot liegt bei 184.000 Euro.\n> Passt dir Dienstag?");
  });

  test("ohne Namen steht nur die Adresse da; Zeilenumbrüche, Steuerzeichen und spitze Klammern im Namen fallen weg", () => {
    assert.match(zitatText({ ...mail, from: "petra.bauer@example.com" }), /^Am 12\.11\.2026 um 14:05 Uhr schrieb petra\.bauer@example\.com:\n/);
    const kopf = zitatText({ ...mail, from: "Petra\r\nBcc: fremd@example.com <x>\u0007" }).split("\n")[0];
    assert.equal(kopf, "Am 12.11.2026 um 14:05 Uhr schrieb Petra Bcc: fremd@example.com x <petra.bauer@example.com>:");
  });

  test("eine Adresse, die keine schlichte Adresse ist, und ein unlesbares Datum stehen nicht im Kopf", () => {
    assert.equal(zitatText({ ...mail, fromAddress: "a@b.de?bcc=fremd@example.com", date: "irgendwann" }).split("\n")[0], "Petra Bauer schrieb:");
  });

  test("Steuerzeichen im Text fallen weg; ohne Text gibt es kein Zitat", () => {
    assert.equal(zitatText({ ...mail, text: "eins\u0000\u0007\r\nzwei" }).split("\n").slice(1).join("|"), "> eins|> zwei");
    assert.equal(zitatText({ ...mail, text: "  \n " }), "");
  });

  test("Tabulatoren werden zu Leerzeichen, damit Spalten nicht zusammenlaufen", () => {
    assert.equal(zitatText({ ...mail, text: "Pos\tMenge\tPreis" }).split("\n")[1], "> Pos Menge Preis");
  });

  test("eine sehr lange Mail wird an einem Zeilenende gekürzt, und das steht sichtbar da", () => {
    const zeile = "Eine Zeile mit genau fünfzig Zeichen, mehr nicht.!";
    const lang = zitatText({ ...mail, text: Array.from({ length: 400 }, (_, i) => `${i} ${zeile}`).join("\n") }).split("\n");
    assert.equal(lang.at(-1), "> […] (hier gekürzt)");
    assert.ok(lang.slice(1, -1).every((z) => z.endsWith(zeile)), "keine Zeile ist mittendrin abgeschnitten");
    const zitiert = lang.slice(1, -1).map((z) => z.slice(2)).join("\n").length;
    assert.ok(zitiert <= ENTWURF_GRENZEN.zitat && zitiert > ENTWURF_GRENZEN.zitat - 60, `zitiert sind ${zitiert} Zeichen der Mail`);
    const kurz = zitatText({ ...mail, text: "x".repeat(ENTWURF_GRENZEN.zitat) });
    assert.ok(!kurz.includes("gekürzt"), "genau an der Grenze wird nicht gekürzt");
    assert.equal(zitatText({ ...mail, text: "x".repeat(ENTWURF_GRENZEN.zitat + 1) }).split("\n").at(-1), "> […] (hier gekürzt)", "auch eine einzige überlange Zeile");
  });

  test("das Zitat hängt mit einer Leerzeile unter dem Entwurf; ohne Zitat bleibt der Text, wie er ist", () => {
    assert.equal(mitZitat("Hallo Petra,\n\nDienstag passt.\n", "Am … schrieb Petra:\n> Hallo"), "Hallo Petra,\n\nDienstag passt.\n\nAm … schrieb Petra:\n> Hallo");
    assert.equal(mitZitat("Hallo Petra", ""), "Hallo Petra");
  });
});

describe("Antwortentwürfe: allen antworten", () => {
  test("in Kopie gehen die übrigen Empfänger der Mail: ohne dich, ohne den Absender, jede Adresse einmal", () => {
    const r = kopieEmpfaenger(["benedikt@example.org", "Thomas.Huber@example.com", "petra.bauer@example.com", "anna@example.com", "thomas.huber@example.com"], ["petra.bauer@example.com", "Benedikt@Example.org"]);
    assert.deepEqual(r, { kopie: ["Thomas.Huber@example.com", "anna@example.com"], ausgelassen: 0, zuViele: false });
  });

  test("was keine schlichte Adresse ist, bleibt weg und wird gezählt", () => {
    const r = kopieEmpfaenger(["anna@example.com", "a@b.de?bcc=fremd@example.com", "x@y.de, z@y.de", "", "undisclosed-recipients:;"], []);
    assert.deepEqual(r, { kopie: ["anna@example.com"], ausgelassen: 3, zuViele: false });
  });

  test("mehr als zehn weitere Empfänger: keiner wird übernommen, statt still zu kürzen", () => {
    const viele = Array.from({ length: ENTWURF_GRENZEN.kopie + 1 }, (_, i) => `person${i}@example.com`);
    assert.deepEqual(kopieEmpfaenger(viele, []), { kopie: [], ausgelassen: 0, zuViele: true });
    assert.equal(kopieEmpfaenger(viele.slice(1), []).kopie.length, ENTWURF_GRENZEN.kopie);
  });

  test("der Link trägt die Kopie-Empfänger als eigenes Feld, verschlüsselt; Betreff und Text bleiben", () => {
    const link = mailtoLink(entwurf(), ["thomas.huber@example.com", "anna+bau@example.com"])!;
    assert.ok(link.startsWith("mailto:petra.bauer@example.com?cc=thomas.huber%40example.com,anna%2Bbau%40example.com&subject=Re%3A%20Angebot"), link);
    assert.deepEqual(link.split("?")[1].split("&").map((p) => p.split("=")[0]), ["cc", "subject", "body"]);
    assert.equal(mailtoLink(entwurf(), []), mailtoLink(entwurf()), "ohne Kopie ist es der Link von vorher");
  });

  test("eine Kopie-Adresse, die nicht schlicht ist, zu viele davon oder der Empfänger selbst: kein Link", () => {
    assert.equal(mailtoLink(entwurf(), ["a@b.de&bcc=fremd@example.com"]), null);
    assert.equal(mailtoLink(entwurf(), ["a@b.de,c@d.de"]), null);
    assert.equal(mailtoLink(entwurf(), Array.from({ length: ENTWURF_GRENZEN.kopie + 1 }, (_, i) => `p${i}@example.com`)), null);
    assert.equal(linkInsMailprogramm(entwurf(), ["a b@c.de"]), null);
    assert.equal(mailtoLink(entwurf(), ["Petra.Bauer@example.com"]), null, "der Empfänger steht nicht noch einmal in Kopie");
  });

  test("passen nicht einmal Empfänger, Kopie und Betreff in den Link, gibt es keinen Link statt eines abgeschnittenen", () => {
    const viele = Array.from({ length: ENTWURF_GRENZEN.kopie }, (_, i) => `${"sehr.langer.name.".repeat(5)}${i}@eine-lange-domain.example.com`);
    assert.equal(linkInsMailprogramm(entwurf({ betreff: `Re: ${"ä".repeat(190)}` }), viele), null);
    assert.ok(linkInsMailprogramm(entwurf({ betreff: `Re: ${"ä".repeat(190)}` }), [])!.href.length <= ENTWURF_GRENZEN.link, "ohne Kopie passt derselbe Betreff");
  });

  test("ist der Link zu lang, bleiben Empfänger, Kopie und Betreff; der Text kommt über „Kopieren“", () => {
    const lang = linkInsMailprogramm(entwurf({ text: "ä".repeat(400) }), ["thomas.huber@example.com"])!;
    assert.deepEqual([lang.href, lang.mitText], ["mailto:petra.bauer@example.com?cc=thomas.huber%40example.com&subject=Re%3A%20Angebot%20f%C3%BCr%20den%20Stahlbau", false]);
  });
});
