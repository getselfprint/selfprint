import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useConfig } from "./config/ConfigContext";
import { AppHeader } from "./components/AppHeader";

/** A thin bar shown over every screen while browsing the demo persona. */
function DemoBanner() {
  const { demoMode, exitDemo } = useConfig();
  const [leaving, setLeaving] = useState(false);
  if (!demoMode) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-[var(--pad-x)] bg-ink text-ground text-sm">
      <span>
        Demo - you're browsing a fictional persona (Sam). Nothing here is yours.
      </span>
      <button
        type="button"
        disabled={leaving}
        onClick={async () => {
          setLeaving(true);
          await exitDemo();
        }}
        className="inline-flex items-center min-h-[36px] px-4 rounded-pill bg-ground text-ink text-sm font-medium disabled:opacity-60"
      >
        {leaving ? "Clearing…" : "Start my own →"}
      </button>
    </div>
  );
}

/** Shared chrome for every app screen: the header plus the routed content. */
export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <DemoBanner />
      <Outlet />
    </div>
  );
}
