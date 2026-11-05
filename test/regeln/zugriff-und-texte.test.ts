// Zugriffsschutz der API (src/lib/server/guard.ts), Telegram-Regeln (src/lib/telegram.ts) und
// Dokument-Regeln (src/lib/documents.ts).

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { guard } from "../../src/lib/server/guard";
import { findToken, isClock, splitMessage, tokenProblem } from "../../src/lib/telegram";
import { fileStem, safeUrl } from "../../src/lib/documents";

const req = (headers: Record<string, string>) => new Request("http://127.0.0.1:3000/api/test", { headers });

describe("API-Schutz guard()", () => {
  test("eigene Seite darf lesen", () => assert.equal(guard(req({ host: "127.0.0.1:3000" })), null));
  test("eigene Seite darf mit x-jarvis schreiben", () => assert.equal(guard(req({ host: "localhost:3000", origin: "http://localhost:3000", "x-jarvis": "1" }), { write: true }), null));
  test("fremder Host-Name wird abgelehnt (DNS-Rebinding)", () => assert.equal(guard(req({ host: "angreifer.example:3000" }))?.status, 403));
  test("Name, der auf 127.0.0.1 zeigt, wird abgelehnt", () => assert.equal(guard(req({ host: "127.0.0.1.nip.io:3000" }))?.status, 403));
  test("Anfrage einer fremden Seite wird abgelehnt", () => assert.equal(guard(req({ host: "127.0.0.1:3000", "sec-fetch-site": "cross-site" }))?.status, 403));
  test("fremde Herkunft (Origin) wird abgelehnt", () => assert.equal(guard(req({ host: "127.0.0.1:3000", origin: "https://angreifer.example" }))?.status, 403));
  test("kaputte Herkunft wird abgelehnt", () => assert.equal(guard(req({ host: "127.0.0.1:3000", origin: "nicht-url" }))?.status, 403));
  test("Schreiben ohne x-jarvis wird abgelehnt", () => assert.equal(guard(req({ host: "127.0.0.1:3000" }), { write: true })?.status, 403));
});

describe("Telegram-Regeln", () => {
  // Zusammengesetzt, damit der Secret-Scan den erfundenen Testschlüssel nicht als echten meldet.
  const token = ["123456789", "AAH-abcdefghijklmnopqrstuvwxyz012345"].join(":");
  test("Schlüssel wird aus der BotFather-Nachricht gefischt", () => {
    assert.equal(findToken(`Use this token to access the HTTP API:\n${token}\nKeep it secure`), token);
    assert.equal(findToken(token.replace(":", ": ")), token, "Leerzeichen vom Abtippen");
  });
  test("ohne gültigen Schlüssel gibt es einen Hinweis", () => {
    assert.equal(findToken("hallo"), null);
    assert.notEqual(tokenProblem("12345"), null);
  });
  test("Briefing-Uhrzeit nur als HH:MM", () => {
    assert.equal(isClock("07:30"), true);
    assert.equal(isClock("24:00"), false);
    assert.equal(isClock("7:30"), false);
  });
  test("lange Nachrichten werden unter dem Telegram-Limit geteilt", () => {
    const parts = splitMessage("Satz. ".repeat(2000));
    assert.ok(parts.length > 1);
    for (const p of parts) assert.ok(p.length <= 4000);
  });
});

describe("Dokument-Regeln", () => {
  test("Quellen nur als http(s)-Adressen", () => {
    assert.equal(safeUrl("https://example.com/a"), "https://example.com/a");
    assert.equal(safeUrl("javascript:alert(1)"), null);
    assert.equal(safeUrl("file:///etc/passwd"), null);
    assert.equal(safeUrl(42), null);
  });
  test("Dateiname enthält keine Pfadzeichen", () => {
    const stem = fileStem("../../etc/passwd: <Bericht>", "2026-11-05");
    assert.ok(!/[\\/:*?"<>|]/.test(stem), stem);
    assert.ok(stem.startsWith("2026-11-05 "));
    assert.equal(fileStem("...", "2026-11-05"), "2026-11-05 Dokument");
  });
});
