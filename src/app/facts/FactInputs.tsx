import { useRef } from "react";

/**
 * Right-sized inputs for the Facts card. These keep the structured-facts data
 * model (plain strings) but present it in friendlier shapes: a segmented year,
 * and chip lists for comma-separated values.
 */

const BOX =
  "w-11 h-12 text-center font-heading text-[22px] border border-sand-300 rounded-[10px] bg-ground text-ink focus:border-accent focus:outline-none";

/** Four digit boxes for a birth year, auto-advancing like a verification code. */
export function YearBoxes({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const slots = Array.from({ length: 4 }, (_, i) => value[i] ?? "");

  function set(i: number, raw: string) {
    const c = raw.replace(/\D/g, "").slice(-1);
    const next = [...slots];
    next[i] = c;
    onChange(next.join(""));
    if (c && i < 3) refs.current[i + 1]?.focus();
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Birth year">
      {slots.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Year digit ${i + 1}`}
          className={BOX}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !slots[i] && i > 0)
              refs.current[i - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}

/**
 * A chip list backed by a newline-delimited string. One item at a time: type a
 * value and press Enter or click "+ Add" (a comma is kept as part of the value,
 * never a silent split - "Portland, Oregon" is one chip). Click a pill's ✕ to
 * remove it.
 */
export function ChipsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const draftRef = useRef<HTMLInputElement>(null);
  // Newline-delimited so a value can contain a comma ("Portland, Oregon").
  const items = value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // `refocus` keeps the cursor in the box after Enter / "+ Add" so you can type
  // the next item. On blur we must NOT refocus - that would trap focus in the
  // chip field and stop you ever clicking into another input.
  function commit(refocus = false) {
    const t = draftRef.current?.value.trim() ?? "";
    if (t && !items.some((x) => x.toLowerCase() === t.toLowerCase()))
      onChange([...items, t].join("\n"));
    if (draftRef.current) {
      draftRef.current.value = "";
      if (refocus) draftRef.current.focus();
    }
  }

  function remove(i: number) {
    onChange(items.filter((_, j) => j !== i).join("\n"));
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {items.map((it, i) => (
            <span
              key={it}
              className="inline-flex items-center gap-2 border border-sand-300 bg-sand-50 rounded-pill pl-3.5 pr-2.5 py-2 text-sm"
            >
              {it}
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${it}`}
                className="text-muted text-xs leading-none hover:text-ink"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          ref={draftRef}
          placeholder={placeholder ?? "Add one at a time…"}
          className="flex-1 min-w-0 border border-sand-300 rounded-[10px] px-3.5 py-2.5 text-base bg-ground text-ink placeholder:text-muted focus:border-accent focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit(true);
            }
          }}
          onBlur={() => commit(false)}
        />
        <button
          type="button"
          onClick={() => commit(true)}
          className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-pill border border-sand-300 bg-ground text-ink text-sm font-medium hover:bg-sand-100"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
