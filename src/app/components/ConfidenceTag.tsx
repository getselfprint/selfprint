import type { Claim } from "@/types/model";

/**
 * Confidence tag for a claim. Shape differs by confidence (spec §11):
 * solid outline = Stated, dashed = Inferred, filled = Tested; drafts read
 * "Draft". Shared across the Interview, Profile, and Test screens.
 */
export function ConfidenceTag({ claim }: { claim: Claim }) {
  const label =
    claim.confidence.charAt(0).toUpperCase() + claim.confidence.slice(1);
  const cls =
    claim.confidence === "tested"
      ? "bg-accent text-ground border border-accent"
      : claim.confidence === "stated"
        ? "border border-ink text-ink"
        : "border border-dashed border-muted text-muted";
  return (
    <span
      className={`self-start inline-flex items-center px-2 py-0.5 rounded-pill font-mono text-[11px] uppercase tracking-[0.06em] ${cls}`}
    >
      {label}
    </span>
  );
}
