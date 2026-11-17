import type { Metadata } from "next";
import { MailView } from "@/components/views/MailView";
import { RaumSeite } from "@/components/Raum";

export const metadata: Metadata = { title: "JARVIS · Post" };

export default function MailPage() {
  return (
    <RaumSeite ort="/post">
      <MailView />
    </RaumSeite>
  );
}
