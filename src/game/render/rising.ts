// The rising: the deep's small life climbing past the reef to feed (Midnight Water, Twilight Shelf).
// A drawn function of (t, how far through the rising): copepods, krill and little lanternfish
// streaming upward, thick in the middle of the water, each with its own speed and wobble.

import type { Focus } from './scene.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { speck } from './draw.ts';

type Riser = { x: number; phase: number; speed: number; wob: number; kind: 0 | 1 | 2; size: number };

const RISERS: Riser[] = (() => {
  const r = mulberry32(0x7153);
  return Array.from({ length: 260 }, () => {
    const k = r();
    return { x: r(), phase: r(), speed: range(r, 0.025, 0.06), wob: r() * 6, kind: (k < 0.6 ? 0 : k < 0.9 ? 1 : 2) as 0 | 1 | 2, size: range(r, 0.7, 1.3) };
  });
})();

/**
 * `amount` 0..1 eases the stream in and out; `lit` draws the risers as the Midnight Water sees them
 * (their own blue sparks) rather than as silhouettes against the Twilight's grey light.
 */
export function drawRising(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, focus: Focus, dpr: number, amount: number, lit: boolean): void {
  if (amount <= 0) return;
  const s = Math.min(focus.w, focus.h) / 700;
  const n = Math.round(RISERS.length * amount);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const q = RISERS[i]!;
    // Upward, wrapping; the stream is densest in a broad band across the middle of the water.
    const u = (q.phase + t * q.speed) % 1;
    const y = h * (1.05 - 1.1 * u);
    const band = Math.exp(-(((q.x - 0.5) / 0.32) ** 2));
    if (band < 0.15 && i % 3 !== 0) continue;
    const x = w * q.x + Math.sin(t * 1.3 + q.wob) * 8 * s;
    const a = Math.min(1, Math.sin(u * Math.PI) * 1.6) * (0.35 + 0.65 * band);
    const z = q.size * s;
    if (q.kind === 0) {
      // A copepod: a speck with two long feelers swept back.
      ctx.fillStyle = lit ? `rgba(150,200,255,${0.75 * a})` : `rgba(30,40,55,${0.6 * a})`;
      speck(ctx, x - 1.2 * z, y - 1.2 * z, 2.4 * z);
      ctx.strokeStyle = lit ? `rgba(150,200,255,${0.35 * a})` : `rgba(30,40,55,${0.3 * a})`;
      ctx.lineWidth = 0.6 * dpr;
      ctx.beginPath();
      ctx.moveTo(x - 4 * z, y + 3 * z); ctx.lineTo(x, y); ctx.lineTo(x + 4 * z, y + 3 * z);
      ctx.stroke();
    } else if (q.kind === 1) {
      // A krill: a little bent comma, head up.
      ctx.strokeStyle = lit ? `rgba(255,170,150,${0.55 * a})` : `rgba(60,45,45,${0.55 * a})`;
      ctx.lineWidth = 1.6 * z;
      ctx.beginPath();
      ctx.arc(x, y + 3 * z, 4 * z, -Math.PI * 0.6, Math.PI * 0.35);
      ctx.stroke();
      if (lit) { ctx.fillStyle = `rgba(160,220,255,${0.8 * a})`; speck(ctx, x - 0.8 * z, y - 0.8 * z, 1.6 * z); }
    } else {
      // A small lanternfish climbing, its row of lights along the belly.
      ctx.fillStyle = lit ? `rgba(40,60,90,${0.8 * a})` : `rgba(35,45,60,${0.7 * a})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 2.4 * z, 7 * z, 0, 0, Math.PI * 2);
      ctx.fill();
      if (lit) {
        ctx.fillStyle = `rgba(140,230,255,${0.9 * a})`;
        for (let k = -1; k <= 1; k++) speck(ctx, x + 1.2 * z, y + k * 3 * z, 1.4 * z);
      }
    }
  }
  ctx.restore();
}
