import type { Metadata } from "next";
import { FocusView } from "@/components/views/FocusView";

export const metadata: Metadata = { title: "JARVIS · Fokus" };

export default function FocusPage() {
  return <FocusView />;
}
