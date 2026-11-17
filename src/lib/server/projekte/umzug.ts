import { isDeepStrictEqual } from "node:util";
import { speicherbar, SpeicherFehler, type ProjektSpeicher } from "./schnittstelle";

// Kopiert das Projektgedächtnis von einem Speicher in einen anderen, zum Beispiel von der Datei auf dem Mac in
// die Datenbank. Die Quelle wird nur gelesen und bleibt, wie sie ist. Kopiert wird nur in ein leeres Ziel, und
// nur ganz: Kommt dort nicht genau dasselbe an, bleibt das Ziel leer.
//
// Diese Funktion ruft heute nichts in JARVIS auf. Ein echter Umzug ist eine Entscheidung von Benedikt.
export async function kopiereSpeicher(von: ProjektSpeicher, nach: ProjektSpeicher): Promise<{ projekte: number; eintraege: number; vorschlaege: number }> {
  const quelle = { projekte: await von.projekte(), eintraege: await von.eintraege(), vorschlaege: await von.vorschlaege() };
  return nach.transaktion(async () => {
    const schon = (await nach.projekte()).length + (await nach.eintraege()).length + (await nach.vorschlaege()).length;
    if (schon > 0) throw new SpeicherFehler("Im Ziel steht schon etwas. Kopiert wird nur in einen leeren Speicher, damit nichts überschrieben wird.");
    for (const p of quelle.projekte) await nach.speichereProjekt(p);
    for (const e of quelle.eintraege) await nach.speichereEintrag(e);
    for (const v of quelle.vorschlaege) await nach.speichereVorschlag(v);
    const ziel = { projekte: await nach.projekte(), eintraege: await nach.eintraege(), vorschlaege: await nach.vorschlaege() };
    // Verglichen wird in der Form, die jeder Speicher halten kann (siehe speicherbar): Eine Datenbank bereinigt
    // Text und lässt Angaben ohne Wert weg; das ist kein Unterschied im Inhalt.
    const namen = { projekte: "Projekte", eintraege: "Einträge", vorschlaege: "Vorschläge" } as const;
    for (const teil of ["projekte", "eintraege", "vorschlaege"] as const) {
      if (isDeepStrictEqual(speicherbar(ziel[teil]), speicherbar(quelle[teil]))) continue;
      throw new SpeicherFehler(`Im Ziel ist nicht genau dasselbe angekommen wie in der Quelle (${namen[teil]}: ${quelle[teil].length} in der Quelle, ${ziel[teil].length} im Ziel). Es wurde nichts übernommen.`);
    }
    return { projekte: ziel.projekte.length, eintraege: ziel.eintraege.length, vorschlaege: ziel.vorschlaege.length };
  });
}
