import type { Metadata } from "next";
import { TodayView } from "@/components/views/TodayView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Heute" };

export default function HeutePage() {
  return (
    <HoloView>
      <TodayView />
    </HoloView>
  );
}
