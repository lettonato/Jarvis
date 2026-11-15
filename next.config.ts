import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Den Browser-Baustein lädt Node direkt; er gehört nicht in die gebündelten Serverdateien.
  serverExternalPackages: ["playwright-core"],
  partialPrefetching: true,
  experimental: {
    // Der Zwischenspeicher des Bauens übernahm eine Änderung nur am Aussehen (globals.css) etwa jedes sechste Mal
    // nicht: Exit 0, aber der alte Stand in .next/static (gemessen in Schritt J10). Ohne ihn dauert das Bauen
    // 13 statt 6 Sekunden und stimmt. `next dev` (so startet JARVIS am Mac) ist davon nicht berührt.
    turbopackFileSystemCacheForBuild: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
