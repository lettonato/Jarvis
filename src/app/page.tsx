import { RaumSeite } from "@/components/Raum";
import { TodayView } from "@/components/views/TodayView";

// Der Eingangsraum des Glashauses ist „Heute“.
export default function Home() {
  return (
    <RaumSeite ort="/">
      <TodayView />
    </RaumSeite>
  );
}
