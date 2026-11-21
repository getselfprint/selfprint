import { useNavigate } from "react-router-dom";
import { DownloadBanner } from "@/app/model/DownloadBanner";
import { DOTS } from "@/app/screens/shared";
import { FactsForm } from "./FactsForm";

/**
 * Facts (Layer 01) at /studio/facts - the old Basics form, now a Map layer
 * rather than a setup step. Two panes (context left, form right) so the form
 * fills the width instead of hugging the left edge; it needs no AI, so it works
 * while the model downloads. Saving returns to the Map with Layer 01 complete.
 */
export function FactsScreen() {
  const navigate = useNavigate();
  return (
    <main className={`flex-1 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}>
      <div className="w-full flex flex-wrap items-start gap-x-16 gap-y-8">
        {/* Left: context */}
        <section className="flex-[1_1_300px] max-w-[400px] flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="label-mono">Layer 01 · Facts · /studio/facts</span>
            <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,42px)] tracking-[-0.02em]">
              Facts
            </h1>
            <p className="m-0 text-[15px] leading-[1.6] text-muted">
              A few quick facts about you, typed by you - fill what you like.
              This is <strong className="text-ink">Layer 01 on the Map</strong>,
              not a setup step; it needs <strong className="text-ink">no AI</strong>,
              so it works while the model is still downloading. Each one becomes
              a <strong className="text-ink">Stated claim</strong> in your
              Profile.
            </p>
          </div>
          <DownloadBanner note="No need to wait - this screen doesn't use the model at all." />
        </section>

        {/* Right: the form */}
        <section className="flex-[2_1_520px] min-w-0">
          <FactsForm onDone={() => navigate("/")} />
        </section>
      </div>
    </main>
  );
}
