// Small drawing helpers shared by every scene.

/** A soft additive-looking light blob (use with 'lighter' compositing for real glow). */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number): void {
  if (!(r > 0) || a <= 0.002) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb},${a})`);
  g.addColorStop(0.35, `rgba(${rgb},${a * 0.35})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
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
