// The reef's Song (the fourth dialect) made visible around its crown: a lullaby's slow breathing
// glow, a chorus of small lights answering each other, a call's clear ring pulsing outward.

import { glow, softRing } from './draw.ts';

export function drawSong(ctx: CanvasRenderingContext2D, song: string, x: number, y: number, t: number, s: number): void {
  if (!song) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (song === 'lullaby') {
    const b = 0.5 + 0.5 * Math.sin(t * 0.5);
    glow(ctx, x, y, (60 + 30 * b) * s, '180,200,255', 0.12 + 0.1 * b);
  } else if (song === 'chorus') {
    for (let i = 0; i < 12; i++) {
      const a = i * 0.52 + t * 0.2;
      const r = (40 + (i % 3) * 22) * s;
      const on = Math.max(0, Math.sin(t * 2.4 - i * 0.9)) ** 4;
      glow(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.6, 6 * s, '255,230,170', 0.5 * on);
    }
  } else if (song === 'call') {
    const u = (t % 4) / 4;
    softRing(ctx, x, y, u * 160 * s, u * 90 * s, (10 + 18 * u) * s, '200,240,255', 0.3 * (1 - u));
  }
  ctx.restore();
}
