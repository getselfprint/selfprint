import { useCallback, useEffect, useRef, useState } from "react";
import type { Claim, TestRun } from "@/types/model";
import { applyTestRating } from "@/engine/confidence";
import {
  answerAsPersona,
  generateScenario,
  makeTestRun,
  matchScore,
} from "@/engine/test";
import { useConfig } from "@/app/config/ConfigContext";
import { isLiveMode, setupToProvider } from "@/app/config/provider";
import { useStore } from "@/app/vault/VaultContext";

export type TestPhase =
  | "init"
  | "unavailable" // mode has no live model
  | "intro"
  | "answered" // scenario + persona answer shown, awaiting rating
  | "rated";

export function useTest() {
  const store = useStore();
  const { setup } = useConfig();
  const mode = setup?.mode ?? "webllm";
  const provider = setup ? setupToProvider(setup) : null;

  const claimsRef = useRef<Claim[]>([]);
  const testsRef = useRef<TestRun[]>([]);

  const [phase, setPhase] = useState<TestPhase>("init");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scenario, setScenario] = useState("");
  const [answer, setAnswer] = useState("");
  const [usedClaimIds, setUsedClaimIds] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      const [claims, tests] = await Promise.all([
        store.claims.all(),
        store.tests.all(),
      ]);
      claimsRef.current = claims;
      testsRef.current = tests;
      setScore(matchScore(tests));
      setCount(tests.filter((t) => t.rating != null).length);
      setPhase(isLiveMode(mode) ? "intro" : "unavailable");
    })();
  }, [store, mode]);

  const start = useCallback(async () => {
    if (!provider) return;
    setBusy(true);
    setError(null);
    try {
      const used = testsRef.current.map((t) => t.scenario);
      const sc = await generateScenario(provider, claimsRef.current, used);
      const pa = await answerAsPersona(provider, claimsRef.current, sc);
      setScenario(sc);
      setAnswer(pa.answer);
      setUsedClaimIds(pa.usedClaimIds);
      setPhase("answered");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The test call failed.");
    } finally {
      setBusy(false);
    }
  }, [provider]);

  const rate = useCallback(
    async (rating: 1 | 2 | 3 | 4 | 5, feedback: string) => {
      setBusy(true);
      const run = makeTestRun({
        scenario,
        personaAnswer: answer,
        usedClaimIds,
      });
      run.rating = rating;
      if (feedback.trim()) run.feedback = feedback.trim();
      await store.tests.put(run);

      // Apply the confidence lifecycle to the claims this answer drew from.
      for (const id of usedClaimIds) {
        const claim = claimsRef.current.find((c) => c.id === id);
        if (!claim) continue;
        const updated = applyTestRating(claim, rating);
        await store.claims.put(updated);
        claimsRef.current = claimsRef.current.map((c) =>
          c.id === id ? updated : c,
        );
      }

      testsRef.current = [...testsRef.current, run];
      setScore(matchScore(testsRef.current));
      setCount(testsRef.current.filter((t) => t.rating != null).length);
      setBusy(false);
      setPhase("rated");
    },
    [store, scenario, answer, usedClaimIds],
  );

  const next = useCallback(() => {
    setScenario("");
    setAnswer("");
    setUsedClaimIds([]);
    setError(null);
    setPhase("intro");
  }, []);

  const drawnFrom = usedClaimIds
    .map((id) => claimsRef.current.find((c) => c.id === id))
    .filter((c): c is Claim => c !== undefined);

  return {
    mode,
    phase,
    busy,
    error,
    scenario,
    answer,
    drawnFrom,
    score,
    count,
    start,
    rate,
    next,
  };
}
