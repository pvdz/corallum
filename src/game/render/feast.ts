// A falling feast: something dead sinking slowly past the reef, trailed by the little lights
// of scavengers. Drawn over whichever scene is showing; tap it to eat (see sim/economy.ts).

import { FEAST } from '../content/events.ts';
import type { Feast, FeastPay } from '../sim/economy.ts';
import { glow } from './draw.ts';
import type { Focus } from './scene.ts';

/** Where the feast is, in device pixels, `age` seconds after it started to fall. */
export function feastPos(f: Feast, age: number, focus: Focus, pay: FeastPay = 'calcite'): [number, number] {
  const u = age / FEAST.life;
  // The swarm keeps to the open water either side of the reef, where it can be seen.
  const fx = pay === 'spawn' ? (f.x < 0.5 ? 0.06 + f.x * 0.3 : 0.79 + (f.x - 0.5) * 0.3) : f.x;
  const x = focus.x + focus.w * (fx + 0.03 * Math.sin(age * 0.35 + f.k));
  // Carrion and weed sink; moon plankton rise from the deep toward the moonlit surface.
  const y = focus.y + focus.h * (pay === 'spawn' ? 0.95 - 0.6 * u : -0.04 + 0.78 * u);
  return [x, y];
}

/** Tap radius in device pixels. */
export function feastReach(focus: Focus, dpr: number): number {
  return Math.max(44 * dpr, Math.min(focus.w, focus.h) * 0.08);
}

export function drawFeast(ctx: CanvasRenderingContext2D, f: Feast, age: number, t: number, focus: Focus, dpr: number,
  pay: FeastPay = 'calcite'): void {
  const [x, y] = feastPos(f, age, focus, pay);
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
  if (pay === 'bloom') drawSargassum(ctx, s, t, f.k);
  else if (pay === 'spawn') drawMoonSwarm(ctx, s, t, f.k);
  else if (f.kind === 0) drawFish(ctx, s);
  else if (f.kind === 1) drawSquid(ctx, s, t);
  else if (f.kind === 3) drawJellyFall(ctx, s, t);
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

/** A drifting mat of sargassum weed: tangled golden fronds buoyed by little round floats. */
function drawSargassum(ctx: CanvasRenderingContext2D, s: number, t: number, seed: number): void {
  // A drifting clump of gulfweed: thin olive stems branching out, narrow serrated blades along
  // them, and clusters of small round air bladders that keep it afloat.
  ctx.lineCap = 'round';
  const stems = new Path2D(), blades = new Path2D(), floats = new Path2D();
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4 + seed;
    const len = (16 + (i % 4) * 5) * s;
    const sway = Math.sin(t * 0.9 + i) * 0.15;
    const ex = Math.cos(a + sway) * len, ey = Math.sin(a + sway) * len * 0.6;
    const cx = ex * 0.5 + Math.sin(a * 1.7) * 5 * s, cy = ey * 0.5 + Math.cos(a) * 3 * s;
    stems.moveTo(0, 0);
    stems.quadraticCurveTo(cx, cy, ex, ey);
    for (let k = 1; k <= 4; k++) {
      const u = k / 5;
      const px = 2 * (1 - u) * u * cx + u * u * ex, py = 2 * (1 - u) * u * cy + u * u * ey;
      const ang = a + sway + (k % 2 ? 0.9 : -0.9);
      const bl = (7 + ((i + k) % 3) * 1.5) * s;
      // A blade: a thin leaf off the stem.
      const tx = px + Math.cos(ang) * bl, ty = py + Math.sin(ang) * bl * 0.8;
      const nx = -Math.sin(ang) * 2 * s, ny = Math.cos(ang) * 2 * s;
      blades.moveTo(px, py);
      blades.quadraticCurveTo((px + tx) / 2 + nx, (py + ty) / 2 + ny, tx, ty);
      blades.quadraticCurveTo((px + tx) / 2 - nx, (py + ty) / 2 - ny, px, py);
    }
    // Two or three bladders near the tip.
    for (let q = 0; q < 2 + (i % 2); q++) {
      const bx = ex + Math.cos(a + q * 2.1) * 2.6 * s, by = ey + Math.sin(a + q * 2.1) * 2 * s;
      floats.moveTo(bx + 1.5 * s, by);
      floats.arc(bx, by, 1.5 * s, 0, Math.PI * 2);
    }
  }
  ctx.strokeStyle = 'rgba(120,96,36,0.95)';
  ctx.lineWidth = 1.3 * s;
  ctx.stroke(stems);
  ctx.fillStyle = 'rgba(176,140,52,0.95)';
  ctx.fill(blades);
  ctx.fillStyle = 'rgba(214,176,74,1)';
  ctx.fill(floats);
  ctx.strokeStyle = 'rgba(110,84,30,0.7)';
  ctx.lineWidth = 0.5 * s;
  ctx.stroke(floats);
}

/** A swarm of moon plankton: dozens of tiny silver-pink lights wheeling around one another. */
function drawMoonSwarm(ctx: CanvasRenderingContext2D, s: number, t: number, seed: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 46; i++) {
    const a = i * 2.399 + seed + t * (0.4 + (i % 5) * 0.08);
    const r = Math.sqrt(i / 46) * 26 * s;
    glow(ctx, Math.cos(a) * r, Math.sin(a) * r * 0.7, 3.5 * s, i % 3 ? '255,200,230' : '220,230,255', 0.8);
  }
  ctx.restore();
}

/** A jelly fall: a great dead jellyfish sinking, its bell slack and clouded, tentacles trailing up. */
function drawJellyFall(ctx: CanvasRenderingContext2D, s: number, t: number): void {
  // Undo the feast's tilt a little: a bell sinks mouth-down.
  ctx.rotate(-0.4);
  const R = 26 * s;
  // Trailing tentacles, lifted by the sinking.
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const x0 = (i / 8 - 0.5) * R * 1.6;
    ctx.strokeStyle = `rgba(230,200,220,${0.35 + (i % 3) * 0.12})`;
    ctx.lineWidth = (1 + (i % 2)) * s;
    ctx.beginPath();
    ctx.moveTo(x0, -R * 0.1);
    ctx.bezierCurveTo(x0 + Math.sin(t * 1.1 + i) * 6 * s, -R * 0.8, x0 - Math.sin(t * 0.8 + i) * 8 * s, -R * 1.5, x0 + Math.sin(t + i * 2) * 5 * s, -R * (1.9 + (i % 3) * 0.3));
    ctx.stroke();
  }
  // The bell, upside down: dome below, rim above.
  const g = ctx.createRadialGradient(0, R * 0.2, 0, 0, R * 0.2, R);
  g.addColorStop(0, 'rgba(250,225,235,0.75)');
  g.addColorStop(1, 'rgba(210,170,200,0.35)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-R, 0);
  ctx.quadraticCurveTo(-R * 0.9, R * 0.95, 0, R * 0.95);
  ctx.quadraticCurveTo(R * 0.9, R * 0.95, R, 0);
  ctx.quadraticCurveTo(0, R * 0.18, -R, 0);
  ctx.fill();
  // Its four pale lobes, a clover seen through the bell (outlined rings in a row read as portholes).
  ctx.fillStyle = 'rgba(255,215,232,0.35)';
  ctx.beginPath();
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + 0.4;
    const lx = Math.cos(a) * R * 0.26, ly = R * 0.5 + Math.sin(a) * R * 0.12;
    const rx = R * 0.17 * (0.55 + 0.45 * Math.abs(Math.sin(a))), ry = R * 0.09;
    ctx.moveTo(lx + rx, ly);
    ctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2);
  }
  ctx.fill();
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
