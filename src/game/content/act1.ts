// Act I — The Silt Floor. All numbers and player-facing strings for the first act.
// The economy (src/game/sim/economy.ts) reads these; tuning happens here.

export const ACT1 = {
  /** Calcite/s from the seamount's mineral seep before any polyp is budded. */
  trickle: 0.2,
  /** Calcite/s per polyp. */
  polypRate: 0.3,
  /** Glow/s per symbiont colony. */
  symbiontGlow: 0.5,
  /** Fraction of glow that fades per second. */
  glowFade: 0.08,
  /** Lure: calcite multiplier = 1 + lureMax * glow / (glow + lureHalf). */
  lureMax: 1,
  lureMaxPerPattern: 0.6,
  lureHalf: 25,
  /** Fraction of stored calcite that dissolves per second (below the lysocline). */
  dissolve: 1 / 240,
  latticeFactor: 0.72,
  ventBoost: 1.7,
  ventAcid: 1.3,
  /** Metres of target height per band of skeleton laid down. */
  bandMetres: 3,
  /** Reef height approaches its target at this rate (1/s). */
  settleRate: 1 / 40,
  /** Height that ends the act: the reef rises out of the silt into the Midnight Water. */
  goalMetres: 60,
  /** Calcite gathered by sweeping the tentacles by hand, plus seconds of production. */
  sweepFlat: 1,
  sweepSeconds: 0.25,
  sweepCooldown: 0.4,
} as const;

export type UpgradeId = 'polyp' | 'symbiont' | 'skeleton' | 'lattice' | 'vent' | 'lure' | 'shoal';
export type Currency = 'calcite' | 'glow';

export type UpgradeDef = {
  id: UpgradeId;
  name: string;
  flavour: string;
  currency: Currency;
  baseCost: number;
  growth: number;
  maxLevel: number;
  /** From this level on, cost grows by a gentler factor (later acts' pacing). */
  growthAfter?: [number, number];
  /** Shown once any of these holds (checked against levels and lifetime calcite). */
  reveal: { level?: [UpgradeId, number]; earned?: number; height?: number };
};

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'polyp', name: 'Bud a polyp',
    flavour: 'Split yourself, mouth and tentacles and all. The new one remembers being you.',
    currency: 'calcite', baseCost: 6, growth: 1.17, maxLevel: Infinity, reveal: {},
  },
  {
    id: 'skeleton', name: 'Lay down a band',
    flavour: 'A ring of stone a few cells thick, and in it everything you saw today.',
    currency: 'calcite', baseCost: 30, growth: 1.3, growthAfter: [20, 1.2], maxLevel: Infinity, reveal: { earned: 15 },
  },
  {
    id: 'symbiont', name: 'Host the glimmerseed',
    flavour: 'Tiny lights drift down with the silt. Some of them want a home.',
    currency: 'calcite', baseCost: 40, growth: 1.17, maxLevel: Infinity, reveal: { level: ['polyp', 4] },
  },
  {
    id: 'lattice', name: 'Aragonite lattice',
    flavour: 'Pack the crystals tighter. The deep water gnaws at loose stone first.',
    currency: 'calcite', baseCost: 150, growth: 2.6, maxLevel: 8, reveal: { earned: 120 },
  },
  {
    id: 'lure', name: 'Lure patterns',
    flavour: 'Pulse the lights in rings. Drifting things turn toward rings.',
    currency: 'glow', baseCost: 30, growth: 1.9, maxLevel: 6, reveal: { level: ['symbiont', 2] },
  },
  {
    id: 'vent', name: 'Root into the vent',
    flavour: 'Warm water rich with stone, and sour enough to eat it again.',
    currency: 'calcite', baseCost: 500, growth: 5, maxLevel: 3, reveal: { height: 12 },
  },
  {
    id: 'shoal', name: 'Call a shoal',
    flavour: 'Pulse the glow slow and wide. Out in the black, a hundred small lamps turn toward you.',
    currency: 'glow', baseCost: 60, growth: 1.16, maxLevel: Infinity, reveal: { height: 60 },
  },
];

export function effectText(id: UpgradeId): string {
  switch (id) {
    case 'polyp': return `+${ACT1.polypRate} calcite/s`;
    case 'skeleton': return 'the reef rises';
    case 'symbiont': return `+${ACT1.symbiontGlow} glow/s`;
    case 'lattice': return `calcite dissolves ${Math.round((1 - ACT1.latticeFactor) * 100)}% slower`;
    case 'lure': return `glow can lure up to +${Math.round(ACT1.lureMaxPerPattern * 100)}% more calcite`;
    case 'vent': return `×${ACT1.ventBoost} calcite, but it dissolves ×${ACT1.ventAcid} faster`;
    case 'shoal': return 'a lanternfish shoal joins the reef';
  }
}

/** Lore bands, read as the reef grows past their height. */
export type Band = { id: string; metres: number; title: string; text: string };

export const BANDS_ACT1: readonly Band[] = [
  {
    id: 'wake', metres: 0, title: 'Settling',
    text: 'You were a speck in the dark for a long time, and then there was stone under you. ' +
      '“Hold on,” says a voice from the dead wall beside you. “Hold on, little mouth. I am Ossel. ' +
      'I have waited a long time for someone to grow.”',
  },
  {
    id: 'silt', metres: 2, title: 'The snow that is not snow',
    text: 'It falls without end: grey, soft, patient. “The Long Silt,” Ossel says. “Four hundred ' +
      'years of it. It buried every reef in the sea. Grow faster than it falls, and you live.”',
  },
  {
    id: 'bands', metres: 6, title: 'What stone remembers',
    text: 'Your first band hardens, and you find you can feel it: the cold, the taste of the seep, ' +
      'the shape of Ossel’s voice, all written in the grain. “That is what a reef is,” Ossel says. ' +
      '“Memory, laid down so it cannot drift away.”',
  },
  {
    id: 'moon', metres: 12, title: 'The ripple',
    text: 'Far above, so far it might be imagined, the dark is a shade less dark. “The surface,” ' +
      'Ossel says. “Once a year the Spawning Moon stands over it, and every reef in the sea lets go ' +
      'of its children at once. You will want to be there.”',
  },
  {
    id: 'thousandfold', metres: 20, title: 'Thousandfold',
    text: 'Your roots touch something older under the silt: a band, thin as a breath, not yours. ' +
      'It tastes of warm water and a crowd of voices. A city of coral, wall on wall. Thousandfold, ' +
      'it calls itself, and it is very proud.',
  },
  {
    id: 'forgetting', metres: 30, title: 'Ossel’s rule',
    text: '“Keep everything,” Ossel says. “Every band. Thousandfold kept everything, and it was the ' +
      'greatest reef that ever lived.” You notice Ossel does not say what happened to it.',
  },
  {
    id: 'beaks', metres: 42, title: 'A sound in the old band',
    text: 'In Thousandfold’s band there is a sound you do not know: a grinding, like stone on stone, ' +
      'and something that might be laughter. The band stops there, as if someone wiped it.',
  },
  {
    id: 'rise', metres: 60, title: 'Out of the silt',
    text: 'Your crown clears the falling grey. Above you the water opens, black and enormous, and ' +
      'something in it is blinking. “The Midnight Water,” Ossel says, quieter than usual. ' +
      '“I have not seen it since I was young.”',
  },
];
