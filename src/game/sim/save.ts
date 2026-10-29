// Save format: JSON of { state, savedAt } where savedAt is wall-clock ms supplied by the
// caller (the sim itself never reads a clock). Loading fills any missing fields from a fresh
// game, so older saves keep working as the state grows; `migrate` handles real renames.

import { SITES } from '../content/expeditions.ts';
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
  // A trip saved before trips recorded their size: a ruin's size is fixed.
  const ex = s.expedition;
  if (ex.site && ex.site !== 'roam' && ex.site !== 'visit' && ex.n === 0) ex.n = SITES.find((x) => x.id === ex.site)?.shoals ?? 0;
  return s;
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
