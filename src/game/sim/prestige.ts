// Lesser Spawnings: let go early, start again on a new seamount, keep the Lineage.

import { MEETINGS } from '../content/act3.ts';
import { DIALECTS } from '../content/act4.ts';
import { LINEAGE, TRAITS, type Trait, type TraitId } from '../content/lineage.ts';
import { ended } from './economy.ts';
import { newGame, type GameState, type Meta } from './state.ts';

/** Lineage a spawning released now would bring. */
export function lineageFor(s: GameState): number {
  const base = Math.floor(LINEAGE.perRoot * Math.sqrt(Math.max(0, s.height) / 60));
  const frag = s.dialects.spawn === 'fragmenting' ? LINEAGE.fragmentingBonus : 1;
  return Math.floor(base * frag) + (ended(s) ? LINEAGE.endingBonus : 0);
}

export function canSpawnLesser(s: GameState): boolean {
  return s.bands.includes(LINEAGE.unlockBand) || ended(s);
}

/** Every story id this run has seen, for the meta's memory of what not to pop again. */
function storiesOf(s: GameState): string[] {
  const out = [...s.bands, ...s.readings];
  for (const m of MEETINGS) if (s.truce[m.id]) out.push(`truce:${m.id}`);
  for (const d of DIALECTS) if (s.dialects[d.tier] === d.id) out.push(`dialect:${d.id}`);
  return out;
}

/**
 * Release a lesser spawning (or, after the ending, begin again): a new run on a new seamount
 * that keeps the lineage. Returns the new state, or null if it is not allowed yet.
 */
export function spawnLesser(s: GameState): GameState | null {
  if (!canSpawnLesser(s)) return null;
  const meta: Meta = structuredClone(s.meta);
  meta.lineage += lineageFor(s);
  meta.spawnings += 1;
  meta.best = Math.max(meta.best, s.height);
  meta.seen = [...new Set([...meta.seen, ...storiesOf(s)])];
  // A new seamount: a new world seed derived from the old one.
  const seed = (Math.imul(s.seed ^ 0x9e3779b9, 2654435761) + meta.spawnings) >>> 0;
  return newGame(seed, meta);
}

export function traitDef(id: TraitId): Trait {
  return TRAITS.find((t) => t.id === id)!;
}

export function traitCost(s: GameState, id: TraitId): number {
  const t = traitDef(id);
  return Math.ceil(t.cost * t.growth ** s.meta.traits[id]);
}

export function traitMaxed(s: GameState, id: TraitId): boolean {
  return s.meta.traits[id] >= traitDef(id).max;
}

export function buyTrait(s: GameState, id: TraitId): boolean {
  if (traitMaxed(s, id)) return false;
  const c = traitCost(s, id);
  if (s.meta.lineage < c) return false;
  s.meta.lineage -= c;
  s.meta.traits[id] += 1;
  return true;
}
