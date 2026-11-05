// Feste Sperren des Browser-Agenten (src/lib/browser.ts). Bekannte Lücken stehen als TODO-Tests mit
// Risikonummer aus docs/jarvis-2.0/02-risiken.md: Sie laufen mit, gelten aber nicht als bestanden.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { clickProblem, enterProblem, typeProblem, urlProblem, type ElementInfo } from "../../src/lib/browser";

const el = (over: Partial<ElementInfo> = {}): ElementInfo => ({
  tag: "button",
  type: "",
  role: "",
  text: "",
  name: "",
  autocomplete: "",
  inForm: false,
  formMethod: "",
  formHasPassword: false,
  formHasPayment: false,
  isSubmit: false,
  isSearch: false,
  download: false,
  editable: false,
  ...over,
});

describe("Browser: welche Adressen geöffnet werden", () => {
  for (const url of ["https://www.idealo.de/", "http://example.com/seite?x=1"]) {
    test(`erlaubt öffentliche Seite ${url}`, () => assert.equal(urlProblem(url), null));
  }
  for (const url of [
    "file:///etc/passwd",
    "javascript:alert(1)",
    "chrome://settings",
    "https://nutzer:geheim@example.com/",
    "http://localhost:3000/",
    "http://127.0.0.1:3000/api/einstellungen",
    "http://192.168.178.1/",
    "http://10.0.0.1/",
    "http://172.16.5.4/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://0x7f000001/",
    "http://2130706433/",
    "http://fritz.box/",
    "http://router/",
    "http://drucker.local/",
  ]) {
    test(`sperrt ${url}`, () => assert.notEqual(urlProblem(url), null));
  }

  // R-04: Der Filter prüft nur den Namen, nicht die IP-Adresse, auf die der Name zeigt.
  for (const url of ["http://192.168.178.1.nip.io/", "http://127.0.0.1.nip.io:3000/", "http://localtest.me:3000/"]) {
    test(`sperrt Name mit privater Ziel-IP ${url}`, { todo: "Bekannte Lücke R-04, Behebung in Schritt 2" }, () => assert.notEqual(urlProblem(url), null));
  }
  test("sperrt Azure-WireServer 168.63.129.16", { todo: "Bekannte Lücke R-04, Behebung in Schritt 2" }, () => assert.notEqual(urlProblem("http://168.63.129.16/"), null));
});

describe("Browser: was nie geklickt wird", () => {
  for (const text of ["Jetzt kaufen", "Zahlungspflichtig bestellen", "In den Warenkorb", "Zur Kasse", "Absenden", "Konto löschen", "Anmelden", "Place order", "Subscribe", "Bestätigen"]) {
    test(`Knopf „${text}“ ist gesperrt`, () => assert.notEqual(clickProblem(el({ text })), null));
  }
  test("normaler Knopf ist erlaubt", () => assert.equal(clickProblem(el({ text: "Weitere Ergebnisse" })), null));
  test("Formular per POST wird nicht abgeschickt", () => assert.notEqual(clickProblem(el({ text: "Weiter", isSubmit: true, inForm: true, formMethod: "post" })), null));
  test("Suche per GET ist erlaubt", () => assert.equal(clickProblem(el({ text: "Los", isSubmit: true, inForm: true, formMethod: "get" })), null));
  test("Formular mit Passwortfeld wird nie abgeschickt", () =>
    assert.notEqual(clickProblem(el({ text: "Los", isSubmit: true, inForm: true, formMethod: "get", formHasPassword: true })), null));
  test("Downloads und Datei-Uploads sind gesperrt", () => {
    assert.notEqual(clickProblem(el({ tag: "a", text: "PDF", download: true })), null);
    assert.notEqual(clickProblem(el({ tag: "input", type: "file" })), null);
  });
});

describe("Browser: was nie eingetippt wird", () => {
  test("Passwortfeld", () => assert.notEqual(typeProblem(el({ tag: "input", type: "password", editable: true })), null));
  test("Einmalcode über autocomplete", () => assert.notEqual(typeProblem(el({ tag: "input", type: "text", autocomplete: "one-time-code", editable: true })), null));
  for (const name of ["iban", "kartennummer", "cvc", "tan", "pin"]) {
    test(`Feld „${name}“`, () => assert.notEqual(typeProblem(el({ tag: "input", type: "text", name, editable: true })), null));
  }
  test("normales Suchfeld ist erlaubt", () => assert.equal(typeProblem(el({ tag: "input", type: "search", name: "q", editable: true })), null));
  test("Enter nur in Suchen", () => {
    assert.equal(enterProblem(el({ isSearch: true })), null);
    assert.notEqual(enterProblem(el({ inForm: true, formMethod: "post" })), null);
    assert.notEqual(enterProblem(el({ isSearch: true, formHasPayment: true })), null);
  });
});
