/** Mirror dimensions and open questions (spec §7). Each scale is a single
 *  behaviour rated 0 (rarely) to 100 (always), so "you" and "someone close"
 *  answer the same thing and the gap is meaningful. */

export interface MirrorScale {
  key: string;
  label: string;
}

export const MIRROR_SCALES: MirrorScale[] = [
  { key: "patience", label: "Patience under stress" },
  { key: "listening", label: "Listens before answering" },
  { key: "admits", label: "Admits mistakes" },
  { key: "generous", label: "Generous with time" },
  { key: "criticism", label: "Handles criticism well" },
  { key: "directness", label: "Says the hard thing" },
];

export const MIRROR_OPEN: string[] = [
  "When are they at their best?",
  "What do they get wrong about themselves?",
  "What do you wish they understood about how they come across?",
];

/** Default scores centre every dimension until moved. */
export function defaultScores(): Record<string, number> {
  return Object.fromEntries(MIRROR_SCALES.map((s) => [s.key, 50]));
}

/** Turn a 0-100 position into a frequency word (rarely … almost always). */
export function freqWord(v: number): string {
  if (v < 15) return "Rarely";
  if (v < 35) return "Not often";
  if (v < 55) return "Sometimes";
  if (v < 75) return "Often";
  return "Almost always";
}
