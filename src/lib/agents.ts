// Die Agenten des Trading-Desks, angelehnt an das GrokBot-Video. Seit Phase 3 arbeiten alle,
// sobald der Spielgeld-Handel läuft; die Arbeit machen src/lib/server/desk/ und src/lib/paper.ts.
export type Agent = {
  id: "chief" | "scan" | "vet" | "social" | "size" | "fills" | "risk" | "crawler";
  name: string;
  motto: string;
  color: string;
  // Diese beiden passen auch in der Pause auf die gekauften Coins auf.
  guards?: boolean;
};

export const AGENTS: Agent[] = [
  { id: "chief", name: "Chief", motto: "nimmt nie selbst eine Position", color: "#1f2a2e" },
  { id: "scan", name: "Scan", motto: "findet, was sich bewegt", color: "#2f6fb0" },
  { id: "vet", name: "Vet", motto: "harte Filter: ist er echt?", color: "#56656a" },
  { id: "social", name: "Social", motto: "prüft Seite, Konten und X", color: "#d4442f" },
  { id: "size", name: "Size", motto: "wie viel: 2 bis 5 % pro Coin", color: "#a1487a" },
  { id: "fills", name: "Fills", motto: "Ausführung mit Spielgeld", color: "#136f43" },
  { id: "risk", name: "Risk", motto: "Ausstieg und Stop-Loss", color: "#b26a00", guards: true },
  { id: "crawler", name: "Crawler", motto: "liest zuerst, dann handelt der Desk", color: "#5d58a8", guards: true },
];
