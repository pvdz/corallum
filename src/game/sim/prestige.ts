// Lesser Spawnings: let go early, start again on a new seamount, keep the Lineage.

import { MOMENTS } from '../content/moments.ts';
import { MEETINGS } from '../content/act3.ts';
import { DIALECTS } from '../content/act4.ts';
import { HABIT_SHARE, LINEAGE, TRAITS, type SeamountId, type Trait, type TraitId } from '../content/lineage.ts';
import { assign, balanceFeedLight, cost, ended, maxed, idleShoals, jobGain, raspMax, raspSettings, revealed, setRasp, spawnTarget } from './economy.ts';
import { newGame, type GameState, type Meta } from './state.ts';

/** Lineage a spawning released now would bring. */
export function lineageFor(s: GameState): number {
  const base = Math.floor(LINEAGE.perRoot * Math.sqrt(Math.max(0, s.height) / 60));
  const frag = s.dialects.spawn === 'fragmenting' ? LINEAGE.fragmentingBonus : 1;
  return Math.floor(base * frag) + (s.moments.storm === 'a' ? 2 : 0) + s.levels.daughter + (ended(s) ? endingLineage(s, s.released) : 0);
}

/** The ending's lineage for a release of this much spawn. */
export function endingLineage(s: GameState, released: number): number {
  return LINEAGE.endingBonus + Math.floor(LINEAGE.releaseBonus * Math.log2(Math.max(1, released / spawnTarget(s))));
}

export function canSpawnLesser(s: GameState): boolean {
  return s.bands.includes(LINEAGE.unlockBand) || ended(s);
}

/** Every story id this run has seen, for the meta's memory of what not to pop again. */
function storiesOf(s: GameState): string[] {
  const out = [...s.bands, ...s.readings, ...MOMENTS.filter((m) => s.moments[m.id]).map((m) => `m:${m.id}`), ...s.relics.map((id) => `x:${id}`)];
  for (const m of MEETINGS) if (s.truce[m.id]) out.push(`truce:${m.id}`);
  for (const d of DIALECTS) if (s.dialects[d.tier] === d.id) out.push(`dialect:${d.id}`);
  return out;
}

/**
 * Release a lesser spawning (or, after the ending, begin again): a new run on a new seamount
 * that keeps the lineage. Returns the new state, or null if it is not allowed yet.
 */
export function spawnLesser(s: GameState, where: SeamountId = 'plain'): GameState | null {
  if (!canSpawnLesser(s)) return null;
  const meta: Meta = structuredClone(s.meta);
  meta.lineage += lineageFor(s);
  meta.spawnings += 1;
  meta.best = Math.max(meta.best, s.height);
  meta.seen = [...new Set([...meta.seen, ...storiesOf(s)])];
  meta.ancestors = [...meta.ancestors, `${Math.round(s.height)}|${s.seamount}|${s.dialects.form}|${ended(s) ? 1 : 0}`].slice(-40);
  // A new seamount: a new world seed derived from the old one.
  const seed = (Math.imul(s.seed ^ 0x9e3779b9, 2654435761) + meta.spawnings) >>> 0;
  const next = newGame(seed, meta);
  next.seamount = where;
  return next;
}

/**
 * Old habits: what the reef would buy on its own right now (a polyp or glimmerseed costing under
 * HABIT_SHARE of the calcite held), or null. Only called while the player watches: never offline.
 */
export function habitPurchase(s: GameState): 'polyp' | 'symbiont' | 'skeleton' | null {
  // Layering: a band when it is cheap (and not held by a story gate).
  if (s.meta.traits.layering && revealed(s, 'skeleton') && !maxed(s, 'skeleton') && cost(s, 'skeleton') < HABIT_SHARE * s.calcite) return 'skeleton';
  if (!s.meta.traits['old-habits']) return null;
  const cheap = (id: 'polyp' | 'symbiont') => revealed(s, id) && cost(s, id) < HABIT_SHARE * s.calcite;
  const p = cheap('polyp'), g = cheap('symbiont');
  if (p && g) return cost(s, 'polyp') <= cost(s, 'symbiont') ? 'polyp' : 'symbiont';
  return p ? 'polyp' : g ? 'symbiont' : null;
}

/** Shoal sense: place idle shoals and rebalance feed/light. Returns whether anything moved. */
export function shoalSense(s: GameState): boolean {
  if (!s.meta.traits['shoal-sense']) return false;
  let moved = false;
  while (idleShoals(s) > 0 && assign(s, jobGain(s, 'feed') >= jobGain(s, 'light') ? 'feed' : 'light', 1)) moved = true;
  return balanceFeedLight(s) || moved;
}

/** Rasp sense: the dial to the best setting for watching (income) or for being away (hold). */
export function raspSense(s: GameState, away: boolean): void {
  if (!s.meta.traits['rasp-sense'] || raspMax(s) === 0) return;
  const best = raspSettings(s);
  setRasp(s, away ? best.forHold : best.forIncome);
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
