// Small questions about the state that the rates and prices ask everywhere: is this trait owned,
// this moment met this way, this resident at home, this relic in play. Pure, no economy.

import type { ReadingId } from '../content/act2.ts';
import type { DialectId } from '../content/act4.ts';
import type { SiteId } from '../content/expeditions.ts';
import type { BoonId, SeamountId, TraitId } from '../content/lineage.ts';
import type { MomentId } from '../content/moments.ts';
import type { ResidentId } from '../content/residents.ts';
import type { GameState } from './state.ts';

export function trait(s: GameState, id: TraitId): number {
  return s.meta.traits[id];
}

/** How a moment was met ('a' or 'b'). */
export function chose(s: GameState, id: MomentId, c: 'a' | 'b'): boolean {
  return s.moments[id] === c;
}

/** A hard seamount's trial met by this line (kept in meta.seen as 'trial:<id>'). */
export function passed(s: GameState, id: SeamountId): boolean {
  return s.meta.seen.includes(`trial:${id}`);
}

export function lives(s: GameState, id: ResidentId): boolean {
  return s.residents.includes(id);
}

/** Both of a pairing live in the reef. */
export function paired(s: GameState, a: ResidentId, b: ResidentId): boolean {
  return lives(s, a) && lives(s, b);
}

export function found(s: GameState, id: SiteId): boolean {
  return s.relics.includes(id);
}

/** A relic's effect is in play: found on this reef, or brought along as the heirloom. */
export function relic(s: GameState, id: SiteId): boolean {
  return found(s, id) || s.heirloom === id;
}

export function has(s: GameState, id: ReadingId): boolean {
  return s.readings.includes(id);
}

export function speaks(s: GameState, id: DialectId): boolean {
  return s.dialects.form === id || s.dialects.craft === id || s.dialects.spawn === id || s.dialects.song === id;
}

export function boon(s: GameState, id: BoonId): boolean {
  return s.boon === id;
}
