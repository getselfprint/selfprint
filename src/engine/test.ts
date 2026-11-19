import type { Claim, TestRun } from "@/types/model";
import type { LlmProvider } from "@/llm";
import { LAYERS } from "./layers";
import { PROMPTS } from "@/prompts";
import { newId } from "./session";

/** Active claims grouped by layer, each labelled with its id (for Test mode). */
export function buildProfileContext(claims: Claim[]): string {
  const active = claims.filter((c) => c.status === "active");
  const lines: string[] = [];
  for (const def of LAYERS) {
    const layerClaims = active.filter((c) => c.layer === def.id);
    if (layerClaims.length === 0) continue;
    lines.push(`## ${def.name}`);
    for (const c of layerClaims) lines.push(`- [${c.id}] ${c.text}`);
  }
  return lines.join("\n");
}

/** Generate one scenario the user hasn't been asked about (spec §6 step 1). */
export async function generateScenario(
  provider: LlmProvider,
  claims: Claim[],
  usedScenarios: string[],
): Promise<string> {
  const used =
    usedScenarios.length > 0
      ? usedScenarios.map((s) => `- ${s}`).join("\n")
      : "(none yet)";
  const user = [
    "Profile summary (confirmed claims by layer):",
    buildProfileContext(claims) || "(very little known yet)",
    "",
    "Scenarios already used (do not repeat these):",
    used,
  ].join("\n");
  const text = await provider.complete({
    system: PROMPTS.scenario,
    messages: [{ role: "user", content: user }],
    maxTokens: 300,
  });
  return text.trim();
}

export interface PersonaAnswer {
  answer: string;
  usedClaimIds: string[];
}

function personaSystem(claims: Claim[]): string {
  return [
    "You are answering as this person. Stay inside what the profile supports.",
    "If the profile does not cover a situation, say so instead of guessing.",
    "Do not claim to be the real person; you are a model of them.",
    "",
    "What is known about them (each claim has an id):",
    buildProfileContext(claims) || "(very little known yet)",
  ].join("\n");
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text.trim();
}

/**
 * Answer a scenario in character and report the claim ids relied on (spec §6).
 * Returns the parsed answer; code filters ids to real claims ("Drawn from").
 */
export async function answerAsPersona(
  provider: LlmProvider,
  claims: Claim[],
  scenario: string,
): Promise<PersonaAnswer> {
  const validIds = new Set(claims.map((c) => c.id));
  const user = [
    `Scenario: ${scenario}`,
    "",
    "Respond as this person, in the first person.",
    'Return ONLY a JSON object: {"answer": "<what you would say or do>", "used_claim_ids": ["<ids of the claims you leaned on>"]}',
  ].join("\n");

  const raw = await provider.complete({
    system: personaSystem(claims),
    messages: [{ role: "user", content: user }],
    maxTokens: 800,
    json: true,
  });

  try {
    const obj = JSON.parse(extractJson(raw)) as {
      answer?: unknown;
      used_claim_ids?: unknown;
    };
    const answer =
      typeof obj.answer === "string" && obj.answer.trim()
        ? obj.answer.trim()
        : raw.trim();
    const usedClaimIds = Array.isArray(obj.used_claim_ids)
      ? obj.used_claim_ids.filter(
          (id): id is string => typeof id === "string" && validIds.has(id),
        )
      : [];
    return { answer, usedClaimIds };
  } catch {
    // Couldn't parse structure - still show the prose, with no drawn-from.
    return { answer: raw.trim(), usedClaimIds: [] };
  }
}

export function makeTestRun(input: {
  scenario: string;
  personaAnswer: string;
  usedClaimIds: string[];
}): TestRun {
  return {
    id: newId(),
    scenario: input.scenario,
    personaAnswer: input.personaAnswer,
    usedClaimIds: input.usedClaimIds,
    rating: null,
  };
}

/** Average of the last 10 rated tests, or null if none (spec §6). */
export function matchScore(tests: TestRun[]): number | null {
  const rated = tests
    .filter((t): t is TestRun & { rating: number } => t.rating != null)
    .slice(-10);
  if (rated.length === 0) return null;
  return rated.reduce((s, t) => s + t.rating, 0) / rated.length;
}

export const MATCH_SCORE_MIN_TESTS = 5; // show on Map once there are at least 5
