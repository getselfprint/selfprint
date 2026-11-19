import {
  type CompletionRequest,
  type LlmProvider,
  type ProviderConfig,
  ProviderError,
} from "./provider";

/**
 * Adapter 1 - Anthropic, direct from the browser (spec §10).
 *
 * Uses plain `fetch` (not the Node SDK) to keep the bundle small. The
 * `anthropic-dangerous-direct-browser-access` header is what permits a browser
 * to call the API directly; it is acceptable here because each user supplies
 * their own key and the key is never shipped in the app's code.
 *
 * Header names, API version and model IDs confirmed against the current
 * Anthropic docs (claude-api skill): api version 2023-06-01, default model
 * claude-opus-4-8.
 */

const ANTHROPIC_BASE_URL = "https://api.anthropic.com";
const ANTHROPIC_VERSION = "2023-06-01";

/** Sensible default model. Overridable via ProviderConfig.model. */
export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-4-8";

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicMessageResponse {
  content?: AnthropicContentBlock[];
  stop_reason?: string;
}

export class AnthropicProvider implements LlmProvider {
  constructor(private readonly config: ProviderConfig) {}

  private headers(): HeadersInit {
    if (!this.config.apiKey) {
      throw new ProviderError("No Anthropic API key configured.");
    }
    return {
      "content-type": "application/json",
      "x-api-key": this.config.apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      // Required for direct browser-to-Anthropic calls.
      "anthropic-dangerous-direct-browser-access": "true",
    };
  }

  private body(req: CompletionRequest, stream: boolean): string {
    const payload: Record<string, unknown> = {
      model: this.config.model || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: req.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
    if (stream) payload.stream = true;

    // NOTE: temperature / top_p / top_k are REJECTED with a 400 on the current
    // models (Opus 4.8/4.7, Sonnet 5, Fable 5). Only forward it if the caller
    // explicitly set one, and only for older models that still accept it. For
    // the default model, leave it unset and steer via the system prompt.
    if (req.temperature !== undefined) {
      payload.temperature = req.temperature;
    }

    // `req.json` is a hint only. Anthropic has no simple "JSON mode" flag; the
    // caller enforces JSON via the system prompt plus schema validation and a
    // single retry (spec §5, §10). Structured outputs (output_config.format)
    // could be wired in later once the distiller passes a JSON schema through.
    return JSON.stringify(payload);
  }

  private async toError(res: Response): Promise<ProviderError> {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const data = (await res.json()) as { error?: { message?: string } };
      if (data.error?.message) detail = data.error.message;
    } catch {
      // body wasn't JSON; keep the status line
    }
    return new ProviderError(`Anthropic request failed: ${detail}`);
  }

  async complete(req: CompletionRequest): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
        method: "POST",
        headers: this.headers(),
        body: this.body(req, false),
        signal: req.signal,
      });
    } catch (cause) {
      throw new ProviderError(
        "Could not reach Anthropic. Check your connection.",
        cause,
      );
    }
    if (!res.ok) throw await this.toError(res);

    const data = (await res.json()) as AnthropicMessageResponse;
    return (data.content ?? [])
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text)
      .join("");
  }

  async stream(
    req: CompletionRequest,
    onToken: (t: string) => void,
  ): Promise<string> {
    let res: Response;
    try {
      res = await fetch(`${ANTHROPIC_BASE_URL}/v1/messages`, {
        method: "POST",
        headers: this.headers(),
        body: this.body(req, true),
        signal: req.signal,
      });
    } catch (cause) {
      throw new ProviderError(
        "Could not reach Anthropic. Check your connection.",
        cause,
      );
    }
    if (!res.ok) throw await this.toError(res);
    if (!res.body) throw new ProviderError("Anthropic returned an empty stream.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";

    // Minimal SSE parse: accumulate `data:` lines and pick off text deltas.
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const json = trimmed.slice("data:".length).trim();
        if (!json || json === "[DONE]") continue;
        try {
          const evt = JSON.parse(json) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (
            evt.type === "content_block_delta" &&
            evt.delta?.type === "text_delta" &&
            evt.delta.text
          ) {
            full += evt.delta.text;
            onToken(evt.delta.text);
          }
        } catch {
          // skip malformed SSE line
        }
      }
    }
    return full;
  }
}
