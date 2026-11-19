// Core data model - spec §9. Pure types, no runtime behavior.

export type LayerId =
  | "facts"
  | "stories"
  | "values"
  | "triggers"
  | "contradictions"
  | "voice";

export type Confidence = "inferred" | "stated" | "tested";

export interface Answer {
  id: string;
  sessionId: string;
  layer: LayerId;
  questionSeedId: string | null; // null for follow-ups
  questionText: string;
  questionType: string;
  text: string;
  private: boolean; // never exported, never used in Mirror
  createdAt: string;
}

export interface Claim {
  id: string;
  layer: LayerId;
  text: string;
  confidence: Confidence;
  status: "draft" | "active" | "flagged";
  evidenceAnswerIds: string[];
  quote?: string;
  singleSource: boolean; // true when inferred from one answer
  createdBy: "model" | "user";
  createdAt: string;
  updatedAt: string;
}

export interface Contradiction {
  id: string;
  claimIds: [string, string];
  note: string;
  resolved: boolean; // resolved means explained, not removed
}

export interface TestRun {
  id: string;
  scenario: string;
  personaAnswer: string;
  usedClaimIds: string[];
  rating: 1 | 2 | 3 | 4 | 5 | null;
  feedback?: string;
}

export interface MirrorResponse {
  id: string;
  respondentLabel: string; // "partner", "friend"
  scales: Record<string, number>; // 0 to 100
  openAnswers: { question: string; text: string }[];
  shared: boolean;
}
