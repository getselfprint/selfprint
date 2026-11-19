import { AnthropicProvider } from "./anthropic";
import { GuidedProvider } from "./guided";
import { OpenAICompatibleProvider } from "./openai";
import { WebLLMProvider } from "./webllm";
import { type LlmProvider, type ProviderConfig, ProviderError } from "./provider";

export * from "./provider";
export { AnthropicProvider, DEFAULT_ANTHROPIC_MODEL } from "./anthropic";
export { GuidedProvider } from "./guided";
export { OpenAICompatibleProvider } from "./openai";
export {
  WebLLMProvider,
  isWebGPUAvailable,
  preloadWebLLM,
  WEBLLM_MODELS,
  type ProgressCallback,
} from "./webllm";

/**
 * Single place that turns a stored ProviderConfig into an LlmProvider.
 * The interviewer, distiller, scenario generator, and persona test all go
 * through this - no screen talks to a provider directly (spec §10).
 *
 * Only the two providers chosen for the first build are wired up here:
 *   - anthropic         (Adapter 1, direct browser fetch)
 *   - guided            (option A, no AI)
 * openai-compatible (Adapter 2) and the others land in later milestones.
 */
export function createProvider(config: ProviderConfig): LlmProvider {
  switch (config.kind) {
    case "anthropic":
      return new AnthropicProvider(config);
    case "guided":
      return new GuidedProvider();
    case "openai-compatible":
      return new OpenAICompatibleProvider(config);
    case "webllm":
      return new WebLLMProvider(config);
    default: {
      const exhaustive: never = config.kind;
      throw new ProviderError(`Unknown provider kind: ${String(exhaustive)}`);
    }
  }
}
