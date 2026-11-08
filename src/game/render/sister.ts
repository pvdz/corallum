// The sister reef seen from the deep zones: when it is near your depth, its faint crown shows far
// off in the water on the right, higher on screen when it is above you, lower when below.

import { glow } from './draw.ts';
import type { Focus } from './scene.ts';

/**
 * `delta`: the sister's gauge place minus yours (0..1 scale); drawn within ±0.06.
 * `lit`: the reef lit the way for her: a thread of light runs up from her crown.
 */
export function drawSisterFar(ctx: CanvasRenderingContext2D, F: Focus, delta: number, t: number, s: number, light: boolean, lit = false): void {
  if (Math.abs(delta) > 0.06) return;
  const a = 1 - Math.abs(delta) / 0.06;
  const x = F.x + F.w * 0.88, y = F.y + F.h * (0.55 - delta * 6);
  ctx.save();
  ctx.globalAlpha = 0.35 * a;
  // A small far coral: a few branches in silhouette.
  ctx.strokeStyle = light ? 'rgba(40,70,110,0.9)' : 'rgba(70,80,130,0.9)';
  ctx.lineWidth = 3 * s;
  ctx.lineCap = 'round';
  for (let b = -2; b <= 2; b++) {
    ctx.beginPath();
    ctx.moveTo(x, y + 40 * s);
    ctx.quadraticCurveTo(x + b * 6 * s, y + 10 * s, x + b * 12 * s, y - 14 * s - Math.abs(b) * -4 * s);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  for (let b = -2; b <= 2; b++) glow(ctx, x + b * 12 * s, y - 14 * s + Math.abs(b) * 4 * s, 7 * s, '255,190,210', 0.25 * a * (0.7 + 0.3 * Math.sin(t * 1.1 + b)));
  if (lit) {
    const g = ctx.createLinearGradient(0, F.y, 0, y - 14 * s);
    g.addColorStop(0, 'rgba(255,220,190,0)');
    g.addColorStop(1, `rgba(255,220,190,${0.25 * a})`);
    ctx.strokeStyle = g;
    ctx.lineWidth = (2 + Math.sin(t * 2) * 0.6) * s;
    ctx.beginPath();
    ctx.moveTo(x, y - 14 * s);
    ctx.lineTo(x + Math.sin(t * 0.3) * 4 * s, F.y);
    ctx.stroke();
  }
  ctx.restore();
}
