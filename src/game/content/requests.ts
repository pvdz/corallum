// Ossel's requests: one small thing at a time to do while watching ("bud five polyps", "touch
// three neighbours"). Done, it pays a burst of the zone's currency and the next one comes. Picked
// from the reef's seed and the number already done, among the kinds that make sense where the
// reef is. Never needed: the reef grows the same without them.

export type RequestKind = 'bud' | 'glimmer' | 'bands' | 'feast' | 'neighbours' | 'sweep' | 'shoals' | 'sandbar' | 'pigment' | 'ripen'
  | 'roam' | 'work' | 'intruder' | 'read' | 'shell' | 'rising' | 'signal' | 'star' | 'prune' | 'milky' | 'lucky' | 'free' | 'visitor' | 'stray' | 'fragment';

export type RequestDef = {
  kind: RequestKind;
  /** Ossel's words, with {n} for the number; `one` when it is just one. */
  ask: string;
  one?: string;
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
  /** The skip's tooltip while it waits to be allowed again. */
  skipAgain: (t: string) => `Ask another: again in ${t}`,
  /** When what an ask waits for comes (beside the ask). */
  comesIn: (t: string) => `in ${t}`,
  /** Each kept in a row adds this to the next pay, up to `streakMax` in a row (a swap breaks it). */
  streakBonus: 0.1,
  streakMax: 5,
  streakWord: 'in a row',
  float: '· for Ossel',
} as const;

export const REQUESTS: readonly RequestDef[] = [
  { kind: 'bud', ask: 'Bud {n} polyps.', one: 'Bud one more polyp.', n: (d) => Math.min(12, 3 + d), zones: [1, 2, 3, 4, 5] },
  { kind: 'glimmer', ask: 'Take in {n} more glimmerseed.', one: 'Take in one more glimmerseed.', n: (d) => Math.min(10, 3 + Math.floor(d / 2)), zones: [1, 2, 3, 4, 5] },
  { kind: 'bands', ask: 'Lay down {n} bands.', one: 'Lay down a band.', n: (d) => Math.min(5, 1 + Math.floor(d / 3)), zones: [1, 2, 3, 4, 5] },
  { kind: 'feast', ask: 'Catch something falling.', n: () => 1, zones: [1, 2, 3, 4, 5] },
  { kind: 'neighbours', ask: 'Touch {n} of our neighbours.', one: 'Touch one of our neighbours.', n: (d) => Math.min(6, 2 + Math.floor(d / 3)), zones: [1, 2, 3, 4, 5] },
  { kind: 'sweep', ask: 'Sweep the water {n} times with your tentacles.', one: 'Sweep the water once with your tentacles.', n: (d) => Math.min(8, 3 + Math.floor(d / 3)), zones: [1, 2] },
  { kind: 'shoals', ask: 'Call {n} more shoals.', one: 'Call one more shoal.', n: (d) => Math.min(4, 1 + Math.floor(d / 4)), zones: [2, 3] },
  { kind: 'sandbar', ask: 'Raise {n} sand bars.', one: 'Raise a sand bar.', n: () => 1, zones: [3] },
  { kind: 'pigment', ask: 'Grow {n} new pigments.', one: 'Grow a new pigment.', n: () => 1, zones: [4] },
  { kind: 'ripen', ask: 'Ripen the spawn {n} more times.', one: 'Ripen the spawn once more.', n: () => 1, zones: [5] },
  { kind: 'roam', ask: 'Send the shoals out to roam.', n: () => 1, zones: [2, 3] },
  { kind: 'work', ask: 'Raise a stage of the great work.', n: () => 1, zones: [1, 2, 3, 4, 5] },
  { kind: 'intruder', ask: 'Drive off the next thing that comes to eat us.', n: () => 1, zones: [2, 3, 4] },
  { kind: 'read', ask: 'Read a band.', n: () => 1, zones: [1, 2, 3, 4, 5] },
  { kind: 'shell', ask: 'Pick up a shell from the sand.', n: () => 1, zones: [4] },
  { kind: 'rising', ask: 'Send the feeders into the next rising.', n: () => 1, zones: [2, 3] },
  { kind: 'signal', ask: 'Answer the shoals when they next signal.', n: () => 1, zones: [2, 3, 4] },
  { kind: 'star', ask: 'Give a name to some of the stars.', n: () => 1, zones: [5] },
  { kind: 'milky', ask: 'Sweep through the next milky sea {n} times.', one: 'Sweep through the next milky sea once.', n: (d) => Math.min(10, 4 + Math.floor(d / 4)), zones: [2] },
  { kind: 'lucky', ask: 'Touch a lucky one: watch for golden sparks.', n: () => 1, zones: [1, 2, 3, 4, 5] },
  { kind: 'free', ask: 'Free the next small fish in trouble.', n: () => 1, zones: [2, 3, 4, 5] },
  { kind: 'visitor', ask: 'Today’s visitor is near. Touch it.', n: () => 1, zones: [1, 2, 3, 4, 5] },
  { kind: 'stray', ask: 'Call home the next lost shoal you see.', n: () => 1, zones: [2] },
  { kind: 'fragment', ask: 'Catch a fragment of another reef as it drifts past.', n: () => 1, zones: [3, 4] },
  { kind: 'prune', ask: 'Let {n} knobs of old stone go.', one: 'Let a knob of old stone go.', n: (d) => Math.min(3, 1 + Math.floor(d / 6)), zones: [1, 2, 3, 4, 5] },
];
