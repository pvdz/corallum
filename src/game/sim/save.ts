// Save format: JSON of { state, savedAt } where savedAt is wall-clock ms supplied by the
// caller (the sim itself never reads a clock). Loading fills any missing fields from a fresh
// game, so older saves keep working as the state grows; `migrate` handles real renames.

import { SITES } from '../content/expeditions.ts';
import { GRAINS, SPORTS, STRAINS } from '../content/act1.ts';
import { READINGS } from '../content/act2.ts';
import { RIDDLES } from '../content/act3.ts';
import { DIALECTS } from '../content/act4.ts';
import { MEMORIES } from '../content/act5.ts';
import { BOONS, SEAMOUNTS, TRAITS, VOWS } from '../content/lineage.ts';
import { UPGRADES } from '../content/upgrades.ts';
import { WORKS } from '../content/works.ts';
import { REQUESTS } from '../content/requests.ts';
import { RESIDENTS } from '../content/residents.ts';
import { fragmentMax } from './economy.ts';
import { newGame, SAVE_VERSION, type GameState } from './state.ts';

export type SaveFile = { state: GameState; savedAt: number };

export function serialize(state: GameState, savedAt: number): string {
  return JSON.stringify({ state, savedAt });
}

export function deserialize(text: string): SaveFile | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isObject(raw) || !isObject(raw.state)) return null;
  const savedAt = typeof raw.savedAt === 'number' && Number.isFinite(raw.savedAt) ? raw.savedAt : 0;
  const loaded = raw.state as Record<string, unknown>;
  const seed = typeof loaded.seed === 'number' ? loaded.seed : 1;
  return { state: migrate(fill(newGame(seed), loaded)), savedAt };
}

/** Deep-merge `src` over `base`, keeping base's shape and only accepting same-typed values. */
function fill<T>(base: T, src: unknown): T {
  if (!isObject(base) || !isObject(src)) return base;
  // Arrays keep their entries' kind: strings (story ids, memories) or finite numbers (history).
  if (Array.isArray(base)) {
    return (Array.isArray(src)
      ? src.filter((x) => typeof x === 'string' || (typeof x === 'number' && Number.isFinite(x)))
      : base) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(base)) {
    const sv = src[k];
    if (sv === undefined) continue;
    if (isObject(v)) out[k] = fill(v, sv);
    else if (typeof sv === typeof v && (typeof sv !== 'number' || Number.isFinite(sv))) out[k] = sv;
  }
  return out as T;
}

function migrate(s: GameState): GameState {
  s.version = SAVE_VERSION;
  known(s);
  // A trip saved before trips recorded their size: a ruin's size is fixed.
  const ex = s.expedition;
  if (ex.site && ex.site !== 'roam' && ex.site !== 'visit' && ex.n === 0) ex.n = SITES.find((x) => x.id === ex.site)?.shoals ?? 0;
  return s;
}

/**
 * Ids that name content must name content this version has: a save from a version where a
 * band, a dialect or a seamount was renamed or taken out (or from a newer one) still loads.
 * Unknown choices fall back to "not chosen", unknown entries leave their lists.
 */
function known(s: GameState): void {
  const ids = (list: readonly { id: string }[]) => new Set(list.map((x) => x.id));
  const keep = <T extends string>(xs: T[], set: Set<string>) => xs.filter((x) => set.has(x));
  const seamounts = ids(SEAMOUNTS);
  if (!seamounts.has(s.seamount)) s.seamount = 'plain';
  if (s.request.kind && !REQUESTS.some((r) => r.kind === s.request.kind)) s.request.kind = '';
  for (const tier of Object.keys(s.dialects) as (keyof GameState['dialects'])[]) {
    const d = s.dialects[tier];
    if (d && !DIALECTS.some((x) => x.id === d && x.tier === tier)) s.dialects[tier] = '';
  }
  if (s.strain && !ids(STRAINS).has(s.strain)) s.strain = '';
  if (s.sport && !ids(SPORTS).has(s.sport)) s.sport = '';
  if (s.boon && !ids(BOONS).has(s.boon)) s.boon = '';
  const trips = new Set<string>([...ids(SITES), 'roam', 'visit', 'carcass']);
  // A trip to a place no longer known becomes a roam: the shoals still come home on time.
  if (s.expedition.site && !trips.has(s.expedition.site)) s.expedition.site = 'roam';
  s.grains = keep(s.grains, ids(GRAINS));
  s.readings = keep(s.readings, ids(READINGS));
  s.carried = keep(s.carried, ids(MEMORIES));
  s.residents = keep(s.residents, ids(RESIDENTS));
  s.vows = keep(s.vows, ids(VOWS));
  s.relics = keep(s.relics, ids(SITES));
  s.riddlesAgain = keep(s.riddlesAgain, ids(RIDDLES));
  // Counts are whole and within what the content allows (a hand-edited or damaged save with a
  // count of 1e30 shoals or half a band would otherwise hang the page drawing or settling them).
  const count = (x: number, max = Infinity) => Math.min(max, Math.max(0, Math.floor(x)));
  for (const u of UPGRADES) s.levels[u.id] = count(s.levels[u.id], u.maxLevel);
  for (const t of TRAITS) s.meta.traits[t.id] = count(s.meta.traits[t.id], t.max);
  for (const w of WORKS) s.works[w.id] = count(s.works[w.id], w.stages.length);
  s.fragments = count(s.fragments, fragmentMax(s));
  let room = s.levels.shoal;
  for (const j of Object.keys(s.jobs) as (keyof GameState['jobs'])[]) {
    s.jobs[j] = count(s.jobs[j], room);
    room -= s.jobs[j];
  }
  // The line's records keep their entries; only a seamount no longer known reads as plain.
  const plainSeamount = (line: string, at: number) => {
    const f = line.split('|');
    if (f.length > at && !seamounts.has(f[at]!)) f[at] = 'plain';
    return f.join('|');
  };
  s.meta.chronicle = s.meta.chronicle.map((l) => plainSeamount(l, 0));
  s.meta.ancestors = s.meta.ancestors.map((l) => plainSeamount(l, 1));
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

/** Portable export string (base64 of the JSON) for copy/paste backups. */
export function exportString(state: GameState, savedAt: number): string {
  const bytes = new TextEncoder().encode(serialize(state, savedAt));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importString(text: string): SaveFile | null {
  try {
    const bin = atob(text.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return deserialize(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
