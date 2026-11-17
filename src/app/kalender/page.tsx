import type { Metadata } from "next";
import { CalendarView } from "@/components/views/CalendarView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Kalender" };

export default function CalendarPage() {
  return (
    <RaumSeite ort="/kalender">
      <CalendarView />
    </RaumSeite>
  );
}
