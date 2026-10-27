// The Silt Floor: the seamount at 4,000 m, marine snow, and the reef growing on it.
// Everything is generated from a seed; `draw` is a pure function of (view, t) so a given
// seed, state and time always render the same frame — screenshots rely on that.

import { mulberry32, range, type Rng } from '../sim/rng.ts';
import { generateCoral, thickness } from './coral.ts';

type Flake = { x: number; y: number; r: number; speed: number; drift: number; phase: number; layer: number };
type Mote = { x: number; y: number; r: number; phase: number; period: number; hue: number };
type Ridge = { points: number[]; color: string };

/** What the renderer needs from the game state. */
export type ReefView = {
  polyps: number;
  symbionts: number;
  /** Metres of reef. */
  height: number;
  /** Metres the scene frames at full height (the act goal). */
  frameMetres: number;
  /** 0..1, how strongly the glow lure is working. */
  glowLevel: number;
  /** Seconds since the last hand sweep, for the tentacle flick. */
  sinceSweep: number;
};

/** The part of the canvas not covered by the panel, in device pixels. */
export type Focus = { x: number; y: number; w: number; h: number };

export type Scene = {
  resize(w: number, h: number, dpr: number, focus: Focus): void;
  draw(ctx: CanvasRenderingContext2D, t: number, view: ReefView): void;
  /** Where the reef's crown is right now, in device pixels (for UI effects). */
  crown(view: ReefView): { x: number; y: number };
};

const MAX_POLYPS = 90;
const MAX_SPECKS = 240;

export function createAbyssScene(seed: number): Scene {
  const rng = mulberry32(seed);
  let w = 1, h = 1, dpr = 1;
  let focus: Focus = { x: 0, y: 0, w: 1, h: 1 };
  let flakes: Flake[] = [];
  let motes: Mote[] = [];
  let ridges: Ridge[] = [];
  const ridgeSeed = Math.floor(rng() * 1e9);
  const flakeSeed = Math.floor(rng() * 1e9);
  const reefSeed = Math.floor(rng() * 1e9);

  const coral = generateCoral(reefSeed);
  const radii = new Float32Array(coral.count);
  let radiiTop = -1;

  const scale = () => Math.min(focus.w, focus.h) / 700;
  const baseY = () => focus.y + focus.h * 0.84;
  const centreX = () => focus.x + focus.w * 0.5;

  function build(): void {
    const area = (w * h) / (dpr * dpr);
    const fr = mulberry32(flakeSeed);
    flakes = Array.from({ length: Math.round(area / 2600) }, () => ({
      x: fr(), y: fr(), layer: fr() < 0.6 ? 0 : fr() < 0.7 ? 1 : 2,
      r: 0, speed: 0, drift: range(fr, -0.3, 0.3), phase: fr() * Math.PI * 2,
    }));
    for (const f of flakes) {
      f.r = [0.6, 1.1, 1.9][f.layer]! * dpr * range(fr, 0.7, 1.3);
      f.speed = [0.006, 0.011, 0.02][f.layer]! * range(fr, 0.7, 1.3);
    }
    motes = Array.from({ length: 22 }, () => ({
      x: range(fr, -0.25, 0.25), y: range(fr, -0.45, -0.05), r: range(fr, 1, 2.6) * dpr,
      phase: fr() * 10, period: range(fr, 7, 16), hue: range(fr, 170, 200),
    }));
    const gr = mulberry32(ridgeSeed);
    ridges = [
      makeRidge(gr, -0.2, 0.10, '#0b0d26'),
      makeRidge(gr, -0.08, 0.08, '#080920'),
      makeRidge(gr, 0, 0.05, '#05061a'),
    ];
  }

  /** Ridge heights are offsets from the reef's base line, in units of focus height. */
  function makeRidge(r: Rng, offset: number, rough: number, color: string): Ridge {
    const n = 64;
    const pts: number[] = [];
    const a = r() * 10, b = r() * 10;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const hump = Math.exp(-((u - 0.5) ** 2) / 0.09);
      const noise = Math.sin(u * 13 + a) * 0.5 + Math.sin(u * 37 + b) * 0.25 + (r() - 0.5) * 0.35;
      // The nearest ridge is flattened under the reef so the reef sits on it.
      const flat = offset === 0 ? 1 - Math.exp(-((u - 0.5) ** 2) / 0.004) : 1;
      pts.push(offset - hump * 0.08 * (offset === 0 ? 0 : 1) + noise * rough * 0.3 * flat);
    }
    return { points: pts, color };
  }

  function drawWater(ctx: CanvasRenderingContext2D, t: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0d1838');
    g.addColorStop(0.22, '#0a1029');
    g.addColorStop(0.6, '#060719');
    g.addColorStop(1, '#03020a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // The surface: a faint silver ripple impossibly far above, the goal from minute one.
    const cx = centreX();
    const shimmer = 0.5 + 0.5 * Math.sin(t * 0.35);
    const sg = ctx.createRadialGradient(cx, -h * 0.08, 0, cx, -h * 0.08, h * 0.55);
    sg.addColorStop(0, `rgba(190,215,255,${0.20 + shimmer * 0.05})`);
    sg.addColorStop(0.4, 'rgba(110,140,220,0.06)');
    sg.addColorStop(1, 'rgba(40,50,120,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);

    // Faint light shafts, mostly dissolved by depth.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const sx = cx + focus.w * ((i - 2) * 0.1) + Math.sin(t * 0.07 + i * 1.7) * focus.w * 0.03;
      const spread = focus.w * (0.03 + 0.015 * Math.sin(t * 0.11 + i));
      const lg = ctx.createLinearGradient(0, 0, 0, h * 0.7);
      const a = 0.025 + 0.012 * Math.sin(t * 0.21 + i * 2.1);
      lg.addColorStop(0, `rgba(150,180,255,${a})`);
      lg.addColorStop(1, 'rgba(150,180,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(sx - spread * 0.3, 0);
      ctx.lineTo(sx + spread * 0.3, 0);
      ctx.lineTo(sx + spread * 2.2, h * 0.7);
      ctx.lineTo(sx - spread * 2.2, h * 0.7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRidge(ctx: CanvasRenderingContext2D, ridge: Ridge): void {
    const pts = ridge.points;
    const by = baseY();
    // Ridges span the whole canvas but are centred on the focus area.
    const span = Math.max(w, focus.w * 1.6);
    const x0 = centreX() - span / 2;
    ctx.fillStyle = ridge.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, by + pts[0]! * focus.h);
    for (let i = 0; i < pts.length; i++) ctx.lineTo(x0 + (i / (pts.length - 1)) * span, by + pts[i]! * focus.h);
    ctx.lineTo(w, by + pts[pts.length - 1]! * focus.h);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  function drawSnow(ctx: CanvasRenderingContext2D, t: number, layer: number): void {
    ctx.fillStyle = ['rgba(170,190,230,0.35)', 'rgba(200,215,245,0.5)', 'rgba(225,235,255,0.6)'][layer]!;
    for (const f of flakes) {
      if (f.layer !== layer) continue;
      const y = ((f.y + t * f.speed) % 1) * (h + 20) - 10;
      const x = ((((f.x + Math.sin(t * 0.3 + f.phase) * 0.004 + t * f.drift * 0.002) % 1) + 1) % 1) * w;
      ctx.beginPath();
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number): void {
    if (r <= 0 || a <= 0.002) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.35, `rgba(${rgb},${a * 0.35})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Reef geometry: the coral is in reef units (0..1 tall); one unit is this many pixels.
  function unitPx(v: ReefView): number {
    void v;
    return focus.h * 0.62;
  }
  function visibleTop(v: ReefView): number {
    return Math.min(1.05, v.height / v.frameMetres);
  }
  function nodePx(i: number, u: number): [number, number] {
    return [centreX() + coral.x[i]! * u, baseY() - coral.y[i]! * u];
  }

  function drawBranches(ctx: CanvasRenderingContext2D, v: ReefView, t: number): void {
    const top = visibleTop(v);
    if (top <= 0) return;
    if (top !== radiiTop) { thickness(coral, top, radii); radiiTop = top; }
    const u = unitPx(v);
    const minW = 1.2 * dpr;
    ctx.lineCap = 'round';
    // Three passes: shadow body, flesh, and a top-lit highlight.
    const passes: [string, number, number][] = [
      ['#1d1026', 1.3, 0.15],
      ['#6a3a50', 1.0, 0],
      ['rgba(255,170,160,0.22)', 0.4, -0.35],
    ];
    for (const [color, wMul, shift] of passes) {
      ctx.strokeStyle = color;
      for (let i = 0; i < coral.count; i++) {
        const r = radii[i]!;
        const p = coral.parent[i]!;
        if (r <= 0 || p < 0) continue;
        const sway = Math.sin(t * 0.5 + coral.y[i]! * 6) * coral.y[i]! * 0.002 * u;
        const [x0, y0] = nodePx(p, u);
        const [x1, y1] = nodePx(i, u);
        const lw = Math.max(minW, r * u * 2 * wMul);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x0 + shift * lw * 0.5, y0);
        ctx.lineTo(x1 + sway + shift * lw * 0.5, y1);
        ctx.stroke();
      }
    }
    // Growth bands: faint rings where the stone crossed each band line.
    const bandStep = 3 / v.frameMetres;
    ctx.fillStyle = 'rgba(255,215,200,0.16)';
    for (let i = 0; i < coral.count; i++) {
      const r = radii[i]!;
      const p = coral.parent[i]!;
      if (r <= 0 || p < 0) continue;
      if (Math.floor(coral.y[i]! / bandStep) === Math.floor(coral.y[p]! / bandStep)) continue;
      const [x, y] = nodePx(i, u);
      const rw = Math.max(minW, r * u * 1.1);
      ctx.fillRect(x - rw, y, rw * 2, Math.max(1, dpr * 0.7));
    }
  }

  /** The i-th polyp's node, or -1 when the reef has not grown that far. */
  function polypNodes(v: ReefView, n: number): number[] {
    const top = visibleTop(v);
    const out: number[] = [];
    // The crown: the highest visible node carries the first polyp.
    let crown = 0;
    for (let i = 0; i < coral.count; i++) if (coral.y[i]! <= top && coral.y[i]! > coral.y[crown]!) crown = i;
    out.push(crown);
    for (let k = 0; k < coral.count && out.length < n; k++) {
      const i = coral.polypOrder[k]!;
      if (coral.y[i]! <= top && i !== crown && coral.parent[i]! >= 0) out.push(i);
    }
    return out;
  }

  function leanOf(i: number): number {
    const p = coral.parent[i]!;
    if (p < 0) return 0;
    const dx = coral.x[i]! - coral.x[p]!, dy = coral.y[i]! - coral.y[p]!;
    return Math.max(-1, Math.min(1, (dx / (Math.hypot(dx, dy) || 1)) * 1.6));
  }

  function drawPolyp(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, lean: number, phase: number, flick: number): void {
    const sway = Math.sin(t * 0.6 + phase) * 2 * s + lean * 4 * s;
    const ox = x + sway, oy = y - 24 * s;
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

  function polypTips(x: number, y: number, s: number, t: number, lean: number, phase: number): [number, number][] {
    const sway = Math.sin(t * 0.6 + phase) * 2 * s + lean * 4 * s;
    const ox = x + sway, oy = y - 24 * s;
    const tips: [number, number][] = [];
    for (let i = 0; i < 8; i += 2) {
      const a = -Math.PI / 2 + lean * 0.4 + (i - 3.5) * 0.32;
      const len = 16 * s;
      tips.push([ox + Math.cos(a) * len, oy + Math.sin(a) * len]);
    }
    return tips;
  }

  function crownPx(v: ReefView): [number, number] {
    const top = visibleTop(v);
    if (top <= 0) return [centreX(), baseY()];
    return nodePx(polypNodes(v, 1)[0]!, unitPx(v));
  }

  function drawReef(ctx: CanvasRenderingContext2D, t: number, v: ReefView): void {
    const s = scale();
    const u = unitPx(v);
    const [crx, cry] = crownPx(v);
    const hp = Math.min(1, visibleTop(v)) * u;
    const pulse = 0.75 + 0.25 * Math.sin(t * 1.3);
    const lit = 0.35 + 0.65 * v.glowLevel;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, centreX(), baseY() - hp * 0.55 - 30 * s, 230 * s + hp * 0.75, '60,190,255', 0.10 * pulse * (0.6 + lit));
    glow(ctx, crx, cry - 26 * s, 90 * s, '140,240,255', 0.28 * pulse);
    ctx.restore();

    drawBranches(ctx, v, t);

    const nodes = polypNodes(v, Math.min(MAX_POLYPS, 1 + v.polyps));
    const flick = Math.max(0, 1 - v.sinceSweep / 0.35);
    const tips: [number, number][] = [];
    // Side polyps first, crown polyp last so it sits on top.
    for (let k = nodes.length - 1; k >= 0; k--) {
      const i = nodes[k]!;
      const [x, y] = nodePx(i, u);
      const ps = s * (k === 0 ? 1 : 0.42 + 0.25 * ((i * 0.618) % 1));
      const lean = k === 0 ? 0 : leanOf(i);
      drawPolyp(ctx, x, y, ps, t, lean, i * 0.37, flick);
      for (const tip of polypTips(x, y, ps, t, lean, i * 0.37)) tips.push(tip);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    tips.forEach(([tx, ty], i) => {
      const p = 0.6 + 0.4 * Math.sin(t * 2 + i * 0.8);
      glow(ctx, tx, ty, 8 * s, '160,250,255', 0.75 * p);
    });
    // Glimmerseed symbionts speckle the branches.
    const specks = Math.min(MAX_SPECKS, v.symbionts * 6);
    const top = visibleTop(v);
    for (let k = 0, shown = 0; k < coral.count && shown < specks; k++) {
      const i = (k * 7919) % coral.count;
      if (coral.y[i]! > top) continue;
      shown++;
      const [x, y] = nodePx(i, u);
      const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + (i % 7) * 0.2) + i);
      glow(ctx, x, y, 5 * s * (0.6 + (i % 5) * 0.2), '120,255,210', (0.25 + 0.6 * lit) * tw);
    }
    ctx.restore();
  }

  function drawMotes(ctx: CanvasRenderingContext2D, t: number, v: ReefView): void {
    const cx = centreX(), by = baseY();
    const n = Math.round(motes.length * (0.4 + 0.6 * v.glowLevel));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const m = motes[i]!;
      const u = ((t + m.phase * m.period) / m.period) % 1;
      const x = cx + (m.x + Math.sin(u * Math.PI * 2 + m.phase) * 0.05) * focus.w;
      const y = by + (m.y - u * 0.25) * focus.h;
      const a = Math.sin(u * Math.PI) * 0.8;
      glow(ctx, x, y, m.r * 6, `${Math.round(m.hue - 100)},${Math.round(m.hue + 40)},255`, a * 0.5);
    }
    ctx.restore();
  }

  function vignette(ctx: CanvasRenderingContext2D): void {
    const cx = centreX(), cy = focus.y + focus.h * 0.55;
    const g = ctx.createRadialGradient(cx, cy, Math.min(focus.w, focus.h) * 0.3, cx, cy, Math.max(w, h) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,6,0.65)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  return {
    resize(nw, nh, ndpr, nfocus) {
      w = nw; h = nh; dpr = ndpr; focus = nfocus;
      build();
    },
    draw(ctx, t, v) {
      drawWater(ctx, t);
      drawSnow(ctx, t, 0);
      drawRidge(ctx, ridges[0]!);
      drawSnow(ctx, t, 1);
      drawRidge(ctx, ridges[1]!);
      drawMotes(ctx, t, v);
      drawRidge(ctx, ridges[2]!);
      drawReef(ctx, t, v);
      drawSnow(ctx, t, 2);
      vignette(ctx);
    },
    crown(v) {
      const [x, y] = crownPx(v);
      return { x, y: y - 30 * scale() };
    },
  };
}
