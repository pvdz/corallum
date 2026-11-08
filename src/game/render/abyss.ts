// The Silt Floor: the seamount at 4,000 m, marine snow, and the reef growing on it.
// Everything is generated from a seed; `draw` is a pure function of (view, t) so a given
// seed, state and time always render the same frame — screenshots rely on that.

import { sight, spot, startled, pushed } from './sightings.ts';
import { drawThorn } from './thorn.ts';
import { drawGarden, drawFence } from './works.ts';
import { mulberry32, range, type Rng } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import { drawDarkness, glow, speck } from './draw.ts';
import { createLife, type Stage } from './life.ts';
import { createGround } from './ground.ts';
import { createLayerCache } from './layer.ts';
import { createForeground } from './foreground.ts';
import { drawGhosts } from './ghosts.ts';
import { createReef, type ReefLayout } from './reef.ts';
import { createRuins, type RuinStyle } from './ruins.ts';
import { createShoals } from './shoals.ts';
import { createEffects, type Focus, type ReefView, type Scene } from './scene.ts';

type Flake = { x: number; y: number; r: number; speed: number; drift: number; phase: number; layer: number };
type Mote = { x: number; y: number; r: number; phase: number; period: number; hue: number };
type Ridge = { points: number[]; color: string };

/** The reef's height when the Silt Floor scene is fully grown (end of Act I). */
const FRAME_METRES = 60;

const RUINS: RuinStyle = {
  layers: [
    { top: 'rgb(15,24,54)', bottom: 'rgb(8,11,32)', rim: 'rgba(150,175,240,0.12)' },
    { top: 'rgb(20,30,66)', bottom: 'rgb(10,13,36)', rim: 'rgba(150,175,240,0.16)' },
  ],
  bands: '',
  lights: '',
};

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
  const ruins = createRuins(seed);
  const water = createLayerCache(0.5);
  const fore = createForeground(seed);

  const reef = createReef(reefSeed);
  const life = createLife(reefSeed ^ 0x9e3779b9);
  const shoals = createShoals(seed ^ 0x51);
  let bloom: Bloom | null = null;
  const ground = createGround(reefSeed ^ 0x51f7);
  const effects = createEffects();

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

  /** The nearest ridge's line at x (device pixels). */
  function floorY(x: number): number {
    return ridgeY(2, x);
  }

  /** Ridge `k`'s line at x (device pixels): 0 the farthest, 2 the nearest. */
  function ridgeY(k: number, x: number): number {
    const pts = ridges[k]!.points;
    const span = Math.max(w, focus.w * 1.6);
    const u = Math.min(1, Math.max(0, (x - (centreX() - span / 2)) / span)) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(u));
    return baseY() + (pts[i]! + (pts[i + 1]! - pts[i]!) * (u - i)) * focus.h;
  }

  /** The reef's own light lying on the silt around its foot: wider and brighter as it hosts more glow. */
  function drawLightPool(ctx: CanvasRenderingContext2D, v: ReefView, t: number): void {
    const k = Math.min(1, v.symbionts / 40) * (0.6 + 0.4 * v.glowLevel);
    if (k <= 0) return;
    const x = centreX(), y = floorY(x) + 10 * scale();
    const rx = focus.w * (0.14 + 0.16 * k), ry = Math.min(rx * 0.16, Math.max(8, h - y));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    const a = 0.32 * k * (0.92 + 0.08 * Math.sin(t * 0.7));
    g.addColorStop(0, `rgba(120,200,255,${a})`);
    g.addColorStop(0.5, `rgba(90,140,255,${a * 0.4})`);
    g.addColorStop(1, 'rgba(60,90,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
    ctx.restore();
  }

  /** The seamount being drawn (hard seamounts change the snow, the floor and the far water). */
  let sm = 'plain';
  /** Endings the line has reached: the Long Silt falls thinner with each (up to six). */
  let healed = 0;

  function drawSnow(ctx: CanvasRenderingContext2D, t: number, layer: number): void {
    ctx.fillStyle = ['rgba(170,190,230,0.35)', 'rgba(200,215,245,0.5)', 'rgba(225,235,255,0.6)'][layer]!;
    // Hungry water carries a third of the snow; buried water half again as much (drawn twice).
    const thin = sm === 'hungry' ? 3 : 1;
    for (const [i, f] of flakes.entries()) {
      if (f.layer !== layer || i % thin) continue;
      // Each ending of the line takes away a tenth of the flakes.
      if ((i * 7) % 10 < Math.min(6, healed)) continue;
      const y = ((f.y + t * f.speed) % 1) * (h + 20) - 10;
      const x0 = ((((f.x + Math.sin(t * 0.3 + f.phase) * 0.004 + t * f.drift * 0.002) % 1) + 1) % 1) * w;
      // A sweep nearby swirls the snow away from it.
      const [px, py] = pushed(x0, y, t, 110 * scale());
      const x = x0 + px;
      ctx.beginPath();
      ctx.arc(x, y + py, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * A benthic storm: every twelve minutes, for a minute, a deep current stirs the floor and a low
   * cloud of silt rolls across from left to right, streaked, hiding the far floor as it passes.
   */
  function drawBenthicStorm(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 720, length = 60;
    const p = (t + 180) % period;
    if (p > length) return;
    const s = scale();
    const k = p / length;
    const front = focus.x - focus.w * 0.4 + k * focus.w * 1.8;
    const fade = Math.min(1, p / 8, (length - p) / 10);
    const top = baseY() - focus.h * 0.28;
    ctx.save();
    const g = ctx.createLinearGradient(front - focus.w * 0.6, 0, front, 0);
    g.addColorStop(0, 'rgba(70,72,88,0)');
    g.addColorStop(0.7, `rgba(80,82,100,${0.6 * fade})`);
    g.addColorStop(1, 'rgba(80,82,100,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(front - focus.w * 0.6, baseY() + 20 * s);
    for (let i = 0; i <= 20; i++) {
      const x = front - focus.w * 0.6 + (i / 20) * focus.w * 0.6;
      ctx.lineTo(x, top + Math.sin(i * 1.3 + t * 0.6) * 14 * s + (1 - i / 20) * 30 * s);
    }
    ctx.lineTo(front, baseY() + 20 * s);
    ctx.closePath();
    ctx.fill();
    // Streaks of silt racing along the floor.
    ctx.strokeStyle = `rgba(170,175,200,${0.35 * fade})`;
    ctx.lineWidth = 1.2 * s;
    for (let i = 0; i < 30; i++) {
      const y = baseY() - ((i * 0.618) % 1) * focus.h * 0.25;
      const x = front - ((t * 0.4 + i * 0.37) % 1) * focus.w * 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 30 * s, y - 2 * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** A lonely seamount: one far light on the horizon, another reef too far away to reach. */
  function drawFarLamp(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    const x = focus.x + focus.w * 0.84, y = ridgeY(0, x) + 2 * s;
    const hgt = Math.min(focus.h * 0.14, 70 * s);
    const a = 0.45 + 0.2 * Math.sin(t * 0.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y - hgt * 0.55, 46 * s, '140,180,255', a * 0.5);
    ctx.restore();
    // The other reef itself, a shade paler than the far ridge it stands on: a trunk and a few
    // branches fanning out, too far off for any detail.
    ctx.strokeStyle = '#161c40';
    ctx.lineCap = 'round';
    const tips: [number, number][] = [];
    const limb = (x0: number, y0: number, ang: number, len: number, wid: number, depth: number) => {
      const ex = x0 + Math.sin(ang) * len, ey = y0 - Math.cos(ang) * len;
      ctx.lineWidth = Math.max(0.8, wid);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + Math.sin(ang * 0.5) * len * 0.5, y0 - len * 0.55, ex, ey);
      ctx.stroke();
      if (depth > 0) {
        limb(ex, ey, ang - 0.35, len * 0.55, wid * 0.65, depth - 1);
        limb(ex, ey, ang + 0.3, len * 0.6, wid * 0.65, depth - 1);
      } else tips.push([ex, ey]);
    };
    // A short trunk, then three limbs from it at different heights, each forking twice.
    limb(x, y + 2 * s, 0.05, hgt * 0.3, 3.4 * s, -1);
    tips.length = 0;
    const ty = y - hgt * 0.3;
    limb(x, ty, -0.55, hgt * 0.32, 2.4 * s, 1);
    limb(x, ty + 2 * s, 0.1, hgt * 0.38, 2.6 * s, 1);
    limb(x + 1 * s, ty + 4 * s, 0.65, hgt * 0.28, 2.2 * s, 1);
    // Its lights, each on a tip, waking and dimming out of step: someone else's reef, alive.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    tips.forEach(([tx, ty], i) => {
      const on = 0.5 + 0.5 * Math.sin(t * (0.5 + i * 0.13) + i * 2.1);
      glow(ctx, tx, ty, 5 * s, '170,205,255', 0.25 + 0.55 * on * a);
      glow(ctx, tx, ty, 1.6 * s, '230,240,255', 0.4 + 0.8 * on * a);
    });
    ctx.restore();
  }

  /** A buried seamount: pale drifts of silt heaped along the floor, smoking a little as they slump. */
  function drawDrifts(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    ctx.save();
    for (let k = 0; k < 7; k++) {
      const u = (k + 0.5) / 7 + Math.sin(k * 3.7) * 0.04;
      const x = focus.x + focus.w * u;
      if (Math.abs(x - centreX()) < focus.w * 0.12) continue;
      const y = floorY(x) + 2 * s;
      const rw = (60 + (k % 3) * 30) * s, rh = (16 + (k % 2) * 9) * s;
      // A drift's shape: steep on its lee side, a long tail on the other (alternating), its foot on
      // the floor; silt grey, a faint light along its crest and ripples laid along it.
      const lee = k % 2 ? 1 : -1;
      const N = 18;
      const top: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const f = (i / N) * 2 - 1;
        const shape = Math.max(0, 1 - f * f) * (f * lee > 0 ? 1 - 0.35 * f * lee : 1 + 0.2 * f * lee);
        top.push([x + f * rw, y - rh * shape]);
      }
      const g = ctx.createLinearGradient(0, y - rh, 0, y);
      g.addColorStop(0, 'rgba(128,132,154,0.85)');
      g.addColorStop(1, 'rgba(50,52,70,0.8)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(top[0]![0], y);
      for (const [px, py] of top) ctx.lineTo(px, py);
      ctx.lineTo(top[N]![0], y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,42,58,0.35)';
      ctx.lineWidth = Math.max(0.8, 0.8 * s);
      ctx.beginPath();
      for (let r = 1; r <= 3; r++) {
        const h = 1 - r / 4;
        for (let i = 2; i <= N - 2; i++) {
          const [px, py] = top[i]!;
          const yy = y - (y - py) * h + Math.sin(i * 1.3 + r) * 0.6 * s;
          if (i > 2) ctx.lineTo(px, yy);
          else ctx.moveTo(px, yy);
        }
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(190,196,220,0.3)';
      ctx.lineWidth = Math.max(0.8, 1 * s);
      ctx.beginPath();
      for (let i = 3; i <= N - 3; i++) { const [px, py] = top[i]!; if (i > 3) ctx.lineTo(px, py + 0.6 * s); else ctx.moveTo(px, py + 0.6 * s); }
      ctx.stroke();
      // A slump now and then: a soft cloud lifting off the crest.
      const ph = (t * 0.12 + k * 0.37) % 1;
      if (ph < 0.3) glow(ctx, x + rw * 0.2 * lee, y - rh - ph * 30 * s, rw * (0.35 + ph), '150,155,178', 0.35 * Math.sin((ph / 0.3) * Math.PI));
    }
    ctx.restore();
  }

  /** A warm seamount: a field of small black smokers along the floor, each trailing dark smoke. */
  function drawSmokers(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    sight('smokers');
    spot('smokers', focus.x + focus.w * 0.66, baseY() - 20 * s, 50 * s);
    // Touched, the nearest chimneys belch: a thick burst of smoke and a flare at the throat.
    const touch = startled('smokers', t);
    for (const [k, u] of [0.06, 0.12, 0.62, 0.7, 0.94].entries()) {
      const x = focus.x + focus.w * u, base = baseY() + 6 * s;
      const hgt = (34 + (k % 3) * 12) * s, wid = (7 + (k % 2) * 3) * s;
      // The chimney: stacked knobbly mineral, narrowing upward, each layer bulging its own way;
      // the taller ones with a small spire off one side. Dark grey-black, faintly banded.
      const cr = mulberry32(0x5e0 + k * 977);
      const layers = 7;
      const left: [number, number][] = [], right: [number, number][] = [];
      for (let i = 0; i <= layers; i++) {
        const f = i / layers, half = wid * (1 - 0.55 * f), yy = base - hgt * f;
        left.push([x - half - range(cr, 0, 2.2) * s * (1 - f * 0.5), yy]);
        right.push([x + half + range(cr, 0, 2.2) * s * (1 - f * 0.5), yy]);
      }
      const body = ctx.createLinearGradient(x - wid, 0, x + wid, 0);
      body.addColorStop(0, '#2c2228');
      body.addColorStop(0.55, '#40323a');
      body.addColorStop(1, '#241c22');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(left[0]![0], left[0]![1]);
      for (let i = 1; i <= layers; i++) {
        const [px, py] = left[i - 1]!, [qx, qy] = left[i]!;
        ctx.quadraticCurveTo(Math.min(px, qx) - 1.4 * s, (py + qy) / 2, qx, qy);
      }
      for (let i = layers; i >= 1; i--) {
        const [px, py] = right[i]!, [qx, qy] = right[i - 1]!;
        ctx.quadraticCurveTo(Math.max(px, qx) + 1.4 * s, (py + qy) / 2, qx, qy);
      }
      ctx.closePath();
      ctx.fill();
      if (k % 3 === 2) {
        const sy = base - hgt * 0.45, sd = k % 2 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(x + sd * wid * 0.55, sy + 4 * s);
        ctx.quadraticCurveTo(x + sd * wid * 1.3, sy, x + sd * wid * 1.25, sy - 9 * s);
        ctx.lineTo(x + sd * wid * 0.95, sy - 9 * s);
        ctx.quadraticCurveTo(x + sd * wid * 0.9, sy - 2 * s, x + sd * wid * 0.4, sy - 2 * s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(150,120,110,0.16)';
      ctx.lineWidth = Math.max(0.6, 0.7 * s);
      ctx.beginPath();
      for (let i = 1; i < layers; i++) {
        const [lx, ly] = left[i]!, [rx2] = right[i]!;
        ctx.moveTo(lx + 1 * s, ly);
        ctx.quadraticCurveTo(x, ly + 1.2 * s, rx2 - 1 * s, ly);
      }
      ctx.stroke();
      // Sulphide streaks, pale yellow, running down from the throat where the mineral seeps out.
      ctx.strokeStyle = 'rgba(214,190,120,0.22)';
      ctx.lineWidth = Math.max(0.6, 0.6 * s);
      ctx.beginPath();
      for (let m = 0; m < 2; m++) {
        const top = right[layers]!, fx = x + (m ? 0.35 : -0.3) * wid * 0.6;
        ctx.moveTo(fx, top[1] + 1 * s);
        ctx.quadraticCurveTo(fx + (m ? 1 : -1) * 1.5 * s, base - hgt * 0.7, fx + (m ? 2 : -2) * s, base - hgt * (0.45 + 0.1 * m));
      }
      ctx.stroke();
      // The throat: a lip of hot mineral round the opening.
      const [tlx, tly] = left[layers]!, [trx] = right[layers]!;
      ctx.strokeStyle = 'rgba(255,140,70,0.55)';
      ctx.lineWidth = Math.max(0.8, 1.1 * s);
      ctx.beginPath();
      ctx.ellipse(x, tly, (trx - tlx) / 2, 1.2 * s, 0, Math.PI, Math.PI * 2);
      ctx.stroke();
      // Pale mats of bacteria on the warm ground at its foot.
      ctx.fillStyle = 'rgba(206,200,182,0.32)';
      ctx.beginPath();
      for (let m = 0; m < 4; m++) {
        const mx = x + range(cr, -1.6, 1.6) * wid, mw = range(cr, 2, 4.5) * s;
        ctx.moveTo(mx + mw, base - 0.5 * s);
        ctx.ellipse(mx, base - 0.5 * s, mw, mw * 0.35, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      // Smoke: soft dark billows rising from the throat, spreading and thinning as they go (the
      // glow sprite's falloff, drawn dark over the water, not added to it).
      // A shade lighter than the water, so the plume stands out from it as it spreads.
      for (let p = 0; p < 9; p++) {
        const q = ((t * 0.12 + p / 9 + k * 0.3) % 1);
        glow(ctx, x + Math.sin(t * 0.8 + p * 1.7 + k) * 5 * s * q, base - hgt - 2 * s - q * 75 * s, (4 + q * 15) * s, '46,38,48', 0.8 * (1 - q) * Math.min(1, q * 6));
      }
      // The heat lights the plume's root from below: warm where it leaves the throat.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let p = 0; p < 9; p++) {
        const q = ((t * 0.12 + p / 9 + k * 0.3) % 1);
        if (q > 0.35) continue;
        glow(ctx, x + Math.sin(t * 0.8 + p * 1.7 + k) * 5 * s * q, base - hgt - 2 * s - q * 75 * s, (4 + q * 15) * s, '255,110,50', 0.16 * (1 - q / 0.35));
      }
      ctx.restore();
      const belch = touch && touch.age < 4 && Math.abs(touch.x - x) < focus.w * 0.12 ? touch.age : -1;
      if (belch >= 0) {
        for (let p = 0; p < 6; p++) {
          const q = Math.min(1, belch / 3 + p * 0.05);
          glow(ctx, x + Math.sin(p * 2.3) * 8 * s * q, base - hgt - q * 90 * s - p * 4 * s, (9 + q * 26) * s, '24,18,28', 0.9 * (1 - q));
        }
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const flare = belch >= 0 ? 0.6 * Math.max(0, 1 - belch) : 0;
      glow(ctx, x, base - hgt, 12 * s, '255,120,60', 0.34 + 0.1 * Math.sin(t * 2 + k) + flare);
      // A small white-hot core, flickering.
      glow(ctx, x, base - hgt - 0.5 * s, 3 * s, '255,210,150', 0.5 + 0.2 * Math.sin(t * 7 + k * 2) + flare);
      ctx.restore();
    }
  }

  /**
   * A cold seamount: a brine pool on the floor, a little lake of heavy salt water with a
   * shimmering surface, edged with a ring of dark mussels.
   */
  function drawBrinePool(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    const x = focus.x + focus.w * 0.41, y = baseY() + 12 * s;
    const rx = 48 * s, ry = 7 * s;
    sight('brine-pool');
    spot('brine-pool', x, y, rx);
    // An uneven shore, not an ellipse: the edge wanders a little in and out.
    const N = 36;
    const edge = (k: number): [number, number] => {
      const a = (k / N) * Math.PI * 2;
      const w = 1 + 0.07 * Math.sin(a * 3 + 1.2) + 0.04 * Math.sin(a * 5 + 0.4);
      return [x + Math.cos(a) * rx * w, y + Math.sin(a) * ry * w];
    };
    // Mussels crowd the shore in a dense bank, two staggered rows of dark shells, each with a pale
    // lip; those on the far shore stand behind the brine, the near ones in front of it.
    const mr = mulberry32(0xb21e);
    const mussels: { x: number; y: number; r: number; a: number; front: boolean }[] = [];
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2 + range(mr, -0.04, 0.04);
      const row = k % 2;
      const out = 1.02 + row * 0.12 + range(mr, 0, 0.06);
      mussels.push({ x: x + Math.cos(a) * rx * out, y: y + Math.sin(a) * ry * (out + 0.35 * row) - row * 0.8 * s, r: range(mr, 2.6, 4.2) * s * (Math.sin(a) > 0 ? 1.15 : 0.85), a: a + range(mr, -0.6, 0.6), front: Math.sin(a) > 0 });
    }
    const drawMussels = (front: boolean) => {
      const shells = new Path2D(), lips = new Path2D();
      for (const m of mussels) {
        if (m.front !== front) continue;
        shells.moveTo(m.x + Math.cos(m.a) * m.r, m.y + Math.sin(m.a) * m.r * 0.6);
        shells.ellipse(m.x, m.y, m.r, m.r * 0.52, m.a, 0, Math.PI * 2);
        lips.moveTo(m.x - Math.cos(m.a) * m.r * 0.8, m.y - Math.sin(m.a) * m.r * 0.8 * 0.52 - 0.6 * s);
        lips.lineTo(m.x + Math.cos(m.a) * m.r * 0.8, m.y + Math.sin(m.a) * m.r * 0.8 * 0.52 - 0.6 * s);
      }
      ctx.fillStyle = '#221e2e';
      ctx.fill(shells);
      ctx.strokeStyle = 'rgba(170,160,196,0.35)';
      ctx.lineWidth = Math.max(0.6, 0.6 * s);
      ctx.stroke(lips);
    };
    drawMussels(false);
    // The brine: heavier than the sea, so its surface lies flat and sharp, dark below and catching
    // the reef's light along its far edge, a soft sheen across it.
    const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
    g.addColorStop(0, 'rgba(110,140,196,0.62)');
    g.addColorStop(1, 'rgba(22,34,72,0.88)');
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let k = 0; k <= N; k++) { const [px, py] = edge(k); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(205,224,255,0.5)';
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    for (let k = Math.round(N * 0.53); k <= Math.round(N * 0.97); k++) { const [px, py] = edge(k); if (k > Math.round(N * 0.53)) ctx.lineTo(px, py + 0.6 * s); else ctx.moveTo(px, py + 0.6 * s); }
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(150,180,230,0.08)';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.15, y - ry * 0.25, rx * 0.55, ry * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // The surface: slow ripples of light across the brine.
    ctx.strokeStyle = 'rgba(210,230,255,0.3)';
    ctx.lineWidth = 1 * s;
    for (let k = 0; k < 4; k++) {
      const u = ((t * 0.08 + k * 0.25) % 1);
      ctx.beginPath();
      ctx.ellipse(x, y, rx * (0.2 + 0.7 * u), ry * (0.2 + 0.7 * u), 0, Math.PI * 1.05, Math.PI * 1.95);
      ctx.globalAlpha = 1 - u;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Touched, rings run out across the heavy brine from where the touch fell.
    const touch = startled('brine-pool', t);
    if (touch && touch.age < 3) {
      for (let k = 0; k < 3; k++) {
        const a = touch.age - k * 0.35;
        if (a < 0) continue;
        const rr = a * 30 * s;
        ctx.strokeStyle = `rgba(220,240,255,${0.5 * Math.max(0, 1 - a / 2.5)})`;
        ctx.beginPath();
        ctx.ellipse(touch.x, y, Math.min(rr, rx), Math.min(rr, rx) * (ry / rx), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    drawMussels(true);
  }

  /**
   * A crowded seamount: half-buried old reefs all around, grey humps of dead branches poking out
   * of the silt, with a few lights still glowing in them.
   */
  /** The buried reefs never move: drawn once per frame size into a strip along the floor. */
  let buriedCache: HTMLCanvasElement | OffscreenCanvas | null = null;
  let buriedKey = '';
  let buriedTop = 0;
  /** Each mound's old light: x, y, radius. */
  let buriedLights: number[] = [];
  function drawBuriedReefs(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    const key = `${w}x${h} ${focus.x},${focus.y},${focus.w},${focus.h} ${baseY()}`;
    if (!buriedCache || key !== buriedKey) {
      buriedKey = key;
      buriedTop = Math.floor(baseY() - 90 * s);
      const ch = Math.max(1, Math.ceil(120 * s));
      if (!buriedCache || buriedCache.width !== w || buriedCache.height !== ch) {
        buriedCache = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.max(1, w), ch) : document.createElement('canvas');
        buriedCache.width = Math.max(1, w);
        buriedCache.height = ch;
      }
      const c = buriedCache.getContext('2d') as CanvasRenderingContext2D;
      c.clearRect(0, 0, buriedCache.width, buriedCache.height);
      c.save();
      c.translate(0, -buriedTop);
      buriedLights = drawBuriedStatic(c, s);
      c.restore();
    }
    ctx.drawImage(buriedCache, 0, buriedTop);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0, k = 0; i < buriedLights.length; i += 3, k++) {
      glow(ctx, buriedLights[i]!, buriedLights[i + 1]!, buriedLights[i + 2]!, '170,190,255', 0.25 + 0.15 * Math.sin(t * 0.7 + k));
    }
    ctx.restore();
  }

  /** The mounds and their dead coral (see drawBuriedReefs); returns each mound's light (x, y, radius). */
  function drawBuriedStatic(ctx: CanvasRenderingContext2D, s: number): number[] {
    const r = mulberry32(seed ^ 0xb0b);
    const lights: number[] = [];
    ctx.lineCap = 'round';
    for (let k = 0; k < 6; k++) {
      const u = k < 3 ? 0.04 + k * 0.1 + r() * 0.04 : 0.68 + (k - 3) * 0.1 + r() * 0.04;
      const x = focus.x + focus.w * u, y = baseY() + (6 + r() * 6) * s;
      const wdt = (40 + r() * 34) * s, hgt = (20 + r() * 18) * s;
      // Dead branches first, so the silt mound buries their feet: forked, tapering, bent a little,
      // some broken off short; the old stone pale grey, dust lying along their upper edges.
      const twigs: number[] = [];
      for (let b = 0; b < 5; b++) {
        const bx = x + (b - 2) * wdt * 0.3 + (r() - 0.5) * 6 * s;
        const by = y - hgt * (0.8 - 0.14 * Math.abs(b - 2));
        const len = (12 + r() * 18) * s, lean = (r() - 0.5) * 0.7, w0 = (1.6 + r() * 1.4) * s;
        const ex = bx + Math.sin(lean) * len, ey = by - Math.cos(lean) * len;
        twigs.push(bx, by, (bx + ex) / 2 + (r() - 0.5) * 5 * s, (by + ey) / 2, ex, ey, w0);
        // A fork two thirds up, splaying away from the lean, shorter and thinner.
        if (r() < 0.7) {
          const fx = bx + (ex - bx) * 0.6, fy = by + (ey - by) * 0.6, fl = len * (0.35 + r() * 0.25);
          const fa = lean + (lean > 0 ? -1 : 1) * (0.5 + r() * 0.4);
          const gx = fx + Math.sin(fa) * fl, gy = fy - Math.cos(fa) * fl;
          twigs.push(fx, fy, (fx + gx) / 2, (fy + gy) / 2 - 1 * s, gx, gy, w0 * 0.6);
        }
      }
      for (let pass = 0; pass < 3; pass++) {
        // The dark side, the stone, then dust on top (offset up and to the light).
        ctx.strokeStyle = pass === 0 ? '#22213a' : pass === 1 ? '#4a4864' : 'rgba(170,168,196,0.35)';
        for (let i = 0; i < twigs.length; i += 7) {
          const w = twigs[i + 6]! * (pass === 0 ? 1.35 : pass === 1 ? 1 : 0.45), off = pass === 2 ? -0.5 * twigs[i + 6]! : 0;
          // Tapered: a thick lower half, a thin upper one.
          for (const [a, b, ww] of [[0, 0.55, w], [0.45, 1, w * 0.6]] as const) {
            const P = (f: number, o: number) => { const g = 1 - f; return twigs[i + o]! * g * g + 2 * twigs[i + o + 2]! * g * f + twigs[i + o + 4]! * f * f; };
            ctx.lineWidth = Math.max(0.6, ww);
            ctx.beginPath();
            ctx.moveTo(P(a, 0) + off * 0.3, P(a, 1) + off);
            ctx.quadraticCurveTo(P((a + b) / 2, 0) + off * 0.3, P((a + b) / 2, 1) + off, P(b, 0) + off * 0.3, P(b, 1) + off);
            ctx.stroke();
          }
        }
      }
      // Empty polyp cups along the stone, and the broken ends' paler cores.
      ctx.fillStyle = '#2a2944';
      ctx.beginPath();
      for (let i = 0; i < twigs.length; i += 7) {
        for (const f of [0.35, 0.7]) {
          const g = 1 - f, cx = twigs[i]! * g * g + 2 * twigs[i + 2]! * g * f + twigs[i + 4]! * f * f;
          const cy = twigs[i + 1]! * g * g + 2 * twigs[i + 3]! * g * f + twigs[i + 5]! * f * f, cr = twigs[i + 6]! * 0.3;
          ctx.moveTo(cx + cr, cy);
          ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        }
      }
      ctx.fill();
      ctx.fillStyle = 'rgba(190,186,210,0.45)';
      ctx.beginPath();
      for (let i = 0; i < twigs.length; i += 7) {
        const cr = twigs[i + 6]! * 0.32;
        ctx.moveTo(twigs[i + 4]! + cr, twigs[i + 5]!);
        ctx.arc(twigs[i + 4]!, twigs[i + 5]!, cr, 0, Math.PI * 2);
      }
      ctx.fill();
      // The mound: silt heaped over the old reef, uneven along its top, pale where the snow lies.
      const mound = ctx.createLinearGradient(0, y - hgt, 0, y);
      mound.addColorStop(0, '#3e3c5a');
      mound.addColorStop(1, '#23223a');
      ctx.fillStyle = mound;
      ctx.beginPath();
      ctx.moveTo(x - wdt, y);
      const N = 20;
      for (let e = 0; e <= N; e++) {
        const a = Math.PI * (1 - e / N);
        const bump = 1 + 0.08 * Math.sin(e * 1.15 + k * 1.7);
        ctx.lineTo(x + Math.cos(a) * wdt, y - Math.sin(a) * hgt * 0.95 * bump);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,158,190,0.22)';
      ctx.lineWidth = Math.max(0.6, 0.9 * s);
      ctx.beginPath();
      for (let e = 4; e <= N - 4; e++) {
        const a = Math.PI * (1 - e / N);
        const bump = 1 + 0.08 * Math.sin(e * 1.15 + k * 1.7);
        const px = x + Math.cos(a) * wdt, py = y - Math.sin(a) * hgt * 0.95 * bump + 0.8 * s;
        if (e === 4) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
      lights.push(x + (r() - 0.5) * wdt, y - hgt * 0.5, 6 * s);
    }
    return lights;
  }

  /**
   * A flurry of the Long Silt: for half a minute in every four the snow thickens, a dense second
   * fall slanting through the water (the same flakes, drawn again offset and faster).
   * `on`: a flurry is falling now (the sim's clock, so sweeps and snow agree).
   */
  function drawFlurry(ctx: CanvasRenderingContext2D, t: number, on: boolean): void {
    // On a buried seamount the Long Silt never stops: the flurry is always falling.
    if (!on && sm !== 'buried') return;
    const k = sm === 'buried' && !on ? 0.75 : 1;
    ctx.save();
    ctx.globalAlpha = 0.85 * k;
    ctx.fillStyle = 'rgba(220,228,250,0.8)';
    // Twice over, offset: a thick slanting fall.
    for (const off of [0.37, 0.71]) {
      for (const f of flakes) {
        const y = ((f.y + off + t * f.speed * 2.6) % 1) * (h + 20) - 10;
        const x = ((((f.x + off + t * 0.012) % 1) + 1) % 1) * w;
        speck(ctx, x, y, f.r * 1.8);
      }
    }
    ctx.restore();
  }

  function layout(v: ReefView): ReefLayout {
    return {
      cx: centreX(), baseY: baseY(), unit: Math.min(focus.h * 0.62, focus.w * 1.5), s: scale(), dpr,
      top: Math.min(1.05, v.height / FRAME_METRES), bandStep: 3 / FRAME_METRES, grains: v.grains,
    };
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

  function stage(): Stage {
    return { cx: centreX(), baseY: baseY(), w: focus.w, h: focus.h, s: scale(), dpr };
  }

  return {
    bloomStrength: 0.55,
    crownAt: [0, 0] as [number, number],
    effect(kind) {
      effects.push(kind);
    },
    resize(nw, nh, ndpr, nfocus) {
      w = nw; h = nh; dpr = ndpr; focus = nfocus;
      build();
    },
    draw(ctx, t, v) {
      const st = stage();
      sm = v.seamount;
      healed = v.endings;
      // Water, the far ripple and the faint shafts change slowly: a half-resolution cache.
      water.draw(ctx, w, h, t, 0.2, `${w}x${h}`, (c, tq) => drawWater(c, tq));
      // A silent seamount has no old reefs under it: no ruins in the far water.
      if (v.seamount !== 'silent' && v.seamount !== 'lonely') ruins.draw(ctx, w, h, focus, v.height, RUINS, t, [0, 1]);
      drawSnow(ctx, t, 0);
      drawRidge(ctx, ridges[0]!);
      if (v.seamount === 'lonely') drawFarLamp(ctx, t);
      drawSnow(ctx, t, 1);
      life.drawBack(ctx, st, t);
      drawRidge(ctx, ridges[1]!);
      drawMotes(ctx, t, v);
      if (v.seamount === 'crowded') drawBuriedReefs(ctx, t);
      drawGarden(ctx, centreX(), v.works.garden, scale(), t, floorY);
      drawFence(ctx, centreX(), baseY() + 6 * scale(), v.works.fence, scale());
      const vent = v.vent > 0 ? life.drawVent(ctx, st, v.vent, t) : null;
      // Heat shimmer over the vent: faint wavering bands of warmer water rising from the chimneys.
      if (vent) {
        const sc = scale();
        ctx.save();
        ctx.lineWidth = 1.4 * sc;
        for (let i = 0; i < 9; i++) {
          const u = (t * 0.18 + i / 9) % 1;
          const y = vent.y - u * focus.h * 0.35;
          ctx.strokeStyle = `rgba(255,190,150,${0.12 * Math.sin(u * Math.PI)})`;
          ctx.beginPath();
          for (let k = -6; k <= 6; k++) {
            const x = vent.x + k * 4 * sc * (1 + u * 2) + Math.sin(t * 2 + i + k * 0.7) * 3 * sc;
            const yy = y + Math.sin(t * 3 + k * 0.9 + i) * 2.5 * sc;
            if (k === -6) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      // The vent crack (a moment): left open it glows and smokes; grown over, a pale patch of new stone.
      if (vent && v.moments['vent-crack']) {
        const sc = scale();
        ctx.save();
        if (v.moments['vent-crack'] === 'b') {
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = `rgba(255,140,70,${0.6 + 0.2 * Math.sin(t * 2)})`;
          ctx.lineWidth = 2 * sc;
          ctx.beginPath();
          ctx.moveTo(vent.x - 4 * sc, vent.y + 14 * sc);
          ctx.lineTo(vent.x + 4 * sc, vent.y + 30 * sc);
          ctx.lineTo(vent.x - 3 * sc, vent.y + 46 * sc);
          ctx.lineTo(vent.x + 5 * sc, vent.y + 64 * sc);
          ctx.stroke();
          glow(ctx, vent.x, vent.y + 40 * sc, 22 * sc, '255,120,60', 0.35);
        } else {
          ctx.fillStyle = 'rgba(200,190,210,0.35)';
          ctx.beginPath();
          ctx.ellipse(vent.x, vent.y + 40 * sc, 6 * sc, 16 * sc, 0.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      drawRidge(ctx, ridges[2]!);
      ground.draw(ctx, w, Math.min(h, focus.y + focus.h), scale(), floorY, { light: '150,160,215', dark: '0,0,8', alpha: 0.9, tracks: true },
        `${w}x${h}:${focus.x},${focus.y},${focus.w},${focus.h}`);
      drawLightPool(ctx, v, t);
      if (v.seamount === 'cold') drawBrinePool(ctx, t);
      if (v.seamount === 'buried') drawDrifts(ctx, t);
      if (v.seamount === 'warm') drawSmokers(ctx, t);
      life.drawFloor(ctx, st, t);
      const L = layout(v);
      if (v.shoals > 0) shoals.drawBack(ctx, focus, reef, L, v, t);
      // A new reef's first seconds: the larva that will become it drifts down and settles.
      if (v.age < 9 && v.polyps === 0) {
        const k = Math.min(1, v.age / 7), s = scale();
        const x = L.cx + Math.sin(v.age * 1.3) * 30 * s * (1 - k), y = focus.y + focus.h * 0.1 + (L.baseY - focus.y - focus.h * 0.1) * (1 - (1 - k) ** 2);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, x, y, 22 * s, '255,190,210', 0.5 * (1 - Math.max(0, k - 0.8) * 5));
        glow(ctx, x, y, 4 * s, '255,235,240', 0.95);
        ctx.restore();
      }
      reef.draw(ctx, L, v, t);
      if (v.thorn?.kind === 'drill-snail') drawThorn(ctx, reef, L, v.thorn.u, v.thorn.side, t, 'drill-snail');
      this.crownAt = reef.crown(L);
      const live = effects.live(t);
      reef.drawEffects(ctx, L, v, live);
      const flare = live.find((e) => e.kind === 'vent');
      if (flare && vent) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const k = flare.age / 2.2;
        glow(ctx, vent.x, vent.y, (40 + 140 * k) * scale(), '255,150,80', 0.6 * (1 - k));
        ctx.restore();
      }
      if (v.shoals > 0) shoals.drawFront(ctx, focus, reef, L, v, t);
      life.drawFront(ctx, st, t);
      drawSnow(ctx, t, 2);
      drawFlurry(ctx, t, v.flurry);
      drawBenthicStorm(ctx, t);
      drawGhosts(ctx, focus, v.ancestors, v.height, t, scale(), 'rgba(160,170,220,1)');
      // A warm seamount reddens the water near the floor; a cold one leaves a faint ice-blue.
      // Hungry water is pale and washed out; silent water darker, dark water darker still.
      const tint = { warm: 'rgba(255,90,40,0.10)', cold: 'rgba(150,210,255,0.09)', hungry: 'rgba(120,130,140,0.10)' }[v.seamount as 'warm'];
      if (v.seamount === 'silent' || v.seamount === 'dark') {
        ctx.fillStyle = v.seamount === 'dark' ? 'rgba(0,0,6,0.4)' : 'rgba(0,0,6,0.22)';
        ctx.fillRect(0, 0, w, h);
      }
      if (tint) {
        const g = ctx.createLinearGradient(0, h * 0.45, 0, h);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, tint);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
      }
      // The reef's light holds back the dark: the more glow, the wider the lit water round it.
      {
        const [dcx, dcy] = reef.crown(L);
        drawDarkness(ctx, dcx, dcy - L.unit * 0.1, Math.max(focus.w, focus.h) * (0.32 + 0.3 * v.glowLevel + 0.5 * Math.max(0, 1 - v.sinceFlare / 5)), 0.42);
      }
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      fore.draw(ctx, focus, t, '4,6,18', 0.9, '170,140,255');
      vignette(ctx);
    },
  };
}
