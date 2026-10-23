# JARVIS

Dein persönlicher Assistent mit Trading-Desk. Der Bauplan steht im Dokument „JARVIS Bauplan: Assistent und Trading-Desk“.

**Stand: Phase 1, nur lesen.** JARVIS zeigt Live-Kurse, Wetter und prüft neue Solana-Memecoins mit den harten Filtern aus dem GrokBot-Video. Er kauft und verkauft nichts.

## Kommandozentrale (Startseite)

- **3D-Kopf aus Partikeln** im NEXUS-Look. Er zeigt, ob JARVIS gerade zuhört, nachdenkt oder spricht.
- **Sprechen:** Mikrofon antippen und sprechen (Chrome oder Edge), JARVIS antwortet mit Stimme. Alternativ ins Textfeld schreiben.
- **Was JARVIS schon versteht:** Guten Morgen (Briefing), Wetter, Uhrzeit, Bitcoin-, Ethereum- und Solana-Kurs, Memecoins, „Öffne den Trading-Desk“. Freie Sätze versteht er ab Phase 2 mit dem KI-Gehirn.
- **Module als schwebende Kacheln:** Trading, Markt, Wetter, Cognition, Intel, Kalender, Telefon, Browser. Ein neuer Agent kommt dazu, indem er in `src/lib/modules.ts` eingetragen wird.
- **Wetter-Ort:** Standard ist Deggendorf. Ändern über `JARVIS_WEATHER_PLACE`, `JARVIS_WEATHER_LAT` und `JARVIS_WEATHER_LON` in `.env.local`.

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

Beim ersten Start werden die Pakete installiert, das dauert ein bis zwei Minuten. Danach öffnet sich der Browser mit `http://localhost:3000`. Zum Sprechen am besten Chrome verwenden. Das Terminal-Fenster muss offen bleiben, solange JARVIS läuft; zum Beenden schließt du es.

## Für Entwickler

```bash
npm install
npm run dev     # Entwicklungsserver auf http://localhost:3000
npm run lint
npm run build
```

Aufbau:

| Datei | Inhalt |
| --- | --- |
| `src/lib/modules.ts` | Module der Kommandozentrale, hier kommen neue Agenten dazu |
| `src/lib/commands.ts` | Befehle, die JARVIS bis Phase 2 versteht |
| `src/lib/useVoice.ts` | Spracherkennung und Sprachausgabe im Browser |
| `src/lib/weather.ts` | Wetter über Open-Meteo |
| `src/components/ParticleHead.tsx` | der 3D-Kopf aus Partikeln (three.js) |
| `src/components/CommandCenter.tsx` | die Kommandozentrale |
| `src/lib/thresholds.ts` | harte Filter aus dem Video |
| `src/lib/vet.ts` | Vet-Agent: prüft die Filter der Reihe nach |
| `src/lib/market.ts` | Kurse und Scanner (CoinGecko, DexScreener) |
| `src/lib/agents.ts` | Agenten und ab welcher Phase sie arbeiten |
| `src/app/api/market/route.ts` | Schnittstelle, die das Dashboard alle 30 Sekunden abfragt |
| `src/components/TradingDesk.tsx` | der Trading-Desk |

API-Schlüssel gehören später in eine Datei `.env.local`. Sie wird nie hochgeladen.
