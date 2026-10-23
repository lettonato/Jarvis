#!/bin/bash
# JARVIS auf dem Mac starten: im Finder doppelklicken.
cd "$(dirname "$0")" || exit 1
export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js fehlt. Bitte den macOS-Installer von https://nodejs.org installieren und danach neu starten."
  read -r -p "Enter zum Schließen ..."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installiere Pakete, das dauert beim ersten Mal ein bis zwei Minuten ..."
  if ! npm install; then
    read -r -p "Die Installation ist fehlgeschlagen. Enter zum Schließen ..."
    exit 1
  fi
fi

echo "JARVIS startet. Der Browser öffnet sich gleich mit http://localhost:3000"
(sleep 8 && open http://localhost:3000) &
npm run dev
