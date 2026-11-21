import { type FormEvent, type ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Claim } from "@/types/model";
import { LAYER_BY_ID } from "@/engine/layers";
import { ConfidenceTag } from "@/app/components/ConfidenceTag";
import { useConfig } from "@/app/config/ConfigContext";
import {
  etaLabel,
  modelShortLabel,
  useDownload,
} from "@/app/model/DownloadContext";
import { DOTS } from "@/app/screens/shared";
import { useInterview } from "./useInterview";

const TARGET_QUESTIONS = 8;

export function InterviewScreen() {
  const iv = useInterview();
  const navigate = useNavigate();
  const { setup } = useConfig();
  const download = useDownload();
  const { state } = iv;
  const layerDef = state.layer ? LAYER_BY_ID[state.layer] : null;

  // A model is required for Layers 02-06. If none is configured, or the chosen
  // in-browser model is still downloading, show an honest state - never a dead
  // end and never a generic error (spec).
  if (!setup) return <PickModel navigate={navigate} />;
  if (setup.mode === "webllm" && !download.ready) {
    return <ModelDownloading layerNum={layerDef?.num} download={download} navigate={navigate} />;
  }

  if (state.phase === "init") {
    return (
      <main className={`flex-1 flex items-center justify-center ${DOTS}`}>
        <span className="label-mono">Preparing your interview…</span>
      </main>
    );
  }

  if (state.phase === "none") {
    return (
      <main
        className={`flex-1 flex items-center justify-center py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
      >
        <div className="max-w-[48ch] flex flex-col gap-3 p-8 bg-sand-50 border border-sand-300 rounded-panel">
          <h1 className="m-0 text-2xl">Nothing to ask right now</h1>
          <p className="m-0 text-muted">
            Every interviewable layer is either complete or out of questions.
            Review what you have on your profile, or export a persona.
          </p>
          <Link
            to="/"
            className="self-start inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground no-underline text-sm font-medium"
          >
            Back to the map
          </Link>
        </div>
      </main>
    );
  }

  const done = Math.min(state.questionsAsked, TARGET_QUESTIONS);
  const totalClaims = state.allClaims.filter(
    (c) => c.status !== "draft",
  ).length;

  return (
    <main
      className={`flex-1 flex flex-wrap items-start gap-y-10 gap-x-12 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
    >
      {/* Left: layer + steps */}
      <aside className="flex-[1_1_200px] min-w-0 flex flex-col gap-4">
        <span className="label-mono">Interview · Layer {layerDef?.num} of 6</span>
        <h1 className="m-0 font-heading text-[clamp(26px,2.6vw,34px)] leading-[1.1] font-medium">
          {layerDef?.name}
        </h1>
        <div className="flex flex-col gap-2">
          <div className="flex gap-1.5">
            {Array.from({ length: TARGET_QUESTIONS }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 max-w-[22px] rounded-pill ${
                  i < done
                    ? "bg-accent"
                    : i === done
                      ? "bg-ink"
                      : "bg-sand-300"
                }`}
              />
            ))}
          </div>
          <span className="label-mono normal-case tracking-normal text-[13px]">
            Question {Math.min(done + 1, TARGET_QUESTIONS)} of {TARGET_QUESTIONS} ·{" "}
            {totalClaims} claim{totalClaims === 1 ? "" : "s"} so far
          </span>
        </div>
        <p className="m-0 text-sm text-muted max-w-[28ch]">
          {layerDef?.intro ?? layerDef?.subtitle}
        </p>
        {state.phase === "answering" && (
          <button
            type="button"
            onClick={() => navigate("/")}
            className="self-start inline-flex items-center min-h-[40px] px-4 rounded-pill border border-sand-300 bg-ground text-ink text-sm font-medium hover:bg-sand-100"
          >
            Pause and save
          </button>
        )}
      </aside>

      {/* Center: the question / flow */}
      <section className="flex-[2_1_440px] min-w-0 flex flex-col gap-5">
        <CenterPanel iv={iv} />
      </section>

      {/* Right: field notes */}
      <aside className="flex-[1_1_300px] min-w-0">
        <div className="flex flex-col gap-4 p-5 bg-sand-50 border border-sand-300 rounded-panel">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <span className="label-mono">Field notes</span>
              <span className="font-mono text-xs text-ink">
                {state.sessionClaims.length} this session
              </span>
            </div>
            <p className="m-0 text-sm text-muted leading-[1.45]">
              Draft claims from this session. Nothing enters your profile until
              you confirm it.
            </p>
          </div>
          {state.sessionClaims.length === 0 ? (
            <p className="m-0 text-sm text-muted leading-[1.45]">
              No claims yet - they appear here as the model reads your answers.
            </p>
          ) : (
            state.sessionClaims.map((c) => (
              <FieldNote key={c.id} claim={c} iv={iv} />
            ))
          )}
        </div>
      </aside>
    </main>
  );
}

type Nav = ReturnType<typeof useNavigate>;

/** No model configured yet - Layers 02-06 need one. */
function PickModel({ navigate }: { navigate: Nav }) {
  return (
    <main
      className={`flex-1 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
    >
      <div className="w-full flex flex-col gap-3 p-8 bg-sand-50 border border-sand-300 rounded-panel">
        <span className="label-mono">Interview</span>
        <h1 className="m-0 text-2xl">Pick a model first</h1>
        <p className="m-0 text-muted leading-[1.55]">
          Layers 02-06 need a model to ask the follow-ups and draft your claims.
          Choose one on the model screen - the free in-browser model, or your own
          Anthropic / OpenAI-compatible key. Facts (Layer 01) need no model and
          are ready now.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={() => navigate("/model")}
            className="inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground text-sm font-medium"
          >
            Choose a model
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center min-h-[44px] px-5 rounded-pill border border-sand-300 text-ink text-sm font-medium hover:bg-sand-100"
          >
            Back to map
          </button>
        </div>
      </div>
    </main>
  );
}

/** The chosen in-browser model is still downloading - wait here or go back. */
function ModelDownloading({
  layerNum,
  download,
  navigate,
}: {
  layerNum?: string;
  download: ReturnType<typeof useDownload>;
  navigate: Nav;
}) {
  const num = layerNum ?? "02";
  const { state } = download;
  return (
    <main
      className={`flex-1 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
    >
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="label-mono">Interview · Layer {num} of 6</span>
          <h1 className="m-0 font-heading text-[clamp(28px,3.2vw,40px)] tracking-[-0.02em]">
            Model still downloading.
          </h1>
        </div>

        <div className="flex flex-col gap-4 p-6 bg-sand-50 border border-sand-300 rounded-panel">
          <h2 className="m-0 font-heading text-[clamp(19px,2vw,23px)] font-medium">
            Layer {num} needs the model - it's on its way.
          </h2>
          <p className="m-0 text-[15px] leading-[1.6] text-muted max-w-[68ch]">
            The model asks the follow-up questions and drafts claims for Layers
            02-06, so this layer can't start until the download finishes. This
            isn't a dead end: your Facts are saved, and you can wait here or go
            back to the Map - the download keeps running either way.
          </p>

          {state.kind === "downloading" && (
            <div className="flex flex-col gap-1.5">
              <div className="w-full h-2 rounded-pill bg-[var(--track)] overflow-hidden">
                <div
                  className="h-2 rounded-pill bg-ink transition-[width] duration-300"
                  style={{ width: `${Math.round(state.pct * 100)}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 font-mono text-xs text-muted">
                <span>
                  {Math.round(state.pct * 100)}%
                  {state.mbDone != null && state.mbTotal != null
                    ? ` · ${Math.round(state.mbDone)} MB of ${state.mbTotal} MB`
                    : ""}
                </span>
                <span>
                  {etaLabel(state.etaSec)} · {modelShortLabel(state.model)}
                </span>
              </div>
            </div>
          )}
          {state.kind === "error" && (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-accent">{state.message}</span>
              <button
                type="button"
                onClick={download.retry}
                className="self-start inline-flex items-center min-h-[40px] px-5 rounded-pill bg-ink text-ground text-sm font-medium"
              >
                Retry download
              </button>
            </div>
          )}
          {state.kind === "idle" && (
            <button
              type="button"
              onClick={() => download.start()}
              className="self-start inline-flex items-center min-h-[40px] px-5 rounded-pill bg-ink text-ground text-sm font-medium"
            >
              Start the download
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="self-start inline-flex items-center gap-2 min-h-[48px] px-6 rounded-pill bg-ink text-ground text-[15px] font-medium"
        >
          Back to Map →
        </button>
      </div>
    </main>
  );
}

type IV = ReturnType<typeof useInterview>;

const BOX =
  "w-full border border-sand-300 rounded-[12px] px-4 py-3.5 bg-sand-50 text-ink text-base leading-[1.5] focus:border-accent focus:outline-none";

function Pill({
  children,
  onClick,
  variant = "ghost",
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "outline" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls =
    variant === "primary"
      ? "bg-ink text-ground"
      : variant === "outline"
        ? "border border-sand-300 text-ink hover:bg-sand-100"
        : "border border-sand-300 text-muted hover:text-ink hover:bg-sand-100";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center min-h-[40px] px-4 rounded-pill text-sm font-medium disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

function CenterPanel({ iv }: { iv: IV }) {
  const { state } = iv;

  if (state.phase === "answering") {
    const isFollowup = state.followupIndex > 0;
    const earlierAnswer = state.turnAnswers[0]?.text;
    return (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void iv.submit();
        }}
        className="flex flex-col gap-5"
      >
        {isFollowup && earlierAnswer && (
          <div className="flex flex-col gap-2 pb-5 border-b border-sand-300">
            <span className="label-mono">Earlier</span>
            <p className="m-0 text-[15px] leading-[1.5] text-muted">
              {state.seedText}
            </p>
            <p className="m-0 text-[15px] leading-[1.5]">{earlierAnswer}</p>
          </div>
        )}

        {isFollowup && <span className="label-mono">Follow-up</span>}
        <p className="m-0 font-heading text-[clamp(24px,2.8vw,34px)] leading-[1.15] tracking-[-0.01em]">
          {state.questionText}
        </p>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Your answer</span>
          <textarea
            value={state.answerText}
            onChange={(e) => iv.setAnswerText(e.target.value)}
            rows={6}
            autoFocus
            className={BOX}
            placeholder="Answer the way you'd actually act, not the way you think you should."
          />
        </div>

        {state.error && <span className="text-sm text-accent">{state.error}</span>}

        <div className="flex flex-wrap items-center gap-3">
          <Pill
            type="submit"
            variant="primary"
            disabled={!state.answerText.trim() || state.busy}
          >
            {state.busy ? "Working…" : "Save answer"}
          </Pill>
          <Pill
            variant="outline"
            onClick={() => iv.skipQuestion()}
            disabled={state.busy}
          >
            Skip
          </Pill>
          <Pill
            variant="outline"
            onClick={() => iv.keepPrivate()}
            disabled={!state.answerText.trim() || state.busy}
          >
            Keep this one private
          </Pill>
        </div>
        <p className="m-0 text-xs text-muted">
          A private answer is stored on this device, never exported, never used
          in Mirror.
        </p>
      </form>
    );
  }

  // done
  const n = state.sessionClaims.length;
  return (
    <div className="flex flex-col gap-4 p-6 bg-sand-50 border border-sand-300 rounded-panel">
      <span className="label-mono">Session saved</span>
      <h2 className="m-0 text-2xl">
        {n === 0
          ? "No claims from this session yet"
          : `${n} claim${n === 1 ? "" : "s"} from this session`}
      </h2>
      <p className="m-0 text-muted">
        {n === 0
          ? "Your answers are saved on this device. Claims are drafted by the model from your answers - if you keep seeing zero, check that your model is connected in Settings."
          : "Confirm or edit anything in Field notes, then see the whole picture on your profile - or export a persona."}
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/profile"
          className="inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground no-underline text-sm font-medium"
        >
          Open profile
        </Link>
        <Link
          to="/"
          className="inline-flex items-center min-h-[44px] px-5 rounded-pill border border-sand-300 text-ink no-underline text-sm font-medium hover:bg-sand-100"
        >
          Back to map
        </Link>
      </div>
    </div>
  );
}

function FieldNote({ claim, iv }: { claim: Claim; iv: IV }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(claim.text);
  const isDraft = claim.status === "draft";

  return (
    <div className="flex flex-col gap-3 p-4 bg-ground border border-sand-300 rounded-card">
      {editing ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full border border-sand-300 rounded-[8px] px-3 py-2 bg-ground text-ink text-sm"
          autoFocus
        />
      ) : (
        <>
          <ConfidenceTag claim={claim} />
          <p className="m-0 text-[15px] leading-[1.45]">{claim.text}</p>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <Pill
              variant="outline"
              onClick={() => {
                void iv.edit(claim, text);
                setEditing(false);
              }}
            >
              Save
            </Pill>
            <Pill
              onClick={() => {
                setText(claim.text);
                setEditing(false);
              }}
            >
              Cancel
            </Pill>
          </>
        ) : (
          <>
            {isDraft && (
              <Pill variant="outline" onClick={() => void iv.confirm(claim)}>
                Confirm
              </Pill>
            )}
            <Pill onClick={() => setEditing(true)}>Edit</Pill>
            <Pill onClick={() => void iv.discard(claim)}>Discard</Pill>
          </>
        )}
      </div>
    </div>
  );
}
