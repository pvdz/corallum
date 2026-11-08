// Residents living in the reef (content/residents.ts), drawn on the coral itself in the shallow
// scenes: guard crabs and gobies on the branches, feather dusters on the old stone low down,
// pistol shrimp and sea cucumbers at the foot, farmer damselfish over the crown. Each is
// tappable and answers in its own way.

import type { ResidentId } from '../content/residents.ts';
import { mulberry32 } from '../sim/rng.ts';
import { facing, glow } from './draw.ts';
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
    else if (id === 'cleaner-wrasse') wrasse(ctx, reef, L, s, t, seed);
    else if (id === 'boxer-crab') { if (floor) boxer(ctx, L, s, t, floor); }
    else if (id === 'decorator-crab') { if (floor) decorator(ctx, L, s, t, floor); }
    else if (id === 'hermit-crab') { if (floor) hermit(ctx, L, s, t, floor); }
    else if (id === 'sea-star') seaStar(ctx, reef, L, s, t, seed);
  }
  ctx.restore();
}

/**
 * Cleaner wrasse: a pair at their station on a branch, bobbing in the up-and-down dance that says
 * the station is open. Touched, they dart round the branch once and come back.
 */
function wrasse(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, s: number, t: number, seed: number): void {
  const [i] = perches(reef, L, 0.35, 0.6, seed ^ 0xc1ea, 1);
  if (i === undefined) return;
  const [px, py] = reef.nodePx(L, i);
  const touch = startled('cleaner-wrasse', t);
  const dart = touch && touch.age < 2 ? touch.age / 2 : -1;
  for (let k = 0; k < 2; k++) {
    const a = dart >= 0 ? dart * Math.PI * 2 + k * Math.PI : 0;
    const bob = Math.sin(t * 3.2 + k * 1.3) * 3 * s;
    const x = px + (k ? 9 : -9) * s + (dart >= 0 ? Math.cos(a) * 14 * s : Math.sin(t * 0.7 + k) * 2 * s);
    const y = py - 4 * s + bob + (dart >= 0 ? Math.sin(a) * 8 * s : 0);
    if (k === 0) spot('cleaner-wrasse', x, y, 9 * s);
    const dir = dart >= 0 ? (Math.cos(a + Math.PI / 2) > 0 ? 1 : -1) : k ? -1 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    // Slim body: electric blue, a black stripe from snout to tail widening backward.
    ctx.fillStyle = '#4fb3ff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 6 * s, 1.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#10131c';
    ctx.beginPath();
    ctx.moveTo(5.5 * s, -0.2 * s);
    ctx.lineTo(-6 * s, -0.8 * s);
    ctx.lineTo(-6 * s, 0.8 * s);
    ctx.lineTo(5.5 * s, 0.3 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4fb3ff';
    ctx.beginPath();
    ctx.moveTo(-5.5 * s, 0);
    ctx.lineTo(-8.5 * s, -1.8 * s);
    ctx.lineTo(-8.5 * s, 1.8 * s);
    ctx.closePath();
    ctx.fill();
    // A pale belly line under the stripe, a low dorsal fin, and the eye in the stripe near the snout.
    ctx.fillStyle = 'rgba(200,232,250,0.8)';
    ctx.beginPath();
    ctx.ellipse(-0.5 * s, 1 * s, 4.2 * s, 0.45 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,110,190,0.8)';
    ctx.beginPath();
    ctx.moveTo(2.5 * s, -1.4 * s);
    ctx.quadraticCurveTo(-1 * s, -2.6 * s, -4.5 * s, -1.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8f4ff';
    ctx.beginPath();
    ctx.arc(4 * s, -0.2 * s, 0.55 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05070c';
    ctx.beginPath();
    ctx.arc(4.1 * s, -0.2 * s, 0.3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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
    // A guard crab (the coral's own): a smooth carapace wider at the front, orange-red with
    // darker spots, stalked eyes on the front edge, jointed legs gripping the branch and two
    // big pincers held up, opening now and then.
    const pinch = 0.5 + 0.5 * Math.sin(t * 2.2 + k);
    ctx.strokeStyle = '#8f2418';
    ctx.lineCap = 'round';
    for (let l = -1; l <= 1; l += 2)
      for (let q = 0; q < 3; q++) {
        const kx = x + l * (4.6 + q * 0.5) * s, ky = y + (-0.6 + q * 1.1) * s;
        ctx.lineWidth = 0.95 * s;
        ctx.beginPath();
        ctx.moveTo(x + l * 2.6 * s, y + (q - 0.6) * 0.9 * s);
        ctx.lineTo(kx, ky);
        ctx.lineWidth = 0.7 * s;
        ctx.lineTo(kx + l * 0.9 * s, ky + 2.4 * s);
        ctx.stroke();
      }
    ctx.lineCap = 'butt';
    const shell = ctx.createLinearGradient(x, y - 2.8 * s, x, y + 2.4 * s);
    shell.addColorStop(0, '#f07650');
    shell.addColorStop(1, '#b8321f');
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.moveTo(-3.9 * s + x, y - 1.4 * s);
    ctx.quadraticCurveTo(x, y - 3.4 * s, x + 3.9 * s, y - 1.4 * s);
    ctx.quadraticCurveTo(x + 3.6 * s, y + 1.6 * s, x + 1.6 * s, y + 2.4 * s);
    ctx.lineTo(x - 1.6 * s, y + 2.4 * s);
    ctx.quadraticCurveTo(x - 3.6 * s, y + 1.6 * s, x - 3.9 * s, y - 1.4 * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(120, 22, 16, 0.7)';
    for (const [dx, dy, r] of [[-1.8, -0.6, 0.45], [1.6, -0.4, 0.5], [0.1, 0.9, 0.4], [-0.9, 1.6, 0.3], [1, 1.7, 0.3]] as const) {
      ctx.beginPath();
      ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Pincers: a heavy palm and two fingers, the upper one opening.
    for (let l = -1; l <= 1; l += 2) {
      const cx = x + l * 4.4 * s, cy = y - 3 * s;
      ctx.fillStyle = '#e25a3e';
      ctx.beginPath();
      ctx.moveTo(x + l * 2.6 * s, y - 1.6 * s);
      ctx.lineTo(cx, cy + 0.6 * s);
      ctx.lineTo(cx - l * 0.4 * s, cy + 1.6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx, cy, 1.5 * s, 1.15 * s, l * -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a1410';
      const open = 0.2 + 0.45 * pinch;
      for (const f of [-1, 1]) {
        const ang = -Math.PI / 2 + l * 0.35 + f * open * (f < 0 ? 1 : 0.5);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang + 1.2) * 0.6 * s, cy + Math.sin(ang + 1.2) * 0.6 * s - 0.6 * s);
        ctx.lineTo(cx + Math.cos(ang) * 2.4 * s, cy + Math.sin(ang) * 2.4 * s - 0.4 * s);
        ctx.lineTo(cx + Math.cos(ang - 1.2) * 0.6 * s, cy + Math.sin(ang - 1.2) * 0.6 * s - 0.6 * s);
        ctx.fill();
      }
    }
    // Eyes on short stalks at the front edge, each with a glint.
    for (let l = -1; l <= 1; l += 2) {
      ctx.strokeStyle = '#b8321f';
      ctx.lineWidth = 0.6 * s;
      ctx.beginPath();
      ctx.moveTo(x + l * 1 * s, y - 2.2 * s);
      ctx.lineTo(x + l * 1.3 * s, y - 3.1 * s);
      ctx.stroke();
      ctx.fillStyle = '#1a0c0a';
      ctx.beginPath();
      ctx.arc(x + l * 1.3 * s, y - 3.3 * s, 0.6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 236, 220, 0.8)';
      ctx.beginPath();
      ctx.arc(x + l * 1.15 * s, y - 3.5 * s, 0.2 * s, 0, Math.PI * 2);
      ctx.fill();
    }
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
    ctx.scale(1.25, 1.25);
    // A coral goby: a stout citron body with a blunt head, thin red bars across the head and
    // cheek, a rounded tail and two little sails of dorsal fins, a big eye set high.
    ctx.fillStyle = 'rgba(214, 220, 70, 0.75)';
    ctx.beginPath();
    ctx.moveTo(0.6 * s, -1.8 * s);
    ctx.quadraticCurveTo(-0.2 * s, -3.8 * s, -1.6 * s, -1.6 * s);
    ctx.closePath();
    ctx.moveTo(-1.8 * s, -1.4 * s);
    ctx.quadraticCurveTo(-3 * s, -3.2 * s, -4.2 * s, -1 * s);
    ctx.closePath();
    ctx.moveTo(-4.4 * s, 0);
    ctx.quadraticCurveTo(-7.6 * s, -2.4 * s, -7.4 * s, 0);
    ctx.quadraticCurveTo(-7.6 * s, 2.4 * s, -4.4 * s, 0);
    ctx.fill();
    const body = ctx.createLinearGradient(0, -2 * s, 0, 2 * s);
    body.addColorStop(0, '#c6d23a');
    body.addColorStop(1, '#8fa82a');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(5.2 * s, 0.3 * s);
    ctx.quadraticCurveTo(5.2 * s, -2.2 * s, 2.4 * s, -2.2 * s);
    ctx.quadraticCurveTo(-3 * s, -1.8 * s, -4.8 * s, 0);
    ctx.quadraticCurveTo(-3 * s, 1.7 * s, 2.4 * s, 2 * s);
    ctx.quadraticCurveTo(5.2 * s, 2 * s, 5.2 * s, 0.3 * s);
    ctx.fill();
    // Red bars over the head, the last one round the gill.
    ctx.strokeStyle = 'rgba(206, 58, 40, 0.85)';
    ctx.lineWidth = 0.45 * s;
    for (const bx of [4.4, 2.6, 1.2]) {
      ctx.beginPath();
      ctx.moveTo(bx * s, -1.9 * s);
      ctx.quadraticCurveTo((bx - 0.5) * s, 0, bx * s, 1.8 * s);
      ctx.stroke();
    }
    // Pectoral fin, a fan behind the gill.
    ctx.fillStyle = 'rgba(214, 220, 70, 0.6)';
    ctx.beginPath();
    ctx.moveTo(0.8 * s, 0.6 * s);
    ctx.quadraticCurveTo(-1.6 * s, 0.2 * s, -1.2 * s, 2.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8eec0';
    ctx.beginPath();
    ctx.arc(3.5 * s, -0.9 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b2a22';
    ctx.beginPath();
    ctx.arc(3.7 * s, -0.9 * s, 0.6 * s, 0, Math.PI * 2);
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

/** An ochre sea star clamped to a branch high on the reef, arms slowly curling. */
function seaStar(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, s0: number, t: number, seed: number): void {
  const p = perches(reef, L, 0.8, 0.97, seed ^ 0x57a, 1)[0];
  if (p === undefined) return;
  const s = s0 * 1.5;
  const [x, y] = reef.nodePx(L, p);
  spot('sea-star', x, y, 12 * s);
  ctx.save();
  // Five soft, tapering arms with rounded tips, each curling a little on its own, shaded from a
  // paler middle, beaded along each arm.
  const arm = (k: number): [number, number, number] => {
    const a = -Math.PI / 2 + (k / 5) * Math.PI * 2 + Math.sin(t * 0.3) * 0.05;
    return [a, (7.5 + Math.sin(t * 0.4 + k) * 0.6) * s, Math.sin(t * 0.25 + k * 1.7) * 0.18];
  };
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const [a, r, curl] = arm(k);
    const am = a + Math.PI / 5;
    const tip = a + curl;
    const tx = x + Math.cos(tip) * r, ty = y + Math.sin(tip) * r;
    const half = 1.3 * s;
    const rx = tx + Math.sin(tip) * half, ry = ty - Math.cos(tip) * half;
    const vx = x + Math.cos(a - Math.PI / 5) * 2.8 * s, vy = y + Math.sin(a - Math.PI / 5) * 2.8 * s;
    if (k === 0) ctx.moveTo(vx, vy);
    ctx.quadraticCurveTo(x + Math.cos(a - 0.2) * r * 0.55, y + Math.sin(a - 0.2) * r * 0.55, rx, ry);
    ctx.arc(tx, ty, half, tip - Math.PI / 2, tip + Math.PI / 2);
    ctx.quadraticCurveTo(x + Math.cos(a + 0.2) * r * 0.55, y + Math.sin(a + 0.2) * r * 0.55, x + Math.cos(am) * 2.8 * s, y + Math.sin(am) * 2.8 * s);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(x, y, 0, x, y, 8 * s);
  g.addColorStop(0, '#f0954a');
  g.addColorStop(1, '#b85a22');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(110,45,18,0.6)';
  ctx.lineWidth = 0.7 * s;
  ctx.fill();
  ctx.stroke();
  // Beads along each arm, and a pale spot at the middle.
  ctx.fillStyle = 'rgba(255,220,180,0.7)';
  ctx.beginPath();
  for (let k = 0; k < 5; k++) {
    const [a, r, curl] = arm(k);
    for (const u of [0.3, 0.52, 0.74]) {
      const aa = a + curl * u;
      const bx = x + Math.cos(aa) * r * u, by = y + Math.sin(aa) * r * u, br = (0.75 - u * 0.35) * s;
      ctx.moveTo(bx + br, by);
      ctx.arc(bx, by, br, 0, Math.PI * 2);
    }
  }
  ctx.moveTo(x + 1.1 * s, y);
  ctx.arc(x, y, 1.1 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A hermit crab walking the sand in a borrowed spiral shell; touched, it pulls inside. */
function hermit(ctx: CanvasRenderingContext2D, L: ReefLayout, s0: number, t: number, floor: (x: number) => number): void {
  const s = s0 * 1.7;
  const touch = startled('hermit-crab', t);
  const hide = touch && touch.age < 5;
  // It wanders a stretch of sand of its own, clear of the boxer crab and the cucumbers.
  const x = L.cx + (0.25 + (hide ? 0 : 0.035 * Math.sin(t * 0.2))) * L.unit, y = floor(x) - 1 * s;
  spot('hermit-crab', x, y - 5 * s, 13 * s);
  if (!hide) {
    // Legs and a big claw out of the shell's mouth.
    ctx.strokeStyle = '#c0503a';
    ctx.lineWidth = 0.9 * s;
    for (let q = 0; q < 3; q++) {
      ctx.beginPath();
      ctx.moveTo(x - 3 * s, y - 3 * s);
      ctx.lineTo(x - (6 + q * 1.5) * s, y + 0.5 * s - Math.abs(Math.sin(t * 4 + q)) * s);
      ctx.stroke();
    }
    ctx.fillStyle = '#d8604a';
    ctx.beginPath();
    ctx.ellipse(x - 6 * s, y - 4 * s, 2 * s, 1.4 * s, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x - 5 * s, y - 7 * s, 0.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // The borrowed shell: a snail's, its body whorl round and full with the mouth toward the crab,
  // the spire of smaller whorls tapering up and back to a point; lit from above, with growth lines.
  const g = ctx.createLinearGradient(0, y - 9 * s, 0, y);
  g.addColorStop(0, '#f2e0c2');
  g.addColorStop(1, '#c8a880');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(120,80,50,0.7)';
  ctx.lineWidth = 0.7 * s;
  ctx.beginPath();
  ctx.moveTo(x - 3.6 * s, y - 1 * s);
  ctx.quadraticCurveTo(x - 4.4 * s, y - 7 * s, x + 0.5 * s, y - 7.6 * s);
  ctx.quadraticCurveTo(x + 4 * s, y - 8.6 * s, x + 9.5 * s, y - 10.5 * s);
  ctx.quadraticCurveTo(x + 7.5 * s, y - 5.5 * s, x + 5.5 * s, y - 2.5 * s);
  ctx.quadraticCurveTo(x + 3 * s, y + 0.4 * s, x - 3.6 * s, y - 1 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The sutures between the whorls, and the mouth's dark opening (the crab's way in).
  ctx.beginPath();
  ctx.moveTo(x + 1 * s, y - 7.4 * s);
  ctx.quadraticCurveTo(x + 3.5 * s, y - 5 * s, x + 6 * s, y - 3.2 * s);
  ctx.moveTo(x + 4.6 * s, y - 8.6 * s);
  ctx.quadraticCurveTo(x + 6 * s, y - 7 * s, x + 7.4 * s, y - 6.2 * s);
  ctx.moveTo(x + 7.4 * s, y - 9.7 * s);
  ctx.quadraticCurveTo(x + 8.2 * s, y - 8.8 * s, x + 8.6 * s, y - 8.2 * s);
  ctx.stroke();
  ctx.fillStyle = 'rgba(60,35,25,0.8)';
  ctx.beginPath();
  ctx.ellipse(x - 2.4 * s, y - 3.4 * s, 1.6 * s, 2.4 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

/** A decorator crab at the reef's foot, wearing sponge and weed; touched, it freezes, all legs in. */
function decorator(ctx: CanvasRenderingContext2D, L: ReefLayout, s0: number, t: number, floor: (x: number) => number): void {
  const s = s0 * 1.7;
  const touch = startled('decorator-crab', t);
  const still = touch && touch.age < 4;
  const x = L.cx - 0.11 * L.unit + (still ? 0 : Math.sin(t * 0.25) * 6 * s), y = floor(x) - 1 * s;
  spot('decorator-crab', x, y - 4 * s, 13 * s);
  // Legs (pulled in when frozen), jointed, the walking tips down on the floor.
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 0.9 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let l = -1; l <= 1; l += 2)
    for (let q = 0; q < 3; q++) {
      const reach = still ? 2.5 : 5 + q * 0.8 + Math.sin(t * 3 + q + l) * 0.6;
      const kx = x + l * (reach * 0.7 + 1) * s, ky = y - (3.4 - q * 0.3) * s;
      ctx.moveTo(x + l * 2 * s, y - 2.4 * s + q * 0.4 * s);
      ctx.lineTo(kx, ky);
      ctx.lineTo(x + l * (reach + 0.4) * s, y + 0.8 * s);
    }
  ctx.stroke();
  // Two small claws held in front.
  ctx.fillStyle = '#8a6a48';
  ctx.beginPath();
  for (const l of [-1, 1]) {
    ctx.moveTo(x + l * 3.6 * s + 1.1 * s, y - 2.2 * s);
    ctx.ellipse(x + l * 3.6 * s, y - 2.2 * s, 1.1 * s, 0.7 * s, l * 0.5, 0, Math.PI * 2);
  }
  ctx.fill();
  // The body, hidden under what it wears.
  ctx.fillStyle = '#8a6a48';
  ctx.beginPath();
  ctx.ellipse(x, y - 3.5 * s, 4.2 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // What it wears: a lumpy orange sponge, a branched tuft of red weed, a little pink anemone and
  // a pale chip of shell, stuck on all over.
  ctx.fillStyle = '#d8902e';
  ctx.beginPath();
  for (const [bx, by, br] of [[-2.6, -5.4, 1.3], [-1.4, -6.2, 1.1], [-3.2, -4.2, 0.9]] as const) {
    ctx.moveTo(x + (bx + br) * s, y + by * s);
    ctx.arc(x + bx * s, y + by * s, br * s, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(90,50,20,0.6)';
  ctx.beginPath();
  ctx.arc(x - 1.6 * s, y - 6.6 * s, 0.35 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#b8404e';
  ctx.lineWidth = 0.6 * s;
  ctx.beginPath();
  const wv = Math.sin(t * 1.4) * 0.6 * s;
  for (const [ax, ay, bx, by] of [[1.5, -5.5, 2.4, -8.6], [2, -7, 0.8, -8.4], [2.2, -7.6, 3.6, -8.8], [1, -5, 0.2, -7.4]] as const) {
    ctx.moveTo(x + ax * s, y + ay * s);
    ctx.lineTo(x + bx * s + wv, y + by * s);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(245,180,210,0.9)';
  ctx.lineWidth = 0.45 * s;
  ctx.beginPath();
  for (let k = -3; k <= 3; k++) {
    const a = -Math.PI / 2 + k * 0.3 + Math.sin(t * 2 + k) * 0.08;
    ctx.moveTo(x + 3.4 * s, y - 4.6 * s);
    ctx.lineTo(x + 3.4 * s + Math.cos(a) * 1.8 * s, y - 4.6 * s + Math.sin(a) * 1.8 * s);
  }
  ctx.stroke();
  ctx.fillStyle = '#d8c8a0';
  ctx.beginPath();
  ctx.moveTo(x + 1.4 * s, y - 5.6 * s);
  ctx.lineTo(x + 3.2 * s, y - 6.6 * s);
  ctx.lineTo(x + 3 * s, y - 5 * s);
  ctx.closePath();
  ctx.fill();
  // A curl of weed waving from its back.
  ctx.strokeStyle = '#5a9a5a';
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1 * s, y - 6 * s);
  ctx.quadraticCurveTo(x - 3 * s + Math.sin(t) * 2 * s, y - 10 * s, x - 1 * s + Math.sin(t * 1.3) * 3 * s, y - 13 * s);
  ctx.stroke();
  // Eyes on short stalks peering out from under it all, at the front corners.
  ctx.strokeStyle = '#7a5a3a';
  ctx.lineWidth = 0.5 * s;
  ctx.beginPath();
  for (const l of [-1, 1]) { ctx.moveTo(x + l * 2.6 * s, y - 2.2 * s); ctx.lineTo(x + l * 3.2 * s, y - 3.4 * s); }
  ctx.stroke();
  ctx.fillStyle = '#141010';
  ctx.beginPath();
  for (const l of [-1, 1]) { ctx.moveTo(x + l * 3.2 * s + 0.45 * s, y - 3.5 * s); ctx.arc(x + l * 3.2 * s, y - 3.5 * s, 0.45 * s, 0, Math.PI * 2); }
  ctx.fill();
}

/** A boxer crab at the reef's foot, an anemone in each claw, waving them; touched, it shakes them hard. */
function boxer(ctx: CanvasRenderingContext2D, L: ReefLayout, s0: number, t: number, floor: (x: number) => number): void {
  const s = s0 * 1.7;
  const touch = startled('boxer-crab', t);
  const x = L.cx + 0.14 * L.unit, y = floor(x) - 1 * s;
  spot('boxer-crab', x, y - 4 * s, 12 * s);
  const shake = touch && touch.age < 2 ? Math.sin(touch.age * 30) * (1 - touch.age / 2) : 0;
  // Legs.
  ctx.strokeStyle = '#b8865a';
  ctx.lineWidth = 0.8 * s;
  for (let l = -1; l <= 1; l += 2)
    for (let q = 0; q < 3; q++) {
      ctx.beginPath();
      ctx.moveTo(x + l * 2 * s, y - 1.5 * s);
      ctx.lineTo(x + l * (4.5 + q) * s, y + 1 * s);
      ctx.stroke();
    }
  // The shell: wider at the front with a point at each side, pale cream banded in red.
  ctx.fillStyle = '#f2d8a8';
  ctx.beginPath();
  ctx.moveTo(x - 3.8 * s, y - 3.4 * s);
  ctx.lineTo(x - 4.4 * s, y - 2.6 * s);
  ctx.quadraticCurveTo(x - 3.4 * s, y - 0.4 * s, x, y - 0.3 * s);
  ctx.quadraticCurveTo(x + 3.4 * s, y - 0.4 * s, x + 4.4 * s, y - 2.6 * s);
  ctx.lineTo(x + 3.8 * s, y - 3.4 * s);
  ctx.quadraticCurveTo(x, y - 5.4 * s, x - 3.8 * s, y - 3.4 * s);
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(190,60,60,0.85)';
  ctx.lineWidth = 0.6 * s;
  ctx.beginPath();
  for (let k = -2; k <= 2; k++) {
    ctx.moveTo(x + k * 1.6 * s - 1.2 * s, y - 5 * s);
    ctx.quadraticCurveTo(x + k * 1.7 * s, y - 2.6 * s, x + k * 1.6 * s + 0.6 * s, y);
  }
  ctx.stroke();
  ctx.restore();
  // Arms up, jointed at the elbow, a little claw at each end gripping an anemone that waves.
  for (const side of [-1, 1]) {
    const wave = Math.sin(t * 2.2 + side) * 0.25 + shake * 0.6;
    const ax = x + side * (4 + Math.cos(wave) * 2) * s, ay = y - (6 + Math.sin(wave) * 2) * s;
    const ex = x + side * 4.6 * s, ey = y - 2.6 * s;
    ctx.strokeStyle = '#d8a878';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(x + side * 2.6 * s, y - 2 * s);
    ctx.lineTo(ex, ey);
    ctx.lineTo(ax, ay);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(190,60,60,0.85)';
    ctx.lineWidth = 0.4 * s;
    ctx.beginPath();
    ctx.moveTo(ex + (ax - ex) * 0.5 - 0.5 * s, ey + (ay - ey) * 0.5);
    ctx.lineTo(ex + (ax - ex) * 0.5 + 0.5 * s, ey + (ay - ey) * 0.5);
    ctx.stroke();
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * 0.4 + Math.sin(t * 3 + k) * 0.1;
      ctx.strokeStyle = 'rgba(245,200,230,0.95)';
      ctx.lineWidth = 0.7 * s;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.cos(a) * 2.6 * s, ay + Math.sin(a) * 2.6 * s);
      ctx.stroke();
    }
    ctx.fillStyle = '#e8b888';
    ctx.beginPath();
    ctx.ellipse(ax, ay + 0.3 * s, 0.9 * s, 0.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Eyes on stalks.
  ctx.strokeStyle = '#d8a878';
  ctx.lineWidth = 0.4 * s;
  ctx.beginPath();
  for (const ex of [-1, 1]) { ctx.moveTo(x + ex * 0.8 * s, y - 4.2 * s); ctx.lineTo(x + ex * 1.2 * s, y - 5.2 * s); }
  ctx.stroke();
  ctx.fillStyle = '#141010';
  for (const ex of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(x + ex * 1.2 * s, y - 5.4 * s, 0.6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function shrimp(ctx: CanvasRenderingContext2D, L: ReefLayout, s: number, t: number, floor: (x: number) => number): void {
  const touch = startled('pistol-shrimp', t);
  const x = L.cx - 0.2 * L.unit, y = floor(x) + 2 * s;
  spot('pistol-shrimp', x, y - 4 * s, 12 * s);
  // The burrow: a dark round mouth with a lip of sand, in a little mound.
  ctx.fillStyle = 'rgba(120, 100, 80, 0.75)';
  ctx.beginPath();
  ctx.ellipse(x, y, 13 * s, 5 * s, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(160, 138, 108, 0.8)';
  ctx.beginPath();
  ctx.ellipse(x, y - 0.6 * s, 5.6 * s, 3.9 * s, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(12, 9, 8, 0.92)';
  ctx.beginPath();
  ctx.ellipse(x, y - 0.4 * s, 4.4 * s, 3.2 * s, 0, Math.PI, 0);
  ctx.fill();
  // The shrimp leans out of it, its big claw first.
  const out = 0.6 + 0.4 * Math.sin(t * 0.5);
  const sx = x + 4 * s * out, sy = y - 2.5 * s;
  // Its body banded orange-red, tapering back into the hole to a tail fan; little legs under it,
  // a pair of antennae, an eye under the shell's hood, and the one oversized claw held out in
  // front: a swollen red palm with a dark snapping finger.
  ctx.fillStyle = 'rgba(200, 90, 60, 0.8)';
  ctx.beginPath();
  ctx.moveTo(sx - 4.8 * s, sy + 0.2 * s);
  ctx.lineTo(sx - 7.2 * s, sy - 1.6 * s);
  ctx.quadraticCurveTo(sx - 7.8 * s, sy + 0.2 * s, sx - 7.2 * s, sy + 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(170, 70, 50, 0.9)';
  ctx.lineWidth = 0.45 * s;
  ctx.beginPath();
  for (let k = 0; k < 4; k++) { const lx = sx - 2.6 * s + k * 1.5 * s; ctx.moveTo(lx, sy + 1.2 * s); ctx.lineTo(lx + 0.4 * s, sy + 2.6 * s); }
  ctx.stroke();
  const body = ctx.createLinearGradient(sx, sy - 2.2 * s, sx, sy + 1.6 * s);
  body.addColorStop(0, '#ec8a5c');
  body.addColorStop(1, '#c4553a');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(sx + 3.5 * s, sy - 1.6 * s);
  ctx.quadraticCurveTo(sx - 1 * s, sy - 2.6 * s, sx - 5 * s, sy - 0.6 * s);
  ctx.lineTo(sx - 5 * s, sy + 1 * s);
  ctx.quadraticCurveTo(sx - 1 * s, sy + 1.8 * s, sx + 3.5 * s, sy + 1.2 * s);
  ctx.closePath();
  ctx.fill();
  // Pale bands across the tail's segments.
  ctx.strokeStyle = 'rgba(240, 200, 170, 0.7)';
  ctx.lineWidth = 0.55 * s;
  ctx.beginPath();
  for (let k = 0; k < 3; k++) { const jx = sx - 3.8 * s + k * 1.6 * s; ctx.moveTo(jx, sy - 1.6 * s + k * 0.15 * s); ctx.lineTo(jx - 0.3 * s, sy + 1.2 * s); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(240,190,170,0.8)';
  ctx.lineWidth = 0.5 * s;
  ctx.beginPath();
  ctx.moveTo(sx + 3.5 * s, sy - 1.2 * s);
  ctx.quadraticCurveTo(sx + 7 * s, sy - 5 * s + Math.sin(t * 1.7) * 0.6 * s, sx + 11 * s, sy - 4.5 * s);
  ctx.moveTo(sx + 3.5 * s, sy - 1 * s);
  ctx.quadraticCurveTo(sx + 6 * s, sy - 6.5 * s, sx + 9 * s, sy - 7.5 * s + Math.sin(t * 1.3) * 0.6 * s);
  ctx.stroke();
  ctx.fillStyle = '#141010';
  ctx.beginPath();
  ctx.arc(sx + 2.6 * s, sy - 1.4 * s, 0.6 * s, 0, Math.PI * 2);
  ctx.fill();
  // The claw: a short arm, then the big swollen palm and its finger.
  ctx.fillStyle = '#c84a32';
  ctx.beginPath();
  ctx.moveTo(sx + 2.6 * s, sy + 0.4 * s);
  ctx.lineTo(sx + 4 * s, sy - 0.4 * s);
  ctx.lineTo(sx + 4.2 * s, sy + 1.8 * s);
  ctx.closePath();
  ctx.fill();
  const palm = ctx.createLinearGradient(sx + 3 * s, sy - 1.6 * s, sx + 8 * s, sy + 2.6 * s);
  palm.addColorStop(0, '#f08458');
  palm.addColorStop(1, '#b8382a');
  ctx.fillStyle = palm;
  ctx.beginPath();
  ctx.ellipse(sx + 6 * s, sy + 0.6 * s, 3.6 * s, 2.3 * s, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a2218';
  ctx.beginPath();
  ctx.moveTo(sx + 8.8 * s, sy - 0.5 * s);
  ctx.lineTo(sx + 11 * s, sy - 1 * s);
  ctx.lineTo(sx + 9 * s, sy + 0.6 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8b49a';
  ctx.beginPath();
  ctx.moveTo(sx + 8.6 * s, sy + 0.5 * s);
  ctx.lineTo(sx + 10.4 * s, sy + 0.7 * s);
  ctx.lineTo(sx + 8.6 * s, sy + 1.5 * s);
  ctx.closePath();
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
    const x = L.cx + side * ((k ? 0.36 : 0.29) + 0.02 * Math.sin(t * 0.02 + k)) * L.unit, y = floor(x) + 3 * s;
    // Touched, they contract into a lump.
    const squeeze = touch && touch.age < 5 ? 1 - 0.4 * Math.sin(Math.min(1, touch.age / 5) * Math.PI) : 1;
    spot('sea-cucumber', x, y - 3 * s, 14 * s);
    // Its casting behind it: a coil of clean sand heaped on the floor like squeezed paste.
    ctx.strokeStyle = 'rgba(225, 212, 182, 0.55)';
    ctx.lineWidth = 1.4 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const ccx = x - side * 21 * s, ccy = y - 0.5 * s;
    for (let q = 0; q <= 24; q++) {
      const a = (q / 24) * Math.PI * 4, r = (4.5 - q * 0.12) * s;
      const px = ccx + Math.cos(a) * r * 1.3, py = ccy + Math.sin(a) * r * 0.35 - q * 0.12 * s;
      if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // A plump, soft body, humped and lit from above, its head end (toward where it is going)
    // a little narrower with a frill of short feeding tentacles patting the sand; warts along the back.
    const len = 13 * s * squeeze, hgt = 4.6 * s / Math.sqrt(squeeze);
    const dark = k ? '#4e3224' : '#6a3e24', light = k ? '#8a6248' : '#b07448';
    const g = ctx.createLinearGradient(0, y - 3 * s - hgt, 0, y);
    g.addColorStop(0, light);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - side * len, y - 1 * s);
    ctx.quadraticCurveTo(x - side * len * 1.05, y - 3 * s - hgt * 0.9, x - side * len * 0.4, y - 3 * s - hgt);
    ctx.quadraticCurveTo(x + side * len * 0.5, y - 3 * s - hgt * 1.05, x + side * len * 0.95, y - 3 * s - hgt * 0.4);
    ctx.quadraticCurveTo(x + side * len * 1.05, y - 0.5 * s, x + side * len * 0.8, y);
    ctx.lineTo(x - side * len * 0.9, y);
    ctx.closePath();
    ctx.fill();
    // Feeding tentacles at the head, patting the sand in turn.
    ctx.strokeStyle = light;
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    for (let q = 0; q < 5; q++) {
      const pat = Math.max(0, Math.sin(t * 1.6 + q * 1.3)) * 1.6 * s;
      const hx = x + side * len * 0.95, hy = y - 2.5 * s - q * 0.7 * s;
      ctx.moveTo(hx, hy);
      ctx.quadraticCurveTo(hx + side * 2.5 * s, hy - 1 * s, hx + side * (2.2 + q * 0.4) * s, hy + 1.6 * s + pat);
    }
    ctx.stroke();
    // Warts (papillae) along the back, a shade lighter, with a dark base.
    ctx.fillStyle = light;
    ctx.beginPath();
    for (let b = -4; b <= 4; b++) {
      const u = b / 4.5;
      const bx = x + u * len * 0.85, by = y - 3 * s - hgt * (0.95 - 0.35 * u * u);
      const br = (0.9 + 0.3 * ((b + 4) % 2)) * s;
      ctx.moveTo(bx + br, by);
      ctx.arc(bx, by, br, 0, Math.PI * 2);
    }
    ctx.fill();
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
    const dir = facing(Math.cos(a + Math.PI / 2));
    spot('damselfish', x, y, 9 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    // A deep little body, blue shading to a paler belly, with the yellow tail and anal fin these
    // damsels wear and a long dorsal fin along the back.
    const wag = Math.sin(t * 9 + k) * 0.6 * s;
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.moveTo(-4.4 * s, -1 * s);
    ctx.lineTo(-8.6 * s, -3.2 * s + wag);
    ctx.quadraticCurveTo(-7.2 * s, wag, -8.6 * s, 3.2 * s + wag);
    ctx.lineTo(-4.4 * s, 1 * s);
    ctx.closePath();
    ctx.moveTo(-0.5 * s, 2.8 * s);
    ctx.quadraticCurveTo(-3.5 * s, 4.6 * s, -4.8 * s, 1.6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2a4fb8';
    ctx.beginPath();
    ctx.moveTo(2.6 * s, -3 * s);
    ctx.quadraticCurveTo(-1 * s, -5.2 * s, -4.6 * s, -1.8 * s);
    ctx.lineTo(-3.6 * s, -1.2 * s);
    ctx.closePath();
    ctx.fill();
    const body = ctx.createLinearGradient(0, -3.6 * s, 0, 3.6 * s);
    body.addColorStop(0, '#1b3a96');
    body.addColorStop(0.6, '#2f5fd0');
    body.addColorStop(1, '#6f9cf0');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(5.6 * s, 0.2 * s);
    ctx.bezierCurveTo(5 * s, -3.6 * s, -1 * s, -4 * s, -4.6 * s, -1.2 * s);
    ctx.lineTo(-4.6 * s, 1.2 * s);
    ctx.bezierCurveTo(-1 * s, 3.8 * s, 5 * s, 3.4 * s, 5.6 * s, 0.2 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,20,60,0.5)';
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    ctx.moveTo(2.4 * s, -2.4 * s);
    ctx.quadraticCurveTo(1.6 * s, 0, 2.4 * s, 2.4 * s);
    ctx.stroke();
    ctx.fillStyle = '#e8f0ff';
    ctx.beginPath();
    ctx.arc(3.4 * s, -0.8 * s, 0.9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a14';
    ctx.beginPath();
    ctx.arc(3.55 * s, -0.8 * s, 0.5 * s, 0, Math.PI * 2);
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
    // A swollen pale tip on each tentacle.
    ctx.fillStyle = 'rgba(236,190,214,0.95)';
    ctx.beginPath();
    ctx.arc(x + Math.cos(a + sway * 2) * len, y + Math.sin(a + sway * 2) * len, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  // Two clownfish weaving in and out of the tentacles.
  for (let k = 0; k < 2; k++) {
    const a = t * (0.9 + k * 0.3) + k * 3;
    const fx = x + Math.cos(a) * 8 * s, fy = y - 8 * s + Math.sin(a * 1.4) * 3 * s;
    const dir = facing(-Math.sin(a));
    ctx.save();
    ctx.translate(fx, fy);
    ctx.scale(dir, 1);
    // Orange, rounded fins edged dark, three white bars edged dark, a round eye.
    const wag = Math.sin(t * 9 + k) * 0.5 * s;
    ctx.fillStyle = '#e06a18';
    ctx.beginPath();
    ctx.moveTo(-3 * s, 0);
    ctx.quadraticCurveTo(-5.4 * s, -1.9 * s + wag, -5.2 * s, 0);
    ctx.quadraticCurveTo(-5.4 * s, 1.9 * s + wag, -3 * s, 0);
    ctx.moveTo(1.5 * s, -1.5 * s);
    ctx.quadraticCurveTo(-0.5 * s, -3 * s, -2.5 * s, -1.2 * s);
    ctx.lineTo(1.5 * s, -1.2 * s);
    ctx.fill();
    ctx.fillStyle = '#f07a20';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.4 * s, 1.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (const [bx, bw] of [[1.6, 0.9], [-0.4, 1.1], [-2.7, 0.7]] as const) {
      ctx.fillStyle = '#1a1010';
      ctx.fillRect((bx - 0.25) * s, -2 * s, (bw + 0.5) * s, 4 * s);
      ctx.fillStyle = '#f4f0ec';
      ctx.fillRect(bx * s, -2 * s, bw * s, 4 * s);
    }
    ctx.restore();
    ctx.fillStyle = '#1a1010';
    ctx.beginPath();
    ctx.arc(2.5 * s, -0.4 * s, 0.4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
