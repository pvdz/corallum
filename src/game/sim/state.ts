// The whole game state. Plain JSON-able data so saving is a stringify.

import type { UpgradeId } from '../content/act1.ts';

export const SAVE_VERSION = 1;

export type GameState = {
  version: number;
  seed: number;
  /** Simulated seconds since the reef settled. */
  t: number;
  calcite: number;
  glow: number;
  /** Reef height above the seamount, metres. */
  height: number;
  levels: Record<UpgradeId, number>;
  /** Band ids read, in order. */
  bands: string[];
  /** Sim time of the last hand sweep. */
  lastSweep: number;
  /** Lifetime totals. */
  earned: { calcite: number; glow: number };
  act: number;
};

export function newGame(seed: number): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    t: 0,
    calcite: 0,
    glow: 0,
    height: 0,
    levels: { polyp: 0, symbiont: 0, skeleton: 0, lattice: 0, vent: 0, lure: 0 },
    bands: [],
    lastSweep: -1e9,
    earned: { calcite: 0, glow: 0 },
    act: 1,
  };
}
