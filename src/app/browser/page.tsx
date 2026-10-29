import type { Metadata } from "next";
import { BrowserView } from "@/components/views/BrowserView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Browser" };

export default function BrowserPage() {
  return (
    <HoloView>
      <BrowserView />
    </HoloView>
  );
}
