import type { Metadata } from "next";
import { TradingDesk } from "@/components/TradingDesk";

export const metadata: Metadata = { title: "JARVIS · Trading-Desk" };

export default function TradingPage() {
  return <TradingDesk />;
}
