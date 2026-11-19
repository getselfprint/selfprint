import { Link } from "react-router-dom";
import { LAYERS } from "@/engine/layers";
import { type CoverageStatus, computeCoverage } from "@/engine/coverage";
import { pickInterviewLayer } from "@/engine/session";
import { MATCH_SCORE_MIN_TESTS, matchScore } from "@/engine/test";
import { useClaims, useTests } from "@/app/data/hooks";
import { HOME_DOTS } from "./shared";

const STATUS_LABEL: Record<CoverageStatus, string> = {
  complete: "Complete",
  "in-progress": "In progress",
  "not-started": "Not started",
};

/**
 * Map - the six layers as a staircase of bands, darker as they go deeper,
 * with per-layer status and the next session. Faithful to the 01_Map design
 * reference; coverage is sample data until the encrypted store lands.
 */
export function MapScreen() {
  const { claims } = useClaims();
  const { tests } = useTests();
  const score = matchScore(tests);
  const ratedCount = tests.filter((t) => t.rating != null).length;
  const coverage = computeCoverage(claims);
  const active = pickInterviewLayer((l) => coverage[l].status);
  const activeDef = active ? LAYERS.find((l) => l.id === active) : null;

  const completeCount = LAYERS.filter(
    (l) => coverage[l.id].status === "complete",
  ).length;
  const started = claims.length > 0;

  return (
    <main
      className={`flex-1 flex flex-wrap items-center gap-y-12 gap-x-16 py-[var(--pad-y)] px-[var(--pad-x)] ${HOME_DOTS}`}
    >
      <section className="flex-[1_1_340px] min-w-0 flex flex-col gap-6">
        <span className="label-mono">Profile map</span>
        <h1 className="m-0 text-[clamp(34px,4.2vw,54px)] leading-[1.06] tracking-[-0.02em] [text-wrap:balance]">
          A model of you, built one layer at a time.
        </h1>
        <p className="m-0 max-w-[44ch] text-[17px] leading-[1.55] text-muted [text-wrap:pretty]">
          Short interviews turn your answers into claims you can read, edit and
          delete.{" "}
          {started
            ? `${completeCount} ${completeCount === 1 ? "layer is" : "layers are"} done` +
              (activeDef ? `, and ${activeDef.name} is underway.` : ".")
            : "You haven't started yet - the first session takes about ten minutes."}
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/app/interview"
            className="inline-flex items-center gap-2.5 min-h-[48px] px-6 rounded-pill bg-ink text-ground no-underline text-[15px] font-medium hover:text-ground hover:opacity-90"
          >
            <span>{started ? "Continue interview" : "Start interview"}</span>
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
          <Link
            to="/app/profile"
            className="inline-flex items-center min-h-[48px] px-6 rounded-pill border border-sand-300 bg-ground text-ink no-underline text-[15px] font-medium hover:text-ink hover:bg-sand-50"
          >
            Open profile
          </Link>
        </div>

        <div className="flex flex-col gap-1 pt-5 border-t border-sand-300 max-w-[44ch]">
          <span className="label-mono">Next up</span>
          <span className="text-[15px] leading-[1.5]">
            {activeDef
              ? `Layer ${activeDef.num}, ${activeDef.name}. About 10 minutes.`
              : "All layers complete."}
          </span>
          {ratedCount >= MATCH_SCORE_MIN_TESTS && score !== null && (
            <span className="label-mono mt-2">
              Match score {score.toFixed(1)} / 5 · last{" "}
              {Math.min(ratedCount, 10)} tests
            </span>
          )}
        </div>
      </section>

      <section
        aria-label="Layers"
        className="flex-[999_1_520px] min-w-0 flex flex-col gap-2.5"
      >
        {LAYERS.map((layer, i) => {
          const cov = coverage[layer.id];
          const isActive = layer.id === active;
          const percent = Math.round(cov.progress * 100);
          // Complete (or non-interviewable) layers open in Profile; an unfinished
          // interviewable layer opens its interview; Facts opens its form.
          const to =
            cov.status === "complete" || layer.id === "contradictions"
              ? `/app/profile?layer=${layer.id}`
              : layer.id === "facts"
                ? "/app/facts"
                : `/app/interview?layer=${layer.id}`;
          return (
            <Link
              key={layer.id}
              to={to}
              className={`flex flex-wrap items-center gap-y-2 gap-x-5 rounded-card no-underline text-ink hover:text-ink ${
                isActive ? "border-2 py-[17px] px-[21px]" : "border py-[18px] px-[22px]"
              }`}
              style={{
                background: `var(${layer.band})`,
                borderColor: isActive ? "var(--ink)" : `var(${layer.border})`,
                // Staircase: each band steps further right than the last.
                marginLeft: `calc(clamp(0px, 2vw, 26px) * ${i})`,
              }}
            >
              <span
                className="font-mono text-[13px]"
                style={{ color: `var(${layer.muted})` }}
              >
                {layer.num}
              </span>
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
              <div className="flex items-center gap-3">
                <span
                  className="font-mono text-xs"
                  style={{
                    color:
                      cov.status === "not-started"
                        ? `var(${layer.muted})`
                        : "var(--ink)",
                  }}
                >
                  {STATUS_LABEL[cov.status]}
                </span>
                <div
                  aria-hidden="true"
                  className="w-24 h-1 rounded-[2px] bg-[var(--track)] overflow-hidden"
                  title={`${percent}%`}
                >
                  <div
                    className="h-1 rounded-[2px] bg-accent"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
