// Public prompts (spec §10), loaded as raw text from /prompts at runtime so
// they stay versioned and reviewable in the repo.
import interviewer from "../../prompts/interviewer.md?raw";
import distiller from "../../prompts/distiller.md?raw";
import scenario from "../../prompts/scenario.md?raw";
import personaTemplate from "../../prompts/persona-template.md?raw";

export const PROMPTS = {
  interviewer,
  distiller,
  scenario,
  personaTemplate,
} as const;
