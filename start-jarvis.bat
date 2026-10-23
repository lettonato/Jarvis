@echo off
title JARVIS
cd /d "%~dp0"

where node >/dev/null 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte die LTS-Version von https://nodejs.org installieren und danach neu starten.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installiere Pakete, das dauert beim ersten Mal ein bis zwei Minuten ...
  call npm install
  if errorlevel 1 (
    echo Die Installation ist fehlgeschlagen.
    pause
    exit /b 1
  )
)

echo JARVIS startet. Der Browser oeffnet sich gleich mit http://localhost:3000
start "" cmd /c "timeout /t 8 >/dev/null & start http://localhost:3000"
call npm run dev
pause
