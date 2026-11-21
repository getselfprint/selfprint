import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Claim, LayerId } from "@/types/model";
import { computeCoverage } from "@/engine/coverage";
import { LAYER_BY_ID } from "@/engine/layers";
import { confirmClaim, editClaim, makeAnswer } from "@/engine/confidence";
import { type DistillInput, distill, toRecords } from "@/engine/distiller";
import {
  FOLLOWUP_LADDER,
  MAX_FOLLOWUPS,
  isVague,
  newId,
  pickInterviewLayer,
  pickNextSeed,
} from "@/engine/session";
import { SETTINGS_KEYS } from "@/store";
import { useConfig } from "@/app/config/ConfigContext";
import { setupToProvider } from "@/app/config/provider";
import { useStore } from "@/app/vault/VaultContext";

export type InterviewPhase =
  | "init"
  | "none" // no interviewable layer / bank exhausted
  | "answering"
  | "done";

const TARGET_QUESTIONS = 8; // spec §3 rule 9

interface State {
  phase: InterviewPhase;
  layer: LayerId | null;
  seedId: string;
  seedText: string;
  seedType: string;
  questionText: string; // the prompt currently shown (seed or follow-up)
  followupIndex: number;
  questionsAsked: number;
  usedSeeds: Set<string>;
  turnAnswers: { id: string; text: string }[]; // non-private answers this turn
  turnAnswerIds: string[]; // evidence ids for the claim
  allClaims: Claim[];
  sessionClaims: Claim[]; // created/under-review this session (Field notes)
  answerText: string;
  busy: boolean;
  error: string | null;
}

const INITIAL: State = {
  phase: "init",
  layer: null,
  seedId: "",
  seedText: "",
  seedType: "",
  questionText: "",
  followupIndex: 0,
  questionsAsked: 0,
  usedSeeds: new Set(),
  turnAnswers: [],
  turnAnswerIds: [],
  allClaims: [],
  sessionClaims: [],
  answerText: "",
  busy: false,
  error: null,
};

/** A phase that represents work in progress worth resuming. */
function isActive(phase: InterviewPhase): boolean {
  return phase === "answering";
}

/** Serializable snapshot of an in-progress session (no transient/derived fields). */
interface Snapshot {
  sessionId: string;
  phase: InterviewPhase;
  layer: LayerId;
  seedId: string;
  seedText: string;
  seedType: string;
  questionText: string;
  followupIndex: number;
  questionsAsked: number;
  usedSeeds: string[];
  turnAnswers: { id: string; text: string }[];
  turnAnswerIds: string[];
  sessionClaimIds: string[];
  answerText: string;
}

export function useInterview() {
  const store = useStore();
  const { setup } = useConfig();
  const mode = setup?.mode ?? "webllm";
  const provider = setup ? setupToProvider(setup) : null;

  // A ?layer= deep-link (from the Map) targets a specific interviewable layer.
  const [searchParams] = useSearchParams();
  const rawTarget = searchParams.get("layer");
  const targetLayer =
    rawTarget && LAYER_BY_ID[rawTarget as LayerId]?.hasSeedQuestions
      ? (rawTarget as LayerId)
      : null;
  const targetRef = useRef(targetLayer);

  const sessionId = useRef(newId());
  const [state, setState] = useState<State>(INITIAL);
  const ref = useRef<State>(INITIAL);
  const update = useCallback((patch: Partial<State>) => {
    ref.current = { ...ref.current, ...patch };
    setState(ref.current);
  }, []);

  // ---- draft autosave (survives navigating away mid-session) ----
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const snapshotOf = useCallback((s: State): Snapshot | null => {
    if (!s.layer || !isActive(s.phase)) return null;
    return {
      sessionId: sessionId.current,
      phase: s.phase,
      layer: s.layer,
      seedId: s.seedId,
      seedText: s.seedText,
      seedType: s.seedType,
      questionText: s.questionText,
      followupIndex: s.followupIndex,
      questionsAsked: s.questionsAsked,
      usedSeeds: [...s.usedSeeds],
      turnAnswers: s.turnAnswers,
      turnAnswerIds: s.turnAnswerIds,
      sessionClaimIds: s.sessionClaims.map((c) => c.id),
      answerText: s.answerText,
    };
  }, []);

  const persistDraft = useCallback(async () => {
    const snap = snapshotOf(ref.current);
    if (!snap) return;
    await store.settings.set(SETTINGS_KEYS.interviewDraft, snap);
    setSavedAt(new Date().toISOString());
  }, [store, snapshotOf]);

  const clearDraft = useCallback(async () => {
    await store.settings.delete(SETTINGS_KEYS.interviewDraft);
  }, [store]);

  // ---- init: resume a saved session, else pick the layer + first seed ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [claims, answers, snap] = await Promise.all([
        store.claims.all(),
        store.answers.all(),
        store.settings.get<Snapshot>(SETTINGS_KEYS.interviewDraft),
      ]);
      if (cancelled) return;

      const coverage = computeCoverage(claims, answers);
      const want = targetRef.current;
      // Resume where the user left off - unless they deep-linked a different
      // layer, or the draft's layer has already had its full run of questions
      // (resuming that would just re-ask a finished layer).
      if (
        snap &&
        isActive(snap.phase) &&
        (!want || snap.layer === want) &&
        coverage[snap.layer]?.status !== "complete" &&
        (coverage[snap.layer]?.answered ?? 0) < TARGET_QUESTIONS
      ) {
        sessionId.current = snap.sessionId;
        const byId = new Map(claims.map((c) => [c.id, c]));
        const sessionClaims = snap.sessionClaimIds
          .map((id) => byId.get(id))
          .filter((c): c is Claim => c !== undefined);
        update({
          phase: snap.phase,
          layer: snap.layer,
          seedId: snap.seedId,
          seedText: snap.seedText,
          seedType: snap.seedType,
          questionText: snap.questionText,
          followupIndex: snap.followupIndex,
          questionsAsked: snap.questionsAsked,
          usedSeeds: new Set(snap.usedSeeds),
          turnAnswers: snap.turnAnswers,
          turnAnswerIds: snap.turnAnswerIds,
          sessionClaims,
          answerText: snap.answerText,
          allClaims: claims,
        });
        return;
      }

      const layer =
        want ??
        pickInterviewLayer(
          (l) => coverage[l].status,
          (l) => coverage[l].answered < TARGET_QUESTIONS,
        );
      if (!layer) {
        update({ phase: "none", allClaims: claims });
        return;
      }
      // A layer that's already had its full run of questions has nothing left
      // to ask - don't restart it; the "none" state offers the next layer.
      if (coverage[layer].answered >= TARGET_QUESTIONS) {
        update({ phase: "none", layer, allClaims: claims });
        return;
      }
      const usedSeeds = new Set(
        answers
          .filter((a) => a.layer === layer && a.questionSeedId)
          .map((a) => a.questionSeedId as string),
      );
      const seed = pickNextSeed(layer, usedSeeds);
      if (!seed) {
        update({ phase: "none", layer, allClaims: claims });
        return;
      }
      update({
        phase: "answering",
        layer,
        seedId: seed.id,
        seedText: seed.text,
        seedType: seed.type,
        questionText: seed.text,
        usedSeeds,
        allClaims: claims,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [store, update]);

  // Autosave (debounced) on any change while a session is active; clear the
  // saved draft once the session is finished.
  useEffect(() => {
    if (state.phase === "init") return;
    if (!isActive(state.phase)) {
      void clearDraft();
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void persistDraft(), 500);
    return () => clearTimeout(debounceRef.current);
  }, [state, persistDraft, clearDraft]);

  // Persist immediately when the screen unmounts (navigation mid-session).
  useEffect(() => {
    return () => {
      const snap = snapshotOf(ref.current);
      if (snap) void store.settings.set(SETTINGS_KEYS.interviewDraft, snap);
    };
  }, [store, snapshotOf]);

  const setAnswerText = useCallback(
    (text: string) => update({ answerText: text }),
    [update],
  );

  const activeClaimsInLayer = useCallback(() => {
    const s = ref.current;
    return s.allClaims.filter(
      (c) => c.layer === s.layer && c.status === "active",
    );
  }, []);

  const nextQuestion = useCallback(() => {
    const s = ref.current;
    const base: Partial<State> = {
      turnAnswers: [],
      turnAnswerIds: [],
      followupIndex: 0,
      answerText: "",
    };
    if (s.questionsAsked >= TARGET_QUESTIONS) {
      update({ ...base, phase: "done" });
      return;
    }
    const seed = pickNextSeed(s.layer as LayerId, s.usedSeeds);
    if (!seed) {
      update({ ...base, phase: "done" });
      return;
    }
    update({
      ...base,
      phase: "answering",
      seedId: seed.id,
      seedText: seed.text,
      seedType: seed.type,
      questionText: seed.text,
    });
  }, [update]);

  const finishTurn = useCallback(async () => {
    const s = ref.current;
    if (s.turnAnswers.length > 0) {
      const input: DistillInput = {
        layer: s.layer as LayerId,
        question: s.seedText,
        questionType: s.seedType,
        answers: s.turnAnswers,
        existingClaims: activeClaimsInLayer().map((c) => ({
          id: c.id,
          text: c.text,
        })),
      };

      // Live model: distill this turn's answers into draft claims now.
      update({ busy: true, error: null });
      try {
        const out = await distill(provider!, input);
        const { drafts, contradictions } = toRecords(out);
        for (const d of drafts) await store.claims.put(d);
        for (const c of contradictions) await store.contradictions.put(c);
        update({
          allClaims: [...ref.current.allClaims, ...drafts],
          sessionClaims: [...ref.current.sessionClaims, ...drafts],
        });
      } catch (err) {
        update({
          error:
            err instanceof Error ? err.message : "The distiller call failed.",
        });
      }
    }
    // Only now is the turn done: advance the counter and move on (nextQuestion
    // clears the answer box). The step held put while the model worked.
    update({ questionsAsked: ref.current.questionsAsked + 1, busy: false });
    nextQuestion();
  }, [provider, store, update, nextQuestion, activeClaimsInLayer]);

  const submit = useCallback(
    async (opts?: { keepPrivate?: boolean }) => {
      const s = ref.current;
      const text = s.answerText.trim();
      if (!text || s.busy) return;
      const keepPrivate = !!opts?.keepPrivate;
      const isFollowup = s.followupIndex > 0;

      const ans = makeAnswer({
        sessionId: sessionId.current,
        layer: s.layer as LayerId,
        questionSeedId: isFollowup ? null : s.seedId,
        questionText: s.questionText,
        questionType: isFollowup ? "follow_up" : s.seedType,
        text,
        private: keepPrivate,
      });
      await store.answers.put(ans); // save after every answer (spec §3)

      const usedSeeds = isFollowup
        ? s.usedSeeds
        : new Set(s.usedSeeds).add(s.seedId);
      const turnAnswers = keepPrivate
        ? s.turnAnswers
        : [...s.turnAnswers, { id: ans.id, text }];
      const turnAnswerIds = keepPrivate
        ? s.turnAnswerIds
        : [...s.turnAnswerIds, ans.id];

      // Follow-up ladder (spec §3): climb one step if the answer is vague.
      if (
        !keepPrivate &&
        s.followupIndex < MAX_FOLLOWUPS &&
        isVague(text)
      ) {
        update({
          usedSeeds,
          turnAnswers,
          turnAnswerIds,
          followupIndex: s.followupIndex + 1,
          questionText: FOLLOWUP_LADDER[s.followupIndex],
          answerText: "",
        });
        return;
      }

      // Keep the answer text and the step in place while the model works; the
      // counter advances only after the turn is distilled (in finishTurn), so
      // the UI never looks "done" while it's still processing.
      update({
        usedSeeds,
        turnAnswers,
        turnAnswerIds,
        busy: true,
        error: null,
      });
      await finishTurn();
    },
    [store, update, finishTurn],
  );

  const keepPrivate = useCallback(() => submit({ keepPrivate: true }), [submit]);

  const skipQuestion = useCallback(() => {
    const s = ref.current;
    update({
      usedSeeds: new Set(s.usedSeeds).add(s.seedId),
      questionsAsked: s.questionsAsked + 1,
    });
    nextQuestion();
  }, [update, nextQuestion]);

  const endSession = useCallback(() => {
    update({ phase: "done" });
  }, [update]);

  /**
   * Jump straight into the next interviewable layer (the "Continue" button on
   * the done/none states). Skips any layer whose questions are exhausted, so a
   * finished-but-0-claims layer never traps you. Resets the session in place -
   * no navigation - so the same screen keeps going.
   */
  const startNext = useCallback(async () => {
    const [claims, answers] = await Promise.all([
      store.claims.all(),
      store.answers.all(),
    ]);
    const coverage = computeCoverage(claims, answers);
    const layer = pickInterviewLayer(
      (l) => coverage[l].status,
      (l) => coverage[l].answered < TARGET_QUESTIONS,
    );
    if (!layer) {
      update({ phase: "none", layer: null, allClaims: claims });
      return;
    }
    const usedSeeds = new Set(
      answers
        .filter((a) => a.layer === layer && a.questionSeedId)
        .map((a) => a.questionSeedId as string),
    );
    const seed = pickNextSeed(layer, usedSeeds);
    if (!seed) {
      update({ phase: "none", layer, allClaims: claims });
      return;
    }
    sessionId.current = newId();
    await clearDraft();
    update({
      phase: "answering",
      layer,
      seedId: seed.id,
      seedText: seed.text,
      seedType: seed.type,
      questionText: seed.text,
      followupIndex: 0,
      questionsAsked: 0,
      usedSeeds,
      turnAnswers: [],
      turnAnswerIds: [],
      sessionClaims: [],
      answerText: "",
      allClaims: claims,
      busy: false,
      error: null,
    });
  }, [store, update, clearDraft]);

  // ---- Field notes review actions ----
  const replaceClaim = useCallback(
    (updated: Claim) => {
      const s = ref.current;
      update({
        allClaims: s.allClaims.map((c) => (c.id === updated.id ? updated : c)),
        sessionClaims: s.sessionClaims.map((c) =>
          c.id === updated.id ? updated : c,
        ),
      });
    },
    [update],
  );

  const confirm = useCallback(
    async (claim: Claim) => {
      const updated = confirmClaim(claim);
      await store.claims.put(updated);
      replaceClaim(updated);
    },
    [store, replaceClaim],
  );

  const edit = useCallback(
    async (claim: Claim, text: string) => {
      const updated = editClaim(claim, text);
      await store.claims.put(updated);
      replaceClaim(updated);
    },
    [store, replaceClaim],
  );

  const discard = useCallback(
    async (claim: Claim) => {
      await store.claims.delete(claim.id);
      const s = ref.current;
      update({
        allClaims: s.allClaims.filter((c) => c.id !== claim.id),
        sessionClaims: s.sessionClaims.filter((c) => c.id !== claim.id),
      });
    },
    [store, update],
  );

  return {
    state,
    mode,
    savedAt,
    submit,
    keepPrivate,
    skipQuestion,
    setAnswerText,
    endSession,
    startNext,
    confirm,
    edit,
    discard,
  };
}
