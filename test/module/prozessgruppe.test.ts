// Das Beenden einer Prozessgruppe für die Handprüfungen (test/helfer/prozessgruppe.ts). Der gebaute Server
// (`next start`) hört nach dem Signal zum Beenden zwar auf, neue Verbindungen anzunehmen, bedient aber offene
// Verbindungen weiter, solange sie genutzt werden. Eine Prüfung, die JARVIS neu startet, bekam deshalb manchmal
// noch Antworten vom alten Prozess mit dem alten Stand im Speicher. Hier laufen echte kleine Prozesse.

import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { afterEach, describe, test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { beendeGruppe, beendeMitMarke, gruppeLebt, prozesseMitMarke } from "../helfer/prozessgruppe";

// Unter Linux lässt sich über /proc mehr feststellen; die Tests dafür gibt es nur dort.
const LINUX = existsSync("/proc/self/environ");

const BLEIBT = `process.on("SIGTERM", () => {}); console.log("bereit"); setInterval(() => {}, 1000);`;
const GEHT = `console.log("bereit"); setInterval(() => {}, 1000);`;
// Wie `npx next start`: Der Anführer der Gruppe endet beim Signal, sein Kind läuft weiter.
const KIND_BLEIBT = `require("node:child_process").spawn(process.execPath, ["-e", ${JSON.stringify(BLEIBT)}], { stdio: "inherit" }); setInterval(() => {}, 1000);`;

// Wie eine Handprüfung: Sie startet ihren Server in einer eigenen Gruppe; wer nur die Gruppe der Prüfung beendet,
// lässt ihn laufen.
const EIGENE_GRUPPE = `const k = require("node:child_process").spawn(process.execPath, ["-e", ${JSON.stringify(BLEIBT)}], { stdio: "inherit", detached: true }); console.log("pid " + k.pid); setInterval(() => {}, 1000);`;

// Alles, was ein Test startet, wird nach ihm hart beendet, auch wenn er scheitert. Sonst bliebe der Testlauf hängen.
const gestartet: number[] = [];
afterEach(() => {
  for (const pid of gestartet.splice(0)) {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {}
  }
});

function starte(code: string, env: NodeJS.ProcessEnv = process.env): Promise<ChildProcess> {
  return new Promise((fertig, fehler) => {
    const kind = spawn(process.execPath, ["-e", code], { detached: true, env, stdio: ["ignore", "pipe", "ignore"] });
    kind.on("error", fehler);
    gestartet.push(kind.pid!);
    let text = "";
    kind.stdout!.on("data", (d: Buffer) => {
      text += d.toString();
      for (const m of text.matchAll(/^pid (\d+)$/gm)) if (!gestartet.includes(Number(m[1]))) gestartet.push(Number(m[1]));
      if (text.includes("bereit")) fertig(kind);
    });
  });
}

// Windows kennt keine Prozessgruppen. Die Handprüfungen laufen dort nicht, also gibt es dort auch diese Tests nicht.
const POSIX = process.platform !== "win32";

if (POSIX) describe("Prozessgruppe beenden", () => {
  test("ein Prozess, der auf das Signal hört, endet sauber", async () => {
    const kind = await starte(GEHT);
    assert.equal(gruppeLebt(kind.pid!), true);
    assert.equal(await beendeGruppe(kind.pid!, { fristMs: 3000 }), "sauber");
    assert.equal(gruppeLebt(kind.pid!), false);
  });

  test("ein Prozess, der das Signal übergeht, wird nach der Frist hart beendet, nicht vorher", async () => {
    const kind = await starte(BLEIBT);
    const start = Date.now();
    assert.equal(await beendeGruppe(kind.pid!, { fristMs: 400 }), "hart");
    assert.ok(Date.now() - start >= 400, "die Frist wird abgewartet");
    assert.equal(gruppeLebt(kind.pid!), false);
  });

  test("endet nur der Anführer und sein Kind läuft weiter, gilt die Gruppe als lebendig und wird ganz beendet", async () => {
    const kind = await starte(KIND_BLEIBT);
    const ende = new Promise((r) => kind.on("exit", r));
    process.kill(-kind.pid!, "SIGTERM");
    await ende;
    assert.equal(gruppeLebt(kind.pid!), true, "das Kind lebt noch, obwohl der Anführer weg ist");
    assert.equal(await beendeGruppe(kind.pid!, { fristMs: 300 }), "hart");
    assert.equal(gruppeLebt(kind.pid!), false);
  });

  test("gibt es die Gruppe nicht mehr, passiert nichts", async () => {
    const kind = await starte(GEHT);
    await beendeGruppe(kind.pid!, { fristMs: 3000 });
    assert.equal(await beendeGruppe(kind.pid!, { fristMs: 3000 }), "weg");
  });

  // Ein beendeter Prozess, den sein Elternprozess noch nicht abgeholt hat (Zombie), zählt für das System noch
  // zur Gruppe. Holt ihn niemand zügig ab (in manchen Containern), hielte die Prüfung die Gruppe sonst für lebendig.
  if (LINUX)
    test("eine Gruppe, in der nur noch ein beendeter, nicht abgeholter Prozess steht, gilt als beendet", async () => {
      // sleep holt sein Kind nie ab; das Kind bekommt mit setsid eine eigene Gruppe, nennt sie und endet.
      const kind = spawn("sh", ["-c", `setsid sh -c 'echo pid $$' & exec sleep 1000`], { detached: true, stdio: ["ignore", "pipe", "ignore"] });
      gestartet.push(kind.pid!);
      const zombie = await new Promise<number>((fertig) => {
        let text = "";
        kind.stdout!.on("data", (d: Buffer) => {
          text += d.toString();
          const m = /^pid (\d+)$/m.exec(text);
          if (m) fertig(Number(m[1]));
        });
      });
      const bis = Date.now() + 3000;
      while (!/\) Z /.test(readFileSync(`/proc/${zombie}/stat`, "utf8")) && Date.now() < bis) await new Promise((r) => setTimeout(r, 20));
      assert.match(readFileSync(`/proc/${zombie}/stat`, "utf8"), /\) Z /, "Vorbedingung: Der Prozess ist beendet und nicht abgeholt");
      assert.doesNotThrow(() => process.kill(-zombie, 0), "Vorbedingung: Für das System gibt es die Gruppe noch");
      assert.equal(gruppeLebt(zombie), false);
      assert.equal(await beendeGruppe(zombie, { fristMs: 200 }), "weg");
    });
});

// Der Sammellauf gibt jeder Prüfung eine Marke in die Umgebung mit. Alles, was die Prüfung startet, erbt sie,
// auch der Server in seiner eigenen Gruppe. So findet der Sammellauf nach einem Abbruch, was noch läuft.
if (POSIX) describe("Prozesse an ihrer Marke finden und beenden", () => {
  const marke = () => `test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (!LINUX)
    test("ohne /proc heißt die Antwort „unbekannt“, nicht „nichts läuft“", async () => {
      assert.equal(prozesseMitMarke("JARVIS_HANDLAUF", marke()), null);
      assert.equal(await beendeMitMarke("JARVIS_HANDLAUF", marke()), null);
    });

  if (LINUX)
    test("findet die Prüfung und ihren Server in eigener Gruppe, sonst nichts, und beendet beide", async () => {
      const wert = marke();
      const fremd = await starte(GEHT, { ...process.env, JARVIS_HANDLAUF: `${wert}-anders` });
      const kind = await starte(EIGENE_GRUPPE, { ...process.env, JARVIS_HANDLAUF: wert });
      const gefunden = prozesseMitMarke("JARVIS_HANDLAUF", wert)!;
      assert.equal(gefunden.length, 2, "die Prüfung und ihr Server");
      assert.ok(gefunden.includes(kind.pid!) && !gefunden.includes(fremd.pid!));
      // Nur die Gruppe der Prüfung beenden reicht nicht: Der Server läuft weiter.
      await beendeGruppe(kind.pid!, { fristMs: 200 });
      assert.equal(prozesseMitMarke("JARVIS_HANDLAUF", wert)!.length, 1, "der Server in eigener Gruppe lebt noch");
      assert.equal(await beendeMitMarke("JARVIS_HANDLAUF", wert), 1);
      assert.deepEqual(prozesseMitMarke("JARVIS_HANDLAUF", wert), []);
      assert.equal(gruppeLebt(fremd.pid!), true, "ein Prozess mit anderer Marke bleibt unberührt");
      await beendeGruppe(fremd.pid!);
    });

  if (LINUX)
    test("läuft nichts mit der Marke, wird nichts beendet", async () => {
      assert.deepEqual(prozesseMitMarke("JARVIS_HANDLAUF", marke()), []);
      assert.equal(await beendeMitMarke("JARVIS_HANDLAUF", marke()), 0);
    });
});
