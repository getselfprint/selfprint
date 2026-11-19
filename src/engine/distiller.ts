import type { Claim, Confidence, Contradiction, LayerId } from "@/types/model";
import type { LlmProvider } from "@/llm";
import { PROMPTS } from "@/prompts";
import { makeDraftClaim } from "./confidence";
import { newId } from "./session";

/** One answer (main or follow-up) that evidence can point at. */
export interface EvidenceAnswer {
  id: string;
  text: string;
}

export interface DistillInput {
  layer: LayerId;
  question: string;
  questionType: string;
  answers: EvidenceAnswer[];
  existingClaims: { id: string; text: string }[];
}

interface RawClaim {
  text: string;
  layer: string;
  basis: Confidence;
  evidence_answer_ids: string[];
  quote?: string;
}

interface RawConflict {
  claim_a_id: string;
  new_claim_index: number;
  note: string;
}

export interface DistillerOutput {
  claims: RawClaim[];
  conflicts: RawConflict[];
}

const MAX_CLAIMS = 3; // spec §4 rule 8

class DistillerSchemaError extends Error {}

/** Parse the JSON and validate the top-level shape. Throws to trigger a retry. */
function parseAndValidate(text: string): DistillerOutput {
  let obj: unknown;
  try {
    obj = JSON.parse(extractJson(text));
  } catch {
    throw new DistillerSchemaError("response was not valid JSON");
  }
  if (typeof obj !== "object" || obj === null) {
    throw new DistillerSchemaError("response was not a JSON object");
  }
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.claims)) {
    throw new DistillerSchemaError("`claims` must be an array");
  }
  const conflicts = Array.isArray(o.conflicts) ? o.conflicts : [];
  return { claims: o.claims as RawClaim[], conflicts: conflicts as RawConflict[] };
}

/** Tolerate a model that wraps JSON in prose or ```json fences. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

/**
 * Enforce the rules code owns (spec §4, §5): evidence must reference answers
 * from this turn (claims without valid evidence are rejected), cap at three
 * claims, and require a quote for `stated` (else downgrade to `inferred`).
 */
function sanitize(
  output: DistillerOutput,
  layer: LayerId,
  validAnswerIds: Set<string>,
): DistillerOutput {
  const claims = output.claims
    .filter((c) => c && typeof c.text === "string" && c.text.trim().length > 0)
    .map((c) => {
      const ids = (
        Array.isArray(c.evidence_answer_ids) ? c.evidence_answer_ids : []
      ).filter((id) => validAnswerIds.has(id));
      const hasQuote = typeof c.quote === "string" && c.quote.trim().length > 0;
      const basis: Confidence =
        c.basis === "stated" && hasQuote ? "stated" : "inferred";
      return {
        text: c.text.trim(),
        layer, // code sets the layer; never trust the model's
        basis,
        evidence_answer_ids: ids,
        quote: hasQuote ? c.quote : undefined,
      } satisfies RawClaim;
    })
    // Reject claims with no valid evidence (spec §4 rule 1).
    .filter((c) => c.evidence_answer_ids.length > 0)
    .slice(0, MAX_CLAIMS);

  const conflicts = output.conflicts.filter(
    (k) =>
      k &&
      typeof k.claim_a_id === "string" &&
      Number.isInteger(k.new_claim_index) &&
      k.new_claim_index >= 0 &&
      k.new_claim_index < claims.length,
  );

  return { claims, conflicts };
}

function formatInput(input: DistillInput): string {
  const answers = input.answers
    .map((a) => `  [${a.id}] ${a.text}`)
    .join("\n");
  const existing =
    input.existingClaims.length > 0
      ? input.existingClaims.map((c) => `  [${c.id}] ${c.text}`).join("\n")
      : "  (none yet)";
  return [
    `Layer: ${input.layer}`,
    `Question type: ${input.questionType}`,
    `Question: ${input.question}`,
    ``,
    `Answers (cite these ids in evidence_answer_ids):`,
    answers,
    ``,
    `Existing confirmed claims in this layer:`,
    existing,
    ``,
    `Return ONLY the JSON object described in your instructions.`,
  ].join("\n");
}

/**
 * Run the distiller: one model call, schema-validate, retry once with the
 * error fed back, then drop (spec §10). Returns a sanitized output.
 */
export async function distill(
  provider: LlmProvider,
  input: DistillInput,
): Promise<DistillerOutput> {
  const validIds = new Set(input.answers.map((a) => a.id));
  const userMsg = formatInput(input);

  const firstRaw = await provider.complete({
    system: PROMPTS.distiller,
    messages: [{ role: "user", content: userMsg }],
    maxTokens: 1024,
    json: true,
  });

  try {
    return sanitize(parseAndValidate(firstRaw), input.layer, validIds);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "invalid output";
    const retryRaw = await provider.complete({
      system: PROMPTS.distiller,
      messages: [
        { role: "user", content: userMsg },
        { role: "assistant", content: firstRaw },
        {
          role: "user",
          content: `That was not valid: ${reason}. Reply again with ONLY the JSON object, nothing else.`,
        },
      ],
      maxTokens: 1024,
      json: true,
    });
    try {
      return sanitize(parseAndValidate(retryRaw), input.layer, validIds);
    } catch {
      // Dropped (spec §10): better nothing than a malformed claim.
      return { claims: [], conflicts: [] };
    }
  }
}

// ---- Copy-paste flow (mode B) ----------------------------------------------

/** The prompt the user copies into their own chat AI (spec §14 option B). */
export function buildCopyPastePrompt(inputs: DistillInput[]): string {
  const blocks = inputs.map(formatInput).join("\n\n---\n\n");
  return [
    PROMPTS.distiller,
    ``,
    `Process EACH block below and return a SINGLE JSON object with combined`,
    `\`claims\` and \`conflicts\` arrays across all blocks.`,
    ``,
    blocks,
  ].join("\n");
}

/** Validate a reply the user pasted back (same rules as the automatic flow). */
export function parsePastedReply(
  text: string,
  layer: LayerId,
  validAnswerIds: Set<string>,
): DistillerOutput {
  return sanitize(parseAndValidate(text), layer, validAnswerIds);
}

// ---- Turn validated output into records ------------------------------------

export interface DistilledRecords {
  drafts: Claim[];
  contradictions: Contradiction[];
}

/**
 * Convert a sanitized distiller output into draft claims plus Contradiction
 * entries (spec §4 rule 5 - conflicts are data, not errors). Conflicts map by
 * `new_claim_index` onto the created draft's id.
 */
export function toRecords(output: DistillerOutput): DistilledRecords {
  const drafts = output.claims.map((c) =>
    makeDraftClaim({
      layer: c.layer as LayerId,
      text: c.text,
      basis: c.basis,
      evidenceAnswerIds: c.evidence_answer_ids,
      quote: c.quote,
    }),
  );
  const contradictions: Contradiction[] = output.conflicts
    .map((k): Contradiction | null => {
      const draft = drafts[k.new_claim_index];
      if (!draft) return null;
      return {
        id: newId(),
        claimIds: [k.claim_a_id, draft.id],
        note: k.note,
        resolved: false,
      };
    })
    .filter((c): c is Contradiction => c !== null);

  return { drafts, contradictions };
}
