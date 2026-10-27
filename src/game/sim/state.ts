// The whole game state. Plain JSON-able data so saving is a stringify.

import type { UpgradeId } from '../content/act1.ts';
import type { Job, ReadingId } from '../content/act2.ts';

export const SAVE_VERSION = 1;

export type GameState = {
  version: number;
  seed: number;
  /** Simulated seconds since the reef settled. */
  t: number;
  calcite: number;
  glow: number;
  plankton: number;
  murmurs: number;
  /** Reef height up the seamount, metres. */
  height: number;
  levels: Record<UpgradeId, number>;
  /** Shoals per job; shoals bought but not assigned are idle (levels.shoal minus the sum). */
  jobs: Record<Job, number>;
  /** Where newly called shoals go. */
  lastJob: Job;
  readings: ReadingId[];
  /** Band ids read, in order. */
  bands: string[];
  /** Sim time of the last hand sweep. */
  lastSweep: number;
  /** Lifetime totals. */
  earned: { calcite: number; glow: number; murmurs: number };
  /** Highest act reached. */
  act: number;
};

export function newGame(seed: number): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    t: 0,
    calcite: 0,
    glow: 0,
    plankton: 0,
    murmurs: 0,
    height: 0,
    levels: { polyp: 0, symbiont: 0, skeleton: 0, lattice: 0, vent: 0, lure: 0, shoal: 0 },
    jobs: { feed: 0, light: 0, scout: 0 },
    lastJob: 'feed',
    readings: [],
    bands: [],
    lastSweep: -1e9,
    earned: { calcite: 0, glow: 0, murmurs: 0 },
    act: 1,
  };
}
