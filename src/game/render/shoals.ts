// Lanternfish shoals and the plankton they herd, shared by every zone the shoals live in.
// Each shoal's path shows its job: feeders circle the reef, light-swimmers spiral above the
// crown, scouts dive into the dark below the frame and come back.

import { pushed, sight, spot, startled } from './sightings.ts';
import type { Job } from '../content/act2.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { glow } from './draw.ts';
import type { Reef, ReefLayout } from './reef.ts';
import type { Focus, ReefView } from './scene.ts';

// Beyond this many the water already looks full; jobs keep their proportions in what is drawn.
const MAX_DRAWN_SHOALS = 18;
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
    const [sx, sy] = shoalCentre(F, reef, job, i, n, t, L);
    spot('lanternfish', sx, sy, spread * 1.3);
    // Touched, a wave of light runs out through the shoal from the touch, fish to fish.
    const touch = startled('lanternfish', t);
    const wave = touch && touch.age < 1.6 && Math.hypot(touch.x - sx, touch.y - sy) < spread * 2.5 ? touch : null;
    for (let k = 0; k < fish.length; k++) {
      const f = fish[k]!;
      const lag = k * 0.06;
      const [x0, y0] = shoalCentre(F, reef, job, i, n, t - lag, L);
      const [x1, y1] = shoalCentre(F, reef, job, i, n, t - lag + 0.08, L);
      const fx = x0 + f.ox * spread + Math.sin(t * 1.9 + f.ph) * 3 * s;
      const fy = y0 + f.oy * spread + Math.cos(t * 1.4 + f.ph) * 3 * s;
      const [px, py] = pushed(fx, fy, t, 90 * s);
      const x = fx + px, y = fy + py;
      // A darting fish points the way it darts.
      const ang = Math.hypot(px, py) > 6 * s ? Math.atan2(py, px) : Math.atan2(y1 - y0, x1 - x0);
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
    const rgb = job === 'light' ? '150,255,240' : job === 'scout' ? '190,170,255' : job === 'fan' ? '235,215,170' : '120,200,255';
    const a = job === 'light' ? 0.35 + 0.4 * flicker : 0.4;
    for (const [lx, ly] of lights) {
      const boost = wave ? Math.exp(-(((Math.hypot(lx - wave.x, ly - wave.y) - wave.age * 120 * s) / (14 * s)) ** 2)) * (1 - wave.age / 1.6) : 0;
      glow(ctx, lx, ly, 3.2 * s * (1 + 0.6 * flicker + 1.2 * boost), rgb, Math.min(1, a * gs + boost));
    }
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

  /**
   * Shoals away at a ruin: they stream off toward the edge of the water and shrink into the
   * distance, hang there as a few far specks while they search, and stream back before they arrive.
   */
  function drawTrip(ctx: CanvasRenderingContext2D, F: Focus, reef: Reef, L: ReefLayout, v: ReefView, t: number): void {
    const trip = v.trip;
    if (!trip) return;
    const s = L.s;
    const gs = L.glowScale ?? 1;
    const LEG = 45;
    // 0 at the reef, 1 at the ruin: the lights leave one after another, and come home the same way.
    const raw = Math.min(trip.since, trip.left) / LEG;
    const [crx, cry] = reef.crown(L);
    const fx = F.x + F.w * (trip.side > 0 ? 0.96 : 0.04), fy = F.y + F.h * 0.28;
    const m = Math.min(16, trip.shoals);
    // While they search, the ruin itself shows faintly where their lights hang.
    const there = Math.min(1, Math.max(0, raw * 1.35 - 1.2) * 4);
    if (there > 0) drawSite(ctx, trip.site, fx - (trip.side > 0 ? 1 : -1) * 50 * s, fy, s, there);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < m; i++) {
      const di = Math.max(0, Math.min(1, raw * 1.35 - (i / m) * 0.35));
      const e = di * di * (3 - 2 * di);
      const wob = Math.sin(t * 1.3 + i * 2.1) * (14 + 30 * (1 - e)) * s;
      const x = crx + (fx - crx) * e + Math.cos(i * 1.7) * 26 * s * (1 - e) + wob * 0.4;
      const y = (cry + 60 * s) + (fy - cry - 60 * s) * e + Math.sin(i * 2.3 + t * 0.8) * 10 * s * (1 - e * 0.7);
      const far = 1 - 0.82 * e;
      // Far away they are a faint flicker, now and then.
      const flick = e > 0.95 ? 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.7 + i * 1.9)) ** 4 : 1;
      // A shoal is a soft halo with a few bright lamps in it, smaller and dimmer with distance.
      const a = gs * flick * (0.45 + 0.55 * far);
      glow(ctx, x, y, 18 * s * far, '120,190,255', 0.22 * a);
      for (let q = 0; q < 4; q++) {
        const qa = q * 1.7 + i;
        glow(ctx, x + Math.cos(qa + t * 0.9) * 6 * s * far, y + Math.sin(qa * 1.3 + t * 0.7) * 3.5 * s * far, 5 * s * far, '160,215,255', Math.min(1, 0.85 * a));
      }
    }
    ctx.restore();
  }

  /** A ruin's far silhouette: dim, small, the shape that names it. */
  function drawSite(ctx: CanvasRenderingContext2D, site: string, x: number, y: number, s: number, a: number): void {
    ctx.save();
    ctx.globalAlpha = 0.35 * a;
    ctx.strokeStyle = '#8fa6d8';
    ctx.fillStyle = '#5a6e9c';
    ctx.lineWidth = 2 * s;
    const k = 1.4 * s;
    ctx.beginPath();
    if (site === 'gate') {
      ctx.ellipse(x, y, 26 * k, 22 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (site === 'terraces') {
      for (let i = 0; i < 4; i++) ctx.rect(x - 30 * k + i * 12 * k, y + 14 * k - i * 9 * k, 36 * k - i * 6 * k, 6 * k);
      ctx.fill();
    } else if (site === 'lamp-hall') {
      for (let i = 0; i < 4; i++) ctx.rect(x - 24 * k + i * 15 * k, y - 18 * k, 4 * k, 36 * k);
      ctx.rect(x - 28 * k, y - 22 * k, 56 * k, 4 * k);
      ctx.fill();
    } else if (site === 'wells') {
      for (let i = 0; i < 3; i++) ctx.ellipse(x - 20 * k + i * 20 * k, y, 7 * k, 3 * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (site === 'midden') {
      ctx.moveTo(x - 34 * k, y + 14 * k);
      ctx.quadraticCurveTo(x, y - 20 * k, x + 34 * k, y + 14 * k);
      ctx.closePath();
      ctx.fillStyle = '#b8b2a2';
      ctx.fill();
    } else if (site === 'harbour') {
      // The harbour: a ring of worn posts.
      for (let i = 0; i < 7; i++) ctx.rect(x - 36 * k + i * 12 * k, y - (10 + (i % 3) * 4) * k, 4 * k, (24 + (i % 3) * 4) * k);
      ctx.fillStyle = '#cfc6b4';
      ctx.fill();
    } else if (site === 'sun-gate') {
      // A doorway: two posts and a lintel.
      ctx.rect(x - 22 * k, y - 18 * k, 5 * k, 32 * k);
      ctx.rect(x + 17 * k, y - 18 * k, 5 * k, 32 * k);
      ctx.rect(x - 26 * k, y - 22 * k, 52 * k, 6 * k);
      ctx.fillStyle = '#d8d0c0';
      ctx.fill();
    } else if (site === 'carcass') {
      // The whale fall: a long spine and a row of ribs.
      ctx.moveTo(x - 36 * k, y + 8 * k);
      ctx.lineTo(x + 36 * k, y + 6 * k);
      for (let i = 0; i < 8; i++) {
        const rx = x - 26 * k + i * 7.5 * k;
        ctx.moveTo(rx, y + 7 * k);
        ctx.quadraticCurveTo(rx + 3 * k, y - 8 * k, rx + 1 * k, y - 14 * k + Math.abs(i - 3.5) * 1.5 * k);
      }
      ctx.strokeStyle = '#c8c0b0';
      ctx.stroke();
    } else {
      // Roaming: only the dark.
      ctx.restore();
      return;
    }
    ctx.restore();
  }

  function counts(v: ReefView): Record<Job, number> {
    const k = Math.min(MAX_DRAWN_SHOALS, v.shoals) / Math.max(1, v.shoals);
    return { feed: Math.round(v.jobs.feed * k), light: Math.round(v.jobs.light * k), scout: Math.round(v.jobs.scout * k), fan: Math.round(v.jobs.fan * k) };
  }

  return {
    /** Scouts and half the feeders, plus plankton: drawn behind the reef. */
    drawBack(ctx: CanvasRenderingContext2D, F: Focus, reef: Reef, L: ReefLayout, v: ReefView, t: number, body = '#16233f'): void {
      const c = counts(v);
      for (let i = 0; i < c.scout; i++) drawFishShoal(ctx, F, reef, 'scout', i, c.scout, t, L, body);
      for (let i = 0; i < c.fan; i++) drawFishShoal(ctx, F, reef, 'fan', i, c.fan, t, L, body);
      for (let i = 0; i < c.feed; i += 2) drawFishShoal(ctx, F, reef, 'feed', i, c.feed, t, L, body);
      drawPlankton(ctx, F, t, v, L);
      drawTrip(ctx, F, reef, L, v, t);
    },
    /** The other feeders and the light-swimmers: drawn in front of the reef. */
    drawFront(ctx: CanvasRenderingContext2D, F: Focus, reef: Reef, L: ReefLayout, v: ReefView, t: number, body = '#16233f'): void {
      const c = counts(v);
      if (v.shoals > 0) sight('lanternfish');
      for (let i = 1; i < c.feed; i += 2) drawFishShoal(ctx, F, reef, 'feed', i, c.feed, t, L, body);
      for (let i = 0; i < c.light; i++) drawFishShoal(ctx, F, reef, 'light', i, c.light, t, L, body);
    },
  };
}
