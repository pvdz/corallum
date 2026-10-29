// Great works: one large thing to build in each of the middle zones, in three stages, each stage
// paid in two currencies at once. Built for good (kept for this reef), and seen in the world.

import type { Currency } from './types.ts';

export type WorkId = 'spire' | 'breakwater' | 'terrace';

export type Work = {
  id: WorkId;
  name: string;
  /** The zone (act) where it can be built; once begun it stays. */
  zone: number;
  flavour: string;
  /** What each stage adds. */
  effect: string;
  /** Price of stage k (0-based): two currencies each. */
  stages: readonly Partial<Record<Currency, number>>[];
  /** Names of the stages, shown as it grows. */
  stageNames: readonly string[];
};

export const WORK_TEXT = { kicker: 'A great work', stage: 'Stage', built: 'Built', build: 'Build' } as const;

export const WORKS: readonly Work[] = [
  {
    id: 'spire', name: 'The lantern spire', zone: 2,
    flavour: 'A tower of stone beside the reef, hung with lamps, so the shoals can see you from twice as far.',
    effect: 'lure +0.5 per stage',
    stages: [{ calcite: 2e6, glow: 2000 }, { calcite: 2e7, glow: 4000 }, { calcite: 2e8, glow: 8000 }],
    stageNames: ['A footing', 'A shaft', 'The lamps'],
  },
  {
    id: 'breakwater', name: 'The breakwater', zone: 3,
    flavour: 'A long arc of stacked stone upslope, so the sliding silt goes round you instead of over.',
    effect: 'silt falls ×0.85 per stage',
    stages: [{ calcite: 5e8, sand: 10000 }, { calcite: 5e9, sand: 40000 }, { calcite: 5e10, sand: 160000 }],
    stageNames: ['A first course', 'A long arc', 'The crest'],
  },
  {
    id: 'terrace', name: 'The sun terrace', zone: 4,
    flavour: 'Flat steps of sand-set stone around your foot, where the light lies longest.',
    effect: 'bloom ×1.15 per stage',
    stages: [{ bloom: 1e5, sand: 50000 }, { bloom: 1e6, sand: 150000 }, { bloom: 1e7, sand: 400000 }],
    stageNames: ['One step', 'Three steps', 'The terrace'],
  },
];
