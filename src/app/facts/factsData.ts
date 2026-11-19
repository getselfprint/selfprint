import type { Claim } from "@/types/model";
import { makeUserClaim } from "@/engine/confidence";
import { type SelfprintStore, SETTINGS_KEYS } from "@/store";

/** Structured Facts (layer 01) - body, history, relationships, tastes, routines. */
export type FactsData = Record<string, string>;

export interface FactField {
  key: string;
  label: string;
  placeholder: string;
  /** Multi-line textarea vs single-line input. */
  long?: boolean;
}

export const FACT_FIELDS: FactField[] = [
  { key: "name", label: "Name", placeholder: "What you go by" },
  { key: "born", label: "Born", placeholder: "Year, and where" },
  { key: "height", label: "Height", placeholder: "e.g. 178 cm" },
  { key: "languages", label: "Languages", placeholder: "English, Spanish…" },
  { key: "places", label: "Places lived", placeholder: "Cities or countries" },
  { key: "work", label: "Work / role", placeholder: "What you do" },
  { key: "household", label: "Household", placeholder: "Who and what you live with - partner, kids, pets" },
  { key: "routine", label: "A typical day", placeholder: "Your usual rhythm", long: true },
  { key: "tastes", label: "Tastes", placeholder: "Things you love and can't stand", long: true },
];

/** Split a stored "Born" value into its year and place parts. */
export function parseBorn(value = ""): { year: string; place: string } {
  const m = value.match(/^\s*(\d{0,4})\s*,?\s*(.*)$/);
  return { year: m?.[1] ?? "", place: (m?.[2] ?? "").trim() };
}

/** Recombine a year and place into one stored "Born" string. */
export function formatBorn(year: string, place: string): string {
  return [year.trim(), place.trim()].filter(Boolean).join(", ");
}

/** Turn the structured form into facts-layer claims (user-stated, no AI). */
export function factsToClaims(data: FactsData): Claim[] {
  return FACT_FIELDS.filter((f) => (data[f.key] ?? "").trim().length > 0).map(
    (f) => {
      // Chip fields are stored newline-delimited; render them comma-joined.
      const value = data[f.key]
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ");
      return makeUserClaim({
        layer: "facts",
        text: `${f.label}: ${value}`,
        evidenceAnswerIds: [],
      });
    },
  );
}

/** Chip fields - stored newline-delimited (so a value may contain a comma). */
const CHIP_FIELDS = ["languages", "places", "tastes"];

export async function loadFacts(store: SelfprintStore): Promise<FactsData> {
  const data = (await store.settings.get<FactsData>(SETTINGS_KEYS.facts)) ?? {};
  // Migrate chip fields saved in the old comma-delimited format (where each
  // value was always a separate chip) to the newline format.
  for (const key of CHIP_FIELDS) {
    const v = data[key];
    if (v && !v.includes("\n") && v.includes(",")) {
      data[key] = v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join("\n");
    }
  }
  return data;
}

/**
 * Persist the form and regenerate the facts-layer claims (the form is the
 * editor; claims are the queryable representation used by Map/Profile/Export).
 */
export async function saveFacts(
  store: SelfprintStore,
  data: FactsData,
): Promise<void> {
  await store.settings.set(SETTINGS_KEYS.facts, data);
  const existing = await store.claims.all();
  for (const c of existing) {
    if (c.layer === "facts") await store.claims.delete(c.id);
  }
  for (const claim of factsToClaims(data)) await store.claims.put(claim);
}

export async function markFactsStepDone(store: SelfprintStore): Promise<void> {
  await store.settings.set(SETTINGS_KEYS.factsStepDone, true);
}
