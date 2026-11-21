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

type Kind = "text" | "born" | "chips" | "textarea";

/** The nine facts, in the order shown on the screen; numbering follows this. */
const DISPLAY: {
  key: string;
  label: string;
  kind: Kind;
  full?: boolean;
  placeholder?: string;
}[] = [
  { key: "name", label: "Name", kind: "text", placeholder: "What you go by" },
  { key: "born", label: "Born", kind: "born" },
  {
    key: "languages",
    label: "Languages",
    kind: "chips",
    full: true,
    placeholder: "Add one language at a time…",
  },
  { key: "work", label: "Work / role", kind: "text", placeholder: "What you do" },
  { key: "height", label: "Height", kind: "text", placeholder: "178 cm · 5'10\"" },
  {
    key: "household",
    label: "Household",
    kind: "text",
    full: true,
    placeholder: "Who and what you live with - partner, kids, pets",
  },
  {
    key: "places",
    label: "Places lived",
    kind: "chips",
    full: true,
    placeholder: "Add one place at a time…",
  },
  {
    key: "routine",
    label: "A typical day",
    kind: "textarea",
    full: true,
    placeholder: "Your usual rhythm",
  },
  {
    key: "tastes",
    label: "Tastes",
    kind: "chips",
    full: true,
    placeholder: "Add one at a time - things you love or can't stand",
  },
];

function Card({
  n,
  label,
  full,
  children,
}: {
  n: number;
  label: string;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-card border border-sand-300 bg-ground p-4 flex flex-col gap-2.5 ${
        full ? "sm:col-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="label-mono">
          {n} · {label}
        </span>
        <span className="label-mono text-muted">Stated claim {n}</span>
      </div>
      {children}
    </div>
  );
}

/**
 * The Facts form (Layer 01) - a single page of nine numbered, no-AI fields, each
 * one Stated claim. Chip fields take one item at a time and never split on a
 * comma. On save it persists the data and regenerates the facts-layer claims
 * (the form is the editor; claims are the queryable representation).
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {DISPLAY.map((f, i) => (
          <Card key={f.key} n={i + 1} label={f.label} full={f.full}>
            {f.kind === "text" && (
              <input
                className={`${FIELD} w-full`}
                placeholder={f.placeholder}
                value={data[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
            {f.kind === "born" && (
              <div className="flex items-center gap-2 flex-wrap">
                <YearBoxes
                  value={born.year}
                  onChange={(y) => set("born", formatBorn(y, born.place))}
                />
                <input
                  className={`${FIELD} flex-1 min-w-[130px]`}
                  placeholder="where"
                  value={born.place}
                  onChange={(e) =>
                    set("born", formatBorn(born.year, e.target.value))
                  }
                />
              </div>
            )}
            {f.kind === "chips" && (
              <ChipsInput
                value={data[f.key] ?? ""}
                onChange={(v) => set(f.key, v)}
                placeholder={f.placeholder}
              />
            )}
            {f.kind === "textarea" && (
              <textarea
                rows={2}
                className={`${FIELD} w-full leading-[1.5] resize-none`}
                placeholder={f.placeholder}
                value={data[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
              />
            )}
          </Card>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save facts"}
        </Button>
      </div>
    </div>
  );
}
