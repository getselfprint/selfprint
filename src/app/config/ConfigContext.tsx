import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { SETTINGS_KEYS } from "@/store";
import { useStore } from "@/app/vault/VaultContext";

/**
 * How the interview runs (spec §14). Every mode runs a model automatically and
 * turns answers into claims: `anthropic` / `openai-compatible` call a hosted
 * model, `webllm` runs one in the browser. (The no-AI "guided" and manual
 * "copy-paste" modes were removed - the interview always uses a live model.)
 */
export type InterviewMode = "anthropic" | "openai-compatible" | "webllm";

export interface InterviewSetup {
  mode: InterviewMode;
  /** API key (anthropic + openai-compatible; optional for local servers). */
  apiKey?: string;
  model?: string;
  /** Base URL for openai-compatible endpoints (local or hosted). */
  baseUrl?: string;
  /**
   * UI hint only (ignored by setupToProvider): openai-compatible is reached
   * through two cards - a local server (Ollama) or a hosted service (OpenAI /
   * OpenRouter). Lets Settings highlight the right one.
   */
  via?: "local" | "service";
}

interface ConfigValue {
  loading: boolean;
  setup: InterviewSetup | null;
  saveSetup(setup: InterviewSetup): Promise<void>;
  /** Names to redact from exports (spec §8, §12). */
  nameList: string[];
  saveNameList(names: string[]): Promise<void>;
}

const ConfigCtx = createContext<ConfigValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<InterviewSetup | null>(null);
  const [nameList, setNameList] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      store.settings.get<InterviewSetup>(SETTINGS_KEYS.providerConfig),
      store.settings.get<string[]>(SETTINGS_KEYS.nameList),
    ]).then(([s, n]) => {
      if (cancelled) return;
      // Legacy vaults may have a removed mode saved ("guided", "copy-paste");
      // treat those as unset so the user picks a current (live-model) mode.
      const removed = ["guided", "copy-paste"];
      const valid = s && !removed.includes(s.mode as string) ? s : null;
      setSetup(valid);
      setNameList(n ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [store]);

  const saveSetup = useCallback(
    async (next: InterviewSetup) => {
      await store.settings.set(SETTINGS_KEYS.providerConfig, next);
      setSetup(next);
    },
    [store],
  );

  const saveNameList = useCallback(
    async (names: string[]) => {
      await store.settings.set(SETTINGS_KEYS.nameList, names);
      setNameList(names);
    },
    [store],
  );

  return (
    <ConfigCtx.Provider
      value={{ loading, setup, saveSetup, nameList, saveNameList }}
    >
      {children}
    </ConfigCtx.Provider>
  );
}

export function useConfig(): ConfigValue {
  const v = useContext(ConfigCtx);
  if (!v) throw new Error("useConfig must be used inside <ConfigProvider>.");
  return v;
}

export const DEFAULT_ANTHROPIC_MODEL_ID = "claude-opus-4-8";
