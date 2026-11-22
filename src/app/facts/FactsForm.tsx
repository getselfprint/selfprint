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

// Base has no width so fields can set their own (the Born row mixes a fixed
// year box with a flexible place input); FIELD adds w-full for the common case.
const FIELD_BASE =
  "border border-sand-300 rounded-[10px] px-3.5 py-2.5 bg-ground text-ink text-base placeholder:text-muted focus:border-accent focus:outline-none";
const FIELD = `w-full ${FIELD_BASE}`;

/** A label + field cell in the two-column form grid. */
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
 * The Facts form (Layer 01). A calm profile card of content-sized inputs in a
 * two-column grid. Used two ways:
 *  - `paged` (inside the interview shell): one group per page - "the basics",
 *    then an optional "a bit more" - navigated with Continue / Back, matching
 *    the other layers' step rhythm. The current page is controlled by `step` /
 *    `onStep` so the shell can show progress.
 *  - single page (the standalone editor at /facts): everything at once.
 * Saving persists the data and regenerates the facts-layer claims (the form is
 * the editor; claims are the queryable representation).
 */
export function FactsForm({
  onDone,
  paged = false,
  step = 1,
  onStep,
}: {
  onDone?: () => void;
  paged?: boolean;
  step?: 1 | 2;
  onStep?: (step: 1 | 2) => void;
}) {
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

  const basics = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
      <Field label="Name">
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
            className={`${FIELD_BASE} w-[84px] shrink-0 text-center`}
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
            className={`${FIELD_BASE} flex-1 min-w-0`}
            placeholder="where"
            value={born.place}
            onChange={(e) => set("born", formatBorn(born.year, e.target.value))}
          />
        </div>
      </Field>
      <Field label="Height">
        <input
          className={FIELD}
          placeholder="e.g. 178 cm"
          value={data.height ?? ""}
          onChange={(e) => set("height", e.target.value)}
        />
      </Field>
      <Field label="Work / role">
        <input
          className={FIELD}
          placeholder="What you do"
          value={data.work ?? ""}
          onChange={(e) => set("work", e.target.value)}
        />
      </Field>
      <Field label="Languages" className="sm:col-span-2">
        <ChipsInput
          value={data.languages ?? ""}
          onChange={(v) => set("languages", v)}
          placeholder="Add one language at a time…"
        />
      </Field>
    </div>
  );

  const optional = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
      <Field label="Household">
        <input
          className={FIELD}
          placeholder="Who you live with - partner, kids, pets"
          value={data.household ?? ""}
          onChange={(e) => set("household", e.target.value)}
        />
      </Field>
      <Field label="Places lived">
        <ChipsInput
          value={data.places ?? ""}
          onChange={(v) => set("places", v)}
          placeholder="Add one place at a time…"
        />
      </Field>
      <Field label="A typical day" className="sm:col-span-2">
        <textarea
          rows={2}
          className={`${FIELD} leading-[1.5] resize-none`}
          placeholder="Your usual rhythm"
          value={data.routine ?? ""}
          onChange={(e) => set("routine", e.target.value)}
        />
      </Field>
      <Field label="Tastes" className="sm:col-span-2">
        <ChipsInput
          value={data.tastes ?? ""}
          onChange={(v) => set("tastes", v)}
          placeholder="Add one at a time - things you love or can't stand"
        />
      </Field>
    </div>
  );

  const note = (
    <span className="text-sm text-muted">
      Each field you fill becomes one stated claim in your profile.
    </span>
  );

  // Paged: one group per page, navigated like the other layers.
  if (paged) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-panel border border-sand-300 bg-sand-50 p-6 sm:p-7">
          {step === 1 ? basics : optional}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          {note}
          <div className="flex gap-3">
            {step === 2 && (
              <Button variant="ghost" onClick={() => onStep?.(1)}>
                ← Back
              </Button>
            )}
            {step === 1 ? (
              <Button onClick={() => onStep?.(2)}>Continue →</Button>
            ) : (
              <Button onClick={save} disabled={busy}>
                {busy ? "Saving…" : "Save facts"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Single page: the standalone editor.
  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-panel border border-sand-300 bg-sand-50 p-6 sm:p-7 flex flex-col gap-7">
        {basics}
        <div className="pt-6 border-t border-sand-200 flex flex-col gap-5">
          <span className="label-mono">A bit more - optional</span>
          {optional}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {note}
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save facts"}
        </Button>
      </div>
    </div>
  );
}
