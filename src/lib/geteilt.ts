// Geteilte Abfragen: Fragen mehrere Stellen der Oberfläche dieselbe Schnittstelle in festen Abständen ab,
// läuft dafür nur eine Abfrage, im kürzesten gewünschten Takt, und alle sehen denselben Stand. Ohne React,
// damit sich die Regeln prüfen lassen; der Haken dazu steht in usePolling.ts.

type Lader = (url: string) => Promise<unknown>;

type Quelle = {
  stand: unknown | null;
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
};

const quellen = new Map<string, Quelle>();

function melde(q: Quelle) {
  for (const a of [...q.abos.values()]) a.hoerer();
}

async function hole(url: string, q: Quelle, zusatz = ""): Promise<void> {
  const nummer = ++q.gestartet;
  try {
    const next = await q.lade(url + zusatz);
    // Ist inzwischen niemand mehr da, wird nichts gemerkt.
    if (quellen.get(url) !== q) return;
    // Kam inzwischen etwas Neueres (eine später gestartete Abfrage oder ein gesetzter Stand), ist diese Antwort
    // veraltet: Sonst tauchte etwa eine eben erledigte Freigabe für ein paar Sekunden wieder auf.
    if (nummer < q.gilt) return;
    q.gilt = nummer;
    // Hat sich nichts geändert, bleibt alles stehen: Sonst zeichnet jede Abfrage die ganze Seite neu.
    if (q.stand !== null && JSON.stringify(q.stand) === JSON.stringify(next)) return;
    q.stand = next;
    melde(q);
  } catch {
    // Beim nächsten Durchlauf erneut versuchen.
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
    q = { stand: null, abos: new Map(), timer: null, erst: null, takt: 0, lade, gestartet: 0, gilt: 0 };
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
  };
}

export const stand = (url: string): unknown | null => quellen.get(url)?.stand ?? null;

// Übernimmt einen Stand, den eine Änderung schon mitgebracht hat, für alle Stellen.
export function setze(url: string, wert: unknown): void {
  const q = quellen.get(url);
  if (!q) return;
  q.stand = wert;
  // Alles, was jetzt noch unterwegs ist, wurde vor diesem Stand gestartet und gilt nicht mehr.
  q.gilt = q.gestartet + 1;
  q.gestartet = q.gilt;
  melde(q);
}
