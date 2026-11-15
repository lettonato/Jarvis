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

// Eine Zeitzone, in der es jetzt 12 Uhr ist. „Kommt noch“, „heute“ und „morgen“ hängen an der Uhrzeit; eine
// Prüfung, die Termine am Nachmittag anlegt, gibt sich, dem Server und dem Browser diese Zone und läuft dann zu
// jeder Tageszeit gleich. (Bei Etc/GMT ist das Vorzeichen verkehrt herum: Etc/GMT-3 liegt drei Stunden vor UTC.)
export function mittagsZone(now = new Date()): string {
  const versatz = 12 - now.getUTCHours();
  return `Etc/GMT${versatz >= 0 ? "-" : "+"}${Math.abs(versatz)}`;
}
