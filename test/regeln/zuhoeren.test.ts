// Was JARVIS aus dem macht, was das Mikrofon hört (src/lib/voiceText.ts): das Weckwort, die Wörter, mit denen du
// ihn zum Schweigen bringst, und die Frage, ob er nur sich selbst gehört hat. Reine Textregeln; wie die Seite damit
// umgeht, prüft test/hand/zuhoeren-rauch.ts mit einem nachgebauten Mikrofon im Browser.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { afterWake, hasWake, isHalt, isStop, looksLikeEcho, stopsSpeech } from "../../src/lib/voiceText";

describe("Das Weckwort „Jarvis“", () => {
  test("nur „Jarvis“ ergibt einen leeren Rest, ohne Weckwort gibt es keinen", () => {
    assert.equal(afterWake("Jarvis"), "");
    assert.equal(afterWake("Okay, Jarvis."), "");
    assert.equal(afterWake("Wie spät ist es"), null);
    assert.equal(afterWake(""), null);
    assert.equal(hasWake("Jarvis"), true);
    assert.equal(hasWake("Wie spät ist es"), false);
  });

  test("der Befehl ist, was nach dem Weckwort kommt, auch nach „Hey“ und mitten im Satz", () => {
    assert.equal(afterWake("Jarvis, wie spät ist es?"), "wie spät ist es?");
    assert.equal(afterWake("Hey Jarvis wie spät ist es"), "wie spät ist es");
    assert.equal(afterWake("ok jarvis: Briefing"), "Briefing");
    assert.equal(afterWake("Hallo Jarvis, meine Aufgaben"), "meine Aufgaben");
    assert.equal(afterWake("Sag mal, Jarvis, wie ist das Wetter"), "wie ist das Wetter");
    // Ohne Leerzeichen am Rand, wie auch immer der Erkenner den Satz liefert.
    assert.equal(afterWake("  Jarvis,   Briefing  "), "Briefing");
  });

  test("so, wie der deutsche Erkenner „Jarvis“ auch schreibt", () => {
    for (const wort of ["Jarwis", "Jervis", "Javis", "Dschawis", "Dschavis", "Tscharvis", "Tscharwis", "Scharvis", "Scharwis", "Charvis"]) {
      assert.equal(afterWake(`${wort}, Briefing`), "Briefing", wort);
    }
  });

  test("ein Wort, das nur so anfängt oder aufhört, ist kein Weckwort", () => {
    for (const satz of ["Jarvisse sind selten", "Die Scharwiskatze", "Meinjarvis Briefing"]) assert.equal(afterWake(satz), null, satz);
  });

  test("zweimal „Jarvis“ hintereinander (er hat beim ersten Mal nicht reagiert) ist ein Weckwort, kein Befehl", () => {
    assert.equal(afterWake("Jarvis Jarvis Briefing"), "Briefing");
    assert.equal(afterWake("Jarvis, Jarvis."), "");
    assert.equal(afterWake("Hey Jarvis, hey Jarvis, meine Aufgaben"), "meine Aufgaben");
    assert.equal(afterWake("Jarvis. Jarvis! Dschawis, Briefing"), "Briefing");
  });

  test("ein „Jarvis“ weiter hinten im Befehl bleibt stehen", () => {
    assert.equal(afterWake("Jarvis, wer hat Jarvis gebaut?"), "wer hat Jarvis gebaut?");
    assert.equal(afterWake("Jarvis, notiere: Jarvis neu starten"), "notiere: Jarvis neu starten");
  });

  test("bewusst so: Beginnt der Befehl selbst mit „Jarvis“, fällt auch dieses weg (der Erkenner setzt kein Komma, an dem es sich unterscheiden ließe)", () => {
    assert.equal(afterWake("Jarvis Jarvis Einstellungen öffnen"), "Einstellungen öffnen");
  });
});

describe("Wörter, nach denen JARVIS still ist und nichts ausführt", () => {
  test("die Haltewörter und der Dank, mit und ohne Satzzeichen", () => {
    for (const wort of ["Stopp", "stop.", "Halt!", "Ruhe", "Sei still", "sei ruhig", "Genug", "Abbrechen", "Aufhören", "Hör auf!", "Danke", "Danke schön", "Dankeschön", "Vielen Dank", "Schon gut", "Passt schon", "Egal"]) {
      assert.equal(isStop(wort), true, wort);
      assert.equal(isHalt(wort), true, wort);
    }
  });

  test("höflich gesagt gilt dasselbe: mit „bitte“, mit „jetzt“, nach „Okay“, „Danke dir“", () => {
    for (const wort of ["Stopp bitte", "Ruhe bitte!", "Stopp jetzt", "Ok stopp", "Okay, hör auf", "Danke dir", "Vielen Dank dir"]) {
      assert.equal(isStop(wort), true, wort);
      assert.equal(isHalt(wort), true, wort);
    }
  });

  test("ein Befehl oder eine Antwort ist kein Haltewort, auch wenn eines darin vorkommt", () => {
    for (const satz of [
      "Stopp den Handel",
      "Danke, und wie wird das Wetter?",
      "Halt die Aufgabe fest",
      "Ruhe im Kalender eintragen",
      "Nein danke",
      "Ja",
      "Nein",
      "Okay",
      "Bitte",
      "Gut genug",
      "Notiere: Danke sagen",
      "Egal welche",
      "",
    ]) {
      assert.equal(isStop(satz), false, satz);
      assert.equal(isHalt(satz), false, satz);
    }
  });

  test("mit seinem Namen davor oder dahinter, auch so, wie der Erkenner ihn schreibt", () => {
    for (const satz of ["Jarvis, stopp", "Jarvis stopp bitte", "Halt, Jarvis", "Danke, Jarvis.", "Danke, Dschawis", "Hey Jarvis, danke dir", "Stopp, Jarwis!", "Tscharvis Ruhe", "Jarvis, Jarvis, stopp"]) assert.equal(isHalt(satz), true, satz);
    // Auch wenn vor seinem Namen noch etwas steht: Es zählt, was danach kommt.
    for (const satz of ["Ach Jarvis, danke", "Sag mal, Jarvis, stopp", "Nein, Jarvis, hör auf"]) assert.equal(isHalt(satz), true, satz);
    // Nur sein Name, oder sein Name mit einem Befehl, ist kein Haltewort.
    for (const satz of ["Jarvis", "Hey Jarvis", "Jarvis, stopp den Handel", "Danke Jarvis, und jetzt das Wetter"]) assert.equal(isHalt(satz), false, satz);
  });

  test("„Okay, danke“ nach einer Antwort ist ein Dank und keine neue Frage", () => {
    const ANTWORT = "Heute hast du drei Aufgaben offen.";
    for (const satz of ["Okay, danke", "Ok danke dir", "Alles klar, danke", "Super, danke!", "Gut, danke", "Prima, vielen Dank", "Perfekt, danke schön", "Passt, danke", "Okay danke, Jarvis"]) assert.equal(isHalt(satz, ANTWORT), true, satz);
    for (const satz of ["Okay", "Gut", "Alles klar", "Passt", "Okay, und danke für gestern"]) assert.equal(isHalt(satz, ANTWORT), false, satz);
  });

  test("hat JARVIS gerade etwas gefragt, ist „Okay, danke“ eine Antwort und geht weiter; ein klares Haltewort hält trotzdem an", () => {
    for (const frage of ["Der Termin wäre am Freitag um neun. Soll ich das so eintragen?", "Soll ich die Mail vorlesen? ", "Er schrieb: „Passt das so?“"]) {
      for (const satz of ["Okay, danke", "Passt, danke", "Gut, danke", "Super, danke"]) assert.equal(isHalt(satz, frage), false, `${satz} nach: ${frage}`);
      for (const satz of ["Stopp", "Jarvis, stopp", "Danke", "Schon gut"]) assert.equal(isHalt(satz, frage), true, `${satz} nach: ${frage}`);
    }
    // Ein Fragezeichen mitten in seiner Antwort ist keine offene Frage.
    assert.equal(isHalt("Okay, danke", "Du fragst, ob es regnet? Nein, es bleibt trocken."), true);
  });
});

describe("Unterbrechen, höflich gesagt", () => {
  const SPRICHT = "Heute stehen drei Termine an, der erste um neun Uhr.";

  test("„Stopp bitte“ und „Halt bitte“ unterbrechen wie „Stopp“ und „Halt“", () => {
    for (const wort of ["Stopp bitte", "Halt bitte.", "Hör auf bitte", "der erste um neun stopp bitte"]) assert.equal(stopsSpeech(wort, SPRICHT), true, wort);
  });

  test("ein „bitte“ allein oder ein Satz, der mit „bitte“ weitergeht, unterbricht nicht", () => {
    for (const satz of ["bitte", "Stopp bitte mal die Musik", "bitte halt mir den Platz frei"]) assert.equal(stopsSpeech(satz, SPRICHT), false, satz);
  });

  test("sagt JARVIS das Haltewort gerade selbst, bleibt es der Lautsprecher, auch mit „bitte“", () => {
    assert.equal(stopsSpeech("Halt bitte", "Der Zug macht in Linz Halt und fährt dann weiter."), false);
  });
});

describe("Hat das Mikrofon nur JARVIS selbst gehört?", () => {
  const GESAGT = "Du hast heute drei Aufgaben offen, die erste ist Bauamt anrufen.";

  test("ab drei Wörtern, die fast alle eben gesagt wurden", () => {
    assert.equal(looksLikeEcho("du hast heute drei Aufgaben", GESAGT), true);
    assert.equal(looksLikeEcho("die erste ist Bauamt anrufen", GESAGT), true);
    // Ein verhörtes Wort dazwischen ändert nichts (vier von fünf).
    assert.equal(looksLikeEcho("du hast heute drei Ausgaben", GESAGT), true);
  });

  test("ein eigener Satz ist kein Echo, auch wenn Wörter daraus vorkommen", () => {
    assert.equal(looksLikeEcho("wie ist das Wetter heute", GESAGT), false);
    assert.equal(looksLikeEcho("die erste Aufgabe ist erledigt", GESAGT), false);
  });

  test("ein oder zwei Wörter gelten nie als Echo: „Erledigt“ und „Bauamt anrufen“ sind Befehle", () => {
    assert.equal(looksLikeEcho("Bauamt anrufen", GESAGT), false);
    assert.equal(looksLikeEcho("drei", GESAGT), false);
  });

  test("hat JARVIS nichts gesagt, gibt es kein Echo", () => {
    assert.equal(looksLikeEcho("du hast heute drei Aufgaben", ""), false);
  });
});
