import type { Metadata } from "next";
import { AgentsView } from "@/components/views/AgentsView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Agenten" };

export default function AgentsPage() {
  return (
    <RaumSeite ort="/agenten">
      <AgentsView />
    </RaumSeite>
  );
}
