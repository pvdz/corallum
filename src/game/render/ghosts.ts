// The line's old reefs: on later seamounts, the reefs this line grew before show as pale far
// silhouettes in the water, the ones that climbed past the height the reef has now. Seeded shapes.

import { mulberry32, range } from '../sim/rng.ts';
import type { Focus } from './scene.ts';

/** `heights`: the old reefs' final heights (newest last); `height`: this reef's. */
export function drawGhosts(ctx: CanvasRenderingContext2D, F: Focus, heights: readonly number[], height: number, t: number, s: number,
  tint: string): void {
  const past = heights.filter((h) => h > height + 1).slice(-3);
  if (!past.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  past.forEach((h, k) => {
    const r = mulberry32(Math.round(h * 7) + k * 101);
    const x = F.x + F.w * [0.08, 0.92, 0.2][k]!;
    const base = F.y + F.h * 1.02;
    const tall = F.h * range(r, 0.4, 0.6);
    ctx.globalAlpha = 0.1 + 0.025 * Math.sin(t * 0.2 + k);
    ctx.strokeStyle = tint;
    // A few branches rising and forking, drawn thin and pale.
    const branch = (bx: number, by: number, a: number, len: number, depth: number) => {
      const ex = bx + Math.cos(a) * len, ey = by + Math.sin(a) * len;
      ctx.lineWidth = (12 - depth * 3) * s;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      if (depth < 3) {
        branch(ex, ey, a - range(r, 0.25, 0.5), len * 0.7, depth + 1);
        branch(ex, ey, a + range(r, 0.25, 0.5), len * 0.7, depth + 1);
      }
    };
    branch(x, base, -Math.PI / 2 + range(r, -0.1, 0.1), tall * 0.26, 0);
  });
  ctx.restore();
}
