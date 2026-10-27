// Draws one reef crown: the branching coral, its polyps, symbiont specks, and the purchase
// effects that play on it. Every zone scene owns one (with its own seed) and tells it where
// the reef stands and how much of it has grown.

import { generateCoral, thickness } from './coral.ts';
import { glow, ring } from './draw.ts';
import type { EffectKind, ReefView } from './scene.ts';

/** Where and how big the reef is drawn. */
export type ReefLayout = {
  cx: number;
  baseY: number;
  /** Pixels per reef unit (the coral is 1 unit tall when fully grown). */
  unit: number;
  /** General UI scale for polyps and glows. */
  s: number;
  dpr: number;
  /** Fraction of the coral grown, 0..1. */
  top: number;
  /** Fraction of the coral between growth-band lines. */
  bandStep: number;
  /** Colours of the stone: shadow, flesh, highlight. */
  palette?: [string, string, string];
};

const MAX_POLYPS = 90;
const MAX_SPECKS = 240;
const DEFAULT_PALETTE: [string, string, string] = ['#1d1026', '#6a3a50', 'rgba(255,170,160,0.22)'];

export function createReef(seed: number) {
  const coral = generateCoral(seed);
  const radii = new Float32Array(coral.count);
  let radiiTop = -1;
  let visibleCount = 0;

  function refresh(L: ReefLayout): void {
    if (L.top === radiiTop) return;
    thickness(coral, L.top, radii);
    radiiTop = L.top;
    visibleCount = 0;
    for (let i = 0; i < coral.count; i++) if (coral.y[i]! <= L.top) visibleCount++;
  }

  /** Polyps shown: one per bought polyp, but never crowding the stone that is on screen. */
  function shownPolyps(L: ReefLayout, v: ReefView): number {
    refresh(L);
    return Math.min(MAX_POLYPS, 1 + v.polyps, 1 + Math.floor(visibleCount * 0.3));
  }

  function nodePx(L: ReefLayout, i: number): [number, number] {
    return [L.cx + coral.x[i]! * L.unit, L.baseY - coral.y[i]! * L.unit];
  }

  /** Nodes carrying polyps: the crown first, then the fixed settling order. */
  function polypNodes(L: ReefLayout, n: number): number[] {
    const out: number[] = [];
    let crown = 0;
    for (let i = 0; i < coral.count; i++) if (coral.y[i]! <= L.top && coral.y[i]! > coral.y[crown]!) crown = i;
    out.push(crown);
    for (let k = 0; k < coral.count && out.length < n; k++) {
      const i = coral.polypOrder[k]!;
      if (coral.y[i]! <= L.top && i !== crown && coral.parent[i]! >= 0) out.push(i);
    }
    return out;
  }

  function leanOf(i: number): number {
    const p = coral.parent[i]!;
    if (p < 0) return 0;
    const dx = coral.x[i]! - coral.x[p]!, dy = coral.y[i]! - coral.y[p]!;
    return Math.max(-1, Math.min(1, (dx / (Math.hypot(dx, dy) || 1)) * 1.6));
  }

  function crown(L: ReefLayout): [number, number] {
    if (L.top <= 0) return [L.cx, L.baseY];
    return nodePx(L, polypNodes(L, 1)[0]!);
  }

  function drawBranches(ctx: CanvasRenderingContext2D, L: ReefLayout, t: number): void {
    if (L.top <= 0) return;
    refresh(L);
    const u = L.unit;
    const minW = 1.2 * L.dpr;
    const [shadow, flesh, light] = L.palette ?? DEFAULT_PALETTE;
    ctx.lineCap = 'round';
    const passes: [string, number, number][] = [[shadow, 1.3, 0.15], [flesh, 1.0, 0], [light, 0.4, -0.35]];
    for (const [color, wMul, shift] of passes) {
      ctx.strokeStyle = color;
      for (let i = 0; i < coral.count; i++) {
        const r = radii[i]!;
        const p = coral.parent[i]!;
        if (r <= 0 || p < 0) continue;
        const sway = Math.sin(t * 0.5 + coral.y[i]! * 6) * coral.y[i]! * 0.002 * u;
        const [x0, y0] = nodePx(L, p);
        const [x1, y1] = nodePx(L, i);
        const lw = Math.max(minW, r * u * 2 * wMul);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x0 + shift * lw * 0.5, y0);
        ctx.lineTo(x1 + sway + shift * lw * 0.5, y1);
        ctx.stroke();
      }
    }
    // Growth bands: faint rings where the stone crossed each band line.
    if (L.bandStep > 0) {
      ctx.fillStyle = 'rgba(255,215,200,0.16)';
      for (let i = 0; i < coral.count; i++) {
        const r = radii[i]!;
        const p = coral.parent[i]!;
        if (r <= 0 || p < 0) continue;
        if (Math.floor(coral.y[i]! / L.bandStep) === Math.floor(coral.y[p]! / L.bandStep)) continue;
        const [x, y] = nodePx(L, i);
        const rw = Math.max(minW, r * u * 1.1);
        ctx.fillRect(x - rw, y, rw * 2, Math.max(1, L.dpr * 0.7));
      }
    }
  }

  function polypPose(x: number, y: number, s: number, t: number, lean: number, phase: number): [number, number] {
    return [x + Math.sin(t * 0.6 + phase) * 2 * s + lean * 4 * s, y - 24 * s];
  }

  function drawPolyp(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, lean: number, phase: number, flick: number): void {
    const [ox, oy] = polypPose(x, y, s, t, lean, phase);
    ctx.strokeStyle = '#ff9d86';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 4 * s, y - 14 * s, ox, oy);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,170,0.9)';
    ctx.lineWidth = 2.2 * s;
    const open = 1 - flick * 0.6;
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + lean * 0.4 + (i - 3.5) * 0.32 * open + Math.sin(t * 0.9 + i + phase) * 0.08;
      const len = (16 + Math.sin(t * 1.1 + i * 1.3 + phase) * 2) * s;
      const tx = ox + Math.cos(a) * len, ty = oy + Math.sin(a) * len;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(ox + Math.cos(a - 0.4) * len * 0.6, oy + Math.sin(a - 0.4) * len * 0.6, tx, ty);
      ctx.stroke();
    }
  }

  function draw(ctx: CanvasRenderingContext2D, L: ReefLayout, v: ReefView, t: number): void {
    const s = L.s;
    const [crx, cry] = crown(L);
    const hp = Math.min(1, L.top) * L.unit;
    const pulse = 0.75 + 0.25 * Math.sin(t * 1.3);
    const lit = 0.35 + 0.65 * v.glowLevel;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, L.cx, L.baseY - hp * 0.55 - 30 * s, 230 * s + hp * 0.75, '60,190,255', 0.10 * pulse * (0.6 + lit));
    glow(ctx, crx, cry - 26 * s, 90 * s, '140,240,255', 0.28 * pulse);
    ctx.restore();

    drawBranches(ctx, L, t);

    const nodes = polypNodes(L, shownPolyps(L, v));
    const flick = Math.max(0, 1 - v.sinceSweep / 0.35);
    const tips: [number, number][] = [];
    // Side polyps first, crown polyp last so it sits on top.
    for (let k = nodes.length - 1; k >= 0; k--) {
      const i = nodes[k]!;
      const [x, y] = nodePx(L, i);
      const ps = s * (k === 0 ? 1 : 0.42 + 0.25 * ((i * 0.618) % 1));
      const lean = k === 0 ? 0 : leanOf(i);
      drawPolyp(ctx, x, y, ps, t, lean, i * 0.37, flick);
      const [ox, oy] = polypPose(x, y, ps, t, lean, i * 0.37);
      for (let q = 0; q < 8; q += 2) {
        const a = -Math.PI / 2 + lean * 0.4 + (q - 3.5) * 0.32;
        tips.push([ox + Math.cos(a) * 16 * ps, oy + Math.sin(a) * 16 * ps]);
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    tips.forEach(([tx, ty], i) => {
      const p = 0.6 + 0.4 * Math.sin(t * 2 + i * 0.8);
      glow(ctx, tx, ty, 8 * s, '160,250,255', 0.75 * p);
    });
    // Glimmerseed symbionts speckle the branches.
    const specks = Math.min(MAX_SPECKS, v.symbionts * 6, Math.floor(visibleCount * 0.6));
    for (let k = 0, shown = 0; k < coral.count && shown < specks; k++) {
      const i = (k * 7919) % coral.count;
      if (coral.y[i]! > L.top) continue;
      shown++;
      const [x, y] = nodePx(L, i);
      const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + (i % 7) * 0.2) + i);
      glow(ctx, x, y, 5 * s * (0.6 + (i % 5) * 0.2), '120,255,210', (0.25 + 0.6 * lit) * tw);
    }
    ctx.restore();
  }

  /** Purchase flourishes on the reef. Returns kinds it did not handle (scene-specific). */
  function drawEffects(
    ctx: CanvasRenderingContext2D, L: ReefLayout, v: ReefView,
    live: { kind: EffectKind; age: number; start: number }[],
  ): void {
    const s = L.s;
    const u = L.unit;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const fx of live) {
      const k = fx.age / 2.2;
      switch (fx.kind) {
        case 'polyp': {
          const nodes = polypNodes(L, shownPolyps(L, v));
          const [x, y] = nodePx(L, nodes[nodes.length - 1]!);
          glow(ctx, x, y - 10 * s, (20 + 50 * k) * s, '255,200,180', 0.7 * (1 - k));
          ring(ctx, x, y - 10 * s, (6 + 60 * k) * s, '255,190,170', 0.6 * (1 - k), 2 * s);
          break;
        }
        case 'skeleton': {
          const yy = L.baseY - Math.min(1, fx.age / 1.2) * Math.min(1, L.top) * u;
          const a = 0.45 * (1 - k);
          const g = ctx.createLinearGradient(0, yy - 14 * s, 0, yy + 14 * s);
          g.addColorStop(0, 'rgba(255,190,160,0)');
          g.addColorStop(0.5, `rgba(255,190,160,${a})`);
          g.addColorStop(1, 'rgba(255,190,160,0)');
          ctx.fillStyle = g;
          ctx.fillRect(L.cx - u * 0.3, yy - 14 * s, u * 0.6, 28 * s);
          break;
        }
        case 'symbiont': {
          for (let i = 0; i < 14; i++) {
            const node = (i * 7919 + Math.floor(fx.start * 13)) % coral.count;
            if (coral.y[node]! > L.top) continue;
            const [tx, ty] = nodePx(L, node);
            const ease = 1 - (1 - Math.min(1, fx.age / 1.4)) ** 3;
            glow(ctx, tx + Math.sin(i * 2.3) * 120 * s * (1 - ease), ty - 220 * s * (1 - ease), 7 * s, '120,255,210', 0.9 * (1 - k * 0.7));
          }
          break;
        }
        case 'lure': {
          const [cx, cy] = crown(L);
          for (let i = 0; i < 3; i++) {
            const kk = Math.max(0, k * 1.4 - i * 0.18);
            if (kk > 0 && kk < 1) ring(ctx, cx, cy - 20 * s, (10 + kk * 260) * s, '120,240,255', 0.5 * (1 - kk), 2.5 * s);
          }
          break;
        }
        case 'lattice': {
          const top = Math.min(1, L.top);
          glow(ctx, L.cx, L.baseY - top * u * 0.5, top * u * 0.7 + 60 * s, '255,230,220', 0.25 * Math.sin(Math.PI * k));
          break;
        }
        case 'shoal': {
          const [cx, cy] = crown(L);
          ring(ctx, cx, cy - 20 * s, (30 + k * 180) * s, '255,230,150', 0.35 * (1 - k), 1.5 * s);
          break;
        }
        case 'vent':
          break;
      }
    }
    ctx.restore();
  }

  return { draw, drawEffects, crown, nodePx, coral };
}

export type Reef = ReturnType<typeof createReef>;
