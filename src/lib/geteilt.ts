// Geteilte Abfragen: Fragen mehrere Stellen der Oberfläche dieselbe Schnittstelle in festen Abständen ab,
// läuft dafür nur eine Abfrage, im kürzesten gewünschten Takt, und alle sehen denselben Stand. Ohne React,
// damit sich die Regeln prüfen lassen; der Haken dazu steht in usePolling.ts.

import { meldeKeineAntwort } from "./verbindung";

// signal: Wird die Abfrage nach ihrer Frist aufgegeben, sagt das Signal es dem Lader, damit er sie wirklich beendet.
type Lader = (url: string, signal?: AbortSignal) => Promise<unknown>;

// Was eine Stelle sieht: der Stand und ob die Schnittstelle (noch nie da und zuletzt gescheitert) nicht antwortet.
// Dasselbe Objekt, solange sich nichts ändert; so braucht der Haken in usePolling.ts nur eine Anmeldung.
export type Bild = { stand: unknown | null; gescheitert: boolean };
const LEER: Bild = { stand: null, gescheitert: false };

type Quelle = {
  bild: Bild;
  stand: unknown | null;
  // Es gibt noch keinen Stand, und die letzte Abfrage ist gescheitert: Die Schnittstelle antwortet nicht. Das ist
  // etwas anderes als „lädt noch“, und eine Seite soll es sagen können.
  gescheitert: boolean;
  // Jede abonnierende Stelle mit ihrem Wunschtakt und dem, was sie bei einer Änderung aufruft.
  abos: Map<symbol, { ms: number; hoerer: () => void }>;
  timer: ReturnType<typeof setInterval> | null;
  // Die erste Abfrage gleich nach dem Anmelden; wird beim Abmelden zurückgenommen.
  erst: ReturnType<typeof setTimeout> | null;
  takt: number;
  lade: Lader;
  // Zählt die gestarteten Abfragen und merkt, welche zuletzt galt: Eine ältere Antwort überschreibt nie eine neuere.
  gestartet: number;
  gilt: number;
  // Fehlschläge in Folge, solange es noch keinen Stand gibt: bestimmt, wann der nächste schnelle Versuch kommt.
  fehlversuche: number;
  // Die Abfragen, die gerade unterwegs sind: Geht die letzte Stelle, werden sie beendet.
  unterwegs: Set<AbortController>;
};

const quellen = new Map<string, Quelle>();

// Wie lange nach dem soundsovielten Fehlschlag in Folge bis zum nächsten Versuch gewartet wird: 5, 15, 45 Sekunden …
export const pauseNach = (fehlversuche: number): number => 5_000 * 3 ** fehlversuche;

// Wie lange eine Abfrage höchstens unterwegs sein darf. Danach gilt sie als gescheitert und wird beendet: Sonst sagte
// ein Raum für immer „lädt noch“, und im Takt kämen immer neue hängende Abfragen dazu (der Browser lässt nur wenige
// zugleich zu, dann hinge alles). Mindestens 30 Sekunden (der Kalender am Mac darf 20 brauchen), höchstens eine Minute.
export const fristFuer = (takt: number): number => Math.min(60_000, Math.max(30_000, takt));

function melde(q: Quelle) {
  q.bild = { stand: q.stand, gescheitert: q.gescheitert };
  for (const a of [...q.abos.values()]) a.hoerer();
}

async function hole(url: string, q: Quelle, zusatz = ""): Promise<void> {
  const nummer = ++q.gestartet;
  // Aufgegeben wird eine Abfrage nach ihrer Frist, oder wenn die letzte Stelle geht (siehe abonniere).
  const abbruch = new AbortController();
  q.unterwegs.add(abbruch);
  const begonnen = Date.now();
  let fristAbgelaufen = false;
  const frist = setTimeout(() => {
    fristAbgelaufen = true;
    abbruch.abort();
  }, fristFuer(q.takt));
  try {
    // Wer zuerst fertig ist: die Antwort oder das Aufgeben. So zählt auch ein Lader als gescheitert, der auf das
    // Signal nicht hört.
    const next = await Promise.race([
      q.lade(url + zusatz, abbruch.signal),
      new Promise<never>((_, aufgegeben) => abbruch.signal.addEventListener("abort", () => aufgegeben(new Error("aufgegeben")), { once: true })),
    ]);
    // Ist inzwischen niemand mehr da, wird nichts gemerkt.
    if (quellen.get(url) !== q) return;
    // Kam inzwischen etwas Neueres (eine später gestartete Abfrage oder ein gesetzter Stand), ist diese Antwort
    // veraltet: Sonst tauchte etwa eine eben erledigte Freigabe für ein paar Sekunden wieder auf.
    if (nummer < q.gilt) return;
    q.gilt = nummer;
    q.gescheitert = false;
    q.fehlversuche = 0;
    // Hat sich nichts geändert, bleibt alles stehen: Sonst zeichnet jede Abfrage die ganze Seite neu.
    if (q.stand !== null && JSON.stringify(q.stand) === JSON.stringify(next)) return;
    q.stand = next;
    melde(q);
  } catch {
    // Nach ihrer Frist aufgegeben: Das ist eine Anfrage, die JARVIS nicht beantwortet hat (siehe verbindung.ts).
    // Scheitert der Lader selbst, meldet er das selbst (api.ts); wurde die Abfrage beendet, weil niemand mehr
    // zuhört, sagt das nichts über JARVIS.
    if (fristAbgelaufen) meldeKeineAntwort(begonnen);
    // Ein vorhandener Stand bleibt stehen; der nächste Durchlauf versucht es wieder.
    if (quellen.get(url) !== q || q.stand !== null || nummer < q.gilt) return;
    // Gab es noch nie einen Stand, wartet der nächste Versuch nicht den ganzen Takt ab (bei den Terminen wären
    // das fünf Minuten „lässt sich gerade nicht laden“ nach einem einzigen Stolperer beim Start): nach 5, dann
    // 15, dann 45 Sekunden und so fort, aber nie dichter als der Takt. Läuft schon ein jüngerer Versuch (bei
    // hängenden Abfragen laufen im kurzen Takt mehrere Fristen nacheinander ab), braucht es keinen dazu.
    if (nummer === q.gestartet) {
      const pause = pauseNach(q.fehlversuche++);
      if (pause < q.takt) {
        if (q.erst) clearTimeout(q.erst);
        q.erst = setTimeout(() => void hole(url, q), pause);
      }
    }
    // Die Stellen erfahren (einmal), dass die Schnittstelle nicht antwortet.
    if (q.gescheitert) return;
    q.gescheitert = true;
    melde(q);
  } finally {
    clearTimeout(frist);
    q.unterwegs.delete(abbruch);
  }
}

// Lädt sofort neu. zusatz hängt etwas an die Adresse an (etwa „?frisch=1“). Fehler lassen den Stand stehen.
export async function ladeNeu(url: string, zusatz = ""): Promise<void> {
  const q = quellen.get(url);
  if (q) await hole(url, q, zusatz);
}

function stelleTakt(url: string, q: Quelle) {
  const takt = Math.min(...[...q.abos.values()].map((a) => a.ms));
  if (q.timer && takt === q.takt) return;
  if (q.timer) clearInterval(q.timer);
  q.takt = takt;
  q.timer = setInterval(() => void hole(url, q), takt);
}

// Meldet eine Stelle an. Die erste lädt sofort; jede weitere bekommt den vorhandenen Stand. Gibt die Abmeldung zurück.
export function abonniere(url: string, ms: number, hoerer: () => void, lade: Lader): () => void {
  let q = quellen.get(url);
  const erste = !q;
  if (!q) {
    q = { bild: LEER, stand: null, gescheitert: false, abos: new Map(), timer: null, erst: null, takt: 0, lade, gestartet: 0, gilt: 0, fehlversuche: 0, unterwegs: new Set() };
    quellen.set(url, q);
  }
  const id = Symbol(url);
  q.abos.set(id, { ms, hoerer });
  stelleTakt(url, q);
  const quelle = q;
  if (erste) quelle.erst = setTimeout(() => void hole(url, quelle), 0);
  return () => {
    quelle.abos.delete(id);
    if (quelle.abos.size > 0) return stelleTakt(url, quelle);
    // Die letzte Stelle ist weg: Abfrage beenden und den Stand vergessen, damit später frisch geladen wird.
    if (quelle.timer) clearInterval(quelle.timer);
    if (quelle.erst) clearTimeout(quelle.erst);
    if (quellen.get(url) === quelle) quellen.delete(url);
    // Was noch unterwegs ist, braucht niemand mehr (die Antwort würde ohnehin verworfen).
    for (const abbruch of [...quelle.unterwegs]) abbruch.abort();
  };
}

export const stand = (url: string): unknown | null => quellen.get(url)?.stand ?? null;

// Stand und Ausfall zusammen, für den Haken in usePolling.ts.
export const bild = (url: string): Bild => quellen.get(url)?.bild ?? LEER;

// Die Schnittstelle hat noch nie geantwortet, und der letzte Versuch ist gescheitert.
export const gescheitert = (url: string): boolean => quellen.get(url)?.gescheitert ?? false;

// Übernimmt einen Stand, den eine Änderung schon mitgebracht hat, für alle Stellen.
export function setze(url: string, wert: unknown): void {
  const q = quellen.get(url);
  if (!q) return;
  q.stand = wert;
  q.gescheitert = false;
  q.fehlversuche = 0;
  // Alles, was jetzt noch unterwegs ist, wurde vor diesem Stand gestartet und gilt nicht mehr.
  q.gilt = q.gestartet + 1;
  q.gestartet = q.gilt;
  melde(q);
}
