// Small drawing helpers shared by every scene.

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
  ctx.restore();
}
