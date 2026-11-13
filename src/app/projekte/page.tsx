import type { Metadata } from "next";
import { ProjectsView } from "@/components/views/ProjectsView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Projekte" };

export default function ProjektePage() {
  return (
    <HoloView>
      <ProjectsView />
    </HoloView>
  );
}
