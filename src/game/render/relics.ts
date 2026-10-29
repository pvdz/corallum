// Relics the shoals brought home from Thousandfold's ruins (content/expeditions.ts), set into
// the lower branches of the reef: the gate's white hinge stone, a sealed larva cup, the lamp of
// the hall (still lit), a grooved well-stone and one Rasp beak.

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
      // A knuckle of white stone, worn smooth.
      ctx.fillStyle = '#ece6d8';
      ctx.beginPath();
      ctx.ellipse(x, y, 5 * s, 3.6 * s, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.ellipse(x - 1.5 * s, y - 1.2 * s, 1.8 * s, 1 * s, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'terraces') {
      // A little stone cup, its lid still on.
      ctx.fillStyle = '#b9a58c';
      ctx.beginPath();
      ctx.moveTo(x - 4 * s, y - 3 * s);
      ctx.lineTo(x + 4 * s, y - 3 * s);
      ctx.lineTo(x + 2.6 * s, y + 3.5 * s);
      ctx.lineTo(x - 2.6 * s, y + 3.5 * s);
      ctx.fill();
      ctx.fillStyle = '#d8c8ae';
      ctx.beginPath();
      ctx.ellipse(x, y - 3 * s, 4.6 * s, 1.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'lamp-hall') {
      // The hall's lamp: a shell hung from the branch, still breathing light.
      const hy = y + 9 * s;
      ctx.strokeStyle = 'rgba(200,220,255,0.35)';
      ctx.lineWidth = 0.7 * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(t * 0.8) * 1.5 * s, hy);
      ctx.stroke();
      const pulse = 0.65 + 0.35 * Math.sin(t * 1.1);
      ctx.fillStyle = '#e8eef8';
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(t * 0.8) * 1.5 * s, hy + 3 * s, 3.2 * s, 4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x + Math.sin(t * 0.8) * 1.5 * s, hy + 3 * s, 26 * s, '170,215,255', 0.55 * pulse * Math.max(0.35, gs));
      ctx.restore();
    } else if (id === 'wells') {
      // A grey disc ringed with listening grooves.
      ctx.fillStyle = '#8f949c';
      ctx.beginPath();
      ctx.arc(x, y, 4.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,44,52,0.7)';
      ctx.lineWidth = 0.6 * s;
      for (const r of [1.4, 2.6, 3.7]) {
        ctx.beginPath();
        ctx.arc(x, y, r * s, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (id === 'harbour') {
      // A mooring ring: a worn ring of stone.
      ctx.strokeStyle = '#d6cfc0';
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.arc(x, y, 4 * s, 0, Math.PI * 2);
      ctx.stroke();
    } else if (id === 'sun-gate') {
      // A bleached lintel: a pale bar of carved stone.
      ctx.fillStyle = '#f2ece0';
      ctx.fillRect(x - 7 * s, y - 2 * s, 14 * s, 4 * s);
      ctx.strokeStyle = 'rgba(180,160,120,0.6)';
      ctx.lineWidth = 0.6 * s;
      ctx.strokeRect(x - 7 * s, y - 2 * s, 14 * s, 4 * s);
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
