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
