import { type ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isWebGPUAvailable, ProviderError, WEBLLM_MODELS } from "@/llm";
import {
  DEFAULT_ANTHROPIC_MODEL_ID,
  type InterviewSetup,
  useConfig,
} from "@/app/config/ConfigContext";
import { setupToProvider } from "@/app/config/provider";
import { DOTS } from "@/app/screens/shared";
import { useDownload } from "./DownloadContext";

/** The three ways to run the model, as a single flat radio list (mockup #1). */
type Choice = "webllm" | "anthropic" | "openai";

const FIELD =
  "w-full border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base placeholder:text-muted focus:border-accent focus:outline-none";

function choiceOf(setup: InterviewSetup | null): Choice {
  if (!setup) return "webllm";
  if (setup.mode === "anthropic") return "anthropic";
  if (setup.mode === "openai-compatible") return "openai";
  return "webllm";
}

/**
 * "How it runs" (`/model`). Pick the model that asks the follow-ups and
 * drafts claims for Layers 02-06. The in-browser model is the free default;
 * picking it starts the download in the background and goes straight to the Map
 * (no waiting). Anthropic / OpenAI-compatible reveal key fields and save on a
 * passing connection test.
 */
export function ChooseModelScreen() {
  const { setup, saveSetup, enterDemo } = useConfig();
  const { start } = useDownload();
  const navigate = useNavigate();

  const [choice, setChoice] = useState<Choice>(choiceOf(setup));
  const webgpu = isWebGPUAvailable();

  return (
    <main
      className={`flex-1 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
    >
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-heading text-[clamp(30px,3.6vw,44px)] tracking-[-0.02em]">
            How it runs
          </h1>
          <p className="m-0 max-w-[72ch] text-[15px] leading-[1.6] text-muted">
            Pick the model that will ask the follow-ups and draft your claims.{" "}
            <strong className="text-ink">A model is required for Layers 02-06</strong>{" "}
            - there is no model-free Guided mode.{" "}
            <strong className="text-ink">
              The free in-browser model is selected by default.
            </strong>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Card
            selected={choice === "webllm"}
            onSelect={() => setChoice("webllm")}
            title="Model in this browser - Free"
            desc="Qwen2.5 1.5B runs entirely on this device. No key, no cost, nothing leaves the browser. Downloads once (~980 MB) in the background."
            tag="Selected · Free"
          >
            {choice === "webllm" && !webgpu && (
              <p className="m-0 text-sm text-accent leading-[1.5]">
                WebGPU isn't available in this browser, so the in-browser model
                can't run here. Pick Anthropic or an OpenAI-compatible model
                instead.
              </p>
            )}
          </Card>

          <Card
            selected={choice === "anthropic"}
            onSelect={() => setChoice("anthropic")}
            title="Anthropic - Claude"
            desc="Your own API key, stored only on this device. No download - ready as soon as the key is saved."
            tag="Your key"
          >
            {choice === "anthropic" && (
              <AnthropicFields onSaved={() => navigate("/")} />
            )}
          </Card>

          <Card
            selected={choice === "openai"}
            onSelect={() => setChoice("openai")}
            title="OpenAI-compatible"
            desc="Any endpoint that speaks the OpenAI API - OpenAI, a local server, or another provider. You supply the base URL and key."
            tag="Your key"
          >
            {choice === "openai" && (
              <OpenAiFields onSaved={() => navigate("/")} />
            )}
          </Card>
        </div>

        {choice === "webllm" && (
          <div className="flex flex-col gap-1.5 p-5 bg-sand-50 border border-sand-300 rounded-panel">
            <span className="font-heading text-[16px] font-medium">
              You won't wait here
            </span>
            <p className="m-0 text-sm text-muted leading-[1.6] max-w-[80ch]">
              Clicking the button below starts the download in the background and
              takes you straight to the Map. Facts (Layer 01) need no AI, so you
              fill them in while the model downloads. The model only needs to be
              ready by Layer 02.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            // Go back to wherever the user came from - the marketing site when
            // they clicked "Try it live". Host-agnostic (no hardcoded URL), and
            // avoids looping through the first-run guard back to /model.
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 min-h-[48px] px-5 rounded-pill border border-sand-300 bg-ground text-ink text-sm font-medium hover:bg-sand-100 hover:text-ink"
          >
            ← Back
          </button>

          {choice === "webllm" && (
            <button
              type="button"
              disabled={!webgpu}
              onClick={() => {
                const model = WEBLLM_MODELS[0].id;
                void saveSetup({ mode: "webllm", model });
                start(model);
                navigate("/");
              }}
              className="inline-flex items-center gap-2 min-h-[48px] px-6 rounded-pill bg-ink text-ground text-[15px] font-medium disabled:opacity-40"
            >
              Start downloading and continue →
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={async () => {
            await enterDemo();
            navigate("/profile");
          }}
          className="self-center inline-flex items-center min-h-[40px] text-sm text-muted hover:text-ink"
        >
          Or see a finished demo profile first →
        </button>
      </div>
    </main>
  );
}

function Card({
  selected,
  onSelect,
  title,
  desc,
  tag,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
  tag: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`rounded-card ${
        selected
          ? "border-2 border-ink bg-sand-50 p-[19px]"
          : "border border-sand-300 p-5"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full flex items-start gap-3.5 text-left"
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 grid place-items-center shrink-0 w-[18px] h-[18px] rounded-full border-2 ${
            selected ? "border-ink" : "border-sand-300"
          }`}
        >
          {selected && <span className="w-2 h-2 rounded-full bg-ink" />}
        </span>
        <span className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="font-heading text-[17px] font-medium">{title}</span>
          <span className="text-sm text-muted leading-[1.5]">{desc}</span>
        </span>
        <span
          className={`shrink-0 label-mono rounded-pill px-2.5 py-1 ${
            selected
              ? "bg-ink text-ground"
              : "border border-sand-300 text-muted"
          }`}
        >
          {tag}
        </span>
      </button>
      {children && <div className="mt-4 pl-[32px] flex flex-col gap-4">{children}</div>}
    </div>
  );
}

function errMessage(err: unknown): string {
  if (err instanceof ProviderError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "The connection test failed. Check the key and your connection.";
}

type TestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "error"; message: string };

/** A small "test the connection, then save on success" button + status line. */
function SaveAndContinue({
  state,
  disabled,
  onClick,
}: {
  state: TestState;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || state.kind === "testing"}
        className="self-start inline-flex items-center gap-2 min-h-[48px] px-6 rounded-pill bg-ink text-ground text-[15px] font-medium disabled:opacity-40"
      >
        {state.kind === "testing" ? "Checking the connection…" : "Save and continue →"}
      </button>
      {state.kind === "error" && (
        <span className="text-sm text-accent">{state.message}</span>
      )}
    </div>
  );
}

function AnthropicFields({ onSaved }: { onSaved: () => void }) {
  const { setup, saveSetup } = useConfig();
  const cur = setup?.mode === "anthropic" ? setup : null;
  const [apiKey, setApiKey] = useState(cur?.apiKey ?? "");
  const [model, setModel] = useState(cur?.model ?? DEFAULT_ANTHROPIC_MODEL_ID);
  const [state, setState] = useState<TestState>({ kind: "idle" });

  async function testAndSave() {
    setState({ kind: "testing" });
    const provider = setupToProvider({ mode: "anthropic", apiKey, model });
    try {
      await provider!.complete({
        system: "Reply with the single word OK.",
        messages: [{ role: "user", content: "OK" }],
        maxTokens: 16,
      });
      await saveSetup({ mode: "anthropic", apiKey, model });
      onSaved();
    } catch (err) {
      setState({ kind: "error", message: errMessage(err) });
    }
  }

  return (
    <>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono">API key</span>
        <input
          type="password"
          autoComplete="off"
          className={FIELD}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste your key"
        />
        <span className="text-sm text-muted">
          Stored encrypted on this device.{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
          >
            How to get a key
          </a>
        </span>
      </label>
      <label className="flex flex-col gap-1.5 max-w-[360px]">
        <span className="label-mono">Model</span>
        <select
          className={FIELD}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          <option value="claude-opus-4-8">Claude Opus 4.8 - recommended</option>
          <option value="claude-haiku-4-5">
            Claude Haiku 4.5 - faster and cheaper
          </option>
        </select>
      </label>
      <SaveAndContinue state={state} disabled={!apiKey} onClick={testAndSave} />
    </>
  );
}

const SERVICE_PRESETS = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { label: "Local / custom", baseUrl: "" },
];

function OpenAiFields({ onSaved }: { onSaved: () => void }) {
  const { setup, saveSetup } = useConfig();
  const cur = setup?.mode === "openai-compatible" ? setup : null;
  const [baseUrl, setBaseUrl] = useState(
    cur?.baseUrl ?? SERVICE_PRESETS[0].baseUrl,
  );
  const [apiKey, setApiKey] = useState(cur?.apiKey ?? "");
  const [model, setModel] = useState(cur?.model ?? "");
  const [state, setState] = useState<TestState>({ kind: "idle" });

  async function testAndSave() {
    setState({ kind: "testing" });
    const provider = setupToProvider({
      mode: "openai-compatible",
      baseUrl,
      model,
      apiKey: apiKey || undefined,
    });
    try {
      await provider!.complete({
        system: "Reply with the single word OK.",
        messages: [{ role: "user", content: "OK" }],
        maxTokens: 16,
      });
      await saveSetup({
        mode: "openai-compatible",
        baseUrl,
        model,
        apiKey: apiKey || undefined,
        via: baseUrl ? "service" : "local",
      });
      onSaved();
    } catch (err) {
      setState({ kind: "error", message: errMessage(err) });
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {SERVICE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setBaseUrl(p.baseUrl)}
            className={`inline-flex items-center min-h-[38px] px-4 rounded-pill text-sm ${
              baseUrl === p.baseUrl
                ? "border-2 border-ink bg-sand-100"
                : "border border-sand-300 hover:bg-sand-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono">Base address</span>
        <input
          className={FIELD}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://localhost:11434/v1"
        />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="flex-1 min-w-[180px] flex flex-col gap-1.5">
          <span className="label-mono">API key</span>
          <input
            type="password"
            autoComplete="off"
            className={FIELD}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your key (optional for local)"
          />
        </label>
        <label className="flex-1 min-w-[180px] flex flex-col gap-1.5">
          <span className="label-mono">Model name</span>
          <input
            className={FIELD}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="As the service names it"
          />
        </label>
      </div>
      <SaveAndContinue
        state={state}
        disabled={!baseUrl || !model}
        onClick={testAndSave}
      />
    </>
  );
}
