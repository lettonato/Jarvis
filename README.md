# JARVIS

Dein persönlicher Assistent mit Trading-Desk. Der Bauplan steht im Dokument „JARVIS Bauplan: Assistent und Trading-Desk“.

**Stand: Phase 1, das KI-Gehirn aus Phase 2 und der Spielgeld-Handel aus Phase 3.** JARVIS liest deine Mails, deine Obsidian-Aufgaben und den Apple-Kalender auf deinem Mac, geht sie mit dir durch, trägt Termine auf Zuruf ein und zeigt Live-Kurse und Wetter. Auf dem Trading-Desk prüfen die Agenten aus dem GrokBot-Video neue Solana-Memecoins, der Crawler liest Blockchain, Projektseite und mit Grok auch X, und gehandelt wird mit 10.000 $ Spielgeld. Echtes Geld bewegt JARVIS nicht. Mit dem KI-Gehirn (Claude) versteht er freie Sätze und bewertet als Chief die Coins. Sprechen geht ohne Knopf: „Jarvis, …“.

## Ansichten

Oben wechselst du zwischen den Ansichten:

| Ansicht | Was du siehst |
| --- | --- |
| **JARVIS** (`/fokus`) | Nur JARVIS, groß, und das Gespräch mit ihm. Darüber steht, was ansteht (wichtige Mails, fällige Punkte, Wetter); ein Klick darauf, und er geht es mit dir durch. |
| **Übersicht** (`/`) | JARVIS in der Mitte, alle Module als Kacheln wie im NEXUS-Video. Fährst du mit der Maus über eine Kachel, dreht sie sich zu dir und tritt heraus; ein Klick öffnet ihre Ansicht, ein Klick auf den Kopf führt in den Fokus. |
| **Aufgaben** (`/aufgaben`) | Deine Aufgaben aus Obsidian nach Fälligkeit: abhaken, auf morgen oder eine Woche verschieben, neu notieren. |
| **Kalender** (`/kalender`) | Deine Termine der nächsten zwei Wochen aus der Kalender-App, neue Termine eintragen, jeden Tag mit einem Klick in der Kalender-App zeigen. |
| **Post** (`/post`) | Wichtige neue Mails oben, Newsletter eingeklappt. Lesen, als Aufgabe notieren, als gelesen markieren. |
| **Trading** (`/trading`) | Der Trading-Desk: Agenten, Spielgeld-Konto, offene Positionen, Scanner, Trades mit Begründung und Not-Aus. |
| **Agenten** (`/agenten`) | Alle Agenten, was sie können und ab welcher Phase. Mit Wettervorhersage. |
| **Einstellungen** (Zahnrad) | Name, KI-Gehirn, Crawler auf X, Obsidian-Tresor, Kalender, Postfach, Sprache, Stimme. |

Die Wechsel zwischen den Ansichten laufen wie Hologramme im Film: Von der Übersicht in den Fokus fliegt die Kamera auf JARVIS zu und die Kacheln rauschen vorbei. Öffnest du eine Kachel, fliegt sie an den Kopf der neuen Ansicht, die sich aus einer Lichtlinie in der Tiefe auffaltet. Zwischen Aufgaben, Kalender, Post, Trading und Agenten schwenken die Ansichten wie Tafeln um dich herum, und der kleine JARVIS unten fliegt beim Antippen groß in den Fokus. Wer im System „Bewegung reduzieren“ eingeschaltet hat, bekommt schlichte Wechsel ohne Animation.

In allen Arbeitsansichten ist JARVIS unten klein dabei. Du sprichst einfach weiter, er wechselt die Ansicht selbst.

## Briefing: JARVIS geht den Tag mit dir durch

Sag **„Guten Morgen“** oder drück **Briefing starten**. JARVIS sagt zum Beispiel: „Im Kalender hast du heute noch 2 Termine, als Nächstes um 14 Uhr Meeting. Du hast 4 neue wichtige Mails. Bis nächste Woche müssen noch 2 Punkte erledigt werden, einer davon ist überfällig. Fangen wir mit den Mails an.“ Dann springt er in die Post, danach in die Aufgaben, und bespricht Punkt für Punkt mit dir:

- bei Mails: **vorlesen**, **Aufgabe daraus machen** (auch „bis Freitag“), **gelesen**, **weiter**
- bei Aufgaben: **erledigt**, **verschieben auf morgen / Montag / nächste Woche / den 5. November**, **weiter**, **zurück**
- jederzeit: **beenden**

Sprichst du per Mikrofon, hört JARVIS nach seiner Frage gleich wieder zu. Statt zu sprechen kannst du auch die Knöpfe unten antippen.

Außerdem versteht er: **„Notiere Rechnung an Max schicken bis Freitag, wichtig“**, **„Erinnere mich morgen an den Zahnarzt“**, **„Merke dir: …“**, **„Meine Mails“**, **„Meine Aufgaben“**, **„Was habe ich morgen?“**, **„Trag morgen um 9 Uhr Zahnarzt ein“**, **„Öffne den Kalender“**, **„Öffne Obsidian“**, **„Zeig nur dich“**, **„Zeig alle Module“**, Wetter, Uhrzeit, Kurse, Memecoins. Alles andere beantwortet das KI-Gehirn, sobald es eingerichtet ist.

**Tastatur:** Leertaste = sprechen (auch ohne „Jarvis“), Escape = JARVIS unterbrechen.

## Sprechen mit „Jarvis“

JARVIS hört von selbst zu, ohne Knopf. Sag **„Jarvis“** und dann, was du brauchst: „Jarvis, Briefing“, „Jarvis, wie läuft der Handel?“. Ein kurzer Doppelton zeigt, dass er dich gehört hat, und während du sprichst, siehst du deine Worte mitlaufen. Sagst du nur „Jarvis“, wartet er ein paar Sekunden auf den Rest. Nach seiner Antwort hört er noch etwa acht Sekunden weiter zu; da reicht die nächste Frage ohne „Jarvis“, in der Besprechung zum Beispiel „erledigt“ oder „weiter“.

- **Unterbrechen:** „Jarvis, stopp“ oder Escape.
- **Ausschalten:** „Jarvis, Mikrofon aus“ oder der Schalter **Hört auf „Jarvis“** über dem Gespräch. Dann sprichst du über den Mikrofon-Knopf oder die Leertaste. Wieder an mit dem Schalter oder „Mikrofon an“.
- **Beim ersten Mal** fragt der Browser, ob JARVIS das Mikrofon benutzen darf: **Zulassen**. Laut antworten darf er erst, wenn du einmal auf die Seite geklickt hast; das verlangt der Browser, JARVIS erinnert dich daran.
- **Browser:** Chrome oder Safari. In Safari muss unter **Systemeinstellungen → Tastatur** das **Diktat** eingeschaltet sein.
- **Datenschutz:** Hat Chrome das deutsche Sprachpaket, erkennt er die Sprache auf dem Mac selbst, dann steht neben dem Schalter „nur auf dem Mac“. Sonst schickt Chrome den Ton zur Erkennung an Google, Safari an Apple, auch während JARVIS auf „Jarvis“ wartet.
- **Stimme:** unter **Einstellungen → Stimme**. Am besten klingen die erweiterten Stimmen vom Mac, zum Beispiel „Yannick (Erweitert)“: Systemeinstellungen → Bedienungshilfen → Gesprochene Inhalte → Systemstimme → Stimmen verwalten.

## KI-Gehirn (Claude)

Ohne KI-Gehirn kennt JARVIS nur die Befehle oben. Mit ihm versteht er, was du frei sagst, und erledigt es selbst:

- „Was muss ich bis Freitag noch erledigen?“
- „Schieb die Winterreifen auf den 2. November.“
- „Fass mir die Mail von Anna zusammen.“ (er öffnet sie dabei in der Post)
- „Lass uns die Mails durchgehen.“ (startet die Besprechung)
- „Erinner mich am Mittwoch, den Reifenwechsel zu bestätigen, ist wichtig.“

Kurze Befehle wie **Briefing**, **weiter** oder **erledigt** erledigt JARVIS weiter sofort selbst, ohne Claude zu fragen. Er ändert Aufgaben und Mails nur, wenn du es sagst, und schickt, löscht oder beantwortet keine Mails.

**Einrichten** (einmalig, etwa 5 Minuten):

1. Auf [platform.claude.com](https://platform.claude.com/settings/keys) ein Konto anlegen.
2. Unter **Billing** Guthaben aufladen, zum Beispiel 10 Euro, und ein **Monatslimit** setzen. Mehr kann dann nie abgebucht werden.
3. Unter **API Keys** einen Schlüssel erstellen (beginnt mit `sk-ant-`) und in JARVIS unter **Einstellungen → KI-Gehirn** einfügen. JARVIS prüft ihn, bevor er speichert.

JARVIS nutzt Claude Opus 5.5. Eine Frage kostet meist ein bis drei Cent. Lehnt Opus eine harmlose Frage versehentlich aus Sicherheitsgründen ab, beantwortet Anthropic sie automatisch mit einem Ersatzmodell.

## Obsidian verbinden

Unter **Aufgaben** oder **Einstellungen**: JARVIS zeigt die Tresore, die Obsidian auf deinem Mac kennt, ein Klick verbindet. Ohne Obsidian legt er mit einem Klick einen neuen Tresor in `Dokumente/JARVIS-Tresor` an.

- Gelesen wird jede Zeile wie `- [ ] Text 📅 2026-10-30` (Tasks-Plugin) oder `- [ ] Text [due:: 2026-10-30]` (Dataview). `⏫`, `🔺` oder `#wichtig` heißt wichtig.
- Abhaken setzt `[x]` und `✅ Datum`, verschieben ändert das `📅`-Datum. Wiederkehrende Aufgaben (`🔁`) hakst du in Obsidian ab, damit der nächste Termin entsteht.
- Neue Aufgaben landen in `JARVIS/Eingang.md`, Notizen in `JARVIS/Notizen.md`.

Sperrt macOS den Ordner (Tresore in Dokumente, Schreibtisch oder iCloud Drive), sagt JARVIS das, statt einfach keine Aufgaben zu zeigen. Dann **Systemeinstellungen → Datenschutz & Sicherheit → Dateien und Ordner → Terminal** und den Ordner freischalten (steht Terminal dort nicht: unter **Festplattenvollzugriff** einschalten), danach JARVIS neu starten.

**„Öffne Obsidian“**, **„Öffne meine Notizen“** oder **„Öffne den Eingang“** öffnet Obsidian an der richtigen Stelle.

## Kalender verbinden

JARVIS liest die **Kalender-App** auf deinem Mac, also alle Kalender, die dort eingerichtet sind (iCloud, Google, Exchange). Einen Schlüssel braucht es nicht.

1. In JARVIS auf **Kalender** und dort auf **Kalender verbinden** tippen.
2. macOS fragt, ob **„Terminal“** auf deine Kalender zugreifen darf (JARVIS läuft im Terminal): **Erlauben** bzw. **Vollzugriff**.
3. Beim ersten „Öffne den Kalender“ fragt macOS noch, ob Terminal die App **Kalender** steuern darf: **Erlauben**. Dann springt die Kalender-App direkt zum richtigen Tag.

Danach:

- **Lesen:** „Was habe ich morgen?“, „Habe ich am Freitag Termine?“, „Wann ist mein nächster Termin?“. Im Briefing nennt JARVIS die Termine von heute, eine Viertelstunde vor jedem Termin erinnert er dich.
- **Eintragen:** „Trag morgen um 9 Uhr Zahnarzt ein“, „Neuer Termin am 5. November um halb drei Friseur“, „Trag Donnerstag von 9 bis 11 Uhr Schulung ein“, „Trag Samstag Geburtstag Oma ein“ (ohne Uhrzeit ganztägig). Danach zeigt die Kalender-App den Tag mit dem neuen Termin. In welchen Kalender er einträgt, stellst du unter **Einstellungen → Kalender** ein.
- **Öffnen:** „Öffne den Kalender“, „Öffne den Kalender für Freitag“.
- Bestehende Termine **ändert oder löscht JARVIS nicht**, dafür gibt es keinen Befehl. Das machst du in der Kalender-App.

Hast du bei der Rückfrage „Nicht erlauben“ gewählt: **Systemeinstellungen → Datenschutz & Sicherheit → Kalender → Terminal** auf **Vollzugriff** stellen und in JARVIS **Neu laden** tippen.

## Postfach verbinden

Unter **Post** oder **Einstellungen** den Anbieter wählen, Adresse und Passwort eintragen. JARVIS prüft die Verbindung, bevor er speichert.

| Anbieter | Passwort |
| --- | --- |
| Telekom (t-online.de) | das **E-Mail-Passwort** aus dem E-Mail Center, nicht der Telekom-Login |
| Gmail | ein **App-Passwort** (Google-Konto → Sicherheit) |
| iCloud | ein **app-spezifisches Passwort** (account.apple.com) |
| GMX, WEB.DE | dein Passwort; IMAP vorher in den Einstellungen des Postfachs einschalten |

Wichtig heißt: markiert, oder ungelesen und weder Newsletter noch automatische Nachricht. JARVIS liest nur, er löscht und verschickt nichts. Outlook.com und Hotmail gehen erst später, Microsoft verlangt dafür eine eigene Anmeldung.

## Sicherheit

- JARVIS läuft nur auf deinem Mac (`127.0.0.1`), andere Geräte im WLAN erreichen ihn nicht.
- Webseiten im Browser können JARVIS nicht fernsteuern: der Server nimmt nur Anfragen von JARVIS selbst an.
- Einstellungen samt Mail-Passwort und Claude-Schlüssel liegen in `~/.jarvis/config.json`, lesbar nur für deinen Benutzer. Ein Update von JARVIS ändert daran nichts. Die Seite bekommt den Schlüssel nie zu sehen, nur seine letzten vier Zeichen.
- Der Crawler liest nur öffentliche https-Seiten. Adressen im Heimnetz (Router, NAS) öffnet er nicht, auch nicht über Weiterleitungen. Texte auf Projektseiten sind für Claude nur Daten, keine Anweisungen.
- Freihändig hört der Browser dauerhaft mit, damit er „Jarvis“ erkennt (siehe oben, wohin der Ton geht). Ausschalten mit dem Schalter oder „Jarvis, Mikrofon aus“.
- Mit Grok gehen Name, Symbol, Vertragsadresse und Konten der geprüften Coins an xAI, sonst nichts von dir.
- Den Kalender liest JARVIS über die Schnittstelle von macOS, nur auf deinem Mac. Er trägt nur auf deinen Zuruf ein und kann Termine weder ändern noch löschen.
- Mit KI-Gehirn gehen deine Frage, die letzten Sätze des Gesprächs und das, was Claude dafür nachliest (Aufgaben, Mails, Termine), verschlüsselt an Anthropic. Laut seinen Bedingungen nutzt Anthropic API-Daten nicht zum Training.

## Wetter

Standard ist Deggendorf. Ändern über `JARVIS_WEATHER_PLACE`, `JARVIS_WEATHER_LAT` und `JARVIS_WEATHER_LON` in `.env.local`.

## Spielgeld-Handel (`/trading`)

Die Agenten aus dem GrokBot-Video handeln mit **10.000 $ erfundenem Geld**, um 28 Tage lang zu testen, ob sich der Desk nach Kosten lohnt. Gestartet wird mit **Spielgeld-Handel starten** auf dem Trading-Desk oder mit „Starte den Handel“. Echtes Geld gibt es erst nach den 28 Tagen, wenn der Desk im Plus ist, und nur mit deiner Zustimmung.

So läuft eine Runde, jede Minute (Reihenfolge aus `filter.py`: billige Prüfungen zuerst):

1. **Scan** holt neue Solana-Coins von DexScreener.
2. **Vet** prüft die harten Filter (Alter, Liquidität, Volumen, Marktwert, Trades).
3. **Crawler** liest zuerst, dann handelt der Desk: Er holt den Blockchain-Bericht von RugCheck und sortiert aus, wenn der Entwickler noch Coins erzeugen oder Konten einfrieren kann, RugCheck vor Betrug warnt, eine Wallet mehr als 5 % hält oder die zehn größten mehr als 60 %. Hat ein Coin weder Webseite noch Konten, fliegt er auch raus. Sonst liest er die Projektseite und, mit xAI-Schlüssel, X (siehe unten).
4. **Chief** schätzt die weichen Filter: Ist der Anstieg schon gelaufen, gehören Seite und Konten wirklich zum Coin, wurde das Konto schon für andere Coins benutzt? Mit KI-Gehirn macht das Claude (Haiku, Bruchteile eines Cents pro Runde), sonst Faustregeln. Was sich ausrechnen lässt (Liquidität, Konzentration, Anteil des Entwicklers), rechnet der Code; die Grenzen aus `thresholds.py` entscheiden, nicht die KI.
5. **Size** setzt 2 % des Kontos ein, **Fills** kauft zum frischen Kurs, mit Gebühren und Kursrutsch wie auf einer echten Börse. Ist der Kurs seit der Prüfung um mehr als 5 % gestiegen, läuft Fills nicht hinterher.
6. **Risk** und **Crawler** bewachen die gekauften Coins, auch in der Pause: Stop-Loss −15 %, Nachlauf-Stop 20 % unter dem Höchststand, Ziel +50 %, spätestens nach 24 Stunden raus. Fällt die Liquidität um die Hälfte, verschwindet das Handelspaar oder meldet RugCheck neue Rug-Zeichen, verkauft der Desk sofort.

Feste Regeln, die auch Claude nicht ändern kann (`src/lib/paper.ts`): höchstens 5 Coins gleichzeitig, höchstens 5 % Verlust am Tag (danach kauft er bis morgen nichts), 24 Stunden Pause für einen verkauften Coin, nie Käufe mit Beispieldaten.

- **Not-Aus:** Knopf unten rechts oder „Stopp alles“. Alle Agenten stehen sofort, auch der Stop-Loss. Mit **Weitermachen** oder „Handel fortsetzen“ geht es weiter.
- **Protokoll:** Jede Entscheidung steht im Protokoll auf dem Desk, jeder Trade mit Begründung. In der Scan-Tabelle siehst du pro Coin, wie weit er gekommen ist.
- **Obsidian:** Jeden Tag schreibt JARVIS einen Bericht nach `JARVIS/Handel/JJJJ-MM-TT.md` in deinen Tresor. Alle Trades stehen zusätzlich in `~/.jarvis/spielgeld-trades.jsonl`.
- **JARVIS fragen:** „Wie läuft der Handel?“, „Pausiere den Handel“. Im Briefing nennt er den Stand, die Übersicht zeigt ihn auf der Trading-Kachel.
- **Mac wach halten:** Der Desk handelt nur, solange JARVIS läuft. `start-jarvis.command` hält den Mac wach, solange das Fenster offen ist. Klappst du ein MacBook zu, schläft es trotzdem; offene Positionen bewacht dann niemand, bis du es wieder aufklappst.
- **Kurse oben:** Bitcoin, Ethereum und Solana in Euro (CoinGecko).

Sind CoinGecko, DexScreener oder Open-Meteo nicht erreichbar, zeigt JARVIS oben **BEISPIELDATEN**. Diese Zahlen sind erfunden und nur zur Ansicht; mit ihnen handelt der Desk nicht.

### Crawler auf X (Grok)

Wie im Video liest der Crawler vor jedem Kauf auch X. Das macht **Grok von xAI**: Er sucht die Beiträge der letzten drei Tage zum Coin (Cashtag und Vertragsadresse), schätzt, wie viele davon nach Bots aussehen, und prüft das X-Konto des Projekts: passt es zum Coin, wie alt ist es, hat es schon andere Coins beworben? Gelesen werden nur Coins, die Blockchain und Projektseite schon bestanden haben.

- Warnen auf X mehrere unabhängige Konten konkret vor dem Coin, fliegt er raus („X warnt“).
- Passt das Konto nicht oder wurde es recycelt, sagt Chief nein.
- Kann Grok gerade nicht lesen (kein Guthaben, Störung), kauft der Desk den Coin nicht.
- Ohne xAI-Schlüssel läuft der Desk wie vorher, nur ohne X.

**Einrichten** (einmalig):

1. Auf [console.x.ai](https://console.x.ai) anmelden (mit X- oder Google-Konto).
2. Guthaben aufladen, zum Beispiel 10 $. Mehr kann nie abgebucht werden.
3. Unter **API Keys** einen Schlüssel erstellen (beginnt mit `xai-`) und in JARVIS unter **Einstellungen → Crawler auf X** einfügen. JARVIS prüft ihn, bevor er speichert.

**Kosten:** xAI rechnet pro gelesenem Beitrag (0,5 Cent) und Profil (1 Cent), dazu Grok selbst. Ein Coin kostet so etwa 10 bis 30 Cent. Deshalb gibt es ein **Tagesbudget** (Standard 1 $, einstellbar bis 20 $). Ist es aufgebraucht, kauft der Desk bis morgen nichts Neues; die gekauften Coins bewacht er weiter. Wie viel heute verbraucht ist, steht auf dem Desk in der Social-Kachel.

## JARVIS starten

Einmalig:

1. Installiere **Node.js** in der LTS-Version von [nodejs.org](https://nodejs.org) (auf dem Mac den macOS-Installer).
2. Lade JARVIS als [ZIP-Datei](https://github.com/lettonato/Jarvis/archive/refs/heads/main.zip) herunter und entpacke sie.

**Mac:** Doppelklick auf `start-jarvis.command` im Ordner `Jarvis-main`. Meldet macOS beim ersten Mal, dass die Datei von einem nicht verifizierten Entwickler stammt: Rechtsklick auf die Datei, **Öffnen** und noch einmal **Öffnen**. Hilft das nicht, unter **Systemeinstellungen → Datenschutz & Sicherheit** auf **Trotzdem öffnen** klicken.

**Windows:** Doppelklick auf `start-jarvis.bat`.

Beim ersten Start und nach jedem Update werden die Pakete installiert, das dauert ein bis zwei Minuten. Danach öffnet sich der Browser mit `http://localhost:3000`. Zum Sprechen Chrome oder Safari verwenden. Das Terminal-Fenster muss offen bleiben, solange JARVIS läuft; zum Beenden schließt du es.

## Für Entwickler

```bash
npm install
npm run dev     # Entwicklungsserver auf http://127.0.0.1:3000 (nur dieser Rechner)
npm run lint
npm run build
```

Statt den Claude-Schlüssel in den Einstellungen zu speichern, kannst du ihn auch als Umgebungsvariable `ANTHROPIC_API_KEY` setzen, den xAI-Schlüssel als `XAI_API_KEY`; die Schlüssel aus den Einstellungen gehen vor.

Aufbau:

| Datei | Inhalt |
| --- | --- |
| `src/components/JarvisProvider.tsx` | JARVIS über allen Ansichten: Gespräch, Stimme, Besprechung, Daten |
| `src/components/AppFrame.tsx` | Navigation oben und der kleine JARVIS unten |
| `src/lib/holo.ts`, `src/components/HoloView.tsx` | welche Übergangs-Animation bei welchem Wechsel läuft; die Animationen selbst stehen in `src/app/globals.css` |
| `src/components/views/` | die Ansichten Fokus, Aufgaben, Post, Agenten, Einstellungen |
| `src/components/CommandCenter.tsx` | die Übersicht mit den Modul-Kacheln |
| `src/components/ParticleHead.tsx` | der 3D-Kopf aus Partikeln (three.js) |
| `src/lib/commands.ts` | was JARVIS ohne KI-Gehirn versteht, Briefing und Besprechung |
| `src/lib/server/brain.ts`, `src/app/api/gehirn/` | das KI-Gehirn: Claude mit Werkzeugen für Aufgaben, Mails und Ansichten |
| `src/lib/dates.ts` | Datumsangaben wie „bis Freitag“ oder „in drei Tagen“ |
| `src/lib/modules.ts` | Module und Agenten, hier kommen neue dazu |
| `src/lib/server/obsidian.ts` | Aufgaben im Obsidian-Tresor lesen und ändern |
| `src/lib/server/mail.ts` | Postfach über IMAP lesen |
| `src/lib/server/config.ts` | Einstellungen in `~/.jarvis/config.json` |
| `src/lib/server/guard.ts` | Schutz: nur Anfragen von diesem Mac |
| `src/app/api/` | Schnittstellen für Aufgaben, Post, Gehirn, Einstellungen, Kurse, Wetter |
| `src/lib/useVoice.ts`, `src/lib/voiceText.ts` | Spracherkennung und Sprachausgabe im Browser: Weckwort „Jarvis“, Nachfrage, Unterbrechen, was vorgelesen wird |
| `src/lib/thresholds.ts`, `src/lib/vet.ts` | harte Filter aus dem Video und der Vet-Agent |
| `src/lib/market.ts` | Kurse und Scanner (CoinGecko, DexScreener) |
| `src/components/TradingDesk.tsx` | der Trading-Desk |
| `src/lib/paper.ts` | Spielgeld: feste Sicherheitsregeln, Gebühren, Stop-Loss, Rechnungen |
| `src/lib/server/desk/` | der Spielgeld-Handel: `engine.ts` (Takt, Konto, Kauf und Verkauf, Bericht), `crawler.ts` (RugCheck und Projektseite), `grok.ts` (X über Grok von xAI), `chief.ts` (weiche Filter mit Claude oder Faustregeln) |
| `src/app/api/handel/`, `src/instrumentation.ts` | Schnittstelle des Desks; beim Serverstart läuft sein Takt los |

`JARVIS_CONFIG_DIR` legt fest, wo die Einstellungen liegen (Standard `~/.jarvis`). Für Tests mit nachgebauten Servern lassen sich `DEXSCREENER_URL`, `COINGECKO_URL`, `RUGCHECK_URL`, `ANTHROPIC_BASE_URL` und `XAI_BASE_URL` umlenken; `JARVIS_TICK_MS` ändert den Takt des Desks (Standard 60000).

API-Schlüssel gehören später in eine Datei `.env.local`. Sie wird nie hochgeladen.
