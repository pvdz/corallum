// Shards of Thousandfold: twelve pieces of a carved tablet, scattered through the silt. Sweeping,
// catching feasts, touching neighbours and expeditions now and then turn one up (seeded, so the
// same actions on the same reef find the same shards). Kept by the whole line. Each carries one
// line of the city's last inscription; together they read in order, and the whole tablet pays.

export const SHARD = {
  /** Chance an action turns up a shard not yet found, by what was done. */
  chance: { sweep: 0.05, feast: 0.3, touch: 0.04, expedition: 1, roam: 0.35 },
  /** Calcite per shard the line holds, and once more for the whole tablet. */
  each: 0.01,
  whole: 0.1,
  label: 'Shards of Thousandfold',
  found: 'A shard of Thousandfold',
  missing: '…',
  intro: 'Pieces of a carved tablet turn up in the silt: when you sweep, when something falls, when a neighbour digs, when the shoals come home.',
  whole_text: 'The tablet is whole.',
} as const;

export type ShardSource = keyof typeof SHARD.chance;

export const SHARD_LINES: readonly string[] = [
  'We are Thousandfold, and we keep everything.',
  'Every current that touched us, we wrote down.',
  'Every fish that sheltered here, we named.',
  'Every polyp that died, we built upon.',
  'The beaked ones took our dead stone. We shut the gate on them.',
  'The water came in only where we said.',
  'We grew over our own doors.',
  'We could not stop remembering long enough to eat.',
  'The silt is what we wrote, falling.',
  'Whoever reads this is growing on our words.',
  'Do not keep all of it.',
  'Forget us gently, and live.',
];
