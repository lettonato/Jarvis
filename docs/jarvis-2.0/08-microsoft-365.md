# Microsoft 365: Termine aus Outlook lesen (Schritt D1)

Stand 13. November 2026. Dieser Schritt ist **nur gegen ein nachgebautes Microsoft geprüft**
(`test/mocks/microsoft-mock.ts`). Gegen euer echtes Microsoft 365 ist noch nichts gelaufen. Das passiert zum
ersten Mal, wenn eure IT die Anwendung angelegt hat und Benedikt sich am Mac selbst anmeldet.

## Was es kann, und was nicht

JARVIS liest die Termine aus deinem Outlook-Kalender für heute und die nächsten 31 Tage und zeigt sie im Raum
„Kalender“ neben den Terminen des Macs.

* **Nur lesen.** Es gibt keinen Weg, in Outlook etwas einzutragen, zu ändern, zu- oder abzusagen oder zu
  löschen. An Microsoft Graph gehen nur lesende Anfragen an zwei Adressen: dein eigenes Konto (`/me`, für den
  Namen des Kontos) und die Kalenderansicht (`/me/calendarView`).
* **Nur der Kalender.** Mails, Dateien (OneDrive, SharePoint), Teams, Kontakte und die Kalender anderer
  Personen liest JARVIS darüber nicht. Auch keine Anwesenheit und keine Online-Zeiten.
* **Nur das Nötigste je Termin:** Titel, Beginn, Ende, ganztägig, abgesagt, Ort und die Markierung „privat“.
  Der Text der Einladung, die Teilnehmer und Anhänge werden nicht angefragt.

## Die festen Regeln

1. **Geringste Rechte.** JARVIS bittet Microsoft um genau drei Rechte: `offline_access` (angemeldet bleiben),
   `User.Read` (zeigen, welches Konto verbunden ist) und `Calendars.ReadBasic` (Titel, Zeit, Ort; ohne Text
   und Anhänge). `Calendars.ReadBasic` ist laut Microsoft das geringste Recht für die Kalenderansicht.
2. **Outlook-Termine bleiben am Bildschirm des Macs,** bis du unter Einstellungen → Microsoft 365 den Haken
   „Outlook-Termine auch im Gespräch und über Telegram“ setzt. Ohne den Haken gehen weder Titel noch Ort noch
   Uhrzeit eines Outlook-Termins an das KI-Modell (Anthropic), an Telegram oder in eine gesprochene Antwort.
   JARVIS sagt dann nur, **dass** es Outlook-Termine gibt, und wie viele („Dazu kommen 2 Termine aus Outlook,
   die ich hier nicht nenne“), damit er keinen Tag „frei“ nennt, der es nicht ist. Die Erinnerung kurz vor
   einem Termin lautet dann „In 10 Minuten: ein Termin aus Outlook.“
3. **Privates bleibt privat.** Termine, die in Outlook als privat, vertraulich oder persönlich markiert sind,
   zeigt JARVIS als „Privater Termin“, ohne Titel und Ort, auch am Bildschirm und auch mit dem Haken.
4. **Ein Verzeichnis.** JARVIS meldet sich nur am Verzeichnis eurer Firma an. Die Sammeladressen von Microsoft
   („common“, „organizations“, „consumers“) nimmt er nicht an.
5. **Kein Passwort in JARVIS.** Die Anmeldung läuft mit einem Code: JARVIS zeigt einen Code und die Adresse der
   Anmeldeseite von Microsoft, du gibst den Code dort ein und meldest dich bei Microsoft an. JARVIS sieht dein
   Passwort nie. Die Adresse zeigt er nur, wenn sie verschlüsselt (https) bei Microsoft liegt.
6. **Schlüssel.** Der kurzlebige Zugangsschlüssel liegt nur im Arbeitsspeicher. Der Schlüssel zum
   Angemeldetbleiben liegt bei den anderen Zugangsdaten (Datei nur für dich lesbar oder macOS-Schlüsselbund,
   siehe [05-zugangsdaten.md](05-zugangsdaten.md)). Keiner von beiden geht an die Seite im Browser, an das
   KI-Modell oder in ein Protokoll.
7. **Der Schlüssel geht nur an Graph.** Eine Folgeseite an einer anderen Adresse wird nicht geholt, einer
   Umleitung folgt JARVIS nicht.
8. **Feste Sätze.** Was bei Microsoft schiefgeht, kommt als fester Satz von JARVIS an (`MICROSOFT_SATZ`). Der
   Text einer Antwort von Microsoft steht nie in einer Meldung oder Datei.
9. **Nichts wird geraten.** Eine Zeit ohne die Angabe UTC, ein Termin ohne Nummer, ein abgesagter Termin:
   kein Termin. Kann JARVIS Outlook gerade nicht lesen, sagt er das dazu („Die Termine aus Outlook fehlen
   gerade.“), statt den Kalender als vollständig auszugeben.

## Was eure IT einmal anlegt (Microsoft Entra)

Das ist eine Änderung im Verzeichnis eurer Firma und deshalb nichts, was JARVIS oder ich tun: Eure IT macht es,
wenn Benedikt es will.

1. Im Entra Admin Center eine **App-Registrierung** anlegen, Name zum Beispiel „JARVIS (Benedikt)“.
   Unterstützte Kontotypen: **nur Konten in diesem Organisationsverzeichnis** (ein Mandant).
2. Unter „Authentifizierung“ die **öffentlichen Clientflows erlauben** (Anmeldung mit Gerätecode). Eine
   Umleitungsadresse und ein Clientgeheimnis braucht es nicht; bitte keines anlegen.
3. Unter „API-Berechtigungen“ für Microsoft Graph genau diese **delegierten** Berechtigungen eintragen:
   `User.Read`, `Calendars.ReadBasic`, `offline_access`. Keine Anwendungsberechtigungen, nichts mit „Write“.
   Ob die Zustimmung für das Konto durch einen Administrator erteilt werden muss, hängt von euren
   Einstellungen ab.
4. Wer es enger will: die Anwendung unter „Unternehmensanwendungen“ auf **Benedikts Konto** beschränken
   („Zuweisung erforderlich“).
5. Benedikt bekommt zwei Nummern: die **Verzeichnis-ID (Mandant)** und die **Anwendungs-ID (Client)**. Beide
   sind keine Geheimnisse, aber auch nichts für fremde Augen.

Danach am Mac: Einstellungen → Microsoft 365, beide Nummern eintragen, „Bei Microsoft anmelden“, Code auf der
Seite von Microsoft eingeben. Ab da stehen die Termine im Raum „Kalender“.

Wieder loswerden: „Abmelden“ löscht die Anmeldung von diesem Mac, „Microsoft 365 ganz entfernen“ auch die
Nummern. Bei Microsoft selbst bleibt die Zustimmung bestehen, bis sie dort jemand entfernt (eure IT unter
„Unternehmensanwendungen“, oder Benedikt unter myapps.microsoft.com).

## Wichtig, wenn das Firmenkonto auch in der Kalender-App des Macs steht

Die Kalender-App des Macs kann ein Exchange- oder Microsoft-365-Konto selbst einbinden. Dann liest JARVIS
diese Termine schon über den Mac, wie jeden anderen Mac-Kalender: mit Titel, auch im Gespräch und über
Telegram, und ohne die Regel für private Termine. Das war schon vor diesem Schritt so und ändert sich
durch ihn nicht.

* Kommt derselbe Termin über beide Wege (gleicher Titel, Beginn und Ende), zeigt JARVIS ihn einmal, und zwar
  den Eintrag des Macs.
* Wer will, dass Firmentermine wirklich nur am Bildschirm stehen und Privates verdeckt ist, nimmt das
  Firmenkonto aus der Kalender-App des Macs (oder blendet es dort aus) und verbindet es nur hier.

## Geprüft und nicht geprüft

**Bei Microsoft nachgelesen (Microsoft Learn, 13.11.2026):** die Anmeldung mit Code (Adressen, Felder,
Fehlerwörter beim Warten), das Erneuern samt neuem Schlüssel, `Calendars.ReadBasic` als geringstes Recht,
`startDateTime`/`endDateTime` der Kalenderansicht, Zeiten in UTC ohne besondere Kopfzeile, die Form der
Fehlerantworten und die Statuscodes 401, 403, 429 und 503, die Felder `isCancelled`, `isAllDay` und
`sensitivity`, und dass eine Folgeseite über die ganze Adresse aus `@odata.nextLink` geholt wird.

**Angenommen, nicht nachgelesen und nicht gegen den echten Dienst geprüft:**

* die genaue Schreibweise der Zeiten (`2026-11-16T09:00:00.0000000`). JARVIS nimmt Sekundenbruchteile
  beliebiger Länge an; weicht die Form ab, fehlt der Termin, er wird nicht falsch angezeigt;
* dass die Kalenderansicht `$select` und `$top` annimmt und in Seiten liefert. Lehnt Graph das ab, steht im
  Raum Kalender „Microsoft hat unerwartet geantwortet“, und es fehlen alle Outlook-Termine, bis das behoben ist;
* ganztägige Termine: JARVIS nimmt das Datum, wie Graph es nennt. Liefert Graph Mitternacht in einer anderen
  Zone umgerechnet auf UTC, könnte ein ganztägiger Termin um einen Tag verrutschen. Das zeigt erst der echte
  Dienst (Prüfliste N7);
* wie sich euer Verzeichnis bei der Anmeldung mit Code verhält (Richtlinien für bedingten Zugriff können sie
  sperren; dann steht „Microsoft kennt diese Anwendung … nicht, oder die Anmeldung mit Code ist für sie
  nicht erlaubt“).

## Bekannte Grenzen

* Höchstens 500 Outlook-Termine für die 31 Tage. Sind es mehr, steht das im Raum Kalender, und JARVIS sagt es
  im Gespräch dazu.
* Nur dein eigener Hauptkalender, keine weiteren und keine freigegebenen Kalender.
* Ist der Mac-Kalender noch nicht verbunden (macOS hat noch nicht gefragt), zeigt der Raum Kalender die
  Outlook-Termine trotzdem; im Gespräch heißt es dann aber weiter „Dein Kalender ist noch nicht verbunden“.
* Der Stand wird höchstens alle fünf Minuten neu gelesen; „Neu laden“ im Raum Kalender liest sofort.
* Andere Einstellungen von JARVIS werden noch nach dem Muster „lesen, ändern, speichern“ ohne Sperre
  geschrieben. Für den Abschnitt Microsoft 365 ist das behoben (`aendereConfig`); für die übrigen Abschnitte
  steht es als offener Punkt in Bereich J.

## Was als Nächstes käme (nicht gebaut)

Mails über Graph lesen, Dateien finden, Teams-Besprechungen, Termine eintragen. Jedes davon braucht weitere
Rechte bei Microsoft und Benedikts Entscheidung, und alles Schreibende zusätzlich die Freigabe im Einzelfall
über das Gateway.
