// Daughter colonies: as the reef passes a hundred polyps, fragments of it settle on the floor
// around its foot and grow into small colonies of their own, one more for every fifteen polyps.
// Drawn on the floor of the shallow scenes; each is a little seeded branching head.

import { mulberry32, range } from '../sim/rng.ts';

/** How many daughter colonies a reef of `polyps` polyps has. */
export function daughterCount(polyps: number): number {
  return Math.max(0, Math.min(10, Math.floor((polyps - 100) / 15) + 1));
}

/** Where along the floor (0..1) daughter k settles: alternating sides, spreading out from the foot. */
function slot(k: number): number {
  const side = k % 2 ? 1 : -1;
  return 0.5 + side * (0.13 + Math.floor(k / 2) * 0.065 + ((k * 0.37) % 1) * 0.02);
}

export type DaughterStyle = { branch: string; tip: string; polyp: string; alt?: DaughterStyle };

export function drawDaughters(ctx: CanvasRenderingContext2D, polyps: number, floorAt: (u: number) => [number, number],
  s: number, t: number, style: DaughterStyle, seed: number): void {
  const n = daughterCount(polyps);
  ctx.save();
  ctx.lineCap = 'round';
  for (let k = 0; k < n; k++) {
    const [x, y] = floorAt(slot(k));
    const r = mulberry32(seed + k * 7919);
    // The newest ones are still small.
    const grown = Math.min(1, (polyps - 100 - k * 15) / 30 + 0.35);
    const size = range(r, 0.7, 1.15) * grown * s;
    const own = style.alt && k % 3 === 1 ? style.alt : style;
    branch(ctx, r, x, y, -Math.PI / 2 + range(r, -0.2, 0.2), 22 * size, 0, size, t + k, own);
  }
  ctx.restore();
}

function branch(ctx: CanvasRenderingContext2D, r: () => number, x: number, y: number, a: number, len: number, depth: number,
  s: number, t: number, style: DaughterStyle): void {
  const sway = Math.sin(t * 0.7 + depth) * 0.04;
  const ex = x + Math.cos(a + sway) * len, ey = y + Math.sin(a + sway) * len;
  ctx.strokeStyle = depth < 2 ? style.branch : style.tip;
  ctx.lineWidth = (5.5 - depth * 1.5) * s;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  if (depth >= 2) {
    // A polyp at each tip, opening and closing slowly.
    const open = 0.7 + 0.3 * Math.sin(t * 1.3 + x * 0.01);
    ctx.fillStyle = style.polyp;
    for (let p = -2; p <= 2; p++) {
      const pa = a + p * 0.45;
      ctx.beginPath();
      ctx.arc(ex + Math.cos(pa) * 2.4 * s * open, ey + Math.sin(pa) * 2.4 * s * open, 0.9 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  const kids = 2 + (r() < 0.6 ? 1 : 0);
  for (let i = 0; i < kids; i++) {
    const da = (i - (kids - 1) / 2) * range(r, 0.45, 0.7);
    branch(ctx, r, ex, ey, a + da, len * range(r, 0.6, 0.8), depth + 1, s, t, style);
  }
}
