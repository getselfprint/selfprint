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

/**
 * App footer, mirroring the public landing page: local-first assurance, the
 * open-source link, and the privacy/terms pages (which live at the site root,
 * outside the app base, so they use plain anchors).
 */
function AppFooter() {
  const link =
    "text-muted hover:text-ink underline underline-offset-2 decoration-sand-300";
  return (
    <footer className="mt-10 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 py-7 px-[var(--pad-x)] border-t border-sand-200 font-mono text-xs text-muted">
      <span className="inline-flex items-center gap-2">
        <svg
          aria-hidden="true"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        On this device
      </span>
      <span aria-hidden="true">·</span>
      <a
        href="https://github.com/getselfprint/selfprint"
        target="_blank"
        rel="noopener noreferrer"
        className={link}
      >
        Open source
      </a>
      <span aria-hidden="true">·</span>
      <a href="/privacy" className={link}>
        Privacy
      </a>
      <span aria-hidden="true">·</span>
      <a href="/terms" className={link}>
        Terms
      </a>
    </footer>
  );
}

/** Shared chrome for every app screen: header, routed content, footer. */
export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <DemoBanner />
      <Outlet />
      <AppFooter />
    </div>
  );
}
