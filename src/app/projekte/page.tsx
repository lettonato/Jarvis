import type { Metadata } from "next";
import { ProjectsView } from "@/components/views/ProjectsView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Projekte" };

export default function ProjektePage() {
  return (
    <RaumSeite ort="/projekte">
      <ProjectsView />
    </RaumSeite>
  );
}
