// The whole game state. Plain JSON-able data so saving is a stringify.

import type { Job, ReadingId } from '../content/act2.ts';
import type { MeetingId } from '../content/act3.ts';
import type { DialectId, DialectTier } from '../content/act4.ts';
import type { MemoryId } from '../content/act5.ts';
import type { SeamountId, TraitId } from '../content/lineage.ts';
import type { UpgradeId } from '../content/types.ts';

export const SAVE_VERSION = 1;

/** Seconds of sim time between growth-chart samples; at most HISTORY_MAX are kept (thinned by half). */
export const HISTORY_STEP = 300;
export const HISTORY_MAX = 240;

/** What survives a lesser spawning. */
export type Meta = {
  lineage: number;
  traits: Record<TraitId, number>;
  spawnings: number;
  /** Story ids (bands, readings, truce and dialect choices) seen in earlier runs. */
  seen: string[];
  /** Highest reef ever grown. */
  best: number;
  /** The name the player gave their reef ('' for none); kept across spawnings. */
  name: string;
  /** Earlier reefs of this line, one string each: "height|seamount|form|ended" (oldest first). */
  ancestors: string[];
  /** Fewest sim seconds any reef of this line took to reach the surface (0 for none yet). */
  fastest: number;
  /** Every memory any spawn has carried, and how many times the reef has reached the ending. */
  carriedEver: string[];
  endings: number;
};

export function newMeta(): Meta {
  return {
    lineage: 0,
    traits: {
      'deep-memory': 0, 'quick-budding': 0, 'old-bands': 0, 'remembered-shoals': 0, glimmer: 0,
      'kept-readings': 0, settling: 0, 'early-shoals': 0, 'rasp-kin': 0, 'glass-gardeners': 0, 'old-habits': 0, 'tide-reader': 0, 'shared-table': 0,
    },
    spawnings: 0,
    seen: [],
    best: 0,
    name: '',
    ancestors: [],
    fastest: 0,
    carriedEver: [],
    endings: 0,
  };
}

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
  /** Spawn bundles ripening for the Breach (Act V). */
  spawn: number;
  /** The memories the spawn carried; non-empty once the game has ended. */
  carried: MemoryId[];
  /** How much spawn was released at the ending (sets the lineage for beginning again). */
  released: number;
  /** Sim time of the Breach (0 until then). */
  breachedAt: number;
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
  /** Index of the last feast slot eaten (see content/events.ts). */
  feasted: number;
  /** Falling feasts caught this run. */
  feasts: number;
  /** The reef's height sampled every HISTORY_STEP sim seconds (for the growth chart). */
  history: number[];
  /** The seamount this run grows on (lesser spawnings choose; the first reef's is plain). */
  seamount: SeamountId;
  /** Lifetime totals. */
  earned: { calcite: number; glow: number; murmurs: number };
  /** Highest act reached. */
  act: number;
  meta: Meta;
};

export function newGame(seed: number, meta: Meta = newMeta()): GameState {
  const s: GameState = {
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
    spawn: 0,
    carried: [],
    released: 0,
    breachedAt: 0,
    dialects: { form: '', craft: '', spawn: '' },
    height: 0,
    levels: {
      polyp: 0, symbiont: 0, skeleton: 0, lattice: 0, vent: 0, lure: 0, shoal: 0,
      grounds: 0, sandbar: 0, channel: 0, pigment: 0, canopy: 0, meadow: 0, ripen: 0,
    },
    jobs: { feed: 0, light: 0, scout: 0 },
    lastJob: 'feed',
    readings: [],
    bands: [],
    lastSweep: -1e9,
    feasted: -1,
    feasts: 0,
    history: [],
    seamount: 'plain',
    earned: { calcite: 0, glow: 0, murmurs: 0 },
    act: 1,
    meta,
  };
  // What a lineage brings to a new seamount.
  s.levels.skeleton = 5 * meta.traits['old-bands'];
  s.levels.shoal = s.jobs.feed = 3 * meta.traits['remembered-shoals'];
  return s;
}
