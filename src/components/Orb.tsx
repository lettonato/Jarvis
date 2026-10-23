import type { AvatarState } from "./ParticleHead";

// Der kleine JARVIS für die Leiste unten: ein leuchtender Kern, der zeigt, ob er zuhört, denkt oder spricht.
export function Orb({ state, className = "h-14 w-14" }: { state: AvatarState; className?: string }) {
  return (
    <span className={`relative grid shrink-0 place-items-center ${className}`} aria-hidden>
      <span
        className={`absolute inset-0 rounded-full border border-dashed border-sky-300/60 ${state === "thinking" ? "animate-[jarvis-spin_1.6s_linear_infinite]" : "animate-[jarvis-spin_14s_linear_infinite]"}`}
      />
      <span
        className={`absolute inset-[18%] rounded-full bg-[radial-gradient(circle_at_40%_35%,#e8f6ff_0%,#8fdcff_30%,#3f7bff_65%,rgba(63,123,255,0)_100%)] ${
          state === "speaking" ? "animate-[jarvis-talk_0.45s_ease-in-out_infinite_alternate]" : "animate-[jarvis-breathe_3.2s_ease-in-out_infinite]"
        }`}
      />
      {state === "listening" && <span className="absolute inset-[-6px] animate-ping rounded-full border-2 border-sky-300/70" />}
    </span>
  );
}
