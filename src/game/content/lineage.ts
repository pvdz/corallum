// Lesser Spawnings and Lineage: what a reef passes on when it lets go early.

export const LINEAGE = {
  /** Band that opens lesser spawnings (the Midnight Water). */
  unlockBand: 'eyes',
  /** Lineage = floor(perRoot · sqrt(height / 60)). */
  perRoot: 4,
  fragmentingBonus: 1.5,
  /**
   * Extra lineage when beginning again after the ending: endingBonus, plus releaseBonus for every
   * doubling of the spawn released over its target (a bigger release sends more of you out).
   */
  endingBonus: 10,
  releaseBonus: 4,
  /** Glass gardeners: silt the shrimp clear (1/s), as much as six grazing Rasp without their appetite. */
  glassSweep: 0.18,
  /** Shared table: the share of a missed feast the scavengers bring down to the reef. */
  tableShare: 0.5,
} as const;

export type TraitId =
  | 'deep-memory' | 'quick-budding' | 'old-bands' | 'remembered-shoals' | 'glimmer' | 'kept-readings' | 'settling'
  | 'early-shoals' | 'rasp-kin' | 'glass-gardeners' | 'old-habits' | 'tide-reader' | 'shared-table' | 'shoal-sense' | 'rasp-sense' | 'old-maps' | 'open-house' | 'water-wise';

export type Trait = {
  id: TraitId;
  name: string;
  flavour: string;
  effect: string;
  cost: number;
  growth: number;
  max: number;
  /** 'way' traits change how a run plays (new routes); the rest are gifts (stronger numbers). */
  kind?: 'way';
};

/**
 * Where a lesser spawning settles. Each seamount bends the economy one way; the plain one is the
 * first reef's. Multipliers are read by sim/economy.ts.
 */
export type SeamountId = 'plain' | 'warm' | 'cold' | 'crowded' | 'hungry' | 'silent' | 'lonely' | 'buried' | 'dark';
export type Seamount = {
  id: SeamountId; name: string; text: string; effect: string;
  ventBoost: number; ventAcid: number; dissolve: number; polyp: number; readings: number; silt: number;
  /** Hard seamounts: grow to `goal` metres under the rule to earn `reward` for the whole line. */
  trial?: { goal: number; reward: string };
  /** At most this many shoals answer (lonely). */
  shoalCap?: number;
  /** No band can be read here (silent). */
  noReadings?: boolean;
  /** The glimmerseed's glow is multiplied by this (dark). */
  glow?: number;
};

/** Hard seamounts are offered once the line has spawned this many times. */
export const TRIALS_FROM = 1;
export const TRIAL_TEXT = { head: 'Hard places', note: 'A trial met', met: 'met' } as const;
export const SEAMOUNTS: readonly Seamount[] = [
  { id: 'plain', name: 'A plain seamount', text: 'Bare rock in the dark, like the first.', effect: 'as before',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 1, readings: 1, silt: 1 },
  { id: 'warm', name: 'A warm seamount', text: 'The vent here runs hot and sour.', effect: 'each vent tier ×1.07 stronger, its acid ×1.3 sharper',
    ventBoost: 1.07, ventAcid: 1.3, dissolve: 1, polyp: 1, readings: 1, silt: 1 },
  { id: 'cold', name: 'A cold seamount', text: 'Slow, heavy water that hardly takes anything back.', effect: 'calcite dissolves ×0.5, polyps feed ×0.92',
    ventBoost: 1, ventAcid: 1, dissolve: 0.5, polyp: 0.92, readings: 1, silt: 1 },
  { id: 'crowded', name: 'A crowded seamount', text: 'Old reefs all around, buried and talking.', effect: 'Readings cost ×0.6, silt falls ×1.4',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 1, readings: 0.6, silt: 1.4 },
  { id: 'hungry', name: 'A hungry seamount', text: 'Thin water. Little drifts this far out.', effect: 'polyps feed ×0.5',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 0.5, readings: 1, silt: 1,
    trial: { goal: 3000, reward: 'Lean years: polyps feed ×1.1 on every reef after' } },
  { id: 'silent', name: 'A silent seamount', text: 'No old reefs lie under this one. Nothing to listen to.', effect: 'no Readings',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 1, readings: 1, silt: 1, noReadings: true,
    trial: { goal: 2800, reward: 'Deaf-born: scouts hear ×1.3 on every reef after' } },
  { id: 'lonely', name: 'A lonely seamount', text: 'Far from the lanes the shoals swim.', effect: 'at most 8 shoals',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 1, readings: 1, silt: 1, shoalCap: 8,
    trial: { goal: 3000, reward: 'Few and close: shoals cost ×0.8 on every reef after' } },
  { id: 'buried', name: 'A buried seamount', text: 'The Long Silt lies thickest here, and is still falling.', effect: 'silt falls ×3',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 1, readings: 1, silt: 3,
    trial: { goal: 3600, reward: 'Silt-hardened: silt falls ×0.8 on every reef after' } },
  { id: 'dark', name: 'A dark seamount', text: 'Even the glimmerseed burn low here, as if the water drinks their light.', effect: 'glow ×0.3',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 1, readings: 1, silt: 1, glow: 0.3,
    trial: { goal: 2500, reward: 'Lamp-born: glow ×1.25 on every reef after' } },
];

export const TRAIT_GROUPS = {
  gift: { title: 'Gifts', text: 'What your children are born stronger at.' },
  way: { title: 'Ways', text: 'What your children know to do differently.' },
} as const;

export const TRAITS: readonly Trait[] = [
  {
    id: 'deep-memory', name: 'Deep memory', effect: 'calcite ×1.5',
    flavour: 'Your children eat the way you ate, from the first day.',
    cost: 3, growth: 1.6, max: Infinity,
  },
  {
    id: 'quick-budding', name: 'Quick budding', effect: 'polyps cost ×0.85',
    flavour: 'Splitting comes easily to a reef that has done it before.',
    cost: 4, growth: 2, max: 5,
  },
  {
    id: 'old-bands', name: 'Old bands', effect: 'start with 5 more bands laid',
    flavour: 'Some of the stone comes with them, in the shape of a habit.',
    cost: 5, growth: 1.8, max: 4,
  },
  {
    id: 'remembered-shoals', name: 'Remembered shoals', effect: 'start with 3 shoals',
    flavour: 'Lanternfish find young reefs that pulse the old spiral.',
    cost: 6, growth: 2, max: 3,
  },
  {
    id: 'glimmer', name: 'Glimmer heritage', effect: 'glow ×1.5',
    flavour: 'The glimmerseed rides along inside the spawn.',
    cost: 4, growth: 1.9, max: 4,
  },
  {
    id: 'kept-readings', name: 'Kept readings', effect: 'Readings and the Rasp’s words cost ×0.5',
    flavour: 'Some bands do not need reading twice.',
    cost: 8, growth: 1, max: 1,
  },
  {
    id: 'settling', name: 'Quick settling', effect: 'the reef rises ×2 as fast after each band',
    flavour: 'They do not wait to be sure before they build.',
    cost: 5, growth: 1, max: 1,
  },
  {
    id: 'early-shoals', name: 'Lamps in the snow', effect: 'shoals come at 20 m, in the Silt Floor',
    flavour: 'Lanternfish remember the way down to a reef that once called them.',
    cost: 10, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'rasp-kin', name: 'Rasp kin', effect: 'grazing grounds and sand bars open in the Midnight Water',
    flavour: 'The Rasp know your children by the taste of their stone, and come early.',
    cost: 14, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'glass-gardeners', name: 'Glass gardeners', effect: 'glass shrimp clear silt like six Rasp, eating none of your stone',
    flavour: 'They followed the spawn up from the old reef and keep its children clean.',
    cost: 12, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'old-habits', name: 'Old habits', effect: 'while you watch, the reef buds polyps and hosts glimmerseed itself when one costs under a tenth of its calcite',
    flavour: 'Some growing does not need deciding any more.',
    cost: 9, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'tide-reader', name: 'Tide-reader', effect: 'every full moon is a great tide: the spawn always carries four memories',
    flavour: 'They know the water will lift them. They do not wait for it.',
    cost: 16, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'shared-table', name: 'Shared table', effect: 'a feast nobody eats is eaten for you as it sinks away: half of it reaches the reef',
    flavour: 'The small lights that pick at the dead have learned where your stone is, and carry some of it home.',
    cost: 8, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'shoal-sense', name: 'Shoal sense', effect: 'while you watch, idle shoals find their own work, and feeders and light-swimmers shift to where they are worth most',
    flavour: 'The lanternfish learned your rhythm so long ago they no longer wait to be told.',
    cost: 10, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'rasp-sense', name: 'Rasp sense', effect: 'while you watch, the Rasp dial keeps to the best setting for income; when you leave, to the best for being away',
    flavour: 'Your children and the Rasp have an understanding about how much is enough.',
    cost: 10, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'old-maps', name: 'Old maps', effect: 'expeditions and roams take half as long',
    flavour: 'The shoals that swam for your parent taught their young the way to every ruin.',
    cost: 10, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'open-house', name: 'Open house', effect: 'one more home for residents',
    flavour: 'Your children grow with a ledge left empty, as if expecting someone.',
    cost: 12, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'water-wise', name: 'Water-wise', effect: 'each water’s discount goes 0.1 deeper (×0.7 becomes ×0.6)',
    flavour: 'They taste a change in the water a moment before it comes, and are ready.',
    cost: 10, growth: 1, max: 1, kind: 'way',
  },
];

/** Old habits buys an upgrade on its own when it costs less than this share of the calcite held. */
export const HABIT_SHARE = 0.1;

export const LINEAGE_BANDS: readonly { title: string; text: string }[] = [
  {
    title: 'A wreck',
    text: 'Far off, one of your children has settled on a sunken ship, all iron and silence. It is ' +
      'lonely there. It is growing anyway. You can feel it, the way you can feel your own branches.',
  },
  {
    title: 'A whale bone',
    text: 'Another settled on the rib of a whale that fell a long time ago. There is food in the ' +
      'bone, and worms, and a slow, enormous calm. It remembers the vent and thinks this is like that.',
  },
  {
    title: 'A harbour',
    text: 'One drifted into a harbour wall where the water tastes of rust and engines. It has ' +
      'learned to grow in murk. It is stubborn. You are, a little, proud.',
  },
  {
    title: 'The far side',
    text: 'One crossed the whole sea and settled where the water is cold and green. It does not ' +
      'remember you exactly, only the shape of a voice that said hold on.',
  },
  {
    title: 'A reef that answers',
    text: 'One has grown into a reef of its own, big enough to spawn. On the last full moon, ' +
      'very faintly, through all that water, you felt it let go.',
  },
  {
    title: 'Side by side',
    text: 'Your children and the sister reef’s have settled together on a ridge of black rock. They are ' +
      'different colours, and they grow into each other anyway.',
  },
  {
    title: 'Cold water',
    text: 'One of yours has drifted very far, to water that is nearly ice. It lays down a band a year, if ' +
      'that. Every one of them is full.',
  },
  {
    title: 'A white beach',
    text: 'Somewhere the Rasp have ground your children’s dead stone into a beach, white and fine, and ' +
      'turtles haul out to sleep on it. Nobody planned it. It is good.',
  },
  {
    title: 'Over the old city',
    text: 'One of your line has found the edge of Thousandfold and is growing over it, slowly, leaving ' +
      'every channel open. Nobody told it to. It remembers the gate.',
  },
];

// Boons: each reef after the first is offered three (seeded by its seamount) and keeps one.
export type BoonId = 'currents' | 'lamps' | 'quick-stone' | 'warm-heart' | 'roots' | 'welcome' | 'near-ruins';
export const BOONS: readonly { id: BoonId; name: string; effect: string }[] = [
  { id: 'currents', name: 'Rich currents', effect: 'calcite ×1.15 on this reef' },
  { id: 'lamps', name: 'Early lamps', effect: 'start with 4 shoals feeding' },
  { id: 'quick-stone', name: 'Quick stone', effect: 'bands ×0.9 on this reef' },
  { id: 'warm-heart', name: 'A warm heart', effect: 'glow ×1.3 on this reef' },
  { id: 'roots', name: 'Deep roots', effect: 'calcite dissolves ×0.85 on this reef' },
  { id: 'welcome', name: 'A welcoming sea', effect: 'gifts from neighbours ×2 on this reef' },
  { id: 'near-ruins', name: 'Near ruins', effect: 'expeditions take half as long on this reef' },
];
export const BOON_TEXT = { kicker: 'A new seamount', head: 'Something here is on your side. Choose one:' } as const;
