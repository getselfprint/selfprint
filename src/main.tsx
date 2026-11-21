import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Fonts are bundled locally (no remote font requests) - spec §15.5.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import "./styles/tokens.css";
import "./styles/index.css";

import { Root } from "./app/Root";
import { VaultProvider } from "./app/vault/VaultContext";
import { installRecorder } from "./app/net/recorder";

// Record every outbound request so the Network panel can show it (spec §15.2).
installRecorder();

// The app is mounted under Vite's base (e.g. "/studio/"); the router treats that
// as its basename so every in-app path is written base-relative ("/", "/facts",
// "/interview", …) and the base lives in exactly one place (vite.config.ts).
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <VaultProvider>
        <Root />
      </VaultProvider>
    </BrowserRouter>
  </StrictMode>,
);
