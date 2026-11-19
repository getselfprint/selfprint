import { useNavigate } from "react-router-dom";
import { DOTS } from "@/app/screens/shared";
import { FactsForm } from "./FactsForm";

/** Standalone Facts screen at /app/facts. */
export function FactsScreen() {
  const navigate = useNavigate();
  return (
    <main
      className={`flex-1 flex justify-center py-[var(--pad-y)] px-[var(--pad-x)] ${DOTS}`}
    >
      <div className="w-full max-w-[640px] flex flex-col gap-4">
        <h1 className="m-0 font-heading text-[clamp(28px,3.4vw,40px)] tracking-[-0.02em]">
          The basics
        </h1>
        <FactsForm onDone={() => navigate("/app")} />
      </div>
    </main>
  );
}
