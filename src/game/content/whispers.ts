// Ossel's whispers: short lines that surface over the water when something is worth noticing.
// Each is said once per lineage, and only while it is still news (early hints are bounded to the
// early game). Conditions are pure functions of the state.

import type { GameState } from '../sim/state.ts';
import {
  calciteHold, cost, currentFeast, idleShoals, raspSettings, moonFull, nextReading, readingsRevealed, smother, untilFullMoon,
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
    id: 'rasp-away', when: (s) => s.rasp > 0 && s.height > 3100 && (() => {
      const b = raspSettings(s);
      return Math.abs(b.forIncome - b.forHold) >= 4;
    })(),
    text: 'Before you leave me for long, send some of the Rasp away. Fewer mouths, and the stone keeps.',
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

/** What Ossel says when you tap it (the Silt Floor, or its wall on the Twilight Shelf), in turn. */
export const OSSEL_LINES: readonly string[] = [
  'Yes, I am still here. Where else would I be?',
  'Grow. Do not look at me like that. Grow.',
  'I was a wall once. A good one. Nothing got through.',
  'The snow is ground stone, you know. Old reefs. Do not eat it.',
  'You glow the way we used to, before the end.',
  'Listen to the silt sometimes. It is mostly us, talking.',
  'When you are tall enough, tell me what the light is like.',
  'I have forgotten things. I know that I have. I do not know which.',
];
