// Glass shrimp: nearly invisible bodies, a glowing gut, legs paddling in sequence. Shared by the
// Midnight Water (swimming past) and the Twilight Shelf (grazing silt, with Glass gardeners).

import { glow } from './draw.ts';

/** One shrimp at (x, y), facing `dir` (1 right, −1 left), `s` pixels per unit, variant `i`. */
export function drawShrimp(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, dir: number, t: number, i: number,
  tint = '190,220,255'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.strokeStyle = `rgba(${tint},0.28)`;
  ctx.fillStyle = `rgba(${tint},0.06)`;
  ctx.lineWidth = 0.9 * s;
  // A curled, segmented body.
  ctx.beginPath();
  ctx.moveTo(12 * s, 0);
  ctx.bezierCurveTo(4 * s, -7 * s, -10 * s, -6 * s, -16 * s, 2 * s);
  ctx.bezierCurveTo(-12 * s, 5 * s, 2 * s, 5 * s, 12 * s, 0);
  ctx.fill();
  ctx.stroke();
  for (let k = 0; k < 5; k++) {
    const lx = 6 * s - k * 4 * s;
    const kick = Math.sin(t * 9 - k * 0.9) * 2 * s;
    ctx.beginPath();
    ctx.moveTo(lx, 3 * s);
    ctx.lineTo(lx - 2 * s + kick, 7 * s);
    ctx.stroke();
  }
  // Antennae.
  ctx.beginPath();
  ctx.moveTo(12 * s, -1 * s);
  ctx.quadraticCurveTo(26 * s, -10 * s, 34 * s, -4 * s + Math.sin(t * 1.3 + i) * 3 * s);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x - dir * 2 * s, y - 1 * s, 7 * s, '255,170,90', 0.35 + 0.15 * Math.sin(t * 2 + i));
  ctx.restore();
}
