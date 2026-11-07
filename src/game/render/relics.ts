// Relics the shoals brought home from Thousandfold's ruins (content/expeditions.ts), set into
// the lower branches of the reef: the gate's white hinge stone, a sealed larva cup, the lamp of
// the hall (still lit), a grooved well-stone, a mooring ring, a carved lintel and one Rasp beak.

import type { SiteId } from '../content/expeditions.ts';
import { glow } from './draw.ts';
import type { Reef, ReefLayout } from './reef.ts';

/** Fixed places on the lower stone, one per relic, as fractions of the grown height. */
const PLACE: Record<SiteId, number> = { gate: 0.16, terraces: 0.24, 'lamp-hall': 0.36, wells: 0.12, midden: 0.3, 'sun-gate': 0.44, harbour: 0.5 };

const placeCache = new Map<string, number>();
function nodeAt(reef: Reef, L: ReefLayout, frac: number, side: number): number {
  const key = `${frac}|${side}|${L.top.toFixed(3)}|${reef.coral.count}`;
  const hit = placeCache.get(key);
  if (hit !== undefined) return hit;
  if (placeCache.size > 64) placeCache.clear();
  const i = findNode(reef, L, frac, side);
  placeCache.set(key, i);
  return i;
}

function findNode(reef: Reef, L: ReefLayout, frac: number, side: number): number {
  const c = reef.coral;
  const want = frac * L.top;
  let best = -1, bestD = Infinity;
  for (let i = 0; i < c.count; i++) {
    if (c.y[i]! > L.top || Math.sign(c.x[i]!) !== side) continue;
    const d = Math.abs(c.y[i]! - want) - Math.abs(c.x[i]!) * 0.3;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

export function drawRelics(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, relics: readonly SiteId[], t: number,
  driftLamp = false): void {
  if (L.top <= 0.05) return;
  // The lamp taken in from the drift (a moment) hangs higher up, on the other side from the hall's.
  if (driftLamp) {
    const i = nodeAt(reef, L, 0.55, 1);
    if (i >= 0) {
      const [x, y] = reef.nodePx(L, i);
      const s = L.s * 1.3;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x + Math.sin(t * 0.7) * 1.5 * s, y + 10 * s, 22 * s, '170,215,255', 0.45 * Math.max(0.35, L.glowScale ?? 1));
      ctx.restore();
      ctx.fillStyle = '#e8eef8';
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(t * 0.7) * 1.5 * s, y + 10 * s, 2.6 * s, 3.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (!relics.length) return;
  const s = L.s * 1.3;
  const gs = L.glowScale ?? 1;
  ctx.save();
  for (const [k, id] of relics.entries()) {
    const i = nodeAt(reef, L, PLACE[id], k % 2 ? 1 : -1);
    if (i < 0) continue;
    const [x, y] = reef.nodePx(L, i);
    if (id === 'gate') {
      // The gate's hinge stone: a worn white knuckle of a block, its pin hole dark, lit on top.
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(0.4);
      ctx.fillStyle = '#b8b0a0';
      ctx.beginPath();
      ctx.roundRect(-5 * s, -3.4 * s, 10 * s, 7 * s, 2.6 * s);
      ctx.fill();
      ctx.fillStyle = '#ece6d8';
      ctx.beginPath();
      ctx.roundRect(-5 * s, -3.6 * s, 10 * s, 5.4 * s, 2.6 * s);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.ellipse(-1.8 * s, -2.2 * s, 2 * s, 0.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(60,54,46,0.8)';
      ctx.beginPath();
      ctx.arc(2.2 * s, -0.6 * s, 1.1 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (id === 'terraces') {
      // A little stone cup, its lid still on: a tapering body with a groove round it, the lid's
      // rim and knob, lit from the left.
      const g = ctx.createLinearGradient(x - 4 * s, 0, x + 4 * s, 0);
      g.addColorStop(0, '#d8c8ae');
      g.addColorStop(1, '#8e7c64');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 4 * s, y - 3 * s);
      ctx.quadraticCurveTo(x - 4.2 * s, y + 1 * s, x - 2.4 * s, y + 3.5 * s);
      ctx.lineTo(x + 2.4 * s, y + 3.5 * s);
      ctx.quadraticCurveTo(x + 4.2 * s, y + 1 * s, x + 4 * s, y - 3 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,58,44,0.6)';
      ctx.lineWidth = 0.6 * s;
      ctx.beginPath();
      ctx.ellipse(x, y + 0.2 * s, 3.9 * s, 0.9 * s, 0, 0.1, Math.PI - 0.1);
      ctx.stroke();
      ctx.fillStyle = '#e2d4bc';
      ctx.beginPath();
      ctx.ellipse(x, y - 3 * s, 4.6 * s, 1.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8b698';
      ctx.beginPath();
      ctx.ellipse(x, y - 3.9 * s, 1.3 * s, 0.9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'lamp-hall') {
      // The hall's lamp: a ribbed bell of a shell hung from the branch, still breathing light.
      const hy = y + 9 * s, sw = Math.sin(t * 0.8) * 1.5 * s;
      ctx.strokeStyle = 'rgba(200,220,255,0.35)';
      ctx.lineWidth = 0.7 * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + sw, hy);
      ctx.stroke();
      const pulse = 0.65 + 0.35 * Math.sin(t * 1.1);
      const lx = x + sw, ly = hy;
      ctx.fillStyle = '#e8eef8';
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.bezierCurveTo(lx - 2 * s, ly + 0.5 * s, lx - 3.6 * s, ly + 4 * s, lx - 3.4 * s, ly + 7 * s);
      ctx.quadraticCurveTo(lx, ly + 8 * s, lx + 3.4 * s, ly + 7 * s);
      ctx.bezierCurveTo(lx + 3.6 * s, ly + 4 * s, lx + 2 * s, ly + 0.5 * s, lx, ly);
      ctx.fill();
      ctx.strokeStyle = 'rgba(150,170,200,0.55)';
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      for (const k of [-2, -1, 0, 1, 2]) {
        ctx.moveTo(lx, ly + 0.6 * s);
        ctx.quadraticCurveTo(lx + k * 1.1 * s, ly + 4 * s, lx + k * 1.5 * s, ly + 7.3 * s);
      }
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, lx, ly + 6 * s, 26 * s, '170,215,255', 0.55 * pulse * Math.max(0.35, gs));
      ctx.restore();
    } else if (id === 'wells') {
      // A well-stone: a squat grey drum seen from the side, grooves worn round it where ropes ran.
      const g = ctx.createLinearGradient(x - 5 * s, 0, x + 5 * s, 0);
      g.addColorStop(0, '#a8adb6');
      g.addColorStop(1, '#5e636c');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y + 2.5 * s, 4.8 * s, 1.5 * s, 0, 0, Math.PI);
      ctx.lineTo(x - 4.8 * s, y - 2.5 * s);
      ctx.lineTo(x + 4.8 * s, y - 2.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(36,40,48,0.65)';
      ctx.lineWidth = 0.6 * s;
      ctx.beginPath();
      for (const gy of [-0.6, 1.1]) {
        ctx.moveTo(x - 4.8 * s, y + gy * s);
        ctx.ellipse(x, y + gy * s, 4.8 * s, 1.5 * s, 0, Math.PI, 0, true);
      }
      ctx.stroke();
      ctx.fillStyle = '#b4b9c2';
      ctx.beginPath();
      ctx.ellipse(x, y - 2.5 * s, 4.8 * s, 1.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(30,34,42,0.7)';
      ctx.beginPath();
      ctx.ellipse(x, y - 2.5 * s, 1.6 * s, 0.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'harbour') {
      // A mooring ring: a worn ring of stone hanging from its eye, lit along its top, shadowed below.
      ctx.lineWidth = 2 * s;
      ctx.strokeStyle = '#a49c8e';
      ctx.beginPath();
      ctx.arc(x, y + 3 * s, 4 * s, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#e4ddce';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.arc(x, y + 3 * s, 4.3 * s, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.fillStyle = '#8a8274';
      ctx.beginPath();
      ctx.ellipse(x, y - 1 * s, 1.6 * s, 1.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'sun-gate') {
      // A bleached lintel: a pale bar of carved stone, one end broken off, a sun cut in its face.
      ctx.fillStyle = '#c8bea8';
      ctx.beginPath();
      ctx.moveTo(x - 7 * s, y - 1.6 * s);
      ctx.lineTo(x + 5.5 * s, y - 2 * s);
      ctx.lineTo(x + 7 * s, y - 0.4 * s);
      ctx.lineTo(x + 6 * s, y + 0.6 * s);
      ctx.lineTo(x + 6.6 * s, y + 2 * s);
      ctx.lineTo(x - 7 * s, y + 2 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#f2ece0';
      ctx.fillRect(x - 7 * s, y - 2 * s, 12.5 * s, 1.4 * s);
      ctx.strokeStyle = 'rgba(150,128,90,0.75)';
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      ctx.arc(x - 1 * s, y + 0.4 * s, 1 * s, 0, Math.PI * 2);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        ctx.moveTo(x - 1 * s + Math.cos(a) * 1.4 * s, y + 0.4 * s + Math.sin(a) * 1.4 * s);
        ctx.lineTo(x - 1 * s + Math.cos(a) * 2 * s, y + 0.4 * s + Math.sin(a) * 2 * s);
      }
      ctx.stroke();
    } else {
      // One Rasp beak: two fused plates of teeth, pale as bone.
      ctx.fillStyle = '#e4dcc4';
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, y);
      ctx.quadraticCurveTo(x, y - 6 * s, x + 6 * s, y - 1 * s);
      ctx.quadraticCurveTo(x + 1 * s, y + 1 * s, x - 5 * s, y);
      ctx.moveTo(x - 5 * s, y + 0.8 * s);
      ctx.quadraticCurveTo(x, y + 5 * s, x + 5 * s, y + 1.2 * s);
      ctx.quadraticCurveTo(x + 1 * s, y + 2 * s, x - 5 * s, y + 0.8 * s);
      ctx.fill();
    }
  }
  ctx.restore();
}
