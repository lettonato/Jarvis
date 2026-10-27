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
  { id: "chief", name: "Chief", motto: "nimmt nie selbst eine Position", color: "#e5e7eb" },
  { id: "scan", name: "Scan", motto: "findet, was sich bewegt", color: "#3b82f6" },
  { id: "vet", name: "Vet", motto: "harte Filter: ist er echt?", color: "#f8fafc" },
  { id: "social", name: "Social", motto: "prüft Seite, Konten und X", color: "#ef4444" },
  { id: "size", name: "Size", motto: "wie viel: 2 % pro Trade", color: "#f43f5e" },
  { id: "fills", name: "Fills", motto: "Ausführung mit Spielgeld", color: "#22c55e" },
  { id: "risk", name: "Risk", motto: "Ausstieg und Stop-Loss", color: "#f59e0b", guards: true },
  { id: "crawler", name: "Crawler", motto: "liest zuerst, dann handelt der Desk", color: "#a78bfa", guards: true },
];
