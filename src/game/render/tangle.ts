// A small fish tangled in a jelly's trailing threads, drifting near the reef: tap to free it.

import { glow } from './draw.ts';
import type { Focus } from './scene.ts';
import { spot } from './sightings.ts';

export function drawTangle(ctx: CanvasRenderingContext2D, tg: { k: number; x: number; age: number }, life: number, t: number, focus: Focus, dpr: number): void {
  const s = Math.min(focus.w, focus.h) / 700 * 1.6;
  const a = Math.min(1, tg.age / 2, (life - tg.age) / 3);
  if (a <= 0) return;
  const x = focus.x + focus.w * tg.x + Math.sin(t * 0.4 + tg.k) * 10 * s;
  const y = focus.y + focus.h * (0.3 + 0.05 * Math.sin(t * 0.3 + tg.k)) + tg.age * 1.5 * s;
  spot('tangle', x, y + 30 * s, Math.max(40 * s, 30 * dpr));
  ctx.save();
  ctx.globalAlpha = a;
  // The jelly's bell, pale and pulsing.
  const pulse = 1 + 0.08 * Math.sin(t * 2.5);
  ctx.fillStyle = 'rgba(220,210,240,0.55)';
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * s * pulse, 10 * s, 0, Math.PI, 0);
  ctx.fill();
  // Its threads, trailing down, snarled round the fish.
  ctx.strokeStyle = 'rgba(230,220,250,0.55)';
  ctx.lineWidth = 0.9 * s;
  const fx = x + Math.sin(t * 6) * 3 * s, fy = y + 34 * s;
  for (let i = 0; i < 7; i++) {
    const x0 = x + (i - 3) * 4 * s;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.bezierCurveTo(x0 + Math.sin(t + i) * 6 * s, y + 14 * s, fx + Math.cos(i * 1.7 + t) * 8 * s, fy - 8 * s, fx + Math.cos(i * 2.3) * 7 * s, fy + Math.sin(i * 1.9) * 5 * s);
    ctx.stroke();
  }
  // The fish, wriggling.
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(Math.sin(t * 9) * 0.35);
  ctx.fillStyle = '#e8b050';
  ctx.beginPath();
  ctx.ellipse(0, 0, 7 * s, 3.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-6 * s, 0);
  ctx.lineTo(-11 * s, -3.5 * s);
  ctx.lineTo(-11 * s, 3.5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(3.5 * s, -0.8 * s, 0.9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // A breathing ring, as with feasts: it can be touched.
  const p = (t * 0.6) % 1;
  ctx.strokeStyle = `rgba(255,235,200,${0.35 * (1 - p)})`;
  ctx.lineWidth = 1.2 * dpr;
  ctx.beginPath();
  ctx.arc(fx, fy, (18 + 14 * p) * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, fx, fy, 20 * s, '255,220,160', 0.15);
  ctx.restore();
}

/** On the Silt Floor: a brittle star pinned under a fallen stone, its free arms waving. */
export function drawPinned(ctx: CanvasRenderingContext2D, tg: { k: number; x: number; age: number }, life: number, t: number, focus: Focus, dpr: number): void {
  const s = Math.min(focus.w, focus.h) / 700 * 1.6;
  const a = Math.min(1, tg.age / 2, (life - tg.age) / 3);
  if (a <= 0) return;
  const x = focus.x + focus.w * tg.x, y = focus.y + focus.h * 0.86;
  spot('tangle', x, y - 6 * s, Math.max(36 * s, 30 * dpr));
  ctx.save();
  ctx.globalAlpha = a;
  // Three free arms waving out from under the stone.
  ctx.strokeStyle = 'rgba(230,170,150,0.95)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.8 * s;
  for (let i = 0; i < 3; i++) {
    const base = Math.PI * (0.9 + i * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    let px = x, py = y;
    for (let j = 1; j <= 6; j++) {
      const ang = base + Math.sin(t * 2.5 + i * 2 + j * 0.5) * 0.35;
      px += Math.cos(ang) * 3 * s;
      py += Math.sin(ang) * 1.6 * s - 0.4 * s;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // The stone across it.
  ctx.fillStyle = '#3a3d52';
  ctx.beginPath();
  ctx.ellipse(x + 4 * s, y - 3 * s, 11 * s, 7 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,170,210,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 2 * s, y - 6 * s, 6 * s, 2.5 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();
  const p = (t * 0.6) % 1;
  ctx.strokeStyle = `rgba(255,235,200,${0.35 * (1 - p)})`;
  ctx.lineWidth = 1.2 * dpr;
  ctx.beginPath();
  ctx.arc(x, y - 4 * s, (18 + 14 * p) * s, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
