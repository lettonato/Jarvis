import type { Metadata } from "next";
import { BrowserView } from "@/components/views/BrowserView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Browser" };

export default function BrowserPage() {
  return (
    <RaumSeite ort="/browser">
      <BrowserView />
    </RaumSeite>
  );
}
