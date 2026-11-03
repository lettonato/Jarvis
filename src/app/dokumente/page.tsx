import type { Metadata } from "next";
import { DocumentsView } from "@/components/views/DocumentsView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Dokumente" };

export default function DokumentePage() {
  return (
    <HoloView>
      <DocumentsView />
    </HoloView>
  );
}
