import type { LayerId } from "@/types/model";
import storiesBank from "../../questions/stories.json";
import valuesBank from "../../questions/values.json";
import triggersBank from "../../questions/triggers.json";
import voiceBank from "../../questions/voice.json";

/** One curated seed question (spec §3, §10). */
export interface QuestionSeed {
  id: string;
  type: string;
  text: string;
  followUpHints: string[];
}

export interface QuestionBank {
  layer: LayerId;
  version: number;
  seeds: QuestionSeed[];
}

/**
 * Curated question banks, loaded from the versioned JSON files in /questions.
 * Code - not a model - owns the core set (spec §5). Layers without a bank yet
 * (facts has no AI questions; triggers/voice arrive in Milestone 2;
 * contradictions is seed-less by design) simply have no entry.
 */
const BANKS: Partial<Record<LayerId, QuestionBank>> = {
  stories: storiesBank as QuestionBank,
  values: valuesBank as QuestionBank,
  triggers: triggersBank as QuestionBank,
  voice: voiceBank as QuestionBank,
};

export function getBank(layer: LayerId): QuestionBank | undefined {
  return BANKS[layer];
}

export function getSeeds(layer: LayerId): QuestionSeed[] {
  return BANKS[layer]?.seeds ?? [];
}

/** Layers that have seed questions and can run an interview. */
export const INTERVIEWABLE_LAYERS: LayerId[] = [
  "stories",
  "values",
  "triggers",
  "voice",
];
