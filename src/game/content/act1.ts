// Act I — The Silt Floor. All numbers and player-facing strings for the first act.
// The economy (src/game/sim/economy.ts) reads these; tuning happens here.

import type { Band, UpgradeDef } from './types.ts';

/** The glimmerseed's strain: chosen once, at 15 m, for the whole run. */
export type StrainId = 'blue' | 'gold' | 'violet';
/**
 * The grain of the stone: every tenth band laid, the reef chooses how that band sets. Chosen grains
 * stack for the whole run (and show as coloured rings in the stone).
 */
/** Flaring the lure: spend half the glow held for a burst of calcite (up to `seconds`, by how full the glow was), once a `cooldown`. */
export const FLARE = {
  seconds: 30, cooldown: 60, fromHeight: 20,
  label: 'Flare', title: 'Blaze with half your glow: the light draws in a burst of calcite (L)',
  float: 'the lure flared',
} as const;

/**
 * Old growth: stone the reef has kept too long grows heavy on its branch tips (grey knobs, up to
 * `max`, filling toward it as dx/dt = P − kx). Break one off by tapping it: a burst of the zone's
 * currency. Left alone, they just wait.
 */
export const OLD = {
  max: 6, k: 1 / 1500, seconds: 25,
  float: '· old stone let go',
} as const;

export type GrainId = 'dense' | 'quick' | 'bright';
export const GRAIN = {
  every: 10,
  kicker: 'A band is setting',
  text: (n: number) => `Band ${n} is still soft. How should it set?`,
  more: (n: number) => `${n} more bands waiting to set`,
  sofar: 'In your stone so far',
} as const;
export const GRAINS: readonly { id: GrainId; name: string; effect: string; flavour: string; rgb: string; each: number }[] = [
  { id: 'dense', name: 'Dense', effect: 'calcite dissolves ×0.98 (each)', flavour: 'Packed tight, slow to give anything back to the water.', rgb: '255,250,240', each: 0.98 },
  { id: 'quick', name: 'Quick', effect: 'the reef rises ×1.05 as fast after a band (each)', flavour: 'Laid loose and fast, so the next can start sooner.', rgb: '150,230,190', each: 1.05 },
  { id: 'bright', name: 'Bright', effect: 'glow ×1.04 (each)', flavour: 'Glimmerseed sealed into the stone, still faintly lit.', rgb: '140,200,255', each: 1.04 },
];

/**
 * The sport: at the Twilight Shelf the strain kept since 15 m throws a mutation, one of two per
 * strain. The early choice becomes a branch.
 */
export type SportId = 'ice' | 'lamp' | 'amber' | 'sun' | 'ultraviolet' | 'dusk';
export const SPORT = {
  metres: 3000,
  kicker: 'Your glimmerseed are changing',
  text: (strain: string) => `Up here, in the first grey light, the ${strain.toLowerCase()} glimmerseed have begun to throw sports: a few of them breed something new. Which do you keep?`,
} as const;
export const SPORTS: readonly { id: SportId; strain: StrainId; name: string; effect: string; flavour: string; rgb: string }[] = [
  { id: 'ice', strain: 'blue', name: 'Ice blue', effect: 'glow ×1.25', flavour: 'Paler and harder, like light through deep ice.', rgb: '190,235,255' },
  { id: 'lamp', strain: 'blue', name: 'Lamp blue', effect: 'lure +1', flavour: 'They gather in clusters at the tips, like the lamps of a street.', rgb: '90,150,255' },
  { id: 'amber', strain: 'gold', name: 'Amber', effect: 'polyps feed ×1.12', flavour: 'Dark gold and slow, all their light turned inward to feeding.', rgb: '230,150,60' },
  { id: 'sun', strain: 'gold', name: 'Sun gold', effect: 'bloom ×1.2 (in the Sunlit Crown)', flavour: 'They have tasted the grey light above and want more of it.', rgb: '255,230,120' },
  { id: 'ultraviolet', strain: 'violet', name: 'Ultraviolet', effect: 'murmurs ×1.3', flavour: 'Gone past violet, past seeing. The old stone hears them perfectly.', rgb: '170,110,255' },
  { id: 'dusk', strain: 'violet', name: 'Dusk', effect: 'Readings and the Rasp’s words cost ×0.8', flavour: 'The colour of the sky at the moment it forgets the sun.', rgb: '210,140,200' },
];

export const STRAIN = {
  metres: 15,
  kicker: 'Your glimmerseed are settling',
  text: 'The little lights in your tissue are beginning to breed true. Which kind will you keep?',
} as const;
export const STRAINS: readonly { id: StrainId; name: string; effect: string; flavour: string; rgb: string }[] = [
  { id: 'blue', name: 'Blue', effect: 'glow ×1.3', flavour: 'Cold and bright, the colour of the deep looking back.', rgb: '120,190,255' },
  { id: 'gold', name: 'Gold', effect: 'polyps feed ×1.15', flavour: 'Warm and dim; they feed the polyps more than they shine.', rgb: '255,200,110' },
  { id: 'violet', name: 'Violet', effect: 'scouts hear ×1.4 (later)', flavour: 'A colour almost no one can see. The old bands answer to it.', rgb: '200,150,255' },
];

/** Flurries of the Long Silt on the Silt Floor: a thick fall for `length` s every `period` s; sweeps catch ×`sweep`. */
export const FLURRY = { period: 240, length: 30, sweep: 3, word: 'a flurry' } as const;

export const ACT1 = {
  /** Calcite/s from the seamount's mineral seep before any polyp is budded. */
  trickle: 0.2,
  /** Calcite/s per polyp. */
  polypRate: 0.3,
  /** Glow/s per symbiont colony. */
  symbiontGlow: 0.5,
  /** Fraction of glow that fades per second. */
  glowFade: 0.08,
  /** Lure: calcite multiplier = 1 + lureMax * glow / (glow + lureHalf). */
  lureMax: 1,
  lureMaxPerPattern: 0.6,
  lureHalf: 25,
  /** Fraction of stored calcite that dissolves per second (below the lysocline). */
  dissolve: 1 / 240,
  latticeFactor: 0.72,
  ventBoost: 1.7,
  ventAcid: 1.3,
  /** Metres of target height per band of skeleton laid down. */
  bandMetres: 3,
  /** Reef height approaches its target at this rate (1/s). */
  settleRate: 1 / 40,
  /** Height that ends the act: the reef rises out of the silt into the Midnight Water. */
  goalMetres: 60,
  /** Calcite gathered by sweeping the tentacles by hand, plus seconds of production. */
  sweepFlat: 1,
  sweepSeconds: 0.25,
  sweepCooldown: 0.4,
  /** Sweeps within this many seconds of the last build a combo: +10% each, up to ×2. */
  comboGap: 1.2, comboStep: 0.1, comboMax: 11,
  /** What each milestone multiplies its kind's output by. */
  milestoneFactor: 2,
} as const;

/**
 * Milestones: when the count of polyps (or glimmerseed colonies) reaches each level, everything
 * that kind makes doubles. Short goals inside the long climb, and a reason to lean one way.
 */
export type Milestone = { level: number; name: string; text: string };
export const MILESTONES: { polyp: readonly Milestone[]; symbiont: readonly Milestone[] } = {
  polyp: [
    { level: 10, name: 'A clump', text: 'Ten mouths, feeding as one.' },
    { level: 25, name: 'A thicket', text: 'Your polyps pass food between them now.' },
    { level: 50, name: 'A colony', text: 'Fifty mouths, one hunger, one rhythm.' },
    { level: 100, name: 'A grove', text: 'A hundred polyps open and close in waves along the stone.' },
    { level: 150, name: 'A city of mouths', text: 'The water around you is thick with things being eaten.' },
    { level: 200, name: 'A reef', text: 'Not a colony any more. A place.' },
  ],
  symbiont: [
    { level: 10, name: 'A constellation', text: 'The glimmerseed has begun to pulse together.' },
    { level: 25, name: 'Lanterns', text: 'Your branches light the water a body-length out.' },
    { level: 50, name: 'A beacon', text: 'Things far off in the dark turn to look.' },
    { level: 100, name: 'A second moon', text: 'You are the brightest thing for a kilometre.' },
  ],
};

export const UPGRADES_ACT1: readonly UpgradeDef[] = [
  {
    id: 'polyp', name: 'Bud a polyp',
    flavour: 'Split yourself, mouth and tentacles and all. The new one remembers being you.',
    currency: 'calcite', baseCost: 6, growth: 1.2, maxLevel: Infinity, reveal: {},
  },
  {
    id: 'skeleton', name: 'Lay down a band',
    flavour: 'A ring of stone a few cells thick, and in it everything you saw today.',
    currency: 'calcite', baseCost: 30, growth: 1.3, maxLevel: Infinity, reveal: { earned: 15 },
  },
  {
    id: 'symbiont', name: 'Host the glimmerseed',
    flavour: 'Tiny lights drift down with the silt. Some of them want a home.',
    currency: 'calcite', baseCost: 40, growth: 1.18, maxLevel: Infinity, reveal: { level: ['polyp', 4] },
  },
  {
    id: 'lattice', name: 'Aragonite lattice',
    flavour: 'Pack the crystals tighter. The deep water gnaws at loose stone first.',
    currency: 'calcite', baseCost: 150, growth: 2.6, maxLevel: 8, reveal: { earned: 120 },
  },
  {
    id: 'lure', name: 'Lure patterns',
    flavour: 'Pulse the lights in rings. Drifting things turn toward rings.',
    currency: 'glow', baseCost: 30, growth: 1.9, maxLevel: 6, reveal: { level: ['symbiont', 2] },
  },
  {
    id: 'vent', name: 'Root into the vent',
    flavour: 'Warm water rich with stone, and sour enough to eat it again.',
    currency: 'calcite', baseCost: 500, growth: 5, maxLevel: 3, reveal: { height: 12 },
  },
];

export const BANDS_ACT1: readonly Band[] = [
  {
    id: 'wake', metres: 0, title: 'Settling',
    text: 'You were a speck in the dark for a long time, and then there was stone under you. ' +
      '“Hold on,” says a voice from the dead wall beside you. “Hold on, little mouth. I am Ossel. ' +
      'I have waited a long time for someone to grow.”',
  },
  {
    id: 'silt', metres: 2, title: 'The snow that is not snow',
    text: 'It falls without end: grey, soft, patient. “The Long Silt,” Ossel says. “Four hundred ' +
      'years of it. It buried every reef in the sea. Grow faster than it falls, and you live.”',
  },
  {
    id: 'bands', metres: 6, title: 'What stone remembers',
    text: 'Your first band hardens, and you find you can feel it: the cold, the taste of the seep, ' +
      'the shape of Ossel’s voice, all written in the grain. “That is what a reef is,” Ossel says. ' +
      '“Memory, laid down so it cannot drift away.”',
  },
  {
    id: 'moon', metres: 12, title: 'The ripple',
    text: 'Far above, so far it might be imagined, the dark is a shade less dark. “The surface,” ' +
      'Ossel says. “Once a year the Spawning Moon stands over it, and every reef in the sea lets go ' +
      'of its children at once. You will want to be there.”',
  },
  {
    id: 'thousandfold', metres: 20, title: 'Thousandfold',
    text: 'Your roots touch something older under the silt: a band, thin as a breath, not yours. ' +
      'It tastes of warm water and a crowd of voices. A city of coral, wall on wall. Thousandfold, ' +
      'it calls itself, and it is very proud.',
  },
  {
    id: 'forgetting', metres: 30, title: 'Ossel’s rule',
    text: '“Keep everything,” Ossel says. “Every band. Thousandfold kept everything, and it was the ' +
      'greatest reef that ever lived.” You notice Ossel does not say what happened to it.',
  },
  {
    id: 'beaks', metres: 42, title: 'A sound in the old band',
    text: 'In Thousandfold’s band there is a sound you do not know: a grinding, like stone on stone, ' +
      'and something that might be laughter. The band stops there, as if someone wiped it.',
  },
  {
    id: 'rise', metres: 60, title: 'Out of the silt',
    text: 'Your crown clears the falling grey. Above you the water opens, black and enormous, and ' +
      'something in it is blinking. “The Midnight Water,” Ossel says, quieter than usual. ' +
      '“I have not seen it since I was young.”',
  },
];
