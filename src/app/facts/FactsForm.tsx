import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/app/components/ui";
import { useStore } from "@/app/vault/VaultContext";
import { ChipsInput } from "./FactInputs";
import {
  type FactsData,
  formatBorn,
  loadFacts,
  markFactsStepDone,
  parseBorn,
  saveFacts,
} from "./factsData";

const FIELD =
  "border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base placeholder:text-muted focus:border-accent focus:outline-none";

/** A label + field, sized to its content (not stretched full width). */
function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="label-mono text-muted">{label}</span>
      {children}
    </label>
  );
}

/**
 * The Facts form (Layer 01) - a calm, compact profile card rather than a long
 * numbered questionnaire. Related facts are grouped (the basics, then an
 * optional "a bit more") and packed several to a row with content-sized inputs.
 * Chip fields take one item at a time and never split on a comma. Saving
 * persists the data and regenerates the facts-layer claims (the form is the
 * editor; claims are the queryable representation).
 */
export function FactsForm({ onDone }: { onDone?: () => void }) {
  const store = useStore();
  const [data, setData] = useState<FactsData>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadFacts(store).then((d) => {
      setData(d);
      setLoaded(true);
    });
  }, [store]);

  const set = (key: string, value: string) =>
    setData((d) => ({ ...d, [key]: value }));
  const born = parseBorn(data.born);

  async function save() {
    setBusy(true);
    await saveFacts(store, data);
    await markFactsStepDone(store);
    setBusy(false);
    onDone?.();
  }

  if (!loaded) return <span className="label-mono">Loading…</span>;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-panel border border-sand-300 bg-sand-50 p-6 sm:p-7 flex flex-col gap-7">
        {/* The basics */}
        <div className="flex flex-wrap gap-x-8 gap-y-5">
          <Field label="Name" className="w-[220px]">
            <input
              className={FIELD}
              placeholder="What you go by"
              value={data.name ?? ""}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>

          <Field label="Born">
            <div className="flex items-center gap-2">
              <input
                className={`${FIELD} w-[84px] text-center`}
                inputMode="numeric"
                maxLength={4}
                placeholder="Year"
                value={born.year}
                onChange={(e) =>
                  set(
                    "born",
                    formatBorn(
                      e.target.value.replace(/\D/g, "").slice(0, 4),
                      born.place,
                    ),
                  )
                }
              />
              <input
                className={`${FIELD} w-[170px]`}
                placeholder="where"
                value={born.place}
                onChange={(e) => set("born", formatBorn(born.year, e.target.value))}
              />
            </div>
          </Field>

          <Field label="Height" className="w-[130px]">
            <input
              className={FIELD}
              placeholder="e.g. 178 cm"
              value={data.height ?? ""}
              onChange={(e) => set("height", e.target.value)}
            />
          </Field>

          <Field label="Work / role" className="w-full max-w-[440px]">
            <input
              className={FIELD}
              placeholder="What you do"
              value={data.work ?? ""}
              onChange={(e) => set("work", e.target.value)}
            />
          </Field>

          <Field label="Languages" className="w-full">
            <ChipsInput
              value={data.languages ?? ""}
              onChange={(v) => set("languages", v)}
              placeholder="Add one language at a time…"
            />
          </Field>
        </div>

        {/* A bit more - optional */}
        <div className="flex flex-col gap-5 pt-6 border-t border-sand-200">
          <span className="label-mono">A bit more - optional</span>

          <div className="flex flex-wrap gap-x-8 gap-y-5">
            <Field label="Household" className="w-full max-w-[440px]">
              <input
                className={FIELD}
                placeholder="Who you live with - partner, kids, pets"
                value={data.household ?? ""}
                onChange={(e) => set("household", e.target.value)}
              />
            </Field>

            <Field label="Places lived" className="w-full">
              <ChipsInput
                value={data.places ?? ""}
                onChange={(v) => set("places", v)}
                placeholder="Add one place at a time…"
              />
            </Field>

            <Field label="A typical day" className="w-full">
              <textarea
                rows={2}
                className={`${FIELD} w-full leading-[1.5] resize-none`}
                placeholder="Your usual rhythm"
                value={data.routine ?? ""}
                onChange={(e) => set("routine", e.target.value)}
              />
            </Field>

            <Field label="Tastes" className="w-full">
              <ChipsInput
                value={data.tastes ?? ""}
                onChange={(v) => set("tastes", v)}
                placeholder="Add one at a time - things you love or can't stand"
              />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted">
          Each field you fill becomes one stated claim in your profile.
        </span>
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save facts"}
        </Button>
      </div>
    </div>
  );
}
