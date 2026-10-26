// The opening scene: the seamount at 4,000 m, marine snow, and the first polyp glowing on the
// silt. Everything is generated from a seed; `draw(t)` is a pure function of time so a given
// (seed, t) always renders the same frame — screenshots rely on that.

import { mulberry32, range, type Rng } from '../sim/rng.ts';

type Flake = { x: number; y: number; r: number; speed: number; drift: number; phase: number; layer: number };
type Mote = { x: number; y: number; r: number; phase: number; period: number; hue: number };
type Ridge = { points: number[]; color: string; height: number };

export type Scene = {
  resize(w: number, h: number, dpr: number): void;
  draw(ctx: CanvasRenderingContext2D, t: number): void;
};

export function createAbyssScene(seed: number): Scene {
  const rng = mulberry32(seed);
  let w = 1, h = 1, dpr = 1;
  let flakes: Flake[] = [];
  let motes: Mote[] = [];
  let ridges: Ridge[] = [];
  const ridgeSeed = Math.floor(rng() * 1e9);
  const flakeSeed = Math.floor(rng() * 1e9);

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
      x: range(fr, 0.3, 0.7), y: range(fr, 0.55, 0.85), r: range(fr, 1, 2.6) * dpr,
      phase: fr() * 10, period: range(fr, 7, 16), hue: range(fr, 170, 200),
    }));
    const rr = mulberry32(ridgeSeed);
    ridges = [
      makeRidge(rr, 0.62, 0.10, '#0b0d26'),
      makeRidge(rr, 0.72, 0.08, '#080920'),
      makeRidge(rr, 0.80, 0.05, '#05061a'),
    ];
  }

  function makeRidge(r: Rng, height: number, rough: number, color: string): Ridge {
    const n = 64;
    const pts: number[] = [];
    const a = r() * 10, b = r() * 10;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      // A seamount: a broad hump in the middle with ragged noise on top.
      const hump = Math.exp(-((u - 0.5) ** 2) / 0.09);
      const noise = Math.sin(u * 13 + a) * 0.5 + Math.sin(u * 37 + b) * 0.25 + (r() - 0.5) * 0.35;
      pts.push(height - hump * 0.08 + noise * rough * 0.3);
    }
    return { points: pts, color, height };
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
    const shimmer = 0.5 + 0.5 * Math.sin(t * 0.35);
    const sg = ctx.createRadialGradient(w * 0.5, -h * 0.08, 0, w * 0.5, -h * 0.08, h * 0.55);
    sg.addColorStop(0, `rgba(190,215,255,${0.20 + shimmer * 0.05})`);
    sg.addColorStop(0.4, 'rgba(110,140,220,0.06)');
    sg.addColorStop(1, 'rgba(40,50,120,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);

    // Faint light shafts, mostly dissolved by depth.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const cx = w * (0.3 + i * 0.1) + Math.sin(t * 0.07 + i * 1.7) * w * 0.03;
      const spread = w * (0.03 + 0.015 * Math.sin(t * 0.11 + i));
      const lg = ctx.createLinearGradient(0, 0, 0, h * 0.7);
      const a = 0.025 + 0.012 * Math.sin(t * 0.21 + i * 2.1);
      lg.addColorStop(0, `rgba(150,180,255,${a})`);
      lg.addColorStop(1, 'rgba(150,180,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(cx - spread * 0.3, 0);
      ctx.lineTo(cx + spread * 0.3, 0);
      ctx.lineTo(cx + spread * 2.2, h * 0.7);
      ctx.lineTo(cx - spread * 2.2, h * 0.7);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRidge(ctx: CanvasRenderingContext2D, ridge: Ridge): void {
    const pts = ridge.points;
    ctx.fillStyle = ridge.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < pts.length; i++) ctx.lineTo((i / (pts.length - 1)) * w, pts[i]! * h);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  function drawSnow(ctx: CanvasRenderingContext2D, t: number, layer: number): void {
    ctx.fillStyle = ['rgba(170,190,230,0.35)', 'rgba(200,215,245,0.5)', 'rgba(225,235,255,0.6)'][layer]!;
    for (const f of flakes) {
      if (f.layer !== layer) continue;
      const y = ((f.y + t * f.speed) % 1) * (h + 20) - 10;
      const x = (((f.x + Math.sin(t * 0.3 + f.phase) * 0.004 + t * f.drift * 0.002) % 1) + 1) % 1 * w;
      ctx.beginPath();
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number): void {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.35, `rgba(${rgb},${a * 0.35})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function drawPolyp(ctx: CanvasRenderingContext2D, t: number): void {
    const base = ridges[2]!;
    const mid = Math.floor(base.points.length / 2);
    const x = w * 0.5;
    const y = base.points[mid]! * h + 2 * dpr;
    const s = Math.min(w, h) / 900;
    const pulse = 0.75 + 0.25 * Math.sin(t * 1.3);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y - 30 * s, 260 * s, '60,190,255', 0.10 * pulse);
    glow(ctx, x, y - 26 * s, 90 * s, '140,240,255', 0.28 * pulse);
    ctx.restore();

    // Stalk and tentacles of the single polyp.
    ctx.strokeStyle = '#ff9d86';
    ctx.lineCap = 'round';
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 4 * s, y - 14 * s, x + Math.sin(t * 0.6) * 2 * s, y - 24 * s);
    ctx.stroke();
    const tips: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + (i - 3.5) * 0.32 + Math.sin(t * 0.9 + i) * 0.08;
      const len = (16 + Math.sin(t * 1.1 + i * 1.3) * 2) * s;
      const ox = x + Math.sin(t * 0.6) * 2 * s, oy = y - 24 * s;
      const tx = ox + Math.cos(a) * len, ty = oy + Math.sin(a) * len;
      ctx.strokeStyle = 'rgba(255,190,170,0.9)';
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(ox + Math.cos(a - 0.4) * len * 0.6, oy + Math.sin(a - 0.4) * len * 0.6, tx, ty);
      ctx.stroke();
      tips.push([tx, ty]);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    tips.forEach(([tx, ty], i) => {
      const p = 0.6 + 0.4 * Math.sin(t * 2 + i * 0.8);
      glow(ctx, tx, ty, 9 * s, '160,250,255', 0.9 * p);
    });
    ctx.restore();
  }

  function drawMotes(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of motes) {
      const u = ((t + m.phase * m.period) / m.period) % 1;
      const x = (m.x + Math.sin(u * Math.PI * 2 + m.phase) * 0.05) * w;
      const y = (m.y - u * 0.25) * h;
      const a = Math.sin(u * Math.PI) * 0.8;
      glow(ctx, x, y, m.r * 6, `${Math.round(m.hue - 100)},${Math.round(m.hue + 40)},255`, a * 0.5);
    }
    ctx.restore();
  }

  function vignette(ctx: CanvasRenderingContext2D): void {
    const g = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.3, w / 2, h * 0.55, Math.max(w, h) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,6,0.65)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  return {
    resize(nw, nh, ndpr) {
      w = nw; h = nh; dpr = ndpr;
      build();
    },
    draw(ctx, t) {
      drawWater(ctx, t);
      drawSnow(ctx, t, 0);
      drawRidge(ctx, ridges[0]!);
      drawSnow(ctx, t, 1);
      drawRidge(ctx, ridges[1]!);
      drawMotes(ctx, t);
      drawRidge(ctx, ridges[2]!);
      drawPolyp(ctx, t);
      drawSnow(ctx, t, 2);
      vignette(ctx);
    },
  };
}
