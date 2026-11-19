import type { LayerId } from "@/types/model";
import {
  getSeeds,
  INTERVIEWABLE_LAYERS,
  type QuestionSeed,
} from "@/questions";
import type { CoverageStatus } from "./coverage";

/** At most two follow-ups per question (spec §3 rule 7). */
export const MAX_FOLLOWUPS = 2;

/**
 * The follow-up ladder (spec §3). Climb one step at a time, stop after two.
 * Guided mode uses these verbatim; the model may paraphrase.
 */
export const FOLLOWUP_LADDER: string[] = [
  "What happened? Walk me through the actual event.",
  "What did you actually do?",
  "What did you feel, and did you show it?",
  "Why that choice and not the other one?",
  "Would you do the same again?",
];

export function newId(): string {
  return crypto.randomUUID();
}

/**
 * An answer is vague (spec §3) if it has no specific action, leans on
 * "usually" / "I try to" without an example, or describes what one *should*
 * do rather than what the person *did*. Heuristic, used to decide whether a
 * follow-up is warranted in guided/manual modes.
 */
export function isVague(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length < 40) return true;
  const hedges = [
    "usually",
    "i try to",
    "i tend to",
    "in general",
    "normally",
    "i would",
    "you should",
    "one should",
    "i guess",
    "it depends",
  ];
  const hasHedge = hedges.some((h) => t.includes(h));
  // A concrete past action usually names a past-tense "I did / said / told".
  const hasConcreteAction =
    /\bi (did|said|told|called|wrote|gave|left|stayed|chose|asked|refused|walked|took|made|went|helped|paid|kept)\b/.test(
      t,
    );
  return hasHedge && !hasConcreteAction;
}

/**
 * The layer the interview should run next: the first interviewable layer
 * (one with a seed bank) that isn't complete. In Milestone 1 that's stories
 * then values. Returns null when all interviewable layers are complete.
 */
export function pickInterviewLayer(
  statusOf: (layer: LayerId) => CoverageStatus,
): LayerId | null {
  for (const layer of INTERVIEWABLE_LAYERS) {
    if (statusOf(layer) !== "complete") return layer;
  }
  return null;
}

/** Next unused seed for a layer, or null when the bank is exhausted. */
export function pickNextSeed(
  layer: LayerId,
  usedSeedIds: Iterable<string>,
): QuestionSeed | null {
  const used = new Set(usedSeedIds);
  for (const seed of getSeeds(layer)) {
    if (!used.has(seed.id)) return seed;
  }
  return null;
}
