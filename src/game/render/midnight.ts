// The Midnight Water (Act II): black water with lights in it. The reef's upper growth rises
// out of the bottom of the frame; lanternfish shoals show what job each is doing — feeders
// circle the reef herding plankton, light-swimmers spiral above the crown, scouts dive into
// the dark below. Glass shrimp and a passing siphonophore appear once their bands are laid.

import { sight } from './sightings.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import { glow } from './draw.ts';
import { createLayerCache } from './layer.ts';
import { createReef, type ReefLayout } from './reef.ts';
import { createRuins, type RuinStyle } from './ruins.ts';
import { createShoals } from './shoals.ts';
import { drawShrimp } from './shrimp.ts';
import { createEffects, type Focus, type ReefView, type Scene } from './scene.ts';

const FROM = 60;
const TO = 3000;

const RUINS: RuinStyle = {
  layers: [
    { top: 'rgb(10,14,38)', bottom: 'rgb(3,4,13)', rim: 'rgba(110,140,220,0.14)' },
    { top: 'rgb(15,19,48)', bottom: 'rgb(5,6,18)', rim: 'rgba(120,150,230,0.2)' },
    { top: 'rgb(20,24,58)', bottom: 'rgb(7,8,24)', rim: 'rgba(130,160,240,0.26)' },
  ],
  bands: 'rgba(120,150,230,0.05)',
  lights: '120,200,255',
};

type Flash = { x: number; y: number; period: number; phase: number; hue: number; r: number };
type Flake = { x: number; y: number; r: number; speed: number; phase: number };
type Comb = { x: number; y: number; size: number; phase: number; drift: number; tilt: number };

export function createMidnightScene(seed: number): Scene {
  const rng = mulberry32(seed ^ 0x2f6b1d3);
  let w = 1, h = 1, dpr = 1;
  let focus: Focus = { x: 0, y: 0, w: 1, h: 1 };
  const reef = createReef(Math.floor(rng() * 1e9));
  const effects = createEffects();
  let bloom: Bloom | null = null;
  const flashes: Flash[] = Array.from({ length: 34 }, () => ({
    x: rng(), y: range(rng, 0.03, 0.8), period: range(rng, 5, 19), phase: rng() * 20,
    hue: rng() < 0.7 ? range(rng, 180, 215) : range(rng, 120, 150), r: range(rng, 0.6, 1.6),
  }));
  let flakes: Flake[] = [];
  const flakeSeed = Math.floor(rng() * 1e9);
  const shoals = createShoals(seed);
  const ruins = createRuins(seed);
  const water = createLayerCache(0.5);

  const combs: Comb[] = Array.from({ length: 3 }, (_, i) => ({
    x: [-0.32, 0.3, 0.05][i]! + range(rng, -0.03, 0.03), y: [0.2, 0.32, 0.08][i]! + range(rng, -0.03, 0.03),
    size: [1.7, 1.25, 0.9][i]!, phase: rng() * 10, drift: range(rng, -1, 1), tilt: range(rng, -0.4, 0.4),
  }));

  const scale = () => Math.min(focus.w, focus.h) / 700;

  /** Glass shrimp swimming across the frame. */
  function swimShrimp(ctx: CanvasRenderingContext2D, t: number, i: number): void {
    sight('glass-shrimp');
    const s = scale() * (1.1 + (i % 2) * 0.4);
    const period = 60 + i * 17;
    const u = ((t + i * 23) % period) / period;
    const dir = i % 2 ? 1 : -1;
    const x = focus.x + focus.w * (dir > 0 ? -0.1 + u * 1.2 : 1.1 - u * 1.2);
    const y = focus.y + focus.h * (0.25 + 0.12 * i) + Math.sin(t * 0.7 + i) * 12 * s;
    drawShrimp(ctx, x, y, s, dir, t, i);
  }

  /**
   * An anglerfish drifting through the dark every few minutes: a black body you can barely see,
   * a mouth of needle teeth, and the lure on its head pulsing like the reef's own light.
   */
  function drawAngler(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 170, crossing = 70;
    const u = (t % period) / crossing;
    if (u >= 1) return;
    sight('anglerfish');
    const lap = Math.floor(t / period);
    const dir = lap % 2 ? 1 : -1;
    const s = scale() * 1.5;
    const x = focus.x + focus.w * (dir > 0 ? -0.1 + u * 1.2 : 1.1 - u * 1.2);
    const y = focus.y + focus.h * (0.2 + 0.06 * Math.sin(lap * 1.7)) + Math.sin(t * 0.4) * 8 * s;
    const pulse = 0.6 + 0.4 * Math.sin(t * 2.4);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    // Body: a dark lumpy oval, lit faintly from its own lure.
    const body = ctx.createRadialGradient(18 * s, -10 * s, 0, 0, 0, 34 * s);
    body.addColorStop(0, 'rgba(85,95,140,0.7)');
    body.addColorStop(1, 'rgba(14,16,36,0.92)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(26 * s, -4 * s);
    ctx.bezierCurveTo(24 * s, -22 * s, -14 * s, -24 * s, -24 * s, -6 * s);
    ctx.lineTo(-38 * s, -14 * s + Math.sin(t * 3) * 3 * s);
    ctx.lineTo(-36 * s, 10 * s + Math.sin(t * 3) * 3 * s);
    ctx.lineTo(-22 * s, 8 * s);
    ctx.bezierCurveTo(-10 * s, 22 * s, 20 * s, 20 * s, 28 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    // Teeth along the open jaw.
    ctx.strokeStyle = 'rgba(220,225,240,0.6)';
    ctx.lineWidth = 0.8 * s;
    for (let k = 0; k < 6; k++) {
      const tx = 26 * s - k * 3.2 * s;
      ctx.beginPath();
      ctx.moveTo(tx, -1 * s);
      ctx.lineTo(tx - 1 * s, 4 * s);
      ctx.moveTo(tx - 1.5 * s, 9 * s);
      ctx.lineTo(tx - 2 * s, 4.5 * s);
      ctx.stroke();
    }
    // The rod and its bulb.
    ctx.strokeStyle = 'rgba(80,90,130,0.7)';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(10 * s, -19 * s);
    ctx.quadraticCurveTo(26 * s, -42 * s, 40 * s, -30 * s);
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 40 * s, -30 * s, 18 * s, '150,240,255', 0.55 * pulse);
    glow(ctx, 40 * s, -30 * s, 4 * s, '230,255,255', 0.9);
    ctx.restore();
  }

  /**
   * The seamount's flank below the reef: a dark shoulder of rock along the bottom of the frame,
   * sinking away as the reef climbs (it is fully in view only early in the Midnight Water).
   */
  function drawFlank(ctx: CanvasRenderingContext2D, p: number): void {
    const sink = p * focus.h * 0.25;
    const base = focus.y + focus.h * 0.9 + sink;
    if (base > h + 20) return;
    const r = mulberry32(seed ^ 0xf1a);
    ctx.beginPath();
    ctx.moveTo(0, h);
    const n = 30;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      // A shoulder that peaks under the reef and falls away to both sides, with rough rock.
      const peak = Math.exp(-((u - 0.5) ** 2) / 0.08);
      const y = base - peak * focus.h * 0.08 + range(r, -1, 1) * focus.h * 0.008;
      ctx.lineTo(focus.x + u * focus.w * 1.05, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, base - focus.h * 0.1, 0, h);
    g.addColorStop(0, '#0a0c1e');
    g.addColorStop(1, '#020208');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,130,210,0.18)';
    ctx.lineWidth = 1.2 * dpr;
    ctx.stroke();
  }

  /** Comb jellies: glassy ovals whose eight comb rows ripple with travelling rainbow light. */
  function drawComb(ctx: CanvasRenderingContext2D, c: Comb, t: number): void {
    sight('comb-jelly');
    const s = scale() * c.size;
    const x = focus.x + focus.w * (0.5 + c.x + Math.sin(t * 0.03 + c.phase) * 0.04);
    const y = focus.y + focus.h * (c.y + Math.sin(t * 0.05 + c.phase * 2) * 0.03);
    const rx = 16 * s, ry = 26 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(c.tilt + Math.sin(t * 0.2 + c.phase) * 0.1);
    const body = ctx.createRadialGradient(0, -ry * 0.3, 0, 0, 0, ry);
    body.addColorStop(0, 'rgba(200,220,255,0.10)');
    body.addColorStop(1, 'rgba(150,180,255,0.03)');
    ctx.fillStyle = body;
    ctx.strokeStyle = 'rgba(200,220,255,0.18)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    for (let row = 0; row < 8; row++) {
      const ax = Math.sin((row / 8) * Math.PI * 2) * rx * 0.85;
      const bow = Math.cos((row / 8) * Math.PI * 2);
      if (bow < -0.3) continue;
      for (let q = 0; q < 9; q++) {
        const f = q / 8 - 0.5;
        const py = f * ry * 1.7;
        const px = ax * Math.sqrt(Math.max(0, 1 - (py / ry) ** 2));
        const hue = (t * 120 + q * 40 + row * 25) % 360;
        const a = (0.25 + 0.35 * Math.max(0, Math.sin(t * 4 - q * 0.8 + row))) * (0.5 + 0.5 * bow);
        ctx.fillStyle = `hsla(${hue},100%,70%,${a})`;
        ctx.fillRect(px - 1.1 * s, py - 1.1 * s, 2.2 * s, 2.2 * s);
      }
    }
    ctx.restore();
  }
  const cx = () => focus.x + focus.w * 0.5;

  function progress(height: number): number {
    if (height <= FROM) return 0;
    return Math.min(1, Math.log(height / FROM) / Math.log(TO / FROM));
  }

  function layout(v: ReefView): ReefLayout {
    return {
      cx: cx(), baseY: focus.y + focus.h * 1.04, unit: focus.h * 0.8, s: scale(), dpr,
      top: 0.4 + 0.6 * progress(v.height), bandStep: 0,
      encrust: 0.3 * progress(v.height), encrustColours: ['#5a3a6e', '#7e6aa8', '#c9b8e8'],
      palette: ['#170c1f', '#62344a', 'rgba(255,170,170,0.2)'],
    };
  }

  function build(): void {
    const fr = mulberry32(flakeSeed);
    const n = Math.round((w * h) / (dpr * dpr) / 5200);
    flakes = Array.from({ length: n }, () => ({
      x: fr(), y: fr(), r: range(fr, 0.4, 1.2) * dpr, speed: range(fr, 0.004, 0.012), phase: fr() * 6,
    }));
  }

  function drawWater(ctx: CanvasRenderingContext2D, t: number, p: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    // Higher up, the top of the frame starts to hold the faintest blue.
    g.addColorStop(0, `rgb(${6 + p * 8},${9 + p * 16},${26 + p * 30})`);
    g.addColorStop(0.45, '#04061a');
    g.addColorStop(1, '#010106');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sg = ctx.createRadialGradient(cx(), -h * 0.2, 0, cx(), -h * 0.2, h * 0.7);
    sg.addColorStop(0, `rgba(90,120,200,${0.05 + p * 0.10 + 0.02 * Math.sin(t * 0.3)})`);
    sg.addColorStop(1, 'rgba(40,60,140,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function drawFlashes(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const s = scale();
    for (const f of flashes) {
      const u = ((t + f.phase) % f.period) / f.period;
      // A quick bright flash, then a long dark.
      const a = u < 0.08 ? Math.sin((u / 0.08) * Math.PI) : 0;
      if (a <= 0) continue;
      glow(ctx, f.x * w, f.y * h, 14 * s * f.r, `${Math.round(f.hue - 120)},${Math.round(f.hue + 20)},255`, 0.6 * a);
    }
    ctx.restore();
  }

  function drawSnow(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.fillStyle = 'rgba(190,205,240,0.35)';
    for (const f of flakes) {
      const y = ((f.y + t * f.speed) % 1) * (h + 10) - 5;
      const x = (((f.x + Math.sin(t * 0.25 + f.phase) * 0.003) % 1) + 1) % 1 * w;
      ctx.fillRect(x, y, f.r, f.r);
    }
  }

  function drawSiphonophore(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    const period = 140;
    const u = (t % period) / period;
    if (u > 0.55) return;
    sight('siphonophore');
    const head = -0.25 + (u / 0.55) * 1.6;
    const y0 = focus.y + focus.h * 0.22;
    ctx.save();
    for (let k = 0; k < 34; k++) {
      const xu = head - k * 0.018;
      if (xu < -0.1 || xu > 1.1) continue;
      const x = focus.x + xu * focus.w;
      const y = y0 + Math.sin(xu * 7 + t * 0.4) * 18 * s + k * 0.6 * s;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 - k * 0.5);
      const r = (6 + 2 * pulse) * s * (1 - k / 60);
      ctx.fillStyle = `rgba(170,210,255,${0.10 + 0.08 * pulse})`;
      ctx.strokeStyle = `rgba(200,230,255,${0.25 + 0.2 * pulse})`;
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.3, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (k % 3 === 0) {
        ctx.strokeStyle = 'rgba(200,230,255,0.12)';
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.quadraticCurveTo(x + Math.sin(t + k) * 8 * s, y + 30 * s, x - 4 * s, y + 55 * s);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    const hx = focus.x + head * focus.w;
    glow(ctx, hx, y0 + Math.sin(head * 7 + t * 0.4) * 18 * s, 30 * s, '170,220,255', 0.35);
    ctx.restore();
  }

  function vignette(ctx: CanvasRenderingContext2D): void {
    const c = cx(), cy = focus.y + focus.h * 0.5;
    const g = ctx.createRadialGradient(c, cy, Math.min(focus.w, focus.h) * 0.3, c, cy, Math.max(w, h) * 0.8);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,4,0.7)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  return {
    bloomStrength: 0.6,
    crownAt: [0, 0] as [number, number],
    effect(kind) {
      effects.push(kind);
    },
    resize(nw, nh, ndpr, nfocus) {
      w = nw; h = nh; dpr = ndpr; focus = nfocus;
      build();
    },
    draw(ctx, t, v) {
      const p = progress(v.height);
      const L = layout(v);
      water.draw(ctx, w, h, t, 0.2, `${w}x${h} ${p.toFixed(3)}`, (c, tq) => drawWater(c, tq, p));
      drawFlashes(ctx, t);
      // The old stone's lights answer the scouts listening at it.
      ruins.draw(ctx, w, h, focus, v.height, RUINS, t, [0, 1, 2], Math.min(1, v.jobs.scout / 8));
      drawAngler(ctx, t);
      for (const c of combs) drawComb(ctx, c, t);
      if (v.bands.includes('glass')) for (let i = 0; i < 4; i++) swimShrimp(ctx, t, i);
      if (v.bands.includes('siphon')) drawSiphonophore(ctx, t);
      drawSnow(ctx, t);
      shoals.drawBack(ctx, focus, reef, L, v, t);
      drawFlank(ctx, p);
      reef.draw(ctx, L, v, t);
      this.crownAt = reef.crown(L);
      reef.drawEffects(ctx, L, v, effects.live(t));
      shoals.drawFront(ctx, focus, reef, L, v, t);
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      vignette(ctx);
    },
  };
}
