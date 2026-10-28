// The drowned towers of Thousandfold: dead reef pillars standing in the water around the
// seamount, at three distances. Their broken tops sit at fixed heights in metres, so as the
// reef climbs they sink through the frame: near ones fast, far ones slowly. Shared by the
// Silt Floor, the Midnight Water and the Twilight Shelf, each with its own colours.

import { mulberry32, range } from '../sim/rng.ts';
import { glow } from './draw.ts';
import type { Focus } from './scene.ts';

type Stub = { m: number; side: -1 | 1; len: number; lift: number };
type Tower = {
  x: number; top: number; width: number; ph: [number, number, number];
  crown: [number, number][]; stubs: Stub[]; lights: { m: number; u: number; period: number; phase: number }[];
};

/** Metres of height that one frame-height spans, per layer (far → near). */
const SPAN = [2600, 1400, 760] as const;
const WIDTH = [0.035, 0.05, 0.075] as const;

export type RuinStyle = {
  /** Per layer: fill at the top and the bottom of the frame, and the light caught by the crown. */
  layers: readonly { top: string; bottom: string; rim: string }[];
  /** Colour of the banding lines; '' for none. */
  bands: string;
  /** Colour ("r,g,b") of the faint lights that still burn in the old stone; '' for none. */
  lights: string;
};

export function createRuins(seed: number) {
  const rng = mulberry32(seed ^ 0x51d0a7);
  const layers: Tower[][] = [7, 5, 4].map((n, d) => Array.from({ length: n }, (_, i) => {
    // Spread across the frame; the near layers keep out of the reef's middle.
    let x = (i + range(rng, 0.15, 0.85)) / n;
    if (d > 0 && Math.abs(x - 0.5) < 0.2) x = x < 0.5 ? x - 0.2 : x + 0.2;
    return {
      x,
      // Log-uniform tops: most broke off deep down, a few once reached the light.
      top: 120 * Math.exp(rng() * Math.log(3900 / 120)),
      width: WIDTH[d]! * range(rng, 0.7, 1.4),
      ph: [rng() * 6.28, rng() * 6.28, rng() * 6.28],
      // Broken top: a few rounded stumps of different heights across the width.
      crown: Array.from({ length: 7 }, (_, k) => [
        (k + range(rng, -0.25, 0.25)) / 6, k % 2 ? range(rng, 0.2, 1.6) : range(rng, -0.1, 0.35),
      ] as [number, number]),
      stubs: Array.from({ length: 2 + Math.floor(rng() * 4) }, () => ({
        m: range(rng, 30, 600), side: rng() < 0.5 ? -1 : 1, len: range(rng, 0.6, 1.6), lift: range(rng, 0.3, 1.2),
      })),
      lights: Array.from({ length: 3 }, () => ({
        m: range(rng, 10, 900), u: range(rng, -0.7, 0.7), period: range(rng, 6, 15), phase: rng() * 15,
      })),
    } satisfies Tower;
  }));

  function halfWidth(tw: Tower, base: number, m: number): number {
    // The stone thickens downward (rubble) and wavers where bands grew uneven.
    const wob = 0.09 * Math.sin(m * 0.011 + tw.ph[0]) + 0.05 * Math.sin(m * 0.047 + tw.ph[1]) + 0.025 * Math.sin(m * 0.21 + tw.ph[2]);
    return base * (1 + Math.min(0.5, m / 1600) + wob);
  }

  /** The broken crown from the left edge to the right edge, as smooth stumps. */
  function crownPath(ctx: CanvasRenderingContext2D, tw: Tower, x: number, topY: number, hw: number, base: number): void {
    const pts = tw.crown.map(([u, c]) => [x - hw + 2 * hw * Math.min(1, Math.max(0, u)), topY - c * base] as const);
    ctx.lineTo(pts[0]![0], pts[0]![1]);
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1]!, [bx, by] = pts[k]!;
      ctx.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
    }
    const last = pts[pts.length - 1]!;
    ctx.lineTo(last[0], last[1]);
  }

  function drawTower(ctx: CanvasRenderingContext2D, tw: Tower, d: number, x: number, topY: number, ppm: number, base: number,
    h: number, style: RuinStyle): void {
    const L = style.layers[d]!;
    const step = Math.max(6, h / 70);
    const fill = ctx.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, L.top);
    fill.addColorStop(1, L.bottom);
    ctx.fillStyle = fill;
    // Outline: down the right side, back up the left, with a broken crown across the top.
    ctx.beginPath();
    const y0 = Math.max(topY, -step * 2);
    const rightPts: [number, number][] = [];
    for (let y = y0; ; y += step) {
      const yy = Math.min(y, h + step);
      const m = (yy - topY) / ppm;
      rightPts.push([x + halfWidth(tw, base, m) * (1 + 0.05 * Math.sin(m * 0.09 + tw.ph[2])), yy]);
      if (yy >= h + step) break;
    }
    const crownVisible = topY > -step * 2;
    if (crownVisible) {
      const hw = halfWidth(tw, base, 0);
      ctx.moveTo(x - hw, topY);
      crownPath(ctx, tw, x, topY, hw, base);
      ctx.lineTo(x + hw, topY);
    }
    else ctx.moveTo(rightPts[0]![0], rightPts[0]![1]);
    for (const [px, py] of rightPts) ctx.lineTo(px, py);
    for (let i = rightPts.length - 1; i >= 0; i--) {
      const py = rightPts[i]![1];
      const m = (py - topY) / ppm;
      ctx.lineTo(x - halfWidth(tw, base, m) * (1 + 0.05 * Math.sin(m * 0.07 + tw.ph[0])), py);
    }
    ctx.closePath();
    ctx.fill();
    // Light from above catches the broken top and fades down the stone.
    if (crownVisible) {
      ctx.save();
      ctx.clip();
      const cap = ctx.createLinearGradient(0, topY - base * 1.6, 0, topY + base * 3);
      cap.addColorStop(0, L.rim);
      cap.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cap;
      ctx.fillRect(x - base * 3, topY - base * 2, base * 6, base * 5);
      ctx.restore();
    }
    // Dead branch stubs reaching out and up.
    ctx.strokeStyle = fill;
    ctx.lineCap = 'round';
    for (const s of tw.stubs) {
      const sy = topY + s.m * ppm;
      if (sy < -base * 3 || sy > h + base) continue;
      const hw = halfWidth(tw, base, s.m);
      const sx = x + s.side * hw * 0.8;
      ctx.lineWidth = base * 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(sx + s.side * base * s.len, sy - base * 0.2, sx + s.side * base * s.len * 1.4, sy - base * s.lift * 1.6);
      ctx.stroke();
    }
    // Growth bands: the old reef's memory, one line every 40 m of stone.
    if (style.bands && d > 0) {
      ctx.strokeStyle = style.bands;
      ctx.lineWidth = 1;
      const first = Math.max(1, Math.ceil(((y0 - topY) / ppm) / 40));
      for (let k = first; ; k++) {
        const by = topY + k * 40 * ppm;
        if (by > h) break;
        const hw = halfWidth(tw, base, k * 40) * 0.92;
        ctx.beginPath();
        ctx.moveTo(x - hw, by);
        ctx.quadraticCurveTo(x, by + base * 0.25, x + hw, by);
        ctx.stroke();
      }
    }
  }

  /** The few lights still burning in the old stone (drawn every frame; they flicker). */
  function drawLights(ctx: CanvasRenderingContext2D, tw: Tower, x: number, topY: number, ppm: number, base: number, h: number,
    rgb: string, t: number): void {
    for (const l of tw.lights) {
      const ly = topY + l.m * ppm;
      if (ly < 0 || ly > h) continue;
      const u = ((t + l.phase) % l.period) / l.period;
      const a = 0.25 + 0.75 * Math.max(0, Math.sin(u * Math.PI * 2)) ** 3;
      glow(ctx, x + l.u * halfWidth(tw, base, l.m), ly, base * 0.5, rgb, 0.35 * a);
    }
  }

  // The stone barely moves (a pixel or so a second), so it is drawn into a cache and redrawn only
  // when it has shifted by a whole pixel; filling these big shapes every frame is costly on phones.
  let cache: HTMLCanvasElement | OffscreenCanvas | null = null;
  let cacheKey = '';

  return {
    /** Draw the given layers (0 far … 2 near) for a reef that stands `height` metres tall. */
    draw(ctx: CanvasRenderingContext2D, w: number, h: number, focus: Focus, height: number, style: RuinStyle,
      t: number, which: readonly number[] = [0, 1, 2]): void {
      const horizon = focus.y + focus.h * 0.62;
      const unit = Math.min(focus.w, focus.h);
      // Snap the height so the nearest layer moves in whole pixels.
      const near = focus.h / SPAN[2];
      const hq = Math.round(height * near) / near;
      const each = (fn: (tw: Tower, d: number, x: number, topY: number, ppm: number, base: number) => void) => {
        for (const d of which) {
          const ppm = focus.h / SPAN[d]!;
          for (const tw of layers[d]!) {
            const topY = horizon - (tw.top - hq) * ppm;
            if (topY > h) continue;
            const x = focus.x + (tw.x * 1.3 - 0.15) * focus.w;
            const base = unit * tw.width;
            if (x < -base * 4 || x > w + base * 4) continue;
            fn(tw, d, x, topY, ppm, base);
          }
        }
      };
      const key = `${w}x${h} ${focus.x},${focus.y},${focus.w},${focus.h} ${which.join()} ${hq}`;
      if (!cache || cacheKey !== key) {
        if (!cache || cache.width !== w || cache.height !== h) {
          cache = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
          cache.width = w;
          cache.height = h;
        }
        const c = cache.getContext('2d') as CanvasRenderingContext2D;
        c.clearRect(0, 0, w, h);
        each((tw, d, x, topY, ppm, base) => drawTower(c, tw, d, x, topY, ppm, base, h, style));
        cacheKey = key;
      }
      ctx.drawImage(cache, 0, 0);
      if (style.lights) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        each((tw, d, x, topY, ppm, base) => { if (d > 0) drawLights(ctx, tw, x, topY, ppm, base, h, style.lights, t); });
        ctx.restore();
      }
    },
  };
}

export type Ruins = ReturnType<typeof createRuins>;
