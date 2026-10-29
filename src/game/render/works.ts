// Great works in the world (content/works.ts), drawn by the zone that builds them: the lantern
// spire beside the reef in the Midnight Water, the breakwater's arc of stacked stone upslope on the
// Twilight Shelf, the sun terrace's steps at the reef's foot in the Sunlit Crown. Each grows by stage.

import { glow } from './draw.ts';
import type { Focus } from './scene.ts';

/** The lantern spire: a tapering stone shaft from the floor, lamps hung along it at the last stage. */
export function drawSpire(ctx: CanvasRenderingContext2D, F: Focus, stage: number, s: number, t: number, floorY: number): void {
  if (stage <= 0) return;
  const x = F.x + F.w * 0.17;
  const tall = [0, 0.12, 0.42, 0.6][stage]! * F.h;
  const w0 = 26 * s, w1 = 8 * s;
  ctx.save();
  const g = ctx.createLinearGradient(x - w0, 0, x + w0, 0);
  g.addColorStop(0, '#0d1226');
  g.addColorStop(0.5, '#27304f');
  g.addColorStop(1, '#0b0f20');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w0, floorY);
  ctx.quadraticCurveTo(x - w1 * 1.6, floorY - tall * 0.5, x - w1, floorY - tall);
  ctx.lineTo(x + w1, floorY - tall);
  ctx.quadraticCurveTo(x + w1 * 1.6, floorY - tall * 0.5, x + w0, floorY);
  ctx.closePath();
  ctx.fill();
  // Courses of stone.
  ctx.strokeStyle = 'rgba(140,160,220,0.18)';
  ctx.lineWidth = 1 * s;
  for (let y = floorY - 12 * s; y > floorY - tall + 6 * s; y -= 14 * s) {
    const k = (floorY - y) / tall;
    const hw = w0 + (w1 - w0) * k;
    ctx.beginPath();
    ctx.moveTo(x - hw * 0.9, y);
    ctx.lineTo(x + hw * 0.9, y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'lighter';
  // Lamps: a few at the second stage, a column of them and a crown light at the third.
  const lamps = stage >= 3 ? 7 : stage === 2 ? 3 : 0;
  for (let i = 0; i < lamps; i++) {
    const k = (i + 1) / (lamps + 1);
    const ly = floorY - tall * k;
    const side = i % 2 ? 1 : -1;
    const lx = x + side * (w0 + (w1 - w0) * k + 4 * s);
    const pulse = 0.6 + 0.4 * Math.sin(t * 1.2 + i * 1.7);
    glow(ctx, lx, ly, 18 * s, '120,200,255', 0.5 * pulse);
    glow(ctx, lx, ly, 4 * s, '220,245,255', 0.9 * pulse);
  }
  if (stage >= 3) glow(ctx, x, floorY - tall - 6 * s, 50 * s, '140,210,255', 0.45 + 0.15 * Math.sin(t * 0.7));
  ctx.restore();
}

/** The breakwater: courses of rounded stones in an arc along the slope, one more course per stage. */
export function drawBreakwater(ctx: CanvasRenderingContext2D, F: Focus, stage: number, s: number, slope: (u: number) => number): void {
  if (stage <= 0) return;
  ctx.save();
  for (let row = 0; row < stage; row++) {
    for (let i = 0; i < 16; i++) {
      const u = 0.62 + i * 0.022 + (row % 2) * 0.011;
      const x = F.x - F.w * 0.1 + u * F.w * 1.2;
      const y = slope(u) - row * 11 * s - Math.sin((i / 15) * Math.PI) * 6 * s;
      const r = (8 + ((i * 7 + row * 3) % 4)) * s;
      ctx.fillStyle = row === stage - 1 ? '#7d7466' : '#5f584e';
      ctx.beginPath();
      ctx.ellipse(x, y - r * 0.5, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,220,0.12)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.3, y - r * 0.8, r * 0.45, r * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** The sun terrace: flat stepped slabs either side of the reef's foot, green with algae on top. */
export function drawTerrace(ctx: CanvasRenderingContext2D, cx: number, unit: number, stage: number, s: number, floor: (x: number) => number): void {
  if (stage <= 0) return;
  const steps = [0, 1, 3, 5][stage]!;
  ctx.save();
  for (let k = 0; k < steps; k++) {
    for (const side of [-1, 1]) {
      const x = cx + side * (0.16 + k * 0.05) * unit;
      const y = floor(x) - (steps - k) * 5 * s;
      const w = 0.06 * unit, h = 6 * s;
      ctx.fillStyle = '#c9b48c';
      ctx.fillRect(x - w / 2, y, w, h + (steps - k) * 5 * s);
      ctx.fillStyle = 'rgba(110,170,90,0.75)';
      ctx.fillRect(x - w / 2, y - 1.5 * s, w, 3 * s);
    }
  }
  ctx.restore();
}
