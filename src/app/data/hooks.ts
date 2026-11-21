import { useCallback, useEffect, useState } from "react";
import type { Answer, Claim, Contradiction, LayerId, TestRun } from "@/types/model";
import { SETTINGS_KEYS } from "@/store";
import { useStore } from "@/app/vault/VaultContext";

/** The bits of the autosaved interview draft the Map needs to show "Resume". */
export interface InterviewDraftPeek {
  layer: LayerId;
  questionsAsked: number;
  questionText: string;
}

/** Load all test runs (for the Map match score). */
export function useTests() {
  const store = useStore();
  const [tests, setTests] = useState<TestRun[]>([]);
  const reload = useCallback(async () => {
    setTests(await store.tests.all());
  }, [store]);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { tests, reload };
}

/** Load all claims from the encrypted store, with a reload trigger. */
export function useClaims() {
  const store = useStore();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const all = await store.claims.all();
    setClaims(all);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { claims, loading, reload };
}

/** Load everything the Map needs: claims, answers, and the resumable draft. */
export function useMapState() {
  const store = useStore();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [draft, setDraft] = useState<InterviewDraftPeek | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [c, a, d] = await Promise.all([
      store.claims.all(),
      store.answers.all(),
      store.settings.get<InterviewDraftPeek>(SETTINGS_KEYS.interviewDraft),
    ]);
    setClaims(c);
    setAnswers(a);
    setDraft(d ?? null);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { claims, answers, draft, loading, reload };
}

/** Load claims, answers, and contradictions together (Profile / Export). */
export function useProfile() {
  const store = useStore();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [contradictions, setContradictions] = useState<Contradiction[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const [c, a, k] = await Promise.all([
      store.claims.all(),
      store.answers.all(),
      store.contradictions.all(),
    ]);
    setClaims(c);
    setAnswers(a);
    setContradictions(k);
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { store, claims, answers, contradictions, loading, reload };
}
