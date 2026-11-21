import { NavLink } from "react-router-dom";
import { useVault } from "@/app/vault/VaultContext";

// One flat menu, shown on every screen (spec: one navigation system). Test and
// Mirror live in Settings -> Diagnostics; Export is the final section of
// Profile - neither is a top-level peer.
const NAV: { to: string; label: string; end: boolean }[] = [
  { to: "/", label: "Map", end: true },
  { to: "/interview", label: "Interview", end: false },
  { to: "/profile", label: "Profile", end: false },
  { to: "/settings", label: "Settings", end: false },
];

const PILL_BASE =
  "inline-flex items-center shrink-0 whitespace-nowrap min-h-tap px-3.5 rounded-pill no-underline text-sm font-medium";

/** App header - logo on the left, the one flat menu on the right. */
export function AppHeader() {
  const { lock, hasPassphrase } = useVault();
  return (
    <header className="flex flex-wrap items-center justify-between gap-y-3 gap-x-8 min-h-[77px] py-3 px-[var(--pad-x)] border-b border-sand-200">
      <a
        href="/"
        title="Selfprint home"
        className="flex items-center gap-2.5 min-h-tap no-underline text-ink font-heading font-semibold text-lg"
      >
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
      </a>

      {/* Nav on the right. On phones it drops to its own full-width row and
          scrolls horizontally; on sm+ it sits inline, aligned right. */}
      <nav
        aria-label="Sections"
        className="order-last w-full overflow-x-auto sm:order-none sm:w-auto sm:overflow-visible -mx-[var(--pad-x)] px-[var(--pad-x)] sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max flex-nowrap items-center gap-1 sm:w-auto sm:flex-wrap sm:justify-end">
          {NAV.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) =>
                isActive
                  ? `${PILL_BASE} bg-sand-100 text-ink`
                  : `${PILL_BASE} text-muted hover:text-ink`
              }
            >
              {s.label}
            </NavLink>
          ))}
          {hasPassphrase && (
            <button
              type="button"
              onClick={() => void lock()}
              title="Lock now - require the passphrase to reopen"
              className="ml-1.5 inline-flex items-center gap-1.5 shrink-0 min-h-tap px-3 font-mono text-xs text-muted hover:text-ink"
            >
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
              Lock
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
