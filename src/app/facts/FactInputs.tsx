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
 * A chip list backed by a comma-separated string. Type a word and press Enter
 * (or comma) to add a pill; click a pill's ✕ to remove it.
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

  function commit() {
    const t = draftRef.current?.value.trim() ?? "";
    if (t && !items.some((x) => x.toLowerCase() === t.toLowerCase()))
      onChange([...items, t].join("\n"));
    if (draftRef.current) draftRef.current.value = "";
  }

  function remove(i: number) {
    onChange(items.filter((_, j) => j !== i).join("\n"));
  }

  return (
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
      <input
        ref={draftRef}
        placeholder={items.length ? "add another" : placeholder}
        className="min-w-[8rem] flex-1 border border-dashed border-sand-300 rounded-pill px-3.5 py-2.5 text-base bg-ground text-ink placeholder:text-muted focus:border-accent focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}
