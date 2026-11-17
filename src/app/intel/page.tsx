import type { Metadata } from "next";
import { IntelView } from "@/components/views/IntelView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Intel" };

export default function IntelPage() {
  return (
    <RaumSeite ort="/intel">
      <IntelView />
    </RaumSeite>
  );
}
