import { useState } from "react";
import { Link } from "react-router-dom";
import { LAYER_BY_ID } from "@/engine/layers";
import { MATCH_SCORE_MIN_TESTS } from "@/engine/test";
import { DOTS } from "@/app/screens/shared";
import { useTest } from "./useTest";

export function TestScreen() {
  const t = useTest();

  if (t.phase === "init") {
    return (
      <main className={`flex-1 flex items-center justify-center ${DOTS}`}>
        <span className="label-mono">Loading…</span>
      </main>
    );
  }

  if (t.phase === "unavailable") {
    return (
      <main
        className={`flex-1 flex items-center justify-center py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
      >
        <div className="max-w-[48ch] flex flex-col gap-3 p-8 bg-sand-50 border border-sand-300 rounded-panel">
          <span className="label-mono">Test</span>
          <h1 className="m-0 text-2xl">Test mode needs a live model</h1>
          <p className="m-0 text-muted">
            Your current mode ({t.mode}) doesn't call a model automatically, so
            it can't generate a scenario and answer as you. Connect a model in
            Settings to use Test mode.
          </p>
          <Link
            to="/app/settings"
            className="self-start inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground no-underline text-sm font-medium"
          >
            Open settings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`flex-1 flex flex-wrap items-start gap-y-8 gap-x-12 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
    >
      <section className="flex-[2_1_460px] min-w-0 flex flex-col gap-6">
        {t.phase === "answered" ? (
          <Answered t={t} />
        ) : (
          <Intro t={t} />
        )}
      </section>

      <aside className="flex-[1_1_280px] min-w-0 flex flex-col gap-3">
        <span className="label-mono">Drawn from</span>
        <p className="m-0 text-sm text-muted leading-[1.5] max-w-[40ch]">
          The claims the model used to write this answer. A wrong answer usually
          traces back to one of them.
        </p>
        {t.phase === "answered" && t.drawnFrom.length > 0 ? (
          <div className="flex flex-col">
            {t.drawnFrom.map((c) => {
              const def = LAYER_BY_ID[c.layer];
              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-1 py-4 border-t border-sand-200"
                >
                  <span className="label-mono">
                    {def?.num} · {def?.name} · {c.confidence}
                  </span>
                  <p className="m-0 text-[15px] leading-[1.4]">{c.text}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="m-0 pt-2 text-sm text-muted border-t border-sand-200">
            Run a scenario to see which claims it leaned on.
          </p>
        )}
      </aside>
    </main>
  );
}

type T = ReturnType<typeof useTest>;

function Intro({ t }: { t: T }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="label-mono">Test</span>
        <MatchScore score={t.score} count={t.count} />
      </div>
      {t.phase === "rated" && (
        <p className="m-0 text-sm text-muted">
          Saved. A 4 or 5 marks the claims it leaned on as <em>tested</em>; a 1
          or 2 flags them for another look on your profile.
        </p>
      )}
      <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,40px)] tracking-[-0.01em] leading-[1.1]">
        How well does the model answer like you?
      </h1>
      <p className="m-0 max-w-[52ch] text-muted">
        It invents a situation you haven't been asked about, answers as you, and
        shows which claims it leaned on. Rate how close it felt.
      </p>
      <button
        type="button"
        onClick={() => void t.start()}
        disabled={t.busy}
        className="self-start inline-flex items-center min-h-[48px] px-6 rounded-pill bg-ink text-ground text-sm font-medium disabled:opacity-40"
      >
        {t.busy ? "Thinking…" : "New scenario"}
      </button>
      {t.error && <span className="text-sm text-accent">{t.error}</span>}
    </div>
  );
}

const FEEDBACK: Record<number, string> = {
  5: "Spot on.",
  4: "Close. A small correction will sharpen it.",
  3: "Half right.",
  2: "Off. Flag what it missed so the claims get another look.",
  1: "Not you. The claims it leaned on will be flagged.",
};

function Answered({ t }: { t: T }) {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [feedback, setFeedback] = useState("");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <span className="label-mono">Test · New scenario</span>
        <h1 className="m-0 font-heading text-[clamp(24px,3vw,34px)] leading-[1.15] tracking-[-0.01em]">
          {t.scenario}
        </h1>
      </div>

      <div className="flex flex-col gap-2.5 p-5 bg-sand-50 border border-sand-300 rounded-panel">
        <span className="label-mono">The model, answering as you</span>
        <p className="m-0 font-heading font-normal text-[clamp(19px,1.9vw,23px)] leading-[1.45] [text-wrap:pretty] whitespace-pre-wrap">
          {t.answer}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">
          How much does this sound like you?
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="label-mono">Not me</span>
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`w-12 h-12 rounded-full font-mono text-base border ${
                rating === n
                  ? "bg-ink text-ground border-ink"
                  : "border-sand-300 text-ink hover:bg-sand-100"
              }`}
            >
              {n}
            </button>
          ))}
          <span className="label-mono">Exactly me</span>
        </div>
        {rating && <span className="text-sm text-muted">{FEEDBACK[rating]}</span>}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">What felt off?</span>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          className="w-full border border-sand-300 rounded-[12px] px-4 py-3 bg-sand-50 text-ink text-base leading-[1.5] focus:border-accent focus:outline-none"
          placeholder="For example: I wouldn't joke about it. I'd be direct."
        />
      </label>

      {t.error && <span className="text-sm text-accent">{t.error}</span>}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => rating && void t.rate(rating, feedback)}
          disabled={rating === null || t.busy}
          className="inline-flex items-center min-h-[48px] px-6 rounded-pill bg-ink text-ground text-sm font-medium disabled:opacity-40"
        >
          {t.busy ? "Saving…" : "Save and refine"}
        </button>
        <button
          type="button"
          onClick={() => void t.start()}
          disabled={t.busy}
          className="inline-flex items-center min-h-[48px] px-6 rounded-pill border border-sand-300 text-ink text-sm font-medium hover:bg-sand-100 disabled:opacity-40"
        >
          Try another scenario
        </button>
      </div>
    </div>
  );
}

function MatchScore({ score, count }: { score: number | null; count: number }) {
  if (count < MATCH_SCORE_MIN_TESTS || score === null) {
    return (
      <span className="label-mono">
        {count}/{MATCH_SCORE_MIN_TESTS} tests to a score
      </span>
    );
  }
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="label-mono">Match</span>
      <span className="font-heading text-xl font-medium">
        {score.toFixed(1)}
      </span>
      <span className="label-mono">/ 5</span>
    </span>
  );
}
