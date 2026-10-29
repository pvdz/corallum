// Ossel's requests: one small thing at a time to do while watching ("bud five polyps", "touch
// three neighbours"). Done, it pays a burst of the zone's currency and the next one comes. Picked
// from the reef's seed and the number already done, among the kinds that make sense where the
// reef is. Never needed: the reef grows the same without them.

export type RequestKind = 'bud' | 'glimmer' | 'bands' | 'feast' | 'touch' | 'sweep' | 'shoals' | 'sandbar' | 'pigment' | 'ripen';

export type RequestDef = {
  kind: RequestKind;
  /** Ossel's words, with {n} for the number. */
  ask: string;
  /** How many, by how many requests are already done (a little more each time, capped). */
  n: (done: number) => number;
  /** Zones where it can be asked. */
  zones: readonly number[];
};

export const REQUEST = {
  /** Reward: this many seconds of the zone's production (calcite, bloom in the light, spawn at the surface). */
  seconds: 120,
  /** Asked once the reef has this many polyps (from the start: the first request is always to bud). */
  fromPolyps: 0,
  kicker: 'Ossel asks',
  paid: 'A request kept',
  /** Ask for something else: at most once per this many sim seconds. */
  skipEvery: 300,
  skip: 'Ask another',
  float: '· for Ossel',
} as const;

export const REQUESTS: readonly RequestDef[] = [
  { kind: 'bud', ask: 'Bud {n} polyps.', n: (d) => Math.min(12, 3 + d), zones: [1, 2, 3, 4, 5] },
  { kind: 'glimmer', ask: 'Take in {n} more glimmerseed.', n: (d) => Math.min(10, 3 + Math.floor(d / 2)), zones: [1, 2, 3, 4, 5] },
  { kind: 'bands', ask: 'Lay down {n} bands.', n: (d) => Math.min(5, 1 + Math.floor(d / 3)), zones: [1, 2, 3, 4, 5] },
  { kind: 'feast', ask: 'Catch something falling.', n: () => 1, zones: [1, 2, 3, 4, 5] },
  { kind: 'touch', ask: 'Touch {n} of our neighbours.', n: (d) => Math.min(6, 2 + Math.floor(d / 3)), zones: [1, 2, 3, 4, 5] },
  { kind: 'sweep', ask: 'Sweep the water {n} times with your tentacles.', n: (d) => Math.min(8, 3 + Math.floor(d / 3)), zones: [1, 2] },
  { kind: 'shoals', ask: 'Call {n} more shoals.', n: (d) => Math.min(4, 1 + Math.floor(d / 4)), zones: [2, 3] },
  { kind: 'sandbar', ask: 'Raise {n} sand bar.', n: () => 1, zones: [3] },
  { kind: 'pigment', ask: 'Grow {n} new pigment.', n: () => 1, zones: [4] },
  { kind: 'ripen', ask: 'Ripen the spawn {n} more time.', n: () => 1, zones: [5] },
];
