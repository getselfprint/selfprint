import type { Answer, Claim, LayerId } from "@/types/model";
import { LAYERS } from "@/engine/layers";
import { PROMPTS } from "@/prompts";

/**
 * Export assembly (spec §8, §10). The persona file is a FIXED template filled
 * with confirmed claims - no model rewrites the user's claims at export time.
 * Name redaction is plain string matching. All deterministic code, no AI.
 */
export interface ExportOptions {
  /** Replace other people's names with a neutral role. On by default. */
  redactNames: boolean;
  /** Include `inferred` claims. Off by default (export is stated/tested only). */
  includeInferred: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  redactNames: true,
  includeInferred: false,
};

/** Order of layers as they appear in the persona template. */
const SECTION_ORDER: LayerId[] = [
  "facts",
  "stories",
  "values",
  "triggers",
  "contradictions",
  "voice",
];

const PLACEHOLDER: Record<LayerId, string> = {
  facts: "{{facts}}",
  stories: "{{stories}}",
  values: "{{values}}",
  triggers: "{{triggers}}",
  contradictions: "{{contradictions}}",
  voice: "{{voice}}",
};

const REDACTION = "a close friend";

/** Whether a claim belongs in an export (spec §8): active, and not inferred
 * unless the user opted in. */
function includeClaim(c: Claim, options: ExportOptions): boolean {
  return (
    c.status === "active" &&
    (c.confidence !== "inferred" || options.includeInferred)
  );
}

/** Replace each listed name (whole word, case-insensitive) with a role. */
function redact(text: string, names: string[]): string {
  let out = text;
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(`\\b${escaped}\\b`, "gi"), REDACTION);
  }
  return out;
}

export interface PersonaInput {
  name: string;
  claims: Claim[];
  /** Names to redact (used only when options.redactNames is true). */
  nameList: string[];
  options?: ExportOptions;
}

/** Build persona.md from confirmed claims (spec §8 template). */
export function buildPersonaMarkdown(input: PersonaInput): string {
  const options = input.options ?? DEFAULT_EXPORT_OPTIONS;
  const names = options.redactNames ? input.nameList : [];

  const section = (layer: LayerId): string => {
    const lines = input.claims
      .filter((c) => c.layer === layer && includeClaim(c, options))
      .map((c) => `- ${redact(c.text, names)}`);
    return lines.length > 0 ? lines.join("\n") : "_Not covered yet._";
  };

  let out = PROMPTS.personaTemplate;
  out = out.replace("{{name}}", redact(input.name || "this person", names));
  for (const layer of SECTION_ORDER) {
    out = out.replace(PLACEHOLDER[layer], section(layer));
  }
  // Voice samples (writing samples) arrive with the Voice layer work in M2.
  out = out.replace("{{voice_samples}}", "");

  return out.trimEnd() + "\n";
}

/** How many claims an export would include, for the UI count. */
export function countExportable(
  claims: Claim[],
  options: ExportOptions,
): number {
  return claims.filter((c) => includeClaim(c, options)).length;
}

// ---- Full profile folder (spec §8, §9) -------------------------------------

export interface ProfileFolderInput {
  name: string;
  claims: Claim[];
  answers: Answer[];
  nameList: string[];
  options?: ExportOptions;
}

/** One Markdown file per layer, with evidence and confidence (spec §9). */
function buildLayerMarkdown(
  layer: LayerId,
  input: ProfileFolderInput,
  names: string[],
  options: ExportOptions,
): string {
  const def = LAYERS.find((l) => l.id === layer)!;
  const answersById = new Map(input.answers.map((a) => [a.id, a]));
  const claims = input.claims.filter(
    (c) => c.layer === layer && includeClaim(c, options),
  );

  const lines: string[] = [`# ${def.num} · ${def.name}`, ""];
  if (claims.length === 0) {
    lines.push("_Not covered yet._", "");
    return lines.join("\n");
  }
  for (const c of claims) {
    lines.push(`## ${redact(c.text, names)}`);
    lines.push(`- Confidence: ${c.confidence}${c.singleSource ? " (from one answer)" : ""}`);
    if (c.quote) lines.push(`- Quote: "${redact(c.quote, names)}"`);
    const evidence = c.evidenceAnswerIds
      .map((id) => answersById.get(id))
      .filter((a): a is Answer => a !== undefined && !a.private);
    for (const a of evidence) {
      lines.push(`- Evidence: ${redact(a.text, names)}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

/** Build the full profile folder as a path→contents map (spec §9 layout). */
export function buildProfileFiles(
  input: ProfileFolderInput,
): Record<string, string> {
  const options = input.options ?? DEFAULT_EXPORT_OPTIONS;
  const names = options.redactNames ? input.nameList : [];
  const files: Record<string, string> = {};
  for (const layer of SECTION_ORDER) {
    const def = LAYERS.find((l) => l.id === layer)!;
    files[`selfprint/profile/${def.num}-${layer}.md`] = buildLayerMarkdown(
      layer,
      input,
      names,
      options,
    );
  }
  files["selfprint/persona.md"] = buildPersonaMarkdown({
    name: input.name,
    claims: input.claims,
    nameList: input.nameList,
    options,
  });
  return files;
}
