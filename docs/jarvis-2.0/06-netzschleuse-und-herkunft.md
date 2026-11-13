# Schritt 2.6 – Netzschleuse für den Browser und Herkunft im ganzen Gespräch

Stand: 13. November 2026 · Zustand: **Testbereit** (Sandbox mit echtem Chromium geprüft, auf dem Mac mit
Google Chrome noch nicht)

Zwei Restrisiken aus [Schritt 2](04-security-gateway.md#verbleibende-risiken) sind damit geschlossen.

## 1. Netzschleuse (Rest von R-04: DNS-Rebinding innerhalb von Chrome)

**Problem bisher:** JARVIS prüfte jede Adresse, bevor Chrome sie öffnete. Chrome löste den Namen danach
aber selbst noch einmal auf. Ein Angreifer konnte dazwischen umschalten: bei der Prüfung eine Adresse im
Internet, bei der Verbindung die Fritzbox oder JARVIS selbst. WebSockets liefen ganz an der Prüfung vorbei.

**Jetzt:** Das Chrome des Browser-Agenten verbindet nur noch über die Netzschleuse
(`src/lib/server/netzschleuse.ts`), einen kleinen Zwischenrechner auf dem Mac (127.0.0.1, freier Port).

* Chrome löst keinen Namen mehr selbst auf (`--host-resolver-rules=MAP * ~NOTFOUND`). Das macht nur die
  Schleuse, genau einmal je Verbindung, und sie verbindet genau zu der Adresse, die sie geprüft hat.
* Geprüft wird nach denselben Netzregeln wie beim Crawler (`src/lib/netzregeln.ts`): Heimnetz, dieser
  Rechner, Cloud-Metadaten, alle IPv6-Schreibweisen. Schon eine einzige interne Adresse sperrt den Namen.
* Auch Adressen auf diesem Rechner laufen über die Schleuse (`<-loopback>`), ebenso WebSockets,
  Weiterleitungen, Bilder und Skripte. WebRTC darf nicht an ihr vorbei, QUIC ist aus.
* Die Schleuse verlangt ein Kennwort, das bei jedem Start von JARVIS neu gewürfelt wird und das nur dieses
  Chrome bekommt. Andere Programme können sie nicht als Durchgang nutzen.
* Startet die Schleuse nicht, startet Chrome nicht („fail closed“).
* Versuche, ins Heimnetz oder auf diesen Rechner zu gelangen, stehen im Audit-Log (Art „netz“), je Ziel
  höchstens einmal in zehn Minuten.
* Die bisherige Prüfung vor jedem Öffnen bleibt als erste Stufe; sie liefert die verständliche Meldung.
* Das Chrome für PDFs lädt ohnehin nichts aus dem Netz; es kann jetzt zusätzlich keinen Namen auflösen.

**Für dich ändert sich nichts**, außer: Im sichtbaren Fenster („Selbst übernehmen“) öffnet auch dein eigenes
Tippen keine Seiten im Heimnetz mehr.

## 2. Herkunft im ganzen Gespräch

**Problem bisher:** Ob fremde Inhalte (Mail, Webseite, Termin, Nachrichten) im Spiel waren, galt nur für
die laufende Antwort. Fasste JARVIS eine Mail zusammen und kam die nächste Frage, begann die Zählung neu.
Eine eingeschleuste Anweisung in der Zusammenfassung hätte in der nächsten Runde ohne Rückfrage wirken
können (bei der Einstellung „nur nach fremden Inhalten fragen“ und bei Aufträgen an Browser oder Analyst).

**Jetzt:** Jede Antwort, in die Text von Dritten eingeflossen ist, trägt die Markierung `fremd`. Solange so
eine Antwort im Gesprächsverlauf steht (die letzten 24 Sätze, mehr sieht Claude nicht), gilt das ganze
Gespräch als fremd beeinflusst, und das Gateway fragt wie bisher nach. Die Markierung kommt sofort, auch
wenn du die Antwort unterbrichst, und gilt am Mac und in Telegram. Im Gespräch steht unter so einer
Antwort klein „Enthält Inhalte von Dritten“. „Gespräch leeren“ setzt es zurück.

Die Markierung führt die Seite im Verlauf mit. Das Modell kann sie nicht entfernen, weil es den Verlauf
nicht schreibt. Wer den Browser auf dem Mac bedient, könnte es, ist aber ohnehin der Mensch am Mac.

## Tests

| Prüfung | Ergebnis (13. November 2026, Sandbox) |
|---|---|
| `test/module/netzschleuse.test.ts` (26) | bestanden: kein Durchgang ohne Kennwort; 15 interne Ziele als Tunnel abgelehnt, 4 als Abruf; Rebinding (Name wechselt nach der Prüfung) erreicht nur die geprüfte Adresse; Daten laufen durch; Kennwort wird nicht weitergegeben |
| Gegenprobe: Prüfung in der Schleuse testweise entfernt | 16 von 26 Tests schlagen fehl; ohne Kennwortprüfung 1; danach wiederhergestellt |
| `test/module/gateway.test.ts`, 3 neue Tests „Herkunft“ | bestanden, mit Gegenprobe (ohne Markierung kein Ja nötig) |
| Handprüfung `test/hand/schleuse-rauch.ts` mit echtem Chromium | eine erlaubte Seite versucht fetch, WebSocket und Navigation zu einem internen Dienst (direkt, `localhost`, Name → 127.0.0.1): **0 Treffer** beim internen Dienst; Gegenprobe mit erlaubtem Dienst: 2 Treffer |
| Handprüfung `test/hand/browser-rauch.ts` (echter Browser-Agent, nachgebauter Claude) | Agent liest die Testseite; Bild, fetch und WebSocket der Seite zum internen Dienst: 0 Treffer; Sperre steht im Audit-Log, Prüfkette intakt |
| Handprüfung `test/hand/pdf-rauch.ts` | PDF wird weiter erzeugt |
| Auf dem Mac mit Google Chrome | **nicht geprüft**, siehe [Prüfliste](../pruefliste-mac.md) |

## Verbleibende Risiken

| Risiko | Einordnung | Wie weiter |
|---|---|---|
| Google Chrome auf dem Mac könnte sich mit der Schleuse anders verhalten als das Chromium der Sandbox (z. B. Anmeldung an der Schleuse) | Niedrig bis Mittel | Prüfliste Punkt „Browser-Auftrag“; schlägt es fehl, startet Chrome nicht, statt ungeschützt zu laufen |
| Seiten im Internet, die der Agent öffnet, können weiterhin Daten nach außen senden, die das Modell eintippt | Mittel | bleibt durch Freigabepflicht nach fremden Inhalten und die Tipp-Sperren eingedämmt (R-02) |
| Die Herkunft hängt am Gesprächsverlauf; nach 24 Sätzen oder „Gespräch leeren“ ist sie weg, weil Claude diese Sätze dann auch nicht mehr sieht. Das Gedächtnis fragt weiterhin immer | Niedrig | später Herkunft je Eintrag im Projektgedächtnis |
