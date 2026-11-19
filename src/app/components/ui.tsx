import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

/**
 * Small shared UI primitives. Prefer these over re-deriving Tailwind class
 * strings so buttons, inputs, and panels stay consistent. Styling comes from
 * the design tokens (see src/styles/tokens.css). Pass size/variant props
 * rather than overriding sizing via className (Tailwind can't reliably merge
 * conflicting utilities without tailwind-merge).
 */

const FIELD_CLASS =
  "w-full border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-ground",
  secondary: "border border-sand-300 bg-ground text-ink hover:bg-sand-100",
  ghost: "text-muted hover:text-ink",
  danger: "border border-accent text-accent hover:bg-sand-100",
};

const SIZE: Record<Size, string> = {
  sm: "min-h-[40px] px-4",
  md: "min-h-[44px] px-5",
  lg: "min-h-[48px] px-6",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-pill text-sm font-medium disabled:opacity-40 ${SIZE[size]} ${VARIANT[variant]} ${className}`}
      {...props}
    />
  );
}

export function Field({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD_CLASS} ${className}`} {...props} />;
}

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={`${FIELD_CLASS} leading-[1.5] ${className}`} {...props} />
  );
}

export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`bg-sand-50 border border-sand-300 rounded-panel ${className}`}
    >
      {children}
    </div>
  );
}
