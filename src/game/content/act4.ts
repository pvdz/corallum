// Act IV — The Sunlit Crown. Sunlight, bloom, pigments, canopy, and the dialects.

import type { Band, UpgradeDef } from './types.ts';

export const ACT4 = {
  from: 3800,
  /** Sunlight per symbiont colony at the bottom of the zone; grows toward the surface. */
  sunBase: 0.2,
  sunGrowthPer: 60,
  bloomFade: 1 / 900,
  /** Calcite × 1 + sqrt(bloom) / bloomDiv. */
  bloomDiv: 150,
  pigmentBloom: 1.25,
  canopySun: 1.2,
  /** Seagrass meadows on the sand flats: bloom × this per meadow (paid in sand, so the Rasp matter). */
  meadowBloom: 1.15,
} as const;

export const UPGRADES_ACT4: readonly UpgradeDef[] = [
  {
    id: 'pigment', name: 'Grow a pigment',
    flavour: 'Rose to shade the symbionts, gold to feed them, a green you have no word for yet.',
    currency: 'calcite', baseCost: 2e9, growth: 2, maxLevel: 12, reveal: { band: 'colour' },
  },
  {
    id: 'canopy', name: 'Spread the canopy',
    flavour: 'Lean every branch toward the light, the way the light leans toward you.',
    currency: 'bloom', baseCost: 400, growth: 2.4, maxLevel: Infinity, reveal: { band: 'colour' },
  },
  {
    id: 'meadow', name: 'Sow a seagrass meadow',
    flavour: 'The Rasp’s sand, spread in the light, and grass that feeds whatever lives in it.',
    currency: 'sand', baseCost: 8000, growth: 1.3, maxLevel: 12, reveal: { band: 'colour' },
  },
];

export type DialectTier = 'form' | 'craft' | 'spawn';
export type DialectId =
  | 'branching' | 'massive' | 'plating'
  | 'fluorescent' | 'sweepers' | 'mucus'
  | 'broadcast' | 'brooding' | 'fragmenting';

export type Dialect = { id: DialectId; tier: DialectTier; name: string; effect: string; flavour: string };

export const TIERS: readonly { tier: DialectTier; title: string; band: string; cost: number; intro: string }[] = [
  {
    tier: 'form', title: 'Form', band: 'form', cost: 20000,
    intro: 'Sunlit reefs grow in shapes, and each shape is a way of being in the light.',
  },
  {
    tier: 'craft', title: 'Craft', band: 'craft', cost: 80000,
    intro: 'Every reef up here has a trick. You can only learn one well.',
  },
  {
    tier: 'spawn', title: 'Spawning', band: 'way-of-spawning', cost: 250000,
    intro: 'How a reef lets go of its children is the last thing it decides.',
  },
];

export const DIALECTS: readonly Dialect[] = [
  {
    id: 'branching', tier: 'form', name: 'Branching', effect: 'laying bands costs ×0.6',
    flavour: 'Antlers of stone, thin and quick, reaching. Breaks easily, grows back faster.',
  },
  {
    id: 'massive', tier: 'form', name: 'Massive', effect: 'calcite ×1.5 · it dissolves ×0.5 as fast',
    flavour: 'One great dome, slow as a boulder, that the sea cannot get its teeth into.',
  },
  {
    id: 'plating', tier: 'form', name: 'Plating', effect: 'sunlight ×2',
    flavour: 'Wide flat tables, stacked like shelves, every one of them a hand held up to the sun.',
  },
  {
    id: 'fluorescent', tier: 'craft', name: 'Fluorescent', effect: 'bloom ×1.5 · the lure reaches +2',
    flavour: 'Turn the sun into colours of your own and wear them where everything can see.',
  },
  {
    id: 'sweepers', tier: 'craft', name: 'Sweeper tentacles', effect: 'plankton ×3',
    flavour: 'Long tentacles that come out at dusk and comb the water clean of food.',
  },
  {
    id: 'mucus', tier: 'craft', name: 'Mucus nets', effect: 'silt swept ×2 · the Rasp eat nothing',
    flavour: 'A fine sheet of slime that catches what falls and lets it go, cleanly, when you choose.',
  },
  {
    id: 'broadcast', tier: 'spawn', name: 'Broadcast', effect: 'spawn ×2',
    flavour: 'Everything at once, into the open water, and trust the sea with the rest.',
  },
  {
    id: 'brooding', tier: 'spawn', name: 'Brooding', effect: 'the Breach needs ×0.6 the spawn',
    flavour: 'Fewer children, kept close, and only let go when they are ready to swim.',
  },
  {
    id: 'fragmenting', tier: 'spawn', name: 'Fragmenting', effect: 'Lesser Spawnings give ×1.5 Lineage',
    flavour: 'Let a branch break and drift and take root somewhere else, still remembering you.',
  },
];

export const BANDS_ACT4: readonly Band[] = [
  {
    id: 'sunburn', metres: 3815, title: 'Too much light',
    text: 'At noon the light is so strong it hurts. Your polyps close against it and open again at ' +
      'dusk, and the glimmerseed sulks. Every reef up here has learned to live with it. You will ' +
      'have to learn too: what to grow, and how, and for what.',
  },
  {
    id: 'form', metres: 3830, title: 'Shapes in the light',
    text: 'Other reefs are here: young ones, sunlit, every one a different shape. Antlers, domes, ' +
      'tables. They talk to each other in growth and colour. You realise you will have to choose ' +
      'a shape too, and that choosing one means never being the others.',
  },
  {
    id: 'other-children', metres: 3870, title: 'Other children',
    text: 'Larvae drift past you, from reefs you will never see, settling where they can. The sea ' +
      'was never dead. Only the deep was, and only for a while.',
  },
  {
    id: 'craft', metres: 3890, title: 'Ossel in the light',
    text: 'Somewhere in the shallows, the sand that was Ossel glitters when the waves move it. ' +
      'Sometimes, when the light is right, you are almost sure it is laughing.',
    kept: 'Ossel’s old wall, wrapped in your living stone, feels the sun for the first time in four ' +
      'hundred years. “It is too bright,” it says, and then, “do not stop.”',
  },
  {
    id: 'rain', metres: 3930, title: 'Rain',
    text: 'A sound you have never heard: something falling on the surface, millions of small ' +
      'somethings. Rain. The ripple overhead is now a moving ceiling, close enough to touch with ' +
      'a long branch.',
  },
  {
    id: 'way-of-spawning', metres: 3950, title: 'The way of letting go',
    text: 'The sunlit reefs are getting ready. You can feel it in the water: a held breath, all ' +
      'of them waiting for the same moon. Each will spawn the way its dialect remembers. So will you.',
  },
  {
    id: 'storm', metres: 3965, title: 'Storm',
    text: 'A storm passes over. For a day the light shakes and the water above is torn white, and ' +
      'whole branches of your crown snap and tumble down the slope. By evening you are growing ' +
      'again, though not where they were.',
    kept: 'A storm passes over. For a day the light shakes and the water above is torn white, and ' +
      'whole branches of your crown snap and tumble down the slope. “Let them,” Ossel says. “The ' +
      'bands you lose are the ones you could spare.” By evening you are growing again.',
  },
  {
    id: 'breach', metres: 3980, title: 'The breach',
    text: 'Your crown touches air. It is cold and thin and terrible and the light is everywhere. ' +
      'Above, pale in the evening, a moon is rising, not yet full.',
  },
];
