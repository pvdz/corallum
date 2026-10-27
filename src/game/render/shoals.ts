// Lanternfish shoals and the plankton they herd, shared by every zone the shoals live in.
// Each shoal's path shows its job: feeders circle the reef, light-swimmers spiral above the
// crown, scouts dive into the dark below the frame and come back.

import type { Job } from '../content/act2.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { glow } from './draw.ts';
import type { Reef, ReefLayout } from './reef.ts';
import type { Focus, ReefView } from './scene.ts';

const MAX_DRAWN_SHOALS = 30;
const FISH_PER_SHOAL = 9;

type FishSlot = { ox: number; oy: number; ph: number; size: number };

export function createShoals(seed: number) {
  const fish: FishSlot[] = Array.from({ length: FISH_PER_SHOAL }, (_, k) => ({
    ox: Math.cos(k * 2.4) * (0.4 + (k % 3) * 0.3), oy: Math.sin(k * 1.7) * (0.3 + (k % 2) * 0.35),
    ph: k * 1.3, size: 0.8 + (k % 4) * 0.1,
  }));

  /** Centre of shoal i doing job at time t. */
  function shoalCentre(F: Focus, reef: Reef, job: Job, i: number, n: number, t: number, L: ReefLayout): [number, number] {
    const s = L.s;
    const reefTopY = L.baseY - Math.min(1, L.top) * L.unit;
    const midY = (reefTopY + F.y + F.h) / 2;
    if (job === 'feed') {
      const a = t * 0.22 + (i / Math.max(1, n)) * Math.PI * 2;
      const rx = F.w * (0.24 + 0.05 * (i % 3));
      const ry = F.h * 0.1;
      return [(F.x + F.w * 0.5) + Math.cos(a) * rx, midY + Math.sin(a) * ry + (i % 2 ? 30 : -30) * s];
    }
    if (job === 'light') {
      // The shoal pact: a slow spiral over the crown.
      const [crx, cry] = reef.crown(L);
      const a = t * 0.35 + (i / Math.max(1, n)) * Math.PI * 2;
      const r = (70 + 40 * Math.sin(t * 0.21 + i)) * s;
      return [crx + Math.cos(a) * r * 1.5, cry - 60 * s + Math.sin(a) * r * 0.55];
    }
    // Scouts dive below the frame and come back.
    const period = 26;
    const u = ((t + i * 7.3) % period) / period;
    const dive = u < 0.5 ? u * 2 : 2 - u * 2;
    const ease = dive * dive * (3 - 2 * dive);
    const side = i % 2 ? 1 : -1;
    const x = (F.x + F.w * 0.5) + side * F.w * (0.2 + 0.06 * Math.sin(i)) + Math.sin(t * 0.5 + i) * 20 * s;
    return [x, midY - 40 * s + ease * (F.h * 0.62)];
  }

  function drawFishShoal(ctx: CanvasRenderingContext2D, F: Focus, reef: Reef, job: Job, i: number, n: number, t: number, L: ReefLayout, body: string): void {
    const gs = L.glowScale ?? 1;
    const s = L.s;
    const spread = (job === 'light' ? 22 : 30) * s;
    const flicker = job === 'light' ? 0.5 + 0.5 * Math.max(0, Math.sin(t * 0.35 * 4 + i)) ** 6 : 0;
    const lights: [number, number, number][] = [];
    for (let k = 0; k < fish.length; k++) {
      const f = fish[k]!;
      const lag = k * 0.06;
      const [x0, y0] = shoalCentre(F, reef, job, i, n, t - lag, L);
      const [x1, y1] = shoalCentre(F, reef, job, i, n, t - lag + 0.08, L);
      const x = x0 + f.ox * spread + Math.sin(t * 1.9 + f.ph) * 3 * s;
      const y = y0 + f.oy * spread + Math.cos(t * 1.4 + f.ph) * 3 * s;
      const ang = Math.atan2(y1 - y0, x1 - x0);
      const len = 9 * s * f.size;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, len, len * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      const tail = Math.sin(t * 9 + f.ph) * len * 0.25;
      ctx.beginPath();
      ctx.moveTo(-len * 0.85, 0);
      ctx.lineTo(-len * 1.45, -len * 0.35 + tail);
      ctx.lineTo(-len * 1.45, len * 0.35 + tail);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Photophores along the belly.
      for (let q = 0; q < 3; q++) {
        const d = (q - 1) * len * 0.45;
        lights.push([x + Math.cos(ang) * d - Math.sin(ang) * len * 0.18, y + Math.sin(ang) * d + Math.cos(ang) * len * 0.18, q]);
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rgb = job === 'light' ? '150,255,240' : job === 'scout' ? '190,170,255' : '120,200,255';
    const a = job === 'light' ? 0.35 + 0.4 * flicker : 0.4;
    for (const [lx, ly] of lights) glow(ctx, lx, ly, 3.2 * s * (1 + 0.6 * flicker), rgb, a * gs);
    ctx.restore();
  }

  function drawPlankton(ctx: CanvasRenderingContext2D, F: Focus, t: number, v: ReefView, L: ReefLayout): void {
    const n = Math.round(90 * v.planktonLevel);
    if (n <= 0) return;
    const s = L.s;
    const pr = mulberry32(seed ^ 0x77);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const reefMidY = L.baseY - Math.min(1, L.top) * L.unit * 0.5;
    for (let i = 0; i < n; i++) {
      const side = pr() < 0.5 ? -1 : 1;
      const period = range(pr, 9, 16);
      const ph = pr() * period;
      const yy = range(pr, -0.35, 0.35);
      const u = ((t + ph) % period) / period;
      // Drifts in from the side toward the reef, fading as it is eaten.
      const x = (F.x + F.w * 0.5) + side * F.w * (0.5 - 0.42 * u);
      const y = reefMidY + yy * F.h * (1 - u * 0.6) + Math.sin(t + i) * 6 * s;
      glow(ctx, x, y, 3.2 * s, '230,240,150', 0.55 * Math.sin(u * Math.PI) * (L.glowScale ?? 1));
    }
    ctx.restore();
  }

  function counts(v: ReefView): Record<Job, number> {
    const k = Math.min(MAX_DRAWN_SHOALS, v.shoals) / Math.max(1, v.shoals);
    return { feed: Math.round(v.jobs.feed * k), light: Math.round(v.jobs.light * k), scout: Math.round(v.jobs.scout * k) };
  }

  return {
    /** Scouts and half the feeders, plus plankton: drawn behind the reef. */
    drawBack(ctx: CanvasRenderingContext2D, F: Focus, reef: Reef, L: ReefLayout, v: ReefView, t: number, body = '#16233f'): void {
      const c = counts(v);
      for (let i = 0; i < c.scout; i++) drawFishShoal(ctx, F, reef, 'scout', i, c.scout, t, L, body);
      for (let i = 0; i < c.feed; i += 2) drawFishShoal(ctx, F, reef, 'feed', i, c.feed, t, L, body);
      drawPlankton(ctx, F, t, v, L);
    },
    /** The other feeders and the light-swimmers: drawn in front of the reef. */
    drawFront(ctx: CanvasRenderingContext2D, F: Focus, reef: Reef, L: ReefLayout, v: ReefView, t: number, body = '#16233f'): void {
      const c = counts(v);
      for (let i = 1; i < c.feed; i += 2) drawFishShoal(ctx, F, reef, 'feed', i, c.feed, t, L, body);
      for (let i = 0; i < c.light; i++) drawFishShoal(ctx, F, reef, 'light', i, c.light, t, L, body);
    },
  };
}
