// The water's moods in the sim: which water is in a slot, when it turns, and its price factors.

import { actAt } from '../content/acts.ts';
import type { UpgradeId } from '../content/types.ts';
import { WATER, WATERS, type Water } from '../content/waters.ts';
import { trait } from './modifiers.ts';
import { mulberry32 } from './rng.ts';
import type { GameState } from './state.ts';

const STILL = WATERS[0]!;

/**
 * The water in time slot k (the current one by default): seeded per reef, drawn from the kinds that
 * come in the reef's zone, still before the reef has risen out of the silt.
 */
export function waterAt(s: GameState, k = Math.floor(s.t / WATER.period)): Water {
  if (!s.bands.includes(WATER.band)) return STILL;
  const zone = actAt(s.height);
  const pool = WATERS.filter((w) => w.zones.includes(zone));
  const r = mulberry32((s.seed ^ 0x3a7e1) + Math.imul(k, 0x85ebca6b));
  let x = r() * pool.reduce((a, w) => a + w.weight, 0);
  for (const w of pool) if ((x -= w.weight) < 0) return w;
  return STILL;
}

/** Seconds until the water turns. */
export function untilWaterTurns(s: GameState): number {
  return (Math.floor(s.t / WATER.period) + 1) * WATER.period - s.t;
}

/** A water's price factor for this reef (Water-wise deepens it). */
export function deep(s: GameState, w: Water): number {
  return w.factor < 1 ? w.factor - 0.1 * trait(s, 'water-wise') : 1;
}

export function waterFactor(s: GameState, id: UpgradeId): number {
  const w = waterAt(s);
  return w.upgrades.includes(id) ? deep(s, w) : 1;
}

export function murmurFactor(s: GameState): number {
  const w = waterAt(s);
  return w.murmurs ? deep(s, w) : 1;
}
