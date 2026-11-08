// Feedback for a tap on the water (a sweep): a ripple where the finger landed, and a few motes
// of food drawn along curved paths into the reef's crown, which flares when they arrive.
// Drawn over whichever scene is showing; times are scene time, so it freezes with ?t.

import { mulberry32 } from '../sim/rng.ts';
import { glow, ring } from './draw.ts';

type Tap = { x: number; y: number; start: number; seed: number; motes: number };

const RIPPLE = 0.9;
const TRAVEL = 0.75;
const LIFE = 1.4;

export function createTaps() {
  const taps: Tap[] = [];
  let count = 0;

  return {
    /** A sweep at device pixel (x, y). */
    push(x: number, y: number, t: number, motes = 6): void {
      taps.push({ x, y, start: t, seed: 0x7a95 + count++ * 7919, motes });
      if (taps.length > 12) taps.shift();
    },
    draw(ctx: CanvasRenderingContext2D, t: number, crown: readonly [number, number], s: number,
      dark: (x: number, y: number) => boolean = () => false): void {
      for (let i = taps.length - 1; i >= 0; i--) if (t - taps[i]!.start > LIFE || t < taps[i]!.start) taps.splice(i, 1);
      if (!taps.length) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const [cx, cy] = crown;
      // The crown's flare: one glow at the strongest tap's strength, so quick taps keep it lit
      // instead of stacking flare on flare into a white blot.
      let flare = 0, flareR = 0;
      for (const tap of taps) {
        const age = t - tap.start;
        if (age < RIPPLE && dark(tap.x, tap.y)) {
          // In the dark water the disturbance lights the plankton: a burst of blue sparks.
          const k = age / RIPPLE;
          const sr = mulberry32(tap.seed ^ 0x5a5a);
          for (let p = 0; p < 18; p++) {
            const a = sr() * Math.PI * 2, d = (10 + sr() * 40) * s * (0.4 + 0.6 * k);
            glow(ctx, tap.x + Math.cos(a) * d, tap.y + Math.sin(a) * d, 4 * s, '90,200,255', (1 - k) * (0.5 + 0.5 * sr()));
          }
        }
        if (age < RIPPLE) {
          const k = age / RIPPLE;
          ring(ctx, tap.x, tap.y, (8 + 46 * k) * s, '170,240,255', 0.5 * (1 - k), 1.5 * s);
          if (k > 0.2) ring(ctx, tap.x, tap.y, (4 + 30 * (k - 0.2)) * s, '170,240,255', 0.3 * (1 - k), 1 * s);
          glow(ctx, tap.x, tap.y, 26 * s * (1 - k * 0.5), '140,230,255', 0.35 * (1 - k));
        }
        const rng = mulberry32(tap.seed);
        let arrived = 0;
        for (let m = 0; m < tap.motes; m++) {
          const delay = rng() * 0.25;
          const bend = (rng() - 0.5) * 0.8;
          const u = (age - delay) / TRAVEL;
          if (u < 0) continue;
          if (u >= 1) { arrived++; continue; }
          // Ease in: the reef pulls harder as the food comes closer.
          const e = u * u * (3 - 2 * u);
          const dx = cx - tap.x, dy = cy - tap.y;
          const x = tap.x + dx * e - dy * bend * Math.sin(Math.PI * e);
          const y = tap.y + dy * e + dx * bend * Math.sin(Math.PI * e);
          // Each mote dims as it sinks into the reef: many arriving together light the crown, the
          // flare below says so, without their cores piling up to white.
          // They gather out of the stirred water (fading in, or six start as one white spot).
          const fade = Math.min(1, u / 0.2) * (1 - 0.7 * e);
          glow(ctx, x, y, 10 * s, '255,215,190', 0.8 * fade);
          // A short trail back along the path.
          const e2 = Math.max(0, e - 0.08);
          glow(ctx, tap.x + dx * e2 - dy * bend * Math.sin(Math.PI * e2), tap.y + dy * e2 + dx * bend * Math.sin(Math.PI * e2),
            6 * s, '255,190,160', 0.35 * fade);
        }
        if (arrived) {
          const a = 0.45 * Math.max(0, 1 - (age - TRAVEL) / (LIFE - TRAVEL));
          if (a > flare) { flare = a; flareR = (30 + 6 * arrived) * s; }
        }
      }
      if (flare > 0) glow(ctx, cx, cy, flareR, '160,250,255', flare);
      ctx.restore();
    },
  };
}
