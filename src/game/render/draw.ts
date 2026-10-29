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
    ctx.lineWidth = Math.max(0.6, r * 0.025);
    for (const [cx, cy, cr] of CRATERS) {
      ctx.strokeStyle = 'rgba(120,118,110,0.45)';
      ctx.beginPath();
      ctx.arc(x + cx * r, y + cy * r, cr * r, 0.3, Math.PI + 0.3);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,245,0.5)';
      ctx.beginPath();
      ctx.arc(x + cx * r, y + cy * r, cr * r, Math.PI + 0.3, 0.3);
      ctx.stroke();
    }
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
const CRATERS: readonly [number, number, number][] = [[0.15, 0.6, 0.1], [-0.55, 0.45, 0.07], [0.6, 0.35, 0.06], [-0.05, 0.45, 0.05]];
