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
  | 'early-shoals' | 'rasp-kin' | 'glass-gardeners' | 'old-habits' | 'tide-reader' | 'shared-table' | 'shoal-sense' | 'rasp-sense' | 'old-maps' | 'open-house' | 'water-wise' | 'thorn-wise' | 'moon-born' | 'layering' | 'shell-finder' | 'signal-wise' | 'sun-shy' | 'deep-larder' | 'grain-sense' | 'light-boned' | 'lucky-line' | 'star-gazer' | 'gentle' | 'helping' | 'foster' | 'long-rhythm';

export type Trait = {
  id: TraitId;
  name: string;
  flavour: string;
  effect: string;
  cost: number;
  growth: number;
  max: number;
  /** 'way' traits change how a run plays (new routes), 'habit' ones do things for you; the rest are gifts (stronger numbers). */
  kind?: 'way' | 'habit';
};

/**
 * Where a lesser spawning settles. Each seamount bends the economy one way; the plain one is the
 * first reef's. Multipliers are read by sim/economy.ts.
 */
export type SeamountId = 'plain' | 'warm' | 'cold' | 'crowded' | 'hungry' | 'silent' | 'lonely' | 'buried' | 'dark' | 'shallow' | 'thorny' | 'heavy' | 'gleaming' | 'tidal';
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
  /** Warm spells last this many times as long (shallow). */
  heat?: number;
  /** Intruders come this many times as far apart (thorny: 0.5, twice as often). */
  thorns?: number;
  /** Old stone gathers this many times as fast (heavy). */
  old?: number;
  /** Lucky neighbours come this many times as often (gleaming). */
  lucky?: number;
  /** Nothing falls from above: no feasts (gleaming). */
  noFeasts?: boolean;
  /** Great tides come every other moon (tidal). */
  tides?: boolean;
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
  { id: 'shallow', name: 'A shallow seamount', text: 'Its top lies close under the sun, where the water warms early and stays warm.', effect: 'warm spells last twice as long',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 1, readings: 1, silt: 1, heat: 2,
    trial: { goal: 3950, reward: 'Sun-hardened: open polyps bleach half as fast on every reef after' } },
  { id: 'thorny', name: 'A thorny seamount', text: 'Everything here that eats coral has heard there is coral to eat.', effect: 'intruders come twice as often',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 1, readings: 1, silt: 1, thorns: 0.5,
    trial: { goal: 3700, reward: 'Spine-born: driving off an intruder pays ×1.5 on every reef after' } },
  { id: 'heavy', name: 'A heavy seamount', text: 'Everything that grows here grows old too soon, and the old stone weighs on the young.', effect: 'old stone gathers ×3 as fast, polyps feed ×0.7',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 0.7, readings: 1, silt: 1, old: 3,
    trial: { goal: 3000, reward: 'Stone-light: old stone pays ×2 when let go, on every reef after' } },
  { id: 'gleaming', name: 'A gleaming seamount', text: 'The water here is clear as glass and empty above: nothing falls, but everything that lives here shines.', effect: 'lucky neighbours ×3, no falling feasts',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 1, readings: 1, silt: 1, lucky: 3, noFeasts: true,
    trial: { goal: 3500, reward: 'Fortune’s child: lucky neighbours ×1.5 on every reef after' } },
  { id: 'tidal', name: 'A tidal seamount', text: 'Its top lies where two seas meet, and the moon pulls hard on both.', effect: 'great tides every other moon, spawn ×0.85',
    ventBoost: 1, ventAcid: 1, dissolve: 1, polyp: 1, readings: 1, silt: 1, tides: true,
    trial: { goal: 4000, reward: 'Moon-tied: a blue moon brings +2 more lineage on every reef after' } },
];

/**
 * Vows: once the line has reached an ending, a new reef may begin under vows, harder ways to grow that
 * pay lineage at its ending if they were kept.
 */
export type VowId = 'haste' | 'light' | 'alone' | 'still' | 'quiet';
export const VOWS: readonly { id: VowId; name: string; effect: string; lineage: number }[] = [
  { id: 'haste', name: 'Haste', effect: 'reach the surface within 7 hours of this reef’s time', lineage: 6 },
  { id: 'light', name: 'Lightness', effect: 'the spawn carries one memory fewer', lineage: 4 },
  { id: 'alone', name: 'Solitude', effect: 'no residents move in', lineage: 4 },
  { id: 'quiet', name: 'Quiet', effect: 'Ossel asks for nothing on this reef', lineage: 3 },
  { id: 'still', name: 'Stillness', effect: 'the tentacles never sweep: the reef eats only what comes to it', lineage: 5 },
];
export const VOW = { hasteHours: 7, label: 'Vows', note: 'Optional: grow the next reef a harder way, for lineage at its ending if the vow is kept.', kept: 'kept', broken: 'broken' } as const;

/** Forgetting a trait (Lineage tab). */
export const FORGET = { label: 'Forget', sure: 'Forget it?', title: 'Forget the last level of this trait: most of its lineage comes back' } as const;

export const TRAIT_GROUPS = {
  gift: { title: 'Gifts', text: 'What your children are born stronger at.' },
  way: { title: 'Ways', text: 'What your children know to do differently.' },
  habit: { title: 'Habits', text: 'What your children do without being told, while you watch.' },
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
    cost: 9, growth: 1, max: 1, kind: 'habit',
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
    cost: 10, growth: 1, max: 1, kind: 'habit',
  },
  {
    id: 'rasp-sense', name: 'Rasp sense', effect: 'while you watch, the Rasp dial keeps to the best setting for income (when you leave, for being away), and the current to its best',
    flavour: 'Your children and the Rasp have an understanding about how much is enough.',
    cost: 10, growth: 1, max: 1, kind: 'habit',
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
  {
    id: 'thorn-wise', name: 'Thorn-wise', effect: 'thorn stars and dragonfish are driven off for half even with no crabs or lamps',
    flavour: 'Your children grow spines of their own where the starfish like to climb.',
    cost: 8, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'layering', name: 'Layering', effect: 'while you watch, the reef lays down a band itself when one costs under a tenth of its calcite',
    flavour: 'Laying stone is a habit now, like breathing.',
    cost: 12, growth: 1, max: 1, kind: 'habit',
  },
  {
    id: 'shell-finder', name: 'Shell-finder', effect: 'a shell lies on the sand twice as long',
    flavour: 'They know the sound a shell makes when the wave sets it down.',
    cost: 6, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'signal-wise', name: 'Signal-wise', effect: 'the shoals’ patterns are one light shorter',
    flavour: 'Your children were raised among lanternfish, and half know the patterns already.',
    cost: 8, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'moon-born', name: 'Moon-born', effect: 'the full-moon spawning can bring up to 5 lineage on a reef, not 3',
    flavour: 'Every one of them was released under a full moon, and they answer it.',
    cost: 14, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'sun-shy', name: 'Sun-shy', effect: 'an open reef closes by itself while the water runs warm, and opens again after (away too)',
    flavour: 'Your children feel the warmth coming in their skins, and fold before it reaches them.',
    cost: 8, growth: 1, max: 1, kind: 'habit',
  },
  {
    id: 'deep-larder', name: 'Deep larder', effect: 'the feeders can go into each rising twice',
    flavour: 'Your shoals learned to eat, rest in the branches, and go back for more.',
    cost: 10, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'grain-sense', name: 'Grain-sense', effect: 'while you watch, a band waiting for its grain sets like the last one you chose',
    flavour: 'Your stone remembers how it likes to set.',
    cost: 6, growth: 1, max: 1, kind: 'habit',
  },
  {
    id: 'light-boned', name: 'Light-boned', effect: 'old stone grows on the tips 40% faster and pays 30% more when let go, per level',
    flavour: 'Your line does not keep what it does not need, and is the stronger for it.',
    cost: 5, growth: 2, max: 2, kind: 'way',
  },
  {
    id: 'lucky-line', name: 'Lucky line', effect: 'lucky neighbours come twice as often',
    flavour: 'Something in the sea seems to like your line. Nobody knows why. Nobody asks.',
    cost: 8, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'star-gazer', name: 'Star-gazer', effect: 'shooting stars fall at the Breach twice as often',
    flavour: 'Your line learned to look up, and the sky seems to have noticed.',
    cost: 7, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'gentle', name: 'Gentle', effect: 'creatures you free from trouble pay twice as much',
    flavour: 'Your line is known for it: small things in trouble come to your branches first.',
    cost: 5, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'helping', name: 'Helping habit', effect: 'while you watch, the reef frees a creature in trouble itself when you leave it twenty seconds, for half',
    flavour: 'Your polyps reach for small things in trouble before you have quite noticed them.',
    cost: 6, growth: 1, max: 1, kind: 'habit',
  },
  {
    id: 'long-rhythm', name: 'Long rhythm', effect: 'sweeps in a row build twice as far (up to ×3)',
    flavour: 'Your polyps keep a beat their parents taught them, and keep it longer.',
    cost: 6, growth: 1, max: 1, kind: 'way',
  },
  {
    id: 'foster', name: 'Foster', effect: 'the reef can take in eight drifting fragments, not five',
    flavour: 'Your line makes room for what the current brings, whoever it came from.',
    cost: 6, growth: 1, max: 1, kind: 'way',
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
export type BoonId = 'currents' | 'lamps' | 'quick-stone' | 'warm-heart' | 'roots' | 'welcome' | 'near-ruins' | 'clear-voices' | 'kind-shallows' | 'bright-water' | 'brittle-tips';
export const BOONS: readonly { id: BoonId; name: string; effect: string }[] = [
  { id: 'currents', name: 'Rich currents', effect: 'calcite ×1.15 on this reef' },
  { id: 'lamps', name: 'Early lamps', effect: 'start with 4 shoals feeding' },
  { id: 'quick-stone', name: 'Quick stone', effect: 'bands ×0.9 on this reef' },
  { id: 'warm-heart', name: 'A warm heart', effect: 'glow ×1.3 on this reef' },
  { id: 'roots', name: 'Deep roots', effect: 'calcite dissolves ×0.85 on this reef' },
  { id: 'welcome', name: 'A welcoming sea', effect: 'gifts from neighbours ×2 on this reef' },
  { id: 'near-ruins', name: 'Near ruins', effect: 'expeditions take half as long on this reef' },
  { id: 'clear-voices', name: 'Clear voices', effect: 'Readings and the Rasp’s words cost ×0.8 on this reef' },
  { id: 'kind-shallows', name: 'Kind shallows', effect: 'open polyps bleach half as fast on this reef' },
  { id: 'bright-water', name: 'Bright water', effect: 'milky seas last twice as long on this reef' },
  { id: 'brittle-tips', name: 'Brittle tips', effect: 'old stone pays ×2 when let go on this reef' },
];
export const BOON_TEXT = {
  kicker: 'A new seamount', head: 'Something here is on your side. Choose one:',
  earnedKicker: 'Ossel is pleased', earnedHead: 'Ten things asked, ten things done. Something here is on your side now. Choose one:',
} as const;
