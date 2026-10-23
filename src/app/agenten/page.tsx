import type { Metadata } from "next";
import { AgentsView } from "@/components/views/AgentsView";

export const metadata: Metadata = { title: "JARVIS · Agenten" };

export default function AgentsPage() {
  return <AgentsView />;
}
