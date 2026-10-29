// Every upgrade in the game, in panel order, and their one-line effect texts.

import { ACT1, UPGRADES_ACT1 } from './act1.ts';
import { UPGRADES_ACT2 } from './act2.ts';
import { ACT3, UPGRADES_ACT3 } from './act3.ts';
import { ACT4, UPGRADES_ACT4 } from './act4.ts';
import { ACT5, UPGRADES_ACT5 } from './act5.ts';
import type { UpgradeDef, UpgradeId } from './types.ts';

export const UPGRADES: readonly UpgradeDef[] = [...UPGRADES_ACT1, ...UPGRADES_ACT2, ...UPGRADES_ACT3, ...UPGRADES_ACT4, ...UPGRADES_ACT5];

/** The band card's note when a story gate holds the reef (sim/economy.ts capReason). */
export const GATE_TEXT = {
  reading: 'until your scouts read “Inside the wall”',
  wall: 'until you and the Rasp decide about Ossel’s wall',
  'spawn-dialect': 'until you choose a way of spawning',
  surface: 'As high as it goes',
  daughter: 'until another daughter settles (one per 15 polyps)',
  lonely: 'no more shoals come this far out',
} as const;

export function effectText(id: UpgradeId): string {
  switch (id) {
    case 'polyp': return `+${ACT1.polypRate} calcite/s`;
    case 'skeleton': return 'the reef rises';
    case 'symbiont': return `+${ACT1.symbiontGlow} glow/s`;
    case 'lattice': return `calcite dissolves ${Math.round((1 - ACT1.latticeFactor) * 100)}% slower: the reef holds more while you are away`;
    case 'lure': return `glow can lure up to +${Math.round(ACT1.lureMaxPerPattern * 100)}% more calcite`;
    case 'vent': return `×${ACT1.ventBoost} calcite, but it dissolves ×${ACT1.ventAcid} faster`;
    case 'shoal': return 'a lanternfish shoal joins the reef';
    case 'daughter': return '+1 lineage at your next spawning (one per daughter at your foot)';
    case 'grounds': return `room for ${ACT3.raspPerGround} more Rasp`;
    case 'sandbar': return `more current: sweeps silt, calcite ×${ACT3.sandbarCalcite}`;
    case 'channel': return `plankton ×${ACT3.channelPlankton}`;
    case 'pigment': return `bloom ×${ACT4.pigmentBloom}`;
    case 'meadow': return `bloom ×${ACT4.meadowBloom}`;
    case 'canopy': return `sunlight ×${ACT4.canopySun}`;
    case 'ripen': return `spawn ×${ACT5.ripenSpawn}`;
    case 'cay': return 'spawn ×1.1 (sheltered water)';
  }
}
