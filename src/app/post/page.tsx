import type { Metadata } from "next";
import { MailView } from "@/components/views/MailView";

export const metadata: Metadata = { title: "JARVIS · Post" };

export default function MailPage() {
  return <MailView />;
}
