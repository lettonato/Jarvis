// Antwortentwürfe (src/lib/entwuerfe.ts): die festen Regeln ohne Netz. JARVIS entwirft, verschickt aber nie.
// Geprüft wird, dass aus einem Entwurf nur eine Antwort an genau einen Empfänger werden kann und dass im Link
// zum Mailprogramm nichts steht, was dort weitere Empfänger oder Felder einschmuggelt.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { antwortBetreff, ENTWURF_GRENZEN, entwurfText, istAdresse, linkInsMailprogramm, mailtoLink, nimmtKeineAntwort, type Entwurf } from "../../src/lib/entwuerfe";

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
