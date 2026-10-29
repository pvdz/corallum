// Great works: one large thing to build in each of the middle zones, in three stages, each stage
// paid in two currencies at once. Built for good (kept for this reef), and seen in the world.

import type { Currency } from './types.ts';

export type WorkId = 'garden' | 'spire' | 'breakwater' | 'terrace' | 'pool';

export type Work = {
  id: WorkId;
  name: string;
  /** The zone (act) where it can be built, from this height on; once begun it stays. */
  zone: number;
  from: number;
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
    id: 'garden', name: 'The vent garden', zone: 1, from: 30,
    flavour: 'Small chimneys coaxed up around the old vent, each one a little warm water of your own.',
    effect: 'calcite ×1.05 per stage',
    stages: [{ calcite: 400, glow: 40 }, { calcite: 4000, glow: 150 }, { calcite: 40000, glow: 400 }],
    stageNames: ['One chimney', 'A ring', 'The garden'],
  },
  {
    id: 'spire', name: 'The lantern spire', zone: 2, from: 300,
    flavour: 'A tower of stone beside the reef, hung with lamps, so the shoals can see you from twice as far.',
    effect: 'lure +0.5 per stage',
    stages: [{ calcite: 2e6, glow: 1500 }, { calcite: 2e7, glow: 3000 }, { calcite: 2e8, glow: 6000 }],
    stageNames: ['A footing', 'A shaft', 'The lamps'],
  },
  {
    id: 'breakwater', name: 'The breakwater', zone: 3, from: 3100,
    flavour: 'A long arc of stacked stone upslope, so the sliding silt goes round you instead of over.',
    effect: 'silt falls ×0.85 per stage',
    stages: [{ calcite: 5e8, sand: 10000 }, { calcite: 5e9, sand: 30000 }, { calcite: 5e10, sand: 80000 }],
    stageNames: ['A first course', 'A long arc', 'The crest'],
  },
  {
    id: 'terrace', name: 'The sun terrace', zone: 4, from: 3820,
    flavour: 'Flat steps of sand-set stone around your foot, where the light lies longest.',
    effect: 'bloom ×1.15 per stage',
    stages: [{ bloom: 1e5, sand: 30000 }, { bloom: 1e6, sand: 80000 }, { bloom: 1e7, sand: 160000 }],
    stageNames: ['One step', 'Three steps', 'The terrace'],
  },
  {
    id: 'pool', name: 'The spawning pool', zone: 5, from: 3982,
    flavour: 'A rim of stone just under the surface, where the spawn can ripen in still, warm water.',
    effect: 'spawn ×1.15 per stage',
    stages: [{ calcite: 1e12, bloom: 1e7 }, { calcite: 1e13, bloom: 3e7 }, { calcite: 1e14, bloom: 1e8 }],
    stageNames: ['A rim', 'A basin', 'The pool'],
  },
];
