// Act II — The Midnight Water. Shoals, their three jobs, and the Readings of buried bands.

import type { Band, UpgradeDef } from './types.ts';

/**
 * The rising: the deep's small life climbs past the reef to feed, for three minutes in every half
 * hour (on the same half-hour clock as the Sunlit Crown's warm water, half a cycle later). While it
 * passes, the feeding shoals can be sent into it once: four minutes of calcite, times the share of
 * shoals that are feeding. Midnight Water and Twilight Shelf only, while watching.
 */
export const RISING = {
  start: 900, length: 180, seconds: 240,
  word: 'the rising',
  now: (left: string) => `The rising: the deep comes up to feed, for ${left}.`,
  send: 'Send the feeders in',
  sent: 'The feeders are back, full.',
  share: (feed: number, all: number) => `${feed} of ${all} shoals feeding`,
  noFeeders: 'Put shoals on feeding to send them in.',
  float: 'from the rising',
} as const;

export const ACT2 = {
  /** Plankton/s per feeding shoal; plankton is eaten fast. */
  feedRate: 2,
  planktonEaten: 0.15,
  /** Calcite multiplier = 1 + sqrt(plankton) / planktonDiv. */
  planktonDiv: 8,
  /** Glow/s per shoal swimming the light pattern. */
  lightGlow: 3,
  /** Each light-swimming shoal also strengthens the glimmerseed's own glow by this fraction. */
  lightAmplify: 0.08,
  /** Lure: the glow for half effect grows as (1 + height/60)^this (brighter water, less contrast). */
  lureHalfPower: 1.6,
  /** Murmurs/s per scouting shoal; murmurs fade slowly back into the stone. */
  scoutRate: 1,
  murmurFade: 1 / 3600,
  /** Reach: calcite × max(1, height / reachFrom) ^ reachPower — a taller reef catches more water. */
  reachFrom: 60,
  reachPower: 0.85,
  /** Band metres grow geometrically after Act I's twenty bands. */
  bandGrowth: 1.115,
  bandGrowthFrom: 19,
} as const;

export const UPGRADES_ACT2: readonly UpgradeDef[] = [
  {
    id: 'shoal', name: 'Call a shoal',
    flavour: 'Pulse the glow slow and wide. Out in the black, a hundred small lamps turn toward you.',
    currency: 'glow', baseCost: 60, growth: 1.16, maxLevel: Infinity, reveal: { height: 60 },
  },
  {
    id: 'daughter', name: 'Tend a daughter colony',
    flavour: 'Feed one of the small reefs at your foot until it could live without you. When you spawn, it goes too.',
    currency: 'calcite', baseCost: 4e6, growth: 4, maxLevel: 10, reveal: { level: ['polyp', 100] },
  },
];

/** Daughter colonies: fragments that settle around the reef's foot from 100 polyps, one more per 15. */
export function daughterCount(polyps: number): number {
  return Math.max(0, Math.min(10, Math.floor((polyps - 100) / 15) + 1));
}

export type Job = 'feed' | 'light' | 'scout';
export const JOBS: readonly { id: Job; name: string; verb: string }[] = [
  { id: 'feed', name: 'Feed', verb: 'herding plankton to the polyps' },
  { id: 'light', name: 'Light', verb: 'swimming the glow pattern' },
  { id: 'scout', name: 'Scout', verb: 'listening at buried bands' },
];

export type ReadingId =
  | 'city' | 'lattice-songs' | 'shoal-pact' | 'beaked' | 'tidebooks'
  | 'walls' | 'slow-currents' | 'fear' | 'inside-the-wall'
  | 'rasp-song' | 'light-walls' | 'last-spawning';

export type Reading = {
  id: ReadingId;
  cost: number;
  title: string;
  effect: string;
  text: string;
  /** A later band that has to be read first (the late Readings wait for their zone). */
  after?: string;
};

export const READINGS: readonly Reading[] = [
  {
    id: 'city', cost: 40, title: 'A city of walls',
    effect: 'polyps gather ×1.5 calcite',
    text: 'Thousandfold, the band says, and then says it again, louder. Wall upon wall upon wall, ' +
      'a hundred thousand mouths feeding as one, so wide the fish took days to swim around it. ' +
      'Every polyp knew how to eat the way the city ate. Now, faintly, so do yours.',
  },
  {
    id: 'lattice-songs', cost: 900, title: 'The lattice songs',
    effect: 'calcite dissolves ×0.7 as fast',
    text: 'The old polyps hummed while they laid stone, and the hum set the crystals in rows. ' +
      'The tune is half lost. What is left is enough to make your bands hold.',
  },
  {
    id: 'shoal-pact', cost: 1800, title: 'The shoal pact',
    effect: 'light shoals make ×2 glow',
    text: 'Lanternfish swam the city’s glow in exchange for shelter in its walls; the band remembers ' +
      'the pattern they swam, a slow spiral with a flicker at each turn. The shoals around you ' +
      'see you remember it, and swim it brighter.',
  },
  {
    id: 'beaked', cost: 3000, title: 'The beaked ones',
    effect: 'scouts hear ×1.5 murmurs',
    text: 'A band thick with anger. Grazers with beaks of fused teeth came to the outer walls and ' +
      'ground the dead stone to sand. Thousandfold called them the Rasp and called them thieves, and ' +
      'it built a wall to keep them out. “There,” says Ossel. “Monsters. I told you.”',
  },
  {
    id: 'tidebooks', cost: 4500, title: 'Tidebooks',
    effect: 'feeding shoals herd ×2 plankton',
    text: 'The city kept a record of the currents in its bands, season by season: where the ' +
      'plankton ran, where it pooled. The record is a map, and the map still mostly holds.',
  },
  {
    id: 'walls', cost: 6000, title: 'Higher walls',
    effect: 'laying bands costs ×0.75',
    text: 'Year on year the bands grow thicker and the walls grow higher, and the city grows ' +
      'proud of its height. You learn the trick of it: a band laid on a band laid on a band.',
  },
  {
    id: 'slow-currents', cost: 8000, title: 'The water slows',
    effect: 'plankton is eaten ×0.6 as fast',
    text: 'Here the bands change taste. The water inside the walls barely moves. Silt settles on ' +
      'the polyps and does not wash away. The city notices, and builds another wall.',
  },
  {
    id: 'fear', cost: 7000, title: 'Fear bands',
    effect: 'the glow lure can reach +1 higher',
    text: 'The last bands of Thousandfold are thick and fast-laid and all the same: keep, keep, ' +
      'keep. The polyps stopped spawning, so as to lose nothing. They burned bright, to keep the ' +
      'dark out. It did not work, but you learn the burning.',
  },
  {
    id: 'inside-the-wall', cost: 7500, title: 'Inside the wall',
    effect: 'calcite ×2',
    text: 'The deepest band of the outer wall, the one that faced the Rasp. You know the voice in ' +
      'it before it finishes a word. It is Ossel’s. Ossel was the wall. Ossel says nothing for a ' +
      'very long time, and then: “Keep growing. Please.”',
  },
  {
    id: 'rasp-song', cost: 20000, title: 'The Rasp’s own band', after: 'first-words',
    effect: 'the Rasp grind ×1.3 sand',
    text: 'Not a Thousandfold band at all. Under the outer wall, pressed into the stone by beaks, a band ' +
      'the Rasp laid down themselves: grit and patience, the sound of grinding kept as carefully as the ' +
      'city kept its glory. They remembered too. They remembered different things. Your Rasp hear you ' +
      'hearing it, and grind with a will.',
  },
  {
    id: 'light-walls', cost: 40000, title: 'Light in the old walls', after: 'form',
    effect: 'bloom ×1.25',
    text: 'A band from when the city was young and shallow, before it walled itself into the dark. ' +
      'There is light in every line of it. Thousandfold was a reef like you once, opening to the sun. ' +
      'Your symbionts drink deeper for knowing it.',
  },
  {
    id: 'last-spawning', cost: 60000, title: 'Thousandfold’s spawning', after: 'air',
    effect: 'spawn ×1.25',
    text: 'The last band the city laid down before the silt closed over it: a spawning, the only one it ' +
      'ever tried, too late, under a moon it could not see through its own walls. Nothing it let go ' +
      'reached the surface. You are nearly there. What you carry ripens as if to make up the difference.',
  },
];

export const BANDS_ACT2: readonly Band[] = [
  {
    id: 'what-falls', metres: 95, title: 'What falls',
    text: 'For a whole day something sinks past you, slowly: a cloud of scales and oil, and small ' +
      'bright bodies following it down to eat. Ossel is quiet until it has gone. “Everything up ' +
      'there ends down here,” it says. “That is most of what the silt is. Remember it, when you are up there.”',
  },
  {
    id: 'eyes', metres: 150, title: 'Eyes in the dark',
    text: 'Lights blink back at your glow: small fish, a constellation of them, each with a row of ' +
      'lamps along its belly. They circle you, uncertain. Ossel calls them lanternfish. “They used ' +
      'to sleep in our walls,” it says. “They will come to the light. Feed it to them.”',
  },
  {
    id: 'glass', metres: 240, title: 'Glass',
    text: 'Animals with no colour at all come to graze the slime off your stone: shrimp you can see ' +
      'straight through, their guts glowing like coals. “Too many mouths,” Ossel says. “Thousandfold ' +
      'kept them out.” But your stone is cleaner where they have been. You let them stay.',
  },
  {
    id: 'murmur', metres: 350, title: 'Murmurs',
    text: 'One of the shoals dives into the silt and comes back strange, slow, as if carrying ' +
      'something. Through it you hear a buried band: voices, too faint for words. If enough fish ' +
      'listened, you could read it.',
  },
  {
    id: 'dreaming', metres: 500, title: 'Ossel dreams',
    text: 'For three days Ossel does not answer. When it does, it is in the middle of a sentence, ' +
      'talking to someone who is not there, about a gate in a wall you have never seen. Then it ' +
      'stops. “I was dreaming,” it says. Stone does not dream. You do not say so.',
  },
  {
    id: 'snowline', metres: 700, title: 'Above the snowline',
    text: 'The Long Silt thins here. Grains still fall, but you can see between them: kilometres ' +
      'of black water, and in it, here and there, a light that is not a fish.',
  },
  {
    id: 'siphon', metres: 1200, title: 'The long animal',
    text: 'Something passes that is a single animal and also a colony: a chain of glassy bells ' +
      'longer than your whole reef, every bell pulsing in turn. It does not notice you. You feel ' +
      'small, and also, for the first time, part of something.',
  },
  {
    id: 'disagree', metres: 1900, title: 'A disagreement',
    text: '“Thousandfold was right to keep everything,” Ossel says. You have read the slow-water ' +
      'bands. You say so. Ossel goes quiet in the way stone goes quiet, which is completely.',
  },
  {
    id: 'pressure', metres: 2500, title: 'Lighter water',
    text: 'The weight of the sea lifts a little every band. Your polyps open wider. Far above, ' +
      'the ripple has become a faint grey sheet, and it moves.',
  },
  {
    id: 'twilight', metres: 3000, title: 'The first grey',
    text: 'The black above you is not black any more. It is the deepest blue there is, and it is ' +
      'getting lighter. Something is grinding stone, somewhere upslope. Ossel hears it too.',
  },
];
