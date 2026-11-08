// The night sky over the Breach: no reef has ever seen stars, so this one names them after its own
// life. Each figure opens once the run has the thing it is named for, and is traced star by star.

import type { GameState } from '../sim/state.ts';

export type FigureId = 'cup' | 'beak' | 'sister' | 'whale' | 'sleeper' | 'lamp';

export type Figure = {
  id: FigureId;
  name: string;
  /** Said when it is named. */
  text: string;
  /** What has to have happened in this run first (shown while it is still a patch of stars). */
  hint: string;
  when: (s: GameState) => boolean;
  /** Stars in tap order, in a unit box; each is joined to the one before. */
  stars: readonly (readonly [number, number])[];
  /** The last star is joined back to this one as well. */
  close?: number;
  /** Where in the sky (centre: share of the scene's width, share of the sky's height) and how big. */
  at: readonly [number, number];
  size: readonly [number, number];
};

export const FIGURES: readonly Figure[] = [
  {
    id: 'cup', name: 'Ossel’s Cup', hint: 'always there',
    text: 'A mouth and its tentacles, open to the sky. It is not that good a likeness, and you name it anyway.',
    when: () => true,
    stars: [[0.3, 1], [0.15, 0.45], [0, 0], [0.5, 0.3], [1, 0], [0.85, 0.45], [0.7, 1]],
    at: [0.12, 0.64], size: [0.12, 0.45],
  },
  {
    id: 'beak', name: 'The Beak', hint: 'once the Rasp have been met',
    text: 'A hooked beak, grinding at the dark. The Rasp would be proud, if anyone told them.',
    when: (s) => s.truce.terms !== '',
    stars: [[0, 0.5], [0.45, 0.1], [0.9, 0.35], [1, 0.8], [0.6, 0.55], [0.1, 0.7]],
    at: [0.32, 0.3], size: [0.12, 0.4],
  },
  {
    id: 'sister', name: 'The Two Branches', hint: 'once the sister reef has been raced',
    text: 'Two branches from one root, reaching away from each other. Neither is the trunk.',
    when: (s) => s.race.decided > 0,
    stars: [[0.1, 0], [0.3, 0.45], [0.5, 1], [0.7, 0.45], [0.9, 0]],
    at: [0.52, 0.28], size: [0.1, 0.4],
  },
  {
    id: 'whale', name: 'The Falling Whale', hint: 'once a whale has come down',
    text: 'A whale, sinking slowly through the stars, the way it sank past you once.',
    when: (s) => s.moments['whale-fall'] !== '',
    stars: [[0, 0.6], [0.25, 0.3], [0.65, 0.35], [0.85, 0.55], [1, 0.25], [0.95, 0.85]],
    at: [0.86, 0.3], size: [0.12, 0.35],
  },
  {
    id: 'sleeper', name: 'The Sleeper', hint: 'once a turtle has slept nearby',
    text: 'A round shell, resting. It does not move all night, and nobody wakes it.',
    when: (s) => s.moments.turtle !== '',
    stars: [[0, 0.5], [0.3, 0.1], [0.7, 0.1], [1, 0.5], [0.7, 0.9], [0.3, 0.9]], close: 0,
    at: [0.88, 0.74], size: [0.1, 0.3],
  },
  {
    id: 'lamp', name: 'The Lamp', hint: 'once a lamp of the city has been found',
    text: 'A lamp hung on a thread of stars. Somebody in Thousandfold made the first one of these.',
    when: (s) => s.relics.includes('lamp-hall') || s.moments['old-lamp'] !== '',
    stars: [[0.5, 0], [0.5, 0.3], [0.9, 0.62], [0.5, 1], [0.1, 0.62]], close: 1,
    at: [0.7, 0.74], size: [0.07, 0.38],
  },
];

/**
 * Shooting stars at the Breach: a shower every `period` seconds of reef time, lasting `length`.
 * While one falls the reef may make one wish.
 */
export type WishId = 'ripen' | 'tablet' | 'line';
export const WISH = {
  period: 1200, offset: 640, length: 90,
  /** Seconds of spawn a ripening wish brings; at most `lineMax` lineage wishes per reef. */
  seconds: 240, lineMax: 3,
  kicker: 'Shooting stars',
  text: 'Stars are falling into the sea. The old bands say that is when you ask for something, and you may ask once.',
  wishes: [
    { id: 'ripen', label: 'Ripen', effect: 'four minutes of spawn at once' },
    { id: 'tablet', label: 'A piece of the tablet', effect: 'a shard, if any are still lost (or the spawn ripens)' },
    { id: 'line', label: 'For the line', effect: '+1 lineage (three times on a reef)' },
  ] as readonly { id: WishId; label: string; effect: string }[],
  float: '· a wish',
  lineGot: '+1 lineage ·\u00a0a wish for the line',
} as const;

export const SKY = {
  title: 'The sky',
  intro: 'Stars. No reef has ever seen them; there are no words for them in any band. Give them some.',
  trace: 'Trace',
  tracing: 'Tap its stars in order',
  stop: 'Stop',
  locked: 'a patch of stars',
  before: 'named before',
  /** Spawn × this for every figure named. */
  spawnEach: 1.04,
  effect: 'spawn ×1.04 each',
  /** The ending, when any were named ({names}). */
  ending: 'Over the water, the stars you named keep watch: {names}. The spawn rises toward them all night.',
} as const;
