#!/bin/bash
# JARVIS auf dem Mac starten: im Finder doppelklicken.
cd "$(dirname "$0")" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte den macOS-Installer von https://nodejs.org installieren und danach neu starten."
  read -r -p "Enter zum Schließen ..."
  exit 1
fi

# Beim ersten Start und nach einem Update (neue package.json) fehlende Pakete installieren.
if [ ! -d node_modules ] || [ package.json -nt node_modules/.package-lock.json ]; then
  echo "Installiere Pakete, das dauert beim ersten Mal ein bis zwei Minuten ..."
  if ! npm install; then
    read -r -p "Die Installation ist fehlgeschlagen. Enter zum Schließen ..."
    exit 1
  fi
fi

# Zwischenspeicher leeren, damit nach einem Update sicher die neuen Dateien und Animationen gelten.
rm -rf .next/dev

# Läuft noch ein älteres JARVIS (etwa aus dem Ordner einer früheren Version), wird es beendet. Sonst
# landet der Browser beim alten, und ist dessen Ordner schon gelöscht, bleibt die Seite schwarz.
for pid in $(lsof -nP -iTCP:3000 -sTCP:LISTEN -t 2>/dev/null); do
  if ps -o command= -p "$pid" | grep -q next; then
    echo "Ein älteres JARVIS läuft noch, ich beende es ..."
    parent=$(ps -o ppid= -p "$pid" | tr -d ' ')
    kill "$pid" 2>/dev/null
    if [ -n "$parent" ] && ps -o command= -p "$parent" | grep -q next; then kill "$parent" 2>/dev/null; fi
    sleep 2
  fi
done
if lsof -nP -iTCP:3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Achtung: Ein anderes Programm belegt Port 3000. Bitte beenden und JARVIS neu starten."
fi

echo "JARVIS startet. Der Browser öffnet sich mit http://localhost:3000, sobald alles bereit ist."
echo "Beim ersten Start nach einem Update dauert das etwa eine Minute."
echo "Solange dieses Fenster offen ist, schläft der Mac nicht ein, damit der Spielgeld-Handel weiterläuft."
# Erst öffnen, wenn JARVIS antwortet: Die erste Anfrage baut die Seite zusammen, danach ist sie sofort da.
(
  for _ in $(seq 1 180); do
    curl -s -o /dev/null --max-time 180 http://127.0.0.1:3000/ && break
    sleep 1
  done
  open http://localhost:3000
) &
# caffeinate hält den Mac wach, solange JARVIS läuft; der Bildschirm darf trotzdem ausgehen.
caffeinate -i npm run dev
