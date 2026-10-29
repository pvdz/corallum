// Small drawing helpers shared by every scene.

import { zoom } from './scene.ts';

// Glows are drawn from small pre-rendered sprites (one per colour) instead of building a radial
// gradient per call: hundreds of glows a frame cost almost nothing this way.
const SPRITE = 64;
const sprites = new Map<string, HTMLCanvasElement | OffscreenCanvas>();

function sprite(rgb: string): HTMLCanvasElement | OffscreenCanvas {
  let c = sprites.get(rgb);
  if (c) return c;
  c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(SPRITE, SPRITE) : document.createElement('canvas');
  c.width = c.height = SPRITE;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  const r = SPRITE / 2;
  const grad = g.createRadialGradient(r, r, 0, r, r, r);
  grad.addColorStop(0, `rgba(${rgb},1)`);
  grad.addColorStop(0.35, `rgba(${rgb},0.35)`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, SPRITE, SPRITE);
  sprites.set(rgb, c);
  return c;
}

/** A soft additive-looking light blob (use with 'lighter' compositing for real glow). */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number): void {
  if (!(r > 0) || a <= 0.002) return;
  const prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * Math.min(1, a);
  ctx.drawImage(sprite(rgb), x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prev;
}

/** A speck of marine snow: a square is enough at 1×; zoomed in, it is round. */
export function speck(ctx: CanvasRenderingContext2D, x: number, y: number, d: number): void {
  if (zoom.k === 1) {
    ctx.fillRect(x, y, d, d);
    return;
  }
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.fill();
}

export function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number, lw: number): void {
  if (!(r > 0) || a <= 0.002) return;
  ctx.strokeStyle = `rgba(${rgb},${a})`;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

/** The moon at a phase (0 new, 0.5 full): a dark disc with the lit part and its terminator. */
export function drawMoon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, phase: number, dark = '#1b2040'): void {
  const lit = 1 - Math.abs(phase - 0.5) * 2;
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#f4f1dc';
  // The lit half, plus a terminator ellipse that grows past the middle or eats into it.
  const waxing = phase < 0.5;
  const k = Math.cos(lit * Math.PI) * r;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
  ctx.ellipse(x, y, Math.abs(k), r, 0, Math.PI / 2, -Math.PI / 2, (k > 0) === waxing);
  ctx.fill();
  // On the lit part: grey seas, a few bright-rimmed craters, and the edge a little darker.
  ctx.clip();
  ctx.fillStyle = 'rgba(120,124,130,0.22)';
  for (const [mx, my, mr] of MARIA) {
    for (const [ox, oy, f] of [[0, 0, 1], [0.35, 0.2, 0.7], [-0.3, 0.25, 0.6], [0.1, -0.35, 0.55]] as const) {
      ctx.beginPath();
      ctx.ellipse(x + (mx + ox * mr) * r, y + (my + oy * mr) * r, mr * f * r, mr * f * r * 0.8, mx * 2 + ox, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (r > 12) {
    // Small pits, darker inside with a lit lower rim; one young bright crater with faint rays.
    for (const [cx, cy, cr] of CRATERS) {
      ctx.fillStyle = 'rgba(125,124,118,0.32)';
      ctx.beginPath();
      ctx.arc(x + cx * r, y + cy * r, cr * r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,248,0.35)';
      ctx.lineWidth = Math.max(0.5, r * 0.015);
      ctx.beginPath();
      ctx.arc(x + cx * r, y + cy * r, cr * r, 0.2, 1.6);
      ctx.stroke();
    }
    const [bx, by] = [x - 0.18 * r, y + 0.62 * r];
    ctx.strokeStyle = 'rgba(255,255,250,0.18)';
    ctx.lineWidth = Math.max(0.5, r * 0.012);
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + 0.3;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a) * r * 0.45, by + Math.sin(a) * r * 0.45);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,250,0.7)';
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  const limb = ctx.createRadialGradient(x, y, r * 0.55, x, y, r);
  limb.addColorStop(0, 'rgba(0,0,0,0)');
  limb.addColorStop(1, 'rgba(90,85,70,0.4)');
  ctx.fillStyle = limb;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
  // Earthshine: the dark part is never quite black.
  if (lit < 0.95) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(60,70,110,0.12)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** The moon's seas and craters, as offsets and radii in units of its radius. */
const MARIA: readonly [number, number, number][] = [
  [-0.32, -0.38, 0.22], [0.02, -0.2, 0.17], [0.28, 0.02, 0.15], [-0.18, 0.18, 0.2], [0.42, -0.38, 0.09], [-0.52, 0.0, 0.11],
  [0.12, 0.22, 0.1], [-0.35, -0.08, 0.12],
];
const CRATERS: readonly [number, number, number][] = [[0.42, 0.48, 0.07], [-0.62, 0.28, 0.05], [0.58, -0.12, 0.045], [0.2, -0.66, 0.04], [-0.4, 0.62, 0.035]];

/**
 * The dark beyond the reef's light: everything outside a circle round (cx, cy) dims toward `dark`,
 * smoothly; the circle's radius is the reef's reach of light.
 */
export function drawDarkness(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, dark: number): void {
  const { width: w, height: h } = ctx.canvas;
  const g = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r * 1.6);
  g.addColorStop(0, 'rgba(0,2,10,0)');
  g.addColorStop(1, `rgba(0,2,10,${dark})`);
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The sand that was Ossel: a patch of glittering grains, brighter (and flickering) while it speaks. */
export function drawOsselSand(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, talk: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39996, r = Math.sqrt(i / 26) * 22 * s;
    const tw = Math.max(0, Math.sin(t * (1.3 + (i % 5) * 0.4) + i * 1.7)) ** 6;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.3;
    glow(ctx, px, py, (2 + 3 * tw) * s, '255,245,215', 0.25 + 0.6 * tw + 0.5 * talk);
  }
  glow(ctx, x, y, 30 * s, '255,235,190', 0.08 + 0.25 * talk);
  ctx.restore();
}
