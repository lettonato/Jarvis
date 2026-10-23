import type { Metadata } from "next";
import { FocusView } from "@/components/views/FocusView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Fokus" };

export default function FocusPage() {
  return (
    <HoloView>
      <FocusView />
    </HoloView>
  );
}
