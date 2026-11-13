import type { Metadata } from "next";
import { TradingDesk } from "@/components/TradingDesk";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Trading-Desk" };

export default function TradingPage() {
  return (
    <RaumSeite ort="/trading">
      <TradingDesk />
    </RaumSeite>
  );
}
