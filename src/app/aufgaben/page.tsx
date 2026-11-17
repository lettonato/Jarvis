import type { Metadata } from "next";
import { TasksView } from "@/components/views/TasksView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Aufgaben" };

export default function TasksPage() {
  return (
    <RaumSeite ort="/aufgaben">
      <TasksView />
    </RaumSeite>
  );
}
