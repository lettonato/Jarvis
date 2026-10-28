import type { ReactNode } from "react";
import { Holo } from "./HoloView";
import { Icon, type IconName } from "./icons";

// Bausteine, die alle Ansichten teilen: Glas-Kacheln mit Eckwinkeln, Überschriften, Knöpfe.

export function Brackets() {
  const base = "pointer-events-none absolute h-3 w-3 border-sky-300/70";
  return (
    <>
      <span className={`${base} left-1.5 top-1.5 border-l-2 border-t-2`} />
      <span className={`${base} right-1.5 top-1.5 border-r-2 border-t-2`} />
      <span className={`${base} bottom-1.5 left-1.5 border-b-2 border-l-2`} />
      <span className={`${base} bottom-1.5 right-1.5 border-b-2 border-r-2`} />
    </>
  );
}

export function Panel({ children, className = "", glow = false, id }: { children: ReactNode; className?: string; glow?: boolean; id?: string }) {
  return (
    <section
      id={id}
      className={`relative scroll-mt-20 rounded-xl border bg-panel/85 p-4 ${
        glow ? "border-sky-300/70 shadow-[0_0_28px_rgba(56,189,248,0.28)]" : "border-sky-300/20"
      } ${className}`}
    >
      <Brackets />
      {children}
    </section>
  );
}

// `holo` nennt die Kachel der Übersicht, aus der diese Überschrift beim Öffnen herausfliegt.
export function PageHeader({ icon, title, subtitle, holo, children }: { icon: IconName; title: string; subtitle?: ReactNode; holo?: string; children?: ReactNode }) {
  const heading = (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-sky-300/40 bg-sky-400/10 text-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.25)]">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        <h1 className="text-xl font-bold uppercase tracking-[0.25em] text-sky-100">{title}</h1>
        {subtitle && <p className="truncate text-xs text-quiet">{subtitle}</p>}
      </div>
    </div>
  );
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      {holo ? <Holo name={holo}>{heading}</Holo> : heading}
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
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
};

export function Button({ children, onClick, icon, tone = "ghost", disabled, type = "button", title, small }: ButtonProps) {
  const tones = {
    primary: "border-sky-400 bg-sky-500/80 text-white hover:bg-sky-500",
    ghost: "border-sky-300/30 bg-sky-400/5 text-sky-100 hover:border-sky-300/60 hover:bg-sky-400/15",
    danger: "border-down/50 bg-down/10 text-red-200 hover:bg-down/20",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        small ? "px-2 py-1 text-[11px]" : "px-3 py-2 text-xs"
      } ${tones[tone]}`}
    >
      {icon && <Icon name={icon} className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {children}
    </button>
  );
}

export function LinkButton({ href, children, icon }: { href: string; children: ReactNode; icon?: IconName }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-sky-300/30 bg-sky-400/5 px-3 py-2 text-xs font-bold text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-400/15"
    >
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </a>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "ok"; children: ReactNode }) {
  const tones = {
    info: "border-sky-300/30 bg-sky-400/10 text-sky-100",
    error: "border-down/50 bg-down/10 text-red-200",
    ok: "border-up/40 bg-up/10 text-green-200",
  };
  return <p className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}>{children}</p>;
}

export const inputClass =
  "w-full min-w-0 rounded-lg border border-line bg-desk/80 px-3 py-2.5 text-sm text-ink placeholder:text-quiet focus:border-sky-300/60 focus:outline-none";
