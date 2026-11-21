import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Selfprint is a local-first, installable PWA. No backend, no analytics.
// The app is served under BASE so the public marketing/legal site (plain HTML
// in /site) can own "/". This is the SINGLE source of truth for that path -
// the router basename and every in-app link derive from it (import.meta.env
// .BASE_URL), so renaming the app URL only means editing this one line.
// See docs/public-site.md and the build spec (§10, §17).
const BASE = "/studio/";

// Dev only: the dev server serves the SPA under BASE, so visiting the bare
// origin ("/") otherwise shows Vite's "did you mean /studio/?" page. Redirect
// "/" (and the base without a trailing slash) into the app so that never shows.
function redirectRootToBase(): Plugin {
  return {
    name: "selfprint-redirect-root-to-base",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? "/").split("?")[0];
        if (path === "/" || path === BASE.replace(/\/$/, "")) {
          res.statusCode = 302;
          res.setHeader("Location", BASE);
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [
    redirectRootToBase(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Fonts are bundled locally (@fontsource) so the app works offline
      // and never fetches remote fonts - see spec §15.5.
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Selfprint",
        short_name: "Selfprint",
        description:
          "Interview yourself, build an editable personality model, export a persona file any AI can use. Everything stays on your device.",
        theme_color: "#1E1A15",
        background_color: "#FFFFFF",
        display: "standalone",
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the app shell + bundled fonts for full offline use.
        globPatterns: ["**/*.{js,css,html,svg,woff,woff2,png}"],
        // The WebLLM chunk is ~6 MB and only needed if the user picks the
        // in-browser model (option C) - load it on demand, never precache it.
        globIgnores: ["**/webllm-*.js"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // SPA builds under dist/studio; the static site is copied into dist/ root
    // afterwards (scripts/build-site.mjs).
    outDir: "dist/studio",
    rollupOptions: {
      output: {
        // Give the on-demand WebLLM library a stable chunk name so the service
        // worker can exclude it from precache (see workbox.globIgnores).
        manualChunks: (id) =>
          id.includes("@mlc-ai/web-llm") ? "webllm" : undefined,
      },
    },
  },
});
