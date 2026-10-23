# JARVIS

Dein persönlicher Assistent mit Trading-Desk. Der Bauplan steht im Dokument „JARVIS Bauplan: Assistent und Trading-Desk“.

**Stand: Phase 1, nur lesen.** Das Dashboard zeigt Live-Kurse und prüft neue Solana-Memecoins mit den harten Filtern aus dem GrokBot-Video. Es kauft und verkauft nichts.

## Was du siehst

- **Agenten-Kacheln:** Scan und Vet arbeiten schon. Chief kommt in Phase 2, die übrigen Agenten mit dem Spielgeld-Handel in Phase 3.
- **Kurse:** Bitcoin, Ethereum und Solana in Euro (Quelle: CoinGecko).
- **Scanner:** neue Solana-Coins von DexScreener, geprüft mit den Filtern aus `src/lib/thresholds.ts`.
- **Protokoll:** was die Agenten bei jeder Aktualisierung gefunden haben. Die Daten werden alle 30 Sekunden neu geladen.

Sind CoinGecko oder DexScreener nicht erreichbar, zeigt das Dashboard oben **BEISPIELDATEN** statt **LIVE**. Diese Zahlen sind erfunden und nur zur Ansicht.

## Auf deinem Windows-PC starten

Einmalig:

1. Installiere **Node.js** in der LTS-Version von [nodejs.org](https://nodejs.org).
2. Lade dieses Repository herunter: auf GitHub **Code** und dann **Download ZIP** wählen und die ZIP-Datei entpacken.

Danach jedes Mal:

3. Doppelklick auf `start-jarvis.bat`. Beim ersten Start werden die Pakete installiert, das dauert ein bis zwei Minuten.
4. Der Browser öffnet sich mit `http://localhost:3000`. Zum Beenden das schwarze Fenster schließen.

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
| `src/lib/thresholds.ts` | harte Filter aus dem Video |
| `src/lib/vet.ts` | Vet-Agent: prüft die Filter der Reihe nach |
| `src/lib/market.ts` | Kurse und Scanner (CoinGecko, DexScreener) |
| `src/lib/agents.ts` | Agenten und ab welcher Phase sie arbeiten |
| `src/app/api/market/route.ts` | Schnittstelle, die das Dashboard alle 30 Sekunden abfragt |
| `src/components/Dashboard.tsx` | die Oberfläche |

API-Schlüssel gehören später in eine Datei `.env.local`. Sie wird nie hochgeladen.
