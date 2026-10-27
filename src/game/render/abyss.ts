// The Silt Floor: the seamount at 4,000 m, marine snow, and the reef growing on it.
// Everything is generated from a seed; `draw` is a pure function of (view, t) so a given
// seed, state and time always render the same frame — screenshots rely on that.

import { mulberry32, range, type Rng } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import { glow } from './draw.ts';
import { createLife, type Stage } from './life.ts';
import { createReef, type ReefLayout } from './reef.ts';
import { createEffects, type Focus, type ReefView, type Scene } from './scene.ts';

type Flake = { x: number; y: number; r: number; speed: number; drift: number; phase: number; layer: number };
type Mote = { x: number; y: number; r: number; phase: number; period: number; hue: number };
type Ridge = { points: number[]; color: string };

/** The reef's height when the Silt Floor scene is fully grown (end of Act I). */
const FRAME_METRES = 60;

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

  const reef = createReef(reefSeed);
  const life = createLife(reefSeed ^ 0x9e3779b9);
  let bloom: Bloom | null = null;
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

  function layout(v: ReefView): ReefLayout {
    return {
      cx: centreX(), baseY: baseY(), unit: focus.h * 0.62, s: scale(), dpr,
      top: Math.min(1.05, v.height / FRAME_METRES), bandStep: 3 / FRAME_METRES,
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
    effect(kind) {
      effects.push(kind);
    },
    resize(nw, nh, ndpr, nfocus) {
      w = nw; h = nh; dpr = ndpr; focus = nfocus;
      build();
    },
    draw(ctx, t, v) {
      const st = stage();
      drawWater(ctx, t);
      drawSnow(ctx, t, 0);
      drawRidge(ctx, ridges[0]!);
      drawSnow(ctx, t, 1);
      life.drawBack(ctx, st, t);
      drawRidge(ctx, ridges[1]!);
      drawMotes(ctx, t, v);
      const vent = v.vent > 0 ? life.drawVent(ctx, st, v.vent, t) : null;
      drawRidge(ctx, ridges[2]!);
      life.drawFloor(ctx, st, t);
      const L = layout(v);
      reef.draw(ctx, L, v, t);
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
      life.drawFront(ctx, st, t);
      drawSnow(ctx, t, 2);
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      vignette(ctx);
    },
  };
}
