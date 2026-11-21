import { useNavigate } from "react-router-dom";
import { DownloadBanner } from "@/app/model/DownloadBanner";
import { DOTS } from "@/app/screens/shared";
import { FactsForm } from "./FactsForm";

/**
 * The standalone Facts editor at /studio/facts. Facts (Layer 01) are now filled
 * inside the interview shell on a fresh run; this page is the later editor,
 * reached from Profile/Settings "Edit facts". Two panes (context left, form
 * right). No AI; each field is a Stated claim.
 */
export function FactsScreen() {
  const navigate = useNavigate();
  return (
    <main className={`flex-1 py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}>
      <div className="w-full flex flex-wrap items-start gap-x-16 gap-y-8">
        {/* Left: context */}
        <section className="flex-[1_1_300px] max-w-[400px] flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,42px)] tracking-[-0.02em]">
              Facts
            </h1>
            <p className="m-0 text-[15px] leading-[1.6] text-muted">
              Your stated facts about you - edit them any time. No AI touches
              this; each field you fill is a{" "}
              <strong className="text-ink">Stated claim</strong> in your Profile.
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
