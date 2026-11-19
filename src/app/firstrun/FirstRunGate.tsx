import { type ReactNode, useEffect, useState } from "react";
import { SETTINGS_KEYS } from "@/store";
import { ConfigProvider, useConfig } from "@/app/config/ConfigContext";
import { ChooseHow } from "@/app/config/ChooseHow";
import { FactsForm } from "@/app/facts/FactsForm";
import { DOTS } from "@/app/screens/shared";
import { useStore } from "@/app/vault/VaultContext";

function Splash() {
  return (
    <main className={`min-h-screen flex items-center justify-center ${DOTS}`}>
      <span className="label-mono">Loading…</span>
    </main>
  );
}

/** Minimal onboarding chrome: the brand and the local/encrypted badge, matching
 * the app header. No section nav yet - the app's sections open after setup. */
function OnboardingHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-y-3 gap-x-8 py-[18px] px-[var(--pad-x)] border-b border-sand-200">
      <span className="flex items-center gap-2.5 font-heading font-semibold text-lg text-ink">
        <svg
          aria-hidden="true"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="10.5" />
          <circle cx="12" cy="12" r="6.5" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
        <span>Selfprint</span>
      </span>
      <span className="inline-flex items-center gap-2 font-mono text-xs text-muted">
        <svg
          aria-hidden="true"
          width="14"
          height="14"
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
        <span>On this device · encrypted</span>
      </span>
    </header>
  );
}

function Centered({
  children,
  wide,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <OnboardingHeader />
      <main
        className={`flex-1 flex justify-center py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
      >
        <div
          className={`w-full ${wide ? "max-w-[1000px]" : "max-w-[640px]"} flex flex-col gap-4`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * First-run sequence (spec §14): Facts form (step 3, skippable) → "Choose how
 * the interview runs" (step 4) → the app. Each step is remembered so returning
 * users go straight through.
 */
function Gate({ children }: { children: ReactNode }) {
  const store = useStore();
  const { loading, setup } = useConfig();
  const [factsDone, setFactsDone] = useState<boolean | null>(null);

  useEffect(() => {
    store.settings
      .get<boolean>(SETTINGS_KEYS.factsStepDone)
      .then((v) => setFactsDone(!!v));
  }, [store]);

  if (loading || factsDone === null) return <Splash />;

  if (!factsDone) {
    return (
      <Centered>
        <h1 className="m-0 font-heading text-[clamp(26px,3vw,36px)] tracking-[-0.02em]">
          Start with the basics
        </h1>
        <FactsForm firstRun onDone={() => setFactsDone(true)} />
      </Centered>
    );
  }

  if (!setup) {
    return (
      <Centered wide>
        <ChooseHow heading="How the interview runs" />
      </Centered>
    );
  }

  return <>{children}</>;
}

export function FirstRunGate({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <Gate>{children}</Gate>
    </ConfigProvider>
  );
}
