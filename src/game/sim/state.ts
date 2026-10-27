// The whole game state. Plain JSON-able data so saving is a stringify.

import type { Job, ReadingId } from '../content/act2.ts';
import type { MeetingId } from '../content/act3.ts';
import type { DialectId, DialectTier } from '../content/act4.ts';
import type { UpgradeId } from '../content/types.ts';

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
  /** Silt lying on the reef (Act III); smothers the polyps. */
  silt: number;
  sand: number;
  /** Rasp admitted to graze (the Act III dial). */
  rasp: number;
  /** Photosynthetic sugar (Act IV). */
  bloom: number;
  /** Dialects chosen per tier ('' until chosen). */
  dialects: Record<DialectTier, DialectId | ''>;
  /** Truce choices: '' until made, then 'a' or 'b'. */
  truce: Record<MeetingId, '' | 'a' | 'b'>;
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
    silt: 0,
    sand: 0,
    rasp: 0,
    truce: { terms: '', story: '', wall: '' },
    bloom: 0,
    dialects: { form: '', craft: '', spawn: '' },
    height: 0,
    levels: {
      polyp: 0, symbiont: 0, skeleton: 0, lattice: 0, vent: 0, lure: 0, shoal: 0,
      grounds: 0, sandbar: 0, channel: 0, pigment: 0, canopy: 0,
    },
    jobs: { feed: 0, light: 0, scout: 0 },
    lastJob: 'feed',
    readings: [],
    bands: [],
    lastSweep: -1e9,
    earned: { calcite: 0, glow: 0, murmurs: 0 },
    act: 1,
  };
}
