// Startet beim Hochfahren des Servers den Takt des Spielgeld-Desks und den Zeitplan von Intel. Der Desk
// arbeitet nur, wenn du den Handel auf dem Trading-Desk gestartet hast, Intel nur mit xAI-Schlüssel,
// und beide nie während des Bauens.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { startDesk } = await import("./lib/server/desk/engine");
  const { startIntel } = await import("./lib/server/intel");
  startDesk();
  startIntel();
}
