import type { Answer, Claim, LayerId } from "@/types/model";
import { LAYERS } from "./layers";

/**
 * Coverage is plain, deterministic code - no model involvement (spec §5, §10).
 *
 * A layer's state is honest about two different things: how many of its
 * questions you have *answered*, and how many confirmed *claims* you have. A
 * layer is never "complete" until it has claims (answers alone don't finish a
 * layer - the model has to have drafted something), and it is never "not
 * started" once you have answered a question (even if 0 claims came out yet).
 */
export type CoverageStatus = "complete" | "in-progress" | "not-started";

export interface LayerCoverage {
  layer: LayerId;
  /** Count of confirmed (non-draft) claims. */
  confirmed: number;
  /** Distinct seed questions answered (non-follow-up), from the answers store. */
  answered: number;
  /** Questions to answer before a layer can read as complete. */
  questionTarget: number;
  /** Confirmed-claim count that also completes a layer on its own. */
  claimTarget: number;
  /** 0..1, clamped - whichever of answered/claims is closer to done. */
  progress: number;
  status: CoverageStatus;
}

/** Answer the whole question budget, then a layer completes once it has claims. */
export const QUESTIONS_PER_LAYER = 8;
/** A layer with this many confirmed claims is complete regardless of count answered. */
export const TARGET_PER_LAYER = 6;

export function statusFor(confirmed: number, answered: number): CoverageStatus {
  // Complete needs claims: either you worked the full question budget AND the
  // model drafted at least one claim, or you simply have the claim target.
  if (
    (answered >= QUESTIONS_PER_LAYER && confirmed >= 1) ||
    confirmed >= TARGET_PER_LAYER
  ) {
    return "complete";
  }
  // Any answer (or any confirmed claim) means the layer is under way.
  if (confirmed > 0 || answered > 0) return "in-progress";
  return "not-started";
}

export function computeCoverage(
  claims: Claim[],
  answers: Answer[] = [],
): Record<LayerId, LayerCoverage> {
  const claimCounts = new Map<LayerId, number>();
  for (const c of claims) {
    if (c.status === "draft") continue; // drafts never count toward coverage
    claimCounts.set(c.layer, (claimCounts.get(c.layer) ?? 0) + 1);
  }

  // Distinct seed questions answered per layer (follow-ups carry no seed id).
  const answeredSeeds = new Map<LayerId, Set<string>>();
  for (const a of answers) {
    if (!a.questionSeedId) continue;
    let set = answeredSeeds.get(a.layer);
    if (!set) answeredSeeds.set(a.layer, (set = new Set()));
    set.add(a.questionSeedId);
  }

  const out = {} as Record<LayerId, LayerCoverage>;
  for (const def of LAYERS) {
    const confirmed = claimCounts.get(def.id) ?? 0;
    const answered = answeredSeeds.get(def.id)?.size ?? 0;
    out[def.id] = {
      layer: def.id,
      confirmed,
      answered,
      questionTarget: QUESTIONS_PER_LAYER,
      claimTarget: TARGET_PER_LAYER,
      progress: Math.min(
        1,
        Math.max(answered / QUESTIONS_PER_LAYER, confirmed / TARGET_PER_LAYER),
      ),
      status: statusFor(confirmed, answered),
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
