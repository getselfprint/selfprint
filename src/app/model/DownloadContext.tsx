import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  isWebGPUAvailable,
  preloadWebLLM,
  ProviderError,
  WEBLLM_MODELS,
} from "@/llm";
import { useConfig } from "@/app/config/ConfigContext";

/**
 * Background download of the in-browser (webllm) model. The spec's whole flow
 * hinges on this: the user picks the model, the download starts, and they go
 * straight to the Map - the download keeps running across every screen while
 * they do Facts (which needs no AI). This provider lives above the routes so its
 * state survives navigation, and it drives the honest progress banner shown on
 * the Map, Facts, and Interview screens.
 *
 * The download warms the SAME cached engine the interview later uses
 * (`preloadWebLLM` -> `getEngine`), so by the time the user reaches Layer 02 the
 * model is ready with no extra wait.
 */

/** Pull the "227 MB" figure out of WebLLM's progress text. */
export function fetchedMB(text: string): number | null {
  const m = text.match(/([\d.]+)\s*MB/i);
  return m ? Number(m[1]) : null;
}

export function etaLabel(sec: number | null): string {
  if (sec === null || !Number.isFinite(sec)) return "estimating time left";
  if (sec < 60) return `about ${Math.max(1, Math.round(sec))} sec left`;
  return `about ${Math.round(sec / 60)} min left`;
}

/** A short, human model name ("Qwen2.5 1.5B") from a WebLLM id or label. */
export function modelShortLabel(id: string | undefined): string {
  if (!id) return "In-browser model";
  const def = WEBLLM_MODELS.find((m) => m.id === id);
  // Labels look like "Qwen2.5 1.5B (~1 GB)"; drop the parenthetical size.
  return (def?.label ?? id).replace(/\s*\(.*\)\s*$/, "");
}

export type DownloadState =
  | { kind: "idle" }
  | {
      kind: "downloading";
      /** 0..1 */
      pct: number;
      mbDone: number | null;
      mbTotal: number | null;
      etaSec: number | null;
      model: string;
    }
  | { kind: "ready"; model: string }
  | { kind: "error"; message: string; model: string };

interface DownloadValue {
  state: DownloadState;
  /** True when a model is usable now: always for hosted modes, or when the
   *  in-browser download has finished. False when no model is set yet. */
  ready: boolean;
  /** True when the current setup uses the in-browser (downloaded) model. */
  isWebLLM: boolean;
  start(model?: string): void;
  retry(): void;
}

const DownloadCtx = createContext<DownloadValue | null>(null);

export function DownloadProvider({ children }: { children: ReactNode }) {
  const { setup } = useConfig();
  const [state, setState] = useState<DownloadState>({ kind: "idle" });

  // Mirrors used inside the (stable) start callback to read live values.
  const stateRef = useRef(state);
  stateRef.current = state;
  const startedAt = useRef(0);
  const activeModel = useRef<string | null>(null);
  const autoStarted = useRef(false);

  const start = useCallback(
    (modelArg?: string) => {
      const model =
        modelArg ??
        (setup?.mode === "webllm" ? setup.model : undefined) ??
        WEBLLM_MODELS[0].id;

      if (!isWebGPUAvailable()) {
        setState({
          kind: "error",
          message:
            "WebGPU isn't available in this browser, so the in-browser model can't run here. Pick Anthropic or an OpenAI-compatible model instead.",
          model,
        });
        return;
      }
      // Don't restart a download that's already running or finished.
      const cur = stateRef.current;
      if (
        activeModel.current === model &&
        (cur.kind === "downloading" || cur.kind === "ready")
      ) {
        return;
      }

      activeModel.current = model;
      startedAt.current = performance.now();
      setState({
        kind: "downloading",
        pct: 0,
        mbDone: null,
        mbTotal: null,
        etaSec: null,
        model,
      });

      preloadWebLLM(model, (info) => {
        const p = info.progress;
        const mbDone = fetchedMB(info.text);
        const elapsed = (performance.now() - startedAt.current) / 1000;
        const etaSec = p > 0.02 && p < 1 ? (elapsed * (1 - p)) / p : null;
        const mbTotal =
          mbDone != null && p > 0.02 ? Math.round(mbDone / p) : null;
        setState({ kind: "downloading", pct: p, mbDone, mbTotal, etaSec, model });
      })
        .then(() => setState({ kind: "ready", model }))
        .catch((err) =>
          setState({
            kind: "error",
            message:
              err instanceof ProviderError
                ? err.message
                : "The model couldn't be loaded. In-browser models are experimental.",
            model,
          }),
        );
    },
    [setup],
  );

  const retry = useCallback(() => {
    const cur = stateRef.current;
    const model = cur.kind !== "idle" ? cur.model : undefined;
    activeModel.current = null; // allow a fresh attempt
    start(model);
  }, [start]);

  // Auto-start once when the saved setup uses the in-browser model (a returning
  // user, or a reload where the in-memory engine is gone but the weights are
  // cached). Explicit start() from the model screen covers the first run.
  useEffect(() => {
    if (autoStarted.current) return;
    if (setup?.mode === "webllm" && stateRef.current.kind === "idle") {
      autoStarted.current = true;
      start();
    }
  }, [setup, start]);

  const mode = setup?.mode;
  const isWebLLM = mode === "webllm";
  const ready = mode ? (isWebLLM ? state.kind === "ready" : true) : false;

  return (
    <DownloadCtx.Provider value={{ state, ready, isWebLLM, start, retry }}>
      {children}
    </DownloadCtx.Provider>
  );
}

export function useDownload(): DownloadValue {
  const v = useContext(DownloadCtx);
  if (!v) throw new Error("useDownload must be used inside <DownloadProvider>.");
  return v;
}
