// Nudibranchs: small bright sea slugs creeping along the reef's own branches, each following a
// path from a branch tip toward the trunk and back again. Drawn over the reef.

import type { Reef, ReefLayout } from './reef.ts';
import { sight } from './sightings.ts';

const COLOURS: readonly [string, string][] = [
  ['#7a3cff', '#ffb02e'], ['#ff5ab4', '#fff2a8'], ['#2ec4ff', '#ff7a2e'], ['#f2f2f2', '#ff4d6d'],
];

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
        const [ax, ay] = reef.nodePx(L, a);
        const [bx, by] = reef.nodePx(L, b);
        if (ay < 0) continue;
        const x = ax + (bx - ax) * f, y = ay + (by - ay) * f;
        const ang = Math.atan2(by - ay, bx - ax) + (u < 1 ? 0 : Math.PI);
        const [body, tips] = COLOURS[k % COLOURS.length]!;
        sight('nudibranch');
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.ellipse(0, 0, 6 * s, 2.4 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        // Cerata: a fringe of little tipped plumes along its back, and two horns at the front.
        ctx.fillStyle = tips;
        for (let q = -2; q <= 2; q++) {
          ctx.beginPath();
          ctx.arc(q * 2.2 * s, -2.4 * s + Math.sin(t * 3 + q) * 0.3 * s, 1.1 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = tips;
        ctx.lineWidth = 0.8 * s;
        ctx.beginPath();
        ctx.moveTo(5 * s, -1 * s);
        ctx.lineTo(7.5 * s, -3.5 * s);
        ctx.moveTo(5 * s, 0.5 * s);
        ctx.lineTo(8 * s, -1.5 * s);
        ctx.stroke();
        ctx.restore();
      }
    },
  };
}
