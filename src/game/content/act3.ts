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
      label: 'Only the silt', effect: '+2 Rasp can graze · they eat no calcite · clear silt ×1.5',
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
      label: 'Keep Ossel', effect: 'calcite ×1.5',
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
    id: 'first-words', metres: 3200, title: 'First words',
    text: 'Your scouts have been listening to the Rasp instead of the buried bands. It turns out the ' +
      'grinding has a grammar. Most of the words are about food. Some are about a wall.',
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
