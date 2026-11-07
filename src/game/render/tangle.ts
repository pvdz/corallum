// A small fish tangled in a jelly's trailing threads, drifting near the reef: tap to free it.

import { drawSmallFish, glow, softRing } from './draw.ts';
import type { Focus } from './scene.ts';
import { spot } from './sightings.ts';

export function drawTangle(ctx: CanvasRenderingContext2D, tg: { k: number; x: number; age: number }, life: number, t: number, focus: Focus, dpr: number): void {
  const s = Math.min(focus.w, focus.h) / 700 * 1.6;
  const a = Math.min(1, tg.age / 2, (life - tg.age) / 3);
  if (a <= 0) return;
  const x = focus.x + focus.w * tg.x + Math.sin(t * 0.4 + tg.k) * 10 * s;
  const y = focus.y + focus.h * (0.3 + 0.05 * Math.sin(t * 0.3 + tg.k)) + tg.age * 1.5 * s;
  spot('tangle', x, y + 30 * s, Math.max(40 * s, 30 * dpr));
  ctx.save();
  ctx.globalAlpha = a;
  // The jelly's bell, pale and pulsing.
  const pulse = 1 + 0.08 * Math.sin(t * 2.5);
  // Clear at the rim, milkier at the crown, with a bright edge and the scalloped margin.
  const bell = ctx.createRadialGradient(x, y - 9 * s, 0, x, y - 4 * s, 17 * s);
  bell.addColorStop(0, 'rgba(235,225,250,0.6)');
  bell.addColorStop(1, 'rgba(200,190,235,0.22)');
  ctx.fillStyle = bell;
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * s * pulse, 10 * s, 0, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,240,255,0.55)';
  ctx.lineWidth = 0.9 * s;
  ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const lx = x + (-16 + (i + 0.5) * (32 / 6)) * s * pulse;
    ctx.moveTo(lx + 2.6 * s * pulse, y);
    ctx.arc(lx, y, 2.6 * s * pulse, 0, Math.PI);
  }
  ctx.stroke();
  // Its threads, trailing down, snarled round the fish.
  ctx.strokeStyle = 'rgba(230,220,250,0.55)';
  ctx.lineWidth = 0.9 * s;
  const fx = x + Math.sin(t * 6) * 3 * s, fy = y + 34 * s;
  for (let i = 0; i < 7; i++) {
    const x0 = x + (i - 3) * 4 * s;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.bezierCurveTo(x0 + Math.sin(t + i) * 6 * s, y + 14 * s, fx + Math.cos(i * 1.7 + t) * 8 * s, fy - 8 * s, fx + Math.cos(i * 2.3) * 7 * s, fy + Math.sin(i * 1.9) * 5 * s);
    ctx.stroke();
  }
  // The fish, wriggling.
  ctx.save();
  ctx.translate(fx, fy);
  ctx.rotate(Math.sin(t * 9) * 0.35);
  drawSmallFish(ctx, s * 0.85, '#b06a20', '#e8b050', '#fbe2a8');
  ctx.restore();
  // A breathing ring, as with feasts: it can be touched.
  const p = (t * 0.6) % 1;
  softRing(ctx, fx, fy, (18 + 14 * p) * s, (18 + 14 * p) * s, 6 * s, '255,235,200', (0.35 * (1 - p)) * 1.15);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, fx, fy, 20 * s, '255,220,160', 0.15);
  ctx.restore();
}

/** On the Silt Floor: a brittle star pinned under a fallen stone, its free arms waving. */
export function drawPinned(ctx: CanvasRenderingContext2D, tg: { k: number; x: number; age: number }, life: number, t: number, focus: Focus, dpr: number): void {
  const s = Math.min(focus.w, focus.h) / 700 * 1.6;
  const a = Math.min(1, tg.age / 2, (life - tg.age) / 3);
  if (a <= 0) return;
  const x = focus.x + focus.w * tg.x, y = focus.y + focus.h * 0.86;
  spot('tangle', x, y - 6 * s, Math.max(36 * s, 30 * dpr));
  ctx.save();
  ctx.globalAlpha = a;
  // Three free arms waving out from under the stone.
  ctx.strokeStyle = 'rgba(230,170,150,0.95)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.8 * s;
  for (let i = 0; i < 3; i++) {
    const base = Math.PI * (0.9 + i * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    let px = x, py = y;
    for (let j = 1; j <= 6; j++) {
      const ang = base + Math.sin(t * 2.5 + i * 2 + j * 0.5) * 0.35;
      px += Math.cos(ang) * 3 * s;
      py += Math.sin(ang) * 1.6 * s - 0.4 * s;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // The stone across it.
  ctx.fillStyle = '#3a3d52';
  ctx.beginPath();
  ctx.ellipse(x + 4 * s, y - 3 * s, 11 * s, 7 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,170,210,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 2 * s, y - 6 * s, 6 * s, 2.5 * s, 0.2, 0, Math.PI * 2);
  ctx.fill();
  const p = (t * 0.6) % 1;
  softRing(ctx, x, y - 4 * s, (18 + 14 * p) * s, (18 + 14 * p) * s, 6 * s, '255,235,200', (0.35 * (1 - p)) * 1.15);
  ctx.restore();
}

/** A fragment of some other reef tumbling past on the current: tap to take it in. */
export function drawFragment(ctx: CanvasRenderingContext2D, f: { k: number; x: number; age: number }, life: number, t: number, focus: Focus, dpr: number): void {
  const s = Math.min(focus.w, focus.h) / 700 * 1.7;
  const a = Math.min(1, f.age / 2, (life - f.age) / 3);
  if (a <= 0) return;
  const u = f.age / life;
  const x = focus.x + focus.w * (f.k % 2 ? 1.05 - u * 1.1 : -0.05 + u * 1.1);
  const y = focus.y + focus.h * (0.25 + 0.3 * f.x) + Math.sin(t * 0.9 + f.k) * 14 * s;
  spot('fragment', x, y, Math.max(34 * s, 30 * dpr));
  const hue = [12, 290, 40, 180][f.k % 4]!;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x, y);
  ctx.rotate(t * 0.6 + f.k);
  // Limbs taper from the break to the tips, each a little bent, and every tip holds a polyp's crown.
  const limbs = new Path2D(), crowns = new Path2D();
  const branch = (bx: number, by: number, ang: number, len: number, w0: number, depth: number) => {
    const bend = (depth % 2 ? 0.18 : -0.14);
    const ex = bx + Math.cos(ang + bend) * len, ey = by + Math.sin(ang + bend) * len;
    const mx = bx + Math.cos(ang) * len * 0.55, my = by + Math.sin(ang) * len * 0.55;
    const w1 = w0 * 0.62;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    limbs.moveTo(bx + nx * w0 / 2, by + ny * w0 / 2);
    limbs.quadraticCurveTo(mx + nx * (w0 + w1) / 4, my + ny * (w0 + w1) / 4, ex + nx * w1 / 2, ey + ny * w1 / 2);
    limbs.lineTo(ex - nx * w1 / 2, ey - ny * w1 / 2);
    limbs.quadraticCurveTo(mx - nx * (w0 + w1) / 4, my - ny * (w0 + w1) / 4, bx - nx * w0 / 2, by - ny * w0 / 2);
    limbs.closePath();
    // A round joint, so the forks do not show seams.
    limbs.moveTo(ex + w1 / 2, ey);
    limbs.arc(ex, ey, w1 / 2, 0, Math.PI * 2);
    if (depth < 3) {
      branch(ex, ey, ang - 0.5, len * 0.72, w1, depth + 1);
      branch(ex, ey, ang + 0.45, len * 0.72, w1, depth + 1);
    } else {
      const ta = ang + bend;
      for (let q = 0; q < 5; q++) {
        const fa = ta + (q - 2) * 0.42 + Math.sin(t * 2 + q + depth) * 0.08;
        crowns.moveTo(ex, ey);
        crowns.lineTo(ex + Math.cos(fa) * 2.8 * s, ey + Math.sin(fa) * 2.8 * s);
      }
    }
  };
  branch(0, 8 * s, -Math.PI / 2, 9 * s, 3.6 * s, 0);
  ctx.fillStyle = `hsl(${hue},48%,52%)`;
  ctx.fill(limbs);
  ctx.strokeStyle = `hsl(${hue},70%,80%)`;
  ctx.lineWidth = 0.8 * s;
  ctx.lineCap = 'round';
  ctx.stroke(crowns);
  // Where it snapped off: a jagged pale break of bare skeleton.
  ctx.fillStyle = `hsl(${hue},25%,82%)`;
  ctx.beginPath();
  ctx.moveTo(-1.9 * s, 8 * s);
  ctx.lineTo(-1 * s, 9.6 * s);
  ctx.lineTo(-0.2 * s, 8.7 * s);
  ctx.lineTo(0.7 * s, 10 * s);
  ctx.lineTo(1.9 * s, 8 * s);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  const p = (t * 0.6) % 1;
  ctx.save();
  softRing(ctx, x, y, (22 + 14 * p) * s, (22 + 14 * p) * s, 6 * s, '255,235,200', (0.35 * (1 - p) * a) * 1.15);
  ctx.restore();
}

/** A lost shoal far off in the dark: a small knot of lantern lights, flickering, as if calling. */
export function drawStray(ctx: CanvasRenderingContext2D, st: { k: number; x: number; age: number }, life: number, t: number, focus: Focus, dpr: number): void {
  const s = Math.min(focus.w, focus.h) / 700;
  const a = Math.min(1, st.age / 3, (life - st.age) / 4);
  if (a <= 0) return;
  const x = focus.x + focus.w * (st.x < 0.5 ? 0.08 + st.x * 0.3 : 0.62 + (st.x - 0.5) * 0.5);
  const y = focus.y + focus.h * (0.18 + 0.1 * Math.sin(st.k));
  spot('stray', x, y, Math.max(40 * s, 30 * dpr));
  ctx.save();
  // Seven small lanternfish milling in a loose knot, lost: dark bodies, and the rows of lights
  // along their bellies flickering as they call.
  const fish: [number, number, number][] = [];
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(28,40,70,0.9)';
  ctx.beginPath();
  for (let i = 0; i < 7; i++) {
    const ph = i * 2.4 + t * 0.6, ph2 = i * 1.7 + t * 0.5;
    const px = x + Math.cos(ph) * 22 * s, py = y + Math.sin(ph2) * 11 * s;
    const ang = Math.atan2(Math.cos(ph2) * 11 * 0.5, -Math.sin(ph) * 22 * 0.6);
    fish.push([px, py, ang]);
    const L = 8 * s, ca = Math.cos(ang), sa = Math.sin(ang);
    const P = (u: number, v: number): [number, number] => [px + u * ca - v * sa, py + u * sa + v * ca];
    const pts = [P(L, 0), P(L * 0.2, -L * 0.32), P(-L * 0.7, -L * 0.12), P(-L * 1.15, -L * 0.36), P(-L * 1.0, 0), P(-L * 1.15, L * 0.36), P(-L * 0.7, L * 0.12), P(L * 0.2, L * 0.3)];
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let q = 1; q < pts.length; q++) ctx.lineTo(pts[q]![0], pts[q]![1]);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  fish.forEach(([px, py, ang], i) => {
    const flick = 0.5 + 0.5 * Math.max(0, Math.sin(t * 3.1 + i * 1.3)) ** 4;
    glow(ctx, px, py, 7 * s, '120,200,255', 0.45 * a * flick);
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let q = -1; q <= 1; q++) {
      const lx = px + q * 3.2 * s * ca - 1.8 * s * sa, ly = py + q * 3.2 * s * sa + 1.8 * s * ca;
      glow(ctx, lx, ly, 1.3 * s, '220,245,255', a * (0.6 + 0.4 * flick));
    }
  });
  const p = (t * 0.5) % 1;
  ctx.globalCompositeOperation = 'source-over';
  softRing(ctx, x, y, (20 + 18 * p) * s, (20 + 18 * p) * s, 6 * s, '160,220,255', (0.35 * (1 - p) * a) * 1.15);
  ctx.restore();
}
