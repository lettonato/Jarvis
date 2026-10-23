// Die Agenten des Trading-Desks, angelehnt an das GrokBot-Video.
// `phase` sagt, ab welcher Phase des Bauplans der Agent wirklich arbeitet.
export type Agent = {
  id: "chief" | "scan" | "vet" | "social" | "size" | "fills" | "risk" | "crawler";
  name: string;
  motto: string;
  color: string;
  phase: number;
};

export const AGENTS: Agent[] = [
  { id: "chief", name: "Chief", motto: "nimmt nie selbst eine Position", color: "#e5e7eb", phase: 2 },
  { id: "scan", name: "Scan", motto: "findet, was sich bewegt", color: "#3b82f6", phase: 1 },
  { id: "vet", name: "Vet", motto: "Chain-Risiko: ist er echt?", color: "#f8fafc", phase: 1 },
  { id: "social", name: "Social", motto: "prüft das Konto des Projekts", color: "#ef4444", phase: 3 },
  { id: "size", name: "Size", motto: "wie viel", color: "#f43f5e", phase: 3 },
  { id: "fills", name: "Fills", motto: "Ausführung mit Spielgeld", color: "#22c55e", phase: 3 },
  { id: "risk", name: "Risk", motto: "Ausstieg und Stop-Loss", color: "#f59e0b", phase: 3 },
  { id: "crawler", name: "Crawler", motto: "liest zuerst, dann handelt der Desk", color: "#a78bfa", phase: 3 },
];

export { CURRENT_PHASE } from "./modules";
