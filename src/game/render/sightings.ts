// Scenes report the creatures they actually draw on screen; the game loop collects them for the
// journal (content/creatures.ts). A plain module-level set: rendering stays a pure function of
// (state, t) apart from this note-taking, and the record of which creature was last touched.

import type { CreatureId } from '../content/creatures.ts';

const seen = new Set<CreatureId>();
const drawn = new Set<CreatureId>();

/** A creature was drawn this frame (it counts as seen once the frame ends with it in view). */
export function sight(id: CreatureId): void {
  drawn.add(id);
}

/** Everything sighted since the last call. */
export function takeSightings(): CreatureId[] {
  const out = [...seen];
  seen.clear();
  return out;
}

/**
 * Where creatures were drawn this frame, for tapping them (device pixels).
 * `n`: which star, for a star of a figure being traced in the night sky.
 */
export type Spot = { id: CreatureId | 'ossel' | 'shell' | 'star' | 'old' | 'tangle' | 'fragment' | 'stray' | 'raft'; x: number; y: number; r: number; n?: number };
let spots: Spot[] = [];
let nextSpots: Spot[] = [];

/** A creature was drawn at (x, y) with roughly radius r (device pixels). */
export function spot(id: CreatureId | 'ossel' | 'shell' | 'star' | 'old' | 'tangle' | 'fragment' | 'stray' | 'raft', x: number, y: number, r: number, n?: number): void {
  nextSpots.push(n === undefined ? { id, x, y, r } : { id, x, y, r, n });
}

/**
 * Call once per frame after drawing: the spots of this frame become the tappable ones, and the
 * creatures drawn count as seen. Given the open part of the scene (device pixels), one with spots
 * counts only once one of them shows there (its centre in it, or within half its radius of its
 * edge), not while it is still off the screen or behind the panel; one drawn without a spot counts
 * as drawn.
 */
export function endFrameSpots(view?: { x: number; y: number; w: number; h: number }): void {
  spots = nextSpots;
  nextSpots = [];
  for (const id of drawn) {
    let any = false, inside = !view;
    for (const p of spots) {
      if (inside) break;
      if (p.id !== id) continue;
      any = true;
      const m = p.r / 2;
      inside = p.x >= view!.x - m && p.x <= view!.x + view!.w + m && p.y >= view!.y - m && p.y <= view!.y + view!.h + m;
    }
    if (inside || !any) seen.add(id);
  }
  drawn.clear();
}

/** The spots of the last frame. */
export function tappable(): readonly Spot[] {
  return spots;
}

/** The creature at device pixel (x, y), if any (the nearest whose radius covers it); `only` limits it to one kind. */
export function creatureAt(x: number, y: number, only?: Spot['id']): Spot | null {
  let best: Spot | null = null, bestD = Infinity;
  for (const p of spots) {
    if (only && p.id !== only) continue;
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < p.r && d < bestD) { best = p; bestD = d; }
  }
  return best;
}

/** The last time each creature was touched (scene time) and where (device pixels). */
const touched = new Map<CreatureId | 'ossel' | 'shell', { t: number; x: number; y: number }>();

/** When Ossel last spoke (scene time): its light flickers as it talks. */
let lastSpoke = -1e9;
export function spoke(t: number): void {
  lastSpoke = t;
}
/** 0 when quiet; up to 1 while Ossel is speaking (a few seconds after a whisper), in a talking flicker. */
export function speaking(t: number): number {
  const age = t - lastSpoke;
  if (age < 0 || age > 6) return 0;
  const fade = Math.min(1, age * 3, (6 - age) / 1.5);
  return fade * (0.55 + 0.45 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1)));
}

/** Where the pointer last hovered over the water (device pixels, scene time): polyps near it pull in. */
let hoverAt = { x: 0, y: 0, t: -1e9 };
export function hover(x: number, y: number, t: number): void {
  hoverAt = { x, y, t };
}
/** How much a polyp at (x, y) shies from the pointer: 1 right under it, 0 out of reach or after a pause. */
export function shy(x: number, y: number, t: number, reach: number): number {
  const age = t - hoverAt.t;
  if (age < 0 || age > 1.5) return 0;
  const d = Math.hypot(x - hoverAt.x, y - hoverAt.y);
  return d >= reach ? 0 : (1 - d / reach) * Math.min(1, (1.5 - age) / 0.5);
}

/** The last sweep of the tentacles (device pixels, scene time): small fish nearby dart away from it. */
let lastPoke = { x: 0, y: 0, t: -1e9 };
export function poke(x: number, y: number, t: number): void {
  lastPoke = { x, y, t };
}
/** How far a fish at (x, y) is pushed from the last sweep now: [dx, dy] (zero once it has settled). */
export function pushed(x: number, y: number, t: number, reach: number): [number, number] {
  const age = t - lastPoke.t;
  if (age < 0 || age > 2.5) return [0, 0];
  const dx = x - lastPoke.x, dy = y - lastPoke.y, d = Math.hypot(dx, dy);
  if (d > reach * 1.6 || d < 1e-6) return [0, 0];
  // A quick dart out, then a slow drift back to where the shoal wants them.
  const k = (1 - d / (reach * 1.6)) * Math.min(1, age * 8) * Math.exp(-age * 1.6) * reach * 0.9;
  return [(dx / d) * k, (dy / d) * k];
}

/** A creature was tapped: its renderer may react (eels duck, an octopus inks, a jelly flashes). */
export function startle(id: CreatureId | 'ossel' | 'shell', t: number, x: number, y: number): void {
  touched.set(id, { t, x, y });
}

/** Seconds since the creature was last touched, and where (null if never or before `t`). */
export function startled(id: CreatureId | 'ossel' | 'shell', t: number): { age: number; x: number; y: number } | null {
  const e = touched.get(id);
  return e && t >= e.t ? { age: t - e.t, x: e.x, y: e.y } : null;
}
