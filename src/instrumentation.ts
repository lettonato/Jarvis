// Startet beim Hochfahren des Servers den Takt des Spielgeld-Desks, den gemeinsamen Zeitplan (Intel,
// Edelmetalle) und die Verbindung zu Telegram. Der Desk arbeitet nur, wenn du den Handel auf dem Trading-Desk gestartet hast,
// Intel nur mit xAI-Schlüssel, Telegram nur mit Bot-Schlüssel, und alle nie während des Bauens.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { startDesk } = await import("./lib/server/desk/engine");
  const { starteZeitplan } = await import("./lib/server/zeitplan-aufgaben");
  const { startTelegram } = await import("./lib/server/telegram");
  startDesk();
  starteZeitplan();
  startTelegram();
}
