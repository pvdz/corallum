// Residents living in the reef (content/residents.ts), drawn on the coral itself in the shallow
// scenes: guard crabs and gobies on the branches, feather dusters on the old stone low down,
// pistol shrimp and sea cucumbers at the foot, farmer damselfish over the crown. Each is
// tappable and answers in its own way.

import type { ResidentId } from '../content/residents.ts';
import { mulberry32 } from '../sim/rng.ts';
import { glow } from './draw.ts';
import type { Reef, ReefLayout } from './reef.ts';
import { sight, spot, startled } from './sightings.ts';

/** Nodes of the grown coral between two fractions of its height, in a fixed seeded order. */
const perchCache = new Map<string, number[]>();
function perches(reef: Reef, L: ReefLayout, lo: number, hi: number, seed: number, n: number): number[] {
  // The perches change only as the reef grows: kept per grown height.
  const key = `${seed}|${lo}|${hi}|${n}|${L.top.toFixed(3)}|${reef.coral.count}`;
  const hit = perchCache.get(key);
  if (hit) return hit;
  if (perchCache.size > 64) perchCache.clear();
  const out = findPerches(reef, L, lo, hi, seed, n);
  perchCache.set(key, out);
  return out;
}

function findPerches(reef: Reef, L: ReefLayout, lo: number, hi: number, seed: number, n: number): number[] {
  const c = reef.coral;
  const out: number[] = [];
  const r = mulberry32(seed);
  const pool: number[] = [];
  for (let i = 0; i < c.count; i++) {
    const y = c.y[i]!;
    if (y <= L.top && y >= lo * L.top && y <= hi * L.top) pool.push(i);
  }
  // Spread out: no two perches closer than a little.
  for (let tries = 0; tries < 60 && out.length < n && pool.length; tries++) {
    const i = pool[Math.floor(r() * pool.length)]!;
    if (out.every((j) => Math.hypot(c.x[i]! - c.x[j]!, c.y[i]! - c.y[j]!) > 0.06)) out.push(i);
  }
  return out;
}

/** `floor(x)` gives the floor's y at x where the scene shows a floor (the foot-dwellers need one). */
export function drawResidents(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, list: readonly ResidentId[], t: number,
  seed: number, floor?: (x: number) => number): void {
  if (!list.length || L.top <= 0.05) return;
  // A little larger than life: they are small animals on a big reef, and must read at a glance.
  const s = L.s * 1.4;
  ctx.save();
  ctx.lineCap = 'round';
  for (const id of list) {
    sight(id);
    if (id === 'guard-crab') crabs(ctx, reef, L, s, t, seed);
    else if (id === 'goby') gobies(ctx, reef, L, s, t, seed);
    else if (id === 'feather-duster') dusters(ctx, reef, L, s, t, seed);
    else if (id === 'pistol-shrimp') { if (floor) shrimp(ctx, L, s, t, floor); }
    else if (id === 'sea-cucumber') { if (floor) cucumbers(ctx, L, s, t, floor); }
    else if (id === 'damselfish') damsels(ctx, reef, L, s, t);
    else if (id === 'host-anemone') anemone(ctx, reef, L, s, t, seed);
  }
  ctx.restore();
}

function crabs(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, s: number, t: number, seed: number): void {
  const touch = startled('guard-crab', t);
  for (const [k, i] of perches(reef, L, 0.3, 0.7, seed ^ 0xc4ab, 3).entries()) {
    const [x0, y0] = reef.nodePx(L, i);
    // Touched, they duck behind the branch for a moment.
    const hide = touch && touch.age < 3 ? Math.sin(Math.min(1, touch.age / 3) * Math.PI) : 0;
    const x = x0 + Math.sin(t * 0.4 + k * 2) * 1.5 * s + hide * 6 * s * (k % 2 ? 1 : -1);
    const y = y0 + 2 * s;
    spot('guard-crab', x, y, 9 * s);
    ctx.globalAlpha = 1 - hide * 0.8;
    ctx.strokeStyle = '#8f1f1f';
    ctx.lineWidth = 0.9 * s;
    for (let l = -1; l <= 1; l += 2)
      for (let q = 0; q < 3; q++) {
        const a = (q - 1) * 0.5;
        ctx.beginPath();
        ctx.moveTo(x + l * 2.5 * s, y);
        ctx.lineTo(x + l * 5.5 * s, y + (1.5 + a * 3) * s);
        ctx.stroke();
      }
    ctx.fillStyle = '#d23b2e';
    ctx.beginPath();
    ctx.ellipse(x, y, 3.6 * s, 2.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Claws held up, opening now and then.
    const pinch = 0.5 + 0.5 * Math.sin(t * 2.2 + k);
    ctx.fillStyle = '#e8584a';
    for (let l = -1; l <= 1; l += 2) {
      ctx.beginPath();
      ctx.ellipse(x + l * 4.2 * s, y - 2.6 * s, 1.7 * s, (1 + 0.4 * pinch) * s, l * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 1.4 * s, y - 2.4 * s, 0.9 * s, 0.9 * s);
    ctx.fillRect(x + 0.6 * s, y - 2.4 * s, 0.9 * s, 0.9 * s);
    ctx.globalAlpha = 1;
  }
}

function gobies(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, s: number, t: number, seed: number): void {
  const touch = startled('goby', t);
  for (const [k, i] of perches(reef, L, 0.45, 0.9, seed ^ 0x90b1, 3).entries()) {
    const [px, py] = reef.nodePx(L, i);
    // A goby sits, then hops a little way and settles again; touched, all three hop at once.
    const period = 9 + k * 2.3;
    const u = ((t + k * 3.1) % period) / period;
    const hop = touch && touch.age < 1.2 ? Math.sin((touch.age / 1.2) * Math.PI) : u > 0.9 ? Math.sin(((u - 0.9) / 0.1) * Math.PI) : 0;
    const x = px + hop * 4 * s, y = py - 3 * s - hop * 9 * s;
    const dir = k % 2 ? 1 : -1;
    spot('goby', x, y, 8 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.rotate(-0.15 - hop * 0.4);
    ctx.fillStyle = 'rgba(200, 236, 190, 0.85)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.2 * s, 1.9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4.6 * s, 0);
    ctx.lineTo(-7.4 * s, -1.6 * s);
    ctx.lineTo(-7.4 * s, 1.6 * s);
    ctx.fill();
    ctx.fillStyle = '#1b2a22';
    ctx.beginPath();
    ctx.arc(3.2 * s, -0.5 * s, 0.75 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function dusters(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, s: number, t: number, seed: number): void {
  const touch = startled('feather-duster', t);
  const colours = ['#e0533c', '#f0a040', '#b05ad8', '#f4f0e0'];
  for (const [k, i] of perches(reef, L, 0.04, 0.35, seed ^ 0xfea7, 4).entries()) {
    const [x, y] = reef.nodePx(L, i);
    // At a touch the crowns snap into their tubes and open again slowly.
    const open = touch && touch.age < 4 ? Math.max(0, (touch.age - 0.2) / 3.8) ** 1.5 : 1;
    const lean = -Math.PI / 2 + (k % 2 ? 0.5 : -0.5) + Math.sin(t * 0.6 + k) * 0.08;
    const tx = x + Math.cos(lean) * 6 * s, ty = y + Math.sin(lean) * 6 * s;
    spot('feather-duster', tx, ty, 10 * s);
    ctx.strokeStyle = '#6b5a48';
    ctx.lineWidth = 2.2 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    if (open <= 0.02) continue;
    ctx.strokeStyle = colours[k % colours.length]!;
    ctx.lineWidth = 0.8 * s;
    for (let f = 0; f < 11; f++) {
      const a = lean + (f / 10 - 0.5) * 2.2 * open + Math.sin(t * 1.4 + f * 0.6 + k) * 0.05;
      const len = (7 + (f % 2) * 1.5) * s * open;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a - 0.2) * len * 0.6, ty + Math.sin(a - 0.2) * len * 0.6, tx + Math.cos(a) * len, ty + Math.sin(a) * len);
      ctx.stroke();
    }
  }
}

function shrimp(ctx: CanvasRenderingContext2D, L: ReefLayout, s: number, t: number, floor: (x: number) => number): void {
  const touch = startled('pistol-shrimp', t);
  const x = L.cx - 0.2 * L.unit, y = floor(x) + 2 * s;
  spot('pistol-shrimp', x, y - 4 * s, 12 * s);
  // The burrow: a dark mouth in a little mound.
  ctx.fillStyle = 'rgba(120, 100, 80, 0.75)';
  ctx.beginPath();
  ctx.ellipse(x, y, 13 * s, 5 * s, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(15, 12, 10, 0.85)';
  ctx.beginPath();
  ctx.ellipse(x, y - 0.5 * s, 4.5 * s, 3 * s, 0, Math.PI, 0);
  ctx.fill();
  // The shrimp leans out of it, its big claw first.
  const out = 0.6 + 0.4 * Math.sin(t * 0.5);
  const sx = x + 4 * s * out, sy = y - 2.5 * s;
  ctx.fillStyle = '#e8a088';
  ctx.beginPath();
  ctx.ellipse(sx, sy, 4.5 * s, 1.8 * s, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0b8a0';
  ctx.beginPath();
  ctx.ellipse(sx + 5 * s, sy - 0.8 * s, 3 * s, 1.9 * s, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // The snap: every few seconds, or at once when touched, a flash and a bubble.
  const period = 6.5;
  const since = touch && touch.age < 1 ? touch.age : (t % period);
  if (since < 0.6) {
    const bx = sx + 9 * s, by = sy - 1 * s;
    glow(ctx, bx, by, 16 * s * (1 - since), '255,250,230', 0.9 * (1 - since / 0.6));
    ctx.strokeStyle = `rgba(230, 245, 255, ${0.7 * (1 - since / 0.6)})`;
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.arc(bx + since * 10 * s, by - since * 18 * s, (2 + since * 4) * s, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function cucumbers(ctx: CanvasRenderingContext2D, L: ReefLayout, s: number, t: number, floor: (x: number) => number): void {
  const touch = startled('sea-cucumber', t);
  for (let k = 0; k < 2; k++) {
    const side = k ? 1 : -1;
    // They inch along the floor so slowly it hardly shows, leaving a coil of clean sand.
    const x = L.cx + side * (0.28 + 0.03 * Math.sin(t * 0.02 + k)) * L.unit, y = floor(x) + 3 * s;
    // Touched, they contract into a lump.
    const squeeze = touch && touch.age < 5 ? 1 - 0.4 * Math.sin(Math.min(1, touch.age / 5) * Math.PI) : 1;
    spot('sea-cucumber', x, y - 3 * s, 14 * s);
    ctx.strokeStyle = 'rgba(235, 220, 190, 0.45)';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    for (let q = 0; q < 3; q++) ctx.arc(x - side * (16 + q * 5) * s, y - 1 * s, 2 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = k ? '#5a3a2a' : '#7a4a2c';
    ctx.beginPath();
    ctx.ellipse(x, y - 3 * s, 13 * s * squeeze, 4 * s / Math.sqrt(squeeze), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = k ? '#7a5640' : '#a06a40';
    for (let b = -4; b <= 4; b++) {
      ctx.beginPath();
      ctx.arc(x + b * 2.8 * s * squeeze, y - 6 * s, 1 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function damsels(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, s: number, t: number): void {
  const touch = startled('damselfish', t);
  const [cx, cy] = reef.crown(L);
  for (let k = 0; k < 3; k++) {
    // They patrol a small patch below the crown; touched, they charge at the finger and back.
    const a = t * (0.9 + k * 0.2) + k * 2.1;
    let x = cx + Math.cos(a) * (22 + k * 6) * s, y = cy + (30 + k * 8) * s + Math.sin(a * 1.7) * 8 * s;
    if (touch && touch.age < 1.4) {
      const c = Math.sin((touch.age / 1.4) * Math.PI) * 0.7;
      x += (touch.x - x) * c;
      y += (touch.y - y) * c;
    }
    const dir = Math.cos(a + Math.PI / 2) > 0 ? 1 : -1;
    spot('damselfish', x, y, 9 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = '#1f3f9a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 5.5 * s, 3.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.moveTo(-4.5 * s, 0);
    ctx.lineTo(-8.5 * s, -2.8 * s);
    ctx.lineTo(-8.5 * s, 2.8 * s);
    ctx.fill();
    ctx.fillStyle = '#4f86ff';
    ctx.fillRect(-1 * s, -3.2 * s, 3 * s, 0.9 * s);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(3 * s, -0.7 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function anemone(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, s: number, t: number, seed: number): void {
  const touch = startled('host-anemone', t);
  const shrink = touch && touch.age < 3 ? 1 - 0.5 * Math.sin(Math.min(1, touch.age / 3) * Math.PI) : 1;
  const [i] = perches(reef, L, 0.7, 0.85, seed ^ 0xa2e, 1);
  if (i === undefined) return;
  const [x, y] = reef.nodePx(L, i);
  spot('host-anemone', x, y - 6 * s, 14 * s);
  ctx.save();
  ctx.strokeStyle = 'rgba(200,120,170,0.9)';
  ctx.lineWidth = 1.6 * s;
  for (let k = 0; k < 16; k++) {
    const a = -Math.PI + (k / 15) * Math.PI;
    const len = (9 + (k % 3) * 2) * s * shrink;
    const sway = Math.sin(t * 1.3 + k) * 0.15;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a + sway) * len * 0.6, y + Math.sin(a + sway) * len * 0.6, x + Math.cos(a + sway * 2) * len, y + Math.sin(a + sway * 2) * len);
    ctx.stroke();
  }
  // Two clownfish weaving in and out of the tentacles.
  for (let k = 0; k < 2; k++) {
    const a = t * (0.9 + k * 0.3) + k * 3;
    const fx = x + Math.cos(a) * 8 * s, fy = y - 8 * s + Math.sin(a * 1.4) * 3 * s;
    const dir = -Math.sin(a) > 0 ? 1 : -1;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(dir, 1);
    ctx.fillStyle = '#f07a20';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4 * s, 1.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-0.6 * s, -1.8 * s, 1 * s, 3.6 * s);
    ctx.restore();
  }
  ctx.restore();
}
