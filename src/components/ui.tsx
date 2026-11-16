import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { ladestand, type Quelle } from "@/lib/ladestand";

// Bausteine, die alle Räume teilen: die Tafel mit dem großen Wort, Abschnitte an der Wand, Knöpfe, Hinweise.

// Ein Abschnitt an der Wand: ein kräftiger Strich oben, darunter der Inhalt. Kein Kasten, die Wand ist die Fläche.
// glow hebt einen Abschnitt hervor, der dich heute braucht: Der Strich ist dann sonnengelb.
export function Panel({ children, className = "", glow = false, id }: { children: ReactNode; className?: string; glow?: boolean; id?: string }) {
  return (
    <section id={id} className={`relative scroll-mt-6 border-t-[3px] pt-4 ${glow ? "border-sonne" : "border-schiefer"} ${className}`}>
      {children}
    </section>
  );
}

// Die Überschrift eines Abschnitts an der Wand.
export function Abschnitt({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-base font-bold text-schiefer ${className}`}>{children}</h2>;
}

// Die Tafel eines Raums: eine kleine Zeile, darunter groß das Wichtigste (ohne `gross` der Name des Raums),
// dann ein Satz dazu. Rechts daneben stehen die Knöpfe des Raums.
export function PageHeader({
  title,
  subtitle,
  gross,
  satz,
  children,
}: {
  // Das Symbol gehört zur alten Oberfläche; im Glashaus trägt die Schrift.
  icon?: IconName;
  title: string;
  subtitle?: ReactNode;
  // Das große Wort an der Wand, wenn es etwas Wichtigeres gibt als den Namen des Raums (eine Uhrzeit, eine Zahl).
  gross?: string;
  // Der Satz unter dem großen Wort.
  satz?: ReactNode;
  holo?: string;
  children?: ReactNode;
}) {
  const wort = gross ?? title;
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0">
        {subtitle && <p className="max-w-[46rem] text-[1.05rem] font-medium leading-snug text-quiet">{subtitle}</p>}
        <h1 className="tafel-wort mt-1" data-lang={wort.length > 9 ? "" : undefined}>
          {gross ? <span className="sr-only">{title}: </span> : null}
          {wort}
        </h1>
        {satz && <p className="tafel-satz mt-2 max-w-[40rem]">{satz}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 pb-1">{children}</div>}
    </header>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  icon?: IconName;
  tone?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
  small?: boolean;
  // Neben einem Eingabefeld: Der Knopf bleibt einzeilig und wird nicht zusammengedrückt.
  fest?: boolean;
};

const KNOPF = {
  primary: "border-schiefer bg-schiefer text-kalk hover:bg-stein",
  ghost: "border-schiefer/25 text-schiefer hover:border-schiefer/70 hover:bg-schiefer/5",
  danger: "border-down/50 text-down hover:bg-down/10",
};

export function Button({ children, onClick, icon, tone = "ghost", disabled, type = "button", title, small, fest }: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${small ? "px-3 py-1 text-xs" : "px-4 py-2 text-sm"} ${fest ? "shrink-0 whitespace-nowrap" : ""} ${KNOPF[tone]}`}
    >
      {icon && <Icon name={icon} className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {children}
    </button>
  );
}

export function LinkButton({ href, children, icon }: { href: string; children: ReactNode; icon?: IconName }) {
  return (
    <a href={href} className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${KNOPF.ghost}`}>
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </a>
  );
}

// Der Satz, der dasteht, solange ein Raum seine Quelle nicht hat: „… lädt noch“, oder, wenn JARVIS dort nicht
// antwortet (aus), „… lässt sich gerade nicht laden“. Wer ihn benutzt, muss wissen, ob die Abfrage gescheitert ist
// (failed aus usePolling, ausfall aus useJarvis); ein eigener Ladesatz bliebe bei einem Ausfall für immer stehen
// (test/regeln/ladestand.test.ts). Gewöhnlicher Text, keine Meldung: Er steht schon da, wenn der Raum aufgeht.
export function Ladestand({ quelle, aus, className = "text-sm text-quiet" }: { quelle: Quelle; aus: boolean; className?: string }) {
  const stand = ladestand(quelle, aus);
  return (
    <p className={className} data-ladestand={stand.art}>
      {stand.text}
    </p>
  );
}

// meldung: Die Notiz ist das Ergebnis eines Klicks (gespeichert, gescheitert). Nur dann ist sie als Meldung
// ausgezeichnet, und ein Vorleseprogramm sagt sie an: einen Fehler sofort, alles andere, wenn es gerade nichts
// anderes liest. Was schon dasteht, wenn der Raum aufgeht („Der Not-Aus steht“, „Verbunden …“), bleibt gewöhnlicher
// Text: Es soll das Vorlesen nicht unterbrechen und nicht bei jeder Änderung einer Zahl neu vorgelesen werden.
export function Notice({ tone = "info", meldung, children }: { tone?: "info" | "error" | "ok"; meldung?: boolean; children: ReactNode }) {
  const tones = {
    info: "border-gletscher text-stein",
    error: "border-rot text-down",
    ok: "border-up text-up",
  };
  return (
    <p role={meldung ? (tone === "error" ? "alert" : "status") : undefined} className={`border-l-[3px] py-1 pl-3 text-sm ${tones[tone]}`}>
      {children}
    </p>
  );
}

export const inputClass =
  "w-full min-w-0 rounded border border-schiefer/25 bg-white/70 px-3 py-2.5 text-sm text-schiefer placeholder:text-quiet focus:border-schiefer focus:outline-none";
