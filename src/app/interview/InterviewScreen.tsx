import { type FormEvent, type ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Claim } from "@/types/model";
import { LAYER_BY_ID } from "@/engine/layers";
import { ConfidenceTag } from "@/app/components/ConfidenceTag";
import { DOTS } from "@/app/screens/shared";
import { useInterview } from "./useInterview";

const TARGET_QUESTIONS = 8;

export function InterviewScreen() {
  const iv = useInterview();
  const navigate = useNavigate();
  const { state } = iv;
  const layerDef = state.layer ? LAYER_BY_ID[state.layer] : null;

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
            to="/app"
            className="self-start inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground no-underline text-sm font-medium"
          >
            Back to the map
          </Link>
        </div>
      </main>
    );
  }

  const done = Math.min(state.questionsAsked, TARGET_QUESTIONS);

  return (
    <main
      className={`flex-1 flex flex-wrap items-start gap-y-10 gap-x-12 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
    >
      {/* Left: layer + steps */}
      <aside className="flex-[1_1_200px] min-w-0 flex flex-col gap-4">
        <span className="label-mono">Layer {layerDef?.num}</span>
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
            Question {Math.min(done + 1, TARGET_QUESTIONS)} of {TARGET_QUESTIONS}
          </span>
        </div>
        <p className="m-0 text-sm text-muted max-w-[28ch]">
          {layerDef?.intro ?? layerDef?.subtitle}
        </p>
        {state.phase === "answering" && (
          <button
            type="button"
            onClick={() => navigate("/app")}
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
            <span className="label-mono">Field notes</span>
            <p className="m-0 text-sm text-muted leading-[1.45]">
              Draft claims from this session. Nothing enters your profile until
              you confirm it.
            </p>
          </div>
          {state.sessionClaims.map((c) => (
            <FieldNote key={c.id} claim={c} iv={iv} />
          ))}
        </div>
      </aside>
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
            {state.busy ? "Working…" : "Send answer"}
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
  return (
    <div className="flex flex-col gap-4 p-6 bg-sand-50 border border-sand-300 rounded-panel">
      <span className="label-mono">Session complete</span>
      <h2 className="m-0 text-2xl">
        {state.sessionClaims.length} claim
        {state.sessionClaims.length === 1 ? "" : "s"} from this session
      </h2>
      <p className="m-0 text-muted">
        Confirm or edit anything in Field notes, then see the whole picture on
        your profile - or export a persona.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          to="/app/profile"
          className="inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground no-underline text-sm font-medium"
        >
          Open profile
        </Link>
        <Link
          to="/app"
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
