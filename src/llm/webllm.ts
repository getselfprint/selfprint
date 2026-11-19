import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import {
  type CompletionRequest,
  type LlmProvider,
  type ProviderConfig,
  ProviderError,
} from "./provider";

/**
 * Adapter 3 - in-browser inference via WebLLM (spec §14 option C). Runs a model
 * entirely on-device through WebGPU; nothing leaves the machine. The library is
 * loaded with a dynamic import so its ~14 MB stays out of the main bundle and
 * only downloads when the user actually chooses this mode. Experimental: small
 * models give weaker follow-ups and less reliable JSON (validation + retry in
 * §10 still apply).
 */

export function isWebGPUAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

/** A few known-good MLC model ids, smallest first. */
export const WEBLLM_MODELS = [
  { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", label: "Qwen2.5 1.5B (~1 GB)" },
  { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC", label: "Llama 3.2 3B (~2 GB)" },
];

export type ProgressCallback = (info: { text: string; progress: number }) => void;

let engineModel: string | null = null;
let enginePromise: Promise<MLCEngineInterface> | null = null;

/**
 * Get (or create) the cached engine for a model. The first call downloads and
 * compiles the model; later calls reuse it. Switching models rebuilds.
 */
async function getEngine(
  model: string,
  onProgress?: ProgressCallback,
): Promise<MLCEngineInterface> {
  if (!isWebGPUAvailable()) {
    throw new ProviderError(
      "This device doesn't support WebGPU, which the in-browser model needs.",
    );
  }
  if (engineModel === model && enginePromise) return enginePromise;
  engineModel = model;
  enginePromise = import("@mlc-ai/web-llm").then((webllm) =>
    webllm.CreateMLCEngine(model, {
      initProgressCallback: (r) =>
        onProgress?.({ text: r.text, progress: r.progress }),
    }),
  );
  return enginePromise;
}

/** Preload a model with progress (used by the setup card before saving). */
export async function preloadWebLLM(
  model: string,
  onProgress: ProgressCallback,
): Promise<void> {
  await getEngine(model, onProgress);
}

export class WebLLMProvider implements LlmProvider {
  constructor(private readonly config: ProviderConfig) {}

  async complete(req: CompletionRequest): Promise<string> {
    const engine = await getEngine(this.config.model);
    // NOTE: we do NOT pass `response_format: { type: "json_object" }`. WebLLM's
    // XGrammar JSON matcher throws ("Cannot pass non-string to std::string") for
    // these small models and, worse, the failed generation tears down the loaded
    // pipeline so every later call reports "model not loaded". Like the Anthropic
    // adapter, we let the distiller/test prompts ask for JSON and lean on their
    // tolerant parse + validate + retry (spec §10) instead of grammar constraint.
    const reply = await engine.chat.completions.create({
      messages: [
        { role: "system", content: req.system },
        ...req.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: req.maxTokens,
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    });
    return reply.choices[0]?.message?.content ?? "";
  }

  async stream(
    req: CompletionRequest,
    onToken: (t: string) => void,
  ): Promise<string> {
    const engine = await getEngine(this.config.model);
    const chunks = await engine.chat.completions.create({
      stream: true,
      messages: [
        { role: "system", content: req.system },
        ...req.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_tokens: req.maxTokens,
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    });
    let full = "";
    for await (const chunk of chunks) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (token) {
        full += token;
        onToken(token);
      }
    }
    return full;
  }
}
