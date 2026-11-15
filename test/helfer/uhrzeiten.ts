// Uhrzeiten für Prüfungen, die nicht von der Tageszeit abhängen dürfen.
//
// Der Edelmetall-Agent liest von selbst, wenn eine seiner Uhrzeiten höchstens zwei Stunden zurückliegt (ab Werk
// 07:30 und 17:30). Eine Prüfung, die zählt, wie oft der Kursdienst gefragt wurde, scheitert sonst genau dann,
// wenn sie zwischen 07:30 und 09:30 oder zwischen 17:30 und 19:30 läuft. Diese Uhrzeiten liegen acht und zwölf
// Stunden nach jetzt: weit hinter dem Nachholfenster und während der Prüfung nicht erreichbar.

const zweistellig = (n: number) => String(n).padStart(2, "0");
const nach = (now: Date, stunden: number) => {
  const t = new Date(now.getTime() + stunden * 3_600_000);
  return `${zweistellig(t.getHours())}:${zweistellig(t.getMinutes())}`;
};

// Zwei Uhrzeiten in der Form 07:30, aufsteigend sortiert (so speichert und zeigt JARVIS sie).
export function ferneZeiten(now = new Date()): [string, string] {
  const [a, b] = [nach(now, 8), nach(now, 12)].sort();
  return [a, b];
}
