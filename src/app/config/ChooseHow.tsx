import { type ReactNode, useRef, useState } from "react";
import {
  isWebGPUAvailable,
  preloadWebLLM,
  ProviderError,
  WEBLLM_MODELS,
} from "@/llm";
import {
  DEFAULT_ANTHROPIC_MODEL_ID,
  type InterviewSetup,
  useConfig,
} from "./ConfigContext";
import { setupToProvider } from "./provider";

/** One selectable entry in the left list. Several map to openai-compatible. */
type EntryId = "webllm" | "local" | "anthropic" | "openai";

interface Entry {
  id: EntryId;
  title: string;
  desc: string;
}

const GROUPS: { group: string; items: Entry[] }[] = [
  {
    group: "On this device",
    items: [
      {
        id: "webllm",
        title: "Model in this browser",
        desc: "Runs on this device through WebGPU. No key.",
      },
      {
        id: "local",
        title: "Local model server",
        desc: "Your own endpoint, such as Ollama.",
      },
    ],
  },
  {
    group: "Your own account",
    items: [
      { id: "anthropic", title: "Anthropic", desc: "Paste an API key." },
      {
        id: "openai",
        title: "OpenAI-compatible",
        desc: "OpenAI, OpenRouter, or any service with the same API.",
      },
    ],
  },
];

/** Which entry a saved setup corresponds to (for the "current" checkmark). */
function entryOf(setup: InterviewSetup | null): EntryId | null {
  if (!setup) return null;
  if (setup.mode === "webllm") return "webllm";
  if (setup.mode === "anthropic") return "anthropic";
  return setup.via === "local" ? "local" : "openai";
}

const FIELD =
  "w-full border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base placeholder:text-muted focus:border-accent focus:outline-none";

/**
 * "How the interview runs" - a master/detail picker. The left column lists the
 * ways to connect a model (grouped); the right panel configures the selected
 * one. Used in Settings and in first-run.
 */
export function ChooseHow({
  onDone,
  heading = "How the interview runs",
}: {
  onDone?: () => void;
  heading?: string;
}) {
  const { setup } = useConfig();
  const current = entryOf(setup);
  // The free in-browser model is the default - no key, nothing preselected for
  // a paid account.
  const [selected, setSelected] = useState<EntryId>(current ?? "webllm");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="label-mono">Model</span>
        <h1 className="m-0 font-heading text-[clamp(26px,3vw,34px)] tracking-[-0.02em]">
          {heading}
        </h1>
        <p className="m-0 max-w-[60ch] text-[15px] leading-[1.55] text-muted">
          Pick one. Selfprint uses it to turn your answers into claims. You can
          switch any time, and your profile stays the same. An on-device model
          keeps everything local; connecting an external provider sends your
          interview answers to that provider as you go.
        </p>
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        {/* Left: the list */}
        <div className="flex-[1_1_260px] min-w-[240px] max-w-[340px] flex flex-col gap-5">
          {GROUPS.map((g) => (
            <div key={g.group} className="flex flex-col gap-2">
              <span className="label-mono">{g.group}</span>
              {g.items.map((it) => {
                const isSel = selected === it.id;
                const isCur = current === it.id;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setSelected(it.id)}
                    className={`text-left rounded-card flex items-center justify-between gap-3 ${
                      isSel
                        ? "border-2 border-ink bg-sand-50 px-[15px] py-[11px]"
                        : "border border-sand-300 hover:bg-sand-50 px-4 py-3"
                    }`}
                  >
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-heading text-[17px] font-medium">
                        {it.title}
                      </span>
                      <span className="text-sm text-muted">{it.desc}</span>
                    </span>
                    {isCur && (
                      <svg
                        aria-hidden="true"
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="shrink-0"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right: the detail panel for the selected entry */}
        <div className="flex-[2_1_380px] min-w-[300px]">
          {selected === "webllm" && <WebLLMDetail onDone={onDone} />}
          {selected === "local" && <LocalDetail onDone={onDone} />}
          {selected === "anthropic" && <AnthropicDetail onDone={onDone} />}
          {selected === "openai" && <OpenAiDetail onDone={onDone} />}
        </div>
      </div>
    </div>
  );
}

// ---- Detail shell -----------------------------------------------------------

function DetailShell({
  title,
  tag,
  where,
  children,
}: {
  title: string;
  tag?: string;
  where: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-sand-50 border border-sand-300 rounded-panel p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 className="m-0 font-heading text-2xl font-medium">{title}</h2>
        {tag && (
          <span className="label-mono border border-dashed border-sand-300 rounded-pill px-2 py-0.5">
            {tag}
          </span>
        )}
      </div>
      {children}
      <div className="pt-4 mt-1 border-t border-sand-300 flex flex-col gap-1">
        <span className="label-mono">Where your answers go</span>
        <p className="m-0 text-[15px] leading-[1.5]">{where}</p>
      </div>
    </div>
  );
}

type TestState =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok" }
  | { kind: "error"; message: string };

function TestButton({
  label = "Test connection",
  state,
  disabled,
  onClick,
  idleNote,
}: {
  label?: string;
  state: TestState;
  disabled?: boolean;
  onClick: () => void;
  idleNote: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || state.kind === "testing"}
          className="inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground text-sm font-medium disabled:opacity-40"
        >
          {state.kind === "testing" ? "Testing…" : label}
        </button>
        {state.kind === "ok" && (
          <span className="text-sm text-accent">Connected.</span>
        )}
        {state.kind === "idle" && (
          <span className="text-sm text-muted">{idleNote}</span>
        )}
      </div>
      {state.kind === "error" && (
        <span className="text-sm text-accent">{state.message}</span>
      )}
    </div>
  );
}

function errMessage(err: unknown): string {
  if (err instanceof ProviderError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "The connection test failed. Check the key and your connection.";
}

// ---- Anthropic --------------------------------------------------------------

function AnthropicDetail({ onDone }: { onDone?: () => void }) {
  const { setup, saveSetup } = useConfig();
  const cur = setup?.mode === "anthropic" ? setup : null;
  const [apiKey, setApiKey] = useState(cur?.apiKey ?? "");
  const [model, setModel] = useState(cur?.model ?? DEFAULT_ANTHROPIC_MODEL_ID);
  // A saved provider was already validated (we only save on a passing test).
  const [state, setState] = useState<TestState>(
    cur ? { kind: "ok" } : { kind: "idle" },
  );

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
      setState({ kind: "ok" });
      onDone?.();
    } catch (err) {
      setState({ kind: "error", message: errMessage(err) });
    }
  }

  return (
    <DetailShell
      title="Anthropic"
      where="From this browser straight to Anthropic. Selfprint never sees them. Anthropic's privacy terms apply."
    >
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
          Your key is stored encrypted on this device.{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer"
          >
            How to get a key
          </a>
        </span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono">Model</span>
        <select
          className={FIELD}
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          <option value="claude-opus-4-8">
            Claude Opus 4.8 — recommended
          </option>
          <option value="claude-haiku-4-5">
            Claude Haiku 4.5 — faster and cheaper
          </option>
        </select>
        <span className="text-sm text-muted">
          Pay-as-you-go on your Anthropic account - a session is typically a few
          cents on Opus, less on Haiku.
        </span>
      </label>
      <TestButton
        state={state}
        disabled={!apiKey}
        onClick={testAndSave}
        idleNote="Not tested yet. A failed test shows the provider's exact error here."
      />
    </DetailShell>
  );
}

// ---- OpenAI-compatible (hosted service) -------------------------------------

const SERVICE_PRESETS = [
  {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    keysUrl: "https://platform.openai.com/api-keys",
  },
  {
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keysUrl: "https://openrouter.ai/keys",
  },
  { label: "Custom", baseUrl: "", keysUrl: "" },
];

function OpenAiDetail({ onDone }: { onDone?: () => void }) {
  const { setup, saveSetup } = useConfig();
  const cur =
    setup?.mode === "openai-compatible" && setup.via !== "local" ? setup : null;
  const [baseUrl, setBaseUrl] = useState(
    cur?.baseUrl ?? SERVICE_PRESETS[0].baseUrl,
  );
  const [apiKey, setApiKey] = useState(cur?.apiKey ?? "");
  const [model, setModel] = useState(cur?.model ?? "");
  const [state, setState] = useState<TestState>(
    cur ? { kind: "ok" } : { kind: "idle" },
  );

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
        via: "service",
      });
      setState({ kind: "ok" });
      onDone?.();
    } catch (err) {
      setState({ kind: "error", message: errMessage(err) });
    }
  }

  return (
    <DetailShell
      title="OpenAI-compatible"
      where="From this browser straight to the service you chose. Selfprint never sees them. That service's privacy terms apply."
    >
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
          placeholder="Filled in by the preset"
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
            placeholder="Paste your key"
          />
          <span className="text-sm text-muted">
            Stored encrypted on this device.{" "}
            {(() => {
              const keysUrl = SERVICE_PRESETS.find(
                (p) => p.baseUrl === baseUrl,
              )?.keysUrl;
              return keysUrl ? (
                <a href={keysUrl} target="_blank" rel="noreferrer">
                  How to get a key
                </a>
              ) : null;
            })()}
          </span>
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
      <TestButton
        state={state}
        disabled={!baseUrl || !model}
        onClick={testAndSave}
        idleNote="Not tested yet. A failed test shows the service's exact error here."
      />
    </DetailShell>
  );
}

// ---- Local model server (openai-compatible, local) --------------------------

function LocalDetail({ onDone }: { onDone?: () => void }) {
  const { setup, saveSetup } = useConfig();
  const cur =
    setup?.mode === "openai-compatible" && setup.via === "local" ? setup : null;
  const [baseUrl, setBaseUrl] = useState(cur?.baseUrl ?? "");
  const [model, setModel] = useState(cur?.model ?? "");
  const [state, setState] = useState<TestState>(
    cur ? { kind: "ok" } : { kind: "idle" },
  );

  async function testAndSave() {
    setState({ kind: "testing" });
    const provider = setupToProvider({
      mode: "openai-compatible",
      baseUrl,
      model,
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
        via: "local",
      });
      setState({ kind: "ok" });
      onDone?.();
    } catch (err) {
      setState({ kind: "error", message: errMessage(err) });
    }
  }

  return (
    <DetailShell
      title="Local model server"
      where="To the server address you entered, on your own machine or network."
    >
      <label className="flex flex-col gap-1.5">
        <span className="label-mono">Server address</span>
        <input
          className={FIELD}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://localhost:11434/v1"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono">Model name</span>
        <input
          className={FIELD}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="The name your server uses"
        />
        <span className="text-sm text-muted">
          If the test is blocked, your server needs to allow requests from this
          site (for Ollama, set OLLAMA_ORIGINS).
        </span>
      </label>
      <TestButton
        state={state}
        disabled={!baseUrl || !model}
        onClick={testAndSave}
        idleNote="Not tested yet."
      />
    </DetailShell>
  );
}

// ---- Model in this browser (webllm) -----------------------------------------

/** WebLLM's progress text carries "… 227MB fetched …"; pull the MB figure out. */
function fetchedMB(text: string): string | null {
  const m = text.match(/([\d.]+)\s*MB/i);
  return m ? m[1] : null;
}

function etaLabel(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec)) return "estimating…";
  if (sec < 60) return `~${Math.max(1, Math.round(sec))}s left`;
  return `~${Math.round(sec / 60)} min left`;
}

function WebLLMDetail({ onDone }: { onDone?: () => void }) {
  const { setup, saveSetup } = useConfig();
  const supported = isWebGPUAvailable();
  const current = setup?.mode === "webllm";
  const [model, setModel] = useState(
    current && setup.model ? setup.model : WEBLLM_MODELS[0].id,
  );
  const [progress, setProgress] = useState<{
    text: string;
    progress: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(current);
  const [error, setError] = useState<string | null>(null);
  const startRef = useRef(0);

  async function download() {
    setBusy(true);
    setError(null);
    startRef.current = performance.now();
    try {
      await preloadWebLLM(model, (info) => setProgress(info));
      await saveSetup({ mode: "webllm", model });
      setDone(true);
      setBusy(false);
      onDone?.();
    } catch (err) {
      setError(
        err instanceof ProviderError
          ? err.message
          : "The model couldn't be loaded. In-browser models are experimental.",
      );
      setBusy(false);
    }
  }

  return (
    <DetailShell
      title="Model in this browser"
      tag="Experimental"
      where="Nowhere. The model runs inside this browser, on this device."
    >
      <span className="inline-flex items-center gap-2 text-sm">
        {supported ? (
          <>
            <svg
              aria-hidden="true"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            WebGPU is supported on this device.
          </>
        ) : (
          <span className="text-muted">
            WebGPU isn't available in this browser, so this option can't run
            here.
          </span>
        )}
      </span>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono">Model</span>
        <select
          className={FIELD}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!supported}
        >
          {WEBLLM_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-muted">
          Downloaded once and stored on this device. Smaller models give weaker
          follow-ups.
        </span>
      </label>
      {busy &&
        progress &&
        (() => {
          const p = progress.progress;
          const pct = Math.round(p * 100);
          const mb = fetchedMB(progress.text);
          const elapsed = (performance.now() - startRef.current) / 1000;
          const eta = p > 0.02 && p < 1 ? (elapsed * (1 - p)) / p : null;
          return (
            <div className="flex flex-col gap-1.5">
              <div className="w-full h-1.5 rounded-pill bg-[var(--track)] overflow-hidden">
                <div
                  className="h-1.5 bg-accent rounded-pill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between gap-3 font-mono text-xs text-muted">
                <span>
                  {pct}%{mb ? ` · ${mb} MB` : ""}
                </span>
                <span>{p < 1 ? etaLabel(eta) : "finishing…"}</span>
              </div>
            </div>
          );
        })()}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={download}
          disabled={!supported || busy}
          className="inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground text-sm font-medium disabled:opacity-40"
        >
          {busy ? "Downloading…" : error ? "Retry download" : "Download model"}
        </button>
        <span className="text-sm text-muted">
          {done ? "Ready. This is now your model." : "Not downloaded yet."}
        </span>
      </div>
      {error && <span className="text-sm text-accent">{error}</span>}
    </DetailShell>
  );
}
