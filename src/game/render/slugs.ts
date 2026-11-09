// Nudibranchs: small bright sea slugs creeping along the reef's own branches, each following a
// path from a branch tip toward the trunk and back again. Drawn over the reef.

import type { Reef, ReefLayout } from './reef.ts';
import { sight, spot, startled } from './sightings.ts';

/** Halfway between two #rrggbb colours. */
function mid(a: string, b: string): string {
  const c = (h: string, i: number) => parseInt(h.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round((c(a, i) + c(b, i)) / 2)).join(',')})`;
}

const COLOURS: readonly [string, string][] = [
  ['#7a3cff', '#ffb02e'], ['#ff5ab4', '#fff2a8'], ['#2ec4ff', '#ff7a2e'], ['#f2f2f2', '#ff4d6d'],
];

/** The cerata's shafts: each slug's body colour shading toward its tips. */
const MIDS = COLOURS.map(([a, b]) => mid(a, b));

export function createSlugs(count: number) {
  let paths: number[][] = [];
  let builtFor: Reef | null = null;

  function build(reef: Reef, L: ReefLayout): void {
    const c = reef.coral;
    const leaves: number[] = [];
    const hasChild = new Uint8Array(c.count);
    for (let i = 0; i < c.count; i++) if (c.parent[i]! >= 0) hasChild[c.parent[i]!] = 1;
    for (let i = 0; i < c.count; i++) if (!hasChild[i] && c.y[i]! < L.top * 0.95 && c.y[i]! > 0.25) leaves.push(i);
    // One tip per narrow column of the reef (the highest), so the slugs spread over the whole reef
    // instead of crowding the dense stubs.
    const byColumn = new Map<number, number>();
    for (const i of leaves) {
      const col = Math.round(c.x[i]! / 0.05);
      const have = byColumn.get(col);
      if (have === undefined || c.y[i]! > c.y[have]!) byColumn.set(col, i);
    }
    leaves.length = 0;
    leaves.push(...[...byColumn.entries()].sort((p, q) => p[0] - q[0]).map((e) => e[1]));
    paths = [];
    for (let k = 0; k < count && leaves.length; k++) {
      let i = leaves[Math.floor(((k + 0.5) / count) * leaves.length)]!;
      const path: number[] = [];
      while (i >= 0 && path.length < 30) { path.push(i); i = c.parent[i]!; }
      paths.push(path);
    }
    builtFor = reef;
  }

  return {
    draw(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, t: number): void {
      if (builtFor !== reef || paths.length === 0) build(reef, L);
      const s = L.s * 2;
      for (const [k, path] of paths.entries()) {
        if (path.length < 4) continue;
        // There and back along the path, slowly.
        const span = path.length - 1;
        const u = ((t * 0.04 + k * 0.37) % 2);
        const pos = (u < 1 ? u : 2 - u) * span;
        const i0 = Math.floor(pos), f = pos - i0;
        const a = path[Math.min(span, i0)]!, b = path[Math.min(span, i0 + 1)]!;
        // Not on a branch that is not there (the time-lapse regrows the reef from below).
        if (reef.coral.y[a]! > L.top || reef.coral.y[b]! > L.top) continue;
        const [ax, ay] = reef.nodePx(L, a);
        const [bx, by] = reef.nodePx(L, b);
        if (ay < 0) continue;
        const x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
        // At the tip it turns round in its own length, over a moment, instead of flipping.
        const turn = Math.min(1, Math.max(0, (u - 0.96) / 0.08));
        const ang = Math.atan2(by - ay, bx - ax) + Math.PI * turn * turn * (3 - 2 * turn);
        const [body, tips] = COLOURS[k % COLOURS.length]!;
        sight('nudibranch');
        spot('nudibranch', x, y, Math.max(10 * s, 22 * L.dpr));
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        // Cerata: finger-like plumes in a double row along its back, swaying in a wave, the
        // body's colour shading to bright tips. Touched, it raises them stiff and tall (a warning:
        // they sting), and lets them down again over a few seconds.
        const touch = startled('nudibranch', t);
        const near = touch && touch.age < 4 && Math.hypot(touch.x - x, touch.y - y) < Math.max(14 * s, 30 * L.dpr);
        const raise = near ? Math.min(1, touch!.age / 0.25) * Math.min(1, (4 - touch!.age) / 2.5) : 0;
        ctx.lineCap = 'round';
        ctx.strokeStyle = MIDS[k % COLOURS.length]!;
        ctx.lineWidth = 1.2 * s;
        const ends: number[] = [];
        ctx.beginPath();
        for (let q = 0; q < 7; q++) {
          const bx0 = (3.2 - q * 1.25) * s, sway = Math.sin(t * 2.4 - q * 0.8) * 0.7 * s * (1 - 0.8 * raise);
          const len = (3.4 - Math.abs(q - 3) * 0.35) * s * (1 + 0.45 * raise);
          const ex = bx0 - 0.8 * s * (1 - raise) + sway, ey = -1 * s - len;
          ctx.moveTo(bx0, -0.8 * s);
          ctx.quadraticCurveTo(bx0 - 0.2 * s, -1.4 * s - len * 0.5, ex, ey);
          ends.push(ex, ey);
        }
        ctx.stroke();
        // The body: a slug's foot, a rounded head tapering to a pointed tail, its edge pale.
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(6.2 * s, 0);
        ctx.quadraticCurveTo(6 * s, -1.9 * s, 3.5 * s, -1.9 * s);
        ctx.quadraticCurveTo(-2 * s, -1.8 * s, -6.5 * s, 0.2 * s);
        ctx.quadraticCurveTo(-2 * s, 1.6 * s, 3.5 * s, 1.7 * s);
        ctx.quadraticCurveTo(6 * s, 1.6 * s, 6.2 * s, 0);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.lineWidth = 0.45 * s;
        ctx.beginPath();
        ctx.moveTo(5.6 * s, 1.1 * s);
        ctx.quadraticCurveTo(0, 1.6 * s, -5.6 * s, 0.4 * s);
        ctx.stroke();
        ctx.fillStyle = tips;
        ctx.beginPath();
        for (let q = 0; q < ends.length; q += 2) {
          ctx.moveTo(ends[q]! + 0.75 * s, ends[q + 1]!);
          ctx.arc(ends[q]!, ends[q + 1]!, 0.75 * s, 0, Math.PI * 2);
        }
        ctx.fill();
        // Two horns (rhinophores) at the head, each ending in a small club.
        ctx.strokeStyle = body;
        ctx.lineWidth = 0.7 * s;
        ctx.beginPath();
        ctx.moveTo(4.6 * s, -1.4 * s);
        ctx.lineTo(5.8 * s, -4 * s);
        ctx.moveTo(5.4 * s, -1.2 * s);
        ctx.lineTo(7.2 * s, -3.4 * s);
        ctx.stroke();
        ctx.fillStyle = tips;
        ctx.beginPath();
        ctx.ellipse(5.9 * s, -4.3 * s, 0.5 * s, 0.75 * s, 0.4, 0, Math.PI * 2);
        ctx.moveTo(7.8 * s, -3.6 * s);
        ctx.ellipse(7.4 * s, -3.7 * s, 0.5 * s, 0.75 * s, 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    },
  };
}
