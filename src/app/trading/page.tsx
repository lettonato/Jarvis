import type { Metadata } from "next";
import { TradingDesk } from "@/components/TradingDesk";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Trading-Desk" };

export default function TradingPage() {
  return (
    <HoloView>
      <TradingDesk />
    </HoloView>
  );
}
