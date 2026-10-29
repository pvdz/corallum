// The thorn star: a coral-eating starfish climbing the reef (content/events.ts THORN), drawn on the
// coral on one side, higher as its time runs. Tap it off; touched, it is gone.

import type { Reef, ReefLayout } from './reef.ts';
import { glow } from './draw.ts';
import { sight, spot } from './sightings.ts';

/** `u`: 0..1 through its climb; `side`: −1 left, 1 right. */
export function drawThorn(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, u: number, side: number, t: number,
  kind: 'thorn-star' | 'drill-snail' = 'thorn-star'): void {
  const c = reef.coral;
  const want = (0.12 + 0.55 * u) * L.top;
  let best = -1, bestD = Infinity;
  for (let i = 0; i < c.count; i++) {
    if (c.y[i]! > L.top || Math.sign(c.x[i]!) !== side) continue;
    const d = Math.abs(c.y[i]! - want) + Math.abs(Math.abs(c.x[i]!) - 0.12) * 0.5;
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best < 0) return;
  const [x, y] = reef.nodePx(L, best);
  const s = L.s * 1.5;
  if (kind === 'drill-snail') {
    drawSnail(ctx, x, y, s, t);
    return;
  }
  sight('thorn-star');
  spot('thorn-star', x, y, 18 * s);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.3) * 0.2);
  const arms = 13;
  // Arms, then spines along them, then the disc.
  ctx.fillStyle = '#7a2f5c';
  ctx.beginPath();
  for (let a = 0; a < arms * 2; a++) {
    const th = (a / (arms * 2)) * Math.PI * 2;
    const r = (a % 2 ? 4.5 : 11 + Math.sin(a + t) * 0.6) * s;
    ctx.lineTo(Math.cos(th) * r, Math.sin(th) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#e3a0c8';
  ctx.lineWidth = 0.7 * s;
  ctx.beginPath();
  for (let a = 0; a < arms; a++) {
    const th = (a / arms) * Math.PI * 2;
    for (const r of [5, 8]) {
      const px = Math.cos(th) * r * s, py = Math.sin(th) * r * s;
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(th + 0.8) * 2.4 * s, py + Math.sin(th + 0.8) * 2.4 * s);
    }
  }
  ctx.stroke();
  ctx.fillStyle = '#a3477c';
  ctx.beginPath();
  ctx.arc(0, 0, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The dragonfish: slinks in from one side toward the feeding shoals as `u` runs 0..1. */
export function drawDragonfish(ctx: CanvasRenderingContext2D, F: { x: number; y: number; w: number; h: number }, u: number, side: number,
  t: number, s: number): void {
  const e = Math.min(1, u * 2.2);
  const x0 = side > 0 ? F.x + F.w * 1.08 : F.x - F.w * 0.08;
  const x1 = F.x + F.w * (0.5 + side * 0.28);
  const x = x0 + (x1 - x0) * (e * e * (3 - 2 * e)) + Math.sin(t * 0.6) * 10 * s;
  const y = F.y + F.h * 0.58 + Math.sin(t * 0.4) * 14 * s;
  const k = 1.6 * s;
  sight('dragonfish');
  spot('dragonfish', x, y, 34 * k);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-side, 1);
  // A long eel-like body, darker than the water.
  ctx.fillStyle = '#05060c';
  ctx.beginPath();
  ctx.moveTo(18 * k, 0);
  ctx.quadraticCurveTo(10 * k, -6 * k, -8 * k, -4 * k);
  ctx.quadraticCurveTo(-30 * k, -2 * k + Math.sin(t * 3) * 2 * k, -44 * k, Math.sin(t * 3 + 1) * 3 * k);
  ctx.quadraticCurveTo(-30 * k, 3 * k, -8 * k, 4 * k);
  ctx.quadraticCurveTo(10 * k, 6 * k, 18 * k, 0);
  ctx.fill();
  // A faint rim of the shoals' light along its back, so the dark shape reads.
  ctx.strokeStyle = 'rgba(110,150,220,0.35)';
  ctx.lineWidth = 1 * k;
  ctx.stroke();
  // Fangs.
  ctx.strokeStyle = 'rgba(230,230,240,0.7)';
  ctx.lineWidth = 0.6 * k;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(16 * k - i * 2.2 * k, 0.5 * k);
    ctx.lineTo(15 * k - i * 2.2 * k, 3 * k);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  // The red lamp under its eye, and a blue line of photophores, and the barbel's lure.
  glow(ctx, 11 * k, -1.5 * k, 7 * k, '255,60,50', 0.8);
  for (let i = 0; i < 6; i++) glow(ctx, 4 * k - i * 6 * k, 3 * k, 2.2 * k, '120,170,255', 0.6);
  const bx = 16 * k + Math.sin(t * 1.5) * 4 * k, by = 14 * k;
  ctx.strokeStyle = 'rgba(150,180,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(12 * k, 3 * k);
  ctx.quadraticCurveTo(14 * k, 9 * k, bx, by);
  ctx.stroke();
  glow(ctx, bx, by, 6 * k, '150,200,255', 0.75 + 0.25 * Math.sin(t * 4));
  ctx.restore();
}

/** A drill snail on the coral: a spired shell, ridged, its foot clamped to the branch. */
function drawSnail(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  sight('drill-snail');
  spot('drill-snail', x, y, 16 * s);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5 + Math.sin(t * 0.4) * 0.05);
  ctx.fillStyle = 'rgba(200,170,150,0.7)';
  ctx.beginPath();
  ctx.ellipse(0, 3 * s, 7 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(-6 * s, -10 * s, 6 * s, 3 * s);
  g.addColorStop(0, '#e8dcc8');
  g.addColorStop(1, '#9a7c62');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-6 * s, 2 * s);
  ctx.quadraticCurveTo(-5 * s, -5 * s, 0, -12 * s);
  ctx.quadraticCurveTo(5 * s, -5 * s, 6 * s, 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,40,0.6)';
  ctx.lineWidth = 0.8 * s;
  for (let k = 0; k < 4; k++) {
    const yy = 1 * s - k * 3 * s, hw = 5.5 * s - k * 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-hw, yy);
    ctx.quadraticCurveTo(0, yy - 1.5 * s, hw, yy - 1 * s);
    ctx.stroke();
  }
  ctx.restore();
}
