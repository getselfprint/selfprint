import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Selfprint is a local-first, installable PWA. No backend, no analytics. The app
// is served at the root of its own host (try.selfprint.org locally and in prod),
// so there is no base path - `npm run dev` runs it straight at "/". The public
// marketing site is a separate repo (selfprint.org).
export default defineConfig({
  base: "/",
  plugins: [
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
        start_url: "/",
        scope: "/",
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
