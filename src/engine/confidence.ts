import type { Answer, Claim, Confidence, LayerId } from "@/types/model";
import { newId } from "./session";

function now(): string {
  return new Date().toISOString();
}

// ---- Record factories -------------------------------------------------------

export function makeAnswer(input: {
  sessionId: string;
  layer: LayerId;
  questionSeedId: string | null;
  questionText: string;
  questionType: string;
  text: string;
  private: boolean;
}): Answer {
  return { id: newId(), createdAt: now(), ...input };
}

/** A draft claim proposed by the model (or by the copy-paste flow). */
export function makeDraftClaim(input: {
  layer: LayerId;
  text: string;
  basis: Confidence; // "inferred" | "stated" from the distiller
  evidenceAnswerIds: string[];
  quote?: string;
}): Claim {
  const ts = now();
  return {
    id: newId(),
    layer: input.layer,
    text: input.text,
    confidence: input.basis,
    status: "draft",
    evidenceAnswerIds: input.evidenceAnswerIds,
    quote: input.quote,
    singleSource: input.evidenceAnswerIds.length <= 1,
    createdBy: "model",
    createdAt: ts,
    updatedAt: ts,
  };
}

/** A claim the user wrote themselves (guided mode) - always `stated`, active. */
export function makeUserClaim(input: {
  layer: LayerId;
  text: string;
  evidenceAnswerIds: string[];
}): Claim {
  const ts = now();
  return {
    id: newId(),
    layer: input.layer,
    text: input.text,
    confidence: "stated",
    status: "active",
    evidenceAnswerIds: input.evidenceAnswerIds,
    singleSource: input.evidenceAnswerIds.length <= 1,
    createdBy: "user",
    createdAt: ts,
    updatedAt: ts,
  };
}

// ---- Confidence lifecycle (spec §4) - enforced in code, never by the model --

/** Confirm a draft as-is: it enters the profile with its confidence intact. */
export function confirmClaim(claim: Claim): Claim {
  return { ...claim, status: "active", updatedAt: now() };
}

/**
 * A user edit always wins (spec §4). Editing the text makes it the user's own
 * wording - `stated` - and clears any prior `tested` status since the claim
 * changed. createdBy becomes the user.
 */
export function editClaim(claim: Claim, text: string): Claim {
  return {
    ...claim,
    text,
    confidence: "stated",
    status: "active",
    createdBy: "user",
    updatedAt: now(),
  };
}

/**
 * Apply a Test-mode rating to the claims a persona answer drew from (spec §6).
 * 4–5 promotes them to `tested`; 1–2 flags them for review; 3 leaves them.
 */
export function applyTestRating(claim: Claim, rating: 1 | 2 | 3 | 4 | 5): Claim {
  if (rating >= 4) {
    return { ...claim, confidence: "tested", status: "active", updatedAt: now() };
  }
  if (rating <= 2) {
    return { ...claim, status: "flagged", updatedAt: now() };
  }
  return claim;
}

/** A second answer now supports a previously single-source claim (spec §4). */
export function markSupported(claim: Claim, evidenceAnswerId: string): Claim {
  if (claim.evidenceAnswerIds.includes(evidenceAnswerId)) return claim;
  return {
    ...claim,
    evidenceAnswerIds: [...claim.evidenceAnswerIds, evidenceAnswerId],
    singleSource: false,
    updatedAt: now(),
  };
}
