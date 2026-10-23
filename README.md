# JARVIS

Dein persönlicher Assistent mit Trading-Desk. Der Bauplan steht im Dokument „JARVIS Bauplan: Assistent und Trading-Desk“.

**Stand: Phase 1.** JARVIS liest deine Mails und deine Obsidian-Aufgaben, geht sie mit dir durch, zeigt Live-Kurse und Wetter und prüft neue Solana-Memecoins mit den harten Filtern aus dem GrokBot-Video. Er kauft und verkauft nichts.

## Ansichten

Oben wechselst du zwischen den Ansichten:

| Ansicht | Was du siehst |
| --- | --- |
| **JARVIS** (`/fokus`) | Nur JARVIS, groß, und das Gespräch mit ihm. Darüber steht, was ansteht (wichtige Mails, fällige Punkte, Wetter); ein Klick darauf, und er geht es mit dir durch. |
| **Übersicht** (`/`) | JARVIS in der Mitte, alle Module als Kacheln wie im NEXUS-Video. Jede Kachel öffnet ihre Ansicht, ein Klick auf den Kopf führt in den Fokus. |
| **Aufgaben** (`/aufgaben`) | Deine Aufgaben aus Obsidian nach Fälligkeit: abhaken, auf morgen oder eine Woche verschieben, neu notieren. |
| **Post** (`/post`) | Wichtige neue Mails oben, Newsletter eingeklappt. Lesen, als Aufgabe notieren, als gelesen markieren. |
| **Trading** (`/trading`) | Der Trading-Desk mit Agenten, Kursen und Scanner. |
| **Agenten** (`/agenten`) | Alle Agenten, was sie können und ab welcher Phase. Mit Wettervorhersage. |
| **Einstellungen** (Zahnrad) | Name, Obsidian-Tresor, Postfach, Stimme. |

In allen Arbeitsansichten ist JARVIS unten klein dabei. Du sprichst einfach weiter, er wechselt die Ansicht selbst.

## Briefing: JARVIS geht den Tag mit dir durch

Sag **„Guten Morgen“** oder drück **Briefing starten**. JARVIS sagt zum Beispiel: „Du hast 4 neue wichtige Mails. Bis nächste Woche müssen noch 2 Punkte erledigt werden, einer davon ist überfällig. Fangen wir mit den Mails an.“ Dann springt er in die Post, danach in die Aufgaben, und bespricht Punkt für Punkt mit dir:

- bei Mails: **vorlesen**, **Aufgabe daraus machen** (auch „bis Freitag“), **gelesen**, **weiter**
- bei Aufgaben: **erledigt**, **verschieben auf morgen / Montag / nächste Woche / den 5. November**, **weiter**, **zurück**
- jederzeit: **beenden**

Sprichst du per Mikrofon, hört JARVIS nach seiner Frage gleich wieder zu. Statt zu sprechen kannst du auch die Knöpfe unten antippen.

Außerdem versteht er: **„Notiere Rechnung an Max schicken bis Freitag, wichtig“**, **„Erinnere mich morgen an den Zahnarzt“**, **„Merke dir: …“**, **„Meine Mails“**, **„Meine Aufgaben“**, **„Zeig nur dich“**, **„Zeig alle Module“**, Wetter, Uhrzeit, Kurse, Memecoins. Freie Sätze versteht er ab Phase 2 mit dem KI-Gehirn.

**Tastatur:** Leertaste = sprechen, Escape = JARVIS unterbrechen.

## Obsidian verbinden

Unter **Aufgaben** oder **Einstellungen**: JARVIS zeigt die Tresore, die Obsidian auf deinem Mac kennt, ein Klick verbindet. Ohne Obsidian legt er mit einem Klick einen neuen Tresor in `Dokumente/JARVIS-Tresor` an.

- Gelesen wird jede Zeile wie `- [ ] Text 📅 2026-10-30` (Tasks-Plugin) oder `- [ ] Text [due:: 2026-10-30]` (Dataview). `⏫`, `🔺` oder `#wichtig` heißt wichtig.
- Abhaken setzt `[x]` und `✅ Datum`, verschieben ändert das `📅`-Datum. Wiederkehrende Aufgaben (`🔁`) hakst du in Obsidian ab, damit der nächste Termin entsteht.
- Neue Aufgaben landen in `JARVIS/Eingang.md`, Notizen in `JARVIS/Notizen.md`.

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
- Einstellungen samt Mail-Passwort liegen in `~/.jarvis/config.json`, lesbar nur für deinen Benutzer. Ein Update von JARVIS ändert daran nichts.

## Wetter

Standard ist Deggendorf. Ändern über `JARVIS_WEATHER_PLACE`, `JARVIS_WEATHER_LAT` und `JARVIS_WEATHER_LON` in `.env.local`.

## Trading-Desk (`/trading`)

- **Agenten-Kacheln:** Scan und Vet arbeiten schon. Chief kommt in Phase 2, die übrigen Agenten mit dem Spielgeld-Handel in Phase 3.
- **Kurse:** Bitcoin, Ethereum und Solana in Euro (Quelle: CoinGecko).
- **Scanner:** neue Solana-Coins von DexScreener, geprüft mit den Filtern aus `src/lib/thresholds.ts`.
- **Protokoll:** was die Agenten bei jeder Aktualisierung gefunden haben. Die Daten werden alle 30 Sekunden neu geladen.

Sind CoinGecko, DexScreener oder Open-Meteo nicht erreichbar, zeigt JARVIS oben **BEISPIELDATEN**. Diese Zahlen sind erfunden und nur zur Ansicht.

## JARVIS starten

Einmalig:

1. Installiere **Node.js** in der LTS-Version von [nodejs.org](https://nodejs.org) (auf dem Mac den macOS-Installer).
2. Lade JARVIS als [ZIP-Datei](https://github.com/lettonato/Jarvis/archive/refs/heads/main.zip) herunter und entpacke sie.

**Mac:** Doppelklick auf `start-jarvis.command` im Ordner `Jarvis-main`. Meldet macOS beim ersten Mal, dass die Datei von einem nicht verifizierten Entwickler stammt: Rechtsklick auf die Datei, **Öffnen** und noch einmal **Öffnen**. Hilft das nicht, unter **Systemeinstellungen → Datenschutz & Sicherheit** auf **Trotzdem öffnen** klicken.

**Windows:** Doppelklick auf `start-jarvis.bat`.

Beim ersten Start und nach jedem Update werden die Pakete installiert, das dauert ein bis zwei Minuten. Danach öffnet sich der Browser mit `http://localhost:3000`. Zum Sprechen am besten Chrome verwenden. Das Terminal-Fenster muss offen bleiben, solange JARVIS läuft; zum Beenden schließt du es.

## Für Entwickler

```bash
npm install
npm run dev     # Entwicklungsserver auf http://127.0.0.1:3000 (nur dieser Rechner)
npm run lint
npm run build
```

Aufbau:

| Datei | Inhalt |
| --- | --- |
| `src/components/JarvisProvider.tsx` | JARVIS über allen Ansichten: Gespräch, Stimme, Besprechung, Daten |
| `src/components/AppFrame.tsx` | Navigation oben und der kleine JARVIS unten |
| `src/components/views/` | die Ansichten Fokus, Aufgaben, Post, Agenten, Einstellungen |
| `src/components/CommandCenter.tsx` | die Übersicht mit den Modul-Kacheln |
| `src/components/ParticleHead.tsx` | der 3D-Kopf aus Partikeln (three.js) |
| `src/lib/commands.ts` | was JARVIS versteht, Briefing und Besprechung |
| `src/lib/dates.ts` | Datumsangaben wie „bis Freitag“ oder „in drei Tagen“ |
| `src/lib/modules.ts` | Module und Agenten, hier kommen neue dazu |
| `src/lib/server/obsidian.ts` | Aufgaben im Obsidian-Tresor lesen und ändern |
| `src/lib/server/mail.ts` | Postfach über IMAP lesen |
| `src/lib/server/config.ts` | Einstellungen in `~/.jarvis/config.json` |
| `src/lib/server/guard.ts` | Schutz: nur Anfragen von diesem Mac |
| `src/app/api/` | Schnittstellen für Aufgaben, Post, Einstellungen, Kurse, Wetter |
| `src/lib/useVoice.ts` | Spracherkennung und Sprachausgabe im Browser |
| `src/lib/thresholds.ts`, `src/lib/vet.ts` | harte Filter aus dem Video und der Vet-Agent |
| `src/lib/market.ts` | Kurse und Scanner (CoinGecko, DexScreener) |
| `src/components/TradingDesk.tsx` | der Trading-Desk |

`JARVIS_CONFIG_DIR` legt fest, wo die Einstellungen liegen (Standard `~/.jarvis`).

API-Schlüssel gehören später in eine Datei `.env.local`. Sie wird nie hochgeladen.
