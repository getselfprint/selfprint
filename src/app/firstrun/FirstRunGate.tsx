import { type ReactNode } from "react";
import { ConfigProvider, useConfig } from "@/app/config/ConfigContext";
import { DownloadProvider } from "@/app/model/DownloadContext";
import { HOME_DOTS } from "@/app/screens/shared";

function Splash() {
  return (
    <main
      className={`min-h-screen flex items-center justify-center ${HOME_DOTS}`}
    >
      <span className="label-mono">Loading…</span>
    </main>
  );
}

/**
 * App providers. There is no setup wizard anymore (spec: one linear flow, no
 * stepper, no forced Basics step) - the model is chosen on the `/model`
 * screen and Facts are a Map layer, not a gate. This just waits for the stored
 * config to load, then renders the routed app. A brand-new user reaches the
 * model screen from the landing's "Start for free"; returning users land on the
 * Map.
 */
function Gate({ children }: { children: ReactNode }) {
  const { loading } = useConfig();
  if (loading) return <Splash />;
  return <>{children}</>;
}

export function FirstRunGate({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <DownloadProvider>
        <Gate>{children}</Gate>
      </DownloadProvider>
    </ConfigProvider>
  );
}
