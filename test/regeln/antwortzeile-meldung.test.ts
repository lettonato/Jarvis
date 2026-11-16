// Die Zeile über der Leiste (src/lib/antwortzeile.ts): Sie zeigt, was JARVIS zuletzt geantwortet hat. Meldet er
// etwas zum Mikrofon („Ich darf das Mikrofon nicht benutzen …“), steht das dort, aber nur, bis das Gespräch
// weitergeht: Wer danach tippt, sieht die Antwort und einen kurzen Verweis auf die Meldung. Vorher blieb die Meldung
// für immer stehen, und die Antwort stand nur im aufgeklappten Gespräch.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { fortschritt, MERK_START, merke, merkeBeide, MERKE_START, zeile, type Merk, type Merke } from "../../src/lib/antwortzeile";

const GESPERRT = "Ich darf das Mikrofon nicht benutzen.";
const NETZ = "Für die Spracherkennung braucht der Browser gerade Internet.";
const TON = "Klick einmal irgendwo auf die Seite, dann darf ich dir auch laut antworten.";
const antwort = { text: "Heute hast du einen Termin." };
const basis = { fehler: null as string | null, hinweis: null as string | null, merke: MERKE_START, weit: -1, hoert: false, interim: "", last: undefined as { text: string; live?: boolean; status?: string } | undefined, label: "Bereit" };
// Ein Fehler, der beim Stand „weit“ neu kam.
const mitFehler = (text: string, weit: number): Merke => merkeBeide(MERKE_START, text, null, weit);

describe("Zeile über der Leiste", () => {
  test("ohne Meldung: die Antwort, sonst der Zustand; beim Zuhören das Gehörte, beim Nachdenken „Denke nach …“", () => {
    assert.deepEqual(zeile(basis), { art: "antwort", text: "Bereit", verdeckt: false });
    assert.deepEqual(zeile({ ...basis, last: antwort, weit: 2 }), { art: "antwort", text: antwort.text, verdeckt: false });
    assert.deepEqual(zeile({ ...basis, hoert: true, interim: "meine Ter" }), { art: "hoert", text: "meine Ter", verdeckt: false });
    assert.deepEqual(zeile({ ...basis, hoert: true }), { art: "hoert", text: "…", verdeckt: false });
    assert.deepEqual(zeile({ ...basis, last: { text: "", live: true } }), { art: "denkt", text: "Denke nach …", verdeckt: false });
    assert.deepEqual(zeile({ ...basis, last: { text: "", live: true, status: "Lese den Kalender" } }), { art: "denkt", text: "Lese den Kalender …", verdeckt: false });
  });

  test("eine Meldung steht in der Zeile, solange das Gespräch seither nicht weitergegangen ist", () => {
    // Beim Öffnen der Seite: noch kein Zug.
    assert.deepEqual(merke(MERK_START, GESPERRT, -1), { text: GESPERRT, bis: -1, weg: null });
    assert.deepEqual(zeile({ ...basis, fehler: GESPERRT, merke: mitFehler(GESPERRT, -1) }), { art: "fehler", text: GESPERRT, verdeckt: false });
    // Mitten im Gespräch: Die Meldung verdeckt die letzte Antwort.
    assert.deepEqual(zeile({ ...basis, fehler: GESPERRT, merke: mitFehler(GESPERRT, 5), weit: 5, last: antwort }), { art: "fehler", text: GESPERRT, verdeckt: false });
    // Ein Hinweis genauso; die Zeile sagt, was von beidem es ist (rot oder ocker).
    assert.deepEqual(zeile({ ...basis, hinweis: TON, merke: merkeBeide(MERKE_START, null, TON, 5), weit: 5, last: antwort }), { art: "hinweis", text: TON, verdeckt: false });
  });

  test("geht das Gespräch weiter, zeigt die Zeile wieder die Antwort; die Meldung ist dann nur noch vermerkt", () => {
    const m = mitFehler(GESPERRT, -1);
    // Du tippst eine Frage: JARVIS denkt nach, dann antwortet er.
    assert.deepEqual(zeile({ ...basis, fehler: GESPERRT, merke: m, weit: 2, last: { text: "", live: true } }), { art: "denkt", text: "Denke nach …", verdeckt: true });
    assert.deepEqual(zeile({ ...basis, fehler: GESPERRT, merke: m, weit: 3, last: antwort }), { art: "antwort", text: antwort.text, verdeckt: true });
  });

  test("dieselbe Meldung noch einmal (der Browser fragt bei jedem Tastendruck neu) verdrängt die Antwort nicht wieder", () => {
    const m = mitFehler(GESPERRT, -1);
    // Dieselben Worte: Es bleibt dasselbe Merkzeichen, auch wenn das Gespräch inzwischen weiter ist.
    assert.equal(merkeBeide(m, GESPERRT, null, 7), m);
    assert.equal(zeile({ ...basis, fehler: GESPERRT, merke: m, weit: 7, last: antwort }).art, "antwort");
  });

  test("verschwindet eine Meldung kurz (ohne Netz bei jedem neuen Versuch) und kommt wieder, ist es dieselbe", () => {
    let m: Merk = merke(MERK_START, NETZ, 3);
    // Das Gespräch geht weiter; dann nimmt der Browser die Meldung weg und bringt sie gleich wieder.
    m = merke(m, null, 5);
    assert.deepEqual(m, { text: NETZ, bis: 3, weg: 5 });
    assert.equal(merke(m, null, 5), m, "weiter weg: nichts Neues");
    // Im Bild, in dem sie wieder da ist, flackert nichts, auch wenn das Merkzeichen noch „weg“ sagt.
    assert.equal(zeile({ ...basis, fehler: NETZ, merke: { ...MERKE_START, fehler: m }, weit: 5, last: antwort }).art, "antwort");
    m = merke(m, NETZ, 5);
    assert.deepEqual(m, { text: NETZ, bis: 3, weg: null }, "dieselbe Meldung, seit dem alten Stand");
    assert.equal(zeile({ ...basis, fehler: NETZ, merke: { ...MERKE_START, fehler: m }, weit: 5, last: antwort }).art, "antwort");
  });

  test("ging das Gespräch weiter, während sie weg war, ist sie beim Wiederkommen neu; eine andere Meldung auch", () => {
    let m: Merk = merke(MERK_START, NETZ, 3);
    m = merke(m, null, 5);
    m = merke(m, NETZ, 9);
    assert.deepEqual(m, { text: NETZ, bis: 9, weg: null });
    assert.deepEqual(zeile({ ...basis, fehler: NETZ, merke: { ...MERKE_START, fehler: m }, weit: 9, last: antwort }), { art: "fehler", text: NETZ, verdeckt: false });
    m = merke(m, GESPERRT, 11);
    assert.deepEqual(m, { text: GESPERRT, bis: 11, weg: null });
    assert.equal(zeile({ ...basis, fehler: GESPERRT, merke: { ...MERKE_START, fehler: m }, weit: 11, last: antwort }).art, "fehler");
  });

  test("Fehler und Hinweis haben je ihr Merkzeichen: Verschwindet der Fehler, gilt ein alter Hinweis nicht als neu", () => {
    // Der Hinweis zum Ton steht seit Stand 1 da; später kommt ein Fehler dazu, das Gespräch geht weiter.
    let m = merkeBeide(MERKE_START, null, TON, 1);
    m = merkeBeide(m, NETZ, TON, 5);
    assert.deepEqual(zeile({ ...basis, fehler: NETZ, hinweis: TON, merke: m, weit: 5, last: antwort }), { art: "fehler", text: NETZ, verdeckt: false }, "der neue Fehler steht vorn");
    assert.equal(zeile({ ...basis, fehler: NETZ, hinweis: TON, merke: m, weit: 7, last: antwort }).art, "antwort");
    // Der Fehler verschwindet; der Hinweis ist immer noch der alte.
    m = merkeBeide(m, null, TON, 7);
    assert.deepEqual(zeile({ ...basis, hinweis: TON, merke: m, weit: 7, last: antwort }), { art: "antwort", text: antwort.text, verdeckt: true });
    // Ein alter Fehler und ein neuer Hinweis: Der Hinweis steht vorn.
    m = merkeBeide(mitFehler(GESPERRT, -1), GESPERRT, TON, 7);
    assert.deepEqual(zeile({ ...basis, fehler: GESPERRT, hinweis: TON, merke: m, weit: 7, last: antwort }), { art: "hinweis", text: TON, verdeckt: false });
  });

  test("das Gespräch von gestern zählt nicht als „weitergegangen“: Nach dem Neuladen steht die Meldung vorn", () => {
    const zuege = [
      { id: 3, alt: true },
      { id: 4, alt: true },
    ];
    assert.equal(fortschritt(zuege), -1);
    assert.equal(fortschritt([]), -1);
    assert.equal(zeile({ ...basis, fehler: GESPERRT, merke: mitFehler(GESPERRT, fortschritt(zuege)), weit: fortschritt(zuege), last: antwort }).art, "fehler");
  });

  test("das Gespräch geht mit jedem neuen Zug weiter und noch einmal, wenn eine Antwort fertig wird", () => {
    const frage = [{ id: 5 }];
    const schreibt = [{ id: 5 }, { id: 6, live: true }];
    const fertig = [{ id: 5 }, { id: 6 }];
    const naechste = [{ id: 5 }, { id: 6 }, { id: 7 }];
    const weiten = [frage, schreibt, fertig, naechste].map(fortschritt);
    assert.deepEqual(weiten, [...weiten].sort((a, b) => a - b), "es geht nie zurück");
    assert.equal(new Set(weiten).size, 4, "jeder dieser Schritte zählt");
    // Kommt etwas dazu, während eine Antwort noch entsteht (eine Erinnerung), geht es auch weiter.
    assert.ok(fortschritt([...schreibt, { id: 7 }]) > fortschritt(schreibt));
    assert.ok(fortschritt([{ id: 5 }, { id: 6 }, { id: 7 }]) > fortschritt([...schreibt, { id: 7 }]));
  });

  test("kommt die Meldung erst, während JARVIS schon antwortet, zeigt die Zeile die Antwort, sobald sie fertig ist", () => {
    // Der erste Klick auf die Seite schickt eine Frage ab (ein Vorschlag wie „Meine Termine“) und weckt zugleich
    // das Mikrofon; dessen Meldung kommt einen Augenblick später als die Frage.
    const schreibt = [{ id: 0 }, { id: 1, live: true }];
    const m = mitFehler(GESPERRT, fortschritt(schreibt));
    assert.equal(zeile({ ...basis, fehler: GESPERRT, merke: m, weit: fortschritt(schreibt), last: { text: "", live: true } }).art, "fehler");
    const fertig = [{ id: 0 }, { id: 1 }];
    assert.deepEqual(zeile({ ...basis, fehler: GESPERRT, merke: m, weit: fortschritt(fertig), last: antwort }), { art: "antwort", text: antwort.text, verdeckt: true });
  });

  test("passt das Merkzeichen nicht zur Meldung, gilt die Meldung als neu", () => {
    assert.equal(zeile({ ...basis, fehler: GESPERRT, merke: MERKE_START, weit: 4, last: antwort }).art, "fehler");
    assert.equal(zeile({ ...basis, hinweis: TON, merke: mitFehler(GESPERRT, -1), weit: 4, last: antwort }).art, "hinweis");
  });

  test("ändert sich nichts, bleibt es dasselbe Merkzeichen (sonst zeichnete die Leiste endlos neu)", () => {
    assert.equal(merkeBeide(MERKE_START, null, null, 3), MERKE_START);
    const m = merkeBeide(MERKE_START, GESPERRT, TON, 3);
    assert.equal(merkeBeide(m, GESPERRT, TON, 9), m);
  });
});
