// Branching coral by space colonisation, generated once per seed for the reef's full height
// and revealed bottom-up as the reef grows, so branches never jump as the player buys height.
//
// Coordinates are in "reef units": y runs 0 (base) to 1 (full height), x is in the same unit
// (so the shape keeps its aspect at any screen size).

import { mulberry32, range } from '../sim/rng.ts';

export type Coral = {
  count: number;
  x: Float32Array;
  y: Float32Array;
  parent: Int32Array;
  /** Nodes in the order polyps settle on them: a fixed shuffle, tips first. */
  polypOrder: Int32Array;
};

const STEP = 0.016;
const INFLUENCE = 0.13;
const KILL = 0.035;
const MAX_NODES = 2600;

/** Half-width of the reef's envelope at height y: a narrow foot opening into a fan. */
export function envelope(y: number): number {
  return 0.05 + 0.32 * Math.pow(y, 0.85) * (1 - 0.35 * y * y);
}

export function generateCoral(seed: number): Coral {
  const rng = mulberry32(seed);
  // Attractors fill the envelope, denser toward the top so the crown branches out.
  const ax: number[] = [];
  const ay: number[] = [];
  while (ax.length < 700) {
    const y = Math.pow(rng(), 0.8) * 1.02;
    const x = range(rng, -1, 1) * envelope(Math.min(1, y));
    ax.push(x);
    ay.push(y);
  }
  const alive = new Uint8Array(ax.length).fill(1);

  const nx: number[] = [];
  const ny: number[] = [];
  const np: number[] = [];
  // A short trunk from the seamount.
  for (let i = 0; i < 4; i++) {
    nx.push(range(rng, -0.004, 0.004));
    ny.push(i * STEP);
    np.push(i - 1);
  }

  for (let iter = 0; iter < 400 && nx.length < MAX_NODES; iter++) {
    const dirX = new Float64Array(nx.length);
    const dirY = new Float64Array(nx.length);
    const hits = new Uint16Array(nx.length);
    let anyAlive = false;
    for (let a = 0; a < ax.length; a++) {
      if (!alive[a]) continue;
      anyAlive = true;
      let best = -1;
      let bestD = INFLUENCE * INFLUENCE;
      for (let n = 0; n < nx.length; n++) {
        const dx = ax[a]! - nx[n]!, dy = ay[a]! - ny[n]!;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best < 0) continue;
      if (bestD < KILL * KILL) { alive[a] = 0; continue; }
      const d = Math.sqrt(bestD);
      dirX[best]! += (ax[a]! - nx[best]!) / d;
      dirY[best]! += (ay[a]! - ny[best]!) / d;
      hits[best]!++;
    }
    if (!anyAlive) break;
    let grew = false;
    const n0 = nx.length;
    for (let n = 0; n < n0 && nx.length < MAX_NODES; n++) {
      if (!hits[n]) continue;
      // Upward bias: coral grows toward the light it cannot yet see.
      let dx = dirX[n]! / hits[n]!, dy = dirY[n]! / hits[n]! + 0.35;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const x = nx[n]! + dx * STEP + range(rng, -0.002, 0.002);
      const y = ny[n]! + dy * STEP;
      nx.push(x); ny.push(y); np.push(n);
      grew = true;
    }
    if (!grew) {
      // Nothing in reach: extend the highest node straight up to find the next attractors.
      let top = 0;
      for (let n = 1; n < nx.length; n++) if (ny[n]! > ny[top]!) top = n;
      nx.push(nx[top]!); ny.push(ny[top]! + STEP); np.push(top);
    }
  }

  const count = nx.length;
  const isTip = new Uint8Array(count).fill(1);
  for (let i = 0; i < count; i++) if (np[i]! >= 0) isTip[np[i]!] = 0;
  const keyed = Array.from({ length: count }, (_, i) => ({ i, k: rng() + (isTip[i] ? 0 : 0.6) }));
  keyed.sort((a, b) => a.k - b.k);
  return {
    count,
    x: Float32Array.from(nx),
    y: Float32Array.from(ny),
    parent: Int32Array.from(np),
    polypOrder: Int32Array.from(keyed.map((e) => e.i)),
  };
}

/**
 * Branch thickness for the visible part of the coral (pipe model: a branch carries the
 * cross-section of everything above it). Returns radii in reef units, 0 for hidden nodes.
 */
export function thickness(c: Coral, visibleTop: number, out: Float32Array): Float32Array {
  const load = new Float32Array(c.count);
  for (let i = c.count - 1; i >= 0; i--) {
    if (c.y[i]! > visibleTop) continue;
    load[i]! += 1;
    const p = c.parent[i]!;
    if (p >= 0) load[p]! += load[i]!;
  }
  for (let i = 0; i < c.count; i++) out[i] = load[i]! > 0 ? 0.0028 * Math.pow(load[i]!, 0.42) : 0;
  return out;
}
