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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <VaultProvider>
        <Root />
      </VaultProvider>
    </BrowserRouter>
  </StrictMode>,
);
