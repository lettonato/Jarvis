import type { AvatarState } from "@/lib/avatar";

// JARVIS als Lichtpunkt: ein sonnengelber Kern mit einem weichen Hof. Der Hof atmet, wenn er bereit ist,
// schlägt Wellen, wenn er zuhört, dreht sich, wenn er denkt, und pulsiert, wenn er spricht.
export function Orb({ state, className = "h-10 w-10" }: { state: AvatarState; className?: string }) {
  return (
    <span className={`relative grid shrink-0 place-items-center ${className}`} aria-hidden>
      <span
        className={`absolute inset-0 rounded-full bg-sonne/30 ${
          state === "speaking" ? "animate-[jarvis-talk_0.45s_ease-in-out_infinite_alternate]" : "animate-[jarvis-breathe_3.2s_ease-in-out_infinite]"
        }`}
      />
      {state === "thinking" && <span className="absolute inset-0 animate-[jarvis-spin_1.4s_linear_infinite] rounded-full border-2 border-dashed border-sonne" />}
      {state === "listening" && <span className="absolute inset-0 animate-ping rounded-full border-2 border-sonne" />}
      <span className="relative h-[44%] w-[44%] rounded-full bg-sonne" />
    </span>
  );
}
