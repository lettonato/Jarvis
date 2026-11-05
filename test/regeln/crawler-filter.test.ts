// Schutz des Desk-Crawlers gegen Zugriffe ins interne Netz (SSRF), src/lib/server/desk/crawler.ts.
// Bekannte Lücken (R-05) stehen als TODO-Tests: Sie laufen mit, gelten aber nicht als bestanden.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { privateAddress, publicHttps } from "../../src/lib/server/desk/crawler";

describe("Crawler: Adressform", () => {
  test("nur https mit Domainnamen", () => {
    assert.ok(publicHttps("https://projekt.example/"));
    assert.equal(publicHttps("http://projekt.example/"), null);
    assert.equal(publicHttps("https://10.0.0.1/"), null);
    assert.equal(publicHttps("https://[::1]/"), null);
    assert.equal(publicHttps("https://localhost/"), null);
    assert.equal(publicHttps("https://metadata.google.internal/"), null);
    assert.equal(publicHttps("https://drucker.local/"), null);
    assert.equal(publicHttps("kein-link"), null);
  });
});

describe("Crawler: aufgelöste IP-Adressen", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.178.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:169.254.169.254", "::ffff:127.0.0.1"]) {
    test(`sperrt ${ip}`, () => assert.equal(privateAddress(ip), true));
  }
  for (const ip of ["8.8.8.8", "1.1.1.1", "2a00:1450:4001::1"]) {
    test(`erlaubt öffentliche Adresse ${ip}`, () => assert.equal(privateAddress(ip), false));
  }
  for (const ip of ["168.63.129.16", "64:ff9b::a9fe:a9fe", "::ffff:a9fe:a9fe", "2002:a9fe:a9fe::1", "198.18.0.1", "192.0.0.1"]) {
    test(`sperrt ${ip}`, { todo: "Bekannte Lücke R-05, Behebung in Schritt 2" }, () => assert.equal(privateAddress(ip), true));
  }
  test("Verbindung nutzt dieselbe geprüfte IP (kein DNS-Rebinding)", { todo: "Bekannte Lücke R-05: lookup() und fetch() lösen getrennt auf" }, () => {
    assert.fail("Noch nicht umgesetzt: readSite hält die geprüfte IP nicht fest.");
  });
});
