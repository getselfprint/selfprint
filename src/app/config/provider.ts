import { createProvider, type LlmProvider } from "@/llm";
import {
  DEFAULT_ANTHROPIC_MODEL_ID,
  type InterviewMode,
  type InterviewSetup,
} from "./ConfigContext";

/**
 * Every mode now calls a model automatically, so Test mode and the distiller
 * can always run. Kept as a list for clarity and future non-live modes.
 */
export const LIVE_MODES: InterviewMode[] = [
  "anthropic",
  "openai-compatible",
  "webllm",
];

export function isLiveMode(mode: InterviewMode): boolean {
  return LIVE_MODES.includes(mode);
}

/**
 * Turn the stored interview setup into a live provider. Everything routes
 * through the single createProvider factory (spec §10).
 */
export function setupToProvider(setup: InterviewSetup): LlmProvider | null {
  switch (setup.mode) {
    case "anthropic":
      return createProvider({
        kind: "anthropic",
        baseUrl: "",
        apiKey: setup.apiKey,
        model: setup.model || DEFAULT_ANTHROPIC_MODEL_ID,
      });
    case "openai-compatible":
      return createProvider({
        kind: "openai-compatible",
        baseUrl: setup.baseUrl ?? "",
        apiKey: setup.apiKey,
        model: setup.model ?? "",
      });
    case "webllm":
      return createProvider({
        kind: "webllm",
        baseUrl: "",
        model: setup.model ?? "",
      });
  }
}
