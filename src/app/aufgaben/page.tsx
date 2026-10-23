import type { Metadata } from "next";
import { TasksView } from "@/components/views/TasksView";

export const metadata: Metadata = { title: "JARVIS · Aufgaben" };

export default function TasksPage() {
  return <TasksView />;
}
