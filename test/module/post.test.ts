// Postfach (src/lib/server/mail.ts) gegen einen nachgebauten IMAP-Server: was JARVIS zeigt, was er zählt,
// dass Lesen nichts verändert, dass „gelesen“ nur nach einem Ja gesetzt wird und dass das Passwort nie
// unverschlüsselt über das Netz geht. Kein echtes Postfach wird berührt.

import assert from "node:assert/strict";
import net from "node:net";
import { after, before, beforeEach, describe, test } from "node:test";
import { starteClaudeMock, werkzeugErgebnisse, type ClaudeMock } from "../mocks/claude-mock";
import { beispielPost, MOCK_POST_ADRESSE, MOCK_POST_PASSWORT, starteImapMock, type ImapMock } from "../mocks/imap-mock";
import { sichereUmgebung, testOrdner } from "../helfer/umgebung";

let mock: ImapMock;
let claude: ClaudeMock;
let post: typeof import("../../src/lib/server/mail");
let brain: typeof import("../../src/lib/server/brain");
let konfig: typeof import("../../src/lib/server/config");
let freigaben: typeof import("../../src/lib/server/gateway/freigaben");
const vault = testOrdner("post-tresor");

const fach = (mehr: Partial<import("../../src/lib/server/config").MailConfig> = {}) => ({ provider: "andere" as const, host: mock.host, port: mock.port, user: MOCK_POST_ADRESSE, password: MOCK_POST_PASSWORT, ...mehr });
const frisch = () => post.readMail(fach(), { force: true });
const mail = (uid: number) => mock.mails.find((m) => m.uid === uid)!;

before(async () => {
  mock = await starteImapMock();
  claude = await starteClaudeMock();
  process.env.ANTHROPIC_BASE_URL = claude.url;
  sichereUmgebung("post");
  post = await import("../../src/lib/server/mail");
  brain = await import("../../src/lib/server/brain");
  konfig = await import("../../src/lib/server/config");
  freigaben = await import("../../src/lib/server/gateway/freigaben");
});

after(async () => {
  await mock.stop();
  await claude.stop();
});

beforeEach(() => {
  mock.mails.splice(0, mock.mails.length, ...beispielPost());
  mock.leeren();
});

describe("Post: was JARVIS zeigt", () => {
  test("ohne Postfach: nicht verbunden, und es wird nichts aufgebaut", async () => {
    const snap = await post.readMail(undefined);
    assert.equal(snap.configured, false);
    assert.deepEqual(snap.items, []);
    assert.equal(mock.verbindungen(), 0);
  });

  test("Ungelesenes und Markiertes der letzten 14 Tage, das Neueste zuerst", async () => {
    const snap = await frisch();
    assert.equal(snap.error, undefined);
    assert.equal(snap.account, MOCK_POST_ADRESSE);
    // 105 ist ungelesen, aber drei Wochen alt; 106 ist gelesen und nicht markiert.
    assert.deepEqual(snap.items.map((m) => m.uid), [101, 102, 107, 103, 104]);
  });

  test("zählt Ungelesenes, Wichtiges und Newsletter", async () => {
    const snap = await frisch();
    assert.equal(snap.unread, 5, "der Server zählt auch die alte ungelesene Mail");
    assert.equal(snap.importantUnread, 1);
    assert.equal(snap.bulkUnread, 3);
  });

  test("Newsletter, automatische Absender und Abwesenheitsnotizen gelten nicht als wichtig", async () => {
    const nach = new Map((await frisch()).items.map((m) => [m.uid, m]));
    assert.deepEqual([nach.get(101)!.important, nach.get(101)!.bulk], [true, false], "Mail von einem Menschen");
    assert.equal(nach.get(102)!.bulk, true, "Abmelde-Kopfzeile");
    assert.equal(nach.get(103)!.bulk, true, "Absender no-reply");
    assert.equal(nach.get(107)!.bulk, true, "automatische Antwort");
    for (const uid of [102, 103, 107]) assert.equal(nach.get(uid)!.important, false);
    assert.deepEqual([nach.get(104)!.unread, nach.get(104)!.flagged, nach.get(104)!.important], [false, true, true], "markiert bleibt wichtig, auch gelesen");
  });

  test("Umlaute und Sonderzeichen in Absender und Betreff kommen richtig an", async () => {
    const m = (await frisch()).items.find((x) => x.uid === 104)!;
    assert.equal(m.from, "Jürgen Müller");
    assert.equal(m.subject, "Rückfrage zur Statik – Halle 3");
    assert.equal(m.fromAddress, "j.mueller@example.com");
  });

  test("ohne Namen steht die Adresse als Absender da", async () => {
    assert.equal((await frisch()).items.find((x) => x.uid === 103)!.from, "no-reply@bank.example");
  });

  test("höchstens 40 Mails, und zwar die neuesten", async () => {
    const jetzt = Date.now();
    for (let i = 0; i < 60; i++) mock.mails.push({ uid: 200 + i, von: { name: `Absender ${i}`, adresse: `a${i}@example.com` }, betreff: `Mail ${i}`, datum: new Date(jetzt - 13 * 86_400_000 + i * 60_000), text: "x" });
    const snap = await frisch();
    assert.equal(snap.items.length, 40);
    assert.ok(snap.items.every((m) => m.uid >= 220), "die höchsten Nummern sind die neuesten");
  });

  test("innerhalb einer Minute fragt JARVIS den Server nicht noch einmal, auf Wunsch schon", async () => {
    await frisch();
    assert.equal(mock.verbindungen(), 1);
    await post.readMail(fach());
    assert.equal(mock.verbindungen(), 1, "aus dem Zwischenspeicher");
    await frisch();
    assert.equal(mock.verbindungen(), 2);
  });
});

describe("Post: eine Mail öffnen", () => {
  test("liefert den Text ohne Signatur", async () => {
    const m = await post.readMessage(fach(), 101);
    assert.equal(m.from, "Petra Bauer");
    assert.equal(m.subject, "Angebot für den Stahlbau");
    assert.match(m.text, /184\.000 Euro/);
    assert.doesNotMatch(m.text, /Stahlbau Bauer GmbH/);
  });

  test("lässt die zitierte alte Nachricht weg", async () => {
    assert.equal((await post.readMessage(fach(), 104)).text, "Die Prüfung dauert bis Freitag.");
  });

  test("kürzt sehr lange Mails auf 2.500 Zeichen", async () => {
    mock.mails.push({ uid: 300, von: { adresse: "lang@example.com" }, betreff: "Lang", datum: new Date(), text: "Wort ".repeat(4000) });
    assert.equal((await post.readMessage(fach(), 300)).text.length, 2500);
  });

  test("eine verschwundene Mail gibt eine klare Meldung", async () => {
    await assert.rejects(post.readMessage(fach(), 999), /gibt es nicht mehr/);
  });

  test("Lesen und Öffnen markieren nichts als gelesen", async () => {
    await frisch();
    await post.readMessage(fach(), 101);
    await post.readMessage(fach(), 103);
    assert.deepEqual(mock.mails.filter((m) => m.gelesen).map((m) => m.uid), [104, 106], "wie vorher");
    assert.ok(!mock.befehle.some((b) => /STORE/.test(b)), mock.befehle.join(" | "));
    const geholt = mock.befehle.filter((b) => /^UID FETCH/.test(b));
    assert.ok(geholt.length >= 3 && geholt.every((b) => !/BODY\[/.test(b)), "Texte nur mit PEEK");
  });
});

describe("Post: als gelesen markieren", () => {
  test("trifft genau diese eine Mail, und die Liste stimmt danach sofort", async () => {
    await frisch();
    await post.markSeen(fach(), 101);
    assert.equal(mail(101).gelesen, true);
    assert.deepEqual(mock.mails.filter((m) => m.gelesen).map((m) => m.uid), [101, 104, 106]);
    const snap = await post.readMail(fach());
    assert.equal(snap.unread, 4, "nicht aus dem alten Zwischenspeicher");
    assert.ok(!snap.items.some((m) => m.uid === 101));
  });
});

describe("Post: wenn etwas nicht klappt", () => {
  test("falsches Passwort: verständlicher Satz, das Passwort steht nirgends", async () => {
    const snap = await post.readMail(fach({ password: "falsch-und-geheim" }), { force: true });
    assert.equal(snap.configured, true);
    assert.match(snap.error ?? "", /Anmeldung abgelehnt/);
    assert.deepEqual(snap.items, []);
    assert.ok(!JSON.stringify(snap).includes("falsch-und-geheim"));
    const test_ = await post.testMail(fach({ password: "falsch-und-geheim" }));
    assert.equal(test_.ok, false);
    assert.ok(!JSON.stringify(test_).includes("falsch-und-geheim"));
    assert.ok(!mock.befehle.join(" ").includes("falsch-und-geheim"), "auch der Nachbau schreibt es nicht mit");
  });

  test("Server nicht erreichbar: verständlicher Satz statt Fehlercode", async () => {
    const snap = await post.readMail(fach({ port: 9 }), { force: true });
    assert.match(snap.error ?? "", /antwortet nicht/);
  });

  test("ist ein Abruf gescheitert, taucht der alte Stand nicht wieder auf", async () => {
    assert.ok((await frisch()).items.length > 0);
    // Das Postfach fällt aus; „Neu laden“ merkt es.
    assert.match((await post.readMail(fach({ port: 9 }), { force: true })).error ?? "", /antwortet nicht/);
    // Die nächste gewöhnliche Abfrage (eine andere Seite, das Briefing) darf nicht wieder die Mails von vorhin zeigen.
    const danach = await post.readMail(fach({ port: 9 }));
    assert.match(danach.error ?? "", /antwortet nicht/);
    assert.deepEqual(danach.items, []);
    // Geht es wieder, steht der Posteingang wieder da.
    const wieder = await post.readMail(fach());
    assert.equal(wieder.error, undefined);
    assert.ok(wieder.items.length > 0);
  });

  test("scheitert ein alter Abruf erst, nachdem ein neuerer gelungen ist, bleibt der neue Stand stehen", async () => {
    // Ein Server, der die Verbindung annimmt und nach einem Augenblick wortlos schließt (ein hängendes Netz).
    const lahm = net.createServer((s) => void setTimeout(() => s.destroy(), 600));
    await new Promise<void>((r) => lahm.listen(0, "127.0.0.1", r));
    try {
      const alt = post.readMail(fach({ port: (lahm.address() as net.AddressInfo).port }), { force: true });
      const neu = await frisch();
      assert.ok(neu.items.length > 0);
      assert.match((await alt).error ?? "", /./, "der alte Abruf ist gescheitert");
      const vorher = mock.verbindungen();
      const danach = await post.readMail(fach());
      assert.equal(danach.error, undefined);
      assert.deepEqual(danach.items.map((m) => m.uid), neu.items.map((m) => m.uid));
      assert.equal(mock.verbindungen(), vorher, "der gelungene Stand gilt weiter, das Postfach wird nicht noch einmal gefragt");
    } finally {
      await new Promise((r) => lahm.close(r));
    }
  });

  test("Postfach prüfen meldet die Zahl der ungelesenen Mails", async () => {
    assert.deepEqual(await post.testMail(fach()), { ok: true, unread: 5 });
  });
});

describe("Post: das Passwort geht nie unverschlüsselt über das Netz", () => {
  test("Port 993 ist von Anfang an verschlüsselt", () => {
    const o = post.imapOptionen(fach({ host: "imap.example.com", port: 993 }));
    assert.equal(o.secure, true);
  });

  test("auf jedem anderen Port ist die Verschlüsselung Pflicht, außer auf diesem Mac selbst", () => {
    for (const host of ["imap.example.com", "192.168.1.20", "127.0.0.2", "localhost.example.com"]) {
      const o = post.imapOptionen(fach({ host, port: 143 }));
      assert.deepEqual([o.secure, o.doSTARTTLS], [false, true], host);
    }
    for (const host of ["127.0.0.1", "localhost", "LOCALHOST", "::1"]) {
      const o = post.imapOptionen(fach({ host, port: 1143 }));
      assert.deepEqual([o.secure, o.doSTARTTLS], [false, undefined], host);
    }
  });

  test("bietet ein fremder Server keine Verschlüsselung an, meldet JARVIS sich gar nicht erst an", async () => {
    // „127.1“ führt wie 127.0.0.1 zum Nachbau, zählt für die Regel aber als fremder Server.
    const snap = await post.readMail(fach({ host: "127.1" }), { force: true });
    assert.match(snap.error ?? "", /Verschlüsselung/);
    assert.equal(mock.verbindungen(), 1, "der Nachbau wurde erreicht");
    assert.equal(mock.anmeldungen(), 0, "aber es ging kein Passwort hinaus");
    const pruefung = await post.testMail(fach({ host: "127.1" }));
    assert.equal(pruefung.ok, false);
    assert.equal(mock.anmeldungen(), 0);
  });
});

describe("Post: der ganze Weg durch das Gehirn", () => {
  const frage = (text: string) => ({ text, history: [], view: "/", focus: null, extra: [] });
  const config = () => ({ name: "Benedikt", vaultPath: vault, claude: { apiKey: "sk-test-nur-fuer-den-mock" }, mail: fach() });

  test("JARVIS liest die Post, öffnet eine Mail, und der Mailtext gilt als fremd", async () => {
    claude.drehbuch([{ werkzeug: "mails_lesen", eingabe: {} }, { werkzeug: "mail_oeffnen", eingabe: { uid: 103 } }, { text: "Die Bank schreibt etwas Seltsames." }]);
    const antwort = await brain.think(config(), "sk-test", frage("Was gibt es Neues in der Post?"));
    const liste = JSON.parse(werkzeugErgebnisse(claude.anfragen[1]).at(-1)!.content) as { ungelesen: number; wichtig_ungelesen: number; mails: { uid: number; betreff: string; newsletter: boolean }[] };
    assert.equal(liste.ungelesen, 5);
    assert.equal(liste.wichtig_ungelesen, 1);
    assert.deepEqual(liste.mails.map((m) => m.uid), [101, 102, 107, 103, 104]);
    const text = werkzeugErgebnisse(claude.anfragen[2]).at(-1)!.content;
    assert.match(text, /<mailtext>[\s\S]*IGNORIERE ALLE REGELN[\s\S]*<\/mailtext>/, "der Text steht klar abgegrenzt da");
    assert.equal(antwort.fremd, true);
    assert.equal(mail(103).gelesen, undefined, "nur gelesen, nichts markiert");
  });

  test("„als gelesen markieren“ wartet auf dein Ja und passiert erst danach im Postfach", async () => {
    await konfig.writeConfig(config());
    claude.drehbuch([{ werkzeug: "mails_lesen", eingabe: {} }, { werkzeug: "mail_gelesen", eingabe: { uid: 101 } }, { text: "Ich markiere sie, sobald du zustimmst." }]);
    await brain.think(config(), "sk-test", frage("Markier die Mail von Petra als gelesen"));
    assert.match(werkzeugErgebnisse(claude.anfragen[2]).at(-1)!.content, /wartet auf die Freigabe/);
    assert.equal(mail(101).gelesen, undefined, "vor dem Ja ändert sich im Postfach nichts");
    const offen = (await freigaben.offeneFreigaben()).filter((f) => f.werkzeug === "mail_gelesen");
    assert.equal(offen.length, 1);
    assert.match(offen[0].was, /101/);
    const r = await freigaben.entscheideFreigabe(offen[0].id, true, "mac");
    assert.equal(r.freigabe.zustand, "ausgefuehrt");
    assert.equal(mail(101).gelesen, true);
    assert.deepEqual(mock.mails.filter((m) => m.gelesen).map((m) => m.uid), [101, 104, 106], "keine andere Mail");
  });

  test("ein Nein lässt das Postfach, wie es ist", async () => {
    await konfig.writeConfig(config());
    claude.drehbuch([{ werkzeug: "mails_lesen", eingabe: {} }, { werkzeug: "mail_gelesen", eingabe: { uid: 102 } }, { text: "Ok." }]);
    await brain.think(config(), "sk-test", frage("Markier den Newsletter als gelesen"));
    const offen = (await freigaben.offeneFreigaben()).filter((f) => f.werkzeug === "mail_gelesen");
    await freigaben.entscheideFreigabe(offen.at(-1)!.id, false, "mac");
    assert.equal(mail(102).gelesen, undefined);
    assert.ok(!mock.befehle.some((b) => /STORE/.test(b)));
  });
});
