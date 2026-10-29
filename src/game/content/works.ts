// Great works: large things to build in each zone (two in the long Midnight Water), in three stages, each stage
// paid in two currencies at once. Built for good (kept for this reef), and seen in the world.

import type { Currency } from './types.ts';

export type WorkId = 'garden' | 'fence' | 'spire' | 'dome' | 'breakwater' | 'lawn' | 'terrace' | 'rim' | 'pool' | 'beacon';

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
    id: 'fence', name: 'The snow fence', zone: 1, from: 40,
    flavour: 'A low wall of stacked stones upcurrent of you, so the snow piles against it and not against your foot.',
    effect: 'calcite dissolves ×0.95 per stage',
    stages: [{ calcite: 2000, glow: 100 }, { calcite: 15000, glow: 250 }, { calcite: 80000, glow: 500 }],
    stageNames: ['A few stones', 'A low wall', 'The fence'],
  },
  {
    id: 'spire', name: 'The lantern spire', zone: 2, from: 300,
    flavour: 'A tower of stone beside the reef, hung with lamps, so the shoals can see you from twice as far.',
    effect: 'lure +0.5 per stage',
    stages: [{ calcite: 2e6, glow: 1500 }, { calcite: 2e7, glow: 3000 }, { calcite: 2e8, glow: 6000 }],
    stageNames: ['A footing', 'A shaft', 'The lamps'],
  },
  {
    id: 'dome', name: 'The listening dome', zone: 2, from: 1500,
    flavour: 'A thin shell of stone over the ground where the scouts listen, so every murmur of the buried bands rings twice.',
    effect: 'scouts hear ×1.25 per stage',
    stages: [{ calcite: 5e7, glow: 3000 }, { calcite: 5e8, glow: 6000 }, { calcite: 5e9, glow: 12000 }],
    stageNames: ['A ring of stones', 'Half a shell', 'The dome'],
  },
  {
    id: 'breakwater', name: 'The breakwater', zone: 3, from: 3100,
    flavour: 'A long arc of stacked stone upslope, so the sliding silt goes round you instead of over.',
    effect: 'silt falls ×0.85 per stage',
    stages: [{ calcite: 5e8, sand: 10000 }, { calcite: 5e9, sand: 30000 }, { calcite: 5e10, sand: 80000 }],
    stageNames: ['A first course', 'A long arc', 'The crest'],
  },
  {
    id: 'lawn', name: 'The grazing lawn', zone: 3, from: 3400,
    flavour: 'A flat of old stone downslope, left dead on purpose and kept clear, where the Rasp can graze without touching you.',
    effect: 'sand ×1.15 per stage',
    stages: [{ calcite: 2e9, sand: 20000 }, { calcite: 2e10, sand: 50000 }, { calcite: 2e11, sand: 120000 }],
    stageNames: ['A clearing', 'A meadow of stone', 'The lawn'],
  },
  {
    id: 'terrace', name: 'The sun terrace', zone: 4, from: 3820,
    flavour: 'Flat steps of sand-set stone around your foot, where the light lies longest.',
    effect: 'bloom ×1.15 per stage',
    stages: [{ bloom: 1e5, sand: 30000 }, { bloom: 1e6, sand: 80000 }, { bloom: 1e7, sand: 160000 }],
    stageNames: ['One step', 'Three steps', 'The terrace'],
  },
  {
    id: 'rim', name: 'The lagoon rim', zone: 4, from: 3900,
    flavour: 'A low ring of stone around a stretch of sand, so the water inside lies still and warm, the way spawn likes it.',
    effect: 'spawn ×1.1 per stage (when it ripens)',
    stages: [{ bloom: 2e6, sand: 100000 }, { bloom: 6e6, sand: 200000 }, { bloom: 2e7, sand: 400000 }],
    stageNames: ['A curve of stones', 'Half a ring', 'The rim'],
  },
  {
    id: 'pool', name: 'The spawning pool', zone: 5, from: 3982,
    flavour: 'A rim of stone just under the surface, where the spawn can ripen in still, warm water.',
    effect: 'spawn ×1.15 per stage',
    stages: [{ calcite: 1e12, bloom: 1e7 }, { calcite: 1e13, bloom: 3e7 }, { calcite: 1e14, bloom: 1e8 }],
    stageNames: ['A rim', 'A basin', 'The pool'],
  },
  {
    id: 'beacon', name: 'The beacon', zone: 5, from: 3985,
    flavour: 'A slim spire of stone above the water, its tip crusted with glimmerseed, so the spawn knows where home was.',
    effect: 'spawn fades ×0.9 per stage',
    stages: [{ calcite: 3e12, bloom: 3e7 }, { calcite: 3e13, bloom: 6e7 }, { calcite: 3e14, bloom: 1.2e8 }],
    stageNames: ['A footing in the air', 'A spire', 'The light'],
  },
];
