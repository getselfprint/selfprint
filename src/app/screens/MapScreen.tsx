import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { LAYERS, LAYER_BY_ID } from "@/engine/layers";
import { type LayerCoverage, computeCoverage } from "@/engine/coverage";
import { pickInterviewLayer } from "@/engine/session";
import { MATCH_SCORE_MIN_TESTS, matchScore } from "@/engine/test";
import { SETTINGS_KEYS } from "@/store";
import { useConfig } from "@/app/config/ConfigContext";
import { useMapState, useTests } from "@/app/data/hooks";
import { useStore } from "@/app/vault/VaultContext";
import { DownloadBanner } from "@/app/model/DownloadBanner";
import { HOME_DOTS } from "./shared";

const QUESTIONS = 8;

function claimsLabel(n: number): string {
  return `${n} claim${n === 1 ? "" : "s"}`;
}

/** The right-hand status pill for one layer: one honest state. */
function statusPill(
  layerId: string,
  cov: LayerCoverage,
): { text: string; solid: boolean } {
  // Facts is a form, not an 8-question layer: it reads Complete once saved.
  if (layerId === "facts") {
    return cov.confirmed > 0
      ? { text: `Complete · ${claimsLabel(cov.confirmed)}`, solid: true }
      : { text: "Not started", solid: false };
  }
  if (cov.status === "complete")
    return { text: `Complete · ${claimsLabel(cov.confirmed)}`, solid: true };
  if (cov.status === "in-progress")
    return {
      text: `In progress · ${Math.min(cov.answered, QUESTIONS)} of ${QUESTIONS}`,
      solid: false,
    };
  return { text: "Not started", solid: false };
}

const FACTS_DESC =
  "Nine quick facts - name, born, languages, work, height, household, places lived, typical day, tastes. No AI needed, so this works while the model downloads.";

/**
 * Map - home, first run and every return. The six layers as the beige
 * staircase, each with one honest state, and a single "YOUR ONE NEXT STEP" card
 * whose Resume button is always the next thing to do. Rows are read-only; you
 * move through the flow with Resume and the top menu. The in-background model
 * download shows its progress here (percent, MB, ETA) without blocking anything.
 */
export function MapScreen() {
  const { claims, answers, draft, loading } = useMapState();
  const { tests } = useTests();
  const { setup, demoMode } = useConfig();
  const store = useStore();
  const [name, setName] = useState("");

  useEffect(() => {
    store.settings
      .get<Record<string, string>>(SETTINGS_KEYS.facts)
      .then((f) => setName(f?.name?.trim() ?? ""));
  }, [store]);

  const score = matchScore(tests);
  const ratedCount = tests.filter((t) => t.rating != null).length;

  const coverage = computeCoverage(claims, answers);

  // First-run guard: a brand-new visitor who opens the app directly (no model
  // chosen, nothing actually started) is sent to the model picker so the "How
  // it runs" step can't be skipped. "Started" is measured by coverage - the
  // same honest notion the Map rows use - so orphan draft claims from earlier
  // testing don't count as progress. A saved interview draft can't exist
  // without a model having been configured, so when `setup` is null it's stale
  // and is ignored here. Returning users and demo browsing stay on the Map.
  const anyStarted = LAYERS.some((l) => coverage[l.id].status !== "not-started");
  if (!loading && !demoMode && !setup && !anyStarted) {
    return <Navigate to="/model" replace />;
  }

  const factsPending = coverage.facts.confirmed === 0;
  const activeLayer = pickInterviewLayer((l) => coverage[l].status);
  // Prefer an exact in-progress draft; else the earliest unfinished layer.
  const resumeId = draft?.layer ?? activeLayer;
  const resumeDef = resumeId ? LAYER_BY_ID[resumeId] : null;

  // The single next step: Facts first (no AI), then the interview layers.
  let next:
    | { def: (typeof LAYERS)[number]; to: string; desc: string }
    | null = null;
  if (factsPending) {
    next = { def: LAYER_BY_ID.facts, to: "/facts", desc: FACTS_DESC };
  } else if (resumeDef) {
    next = {
      def: resumeDef,
      to: "/interview",
      desc: draft
        ? `Pick up where you left off - question ${Math.min(draft.questionsAsked + 1, QUESTIONS)} of ${QUESTIONS}. If the model is still downloading when you get there, you'll see its progress, not a dead end.`
        : `${resumeDef.intro ?? resumeDef.subtitle} If the model is still downloading, you'll see its progress, not a dead end.`,
    };
  }

  const firstName = name.split(/\s+/)[0] ?? "";
  const heading = firstName ? `Welcome back, ${firstName}.` : "Your map.";

  return (
    <main
      className={`flex-1 flex flex-col gap-8 py-[var(--pad-y)] px-[var(--pad-x)] ${HOME_DOTS}`}
    >
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="label-mono">Map - Home · /studio/</span>
          <h1 className="m-0 font-heading text-[clamp(32px,4vw,50px)] leading-[1.04] tracking-[-0.02em]">
            {heading}
          </h1>
          <p className="m-0 max-w-[62ch] text-[15px] leading-[1.55] text-muted">
            This is home - first run and every return. Six layers, one honest
            state each. The one big button below is always your next step.
          </p>
        </div>

        <DownloadBanner />

        {/* YOUR ONE NEXT STEP */}
        <section className="flex flex-col gap-3 p-6 bg-sand-50 border border-sand-300 rounded-panel">
          {next ? (
            <>
              <span className="label-mono">Your one next step</span>
              <h2 className="m-0 font-heading text-[clamp(22px,2.4vw,28px)] font-medium">
                Layer {next.def.num} · {next.def.name}
              </h2>
              <p className="m-0 max-w-[72ch] text-[15px] leading-[1.55] text-muted">
                {next.desc}
              </p>
              <Link
                to={next.to}
                className="mt-2 self-start inline-flex items-center gap-2 min-h-[48px] px-6 rounded-pill bg-ink text-ground no-underline text-[15px] font-medium hover:text-ground hover:opacity-90"
              >
                Resume
                <svg
                  aria-hidden="true"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14" />
                  <path d="M13 6l6 6-6 6" />
                </svg>
              </Link>
            </>
          ) : (
            <>
              <span className="label-mono">Your map is complete</span>
              <h2 className="m-0 font-heading text-[clamp(22px,2.4vw,28px)] font-medium">
                Every layer has claims.
              </h2>
              <p className="m-0 max-w-[72ch] text-[15px] leading-[1.55] text-muted">
                Read, edit, or export your profile - or run a diagnostic test in
                Settings to see how well the model answers like you.
              </p>
              <Link
                to="/profile"
                className="mt-2 self-start inline-flex items-center min-h-[48px] px-6 rounded-pill bg-ink text-ground no-underline text-[15px] font-medium hover:text-ground hover:opacity-90"
              >
                Open profile
              </Link>
            </>
          )}
          {ratedCount >= MATCH_SCORE_MIN_TESTS && score !== null && (
            <span className="label-mono mt-1">
              Match score {score.toFixed(1)} / 5 · last{" "}
              {Math.min(ratedCount, 10)} tests
            </span>
          )}
        </section>

        {/* The staircase */}
        <section aria-label="Layers" className="flex flex-col gap-2.5">
          {LAYERS.map((layer, i) => {
            const cov = coverage[layer.id];
            const marginLeft = `calc(clamp(0px, 2vw, 26px) * ${i})`;

            if (layer.id === "contradictions") {
              return (
                <div
                  key={layer.id}
                  className="flex flex-wrap items-center gap-y-2 gap-x-5 rounded-card border border-dashed py-[18px] px-[22px]"
                  style={{
                    background: `var(${layer.band})`,
                    borderColor: `var(${layer.border})`,
                    marginLeft,
                  }}
                >
                  <LayerBadge num={layer.num} complete={false} muted={layer.muted} />
                  <div className="flex-[1_1_220px] min-w-0 flex flex-col gap-0.5">
                    <span className="font-heading text-[19px] font-medium">
                      {layer.name} · Automatic
                    </span>
                    <span
                      className="text-sm leading-[1.4]"
                      style={{ color: `var(${layer.muted})` }}
                    >
                      No interview here. It fills itself when a new claim
                      conflicts with one you already have.
                    </span>
                  </div>
                  <span
                    className="label-mono rounded-pill px-2.5 py-1 border border-dashed"
                    style={{
                      color: `var(${layer.muted})`,
                      borderColor: `var(${layer.border})`,
                    }}
                  >
                    Auto · {cov.confirmed} found
                  </span>
                </div>
              );
            }

            const complete =
              layer.id === "facts"
                ? cov.confirmed > 0
                : cov.status === "complete";
            const pill = statusPill(layer.id, cov);

            return (
              <div
                key={layer.id}
                className="flex flex-wrap items-center gap-y-2 gap-x-5 rounded-card border py-[18px] px-[22px]"
                style={{
                  background: `var(${layer.band})`,
                  borderColor: `var(${layer.border})`,
                  marginLeft,
                }}
              >
                <LayerBadge
                  num={layer.num}
                  complete={complete}
                  muted={layer.muted}
                />
                <div className="flex-[1_1_220px] min-w-0 flex flex-col gap-0.5">
                  <span className="font-heading text-[19px] font-medium">
                    {layer.name}
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: `var(${layer.muted})` }}
                  >
                    {layer.subtitle}
                  </span>
                </div>
                <span
                  className={`label-mono rounded-pill px-2.5 py-1 ${
                    pill.solid
                      ? "bg-ink text-ground"
                      : "border border-sand-300 text-muted"
                  }`}
                >
                  {pill.text}
                </span>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}

/** The layer's number badge - a filled ink check once the layer has claims. */
function LayerBadge({
  num,
  complete,
  muted,
}: {
  num: string;
  complete: boolean;
  muted: string;
}) {
  if (complete) {
    return (
      <span className="grid place-items-center shrink-0 w-9 h-9 rounded-full bg-ink text-ground">
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="grid place-items-center shrink-0 w-9 h-9 rounded-full border border-sand-300 font-mono text-[13px]"
      style={{ color: `var(${muted})` }}
    >
      {num}
    </span>
  );
}
