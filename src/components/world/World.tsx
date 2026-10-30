"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useJarvis } from "../JarvisProvider";
import { useTelemetry } from "../useTelemetry";
import { setFocusHandler, setWorldStatus } from "./anchor";
import type { World as WorldApi } from "./scene";
import { holoTypes } from "@/lib/holo";
import { readWorldStyle, STYLE_EVENT, STYLE_KEY } from "@/lib/photos";
import { QUALITY_EVENT, type QualityChoice } from "@/lib/quality";
import { biomeOf } from "@/lib/world";

// Die 3D-Welt als Hintergrund hinter allen Ansichten. Sie bleibt beim Wechsel der Ansicht stehen und
// fliegt nur in die neue Landschaft; three.js wird erst im Browser geladen. In den Einstellungen lässt sich
// statt des gerechneten Gebirges die Fotowelt wählen (echte Landschaftsfotos).
export function World() {
  const mountRef = useRef<HTMLDivElement>(null);
  const world = useRef<WorldApi | null>(null);
  const pathname = usePathname();
  const place = useRef(pathname);
  const router = useRouter();
  const { state } = useJarvis();
  const { telemetry, brain } = useTelemetry();
  const latest = useRef({ state, telemetry, brain });

  useEffect(() => {
    place.current = pathname;
    latest.current = { state, telemetry, brain };
  });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let api: WorldApi | null = null;
    let gone = false;
    // Verliert der Browser kurz die Grafik und holt sie gleich zurück, bleibt die Seite, wie sie ist. Erst wenn
    // es länger dauert, zeigt sie einfache Kacheln; sonst springt die ganze Übersicht zweimal hin und her.
    let lostTimer: ReturnType<typeof setTimeout> | undefined;
    const onLost = (lost: boolean) => {
      clearTimeout(lostTimer);
      if (lost) lostTimer = setTimeout(() => setWorldStatus("aus"), 2500);
      else setWorldStatus("laeuft");
    };
    import("./scene")
      .then(({ createWorld }) => {
        if (gone) return;
        api = createWorld(mount, {
          initial: biomeOf(place.current),
          photos: readWorldStyle() === "fotos",
          onOpen: (href) => router.push(href, { transitionTypes: holoTypes(place.current, href) }),
          onLost,
        });
        world.current = api;
        const { state: s, telemetry: t, brain: b } = latest.current;
        api.setAvatar(s);
        api.setPanels(t, b);
        api.setInteractive(place.current === "/");
        setFocusHandler((id) => api?.focus(id));
        setWorldStatus("laeuft");
      })
      .catch(() => setWorldStatus("aus"));
    const restyle = () => api?.setPhotos(readWorldStyle() === "fotos");
    const requality = (e: Event) => api?.setQuality((e as CustomEvent<QualityChoice>).detail);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STYLE_KEY) restyle();
    };
    window.addEventListener(STYLE_EVENT, restyle);
    window.addEventListener(QUALITY_EVENT, requality);
    window.addEventListener("storage", onStorage);
    return () => {
      gone = true;
      clearTimeout(lostTimer);
      window.removeEventListener(STYLE_EVENT, restyle);
      window.removeEventListener(QUALITY_EVENT, requality);
      window.removeEventListener("storage", onStorage);
      api?.dispose();
      world.current = null;
      setFocusHandler(null);
    };
  }, [router]);

  useEffect(() => {
    world.current?.setBiome(biomeOf(pathname));
    world.current?.setInteractive(pathname === "/");
  }, [pathname]);

  useEffect(() => {
    world.current?.setAvatar(state);
  }, [state]);

  useEffect(() => {
    world.current?.setPanels(telemetry, brain);
  }, [telemetry, brain]);

  return <div ref={mountRef} aria-hidden className="fixed inset-0 z-0 overflow-hidden" />;
}
