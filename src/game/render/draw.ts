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

/** A rounded rectangle added to the current path (ctx.roundRect is missing before Safari 16 and Firefox 112). */
export function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
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

/** A flourish's spreading ring: a soft band about five line widths deep, brightest at its edge. */
export function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number, lw: number): void {
  if (!(r > 0) || a <= 0.002) return;
  softRing(ctx, x, y, r + lw, r + lw, lw * 5, rgb, Math.min(1, a * 1.1));
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
  // The seas in one path, so their lobes merge into even, irregular patches instead of darkening
  // where they overlap.
  // A faint wider pass first, so each sea's edge fades instead of ending in a hard line.
  for (const [grow, alpha] of [[1.3, 0.08], [1, 0.2]] as const) {
    ctx.fillStyle = `rgba(120,124,130,${alpha})`;
    ctx.beginPath();
    for (const [mx, my, mr] of MARIA) {
      for (const [ox, oy, f] of [[0, 0, 1], [0.35, 0.2, 0.7], [-0.3, 0.25, 0.6], [0.1, -0.35, 0.55]] as const) {
        const ex = x + (mx + ox * mr) * r, ey = y + (my + oy * mr) * r, rot = mx * 2 + ox, rr = mr * f * r * grow;
        ctx.moveTo(ex + Math.cos(rot) * rr, ey + Math.sin(rot) * rr);
        ctx.ellipse(ex, ey, rr, rr * 0.8, rot, 0, Math.PI * 2);
      }
    }
    ctx.fill();
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

/**
 * The moon's seas and craters, as offsets and radii in units of its radius. The seas of the near
 * side, roughly where they lie: a great ocean down the left, a chain of seas across the upper half,
 * two small ones apart at the right and lower left.
 */
const MARIA: readonly [number, number, number][] = [
  [-0.55, 0.05, 0.28], [-0.3, -0.4, 0.23], [0.1, -0.38, 0.15], [0.28, -0.1, 0.18], [0.46, 0.18, 0.12],
  [-0.12, 0.38, 0.15], [0.64, -0.3, 0.08], [-0.42, 0.52, 0.08],
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

/**
 * A small fish at the origin, facing +x, about 21·s long: a darker back to a pale belly, a forked
 * tail, a dorsal fin, its gill line and eye. Colours are CSS strings: back, middle, belly.
 */
export function drawSmallFish(ctx: CanvasRenderingContext2D, s: number, back: string, mid: string, belly: string): void {
  const body = ctx.createLinearGradient(0, -3.4 * s, 0, 3.4 * s);
  body.addColorStop(0, back);
  body.addColorStop(0.5, mid);
  body.addColorStop(1, belly);
  ctx.fillStyle = back;
  ctx.beginPath();
  ctx.moveTo(-6.5 * s, 0);
  ctx.quadraticCurveTo(-10 * s, -1.5 * s, -12.5 * s, -4 * s);
  ctx.quadraticCurveTo(-11 * s, 0, -12.5 * s, 4 * s);
  ctx.quadraticCurveTo(-10 * s, 1.5 * s, -6.5 * s, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1 * s, -2.8 * s);
  ctx.quadraticCurveTo(-2 * s, -6 * s, -4 * s, -5 * s);
  ctx.lineTo(-3 * s, -2.4 * s);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(9 * s, 0.3 * s);
  ctx.quadraticCurveTo(6 * s, -3.4 * s, 0, -3.3 * s);
  ctx.quadraticCurveTo(-5 * s, -3 * s, -7.5 * s, 0);
  ctx.quadraticCurveTo(-5 * s, 3 * s, 0, 3.2 * s);
  ctx.quadraticCurveTo(6 * s, 3.2 * s, 9 * s, 0.3 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,40,50,0.45)';
  ctx.lineWidth = 0.6 * s;
  ctx.beginPath();
  ctx.moveTo(3.6 * s, -2.4 * s);
  ctx.quadraticCurveTo(2.6 * s, 0, 3.6 * s, 2.4 * s);
  ctx.stroke();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.arc(5.8 * s, -0.8 * s, 1.1 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(6 * s, -0.8 * s, 0.6 * s, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * A great whale's silhouette at the origin, head toward +x, about 220·s long: a humpback's long flat
 * head, a small dorsal hump far back, the long taper to the tail stock, scalloped flukes and the long
 * knobbed pectoral fin; the jaw line and throat grooves faintly paler. Filled in the current style;
 * `beat` (−1…1) sweeps the flukes.
 */
export function whaleSilhouette(ctx: CanvasRenderingContext2D, s: number, beat: number): void {
  ctx.beginPath();
  // A long flat head with the lower jaw jutting a little, the back rising to a small dorsal hump far
  // behind, then the long taper to the tail stock.
  ctx.moveTo(92 * s, 2 * s);
  ctx.bezierCurveTo(88 * s, -10 * s, 60 * s, -16 * s, 20 * s, -19 * s);
  ctx.bezierCurveTo(-10 * s, -21 * s, -30 * s, -18 * s, -44 * s, -15 * s);
  ctx.quadraticCurveTo(-49 * s, -20 * s, -53 * s, -19 * s);
  ctx.quadraticCurveTo(-56 * s, -14 * s, -60 * s, -11 * s);
  ctx.bezierCurveTo(-76 * s, -6 * s, -90 * s, -2 * s, -100 * s, beat * 3 * s);
  ctx.bezierCurveTo(-80 * s, 8 * s, -40 * s, 18 * s, 0, 20 * s);
  ctx.bezierCurveTo(50 * s, 23 * s, 86 * s, 16 * s, 94 * s, 6 * s);
  ctx.closePath();
  // Flukes, their trailing edge scalloped.
  ctx.moveTo(-98 * s, beat * 3 * s);
  ctx.quadraticCurveTo(-112 * s, (-14 + beat * 6) * s, -128 * s, (-16 + beat * 10) * s);
  ctx.quadraticCurveTo(-120 * s, (-8 + beat * 8) * s, -122 * s, (-4 + beat * 7) * s);
  ctx.quadraticCurveTo(-116 * s, (beat * 6) * s, -122 * s, (4 + beat * 7) * s);
  ctx.quadraticCurveTo(-120 * s, (8 + beat * 8) * s, -128 * s, (16 + beat * 10) * s);
  ctx.quadraticCurveTo(-112 * s, (14 + beat * 6) * s, -98 * s, beat * 3 * s);
  // The long pectoral fin, knobbed along its leading edge.
  ctx.moveTo(42 * s, 12 * s);
  ctx.quadraticCurveTo(34 * s, 24 * s, 28 * s, 26 * s);
  ctx.quadraticCurveTo(26 * s, 31 * s, 18 * s, 34 * s);
  ctx.quadraticCurveTo(14 * s, 39 * s, 4 * s, 42 * s);
  ctx.quadraticCurveTo(-1 * s, (46 + beat * 4) * s, -8 * s, (47 + beat * 4) * s);
  ctx.quadraticCurveTo(12 * s, 32 * s, 26 * s, 14 * s);
  ctx.fill();
  // The line of the jaw and the grooves along the throat, faintly paler than the body (drawn over
  // it in the caller's alpha, so they read as light catching the folds).
  const prevStroke = ctx.strokeStyle;
  ctx.strokeStyle = 'rgba(150,180,210,0.14)';
  ctx.lineWidth = Math.max(1, 1.2 * s);
  ctx.beginPath();
  ctx.moveTo(92 * s, 3 * s);
  ctx.quadraticCurveTo(70 * s, 5 * s, 48 * s, 3 * s);
  for (let k = 0; k < 4; k++) {
    ctx.moveTo((84 - k * 2) * s, (8 + k * 3) * s);
    ctx.quadraticCurveTo((60 - k * 4) * s, (11 + k * 3) * s, (34 - k * 6) * s, (11 + k * 3) * s);
  }
  ctx.stroke();
  ctx.strokeStyle = prevStroke;
}

/**
 * A ring spreading through water, drawn soft: a band `band` wide inside the ellipse (rx, ry),
 * brightest at its leading edge and fading inward (a crisp stroked ellipse reads as a UI target).
 */
export function softRing(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, band: number, rgb: string, alpha: number): void {
  if (rx < 1 || ry < 0.5 || alpha <= 0.002) return;
  const b = Math.min(rx, band);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, rx - b, 0, 0, rx);
  g.addColorStop(0, `rgba(${rgb},0)`);
  g.addColorStop(0.8, `rgba(${rgb},${(alpha * 0.6).toFixed(3)})`);
  g.addColorStop(0.97, `rgba(${rgb},${alpha.toFixed(3)})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.arc(0, 0, rx - b, 0, Math.PI * 2, true);
  ctx.fill();
  ctx.restore();
}


/**
 * A facing (±1 for right/left) that turns smoothly instead of flipping in one frame: from v, the
 * signed sideways part of a creature's motion, it narrows through the turn (to a sliver, never
 * zero) and widens again facing the other way. Use it as the x scale of the creature's drawing.
 */
export function facing(v: number, sharp = 5): number {
  const f = Math.max(-1, Math.min(1, v * sharp));
  return f >= 0 ? Math.max(0.18, f) : Math.min(-0.18, f);
}
