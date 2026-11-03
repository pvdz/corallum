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
  // A hunched, segmented body: carapace at the head (right), the abdomen arching down to a tail
  // fan (left), clear glass with only its edges and joints catching the light.
  ctx.beginPath();
  ctx.moveTo(13 * s, 0.5 * s);
  ctx.quadraticCurveTo(12 * s, -4.5 * s, 4 * s, -5 * s);
  ctx.quadraticCurveTo(-6 * s, -6.5 * s, -11 * s, -1 * s);
  ctx.quadraticCurveTo(-13.5 * s, 2.5 * s, -12.5 * s, 5.5 * s);
  ctx.lineTo(-9.5 * s, 4.5 * s);
  ctx.quadraticCurveTo(-8 * s, 1 * s, -3 * s, 1.5 * s);
  ctx.quadraticCurveTo(6 * s, 3 * s, 13 * s, 0.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Segment joints across the abdomen.
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const u = k / 5;
    const jx = 3 * s - u * 13 * s, jy = -5.2 * s + u * u * 5 * s;
    ctx.moveTo(jx, jy);
    ctx.lineTo(jx - 0.8 * s, jy + 5.2 * s - u * 2.4 * s);
  }
  ctx.stroke();
  // The tail fan, spread.
  ctx.beginPath();
  ctx.moveTo(-12 * s, 5 * s);
  ctx.lineTo(-17 * s, 3 * s);
  ctx.moveTo(-12 * s, 5 * s);
  ctx.lineTo(-16.5 * s, 7.5 * s);
  ctx.moveTo(-12 * s, 5 * s);
  ctx.lineTo(-13.5 * s, 9.5 * s);
  ctx.stroke();
  // Swimmerets under the abdomen, beating in a wave.
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const lx = 5 * s - k * 3.2 * s, ly = 2.2 * s - k * 0.1 * s;
    const kick = Math.sin(t * 9 - k * 0.9) * 1.5 * s;
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx - 1.5 * s + kick, ly + 3.5 * s);
  }
  ctx.stroke();
  // A dark eye on a stalk, a pointed rostrum, and the antennae streaming back over the body.
  ctx.fillStyle = `rgba(${tint},0.55)`;
  ctx.beginPath();
  ctx.arc(11.5 * s, -2.6 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(12 * s, -3 * s);
  ctx.lineTo(17 * s, -4 * s);
  ctx.moveTo(13 * s, -1 * s);
  ctx.quadraticCurveTo(24 * s, -9 * s, 8 * s, -12 * s + Math.sin(t * 1.3 + i) * 2 * s);
  ctx.quadraticCurveTo(-4 * s, -14 * s, -14 * s, -10 * s + Math.sin(t * 1.1 + i) * 2 * s);
  ctx.moveTo(13 * s, 0);
  ctx.quadraticCurveTo(26 * s, -2 * s, 30 * s, 4 * s + Math.sin(t * 1.5 + i) * 2 * s);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x - dir * 1 * s, y - 2 * s, 6 * s, '255,170,90', 0.35 + 0.15 * Math.sin(t * 2 + i));
  ctx.restore();
}
