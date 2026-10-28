// The Craft dialect, made visible on the sunlit and breaching reef: fluorescent polyps (colours,
// in the scenes' layouts), mucus nets streaming off the branches, or long sweeper tentacles
// reaching from the reef's foot.

import type { DialectId } from '../content/act4.ts';
import type { Reef, ReefLayout } from './reef.ts';

/** Fluorescent polyps: proteins that turn sunlight into colour. */
export const FLUORESCENT_POLYP: [string, string] = ['#4dffb4', 'rgba(255,110,215,0.95)'];

/** Visible branch nodes, spaced out, from the reef's own structure (deterministic). */
function nodes(reef: Reef, L: ReefLayout, every: number, from: number, to: number): number[] {
  const out: number[] = [];
  const c = reef.coral;
  for (let i = 0; i < c.count; i += every) {
    const y = c.y[i]!;
    if (y <= L.top && y >= from * L.top && y <= to * L.top) out.push(i);
  }
  return out;
}

export function drawCraft(ctx: CanvasRenderingContext2D, craft: DialectId | '', reef: Reef, L: ReefLayout, t: number,
  current: number): void {
  if (craft === 'mucus') drawMucus(ctx, reef, L, t, current);
  else if (craft === 'sweepers') drawSweepers(ctx, reef, L, t);
}

/** Mucus nets: glistening threads drifting off the branches with the current, motes caught in them. */
function drawMucus(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, t: number, current: number): void {
  const s = L.s;
  ctx.save();
  ctx.lineWidth = 1.4 * s;
  ctx.lineCap = 'round';
  for (const [k, i] of nodes(reef, L, 23, 0.3, 1).entries()) {
    const [x, y] = reef.nodePx(L, i);
    const len = (40 + (k % 5) * 12) * s;
    const ph = k * 1.7;
    const a = 0.38 + 0.14 * Math.sin(t * 0.8 + ph);
    ctx.strokeStyle = `rgba(235,250,255,${a})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let q = 1; q <= 6; q++) {
      const u = q / 6;
      ctx.lineTo(x + current * len * u, y + Math.sin(t * 1.3 + ph + u * 4) * 5 * s * u + u * 6 * s);
    }
    ctx.stroke();
    // Caught motes along the thread.
    ctx.fillStyle = `rgba(255,255,240,${a + 0.15})`;
    for (let q = 2; q <= 5; q += 2) {
      const u = q / 6;
      ctx.fillRect(x + current * len * u - 1 * s, y + Math.sin(t * 1.3 + ph + u * 4) * 5 * s * u + u * 6 * s - 1 * s, 2 * s, 2 * s);
    }
  }
  ctx.restore();
}

/** Sweeper tentacles: a few long, thin, stinging arms reaching out from the lower branches. */
function drawSweepers(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, t: number): void {
  const s = L.s;
  ctx.save();
  ctx.lineCap = 'round';
  // From the outermost of the lower branches, reaching away from the reef.
  const c = reef.coral;
  const outer = nodes(reef, L, 3, 0.05, 0.6).sort((a, b) => Math.abs(c.x[b]!) - Math.abs(c.x[a]!)).slice(0, 9);
  for (const [k, i] of outer.entries()) {
    const [x, y] = reef.nodePx(L, i);
    const side = c.x[i]! >= 0 ? 1 : -1;
    const len = (110 + (k % 4) * 25) * s;
    const ph = k * 2.3;
    ctx.strokeStyle = 'rgba(255,150,120,0.8)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    let px = x, py = y;
    for (let q = 1; q <= 10; q++) {
      const u = q / 10;
      px = x + side * len * u;
      py = y - len * 0.25 * u + Math.sin(t * 0.9 + ph + u * 5) * 9 * s * u;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Stinging tip.
    ctx.fillStyle = 'rgba(255,240,220,0.8)';
    ctx.beginPath();
    ctx.arc(px, py, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
