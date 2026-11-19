import type { LayerId } from "@/types/model";

/**
 * Static metadata for the six layers (spec §2) plus the Map's visual band
 * tokens (transcribed from the 01_Map design reference). Surface → depth,
 * darker means deeper.
 */
export interface LayerDef {
  id: LayerId;
  /** Two-digit label used in the UI ("01".."06"). */
  num: string;
  name: string;
  /** Short subtitle shown on the Map (design-reference wording). */
  subtitle: string;
  /** One-line framing shown in the Interview's left rail. */
  intro?: string;
  /** Whether this layer is driven by seeds in the question bank. */
  hasSeedQuestions: boolean;
  /** CSS custom-property names for this band's surface / border / muted text. */
  band: string;
  border: string;
  muted: string;
}

export const LAYERS: LayerDef[] = [
  {
    id: "facts",
    num: "01",
    name: "Facts",
    subtitle: "Body, history, relationships, tastes",
    hasSeedQuestions: false, // structured form, no AI (§5)
    band: "--band-01",
    border: "--sand-300",
    muted: "--muted",
  },
  {
    id: "stories",
    num: "02",
    name: "Formative stories",
    subtitle: "The moments that shaped you",
    intro: "The moments that shaped you. Specifics beat summaries.",
    hasSeedQuestions: true,
    band: "--band-02",
    border: "--sand-300",
    muted: "--muted",
  },
  {
    id: "values",
    num: "03",
    name: "Values in conflict",
    subtitle: "Which value wins when two collide",
    intro: "Scenarios, not trait checklists. There are no right answers, only yours.",
    hasSeedQuestions: true,
    band: "--band-03",
    border: "--sand-300",
    muted: "--muted",
  },
  {
    id: "triggers",
    num: "04",
    name: "Triggers and soothers",
    subtitle: "What sets you off, what calms you down",
    intro: "What sets you off and what brings you back. Real examples.",
    hasSeedQuestions: true,
    band: "--band-04",
    border: "--sand-300",
    muted: "--muted",
  },
  {
    id: "contradictions",
    num: "05",
    name: "Contradictions",
    subtitle: "Where you act against your own values",
    // No seed questions; unlocks when the distiller flags a conflict (§3).
    hasSeedQuestions: false,
    band: "--band-05",
    border: "--border-05",
    muted: "--muted-05",
  },
  {
    id: "voice",
    num: "06",
    name: "Voice",
    subtitle: "Humor, phrases, how you argue and apologize",
    intro: "How you actually sound. Phrases, humor, how you argue and apologize.",
    hasSeedQuestions: true,
    band: "--band-06",
    border: "--border-06",
    muted: "--muted-06",
  },
];

export const LAYER_BY_ID: Record<LayerId, LayerDef> = Object.fromEntries(
  LAYERS.map((l) => [l.id, l]),
) as Record<LayerId, LayerDef>;
