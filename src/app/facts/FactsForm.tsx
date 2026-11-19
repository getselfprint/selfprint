import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/app/components/ui";
import { useStore } from "@/app/vault/VaultContext";
import { ChipsInput, YearBoxes } from "./FactInputs";
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

function Labeled({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <span className="label-mono">{label}</span>
      {children}
    </div>
  );
}

/** Two small dots showing which of the two cards you're on. */
function Progress({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {[1, 2].map((n) => (
        <span
          key={n}
          className={`h-1.5 w-6 rounded-pill ${n <= step ? "bg-accent" : "bg-sand-300"}`}
        />
      ))}
    </div>
  );
}

/**
 * The Facts form (layer 01) - a structured, no-AI form, shown as two light
 * cards: the essentials first, then an optional "a bit more". On save it
 * persists the data and regenerates facts-layer claims. Used standalone and in
 * first-run. Inputs are sized to their content (segmented year, chip lists) so
 * it reads as a profile card rather than a long column of rows.
 */
export function FactsForm({
  onDone,
  firstRun,
}: {
  onDone?: () => void;
  firstRun?: boolean;
}) {
  const store = useStore();
  const [data, setData] = useState<FactsData>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

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

  async function skip() {
    await markFactsStepDone(store);
    onDone?.();
  }

  if (!loaded) return <span className="label-mono">Loading…</span>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="label-mono text-accent">
          {step === 1 ? "Essentials" : "A bit more — optional"}
        </span>
        <Progress step={step} />
      </div>

      {step === 1 ? (
        <div className="flex flex-col gap-5">
          <p className="m-0 max-w-[56ch] text-[15px] leading-[1.55] text-muted">
            A few stable facts, as much or as little as you like. No AI touches
            this; it stays on your device and is only read when you export.
            Every field is optional.
          </p>

          <div className="flex flex-wrap gap-x-8 gap-y-5">
            <Labeled label="Name">
              <input
                className={`${FIELD} w-[220px]`}
                placeholder="What you go by"
                value={data.name ?? ""}
                onChange={(e) => set("name", e.target.value)}
              />
            </Labeled>
            <Labeled label="Born">
              <div className="flex items-center gap-2">
                <YearBoxes
                  value={born.year}
                  onChange={(y) => set("born", formatBorn(y, born.place))}
                />
                <input
                  className={`${FIELD} w-[150px]`}
                  placeholder="where"
                  value={born.place}
                  onChange={(e) => set("born", formatBorn(born.year, e.target.value))}
                />
              </div>
            </Labeled>
          </div>

          <Labeled label="Languages">
            <ChipsInput
              value={data.languages ?? ""}
              onChange={(v) => set("languages", v)}
              placeholder="English, Spanish…"
            />
          </Labeled>

          <Labeled label="Work / role">
            <input
              className={`${FIELD} w-full max-w-[360px]`}
              placeholder="What you do"
              value={data.work ?? ""}
              onChange={(e) => set("work", e.target.value)}
            />
          </Labeled>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button onClick={() => setStep(2)}>Continue</Button>
            {firstRun ? (
              <Button variant="ghost" onClick={skip}>
                Skip for now
              </Button>
            ) : (
              <Button variant="ghost" onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-x-8 gap-y-5">
            <Labeled label="Height">
              <input
                className={`${FIELD} w-[130px]`}
                placeholder="178 cm"
                value={data.height ?? ""}
                onChange={(e) => set("height", e.target.value)}
              />
            </Labeled>
            <Labeled label="Household">
              <input
                className={`${FIELD} w-full max-w-[320px]`}
                placeholder="partner, kids, pets"
                value={data.household ?? ""}
                onChange={(e) => set("household", e.target.value)}
              />
            </Labeled>
          </div>

          <Labeled label="Places you've lived">
            <ChipsInput
              value={data.places ?? ""}
              onChange={(v) => set("places", v)}
              placeholder="Cities or countries"
            />
          </Labeled>

          <Labeled label="A typical day">
            <textarea
              rows={2}
              className={`${FIELD} w-full leading-[1.5] resize-none`}
              placeholder="Your usual rhythm"
              value={data.routine ?? ""}
              onChange={(e) => set("routine", e.target.value)}
            />
          </Labeled>

          <Labeled label="Tastes">
            <ChipsInput
              value={data.tastes ?? ""}
              onChange={(v) => set("tastes", v)}
              placeholder="Things you love and can't stand"
            />
          </Labeled>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button onClick={save} disabled={busy}>
              {busy ? "Saving…" : firstRun ? "Save and continue" : "Save facts"}
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)}>
              ← Back
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
