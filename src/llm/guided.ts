import {
  type CompletionRequest,
  type LlmProvider,
  ProviderError,
} from "./provider";

/**
 * Guided, no-AI path (spec §14 option A).
 *
 * In guided mode NO model is ever called: the interview uses the seed
 * questions as written with fixed follow-up prompts, and the user writes their
 * own claims (all `stated`). This "provider" exists only so the rest of the
 * app can hold an `LlmProvider` in the same slot; any actual `complete()` call
 * is a bug - the guided flow must branch on `config.kind === "guided"` and
 * never reach a model call. Calling it fails loudly rather than silently
 * sending data anywhere.
 */
export class GuidedProvider implements LlmProvider {
  async complete(_req: CompletionRequest): Promise<string> {
    throw new ProviderError(
      "Guided mode does not use a model. This call should not happen - " +
        "the guided interview flow writes claims locally without any model.",
    );
  }
}
