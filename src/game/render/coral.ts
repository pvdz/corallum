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

/** Growth forms: the deep reef's fan, and the three sunlit Form dialects. */
export type CoralForm = 'fan' | 'branching' | 'massive' | 'plating' | 'pillar';

type FormSpec = {
  /** Half-width of the envelope at height y (0..1). */
  envelope: (y: number) => number;
  attractors: number;
  /** Upward pull added to each growth direction. */
  up: number;
  /** Attractor height sampler, from a uniform u. */
  height: (u: number, r: () => number) => number;
  /** Attractor x at height y (default: anywhere across the envelope). */
  x?: (y: number, r: () => number) => number;
};

/** Pillars: where each column stands, and how tall it grows (fractions of the full height). */
const COLUMNS: readonly [number, number][] = [[-0.2, 0.7], [-0.08, 1], [0.05, 0.85], [0.17, 0.95], [0.27, 0.6]];

const FORMS: Record<CoralForm, FormSpec> = {
  // Columns from one shared foot: attractors in narrow upright bands, a few spread low to make the base.
  pillar: {
    envelope: () => 0.3, attractors: 900, up: 0.9,
    height: (u, r) => (u < 0.1 ? r() * 0.08 : 0.06 + Math.pow(r(), 0.85) * 0.96),
    x: (y, r) => {
      if (y < 0.08) return (r() - 0.5) * 0.5;
      const live = COLUMNS.filter(([, top]) => y <= top);
      const [cx] = live[Math.floor(r() * live.length)] ?? COLUMNS[1]!;
      return cx + (r() - 0.5) * 0.045;
    },
  },
  // A narrow foot opening into a fan.
  fan: {
    envelope: (y) => 0.05 + 0.32 * Math.pow(y, 0.85) * (1 - 0.35 * y * y),
    attractors: 700, up: 0.35, height: (u) => Math.pow(u, 0.8) * 1.02,
  },
  // Tall antlers: narrow, sparse, strongly upward.
  branching: {
    envelope: (y) => 0.06 + 0.22 * Math.pow(y, 0.6),
    attractors: 420, up: 0.6, height: (u) => Math.pow(u, 0.7) * 1.02,
  },
  // A dome: wide, rounded, dense.
  massive: {
    envelope: (y) => 0.42 * Math.sqrt(Math.max(0, 1 - Math.pow(y / 0.75, 2))) + 0.02,
    attractors: 1100, up: 0.15, height: (u) => u * 0.75,
  },
  // Tables: attractors gathered in a few thin horizontal layers.
  plating: {
    envelope: (y) => 0.08 + 0.4 * Math.min(1, y * 1.4),
    attractors: 900, up: 0.05,
    // Most attractors sit in the table layers; a few between them grow more than one stem.
    height: (u, r) => {
      if (u < 0.15) return r() * 0.96;
      const layer = Math.floor(((u - 0.15) / 0.85) * 4);
      return 0.3 + layer * 0.22 + (r() - 0.5) * 0.04;
    },
  },
};

/** Half-width of the fan's envelope at height y. */
export function envelope(y: number): number {
  return FORMS.fan.envelope(y);
}

export function generateCoral(seed: number, form: CoralForm = 'fan'): Coral {
  const rng = mulberry32(seed);
  const spec = FORMS[form];
  // Attractors fill the form's envelope.
  const ax: number[] = [];
  const ay: number[] = [];
  while (ax.length < spec.attractors) {
    const y = spec.height(rng(), rng);
    const x = spec.x ? spec.x(y, rng) : range(rng, -1, 1) * spec.envelope(Math.max(0, Math.min(1, y)));
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

  const children = new Map<number, number[]>();
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
      let dx = dirX[n]! / hits[n]!, dy = dirY[n]! / hits[n]! + spec.up;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      const x = nx[n]! + dx * STEP + range(rng, -0.002, 0.002);
      const y = ny[n]! + dy * STEP;
      // A node pulled the same way again would bud on top of its last child: skip it, or the
      // reef grows stacks of nodes on one spot (which draw as one over-bright blot).
      const kids = children.get(n);
      if (kids?.some((c) => Math.hypot(nx[c]! - x, ny[c]! - y) < STEP * 0.5)) continue;
      nx.push(x); ny.push(y); np.push(n);
      if (kids) kids.push(nx.length - 1);
      else children.set(n, [nx.length - 1]);
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
    polypOrder: spaced(keyed.map((e) => e.i), nx, ny),
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

/** Reorder so the first polyps keep a little distance from each other; crowded ones go last. */
function spaced(order: number[], x: number[], y: number[]): Int32Array {
  const MIN = 0.03;
  const first: number[] = [];
  const later: number[] = [];
  for (const i of order) {
    const crowded = first.some((j) => (x[i]! - x[j]!) ** 2 + (y[i]! - y[j]!) ** 2 < MIN * MIN);
    (crowded ? later : first).push(i);
  }
  return Int32Array.from([...first, ...later]);
}
