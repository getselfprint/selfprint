/**
 * Tailwind theme mapped onto the §11 design tokens. Colors/fonts/radii point at
 * the CSS variables defined in src/styles/tokens.css, so tokens.css stays the
 * single source of truth - no duplicated hex here. Utilities like `bg-ground`,
 * `text-ink`, `border-sand-300`, `font-mono`, `rounded-card` resolve to tokens.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        sand: {
          50: "var(--sand-50)",
          100: "var(--sand-100)",
          200: "var(--sand-200)",
          300: "var(--sand-300)",
        },
        ink: "var(--ink)",
        muted: "var(--muted)",
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
        },
      },
      fontFamily: {
        heading: "var(--font-heading)",
        body: "var(--font-body)",
        mono: "var(--font-mono)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        panel: "var(--radius-panel)",
        pill: "var(--radius-pill)",
      },
      spacing: {
        tap: "var(--tap-min)",
      },
    },
  },
  plugins: [],
};
