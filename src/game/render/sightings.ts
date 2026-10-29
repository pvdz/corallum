// Scenes report the creatures they actually draw on screen; the game loop collects them for the
// journal (content/creatures.ts). A plain module-level set: rendering stays a pure function of
// (state, t) apart from this note-taking, and the record of which creature was last touched.

import type { CreatureId } from '../content/creatures.ts';

const seen = new Set<CreatureId>();

/** A creature was drawn this frame. */
export function sight(id: CreatureId): void {
  seen.add(id);
}

/** Everything sighted since the last call. */
export function takeSightings(): CreatureId[] {
  const out = [...seen];
  seen.clear();
  return out;
}

/** Where creatures were drawn this frame, for tapping them (device pixels). */
/** `n`: which star, for a star of a figure being traced in the night sky. */
export type Spot = { id: CreatureId | 'ossel' | 'shell' | 'star' | 'old'; x: number; y: number; r: number; n?: number };
let spots: Spot[] = [];
let nextSpots: Spot[] = [];

/** A creature was drawn at (x, y) with roughly radius r (device pixels). */
export function spot(id: CreatureId | 'ossel' | 'shell' | 'star' | 'old', x: number, y: number, r: number, n?: number): void {
  nextSpots.push(n === undefined ? { id, x, y, r } : { id, x, y, r, n });
}

/** Call once per frame after drawing: the spots of this frame become the tappable ones. */
export function endFrameSpots(): void {
  spots = nextSpots;
  nextSpots = [];
}

/** The spots of the last frame. */
export function tappable(): readonly Spot[] {
  return spots;
}

/** The creature at device pixel (x, y), if any (the nearest whose radius covers it). */
export function creatureAt(x: number, y: number): Spot | null {
  let best: Spot | null = null, bestD = Infinity;
  for (const p of spots) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < p.r && d < bestD) { best = p; bestD = d; }
  }
  return best;
}

/** The last time each creature was touched (scene time) and where (device pixels). */
const touched = new Map<CreatureId | 'ossel' | 'shell', { t: number; x: number; y: number }>();

/** A creature was tapped: its renderer may react (eels duck, an octopus inks, a jelly flashes). */
export function startle(id: CreatureId | 'ossel' | 'shell', t: number, x: number, y: number): void {
  touched.set(id, { t, x, y });
}

/** Seconds since the creature was last touched, and where (null if never or before `t`). */
export function startled(id: CreatureId | 'ossel' | 'shell', t: number): { age: number; x: number; y: number } | null {
  const e = touched.get(id);
  return e && t >= e.t ? { age: t - e.t, x: e.x, y: e.y } : null;
}
