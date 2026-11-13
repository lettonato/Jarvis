import type { Metadata } from "next";
import { FocusView } from "@/components/views/FocusView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Fokus" };

export default function FocusPage() {
  return (
    <RaumSeite ort="/fokus">
      <FocusView />
    </RaumSeite>
  );
}
