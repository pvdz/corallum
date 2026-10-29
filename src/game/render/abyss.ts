// The Silt Floor: the seamount at 4,000 m, marine snow, and the reef growing on it.
// Everything is generated from a seed; `draw` is a pure function of (view, t) so a given
// seed, state and time always render the same frame — screenshots rely on that.

import { sight, spot, startled } from './sightings.ts';
import { drawThorn } from './thorn.ts';
import { drawGarden } from './works.ts';
import { mulberry32, range, type Rng } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import { glow, speck } from './draw.ts';
import { createLife, type Stage } from './life.ts';
import { createGround } from './ground.ts';
import { createLayerCache } from './layer.ts';
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
    const pts = ridges[2]!.points;
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

  function drawSnow(ctx: CanvasRenderingContext2D, t: number, layer: number): void {
    ctx.fillStyle = ['rgba(170,190,230,0.35)', 'rgba(200,215,245,0.5)', 'rgba(225,235,255,0.6)'][layer]!;
    // Hungry water carries a third of the snow; buried water half again as much (drawn twice).
    const thin = sm === 'hungry' ? 3 : 1;
    for (const [i, f] of flakes.entries()) {
      if (f.layer !== layer || i % thin) continue;
      const y = ((f.y + t * f.speed) % 1) * (h + 20) - 10;
      const x = ((((f.x + Math.sin(t * 0.3 + f.phase) * 0.004 + t * f.drift * 0.002) % 1) + 1) % 1) * w;
      ctx.beginPath();
      ctx.arc(x, y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** A lonely seamount: one far light on the horizon, another reef too far away to reach. */
  function drawFarLamp(ctx: CanvasRenderingContext2D, t: number): void {
    const x = focus.x + focus.w * 0.84, y = focus.y + focus.h * 0.36;
    const a = 0.45 + 0.2 * Math.sin(t * 0.4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 46 * scale(), '140,180,255', a * 0.6);
    glow(ctx, x, y, 4 * scale(), '220,235,255', a * 1.6);
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
      const g = ctx.createLinearGradient(0, y - rh, 0, y);
      g.addColorStop(0, 'rgba(165,170,190,0.8)');
      g.addColorStop(1, 'rgba(70,72,90,0.7)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rw, rh, 0, Math.PI, 0);
      ctx.fill();
      // A slump now and then: a little cloud lifting off the crest.
      const ph = (t * 0.12 + k * 0.37) % 1;
      if (ph < 0.3) {
        ctx.fillStyle = `rgba(170,175,195,${0.18 * Math.sin((ph / 0.3) * Math.PI)})`;
        ctx.beginPath();
        ctx.ellipse(x + rw * 0.2, y - rh - ph * 30 * s, rw * (0.3 + ph), rh * (0.6 + ph), 0, 0, Math.PI * 2);
        ctx.fill();
      }
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
      ctx.fillStyle = '#3a2a2e';
      ctx.beginPath();
      ctx.moveTo(x - wid, base);
      ctx.lineTo(x - wid * 0.5, base - hgt);
      ctx.lineTo(x + wid * 0.5, base - hgt);
      ctx.lineTo(x + wid, base);
      ctx.fill();
      // Smoke: dark puffs rising and spreading.
      for (let p = 0; p < 8; p++) {
        const q = ((t * 0.12 + p / 8 + k * 0.3) % 1);
        ctx.fillStyle = `rgba(70,60,72,${0.5 * (1 - q)})`;
        ctx.beginPath();
        ctx.arc(x + Math.sin(t + p + k) * 4 * s * q, base - hgt - q * 70 * s, (3 + q * 9) * s, 0, Math.PI * 2);
        ctx.fill();
      }
      const belch = touch && touch.age < 4 && Math.abs(touch.x - x) < focus.w * 0.12 ? touch.age : -1;
      if (belch >= 0) {
        for (let p = 0; p < 6; p++) {
          const q = Math.min(1, belch / 3 + p * 0.05);
          ctx.fillStyle = `rgba(40,32,42,${0.7 * (1 - q)})`;
          ctx.beginPath();
          ctx.arc(x + Math.sin(p * 2.3) * 8 * s * q, base - hgt - q * 90 * s - p * 4 * s, (6 + q * 18) * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, base - hgt, 10 * s, '255,120,60', 0.3 + 0.1 * Math.sin(t * 2 + k) + (belch >= 0 ? 0.6 * Math.max(0, 1 - belch) : 0));
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
    const g = ctx.createLinearGradient(0, y - ry, 0, y + ry);
    g.addColorStop(0, 'rgba(150,180,230,0.55)');
    g.addColorStop(1, 'rgba(40,60,110,0.75)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    // The surface: slow ripples of light across the brine.
    ctx.strokeStyle = 'rgba(210,230,255,0.35)';
    ctx.lineWidth = 1 * s;
    for (let k = 0; k < 4; k++) {
      const u = ((t * 0.08 + k * 0.25) % 1);
      ctx.beginPath();
      ctx.ellipse(x, y, rx * (0.2 + 0.75 * u), ry * (0.2 + 0.75 * u), 0, Math.PI * 1.05, Math.PI * 1.95);
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
    // Mussels crowding the rim.
    ctx.fillStyle = '#2a2638';
    for (let k = 0; k < 30; k++) {
      const a = (k / 30) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * rx * 1.04, y + Math.sin(a) * ry * 1.3, 4 * s, 2.2 * s, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * A crowded seamount: half-buried old reefs all around, grey humps of dead branches poking out
   * of the silt, with a few lights still glowing in them.
   */
  function drawBuriedReefs(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    const r = mulberry32(seed ^ 0xb0b);
    for (let k = 0; k < 6; k++) {
      const u = k < 3 ? 0.04 + k * 0.1 + r() * 0.04 : 0.68 + (k - 3) * 0.1 + r() * 0.04;
      const x = focus.x + focus.w * u, y = baseY() + (6 + r() * 6) * s;
      const wdt = (40 + r() * 34) * s, hgt = (20 + r() * 18) * s;
      ctx.fillStyle = '#2c2a46';
      ctx.beginPath();
      ctx.ellipse(x, y, wdt, hgt, 0, Math.PI, 0);
      ctx.fill();
      // Dead branches poking out of the hump.
      ctx.strokeStyle = '#3a3858';
      ctx.lineCap = 'round';
      for (let b = 0; b < 5; b++) {
        const bx = x + (b - 2) * wdt * 0.3;
        const len = (8 + r() * 16) * s;
        ctx.lineWidth = (2 + r() * 2) * s;
        ctx.beginPath();
        ctx.moveTo(bx, y - hgt * 0.6);
        ctx.lineTo(bx + (r() - 0.5) * 10 * s, y - hgt * 0.6 - len);
        ctx.stroke();
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x + (r() - 0.5) * wdt, y - hgt * 0.5, 6 * s, '170,190,255', 0.25 + 0.15 * Math.sin(t * 0.7 + k));
      ctx.restore();
    }
  }

  /**
   * A flurry of the Long Silt: for half a minute in every four the snow thickens, a dense second
   * fall slanting through the water (the same flakes, drawn again offset and faster).
   */
  /** `on`: a flurry is falling now (the sim's clock, so sweeps and snow agree). */
  function drawFlurry(ctx: CanvasRenderingContext2D, t: number, on: boolean): void {
    // On a buried seamount the Long Silt never stops: the flurry is always falling.
    if (!on && sm !== 'buried') return;
    const k = sm === 'buried' && !on ? 0.75 : 1;
    ctx.save();
    ctx.globalAlpha = 0.7 * k;
    ctx.fillStyle = 'rgba(210,220,245,0.6)';
    for (const f of flakes) {
      const y = ((f.y + 0.5 + t * f.speed * 2.6) % 1) * (h + 20) - 10;
      const x = ((((f.x + 0.37 + t * 0.012) % 1) + 1) % 1) * w;
      speck(ctx, x, y, f.r * 1.4);
    }
    ctx.restore();
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
      const vent = v.vent > 0 ? life.drawVent(ctx, st, v.vent, t) : null;
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
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      vignette(ctx);
    },
  };
}
