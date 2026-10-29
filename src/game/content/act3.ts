// Act III — The Twilight Shelf. Silt, the Rasp, sand, and the truce.

import type { Band, UpgradeDef } from './types.ts';

export const ACT3 = {
  /** Height where the shelf starts collecting silt. */
  from: 3000,
  /** Silt/s falling on the reef at the shelf's foot, growing upslope. */
  siltFall: 40,
  siltGrowthPer: 300,
  /** Calcite × 1 / (1 + silt / smotherHalf). */
  smotherHalf: 100,
  /** Fraction of silt swept away per second: the shelf's natural current, plus per sand bar. */
  naturalSweep: 0.1,
  flowSweep: 0.03,
  /** Per admitted Rasp: silt cleared per second (fraction), sand ground, calcite eaten (leak). */
  raspSweep: 0.03,
  raspSand: 2,
  raspEat: 1e-5,
  /** Polite Rasp (silt-only terms) take this share of what the others eat. */
  politeEat: 0.9,
  /** Sand settles back into the shelf slowly. */
  sandSettle: 1 / 1200,
  /** Rasp admitted per grazing ground cleared. */
  raspPerGround: 4,
  channelPlankton: 1.4,
  /** Each sand bar steers mineral water into the reef: calcite ×. */
  sandbarCalcite: 1.12,
} as const;

export const UPGRADES_ACT3: readonly UpgradeDef[] = [
  {
    id: 'grounds', name: 'Clear a grazing ground',
    flavour: 'Let a stretch of old stone go dead and soft. Somebody will want it.',
    currency: 'calcite', baseCost: 2e7, growth: 1.7, maxLevel: Infinity, reveal: { band: 'twilight' },
  },
  {
    id: 'sandbar', name: 'Raise a sand bar',
    flavour: 'Heap the ground stone where the water bends. The water bends further.',
    currency: 'sand', baseCost: 200, growth: 1.5, maxLevel: Infinity, reveal: { band: 'twilight' },
  },
  {
    id: 'channel', name: 'Cut a feeding channel',
    flavour: 'A groove in the sand that the current likes to follow, straight into your mouths.',
    currency: 'sand', baseCost: 600, growth: 2.2, maxLevel: 6, reveal: { band: 'first-words' },
  },
  {
    id: 'grotto', name: 'Hollow a grotto',
    flavour: 'Leave a hollow in the stone as you grow round it: dark, sheltered, and someone’s to live in.',
    currency: 'sand', baseCost: 3000, growth: 5, maxLevel: 2, reveal: { band: 'twilight' },
  },
];

export type MeetingId = 'terms' | 'story' | 'wall';
export type Choice = 'a' | 'b';

export type Meeting = {
  id: MeetingId;
  /** Murmurs needed to have learned enough of the Rasp's words. */
  words: number;
  /** Band that must have been read first. */
  after: string;
  title: string;
  text: string;
  a: { label: string; effect: string; text: string };
  b: { label: string; effect: string; text: string };
};

export const MEETINGS: readonly Meeting[] = [
  {
    id: 'terms', words: 8000, after: 'grinding', title: 'Terms of grazing',
    text: 'Three Rasp come close enough to talk, beaks clacking, eyes on your stone. The biggest one ' +
      'says, in words your scouts have only half learned: “Dead stone is food. You have dead stone. ' +
      'We have hunger. What do you give?”',
    a: {
      label: 'The dead wall', effect: '+4 Rasp can graze · sand ×1.25',
      text: 'You offer them the old dead wall beside you. The Rasp whoop. Ossel says, very ' +
        'quietly, “That is me,” and then nothing else for a long time.',
    },
    b: {
      label: 'Only the silt', effect: '+2 Rasp can graze · they eat less calcite · clear silt ×1.5',
      text: 'You offer them the silt and nothing else. The big Rasp considers this, then shrugs ' +
        'with its whole body. “Thin food. But polite.” They graze around your stone like guests.',
    },
  },
  {
    id: 'story', words: 15000, after: 'sand', title: 'Whose story',
    text: '“The old reef,” the Rasp say, “the tall one. It built a wall and we starved outside it. ' +
      'Then it died, and fell, and now it falls on everyone.” They wait. They want to hear how you ' +
      'remember it.',
    a: {
      label: 'As the bands tell it', effect: 'Rasp clear silt ×2 as fast',
      text: 'You tell them what the Readings said: the slowing water, the fear bands, the wall. The ' +
        'Rasp are quiet. Then the big one presses its beak to your stone, gently, the way you would ' +
        'touch something you meant to keep.',
    },
    b: {
      label: 'As Ossel tells it', effect: 'reach grows faster with height',
      text: 'You tell them Ossel’s version: a great reef, wronged by thieves. The Rasp listen, and ' +
        'clack, and keep their distance. Ossel is warm in a way you have not felt from it before. ' +
        '“Thank you,” it says. “Someone should remember us kindly.”',
    },
  },
  {
    id: 'wall', words: 22000, after: 'shelf-edge', title: 'Ossel’s wall',
    text: 'Ossel speaks first, before the Rasp can. “I have been listening to the bands too,” it ' +
      'says. “I was the wall. I kept them out, and the water stopped, and we all died behind me. ' +
      'I do not know if I want to be kept.”',
    a: {
      label: 'Let Ossel be ground', effect: 'silt falls ×0.6 · a flood of sand',
      text: 'The Rasp are careful, and slow, and almost tender. Ossel talks the whole time, about ' +
        'nothing: the taste of the vent, the first lanternfish, you. Then there is only sand, warm, ' +
        'everywhere, and in it, faint, the shape of a voice that is not afraid any more.',
    },
    b: {
      label: 'Keep Ossel', effect: 'calcite ×1.25',
      text: '“No,” you say. “Come with me.” You grow a branch around the old wall and carry it up ' +
        'with you, stone in stone. The Rasp clack, disappointed, and graze elsewhere. Ossel does not ' +
        'say thank you. It does not need to.',
    },
  },
];

export const BANDS_ACT3: readonly Band[] = [
  {
    id: 'grinding', metres: 3050, title: 'The grinding',
    text: 'Upslope, among boulders furred with silt, something is eating stone. Beaks like fused ' +
      'teeth, scales like old coins, a sound like a mill. They see your glow and freeze. “The Rasp,” ' +
      'Ossel hisses. “Do not let them near you.” The silt is already thick on your lower branches.',
  },
  {
    id: 'blue-hour', metres: 3125, title: 'The blue hour',
    text: 'For a while each day the light from above and the dark from below are exactly even, and everything on ' +
      'the shelf is the same deep blue, fish and stone and you. Ossel calls it the only fair hour.',
  },
  {
    id: 'first-words', metres: 3200, title: 'First words',
    text: 'Your scouts have been listening to the Rasp instead of the buried bands. It turns out the ' +
      'grinding has a grammar. Most of the words are about food. Some are about a wall.',
  },
  {
    id: 'beak-marks', metres: 3275, title: 'Beak marks',
    text: 'On a dead branch low on your stone you find the marks of a Rasp beak: neat, patient, curved. It took only ' +
      'what was already dead. You did not even notice it happening.',
  },
  {
    id: 'sand', metres: 3350, title: 'Sand',
    text: 'Where the Rasp have grazed, the dead stone is gone and the silt with it, and what is left ' +
      'is sand: clean, pale, moving with the current. Your polyps open in the clear water like ' +
      'they have been holding their breath.',
  },
  {
    id: 'truth', metres: 3500, title: 'What the silt is',
    text: 'A grain of the Long Silt settles on a polyp, and the polyp tastes it, and you know. It ' +
      'is a band. Every grain is a crumb of a band. The Long Silt is Thousandfold, ground down by ' +
      'the sea after it died: four hundred years of a city that would not let anything go, falling ' +
      'on everyone forever.',
  },
  {
    id: 'shelf-edge', metres: 3650, title: 'The shelf edge',
    text: 'The water above you is blue now, properly blue, and full of moving shapes. The ripple ' +
      'far overhead has become a ceiling of light. Ossel has been silent for three bands.',
  },
  {
    id: 'old-rasp', metres: 3725, title: 'How the Rasp end',
    text: 'A Rasp, very old, its beak worn down to a stub, lies on the slope by your foot and does ' +
      'not get up. By morning the others have ground it into the sand bars, the way they grind ' +
      'everything. Nobody mourns. “Or that is the mourning,” Ossel says, very quietly.',
  },
  {
    id: 'colour', metres: 3800, title: 'Colour',
    text: 'A shaft of light reaches your crown and your polyps are not grey. They are rose, and ' +
      'gold, and a green you had no word for. The sun. You have never seen the sun.',
  },
];

// The elder's riddles: once the truce has begun, the Rasp elder asks about what the bands told.
// A right answer: lineage. Each asked once per reef, after the band, Reading or relic that holds its answer.
export type RiddleId = 'silt' | 'wall' | 'walls' | 'song' | 'beaks' | 'shallows' | 'rule' | 'ripple' | 'end' | 'children' | 'weight' | 'burning';
export const RIDDLES: readonly { id: RiddleId; after: string; ask: string; options: readonly string[]; right: number }[] = [
  { id: 'silt', after: 'truth', ask: 'You have read the falling grey. What is it?', options: ['Snow from the sky', 'Thousandfold, ground fine', 'Our dung'], right: 1 },
  { id: 'wall', after: 'form', ask: 'The voice in your oldest stone. What was it, once?', options: ['A Rasp', 'A wall of the city', 'The moon'], right: 1 },
  { id: 'walls', after: 'storm', ask: 'Why did the city die?', options: ['We killed it', 'It kept everything, and choked', 'The sun burned it'], right: 1 },
  { id: 'song', after: 'rasp-song', ask: 'What did we keep in our own band?', options: ['Nothing: Rasp do not remember', 'The sound of grinding, kept with care', 'The city’s songs, stolen'], right: 1 },
  { id: 'beaks', after: 'midden', ask: 'The beaks behind the outer wall. Whose were they?', options: ['Ours, the ones who died at the walls', 'Fish the city ate', 'Birds from above'], right: 0 },
  { id: 'rule', after: 'forgetting', ask: 'Your old wall lived by one rule. What was it?', options: ['Keep everything', 'Forget everything', 'Keep only the songs'], right: 0 },
  { id: 'ripple', after: 'shelf-edge', ask: 'From the floor you saw a ripple of silver, far above. What was it?', options: ['Another reef', 'The surface, under the moon', 'A shoal of us, swimming'], right: 1 },
  { id: 'end', after: 'old-rasp', ask: 'When one of us is too old to grind, what becomes of it?', options: ['It is buried in the silt', 'The others grind it into the sand bars', 'It swims up into the light'], right: 1 },
  { id: 'children', after: 'other-children', ask: 'While the silt fell, was the whole sea dead?', options: ['All of it, everywhere', 'Only the deep, and only for a while', 'None of it: the silt was alive'], right: 1 },
  { id: 'burning', after: 'burning-sea', ask: 'The night the whole sea burned white. What did the city make of it?', options: ['A warning from the moon', 'An omen, and it argued for a hundred years about what of', 'Nothing: it slept through it'], right: 1 },
  { id: 'weight', after: 'kept-stone', ask: 'The grey on the city’s tips. Why did it never let it go?', options: ['It could not reach its own tips', 'It thought keeping was strength', 'We would not eat it'], right: 1 },
  { id: 'shallows', after: 'sun-gate', ask: 'Where did the city first grow?', options: ['In the dark, as it ended', 'In the shallows, open to the sun', 'On a beach, in the air'], right: 1 },
];
export const RIDDLE = { kicker: 'The Rasp elder asks', lineage: 2, right: 'The elder grinds its beak, pleased.', wrong: 'The elder turns away. Not this time.',
  /** Every riddle answered rightly on one reef: the elder's blessing. */
  blessing: 'The elder bows its old head to you. Its herd grinds ×1.2 sand for the rest of this reef.', blessed: 1.2 } as const;

// Favours: once the first meeting is settled, the Rasp can be asked for things, paid in sand.
// Each is dearer every time it is asked (cost × growth^times).
export type FavourId = 'clear' | 'path' | 'carry' | 'hollow';
export const FAVOURS: readonly { id: FavourId; name: string; effect: string; cost: number; growth: number; max: number }[] = [
  { id: 'clear', name: 'Turn the silt aside', effect: 'silt swept +0.02/s, for good', cost: 3000, growth: 1.6, max: 10 },
  { id: 'path', name: 'Grind a path', effect: '+2 shoals', cost: 8000, growth: 2, max: 5 },
  { id: 'carry', name: 'Carry stone up', effect: '3 minutes of calcite now', cost: 5000, growth: 1.5, max: Infinity },
  { id: 'hollow', name: 'Grind a hollow', effect: '+1 home for a resident', cost: 20000, growth: 1, max: 1 },
];
export const FAVOUR_TEXT = { head: 'Ask the Rasp', done: 'done' } as const;

/**
 * Upwellings (Twilight Shelf, while watching): now and then cold water wells up on one side of the
 * reef for a minute; turning the current toward it (or setting it that way again) catches a haul.
 */
/** Fanning shoals (a job on the shelf): silt swept per shoal per second. */
/** Guarding (Sunlit Crown on): with `need` shoals on guard, intruders are driven off in their last second, for half. */
export const GUARD = { from: 3800, need: 4, locked: 'only in the light, where gulls and snakes hunt',
  what: (n: number, need: number) => n >= need ? 'together they drive off intruders, for half' : `${need - n} more and they drive off intruders` } as const;

export const FAN = { sweep: 0.003, locked: 'only where silt falls, on the shelf', what: (each: string) => `silt swept +${each}/s each` } as const;

export const UPWELL = {
  period: 480, life: 60, seconds: 90,
  word: 'an upwelling',
  now: (side: number, left: string) => `Cold water welling up ${side < 0 ? 'out toward the open water' : 'along the shelf'} (${left}): turn the current that way.`,
  caught: 'from the upwelling',
} as const;

/** The current (Twilight verb): turned toward the shelf (+) it sweeps silt, toward the open water (−) it brings plankton. */
export const CURRENT = {
  steps: 2,
  siltPerStep: 0.025,
  planktonPerStep: 0.12,
  label: 'The current',
  ends: ['toward the open water', 'toward the shelf'],
  what: (c: number) => c === 0 ? 'straight along the reef' : c > 0 ? `silt swept +${(0.025 * c).toFixed(3)}/s · plankton ×${(1 - 0.12 * c).toFixed(2)}`
    : `plankton ×${(1 - 0.12 * c).toFixed(2)} · silt swept −${(0.0125 * -c).toFixed(4)}/s`,
} as const;
