import {
  type CompletionRequest,
  type LlmProvider,
  type ProviderConfig,
  ProviderError,
} from "./provider";

/**
 * Adapter 2 - OpenAI-compatible chat completions (spec §10). One adapter covers
 * local runners (Ollama at http://localhost:11434/v1), OpenRouter, and most
 * hosted services that expose the same `/chat/completions` shape. The user
 * supplies base URL, model, and an optional key.
 */
interface OpenAIResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export class OpenAICompatibleProvider implements LlmProvider {
  constructor(private readonly config: ProviderConfig) {
    if (!config.baseUrl) {
      throw new ProviderError("No base URL configured for this provider.");
    }
  }

  private endpoint(): string {
    return `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`;
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (this.config.apiKey) h["authorization"] = `Bearer ${this.config.apiKey}`;
    return h;
  }

  private body(req: CompletionRequest, stream: boolean): string {
    const payload: Record<string, unknown> = {
      model: this.config.model,
      max_tokens: req.maxTokens,
      messages: [
        { role: "system", content: req.system },
        ...req.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    };
    if (req.temperature !== undefined) payload.temperature = req.temperature;
    if (req.json) payload.response_format = { type: "json_object" };
    if (stream) payload.stream = true;
    return JSON.stringify(payload);
  }

  private async toError(res: Response): Promise<ProviderError> {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const data = (await res.json()) as OpenAIResponse;
      if (data.error?.message) detail = data.error.message;
    } catch {
      /* keep status line */
    }
    return new ProviderError(`Request failed: ${detail}`);
  }

  private connectionError(cause: unknown): ProviderError {
    // A local model server often blocks requests from a web origin (CORS).
    // Ollama, for example, needs this app's origin in OLLAMA_ORIGINS.
    return new ProviderError(
      "Could not reach the model server. If it's a local server (e.g. Ollama), " +
        "it may be blocking this page's origin - add it to the server's allowed " +
        "origins (for Ollama, set OLLAMA_ORIGINS). Otherwise check the base URL.",
      cause,
    );
  }

  async complete(req: CompletionRequest): Promise<string> {
    let res: Response;
    try {
      res = await fetch(this.endpoint(), {
        method: "POST",
        headers: this.headers(),
        body: this.body(req, false),
        signal: req.signal,
      });
    } catch (cause) {
      throw this.connectionError(cause);
    }
    if (!res.ok) throw await this.toError(res);
    const data = (await res.json()) as OpenAIResponse;
    return data.choices?.[0]?.message?.content ?? "";
  }

  async stream(
    req: CompletionRequest,
    onToken: (t: string) => void,
  ): Promise<string> {
    let res: Response;
    try {
      res = await fetch(this.endpoint(), {
        method: "POST",
        headers: this.headers(),
        body: this.body(req, true),
        signal: req.signal,
      });
    } catch (cause) {
      throw this.connectionError(cause);
    }
    if (!res.ok) throw await this.toError(res);
    if (!res.body) throw new ProviderError("The server returned no stream.");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let full = "";
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
            choices?: { delta?: { content?: string } }[];
          };
          const token = evt.choices?.[0]?.delta?.content;
          if (token) {
            full += token;
            onToken(token);
          }
        } catch {
          /* skip malformed line */
        }
      }
    }
    return full;
  }
}
