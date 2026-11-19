import type { Claim, LayerId } from "@/types/model";
import { LAYERS } from "./layers";

/**
 * Coverage is plain, deterministic code - no model involvement (spec §5, §10).
 * A layer's progress is confirmed (active/non-draft) claims against a target.
 */
export type CoverageStatus = "complete" | "in-progress" | "not-started";

export interface LayerCoverage {
  layer: LayerId;
  /** Count of confirmed (non-draft) claims. */
  confirmed: number;
  /** Target used to compute the bar; see TARGET_PER_LAYER. */
  target: number;
  /** 0..1, clamped. */
  progress: number;
  status: CoverageStatus;
}

/** Confirmed-claim target per layer before it reads as "complete". */
export const TARGET_PER_LAYER = 6;

export function statusFromProgress(
  confirmed: number,
  target: number,
): CoverageStatus {
  if (confirmed >= target) return "complete";
  if (confirmed > 0) return "in-progress";
  return "not-started";
}

export function computeCoverage(
  claims: Claim[],
  target = TARGET_PER_LAYER,
): Record<LayerId, LayerCoverage> {
  const counts = new Map<LayerId, number>();
  for (const c of claims) {
    if (c.status === "draft") continue; // drafts never count toward coverage
    counts.set(c.layer, (counts.get(c.layer) ?? 0) + 1);
  }

  const out = {} as Record<LayerId, LayerCoverage>;
  for (const def of LAYERS) {
    const confirmed = counts.get(def.id) ?? 0;
    out[def.id] = {
      layer: def.id,
      confirmed,
      target,
      progress: Math.min(1, confirmed / target),
      status: statusFromProgress(confirmed, target),
    };
  }
  return out;
}

/**
 * The next layer to interview. Layers progress surface→depth sequentially, so
 * the next session is the EARLIEST incomplete layer - you finish (or continue)
 * the one you're on before a deeper one unlocks. This both matches the design
 * reference (continue the in-progress layer) and the spec's "lowest-coverage
 * unlocked layer" under sequential unlocking (§3).
 *
 * Contradictions (05) never surfaces here - it is reached only via flagged
 * conflicts (§3). Returns null when everything is complete.
 */
export function nextLayer(
  coverage: Record<LayerId, LayerCoverage>,
): LayerId | null {
  for (const def of LAYERS) {
    if (def.id === "contradictions") continue;
    if (coverage[def.id].status !== "complete") return def.id;
  }
  return null;
}
