// Die Module der Kommandozentrale. Jedes Modul ist ein Agent mit eigener Aufgabe.
// Ein neuer Agent kommt dazu, indem er hier eingetragen wird; Kachel und Agenten-Seite erscheinen automatisch.
export type ModuleId =
  | "aufgaben"
  | "post"
  | "kalender"
  | "telefon"
  | "browser"
  | "trading"
  | "markt"
  | "wetter"
  | "intel"
  | "cognition";

export type JarvisModule = {
  id: ModuleId;
  code: string;
  name: string;
  tagline: string;
  // Ab welcher Phase des Bauplans das Modul arbeitet. Phase 6 = Erweiterungen nach dem Live-Handel.
  phase: number;
  // Wohin ein Klick auf die Kachel führt.
  href: string;
  // Was der Agent kann, für die Agenten-Seite.
  about: string;
  // Links stehen die Assistenten-Module, rechts Daten und Handel.
  side: "links" | "rechts";
};

export const CURRENT_PHASE = 1;

export const MODULES: JarvisModule[] = [
  {
    id: "aufgaben",
    code: "M-01",
    name: "Aufgaben",
    tagline: "Obsidian: To-dos und Fristen",
    phase: 1,
    href: "/aufgaben",
    side: "links",
    about:
      "Liest die Aufgaben aus deinem Obsidian-Tresor, sagt dir, was bis nächste Woche fällig ist, und geht die Punkte mit dir durch. Er hakt ab, verschiebt und notiert neue Aufgaben direkt in Obsidian.",
  },
  {
    id: "post",
    code: "M-02",
    name: "Post",
    tagline: "neue wichtige E-Mails",
    phase: 1,
    href: "/post",
    side: "links",
    about:
      "Schaut in deinen Posteingang, trennt wichtige Mails von Newslettern und liest sie dir vor. Aus einer Mail macht er auf Zuruf eine Aufgabe. Antworten entwirft er ab Phase 2 mit dem KI-Gehirn.",
  },
  {
    id: "kalender",
    code: "M-03",
    name: "Kalender",
    tagline: "Termine und Erinnerungen",
    phase: 1,
    href: "/kalender",
    side: "links",
    about:
      "Liest den Apple-Kalender auf deinem Mac mit allen Kalendern darin, nennt dir die Termine im Briefing und erinnert dich eine Viertelstunde vorher. Neue Termine trägt er auf Zuruf ein und zeigt dir den Tag in der Kalender-App. Ändern oder löschen kann er nichts.",
  },
  {
    id: "telefon",
    code: "M-04",
    name: "Telefon",
    tagline: "Anrufe annehmen und führen",
    phase: 6,
    href: "/agenten#telefon",
    side: "links",
    about:
      "Bekommt eine eigene Telefonnummer, nimmt Anrufe für dich an, schreibt mit, was der Anrufer will, und ruft auf deinen Auftrag an, um etwas zu erledigen, zum Beispiel einen Termin auszumachen.",
  },
  {
    id: "browser",
    code: "M-05",
    name: "Browser",
    tagline: "sucht und erledigt im Web",
    phase: 6,
    href: "/agenten#browser",
    side: "links",
    about:
      "Wenn du sagst „such mir das raus“, öffnet er eine eigene Ansicht, recherchiert im Web, vergleicht Angebote und legt dir das Ergebnis vor. Kaufen oder Absenden nur mit deiner Freigabe.",
  },
  {
    id: "trading",
    code: "M-06",
    name: "Trading",
    tagline: "Spielgeld-Handel mit Crawler",
    phase: 1,
    href: "/trading",
    side: "rechts",
    about:
      "Die Agenten aus dem GrokBot-Video: Scan findet neue Solana-Coins, Vet prüft sie mit harten Filtern, der Crawler liest Blockchain, Projektseite und mit Grok auch X, Chief bewertet den Rest. Size, Fills und Risk handeln mit 10.000 $ Spielgeld und Stop-Loss, Crawler und Risk bewachen die gekauften Coins. Echtgeld erst nach vier Wochen und nur mit deiner Freigabe.",
  },
  {
    id: "markt",
    code: "M-07",
    name: "Markt",
    tagline: "Bitcoin, Ethereum, Solana",
    phase: 1,
    href: "/trading",
    side: "rechts",
    about: "Live-Kurse von Bitcoin, Ethereum und Solana in Euro. Ab Phase 3 erkennt er Trends und gibt Prognosen ab.",
  },
  {
    id: "wetter",
    code: "M-08",
    name: "Wetter",
    tagline: "aktuell und die nächsten Tage",
    phase: 1,
    href: "/agenten#wetter",
    side: "rechts",
    about: "Aktuelles Wetter und die Vorhersage für die nächsten Tage an deinem Ort, kostenlos über Open-Meteo.",
  },
  {
    id: "intel",
    code: "M-09",
    name: "Intel",
    tagline: "News, X und Telegram",
    phase: 3,
    href: "/agenten#intel",
    side: "rechts",
    about: "Liest Nachrichten, X und Telegram mit und meldet, wenn sich der Markt dreht oder ein Coin plötzlich Aufmerksamkeit bekommt. Projektseiten, Blockchain und X-Beiträge zu Coins liest der Crawler im Trading-Desk schon heute.",
  },
  {
    id: "cognition",
    code: "M-10",
    name: "Cognition",
    tagline: "KI-Gehirn, versteht freie Sätze",
    phase: 2,
    href: "/einstellungen#gehirn",
    side: "rechts",
    about:
      "Das KI-Gehirn ist Claude von Anthropic. Damit versteht JARVIS freie Sätze, fasst Mails zusammen, legt Aufgaben mit Datum an, hakt ab und verschiebt, ganz wie du es sagst. Kurze Befehle wie „Briefing“ oder „Weiter“ erledigt er weiter sofort selbst. Eingerichtet wird es mit einem API-Schlüssel in den Einstellungen.",
  },
];

// Das KI-Gehirn arbeitet, sobald ein Claude-Schlüssel eingetragen ist, auch wenn der Bauplan noch in Phase 1 steht.
export const isActive = (m: JarvisModule, brain = false) => m.phase <= CURRENT_PHASE || (m.id === "cognition" && brain);
