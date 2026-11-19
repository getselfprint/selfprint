import { App } from "./App";
import { HOME_DOTS } from "./screens/shared";
import { UnlockScreen } from "./vault/UnlockScreen";
import { useVault } from "./vault/VaultContext";
import { FirstRunGate } from "./firstrun/FirstRunGate";

/**
 * Top-level gate. A fresh device starts an on-device vault and goes straight
 * into first-run (no passphrase is forced). Only a vault the user chose to
 * passphrase-protect, and which is locked, shows the unlock screen.
 */
export function Root() {
  const { status } = useVault();

  switch (status) {
    case "loading":
      return (
        <main
          className={`min-h-screen flex items-center justify-center ${HOME_DOTS}`}
        >
          <span className="label-mono">Loading…</span>
        </main>
      );
    case "locked":
      return <UnlockScreen />;
    case "unlocked":
      return (
        <FirstRunGate>
          <App />
        </FirstRunGate>
      );
  }
}
