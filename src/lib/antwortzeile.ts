// Was die Zeile über der Leiste zeigt. Meldet JARVIS etwas zum Mikrofon oder zum Ton („Ich darf das Mikrofon nicht
// benutzen …“), steht das dort, aber nur, bis das Gespräch weitergeht. Sonst bliebe die Meldung für immer stehen
// (bei gesperrtem Mikrofon meldet sie der Browser bei jedem Klick und Tastendruck neu), und wer tippt, sähe die
// Antwort nur im aufgeklappten Gespräch. Ohne React, damit sich die Regeln prüfen lassen; der Baustein dazu steht in
// AppFrame.tsx.

// Zu einer Meldung: ihr Wortlaut, wie weit das Gespräch war, als sie neu kam (siehe fortschritt), und wie weit es
// war, als sie verschwand (weg; null, solange sie dasteht).
export type Merk = { text: string | null; bis: number; weg: number | null };
export const MERK_START: Merk = { text: null, bis: -1, weg: null };

// Zieht das Merkzeichen einer Meldung nach; gibt dasselbe Objekt zurück, wenn sich nichts ändert. Dieselben Worte
// noch einmal sind nichts Neues, auch wenn die Meldung dazwischen kurz weg war: Ohne Netz für die Spracherkennung
// nimmt der Browser sie bei jedem neuen Versuch für einen Augenblick weg. Neu ist eine andere Meldung, oder
// dieselbe, wenn das Gespräch weitergegangen ist, während sie weg war.
export function merke(merk: Merk, text: string | null, weit: number): Merk {
  if (text === null) return merk.text === null || merk.weg !== null ? merk : { ...merk, weg: weit };
  if (text !== merk.text) return { text, bis: weit, weg: null };
  if (merk.weg === null) return merk;
  return weit > merk.weg ? { text, bis: weit, weg: null } : { ...merk, weg: null };
}

// JARVIS meldet zweierlei, und beides kann zugleich dastehen: einen Fehler (rot) und einen Hinweis (ocker). Jedes
// hat sein eigenes Merkzeichen; sonst gälte ein alter Hinweis als neu, sobald ein Fehler verschwindet.
export type Merke = { fehler: Merk; hinweis: Merk };
export const MERKE_START: Merke = { fehler: MERK_START, hinweis: MERK_START };

export function merkeBeide(m: Merke, fehler: string | null, hinweis: string | null, weit: number): Merke {
  const f = merke(m.fehler, fehler, weit);
  const h = merke(m.hinweis, hinweis, weit);
  return f === m.fehler && h === m.hinweis ? m : { fehler: f, hinweis: h };
}

// Wie weit das Gespräch dieses Besuchs ist: Mit jedem neuen Zug geht es weiter, und noch einmal, wenn eine Antwort
// fertig wird. (Der erste Klick auf die Seite kann eine Frage abschicken und zugleich das Mikrofon wecken; dessen
// Meldung kommt dann, während JARVIS schon antwortet, und soll die fertige Antwort nicht verdecken.) Das
// wiederhergestellte Gespräch von vorher (alt) zählt nicht: Nach dem Neuladen ist noch nichts weitergegangen. Ohne
// Zug -1.
export function fortschritt(zuege: readonly { id: number; alt?: boolean; live?: boolean }[]): number {
  let hoechste = -1;
  let entsteht = false;
  for (const z of zuege) {
    if (z.alt) continue;
    if (z.id > hoechste) hoechste = z.id;
    if (z.live) entsteht = true;
  }
  return hoechste < 0 ? -1 : 2 * hoechste + (entsteht ? 0 : 1);
}

export type Zeile = {
  art: "fehler" | "hinweis" | "hoert" | "denkt" | "antwort";
  text: string;
  // JARVIS meldet etwas, aber die Zeile zeigt etwas anderes: Dann verweist die Überschrift auf das Gespräch.
  verdeckt: boolean;
};

// Steht eine Meldung vorn? Ja, solange das Gespräch nicht weitergegangen ist, seit sie neu kam. Passt das
// Merkzeichen nicht zu ihr, ist sie neu.
const vorn = (text: string | null, merk: Merk, weit: number): text is string => text !== null && (merk.text !== text || weit <= merk.bis);

export function zeile(e: {
  fehler: string | null;
  hinweis: string | null;
  merke: Merke;
  weit: number;
  hoert: boolean;
  interim: string;
  last: { text: string; live?: boolean; status?: string } | undefined;
  label: string;
}): Zeile {
  if (vorn(e.fehler, e.merke.fehler, e.weit)) return { art: "fehler", text: e.fehler, verdeckt: false };
  if (vorn(e.hinweis, e.merke.hinweis, e.weit)) return { art: "hinweis", text: e.hinweis, verdeckt: false };
  const verdeckt = e.fehler !== null || e.hinweis !== null;
  if (e.hoert) return { art: "hoert", text: e.interim || "…", verdeckt };
  if (e.last?.live && !e.last.text) return { art: "denkt", text: e.last.status ? `${e.last.status} …` : "Denke nach …", verdeckt };
  return { art: "antwort", text: e.last?.text ?? e.label, verdeckt };
}
