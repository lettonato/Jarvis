import type { Metadata } from "next";
import { IntelView } from "@/components/views/IntelView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Intel" };

export default function IntelPage() {
  return (
    <HoloView>
      <IntelView />
    </HoloView>
  );
}
