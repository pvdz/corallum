// Ossel's whispers: short lines that surface over the water when something is worth noticing.
// Each is said once per lineage, and only while it is still news (early hints are bounded to the
// early game). Conditions are pure functions of the state.

import type { GameState } from '../sim/state.ts';
import {
  calciteHold, cost, currentFeast, idleShoals, moonFull, nextReading, readingsRevealed, smother, untilFullMoon,
} from '../sim/economy.ts';

export type Whisper = { id: string; when: (s: GameState) => boolean; text: string };

export const WHISPERS: readonly Whisper[] = [
  {
    id: 'two', when: (s) => s.levels.polyp >= 1 && s.levels.polyp <= 3,
    text: 'Good. Now there are two of you eating.',
  },
  {
    id: 'band', when: (s) => s.levels.skeleton >= 1 && s.levels.skeleton <= 3,
    text: 'Feel it harden? That is a day you will not forget.',
  },
  {
    id: 'lure', when: (s) => s.levels.symbiont >= 1 && s.levels.symbiont <= 4,
    text: 'Light draws food. The brighter you burn, the more drifts in.',
  },
  {
    id: 'full', when: (s) => s.calcite > 50 && s.calcite >= 0.95 * calciteHold(s),
    text: 'You are full, little mouth. What you cannot hold, the deep water takes back. Pack the stone tighter.',
  },
  {
    id: 'out-of-reach',
    when: (s) => s.levels.skeleton > 3 && cost(s, 'skeleton') > calciteHold(s) && s.height < 3000,
    text: 'That band is more than you can hold at once. Hold more, or eat faster.',
  },
  {
    id: 'feast', when: (s) => currentFeast(s) !== null,
    text: 'Something is falling past us. Catch it before it sinks into the dark.',
  },
  {
    id: 'idle', when: (s) => idleShoals(s) > 0,
    text: 'Some of the lanternfish are waiting for you to tell them what to do.',
  },
  {
    id: 'listen', when: (s) => readingsRevealed(s) && s.jobs.scout === 0 && !!nextReading(s),
    text: 'Send a shoal down to listen at the silt. The old bands are still talking.',
  },
  {
    id: 'smother', when: (s) => s.silt > 0 && smother(s.silt) < 0.4,
    text: 'The silt is choking your polyps. Let the Rasp graze, or turn the current with sand.',
  },
  {
    id: 'bloom', when: (s) => s.bloom > 1000,
    text: 'Sugar, from light. I never knew. Spend it, and you will be hungry for a while.',
  },
  {
    id: 'moon', when: (s) => s.height >= 3980 && !moonFull(s.t) && untilFullMoon(s.t) < 180,
    text: 'The moon is nearly round. Every reef is holding its breath.',
  },
];
