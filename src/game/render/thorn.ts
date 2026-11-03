// The thorn star: a coral-eating starfish climbing the reef (content/events.ts THORN), drawn on the
// coral on one side, higher as its time runs. Tap it off; touched, it is gone.

import type { Reef, ReefLayout } from './reef.ts';
import { glow } from './draw.ts';
import { sight, spot } from './sightings.ts';

/** `u`: 0..1 through its climb; `side`: −1 left, 1 right. */
export function drawThorn(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, u: number, side: number, t: number,
  kind: 'thorn-star' | 'drill-snail' = 'thorn-star'): void {
  const c = reef.coral;
  const want = (0.12 + 0.55 * u) * L.top;
  let best = -1, bestD = Infinity;
  for (let i = 0; i < c.count; i++) {
    if (c.y[i]! > L.top || Math.sign(c.x[i]!) !== side) continue;
    const d = Math.abs(c.y[i]! - want) + Math.abs(Math.abs(c.x[i]!) - 0.12) * 0.5;
    if (d < bestD) { bestD = d; best = i; }
  }
  if (best < 0) return;
  const [x, y] = reef.nodePx(L, best);
  const s = L.s * 1.5;
  if (kind === 'drill-snail') {
    drawSnail(ctx, x, y, s, t);
    return;
  }
  sight('thorn-star');
  spot('thorn-star', x, y, 18 * s);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.3) * 0.2);
  const arms = 13;
  // Thick tapering arms, each curling a little, a darker body showing between them; spines in
  // pairs along every arm, pointing out to both sides; a small raised disc in the middle.
  const armTip = (a: number): [number, number] => {
    const th = (a / arms) * Math.PI * 2;
    const r = (11 + Math.sin(a * 1.7 + t) * 0.8) * s;
    return [th + Math.sin(t * 0.5 + a) * 0.06, r];
  };
  ctx.fillStyle = '#6a2650';
  ctx.beginPath();
  ctx.arc(0, 0, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a3566';
  ctx.beginPath();
  for (let a = 0; a < arms; a++) {
    const [th, r] = armTip(a);
    const w = 0.2;
    ctx.moveTo(Math.cos(th - w) * 4 * s, Math.sin(th - w) * 4 * s);
    ctx.quadraticCurveTo(Math.cos(th - w * 0.5) * r * 0.6, Math.sin(th - w * 0.5) * r * 0.6, Math.cos(th) * r, Math.sin(th) * r);
    ctx.quadraticCurveTo(Math.cos(th + w * 0.5) * r * 0.6, Math.sin(th + w * 0.5) * r * 0.6, Math.cos(th + w) * 4 * s, Math.sin(th + w) * 4 * s);
    ctx.closePath();
  }
  ctx.fill();
  ctx.strokeStyle = '#f0b4d6';
  ctx.lineWidth = 0.6 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let a = 0; a < arms; a++) {
    const [th] = armTip(a);
    for (const r of [5.2, 7.4, 9.4]) {
      const px = Math.cos(th) * r * s, py = Math.sin(th) * r * s;
      const len = (2.4 - r * 0.12) * s;
      for (const d of [-1, 1]) {
        const sa = th + d * 1.1;
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(sa) * len, py + Math.sin(sa) * len);
      }
    }
  }
  ctx.stroke();
  ctx.fillStyle = '#b55a8c';
  ctx.beginPath();
  ctx.arc(0, 0, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,180,214,0.8)';
  ctx.beginPath();
  for (let a = 0; a < 7; a++) {
    const th = (a / 7) * Math.PI * 2 + 0.3;
    ctx.moveTo(Math.cos(th) * 1.2 * s, Math.sin(th) * 1.2 * s);
    ctx.lineTo(Math.cos(th) * 2.6 * s, Math.sin(th) * 2.6 * s);
  }
  ctx.stroke();
  ctx.restore();
}

/** The dragonfish: slinks in from one side toward the feeding shoals as `u` runs 0..1. */
export function drawDragonfish(ctx: CanvasRenderingContext2D, F: { x: number; y: number; w: number; h: number }, u: number, side: number,
  t: number, s: number): void {
  const e = Math.min(1, u * 2.2);
  const x0 = side > 0 ? F.x + F.w * 1.08 : F.x - F.w * 0.08;
  const x1 = F.x + F.w * (0.5 + side * 0.28);
  const x = x0 + (x1 - x0) * (e * e * (3 - 2 * e)) + Math.sin(t * 0.6) * 10 * s;
  const y = F.y + F.h * 0.58 + Math.sin(t * 0.4) * 14 * s;
  const k = 1.6 * s;
  sight('dragonfish');
  spot('dragonfish', x, y, 34 * k);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-side, 1);
  // A long eel-like body, darker than the water.
  ctx.fillStyle = '#05060c';
  ctx.beginPath();
  ctx.moveTo(18 * k, 0);
  ctx.quadraticCurveTo(10 * k, -6 * k, -8 * k, -4 * k);
  ctx.quadraticCurveTo(-30 * k, -2 * k + Math.sin(t * 3) * 2 * k, -44 * k, Math.sin(t * 3 + 1) * 3 * k);
  ctx.quadraticCurveTo(-30 * k, 3 * k, -8 * k, 4 * k);
  ctx.quadraticCurveTo(10 * k, 6 * k, 18 * k, 0);
  ctx.fill();
  // A faint rim of the shoals' light along its back, so the dark shape reads.
  ctx.strokeStyle = 'rgba(110,150,220,0.35)';
  ctx.lineWidth = 1 * k;
  ctx.stroke();
  // Fangs.
  ctx.strokeStyle = 'rgba(230,230,240,0.7)';
  ctx.lineWidth = 0.6 * k;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    ctx.moveTo(16 * k - i * 2.2 * k, 0.5 * k);
    ctx.lineTo(15 * k - i * 2.2 * k, 3 * k);
  }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  // The red lamp under its eye, and a blue line of photophores, and the barbel's lure.
  glow(ctx, 11 * k, -1.5 * k, 7 * k, '255,60,50', 0.8);
  for (let i = 0; i < 6; i++) glow(ctx, 4 * k - i * 6 * k, 3 * k, 2.2 * k, '120,170,255', 0.6);
  const bx = 16 * k + Math.sin(t * 1.5) * 4 * k, by = 14 * k;
  ctx.strokeStyle = 'rgba(150,180,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(12 * k, 3 * k);
  ctx.quadraticCurveTo(14 * k, 9 * k, bx, by);
  ctx.stroke();
  glow(ctx, bx, by, 6 * k, '150,200,255', 0.75 + 0.25 * Math.sin(t * 4));
  ctx.restore();
}

/** A drill snail on the coral: a spired shell, ridged, its foot clamped to the branch. */
function drawSnail(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number): void {
  sight('drill-snail');
  spot('drill-snail', x, y, 16 * s);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.5 + Math.sin(t * 0.4) * 0.05);
  ctx.fillStyle = 'rgba(200,170,150,0.7)';
  ctx.beginPath();
  ctx.ellipse(0, 3 * s, 7 * s, 2 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(-6 * s, -10 * s, 6 * s, 3 * s);
  g.addColorStop(0, '#e8dcc8');
  g.addColorStop(1, '#9a7c62');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-6 * s, 2 * s);
  ctx.quadraticCurveTo(-5 * s, -5 * s, 0, -12 * s);
  ctx.quadraticCurveTo(5 * s, -5 * s, 6 * s, 2 * s);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,40,0.6)';
  ctx.lineWidth = 0.8 * s;
  for (let k = 0; k < 4; k++) {
    const yy = 1 * s - k * 3 * s, hw = 5.5 * s - k * 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-hw, yy);
    ctx.quadraticCurveTo(0, yy - 1.5 * s, hw, yy - 1 * s);
    ctx.stroke();
  }
  ctx.restore();
}

/** A gull circling low over the crown, now and then dipping at the surface; `u` runs its stay. */
export function drawGull(ctx: CanvasRenderingContext2D, cx: number, waterY: number, u: number, side: number, t: number, s: number): void {
  const a = t * 0.9 * side;
  const dip = Math.max(0, Math.sin(t * 0.7)) ** 6;
  const x = cx + Math.cos(a) * 120 * s;
  const y = waterY - (70 - dip * 55) * s + Math.sin(a) * 18 * s - (1 - Math.min(1, u * 6)) * 200 * s;
  const k = 1.4 * s;
  sight('gull');
  spot('gull', x, y, 24 * k);
  const flap = Math.sin(t * 6) * 0.5;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.cos(a + Math.PI / 2) * side > 0 ? 1 : -1, 1);
  // Wings: long, filled, bent at the wrist, pale grey above with black tips; the far one behind.
  const wing = (dir: number, shade: string) => {
    const tipY = (-4 - flap * 7) * k, wristY = (-6 - flap * 4) * k;
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.moveTo(dir * 1.5 * k, -1.2 * k);
    ctx.quadraticCurveTo(dir * 4 * k, wristY - 1 * k, dir * 7 * k, wristY);
    ctx.quadraticCurveTo(dir * 11 * k, wristY + 0.5 * k, dir * 15 * k, tipY);
    ctx.quadraticCurveTo(dir * 10 * k, tipY + 3.2 * k, dir * 6.5 * k, wristY + 3 * k);
    ctx.quadraticCurveTo(dir * 4 * k, -0.2 * k, dir * 1.5 * k, 1 * k);
    ctx.closePath();
    ctx.fill();
    // The black tip.
    ctx.fillStyle = '#26272c';
    ctx.beginPath();
    ctx.moveTo(dir * 12 * k, tipY + 0.4 * k);
    ctx.lineTo(dir * 15 * k, tipY);
    ctx.quadraticCurveTo(dir * 13 * k, tipY + 2 * k, dir * 11 * k, tipY + 2.4 * k);
    ctx.closePath();
    ctx.fill();
  };
  wing(-1, '#b9c0c8');
  // Body, a squared tail, the head with its eye and yellow bill.
  ctx.fillStyle = '#eef1f4';
  ctx.beginPath();
  ctx.ellipse(0, 0.5 * k, 5 * k, 1.9 * k, 0, 0, Math.PI * 2);
  ctx.moveTo(-4.5 * k, -0.2 * k);
  ctx.lineTo(-7.5 * k, -0.6 * k);
  ctx.lineTo(-7.5 * k, 1.6 * k);
  ctx.lineTo(-4.5 * k, 1.4 * k);
  ctx.moveTo(6.4 * k, -0.4 * k);
  ctx.arc(5 * k, -0.4 * k, 1.5 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2a2e';
  ctx.beginPath();
  ctx.arc(5.4 * k, -0.8 * k, 0.45 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8b040';
  ctx.beginPath();
  ctx.moveTo(6.3 * k, -0.6 * k);
  ctx.lineTo(9 * k, 0);
  ctx.lineTo(6.3 * k, 0.5 * k);
  ctx.fill();
  wing(1, '#d4dae0');
  ctx.restore();
}
