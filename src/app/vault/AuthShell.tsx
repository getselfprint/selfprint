import type { InputHTMLAttributes, ReactNode } from "react";
import { Button, Field } from "@/app/components/ui";
import { HOME_DOTS } from "@/app/screens/shared";

/** Centered single-card layout for the passphrase screens. */
export function AuthShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main
      className={`min-h-screen flex items-center justify-center py-[var(--pad-y)] px-[var(--pad-x)] ${HOME_DOTS}`}
    >
      <div className="w-full max-w-[40ch] flex flex-col gap-5 p-[clamp(28px,4vw,44px)] bg-sand-50 border border-sand-300 rounded-panel">
        <div className="flex items-center gap-2.5">
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10.5" />
            <circle cx="12" cy="12" r="6.5" />
            <circle cx="12" cy="12" r="2.5" />
          </svg>
          <span className="label-mono !text-ink">Selfprint</span>
        </div>
        <h1 className="m-0 text-[clamp(26px,3vw,34px)] tracking-[-0.02em]">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}

export function PassphraseField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Field type="password" autoComplete="off" {...props} />;
}

export function SubmitButton({
  children,
  disabled,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Button type="submit" size="lg" disabled={disabled} className={className}>
      {children}
    </Button>
  );
}
