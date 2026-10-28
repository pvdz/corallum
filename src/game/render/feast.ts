// A falling feast: something dead sinking slowly past the reef, trailed by the little lights
// of scavengers. Drawn over whichever scene is showing; tap it to eat (see sim/economy.ts).

import { FEAST } from '../content/events.ts';
import type { Feast } from '../sim/economy.ts';
import { glow } from './draw.ts';
import type { Focus } from './scene.ts';

/** Where the feast is, in device pixels, `age` seconds after it started to fall. */
export function feastPos(f: Feast, age: number, focus: Focus): [number, number] {
  const u = age / FEAST.life;
  const x = focus.x + focus.w * (f.x + 0.03 * Math.sin(age * 0.35 + f.k));
  const y = focus.y + focus.h * (-0.04 + 0.78 * u);
  return [x, y];
}

/** Tap radius in device pixels. */
export function feastReach(focus: Focus, dpr: number): number {
  return Math.max(44 * dpr, Math.min(focus.w, focus.h) * 0.08);
}

export function drawFeast(ctx: CanvasRenderingContext2D, f: Feast, age: number, t: number, focus: Focus, dpr: number): void {
  const [x, y] = feastPos(f, age, focus);
  const s = Math.min(focus.w, focus.h) / 700;
  // Fade in at the top, out as it sinks out of reach.
  const a = Math.min(1, age / 2, (FEAST.life - age) / 4);
  if (a <= 0) return;
  ctx.save();
  ctx.globalAlpha = a;
  // A halo so it can be found in any water.
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, x, y, 70 * s, '255,210,160', 0.18 + 0.06 * Math.sin(t * 2));
  ctx.globalCompositeOperation = 'source-over';
  ctx.translate(x, y);
  ctx.rotate(0.5 + 0.15 * Math.sin(age * 0.4 + f.k));
  if (f.kind === 0) drawFish(ctx, s);
  else if (f.kind === 1) drawSquid(ctx, s, t);
  else drawKrill(ctx, s, t, f.k);
  ctx.restore();
  // Scavengers: small lights circling and picking at it.
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const ang = t * (0.8 + (i % 3) * 0.35) * (i % 2 ? 1 : -1) + i * 0.7;
    const rad = (22 + (i % 4) * 9) * s;
    glow(ctx, x + Math.cos(ang) * rad, y + Math.sin(ang) * rad * 0.6, 5 * s, '170,240,255', 0.55);
  }
  // A ring that breathes, as a hint that it can be touched.
  const pulse = (t * 0.6) % 1;
  ctx.strokeStyle = `rgba(255,225,190,${0.35 * (1 - pulse)})`;
  ctx.lineWidth = 1.2 * dpr;
  ctx.beginPath();
  ctx.arc(x, y, feastReach(focus, dpr) * (0.6 + 0.4 * pulse), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A dead fish: pale body, the ribs showing, a clouded eye. */
function drawFish(ctx: CanvasRenderingContext2D, s: number): void {
  const L = 34 * s, H = 11 * s;
  ctx.fillStyle = 'rgba(225,215,200,0.85)';
  ctx.beginPath();
  ctx.moveTo(L, 0);
  ctx.bezierCurveTo(L * 0.5, -H * 1.2, -L * 0.5, -H, -L * 0.8, 0);
  ctx.bezierCurveTo(-L * 0.5, H, L * 0.5, H * 1.2, L, 0);
  ctx.fill();
  // Tail.
  ctx.beginPath();
  ctx.moveTo(-L * 0.75, 0);
  ctx.lineTo(-L * 1.15, -H * 0.9);
  ctx.lineTo(-L * 1.05, 0);
  ctx.lineTo(-L * 1.15, H * 0.9);
  ctx.closePath();
  ctx.fill();
  // Where the scavengers have been: ribs through the skin.
  ctx.strokeStyle = 'rgba(120,90,90,0.55)';
  ctx.lineWidth = 1.2 * s;
  for (let k = 0; k < 6; k++) {
    const rx = L * (0.35 - k * 0.14);
    ctx.beginPath();
    ctx.moveTo(rx, -H * 0.7);
    ctx.quadraticCurveTo(rx - 3 * s, 0, rx, H * 0.7);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(200,210,220,0.9)';
  ctx.beginPath();
  ctx.arc(L * 0.62, -H * 0.15, 2.6 * s, 0, Math.PI * 2);
  ctx.fill();
}

/** A spent squid: a soft mantle and arms trailing loose. */
function drawSquid(ctx: CanvasRenderingContext2D, s: number, t: number): void {
  const L = 30 * s, W = 9 * s;
  ctx.fillStyle = 'rgba(240,190,180,0.8)';
  ctx.beginPath();
  ctx.moveTo(L, 0);
  ctx.quadraticCurveTo(L * 0.2, -W * 1.3, -L * 0.3, -W * 0.8);
  ctx.lineTo(-L * 0.3, W * 0.8);
  ctx.quadraticCurveTo(L * 0.2, W * 1.3, L, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,190,180,0.6)';
  ctx.lineWidth = 1.6 * s;
  for (let k = 0; k < 6; k++) {
    const off = (k - 2.5) * 2.4 * s;
    ctx.beginPath();
    ctx.moveTo(-L * 0.3, off);
    ctx.quadraticCurveTo(-L * 0.7, off + Math.sin(t * 1.2 + k) * 6 * s, -L * (1 + 0.1 * (k % 3)), off * 1.6 + Math.sin(t + k) * 5 * s);
    ctx.stroke();
  }
}

/** A drifting cloud of dying krill: dozens of small pink bodies. */
function drawKrill(ctx: CanvasRenderingContext2D, s: number, t: number, seed: number): void {
  ctx.fillStyle = 'rgba(255,170,150,0.85)';
  for (let i = 0; i < 40; i++) {
    const a = i * 2.399 + seed;
    const r = Math.sqrt(i / 40) * 26 * s;
    const x = Math.cos(a + t * 0.1) * r * 1.3;
    const y = Math.sin(a + t * 0.1) * r * 0.8;
    ctx.beginPath();
    ctx.ellipse(x, y, 2.6 * s, 1.1 * s, a, 0, Math.PI * 2);
    ctx.fill();
  }
}
