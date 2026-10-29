// Falling feasts: now and then something dead sinks past the reef. Tap it while it is in reach
// for a burst of calcite. Only while you watch: offline time has no feasts.

/** Coming back after a long time away: Ossel kept watch, and offers one of two gifts. */
/** Before you go: one tap to ready the reef for an absence. */
export const AWAY_PREP = {
  label: 'Before you go',
  title: 'Set the Rasp for holding stone, and send the shoals off if a trip is open',
  rasp: 'the Rasp set for holding',
  trip: 'the shoals sent off',
  nothing: 'nothing to change: the reef is ready',
} as const;

/** The away summary's lines about the half-hour cycles that passed. */
export const AWAY_CYCLES = {
  heat: 'Warm water',
  heatOpen: (n: number) => `${n} warm spell${n === 1 ? '' : 's'} came; the reef stayed open and bleached in each (close up before you go, or grow Sun-shy)`,
  heatClosed: (n: number) => `${n} warm spell${n === 1 ? '' : 's'} came and went; the reef was closed`,
  heatShy: (n: number) => `${n} warm spell${n === 1 ? '' : 's'}; the reef closed itself each time`,
  rising: 'The rising',
  risings: (n: number) => `came up past the reef ${n} time${n === 1 ? '' : 's'} while no one sent the feeders in`,
} as const;

/** Browser notifications while the tab is in the background (a setting, off by default). */
export const NOTIFY = {
  setting: 'Tell me when something waits while this tab is in the background (a rising, warm water, shoals home, the full moon)',
  rising: 'The rising is passing your reef. Send the feeders in.',
  heat: 'The water is running warm and your polyps are open.',
  home: 'Your shoals are home from the ruin.',
  moon: 'The moon is full and the spawn is ready.',
} as const;

/**
 * Swells at the Breach (while watching): now and then a set of big swells rolls in; tap the crown
 * (or S) just as each crests to send spawn up on it.
 */
export const SWELL = {
  period: 200, waves: 5, lead: 3, gap: 4, slack: 0.5, seconds: 20,
  word: 'swells',
  hit: 'up on the swell',
  miss: 'too soon · too late',
} as const;

/** A new day: the first visit of each calendar day brings a small gift. */
export const DAILY = { seconds: 600, kicker: 'A new day', text: 'Ossel has been keeping something for you.' } as const;

/** Dreams: the reef sleeps a quarter of an hour forward at once. One comes with each new day, at most `max` kept. */
export const DREAM = {
  seconds: 900, max: 3,
  label: (n: number) => `Dream (${n})`,
  title: 'Sleep as Ossel sleeps: the reef dreams a quarter of an hour forward, all at once',
  gained: 'and a dream',
} as const;

export const WELCOME = {
  /** Offered after this long away (sim seconds). */
  after: 3600,
  /** The haul: this share of each second away's calcite production, for at most `cap` seconds. */
  share: 0.05,
  cap: 8 * 3600,
  /** The search: this many digs at the roam chance. */
  digs: 3,
  head: 'Ossel kept watch. Take one:',
  haul: 'A haul of stone',
  search: 'A search of the silt',
  searchNote: 'three chances at a shard',
  took: 'Taken',
} as const;

/**
 * Thorn stars: now and then on the Twilight Shelf and in the Sunlit Crown a coral-eating starfish
 * climbs the reef. Tap it off for a burst; guard crabs at home drive it off themselves at the last
 * moment, for a share. Only while you watch (slots like feasts).
 */
export const THORN = {
  period: 420, life: 70, seconds: 120, crabShare: 0.5, zones: [3, 4],
  pried: '· the thorn star, off',
  crabs: '· the guard crabs drove it off',
  /** In the Midnight Water the intruder is a dragonfish stalking the shoals; a finished lantern spire dazzles it away. */
  dragon: '· the dragonfish fled',
  lamps: '· the spire’s lamps dazzled it away',
  snail: '· the drill snail, off',
  gull: '· the gull flew off',
  /** On the Silt Floor the snail comes once the reef is this tall. */
  snailFrom: 20,
} as const;

/** Which intruder comes in each zone. */
export type Intruder = 'thorn-star' | 'dragonfish' | 'drill-snail' | 'gull';
export function intruderOf(zone: number): Intruder | null {
  return zone === 5 ? 'gull' : zone === 1 ? 'drill-snail' : zone === 2 ? 'dragonfish' : zone === 3 || zone === 4 ? 'thorn-star' : null;
}

/** The shoals' signal: now and then the lanternfish flash a pattern; repeat it for a burst. Watching only. */
export const SIGNAL = {
  period: 360, life: 75, zones: [2, 3, 4], minShoals: 5,
  /** Lamps (colours) and pattern length (grows with signals answered, capped). */
  lamps: ['120,200,255', '150,255,200', '255,210,140', '220,150,255'],
  length: (answered: number) => Math.min(8, 3 + Math.floor(answered / 2)),
  /** Pay: this many seconds of production per light in the pattern. */
  secondsPerLight: 20,
  /** Answered in consecutive slots, each pays this much more, up to `streakMax` in a row. */
  streakBonus: 0.15, streakMax: 6, streakWord: 'in a row',
  kicker: 'The shoals are signalling',
  text: 'Watch the lights, then answer with the same.',
  watch: 'Watch…',
  answer: 'Your turn',
  right: 'They answer you',
  wrong: 'They swim on, puzzled',
  float: '· the shoals answered',
} as const;

export const FEAST = {
  /** The band after which they come (the late Silt Floor, where purchases slow down). Ossel's
   * whisper introduces the first; the "What falls" band tells what they are. */
  band: 'beaks',
  /** One feast per slot of this many seconds, at a seeded moment inside it. */
  period: 300,
  /** Seconds a feast takes to sink out of reach. */
  life: 45,
  /** Reward: this many seconds of calcite production. */
  seconds: 90,
  label: 'A feast falls',
  /** Float text after the amount: tapped, and brought by the scavengers (Shared table). */
  ate: '· a feast',
  brought: '· the scavengers’ share',
  eaten: 'feast',
} as const;
