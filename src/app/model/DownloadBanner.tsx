import type { ReactNode } from "react";
import { etaLabel, modelShortLabel, useDownload } from "./DownloadContext";

/**
 * The honest in-background download card (spec: percent, MB, ETA on the Map,
 * Facts and Interview screens). Renders nothing unless an in-browser model is
 * actually downloading or has failed - hosted models have no download.
 */
export function DownloadBanner({ note }: { note?: ReactNode }) {
  const { state, retry } = useDownload();

  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-3 p-5 bg-sand-50 border border-sand-300 rounded-panel">
        <div className="flex flex-col gap-1">
          <span className="font-heading text-[17px] font-medium">
            The in-browser model didn't finish downloading
          </span>
          <p className="m-0 text-sm text-accent leading-[1.5]">{state.message}</p>
        </div>
        <button
          type="button"
          onClick={retry}
          className="self-start inline-flex items-center min-h-[40px] px-5 rounded-pill bg-ink text-ground text-sm font-medium"
        >
          Retry download
        </button>
      </div>
    );
  }

  if (state.kind !== "downloading") return null;

  const pct = Math.round(state.pct * 100);
  const mb =
    state.mbDone != null && state.mbTotal != null
      ? `${Math.round(state.mbDone)} MB of ${state.mbTotal} MB`
      : state.mbDone != null
        ? `${Math.round(state.mbDone)} MB`
        : "starting…";

  return (
    <div className="flex flex-col gap-3 p-5 bg-sand-50 border border-sand-300 rounded-panel">
      <div className="flex items-center justify-between gap-4">
        <span className="font-heading text-[17px] font-medium">
          Model downloading in the background
        </span>
        <span className="font-mono text-sm tabular-nums">{pct}%</span>
      </div>

      <div
        aria-hidden="true"
        className="w-full h-2 rounded-pill bg-[var(--track)] overflow-hidden"
      >
        <div
          className="h-2 rounded-pill bg-ink transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 font-mono text-xs text-muted">
        <span>{mb}</span>
        <span>
          {pct < 100 ? etaLabel(state.etaSec) : "finishing…"} ·{" "}
          {modelShortLabel(state.model)} · In this browser
        </span>
      </div>

      {note !== null && (
        <p className="m-0 text-sm text-muted leading-[1.5] [text-wrap:pretty]">
          {note ?? (
            <>
              You don't need to wait. <strong>Facts need no AI</strong> - do
              Layer 01 now. The model only needs to be ready by Layer 02.
            </>
          )}
        </p>
      )}
    </div>
  );
}
