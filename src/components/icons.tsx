import type { ReactNode } from "react";

// Strich-Symbole im Stil der NEXUS-Oberfläche. Alle 24×24, Farbe kommt von der Schrift.

const PATHS = {
  aufgaben: (
    <>
      <rect x="3" y="4" width="5" height="5" rx="1" />
      <path d="M4.5 6.5l1 1 1.8-2M11 6.5h10M3 15h5v5H3zM11 17.5h10" />
    </>
  ),
  post: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </>
  ),
  kalender: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M8 14h2M12 14h2M16 14h2M8 17h2M12 17h2" />
    </>
  ),
  telefon: <path d="M5 3h4l2 5-3 2a11 11 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" />,
  browser: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </>
  ),
  trading: (
    <>
      <path d="M6 4v16M12 2v20M18 6v12" />
      <rect x="4" y="8" width="4" height="7" />
      <rect x="10" y="5" width="4" height="9" />
      <rect x="16" y="9" width="4" height="5" />
    </>
  ),
  markt: <path d="M3 17l5-5 4 3 8-9M15 6h5v5" />,
  wetter: <path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18z" />,
  intel: <path d="M2 12h3l2-6 4 12 3-9 2 3h6" />,
  cognition: (
    <>
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
    </>
  ),
  fokus: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <circle cx="12" cy="12" r="8" strokeDasharray="3 2.2" />
    </>
  ),
  uebersicht: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  agenten: (
    <>
      <circle cx="12" cy="7" r="3" />
      <circle cx="5" cy="17" r="2.5" />
      <circle cx="19" cy="17" r="2.5" />
      <path d="M10.3 9.5L6.4 15M13.7 9.5l3.9 5.5M7.5 17h9" />
    </>
  ),
  einstellungen: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  senden: <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />,
  neu: <path d="M12 5v14M5 12h14" />,
  haken: <path d="M5 12.5l4.5 4.5L19 7" />,
  laden: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />,
  extern: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  stopp: <rect x="7" y="7" width="10" height="10" rx="1.5" />,
  hoch: <path d="M6 15l6-6 6 6" />,
  runter: <path d="M12 5v14M6 13l6 6 6-6" />,
  uhr: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  stern: <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7L12 3z" />,
  schild: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zM8.5 12l2.5 2.5 4.5-5" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
