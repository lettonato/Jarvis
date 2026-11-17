import type { Metadata } from "next";
import { DocumentsView } from "@/components/views/DocumentsView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Dokumente" };

export default function DokumentePage() {
  return (
    <RaumSeite ort="/dokumente">
      <DocumentsView />
    </RaumSeite>
  );
}
