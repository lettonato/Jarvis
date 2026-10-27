// Startet beim Hochfahren des Servers den Takt des Spielgeld-Desks. Er arbeitet nur, wenn du den
// Handel auf dem Trading-Desk gestartet hast, und nie während des Bauens.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { startDesk } = await import("./lib/server/desk/engine");
  startDesk();
}
