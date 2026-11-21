import { useNavigate } from "react-router-dom";
import { DownloadBanner } from "@/app/model/DownloadBanner";
import { DOTS } from "@/app/screens/shared";
import { FactsForm } from "./FactsForm";

/**
 * Facts (Layer 01) at /studio/facts - the old Basics form, now a Map layer rather
 * than a setup step. It needs no AI, so it works while the model downloads
 * (hence the progress banner). Saving returns to the Map with Layer 01 complete.
 */
export function FactsScreen() {
  const navigate = useNavigate();
  return (
    <main
      className={`flex-1 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
    >
      <div className="w-full flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="label-mono">Layer 01 · Facts · /studio/facts</span>
          <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,42px)] tracking-[-0.02em]">
            Facts
          </h1>
          <p className="m-0 max-w-[72ch] text-[15px] leading-[1.6] text-muted">
            Nine quick facts, typed by you. This is{" "}
            <strong className="text-ink">Layer 01 on the Map</strong> - not a
            setup step. It needs <strong className="text-ink">no AI</strong>, so
            it works while the model is still downloading. Saving creates your{" "}
            <strong className="text-ink">Stated claims</strong> in your Profile.
          </p>
        </div>

        <DownloadBanner note="No need to wait - this screen doesn't use the model at all." />

        <FactsForm onDone={() => navigate("/")} />
      </div>
    </main>
  );
}
