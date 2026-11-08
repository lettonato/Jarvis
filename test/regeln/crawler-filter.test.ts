// Schutz des Desk-Crawlers gegen Zugriffe ins interne Netz (SSRF), src/lib/server/desk/crawler.ts.
// R-05 ist seit Schritt 2 behoben; die Tests dazu sind normale Tests.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { privateAddress, publicHttps, readSite } from "../../src/lib/server/desk/crawler";
import { NetzSperre, sichererAbruf } from "../../src/lib/server/netz";

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
  // R-05 (behoben in Schritt 2): Sonderbereiche und IPv6-Schreibweisen mit eingebetteter IPv4.
  for (const ip of ["168.63.129.16", "64:ff9b::a9fe:a9fe", "64:ff9b::7f00:1", "::ffff:a9fe:a9fe", "::ffff:7f00:1", "2002:a9fe:a9fe::1", "2002:c0a8:b201::1", "198.18.0.1", "192.0.0.1", "192.0.2.10", "fec0::1", "ff02::1", "2001:db8::1", "::a9fe:a9fe", "[::1]", "fe80::1%eth0"]) {
    test(`sperrt ${ip}`, () => assert.equal(privateAddress(ip), true));
  }
  test("öffentliche Adressen in eingebetteter Form bleiben erlaubt", () => {
    assert.equal(privateAddress("::ffff:8.8.8.8"), false);
    assert.equal(privateAddress("64:ff9b::808:808"), false);
    assert.equal(privateAddress("2002:808:808::1"), false);
  });
  test("unbekanntes Format ist gesperrt", () => {
    assert.equal(privateAddress("nicht-ip"), true);
    assert.equal(privateAddress("1.2.3"), true);
    assert.equal(privateAddress("1:2:3"), true);
  });
});

describe("Crawler: Abruf ohne DNS-Rebinding", () => {
  // Ein Angreifer-DNS, das beim ersten Mal eine öffentliche Adresse nennt und danach 127.0.0.1. Früher
  // prüfte JARVIS die erste Antwort und verband sich mit der zweiten. Jetzt gibt es nur noch eine
  // Auflösung, und sie ist die geprüfte.
  test("verbindet nur zur geprüften Adresse, ein lokaler Dienst wird nie erreicht", async () => {
    let erreicht = 0;
    const server = createServer((_req, res) => {
      erreicht++;
      res.end("intern");
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as AddressInfo;
    let fragen = 0;
    const rebinding = async () => {
      fragen++;
      return [{ address: fragen === 1 ? "203.0.113.10" : "127.0.0.1", family: 4 }];
    };
    try {
      await assert.rejects(sichererAbruf(`http://rebind.example:${port}/`, { lookup: rebinding, nurHttps: false, timeoutMs: 1500 }));
      assert.equal(erreicht, 0, "der interne Dienst wurde nicht erreicht");
      assert.equal(fragen, 1, "nur eine Namensauflösung");
    } finally {
      server.close();
    }
  });

  test("Name, der direkt auf 127.0.0.1 zeigt, wird nicht abgerufen", async () => {
    const lokal = async () => [{ address: "127.0.0.1", family: 4 }];
    await assert.rejects(sichererAbruf("https://projekt.example/", { lookup: lokal }), NetzSperre);
  });

  test("readSite meldet die Sperre als Fehler, nicht als Inhalt", async () => {
    const lokal = async () => [{ address: "10.0.0.7", family: 4 }];
    const site = await readSite("https://projekt.example/", { lookup: lokal });
    assert.ok("error" in site && site.error && /Heimnetz/.test(site.error));
  });

  test("http und Adressen mit Zugangsdaten werden gar nicht erst abgerufen", async () => {
    await assert.rejects(sichererAbruf("http://projekt.example/"), NetzSperre);
    await assert.rejects(sichererAbruf("https://a:b@projekt.example/"), NetzSperre);
    await assert.rejects(sichererAbruf("https://router.fritz.box/"), NetzSperre);
  });
});
