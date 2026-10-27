import type { Metadata } from "next";
import { CalendarView } from "@/components/views/CalendarView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Kalender" };

export default function CalendarPage() {
  return (
    <HoloView>
      <CalendarView />
    </HoloView>
  );
}
