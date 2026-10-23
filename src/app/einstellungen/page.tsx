import type { Metadata } from "next";
import { SettingsView } from "@/components/views/SettingsView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Einstellungen" };

export default function SettingsPage() {
  return (
    <HoloView>
      <SettingsView />
    </HoloView>
  );
}
