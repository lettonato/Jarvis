# Tests

```
npm test            # alle Tests (Node-Testläufer mit tsx)
npm run pruefen     # Lint, Typprüfung und Tests
```

* `test/regeln/` prüft feste Regeln ohne Netz: Desk und Rückfrage, Browser-Sperren, Crawler-Adressfilter,
  API-Schutz, Telegram- und Dokument-Regeln, die Tageslage für „Heute“ (`heute.test.ts`: Reihenfolge von
  „Wartet auf dich“, überfällige Aufgaben, Projekte mit Frist, Termine mit Projektbezug) und die Routinen
  (`routinen.test.ts`: Projekte im Briefing, Tagesabschluss, was dabei nicht über Telegram gehen darf) und
  die Agentensteuerung (`agenten.test.ts`: Zustände, Vorrang von Not-Aus und Sperre, erlaubte Knöpfe, Kosten
  je Agent). `zeitplan.test.ts` prüft die Regeln des gemeinsamen Zeitplans (fällig, nachholen, auch über
  Mitternacht), `metalle.test.ts` die Rechnung des Edelmetall-Agenten mit von Hand gerechneten Zahlen (Trend,
  Hoch und Tief, Fonds statt Feinunze). `modelle.test.ts` prüft die Modellwahl und die Preisrechnung gegen Zahlen aus der Preisliste.
  `projekt-risiken.test.ts` prüft, was die Karte eines Projekts über offene Risiken weiß (über der Frist,
  nächste Frist, lange unverändert, Text von Dritten); wie das in „Heute“, im Briefing und im Tagesabschluss
  ankommt, steht in `heute.test.ts` und `routinen.test.ts`.
  `marktlage.test.ts` prüft die Marktlage (Krypto, Edelmetalle, Spielgeld-Desk): was dasteht, ab wann etwas
  auffällt, dass Beispielkurse und veraltete Kurse nie als Bewegung gelten, den gesprochenen Satz und den
  Zuruf „Marktübersicht“, dazu den Absatz „Märkte“ in Morgenbriefing und Tagesabschluss (was hinein darf und
  was nicht). Dass er wirklich aufs Handy geht, prüft `test/module/hinweise.test.ts` mit nachgebautem Telegram
  und nachgebautem CoinGecko.
  `claude-zugang.test.ts` prüft, dass nur `src/lib/server/claude.ts` eine Verbindung zu Claude aufbaut und
  jede Rolle ihre Wartezeit und Wiederholungen behält.
  `geteilt.test.ts` prüft die geteilten Abfragen der Oberfläche (eine Abfrage für mehrere Stellen, keine
  veraltete Antwort über einem neueren Stand), mit gestellter Uhr.
* `test/module/` prüft Module mit echten Dateien im Temp-Ordner und nachgebauten Diensten:
  Obsidian, Gedächtnis, Dokumentablage, KI-Gehirn (nachgebauter Claude in `test/mocks/claude-mock.ts`),
  Spielgeld-Desk und das Security Gateway (`gateway.test.ts`: Deny by Default, Klassen, Freigaben,
  Not-Aus, Agentensperren, Audit-Log, ein manipuliertes Modell). `projekte.test.ts` prüft das
  Projektgedächtnis: nur ein Mensch am Mac bestätigt, Vorschläge sind kein Wissen, Korrekturverlauf,
  vertrauliche Projekte, Speicher in der Datei und auf einem zweiten Speicher ohne Datei.
  `projekte-datenbank.test.ts` prüft, was sich am Projektgedächtnis in PostgreSQL ohne laufende Datenbank
  prüfen lässt: die Adresse (außerhalb dieses Rechners immer verschlüsselt, kein Kennwort in Anzeige oder
  Meldung), die Wahl des Speichers (ohne Einstellung die Datei, kein stilles Ausweichen), bereinigter Text
  und das Kopieren von einem Speicher in den anderen. Alles Weitere prüft die Handprüfung `postgres-rauch.ts`.
  `einstellungen.test.ts` prüft jede Stelle, die Einstellungen speichert, auf verlorene Änderungen: zwei
  Änderungen zur selben Zeit, eine Änderung, während ein Schlüssel noch beim Anbieter geprüft wird, Handy
  koppeln und trennen, und dass im Programm niemand mehr einen ganzen, vorher gelesenen Stand zurückschreibt.
  `sicherung.test.ts` prüft die Sicherung (`scripts/sichern.sh`) und ihr Zurückspielen
  (`scripts/wiederherstellen-pruefen.sh`) an einem winzigen Wegwerf-Projekt mit eigenem Git: Eine gute
  Sicherung besteht, jeder Schaden wird beim Namen genannt, und eine misslungene neue Sicherung lässt die
  alte liegen. Braucht `git`, `unzip` und `npm`, aber kein Netz. Die echte Sicherung fasst der Test nicht an;
  die prüft man von Hand mit `bash scripts/wiederherstellen-pruefen.sh <Ordner>` (einige Minuten, mit Netz).
  `kosten.test.ts` prüft das Kostenbuch: Buchen je Agent und Tag, nur Zahlen in der Datei, gleichzeitige
  Buchungen, abgebrochene Antwort, nicht lesbare und kaputte Datei. Der nachgebaute Claude meldet je Antwort
  10 Token Eingabe und 5 Ausgabe und nennt das angefragte Modell; mit dem Zug `{ abbruch: true }` reißt eine
  Antwort mittendrin ab. `zeitplan.test.ts` prüft den Taktgeber mit erfundenen Aufgaben (Not-Aus, Sperre,
  Überlappung, Fristen, Neustart mitten im Lauf), `metalle.test.ts` den Edelmetall-Agenten gegen ein
  nachgebautes Twelve Data und als Werkzeug des KI-Gehirns, `zeitplan-aufgaben.test.ts` Intel und die
  Edelmetalle über den gemeinsamen Taktgeber. `hinweise.test.ts` prüft alles, was per Telegram von selbst
  kommt, über denselben Taktgeber gegen den nachgebauten Telegram-Server: Morgenbriefing, Erinnerungen vor
  Terminen, Tagesabschluss und die Hinweise am Tag (aus bis zum Einschalten, nur tagsüber, höchstens drei,
  jedes Ding einmal, nichts doppelt, feste Sätze bei Fehlschlägen). Die Regeln dazu stehen ohne Netz in
  `test/regeln/hinweise.test.ts`. Der nachgebaute Telegram-Server kann für die nächste Anfrage einer Methode
  einen Fehler liefern (`tg.fehler.sendMessage = 400`) oder die Verbindung ohne Antwort abreißen lassen (`-1`).
  Dieselbe Datei prüft die Hinweise als Mitteilung am Mac gegen den nachgebauten Mac: eigener Schalter, nur
  Zahlen, der Text nie im Skript, eigener Stand neben dem fürs Handy. Mit `JARVIS_MAC_MITTEILUNG=abgelehnt`
  nimmt der nachgebaute Mac die Mitteilung nicht an, mit `haengt` antwortet er nicht;
  `JARVIS_MITTEILUNG_FRIST_MS` verkürzt dafür die Wartezeit.
  `gedaechtnis.test.ts` prüft das persönliche Gedächtnis im Testordner: Änderungen zur selben Zeit, ein Lesen,
  das eine Änderung überholt (dafür wird das erste Lesen der Datei angehalten), beschädigte und nicht lesbare
  Dateien (nie ersetzt, nichts vom Inhalt im Fehlersatz oder beim Modell), Beiseitelegen mit den lesbaren
  Einträgen, gescheitertes Speichern (eine Nebendatei, die ein Ordner ist) und den Aufbau der Datei.
  `entwuerfe.test.ts` prüft die Antwortentwürfe gegen das nachgebaute Postfach und den nachgebauten Claude:
  Empfänger und Betreff kommen nur aus dem Postfach, nie vom Modell oder aus dem Text der Mail; es geht kein
  Befehl an das Postfach, der etwas ändert oder ablegt; was du selbst geändert hast, wird nicht überschrieben;
  ein Schreibfehler wird gemeldet. Dazu Zitat und „Allen antworten“: nur lesend aus dem Postfach, nichts davon
  in der Datei, dieselbe Mail oder keine. Die Regeln für Adresse, Betreff, Zitat, Kopie-Empfänger und den Link
  ins Mailprogramm stehen ohne Netz in `test/regeln/entwuerfe.test.ts`. Im nachgebauten Postfach kann eine Mail
  weitere Empfänger haben (`an`, `kopie`).
  `microsoft.test.ts` prüft Microsoft 365 (Termine aus Outlook lesen) gegen ein nachgebautes Microsoft:
  Anmeldung mit Code, Erneuern, nur lesende Anfragen an Graph, der Schlüssel geht nur an Graph (keine fremde
  Folgeseite, keine Umleitung), feste Sätze statt der Texte von Microsoft, Outlook im Kalender von JARVIS,
  und dass kein Outlook-Termin an das KI-Modell oder über Telegram geht, solange der Schalter aus ist. Die
  Regeln ohne Netz stehen in `test/regeln/microsoft.test.ts`. Einige Tests dort hängen an der echten Uhr
  (der Kalender liest ab heute) und rechnen ihre Tage deshalb von jetzt aus.
* Nachgebaute Dienste in `test/mocks/`: Claude (`claude-mock.ts`), Telegram (`telegram-mock.ts`), xAI/Grok
  (`xai-mock.ts`), ElevenLabs mit Stimmenliste, Kontostand und einem stillen, echten MP3
  (`elevenlabs-mock.ts`), der Mac für Kalender und Programme (`osascript-mock.mjs`, `open-mock.mjs`), der
  macOS-Schlüsselbund (`security-mock.mjs`), ein Postfach (`imap-mock.ts`: IMAP auf 127.0.0.1 mit sieben
  Beispiel-Mails, schreibt jeden Befehl mit; `post.test.ts`) und der Markt für den Spielgeld-Desk
  (`markt-mock.ts`: DexScreener, GeckoTerminal, CoinGecko, RugCheck; `desk-kauf.test.ts`) und Twelve Data für
  Tageskurse (`twelve-mock.ts`: je Symbol eine Kursreihe oder ein Fehler, schreibt Adresse und Schlüssel-Kopf mit) und
  Microsoft (`microsoft-mock.ts`: Anmeldeserver mit Gerätecode und Erneuern, dazu Graph mit `/me` und
  `/me/calendarView`; einstellbar sind unter anderem abgelehnte oder abgelaufene Anmeldung, Störungen, eine
  fremde Folgeseite, eine Umleitung, eine langsame Antwort; die Form der Anmeldung folgt der Beschreibung von
  Microsoft, Teile der Graph-Antworten sind angenommen, siehe `docs/jarvis-2.0/08-microsoft-365.md`). Der Desk merkt
  sich Kurse 15 Sekunden: Die Kaufpfad-Tests stellen deshalb die Uhr und springen je Runde 20 Sekunden.
* `test/helfer/umgebung.ts` sorgt dafür, dass kein Test echte Einstellungen, echte Schlüssel oder echte
  Dienste berührt.

**Bekannte Sicherheitslücken** stehen als Tests mit `todo` und Risikonummer (siehe
`docs/jarvis-2.0/02-risiken.md`). Sie laufen bei jedem Durchgang mit, werden als `# TODO` gemeldet und
gelten **nicht** als bestanden. Ist eine Lücke behoben, wird aus dem `todo` ein normaler Test.
Seit Schritt 2 (8. November 2026) ist keine bekannte Lücke mehr offen; alle 13 früheren `todo`-Tests sind
normale Tests.

`test/hand/` enthält Handprüfungen, die ein echtes Chrome brauchen und deshalb nicht bei `npm test` mitlaufen
(Netzschleuse, Browser-Agent, PDF, Ansichten „Heute“ und „Projekte“, Schalter für den Tagesabschluss, Agentensteuerung,
Edelmetalle und Zeitplan, Antwortentwürfe im Raum „Post“, Microsoft 365 in den Einstellungen und im Raum „Kalender“, Einstellungen speichern mit vielen Änderungen zur selben Zeit,
Hinweise als Mitteilung am Mac vom Schalter bis zur Mitteilung des laufenden Servers,
das persönliche Gedächtnis mit beschädigter Datei und Beiseitelegen über die Einstellungen,
offene Risiken in „Heute“ und „Projekte“,
die Marktlage im Raum Intel, in „Heute“ und als Zuruf,
der Raum Trading mit dem Spielgeld-Desk gegen einen nachgebauten Markt: Rückfrage, Kauf, Stop-Loss, Not-Aus,
der Raum Aufgaben gegen einen Testordner als Obsidian-Tresor: verbinden, notieren, abhaken, verschieben, Tresor weg,
der Raum Dokumente gegen einen nachgebauten Claude: bestellen, Fortschritt, PDF, öffnen, abbrechen, Neustart,
der Raum Kalender gegen einen nachgebauten Mac-Kalender: Zugriff erlauben, zwei Wochen Termine, eintragen, Kalender für neue Termine, ein Mac, der nicht speichert,
das Gespräch, getippt, gegen einen nachgebauten Claude: feste Befehle, freie Fragen, Anhalten, eine Änderung erst nach dem Ja, Ausfall von Claude, neues Gespräch,
das Lagebild im Raum Intel gegen ein nachgebautes Grok: Lagebild, Warnung an den Desk, gezielte Suche, Tagesbudget, eigene Themen, Ausfälle, Zurufe, gesperrter Agent,
der Raum Post beim Lesen gegen ein nachgebautes Postfach: verbinden, Übersicht, öffnen, „Gelesen“, „Als Aufgabe“, mit JARVIS durchgehen, Ausfall,
der Raum „Heute“ mit allen Quellen zugleich: frischer Mac, langsamer Kalender, voller Tag, Not-Aus, Ausfälle von Postfach, Tresor und Kalender, eine eigene Abfrage, die nie antwortet,
die Bedienung ohne Maus und im schmalen Fenster: Tab-Taste, Leertaste, Menü der Räume, Handybreite, Escape im aufgeklappten Gespräch, Scheiben an einem vollen Tag, Tippen und Eingabetaste genau beim Raumwechsel,
JARVIS so, wie ein Vorleseprogramm ihn liest: Aufbau jedes Raums, Ansage der Antwort, Meldungen nach einem Klick, aufgeklapptes Gespräch, Klickflächen ab 24 Pixel,
was zehn Räume zeigen, solange JARVIS dort nichts laden kann: „lädt noch“ oder „lässt sich gerade nicht laden“, nie eine Null). Aufruf steht jeweils oben in der Datei.
Die sechs letzten und die Prüfung der Mitteilungen stellen für sich, den Server und den Browser eine Zeitzone ein, in der es gerade Mittag ist (`mittagsZone()` in `test/helfer/uhrzeiten.ts`): Was „läuft“, „vorbei“ oder „heute noch“ ist, hängt an der Uhrzeit.
Der nachgebaute Mac-Kalender (`test/mocks/osascript-mock.mjs`) wählt den Kalender für einen neuen Termin wie das echte Skript in `src/lib/server/calendar.ts` (genannter Kalender, Groß- und Kleinschreibung egal, sonst Standardkalender; ein ausdrücklich verlangter wird nie ersetzt; in einen schreibgeschützten wird nie eingetragen) und kann mit `speichern: "abgelehnt"` in seiner Datei nachstellen, dass die Kalender-App nicht speichert.
Mit `wartezeit_ms` in seiner Datei lässt er sich mit der Antwort Zeit: So lässt sich prüfen, was eine Seite zeigt, solange der Kalender noch lädt.
Nach „zurück“ im Browser hält die Seite den Raum, aus dem man kommt, unsichtbar bereit; eine Prüfung meint deshalb `main:visible`, nicht `main`.
Eine Prüfung darf nicht an der Tageszeit hängen: Der Edelmetall-Agent liest von selbst, wenn eine seiner Uhrzeiten (ab Werk 07:30 und 17:30) höchstens zwei Stunden zurückliegt. Wer mit einem Schlüssel für Twelve Data prüft und Abfragen zählt, stellt die Uhrzeiten mit `ferneZeiten()` aus `test/helfer/uhrzeiten.ts` fern von jetzt.
Sie darf auch nicht an der Länge einer Antwort hängen (die Prüfung Stimme füllt das Tageslimit deshalb selbst auf, statt sich auf die Länge des Briefings zu verlassen).
Eine Abfrage, die nie ankommt, stellt `seite.route("**/api/…", (r) => r.abort())` nach.
Ob etwas Markiertes zu sehen ist, misst die Prüfung Bedienung mit `document.elementFromPoint` in der Mitte des markierten Elements; ein Datumsfeld hat mehrere Haltepunkte und zählt als eine Stelle. Der Gang mit der Tab-Taste (`einmalDurch`) setzt den Anfang selbst an den Anfang des Dokuments und erkennt das Ende am Element (schon besucht oder Seite verlassen), nicht am Namen: Nach einem Wechsel des Raums über das Menü begann er sonst in der Leiste und war nach 3 Stellen fertig, ohne etwas geprüft zu haben. Wer einen solchen Gang schreibt, prüft deshalb immer auch, dass er weit genug kam (hier: alle 14 „Besprechen“). In `seite.evaluate` keine benannte Hilfsfunktion anlegen (tsx hängt ihr `__name` an, das es im Browser nicht gibt). Eine Klasse wie `focus:outline-none` verliert gegen die Regel `:focus-visible` in `globals.css` (Regeln dort stehen über den Klassen); was wirklich gilt, zeigt nur `getComputedStyle`.

Die Prüfung Vorlesen läuft ohne Vorleseprogramm: Sie liest, was der Browser einem solchen übergibt (Name eines Knopfes über `ariaSnapshot()`, Rollen über `getByRole`, die Stelle für Ansagen `[data-ansage]`). Ob etwas neu angesagt würde, zählt sie mit einem `MutationObserver` (ein neuer Absatz zählt, derselbe Text an derselben Stelle nicht). Der Browser der Sandbox hat keine Stimme: JARVIS „spricht“ dort drei Sekunden lang stumm und gibt auf. Für den Fall „JARVIS ist zu hören“ bekommt eine zweite Seite über `addInitScript({ content })` eine Stimme, die nur so tut (`STIMME` in der Prüfung). Skripte für den Browser stehen dort als Text, nicht als Funktion (siehe oben, `__name`). Eine Beschreibung, die den Namen wiederholt (etwa ein `title`), zeigt `ariaSnapshot()` nicht; die liefert `Accessibility.getPartialAXTree` über eine CDP-Sitzung. Der Browser der Sandbox hat auch kein Mikrofon: Auf einer Seite ohne Klick steht in der Zeile über der Leiste „Klick einmal irgendwo auf die Seite, dann höre ich zu.“, nach dem ersten Klick „Ich darf das Mikrofon nicht benutzen. …“. Darum klickt die Prüfung erst (auf die Überschrift des Raums) und wartet auf diese Meldung, bevor sie fragt: Sonst käme die Meldung irgendwann während der Antwort, und was in der Zeile steht, hinge vom Zufall ab. Was die Zeile wann zeigt, regelt `src/lib/antwortzeile.ts` (`test/regeln/antwortzeile-meldung.test.ts`).
Tippen beim Raumwechsel (Prüfung Bedienung, Schritt 6): Während ein Raumwechsel fertig wird (rund 40 Millisekunden), kommen bei React weder `input` noch `keydown` an; das Feld für JARVIS hört deshalb beide vom Browser selbst (`addEventListener` in `Console.tsx`). Die Prüfung trifft den Augenblick über zwei Signale, die ein Skript in der Seite zählt: `navigation` „navigate“ für das Tippen (fünf Versuche, 25 bis 120 Millisekunden zwischen den Tasten) und den Aufruf von `speechSynthesis.speak` für die Eingabetaste (mit dem ersten Signal wurde der Fehler nicht rot). Scheitert eine Prüfung ohne eingebauten Fehler an einer Stelle, an der sie tippt oder abschickt, ist das kein Wackler der Prüfung, bis das Gegenteil gemessen ist: So wurde dieser Fehler gefunden. Ein eingebauter Fehler, der an einer anderen als der gemeinten Stelle auffällt, zählt nicht als entdeckt.
Die Prüfung Ausfall stellt Ausfälle im Browser nach, nicht am Server: `seite.route(/\/api\//, …)` lässt jede lesende Abfrage hängen (nie beantwortet: „lädt noch“) oder bricht sie ab (`r.abort()`: „lässt sich gerade nicht laden“); Änderungen (`POST`) gehen durch. Je Fall eine frische Seite aus einem eigenen Kontext, denn der Stand einer Abfrage gilt für die ganze Seite, auch über Raumwechsel hinweg. Die Sätze kommen über den Baustein `Ladestand` (`data-ladestand="laedt"` oder `"gestoert"`); ein Raum schreibt seinen Ladesatz nie selbst (`test/regeln/ladestand.test.ts` liest dafür alle Bausteine). Eine Antwort verändern (etwa „das Projekt gibt es nicht mehr“): `const a = await r.fetch(); await r.fulfill({ response: a, json: { …(await a.json()), akte: null } })`. Dass etwas nicht dasteht, lässt sich nur nach einer festen Wartezeit sagen; solche Stellen stehen deshalb hinter einem Schritt, der auf etwas Sichtbares gewartet hat, oder warten ausdrücklich. Seit J13 hat jede gemeinsame Abfrage eine Frist (`fristFuer` in `src/lib/geteilt.ts`: mindestens 30 Sekunden, höchstens eine Minute). Schritt 7 lässt dafür nur `/api/agenten` hängen und wartet die 30 Sekunden wirklich ab; dass die Abfrage beendet wurde, sieht die Prüfung am Ereignis `requestfailed`. In den Regeltests dazu (`test/regeln/geteilt.test.ts`) läuft die gestellte Uhr in Schritten von höchstens einem Takt: `mock.timers.tick` springt sonst ans Ende, und eine unterwegs gestartete Abfrage bekäme ihre Frist von dort aus. Seit J14 zählt die Seite mit, ob JARVIS ihre Anfragen beantwortet (`src/lib/verbindung.ts`), und zeigt sonst oben einen Hinweis (`[data-verbindung="aus"]`; die Stelle gibt es immer, sonst mit `"da"`). Schritt 8 bricht dafür alle Anfragen ab, auch Änderungen (`r.abort()` ohne Blick auf die Methode), und wartet bis zu 40 Sekunden auf den Hinweis. Damit eine freie Frage wirklich den Weg zum KI-Gehirn nimmt (die Antwort in Stücken, `postStream`), lässt der Schritt die Seite vorher glauben, es sei eingerichtet (`brain.configured` in der Antwort von `/api/einstellungen`); ohne das beantwortet die Seite die Frage selbst, und der Weg bliebe ungeprüft; Schritt 4 wartet 22 Sekunden und prüft, dass er **nicht** kommt, wenn nur einzelne Stellen ausfallen. Die Regeln dazu stehen in `test/regeln/verbindung.test.ts` (jede Prüfung mit einer frischen Verbindung aus `neueVerbindung()`) und `test/regeln/anfragen.test.ts` (`fetch` und die Uhr gestellt; die eine Verbindung der Seite wird vor jeder Prüfung mit `meldeAntwort()` zurückgesetzt). Wer eine neue Anfrage an JARVIS baut, ruft `frage` aus `src/lib/api.ts` und nie `fetch` selbst; ein Regeltest liest dafür alle Dateien der Seite. Seit J15 hat auch jede einzelne Abfrage eine Frist (`getJson` ohne Signal: 30 Sekunden; `getJson(url, signal)` endet zusätzlich, wenn der Raum verlassen wird; `getJson(url, signal, 0)` ohne eigene Frist rufen nur die gemeinsamen Abfragen). Schritt 9 der Prüfung Ausfall hält dafür Abfragen selbst fest (`halte()`: sammelt die `Route`-Objekte und lässt sie beim Freigeben mit `r.continue()` durch); ein bloßes `unroute` ließe eine schon geschluckte Abfrage hängen, bis ihre Frist abläuft. In den Regeltests dazu muss der nachgestellte `fetch` wie der echte sofort abbrechen, wenn das Signal schon gesetzt ist.

Kleine Verweise und Knöpfe bekommen ihre Klickfläche über die Klasse `griff` (unsichtbarer Rand oben und unten, nach außen wieder weggenommen); am selben Element darf dann kein eigener Abstand nach oben oder unten stehen (`test/regeln/klickflaechen.test.ts`). Gemessen wird die Höhe in der Prüfung Vorlesen (`KLEIN`), ausgenommen ist nur ein Verweis mitten in einem Satz.

Gebaut wird ohne den Zwischenspeicher von Next (`turbopackFileSystemCacheForBuild: false` in `next.config.ts`): Mit ihm übernahm `next build` eine Änderung nur an `globals.css` etwa jedes sechste Mal nicht (Exit 0, alter Stand in `.next/static`; gemessen in Schritt J10). Wer einer Gegenprobe am Aussehen nicht traut, sieht in `.next/static/chunks/*.css` nach, ob die Änderung angekommen ist.
Ein Befehl, der langsamer ist als gewollt, lässt sich im Browser mit `seite.route(…)` verzögern (Prüfung Gespräch: die Bestätigung eines Befehls kommt mitten ins Nachdenken).
Der nachgebaute Claude (`test/mocks/claude-mock.ts`) und das nachgebaute Grok (`test/mocks/xai-mock.ts`) antworten mit `bedenkzeit(ms)` verzögert; so lässt sich prüfen, was eine Seite während der Arbeit zeigt.

**Alle Handprüfungen mit einem Befehl** (Schritt J4):

```
JARVIS_CHROME=/pfad/zu/chrome npm run handpruefung -- [Ordner] [--ohne-bauen] [--nur name,name]
```

Der Sammellauf (`test/hand/alle.ts`) baut JARVIS einmal und lässt dann jede Prüfung nacheinander laufen, jede
höchstens sechs Minuten. Mit einem Ordner landen dort die Bildschirmfotos je Prüfung, ein Protokoll je Prüfung
(`name.log`) und `ergebnis.json`. Am Ende steht eine Zeile, und der Befehl endet mit Code 0 nur, wenn alle
Prüfungen gelaufen sind und bestanden haben; 1 bei einem Fehlschlag; 2, wenn etwas nicht geprüft wurde (kein
Chrome, kein PostgreSQL, Auswahl mit `--nur`). Ausgelassen ist nicht bestanden. Welche Prüfungen dazugehören
und wie ein Lauf bewertet wird, steht in `test/helfer/handpruefungen.ts`; `test/regeln/handpruefungen.test.ts`
bemerkt eine neue Datei `test/hand/*-rauch.ts`, die dort nicht eingetragen ist. Nach jeder Prüfung, nach einem Abbruch wegen der Zeit und bei Strg+C beendet der
Sammellauf, was von ihr noch läuft (Server, Chrome); das geht nur unter Linux (über `/proc`), anderswo sagt er
nach einem Abbruch, dass er es nicht feststellen kann.

Jede Handprüfung startet und beendet den gebauten Server über `test/helfer/server.ts` (Schritt J5), nie mit
einem eigenen `next start`: `starteNext(port, umgebung)` startet nur auf einem freien Port, `bereit(adresse)`
wartet auf eine gute Antwort des eigenen Servers, `stopLeise()` beendet ihn am Ende. Jede Prüfung hat ihren
eigenen Port. Beides halten Regeltests in `test/regeln/handpruefungen.test.ts` fest. Der Grund: `next start`
bedient nach dem Signal zum Beenden offene Verbindungen weiter, solange die Seite im Browser abfragt, und
antwortet dann mit dem alten Stand; und ein liegen gebliebener Server auf dem Port sähe sonst aus wie der eigene.
Eine Handprüfung, die JARVIS neu startet, wartet deshalb mit `stop()`, bis vom alten Server kein Prozess mehr läuft.

`test/hand/postgres-rauch.ts` braucht kein Chrome, aber ein installiertes PostgreSQL (die Programme `initdb`
und `pg_ctl`; gesucht in `JARVIS_PG_BIN` und an den üblichen Orten). Es startet ein eigenes, leeres PostgreSQL
auf 127.0.0.1 in einem Wegwerf-Ordner (`test/helfer/postgres.ts`), prüft das Projektgedächtnis darin
(Reihenfolge, Transaktionen, zwei Prozesse gleichzeitig, Sperre, geringste Rechte, Verschlüsselung zu fremden
Adressen, Ausfall der Datenbank, Umzug aus der Datei), lässt dann `test/module/projekte.test.ts` mit
`JARVIS_TEST_PG` gegen diese Datenbank laufen und räumt alles weg. Der Schritt zur Verschlüsselung braucht die
Adresse 127.0.0.2, die Linux von Haus aus kennt, ein Mac nicht. `test/hand/projekte-rauch.ts --postgres`
klickt die Ansicht Projekte im Browser mit einer solchen Datenbank durch.

`test/hand/glashaus-schau.ts` ist keine Prüfung, sondern eine Schau: Sie startet JARVIS mit Beispieldaten
(nachgebautes Postfach, nachgebauter Markt, nachgebaute Tageskurse für Gold und den Silber-Fonds, Kalender, Aufgaben, drei Projekte), damit man alle Räume gefüllt
ansehen und fotografieren kann. Vorher `npx next build`, dann `npx tsx test/hand/glashaus-schau.ts 3210 start`.
Startet man dort den Spielgeld-Handel, bewertet der nachgebaute Chief die zwei Beispiel-Coins (ein Kauf, eine
Absage), damit der Raum Trading Position, Trade und Urteile zeigt.

Neue Werkzeuge: Der Test „jedes Werkzeug steht in der Tabelle“ liest alle `betaTool({ name })` aus
`brain.ts` und `browser.ts`. Ein Werkzeug ohne Zeile in `src/lib/server/gateway/richtlinien.ts` lässt ihn
fehlschlagen, ebenso eine freigabepflichtige Regel ohne Aktion in `src/lib/server/aktionen.ts`.

Nur auf dem Mac prüfbar und deshalb nicht automatisiert: Apple-Kalender (osascript), Mitteilungen von macOS
(ob sie wirklich erscheinen), Öffnen von Programmen, echtes Chrome für Browser-Agent und PDF, Spracherkennung, echte Postfächer und Telegram.
