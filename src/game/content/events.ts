// Falling feasts: now and then something dead sinks past the reef. Tap it while it is in reach
// for a burst of calcite. Only while you watch: offline time has no feasts.

/** Coming back after a long time away: Ossel kept watch, and offers one of two gifts. */
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
