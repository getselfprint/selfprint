// Provider interface - spec §10. The rest of the app depends only on
// `LlmProvider`; adding a provider later means adding one adapter file.

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CompletionRequest {
  system: string;
  messages: ChatMessage[];
  maxTokens: number;
  temperature?: number;
  /** Caller expects JSON; adapter uses the provider's JSON mode if it has one. */
  json?: boolean;
  signal?: AbortSignal;
}

export interface LlmProvider {
  complete(req: CompletionRequest): Promise<string>;
  stream?(
    req: CompletionRequest,
    onToken: (t: string) => void,
  ): Promise<string>;
}

export interface ProviderConfig {
  kind: "anthropic" | "openai-compatible" | "guided" | "webllm";
  /** Fixed for anthropic, user-entered for openai-compatible, unused for guided. */
  baseUrl: string;
  /** Optional for local endpoints; absent for guided. */
  apiKey?: string;
  model: string;
}

/** Raised when a provider call fails; carries a user-facing, specific message. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
