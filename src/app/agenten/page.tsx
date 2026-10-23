import type { Metadata } from "next";
import { AgentsView } from "@/components/views/AgentsView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Agenten" };

export default function AgentsPage() {
  return (
    <HoloView>
      <AgentsView />
    </HoloView>
  );
}
