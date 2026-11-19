import { NavLink } from "react-router-dom";
import { useVault } from "@/app/vault/VaultContext";

const SECTIONS = [
  { to: "/app", label: "Map", end: true },
  { to: "/app/interview", label: "Interview", end: false },
  { to: "/app/profile", label: "Profile", end: false },
  { to: "/app/mirror", label: "Mirror", end: false },
  { to: "/app/test", label: "Test", end: false },
  { to: "/app/export", label: "Export", end: false },
  { to: "/app/settings", label: "Settings", end: false },
];

const PILL_BASE =
  "inline-flex items-center shrink-0 whitespace-nowrap min-h-tap px-3.5 rounded-pill no-underline text-sm font-medium";

/** App header - logo, section nav, and (when set) a Lock button. */
export function AppHeader() {
  const { lock, hasPassphrase } = useVault();
  return (
    <header className="flex flex-wrap items-center justify-between gap-y-3 gap-x-8 py-[18px] px-[var(--pad-x)] border-b border-sand-200">
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

      {/* On phones the nav drops to its own full-width row and scrolls
          horizontally (7 pills won't fit); on sm+ it wraps inline. */}
      <nav
        aria-label="Sections"
        className="order-last w-full overflow-x-auto sm:order-none sm:w-auto sm:overflow-visible -mx-[var(--pad-x)] px-[var(--pad-x)] sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max flex-nowrap gap-1 sm:w-auto sm:flex-wrap">
          {SECTIONS.map((s) => (
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
        </div>
      </nav>

      {hasPassphrase && (
        <button
          type="button"
          onClick={() => void lock()}
          title="Lock now - require the passphrase to reopen"
          className="inline-flex items-center gap-2 min-h-tap font-mono text-xs text-muted hover:text-ink"
        >
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
          <span>Lock</span>
        </button>
      )}
    </header>
  );
}
