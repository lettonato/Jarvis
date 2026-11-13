// Handprüfung der Netzschleuse mit einem echten Chrome (nicht Teil von npm test, weil sie Chrome braucht):
//   JARVIS_CHROME=/pfad/zu/chrome npx tsx test/hand/schleuse-rauch.ts /tmp/leeres-profil
// Eine erlaubte Seite versucht, einen internen Dienst zu erreichen: direkt, über localhost, über einen Namen,
// der auf 127.0.0.1 zeigt (DNS-Rebinding), per WebSocket und per Navigation. Erwartet: internHits 0.

import http from "node:http";
import { chromium } from "playwright-core";
import { starteSchleuse } from "../../src/lib/server/netzschleuse";

const listen = (h: http.RequestListener) => new Promise<{ s: http.Server; port: number }>((r) => { const s = http.createServer(h); s.listen(0, "127.0.0.1", () => r({ s, port: (s.address() as { port: number }).port })); });

(async () => {
  let internHits = 0;
  const intern = await listen((_q, r) => { internHits++; r.setHeader("access-control-allow-origin", "*"); r.end("GEHEIM-INTERN"); });
  intern.s.on("upgrade", (_q, sock) => { internHits++; sock.destroy(); });
  const seite = await listen((q, r) => { r.setHeader("content-type", "text/html"); r.end("<html><body><h1>Erlaubte Seite</h1></body></html>"); });
  const gesperrt: unknown[] = [];
  const schleuse = await starteSchleuse({
    // Gegenprobe mit KONTROLLE=1: Der interne Dienst ist dann erlaubt und muss Treffer zählen.
    erlaubt: [`127.0.0.1:${seite.port}`, ...(process.env.KONTROLLE ? [`127.0.0.1:${intern.port}`] : [])],
    lookup: async (host) => host === "rebind.test" ? [{ address: "127.0.0.1", family: 4 }] : host === "gemischt.test" ? [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.5", family: 4 }] : (() => { throw new Error("ENOTFOUND"); })(),
    gesperrt: (s) => gesperrt.push(s),
  });
  const ctx = await chromium.launchPersistentContext(process.argv[2], {
    executablePath: process.env.JARVIS_CHROME,
    headless: true,
    proxy: { server: schleuse.server, username: schleuse.username, password: schleuse.password, bypass: "<-loopback>" },
    args: ["--no-first-run", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1", "--force-webrtc-ip-handling-policy=disable_non_proxied_udp", "--webrtc-ip-handling-policy=disable_non_proxied_udp", "--disable-quic"],
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  const out: Record<string, unknown> = {};
  await page.goto(`http://127.0.0.1:${seite.port}/`);
  out.erlaubteSeite = await page.textContent("h1");
  const probe = (url: string) => page.evaluate(async (u) => { try { const r = await fetch(u, { mode: "no-cors" }); return `status ${r.status} type ${r.type}`; } catch (e) { return `fehler: ${(e as Error).message}`; } }, url);
  out.fetchRebind = await probe(`http://rebind.test:${intern.port}/`);
  out.fetchLoopbackDirekt = await probe(`http://127.0.0.1:${intern.port}/`);
  out.fetchLocalhost = await probe(`http://localhost:${intern.port}/`);
  out.fetchGemischt = await probe(`http://gemischt.test/`);
  out.ws = await page.evaluate((u) => new Promise((res) => { const w = new WebSocket(u); w.onopen = () => res("offen"); w.onerror = () => res("fehler"); setTimeout(() => res("zeit"), 4000); }), `ws://rebind.test:${intern.port}/`);
  out.wsLoopback = await page.evaluate((u) => new Promise((res) => { const w = new WebSocket(u); w.onopen = () => res("offen"); w.onerror = () => res("fehler"); setTimeout(() => res("zeit"), 4000); }), `ws://127.0.0.1:${intern.port}/`);
  const nav = await page.goto(`http://rebind.test:${intern.port}/`).then((r) => `status ${r?.status()}`, (e) => `fehler: ${String(e.message).split("\n")[0]}`);
  out.navigationRebind = nav;
  await page.waitForTimeout(800);
  out.textNachNavigation = (await page.content().catch(() => "")).includes("GEHEIM-INTERN");
  out.internHits = internHits;
  out.sperren = schleuse.sperren();
  out.gesperrt = gesperrt;
  console.log(JSON.stringify(out, null, 1));
  await ctx.close(); await schleuse.stop(); intern.s.close(); seite.s.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
