// Falling feasts: now and then something dead sinks past the reef. Tap it while it is in reach
// for a burst of calcite. Only while you watch: offline time has no feasts.

export const FEAST = {
  /** The band that explains them ("What falls"); none come before it. */
  band: 'what-falls',
  /** One feast per slot of this many seconds, at a seeded moment inside it. */
  period: 300,
  /** Seconds a feast takes to sink out of reach. */
  life: 45,
  /** Reward: this many seconds of calcite production. */
  seconds: 90,
  label: 'A feast falls',
  eaten: 'feast',
} as const;
