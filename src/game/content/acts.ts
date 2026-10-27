// The five acts as depth zones of the sea. Reef height is how far the reef has climbed the
// seamount; depth = SURFACE - height.

export const SURFACE = 4000;

export type ActDef = { n: number; name: string; from: number; to: number; blurb: string };

export const ACTS: readonly ActDef[] = [
  { n: 1, name: 'The Silt Floor', from: 0, to: 60, blurb: 'Grow faster than the silt falls.' },
  { n: 2, name: 'The Midnight Water', from: 60, to: 3000, blurb: 'The dark is full of eyes, and some of them are friendly.' },
  { n: 3, name: 'The Twilight Shelf', from: 3000, to: 3800, blurb: 'Currents, and the beaked ones.' },
  { n: 4, name: 'The Sunlit Crown', from: 3800, to: 3980, blurb: 'Colour.' },
  { n: 5, name: 'The Breach', from: 3980, to: 4000, blurb: 'The Spawning Moon.' },
];

/** Index (1-based act number) of the zone a given reef height is in. */
export function actAt(height: number): number {
  for (let i = ACTS.length - 1; i >= 0; i--) if (height >= ACTS[i]!.from) return ACTS[i]!.n;
  return 1;
}

export function act(n: number): ActDef {
  return ACTS[Math.max(0, Math.min(ACTS.length - 1, n - 1))]!;
}

/** The furthest act that has content so far; height beyond its end is still allowed. */
export const LAST_PLAYABLE_ACT = 5;
