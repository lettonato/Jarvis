import type { Metadata } from "next";
import { MailView } from "@/components/views/MailView";
import { HoloView } from "@/components/HoloView";

export const metadata: Metadata = { title: "JARVIS · Post" };

export default function MailPage() {
  return (
    <HoloView>
      <MailView />
    </HoloView>
  );
}
