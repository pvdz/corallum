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
      // The shoal pact: a slow spiral over the crown. Each shoal keeps its own ring (wide or close,
      // high or low, a little faster or slower), so many of them make a loose turning cloud, not a disc.
      const [crx, cry] = reef.crown(L);
      const q = (i * 0.618034) % 1, hi = (i * 0.381966 + 0.5) % 1;
      const a = t * (0.3 + 0.1 * q) + (i / Math.max(1, n)) * Math.PI * 2;
      const r = (45 + 95 * q + 25 * Math.sin(t * 0.21 + i)) * s;
      return [crx + Math.cos(a) * r * 1.5, cry - (10 + 170 * hi) * s + Math.sin(a) * r * 0.5];
    }
    if (job === 'guard') {
      // On guard: a tight, quick ring round the crown, some going each way.
      const [crx, cry] = reef.crown(L);
      const dir = i % 2 ? 1 : -1;
      const a = dir * t * 0.9 + (i / Math.max(1, n)) * Math.PI * 2;
      const r = (95 + 12 * (i % 3)) * s;
      return [crx + Math.cos(a) * r, cry + 10 * s + Math.sin(a) * r * 0.45];
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
    const eyes: number[] = [];
    const [sx, sy] = shoalCentre(F, reef, job, i, n, t, L);
    spot('lanternfish', sx, sy, spread * 1.3);
    // Touched, a wave of light runs out through the shoal from the touch, fish to fish.
    const touch = startled('lanternfish', t);
    const wave = touch && touch.age < 1.6 && Math.hypot(touch.x - sx, touch.y - sy) < spread * 2.5 ? touch : null;
    // Every fish of the shoal in one path, one fill: bodies are rotated ellipses, tails rotated by hand.
    ctx.fillStyle = body;
    ctx.beginPath();
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
      const ca = Math.cos(ang), sa = Math.sin(ang);
      // A point (u along the fish, w across it) in screen space.
      const px2 = (u: number, w: number) => x + u * ca - w * sa;
      const py2 = (u: number, w: number) => y + u * sa + w * ca;
      ctx.moveTo(px2(len, 0), py2(len, 0));
      ctx.ellipse(x, y, len, len * 0.3, ang, 0, Math.PI * 2);
      const tail = Math.sin(t * 9 + f.ph) * len * 0.25;
      // Wound the same way as the ellipse, so overlaps fill instead of cancelling (nonzero rule).
      ctx.moveTo(px2(-len * 0.85, 0), py2(-len * 0.85, 0));
      ctx.lineTo(px2(-len * 1.45, len * 0.35 + tail), py2(-len * 1.45, len * 0.35 + tail));
      ctx.lineTo(px2(-len * 1.45, -len * 0.35 + tail), py2(-len * 1.45, -len * 0.35 + tail));
      ctx.closePath();
      // A big eye near the snout (lanternfish have huge eyes).
      eyes.push(px2(len * 0.62, -len * 0.06), py2(len * 0.62, -len * 0.06), len * 0.13);
      // Photophores along the belly.
      for (let q = 0; q < 3; q++) {
        const d = (q - 1) * len * 0.45;
        lights.push([x + Math.cos(ang) * d - Math.sin(ang) * len * 0.18, y + Math.sin(ang) * d + Math.cos(ang) * len * 0.18, q]);
      }
    }
    ctx.fill();
    // The eyes, one fill: pale rims with dark middles read at any size as an eye.
    ctx.fillStyle = 'rgba(200,215,235,0.55)';
    ctx.beginPath();
    for (let k = 0; k < eyes.length; k += 3) { ctx.moveTo(eyes[k]! + eyes[k + 2]!, eyes[k + 1]!); ctx.arc(eyes[k]!, eyes[k + 1]!, eyes[k + 2]!, 0, Math.PI * 2); }
    ctx.fill();
    ctx.fillStyle = 'rgba(8,10,20,0.9)';
    ctx.beginPath();
    for (let k = 0; k < eyes.length; k += 3) { const er = eyes[k + 2]! * 0.6; ctx.moveTo(eyes[k]! + er, eyes[k + 1]!); ctx.arc(eyes[k]!, eyes[k + 1]!, er, 0, Math.PI * 2); }
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rgb = job === 'light' ? '150,255,240' : job === 'scout' ? '190,170,255' : job === 'fan' ? '235,215,170' : job === 'guard' ? '255,200,120' : '120,200,255';
    const a = job === 'light' ? 0.35 + 0.4 * flicker : 0.4;
    // Each fish's row of lights: one soft glow round the middle one, and the three as points, all the
    // shoal's points in one fill (three glow sprites a fish were ~13% of the Midnight Water's draw).
    ctx.fillStyle = `rgba(${rgb},${Math.min(1, (a * gs) * 1.4).toFixed(3)})`;
    ctx.beginPath();
    for (let k = 0; k < lights.length; k++) {
      const [lx, ly] = lights[k]!;
      const pr = 1.1 * s * (1 + 0.4 * flicker);
      ctx.moveTo(lx + pr, ly);
      ctx.arc(lx, ly, pr, 0, Math.PI * 2);
      if (k % 3 !== 1) continue;
      const boost = wave ? Math.exp(-(((Math.hypot(lx - wave.x, ly - wave.y) - wave.age * 120 * s) / (14 * s)) ** 2)) * (1 - wave.age / 1.6) : 0;
      glow(ctx, lx, ly, 5.2 * s * (1 + 0.6 * flicker + 1.2 * boost), rgb, Math.min(1, a * gs * 0.9 + boost));
    }
    ctx.fill();
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
    // Far seabed under it, so it stands somewhere instead of hanging in the water.
    if (['gate', 'terraces', 'lamp-hall', 'wells', 'midden', 'harbour', 'sun-gate', 'carcass'].includes(site)) {
      ctx.save();
      ctx.globalAlpha = 0.35 * a * 0.6;
      ctx.fillStyle = '#3e4c70';
      ctx.beginPath();
      ctx.moveTo(x - 60 * k, y + 18 * k);
      ctx.bezierCurveTo(x - 40 * k, y + 11 * k, x + 30 * k, y + 10 * k, x + 60 * k, y + 18 * k);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    if (site === 'gate') {
      // A round gate of fitted blocks standing on two stubs of wall, half sunk in silt.
      ctx.lineWidth = 6 * k;
      for (let i = 0; i < 12; i++) {
        const a0 = (i / 12) * Math.PI * 2 + 0.06, a1 = ((i + 1) / 12) * Math.PI * 2 - 0.06;
        ctx.beginPath();
        ctx.ellipse(x, y, 24 * k, 21 * k, 0, a0, a1);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.rect(x - 34 * k, y + 8 * k, 9 * k, 18 * k);
      ctx.rect(x + 25 * k, y + 8 * k, 9 * k, 18 * k);
      ctx.rect(x - 40 * k, y + 24 * k, 80 * k, 4 * k);
      ctx.fill();
    } else if (site === 'terraces') {
      // Stepped terraces cut into a slope: one stepped silhouette, each tread a little worn.
      ctx.moveTo(x - 40 * k, y + 18 * k);
      let px = x - 34 * k, py = y + 18 * k;
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(px, py - 8 * k);
        ctx.quadraticCurveTo(px + 6 * k, py - 9 * k, px + 12 * k - i * k, py - 8 * k);
        px += 12 * k - i * k;
        py -= 8 * k;
      }
      ctx.lineTo(px + 8 * k, py + 2 * k);
      ctx.lineTo(x + 40 * k, y + 18 * k);
      ctx.closePath();
      ctx.fill();
    } else if (site === 'lamp-hall') {
      // The hall's broken colonnade: columns of uneven height with flared capitals, a stretch of
      // roof still lying across the first two, the last column a stump.
      const tops = [-18, -18, -8, 4];
      for (let i = 0; i < 4; i++) {
        const cx = x - 24 * k + i * 15 * k, top = y + tops[i]! * k;
        ctx.rect(cx, top, 4 * k, y + 18 * k - top);
        if (i < 3) ctx.rect(cx - 1.5 * k, top - 1.5 * k, 7 * k, 2 * k);
      }
      ctx.moveTo(x - 28 * k, y - 22 * k);
      ctx.lineTo(x - 2 * k, y - 22 * k);
      ctx.lineTo(x + 1 * k, y - 20.5 * k);
      ctx.lineTo(x - 3 * k, y - 18.5 * k);
      ctx.lineTo(x - 28 * k, y - 18.5 * k);
      ctx.closePath();
      ctx.fill();
    } else if (site === 'wells') {
      // Three well-heads of stacked stone at different heights, each a squat drum with a dark
      // mouth (outlined rings in a row read as portholes).
      for (let i = 0; i < 3; i++) {
        const wx = x - 22 * k + i * 21 * k + (i === 1 ? 1 : 0) * k, hgt = (6 + (i % 2) * 4) * k, wy = y + (i === 1 ? -2 : 1) * k;
        ctx.rect(wx - 7 * k, wy, 14 * k, hgt);
        ctx.moveTo(wx + 7 * k, wy);
        ctx.ellipse(wx, wy, 7 * k, 2.6 * k, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = '#1a2240';
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const wx = x - 22 * k + i * 21 * k + (i === 1 ? 1 : 0) * k, wy = y + (i === 1 ? -2 : 1) * k;
        ctx.moveTo(wx + 5 * k, wy);
        ctx.ellipse(wx, wy, 5 * k, 1.6 * k, 0, 0, Math.PI * 2);
      }
      ctx.fill();
    } else if (site === 'midden') {
      // A heap of shell and bone: a lumpy mound, broken shells and a curved rib sticking out of it.
      ctx.moveTo(x - 36 * k, y + 16 * k);
      for (let i = 1; i < 12; i++) {
        const u = i / 12, hx = x - 36 * k + u * 72 * k;
        ctx.lineTo(hx, y + 16 * k - Math.sin(u * Math.PI) * (26 + 4 * Math.sin(i * 2.7)) * k);
      }
      ctx.lineTo(x + 36 * k, y + 16 * k);
      ctx.closePath();
      ctx.fillStyle = '#b8b2a2';
      ctx.fill();
      ctx.strokeStyle = '#d6d0c0';
      ctx.lineWidth = 2.4 * k;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 6 * k, y - 8 * k);
      ctx.quadraticCurveTo(x + 14 * k, y - 22 * k, x + 24 * k, y - 20 * k);
      ctx.moveTo(x - 14 * k, y - 4 * k);
      ctx.lineTo(x - 20 * k, y - 15 * k);
      ctx.stroke();
      ctx.fillStyle = '#d6d0c0';
      ctx.beginPath();
      for (const [sx, sy, sr] of [[-22, 6, 4], [-4, -6, 3.5], [16, 4, 4.5], [4, 10, 3]] as const) {
        ctx.moveTo(x + sx * k, y + sy * k);
        ctx.arc(x + sx * k, y + sy * k, sr * k, Math.PI, 0);
        ctx.closePath();
      }
      ctx.fill();
    } else if (site === 'harbour') {
      // The harbour: a curve of worn mooring posts, leaning every way, their tops rotted to points
      // or snapped short, the nearer ones bigger.
      for (let i = 0; i < 7; i++) {
        const u = i / 6, near = 0.75 + 0.35 * Math.sin(u * Math.PI);
        const px = x - 36 * k + i * 12 * k, base = y + (14 + 4 * Math.sin(u * Math.PI)) * k;
        const hgt = (18 + ((i * 7) % 5) * 3) * k * near, w = 2.4 * k * near, lean = Math.sin(i * 2.3) * 4 * k;
        const snapped = i % 3 === 1;
        ctx.moveTo(px - w, base);
        ctx.lineTo(px - w * 0.8 + lean, base - hgt);
        if (snapped) ctx.lineTo(px + lean, base - hgt + 2 * k);
        else ctx.lineTo(px + lean + w * 0.2, base - hgt - 3 * k);
        ctx.lineTo(px + w * 0.8 + lean, base - hgt + (snapped ? -1 : 0) * k);
        ctx.lineTo(px + w, base);
        ctx.closePath();
      }
      ctx.fillStyle = '#cfc6b4';
      ctx.fill();
    } else if (site === 'sun-gate') {
      // A doorway left standing: two weathered posts, one shorter, and the lintel across them
      // tilted where it has slipped, its far end broken off.
      ctx.moveTo(x - 22 * k, y + 14 * k);
      ctx.lineTo(x - 21.5 * k, y - 18 * k);
      ctx.lineTo(x - 16.5 * k, y - 18.5 * k);
      ctx.lineTo(x - 17 * k, y + 14 * k);
      ctx.moveTo(x + 17 * k, y + 14 * k);
      ctx.lineTo(x + 17.4 * k, y - 14.5 * k);
      ctx.lineTo(x + 22 * k, y - 15 * k);
      ctx.lineTo(x + 22.5 * k, y + 14 * k);
      ctx.moveTo(x - 26 * k, y - 23 * k);
      ctx.lineTo(x + 18 * k, y - 19.5 * k);
      ctx.lineTo(x + 20 * k, y - 16.5 * k);
      ctx.lineTo(x + 16 * k, y - 14 * k);
      ctx.lineTo(x - 26 * k, y - 17 * k);
      ctx.closePath();
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
    return { feed: Math.round(v.jobs.feed * k), light: Math.round(v.jobs.light * k), scout: Math.round(v.jobs.scout * k), fan: Math.round(v.jobs.fan * k), guard: Math.round((v.jobs.guard ?? 0) * k) };
  }

  return {
    /** Scouts and half the feeders, plus plankton: drawn behind the reef. */
    drawBack(ctx: CanvasRenderingContext2D, F: Focus, reef: Reef, L: ReefLayout, v: ReefView, t: number, body = '#16233f'): void {
      const c = counts(v);
      for (let i = 0; i < c.scout; i++) drawFishShoal(ctx, F, reef, 'scout', i, c.scout, t, L, body);
      for (let i = 0; i < c.fan; i++) drawFishShoal(ctx, F, reef, 'fan', i, c.fan, t, L, body);
      for (let i = 0; i < c.guard; i++) drawFishShoal(ctx, F, reef, 'guard', i, c.guard, t, L, body);
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
