import type { Metadata } from "next";
import { TasksView } from "@/components/views/TasksView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Aufgaben" };

export default function TasksPage() {
  return (
    <HoloView>
      <TasksView />
    </HoloView>
  );
}
