// Wie fein die 3D-Welt gerechnet wird. Stufe 2 ist scharf wie der Bildschirm und leuchtet, 1 etwas
// weicher, 0 ohne Leuchten für langsame Rechner. Automatisch wählt die Welt selbst und merkt sich die Stufe;
// fest bleibt sie, wo du sie hinstellst. Gilt pro Browser, wie die Art der Landschaft.

export type QualityLevel = 0 | 1 | 2;
export type QualityChoice = "auto" | QualityLevel;

export const QUALITY_KEY = "jarvis-welt-qualitaet";
// Wurde es nach einem Aufstieg gleich wieder zu langsam, steigt die Welt ein paar Tage nicht mehr über diese Stufe.
export const QUALITY_CAP_KEY = "jarvis-welt-qualitaet-grenze";
export const QUALITY_CAP_DAYS = 3;
// Die Einstellungen sagen der Welt, dass du eine Stufe gewählt hast; die Welt meldet zurück, was sie gerade zeigt.
export const QUALITY_EVENT = "jarvis-welt-qualitaet";
export const QUALITY_SHOWN_EVENT = "jarvis-welt-qualitaet-jetzt";

export const QUALITY_LABEL: Record<QualityLevel, string> = { 2: "Hoch", 1: "Mittel", 0: "Einfach" };

const isLevel = (n: number): n is QualityLevel => n === 0 || n === 1 || n === 2;

export function readQuality(): { level: QualityLevel; fixed: boolean } {
  try {
    const v = localStorage.getItem(QUALITY_KEY) ?? "";
    const fixed = v.startsWith("fest:");
    const n = Number(fixed ? v.slice(5) : v);
    return { level: v && isLevel(n) ? n : 2, fixed };
  } catch {
    return { level: 2, fixed: false };
  }
}

export function readQualityChoice(): QualityChoice {
  const q = readQuality();
  return q.fixed ? q.level : "auto";
}

// Höchste Stufe, auf die die Welt von selbst steigen darf.
export function readQualityCap(now = Date.now()): QualityLevel {
  try {
    const [level, until] = (localStorage.getItem(QUALITY_CAP_KEY) ?? "").split("@").map(Number);
    return isLevel(level) && until > now ? level : 2;
  } catch {
    return 2;
  }
}

export function saveQualityCap(level: QualityLevel, now = Date.now()) {
  try {
    localStorage.setItem(QUALITY_CAP_KEY, `${level}@${now + QUALITY_CAP_DAYS * 86_400_000}`);
  } catch {}
}

// Die Stufe, mit der die Welt beim nächsten Laden beginnt (automatisch) oder die immer gilt (fest).
export function saveQuality(level: QualityLevel, fixed: boolean) {
  try {
    localStorage.setItem(QUALITY_KEY, fixed ? `fest:${level}` : String(level));
  } catch {}
}

export function chooseQuality(choice: QualityChoice) {
  if (choice === "auto") {
    saveQuality(readQuality().level, false);
    try {
      localStorage.removeItem(QUALITY_CAP_KEY);
    } catch {}
  } else saveQuality(choice, true);
  window.dispatchEvent(new CustomEvent(QUALITY_EVENT, { detail: choice }));
}
