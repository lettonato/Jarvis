import type { Metadata } from "next";
import { TodayView } from "@/components/views/TodayView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Heute" };

export default function HeutePage() {
  return (
    <RaumSeite ort="/">
      <TodayView />
    </RaumSeite>
  );
}
