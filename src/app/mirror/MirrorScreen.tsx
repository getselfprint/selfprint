import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MirrorResponse } from "@/types/model";
import { newId } from "@/engine/session";
import { DOTS } from "@/app/screens/shared";
import {
  MIRROR_OPEN,
  MIRROR_SCALES,
  type MirrorScale,
  defaultScores,
  freqWord,
} from "./mirrorData";
import { useMirror } from "./useMirror";

type View = "overview" | "self" | "respondent";
type Scores = Record<string, number>;

export function MirrorScreen() {
  const m = useMirror();
  const [view, setView] = useState<View>("overview");

  if (m.loading) {
    return (
      <main className={`flex-1 flex items-center justify-center ${DOTS}`}>
        <span className="label-mono">Loading…</span>
      </main>
    );
  }

  return (
    <main className={`flex-1 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}>
      {view === "self" && (
        <ScoreEditor
          title="How you see yourself"
          intro="Rate how often each is true of you. This is compared against how others see you - it never leaves the device or enters an export."
          initial={m.self ?? defaultScores()}
          onSave={async (s) => {
            await m.saveSelf(s);
            setView("overview");
          }}
          onCancel={() => setView("overview")}
        />
      )}
      {view === "respondent" && (
        <Respondent
          onSeal={async (r) => {
            await m.addResponse(r);
            setView("overview");
          }}
          onCancel={() => setView("overview")}
        />
      )}
      {view === "overview" && <Overview m={m} setView={setView} />}
    </main>
  );
}

type M = ReturnType<typeof useMirror>;

function Overview({ m, setView }: { m: M; setView: (v: View) => void }) {
  const navigate = useNavigate();
  const self = m.self;
  const shared = m.responses.find((r) => r.shared) ?? null;
  const sealed = m.responses.filter((r) => !r.shared);
  const other = shared?.scales ?? null;

  if (!self) {
    return (
      <div className="w-full max-w-[560px] flex flex-col gap-4">
        <span className="label-mono">Mirror</span>
        <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,40px)] tracking-[-0.02em] leading-[1.1]">
          How others see you, next to how you see yourself.
        </h1>
        <p className="m-0 text-muted max-w-[52ch]">
          Set where you'd put yourself first, then invite someone who knows you
          to answer the same scales. Their answers stay sealed until you reveal
          them.
        </p>
        <button
          type="button"
          onClick={() => setView("self")}
          className="self-start inline-flex items-center min-h-[48px] px-6 rounded-pill bg-ink text-ground text-sm font-medium"
        >
          Set how you see yourself
        </button>
      </div>
    );
  }

  const largest = other
    ? MIRROR_SCALES.map((s) => ({
        scale: s,
        you: self[s.key] ?? 50,
        them: other[s.key] ?? 50,
        gap: Math.abs((self[s.key] ?? 50) - (other[s.key] ?? 50)),
      })).reduce((a, b) => (b.gap > a.gap ? b : a))
    : null;

  return (
    <div className="w-full flex flex-wrap gap-x-12 gap-y-10 items-start">
      <section className="flex-[2_1_480px] min-w-[320px] flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="label-mono">Mirror</span>
          <h1 className="m-0 font-heading text-[clamp(30px,4vw,48px)] tracking-[-0.02em] leading-[1.05]">
            How you see yourself, next to how someone close sees you.
          </h1>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-ink">
          <div className="flex items-center gap-5 font-mono text-[13px]">
            <span className="inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-ink inline-block" />
              Your view
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-2.5 h-2.5 border-2 border-ink bg-ground inline-block" />
              Their view
            </span>
          </div>
          <span className="label-mono">Rarely ← → Always</span>
        </div>

        <GapChart self={self} other={other} />

        <p className="m-0 label-mono">
          {other
            ? "The longer the bar between the two marks, the bigger the blind spot."
            : "Only your view so far. Invite someone to see the gaps."}
        </p>
      </section>

      <aside className="flex-[1_1_300px] min-w-[280px] flex flex-col gap-4">
        {largest && (
          <div className="flex flex-col gap-3 p-5 bg-sand-50 border border-sand-300 rounded-panel">
            <span className="label-mono">Largest gap</span>
            <h3 className="m-0 font-heading text-[22px] font-medium leading-[1.15]">
              {largest.scale.label}
            </h3>
            <div className="flex flex-col gap-0.5">
              <span className="label-mono">You said</span>
              <span className="text-[15px]">{freqWord(largest.you)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="label-mono">They said</span>
              <span className="text-[15px]">{freqWord(largest.them)}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/interview")}
              className="mt-1 self-start inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground text-sm font-medium"
            >
              Explore this in an interview
            </button>
          </div>
        )}

        {sealed.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 p-4 bg-sand-50 border border-dashed border-sand-300 rounded-panel"
          >
            <span className="text-sm">
              Sealed · {r.respondentLabel || "someone"}
            </span>
            <button
              type="button"
              onClick={() => m.reveal(r)}
              className="shrink-0 inline-flex items-center min-h-[40px] px-4 rounded-pill bg-ink text-ground text-sm font-medium"
            >
              Reveal
            </button>
          </div>
        ))}

        <div className="flex flex-col gap-3 p-5 border border-sand-300 rounded-panel">
          <h3 className="m-0 text-lg font-medium">Add another perspective</h3>
          <p className="m-0 text-sm text-muted leading-[1.5]">
            Hand them this device and they answer the same scales. Their answers
            stay sealed until they choose to share.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setView("respondent")}
              className="inline-flex items-center min-h-[44px] px-5 rounded-pill border border-sand-300 text-ink text-sm font-medium hover:bg-sand-100"
            >
              Start a mirror interview
            </button>
            <button
              type="button"
              onClick={() => setView("self")}
              className="inline-flex items-center min-h-[44px] px-4 rounded-pill text-muted text-sm hover:text-ink"
            >
              Edit your view
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function GapChart({ self, other }: { self: Scores; other: Scores | null }) {
  return (
    <div className="flex flex-col">
      {MIRROR_SCALES.map((s) => {
        const you = self[s.key] ?? 50;
        const them = other ? (other[s.key] ?? 50) : null;
        return (
          <div
            key={s.key}
            className="grid grid-cols-[minmax(120px,160px)_1fr] gap-6 items-center py-4 border-t border-sand-200"
          >
            <span className="text-[15px] leading-[1.25]">{s.label}</span>
            <div className="relative h-5">
              <div className="absolute inset-x-0 top-1/2 h-px bg-sand-300 -translate-y-1/2" />
              {them !== null && (
                <div
                  className="absolute top-1/2 h-[3px] bg-accent -translate-y-1/2"
                  style={{
                    left: `${Math.min(you, them)}%`,
                    width: `${Math.abs(you - them)}%`,
                  }}
                />
              )}
              {them !== null && (
                <span
                  className="absolute top-1/2 w-3 h-3 border-2 border-ink bg-ground -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${them}%` }}
                />
              )}
              <span
                className="absolute top-1/2 w-3 h-3 rounded-full bg-ink -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${you}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScaleSlider({
  scale,
  value,
  onChange,
}: {
  scale: MirrorScale;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{scale.label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
      <div className="flex justify-between label-mono">
        <span>Rarely</span>
        <span>Always</span>
      </div>
    </label>
  );
}

function ScoreEditor({
  title,
  intro,
  initial,
  onSave,
  onCancel,
}: {
  title: string;
  intro: string;
  initial: Scores;
  onSave: (s: Scores) => void;
  onCancel: () => void;
}) {
  const [scores, setScores] = useState<Scores>({
    ...defaultScores(),
    ...initial,
  });
  return (
    <div className="w-full max-w-[640px] flex flex-col gap-5">
      <h1 className="m-0 font-heading text-[clamp(26px,3vw,36px)] tracking-[-0.02em]">
        {title}
      </h1>
      <p className="m-0 text-sm text-muted max-w-[56ch]">{intro}</p>
      <div className="flex flex-col gap-5">
        {MIRROR_SCALES.map((s) => (
          <ScaleSlider
            key={s.key}
            scale={s}
            value={scores[s.key] ?? 50}
            onChange={(v) => setScores((sc) => ({ ...sc, [s.key]: v }))}
          />
        ))}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onSave(scores)}
          className="inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground text-sm font-medium"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center min-h-[44px] px-4 rounded-pill text-muted text-sm hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Respondent({
  onSeal,
  onCancel,
}: {
  onSeal: (r: MirrorResponse) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [scores, setScores] = useState<Scores>(defaultScores());
  const [open, setOpen] = useState<string[]>(MIRROR_OPEN.map(() => ""));

  function seal() {
    onSeal({
      id: newId(),
      respondentLabel: label.trim() || "a friend",
      scales: scores,
      openAnswers: MIRROR_OPEN.map((q, i) => ({
        question: q,
        text: open[i].trim(),
      })).filter((o) => o.text.length > 0),
      shared: false,
    });
  }

  return (
    <div className="w-full max-w-[640px] flex flex-col gap-5">
      <h1 className="m-0 font-heading text-[clamp(26px,3vw,36px)] tracking-[-0.02em]">
        Answering about them
      </h1>
      <p className="m-0 text-sm text-muted max-w-[56ch]">
        Hand the device to someone who knows the person well. Answer honestly -
        your answers are sealed and only revealed when they choose.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="label-mono">Your relationship to them</span>
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="partner, friend, sibling…"
          className="w-full border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base"
        />
      </label>
      <div className="flex flex-col gap-5">
        {MIRROR_SCALES.map((s) => (
          <ScaleSlider
            key={s.key}
            scale={s}
            value={scores[s.key] ?? 50}
            onChange={(v) => setScores((sc) => ({ ...sc, [s.key]: v }))}
          />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {MIRROR_OPEN.map((q, i) => (
          <label key={i} className="flex flex-col gap-1.5">
            <span className="text-sm">{q}</span>
            <textarea
              value={open[i]}
              onChange={(e) =>
                setOpen((o) => o.map((t, j) => (j === i ? e.target.value : t)))
              }
              rows={2}
              className="w-full border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base"
            />
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={seal}
          className="inline-flex items-center min-h-[44px] px-5 rounded-pill bg-ink text-ground text-sm font-medium"
        >
          Seal answers
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center min-h-[44px] px-4 rounded-pill text-muted text-sm hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
