// The thorn star: a coral-eating starfish climbing the reef (content/events.ts THORN), drawn on the
// coral on one side, higher as its time runs. Tap it off; touched, it is gone.

import type { Reef, ReefLayout } from './reef.ts';
import { sight, spot } from './sightings.ts';

/** `u`: 0..1 through its climb; `side`: −1 left, 1 right. */
export function drawThorn(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, u: number, side: number, t: number): void {
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
