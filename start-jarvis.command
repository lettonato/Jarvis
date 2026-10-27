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

echo "JARVIS startet. Der Browser öffnet sich gleich mit http://localhost:3000"
echo "Solange dieses Fenster offen ist, schläft der Mac nicht ein, damit der Spielgeld-Handel weiterläuft."
(sleep 8 && open http://localhost:3000) &
# caffeinate hält den Mac wach, solange JARVIS läuft; der Bildschirm darf trotzdem ausgehen.
caffeinate -i npm run dev
