import type { Metadata } from "next";
import { SettingsView } from "@/components/views/SettingsView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Einstellungen" };

export default function SettingsPage() {
  return (
    <RaumSeite ort="/einstellungen">
      <SettingsView />
    </RaumSeite>
  );
}
