// The Twilight Shelf (Act III): blue water with real light in it, a silted slope, the Rasp
// grazing it, pale sand bars where they have been, and Ossel's dead wall beside the reef —
// until the truce decides what happens to it.

import { sight } from './sightings.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import { glow } from './draw.ts';
import { createLayerCache } from './layer.ts';
import { createReef, type ReefLayout } from './reef.ts';
import { createRuins, type RuinStyle } from './ruins.ts';
import { createEffects, type Focus, type ReefView, type Scene } from './scene.ts';
import { createShoals } from './shoals.ts';
import { drawShrimp } from './shrimp.ts';

const FROM = 3000;
const TO = 3800;
const MAX_RASP = 24;

const RUINS: RuinStyle = {
  layers: [
    { top: 'rgb(26,58,108)', bottom: 'rgb(9,26,58)', rim: 'rgba(170,215,255,0.25)' },
    { top: 'rgb(16,40,82)', bottom: 'rgb(6,17,42)', rim: 'rgba(180,220,255,0.32)' },
    { top: 'rgb(9,25,58)', bottom: 'rgb(3,11,28)', rim: 'rgba(190,225,255,0.4)' },
  ],
  bands: 'rgba(170,210,255,0.07)',
  lights: '',
};

type Mote = { x: number; y: number; r: number; speed: number; phase: number; drift: number };
type Grazer = { lane: number; speed: number; phase: number; size: number; hue: number };

export function createTwilightScene(seed: number): Scene {
  const rng = mulberry32(seed ^ 0x51ab7e);
  let w = 1, h = 1, dpr = 1;
  let focus: Focus = { x: 0, y: 0, w: 1, h: 1 };
  const reef = createReef(Math.floor(rng() * 1e9));
  const shoals = createShoals(seed ^ 0x3c);
  // A garden eel colony on the slope, away from the reef's foot.
  const eels = Array.from({ length: 22 }, (_, i) => ({
    u: (i < 11 ? 0.12 : 0.72) + rng() * 0.16, len: range(rng, 22, 36), light: rng() < 0.6,
  }));
  const water = createLayerCache(0.5);
  const ruins = createRuins(seed);
  const effects = createEffects();
  let bloom: Bloom | null = null;
  let motes: Mote[] = [];
  const moteSeed = Math.floor(rng() * 1e9);
  const slopeSeed = Math.floor(rng() * 1e9);
  const grazers: Grazer[] = Array.from({ length: MAX_RASP }, () => ({
    lane: rng(), speed: range(rng, 0.012, 0.03) * (rng() < 0.5 ? -1 : 1), phase: rng(),
    size: range(rng, 0.8, 1.25), hue: range(rng, 160, 200),
  }));
  const boulders = Array.from({ length: 9 }, () => ({ u: rng(), r: range(rng, 0.6, 1.6), squash: range(rng, 0.5, 0.8) }));
  const barSlots = Array.from({ length: 16 }, () => ({ u: range(rng, 0.03, 0.97), len: range(rng, 0.06, 0.12) }));

  const scale = () => Math.min(focus.w, focus.h) / 700;
  const cx = () => focus.x + focus.w * 0.5;

  function progress(height: number): number {
    return Math.max(0, Math.min(1, (height - FROM) / (TO - FROM)));
  }

  /** The shelf surface: rises gently from left to right across the lower frame. */
  function slopeY(u: number): number {
    const r = mulberry32(slopeSeed);
    const a = r() * 6, b = r() * 6;
    return focus.y + focus.h * (0.92 - 0.14 * u + 0.015 * Math.sin(u * 9 + a) + 0.008 * Math.sin(u * 23 + b));
  }

  function layout(v: ReefView): ReefLayout {
    return {
      cx: cx(), baseY: focus.y + focus.h * 1.02, unit: focus.h * 0.78, s: scale(), dpr,
      top: 0.45 + 0.55 * progress(v.height), bandStep: 0,
      palette: ['#1e1328', '#7a4058', 'rgba(255,190,180,0.25)'],
    };
  }

  function build(): void {
    const mr = mulberry32(moteSeed);
    const n = Math.round((w * h) / (dpr * dpr) / 2600);
    motes = Array.from({ length: n }, () => ({
      x: mr(), y: mr(), r: range(mr, 0.6, 2.2) * dpr, speed: range(mr, 0.008, 0.02), phase: mr() * 6, drift: range(mr, 0.2, 1),
    }));
  }

  function drawWater(ctx: CanvasRenderingContext2D, t: number, p: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgb(${22 + p * 30},${58 + p * 50},${110 + p * 50})`);
    g.addColorStop(0.5, '#0b2148');
    g.addColorStop(1, '#040b1d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Light shafts from a surface that is finally close.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 7; i++) {
      const sx = cx() + focus.w * ((i - 3) * 0.13) + Math.sin(t * 0.06 + i * 1.9) * focus.w * 0.04;
      const spread = focus.w * (0.025 + 0.02 * Math.sin(t * 0.09 + i * 2));
      const a = (0.045 + 0.03 * Math.sin(t * 0.17 + i * 1.3)) * (0.6 + p);
      const lg = ctx.createLinearGradient(0, 0, 0, h * 0.9);
      lg.addColorStop(0, `rgba(170,215,255,${a})`);
      lg.addColorStop(1, 'rgba(170,215,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(sx - spread * 0.4, 0);
      ctx.lineTo(sx + spread * 0.4, 0);
      ctx.lineTo(sx + spread * 3 + focus.w * 0.05, h * 0.9);
      ctx.lineTo(sx - spread * 3 + focus.w * 0.05, h * 0.9);
      ctx.closePath();
      ctx.fill();
    }
    // The surface: a moving ceiling of light.
    const sg = ctx.createLinearGradient(0, 0, 0, h * 0.25);
    sg.addColorStop(0, `rgba(200,230,255,${0.12 + p * 0.18})`);
    sg.addColorStop(1, 'rgba(200,230,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h * 0.25);
    ctx.restore();
  }

  /** Silt in the water: thick when the reef is smothered, thin when it is clear. */
  function drawMotes(ctx: CanvasRenderingContext2D, t: number, siltLevel: number): void {
    const n = Math.round(motes.length * (0.25 + 0.75 * siltLevel));
    ctx.fillStyle = `rgba(200,195,180,${0.25 + 0.25 * siltLevel})`;
    for (let i = 0; i < n; i++) {
      const m = motes[i]!;
      const y = ((m.y + t * m.speed) % 1) * (h + 10) - 5;
      // The silt slides downslope: leftward as it falls.
      const x = ((((m.x - t * m.speed * m.drift * 0.6 + Math.sin(t * 0.3 + m.phase) * 0.004) % 1) + 1) % 1) * w;
      ctx.fillRect(x, y, m.r, m.r);
    }
  }

  function drawShelf(ctx: CanvasRenderingContext2D, sandBars: number, siltLevel: number): void {
    const n = 48;
    const x0 = focus.x - focus.w * 0.1, span = focus.w * 1.2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      ctx.lineTo(x0 + u * span, slopeY(u));
    }
    ctx.lineTo(w, slopeY(1));
    ctx.lineTo(w, h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, slopeY(1), 0, h);
    g.addColorStop(0, siltLevel > 0.5 ? '#2a3141' : '#2d3a4f');
    g.addColorStop(1, '#0c1222');
    ctx.fillStyle = g;
    ctx.fill();
    // Boulders furred with silt.
    const s = scale();
    for (const b of boulders) {
      const bx = x0 + b.u * span;
      const by = slopeY(b.u);
      const r = 22 * s * b.r;
      ctx.fillStyle = '#1b2333';
      ctx.beginPath();
      ctx.ellipse(bx, by, r, r * b.squash, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = `rgba(190,180,160,${0.12 + 0.25 * siltLevel})`;
      ctx.beginPath();
      ctx.ellipse(bx, by - r * b.squash * 0.75, r * 0.8, r * 0.25, 0, Math.PI, 0);
      ctx.fill();
    }
    // Sand bars: pale ridges along the slope, one per bar raised.
    for (let i = 0; i < Math.min(sandBars, barSlots.length); i++) {
      const bar = barSlots[i]!;
      const ax = x0 + (bar.u - bar.len / 2) * span, bx = x0 + (bar.u + bar.len / 2) * span;
      const ay = slopeY(bar.u - bar.len / 2), byy = slopeY(bar.u + bar.len / 2);
      const midx = (ax + bx) / 2, midy = (ay + byy) / 2 - 9 * s;
      const sg = ctx.createLinearGradient(0, midy - 6 * s, 0, midy + 10 * s);
      sg.addColorStop(0, 'rgba(250,228,180,0.75)');
      sg.addColorStop(1, 'rgba(210,180,130,0.25)');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(midx, midy - 6 * s, bx, byy);
      ctx.closePath();
      ctx.fill();
    }
  }

  /** Ossel's wall: a dead grey reef wall on the left. Ground away, it is a dune of warm sand. */
  function drawWall(ctx: CanvasRenderingContext2D, t: number, wall: '' | 'a' | 'b'): void {
    const s = scale();
    const u = 0.14;
    const bx = focus.x - focus.w * 0.1 + u * focus.w * 1.2;
    const by = slopeY(u);
    if (wall === 'a') {
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, 120 * s);
      g.addColorStop(0, 'rgba(255,225,170,0.85)');
      g.addColorStop(1, 'rgba(255,225,170,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(bx, by, 120 * s, 34 * s, 0, Math.PI, 0);
      ctx.fill();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, bx, by - 20 * s, 90 * s, '255,210,150', 0.12 + 0.04 * Math.sin(t * 0.8));
      ctx.restore();
      return;
    }
    const r = mulberry32(seed ^ 0xa11);
    const hgt = 150 * s, half = 46 * s;
    ctx.fillStyle = wall === 'b' ? '#4a3542' : '#2c2c36';
    ctx.beginPath();
    ctx.moveTo(bx - half, by);
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      ctx.lineTo(bx - half + f * half * 2, by - hgt * (0.75 + 0.25 * Math.sin(f * Math.PI)) + range(r, -10, 10) * s);
    }
    ctx.lineTo(bx + half, by);
    ctx.closePath();
    ctx.fill();
    // Old bands in the dead stone.
    ctx.strokeStyle = 'rgba(200,200,215,0.10)';
    ctx.lineWidth = 1 * dpr;
    for (let i = 1; i < 9; i++) {
      const yy = by - (i / 9) * hgt * 0.8;
      ctx.beginPath();
      ctx.moveTo(bx - half * 0.95, yy);
      ctx.quadraticCurveTo(bx, yy - 4 * s, bx + half * 0.95, yy + 2 * s);
      ctx.stroke();
    }
    if (wall === 'b') {
      // The reef has grown a living branch around it.
      ctx.strokeStyle = '#7a4058';
      ctx.lineWidth = 6 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx + half, by - 10 * s);
      ctx.bezierCurveTo(bx + half * 1.4, by - hgt * 0.5, bx - half * 1.2, by - hgt * 0.6, bx - half * 0.3, by - hgt * 1.02);
      ctx.stroke();
    }
  }

  /**
   * Garden eels: a colony of thin eels standing out of their burrows in the sand, all leaning into
   * the current to catch drifting food, and ducking down in waves when something passes.
   */
  function drawGardenEels(ctx: CanvasRenderingContext2D, t: number): void {
    sight('garden-eel');
    const s = scale();
    for (const [k, e] of eels.entries()) {
      const x = focus.x - focus.w * 0.1 + e.u * focus.w * 1.2;
      const base = slopeY(e.u) + 3 * s;
      // Every so often a wave of ducking runs through the colony.
      const wave = Math.max(0, Math.sin(t * 0.25 - e.u * 6));
      const out = 1 - Math.pow(wave, 6) * 0.85;
      const len = e.len * s * out;
      const lean = 0.35 + 0.12 * Math.sin(t * 0.7 + k);
      ctx.strokeStyle = e.light ? 'rgba(235,225,200,0.9)' : 'rgba(150,140,120,0.9)';
      ctx.lineWidth = 2.8 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.quadraticCurveTo(x + lean * len * 0.2, base - len * 0.6, x + lean * len * 0.6, base - len * 0.85);
      ctx.stroke();
      // Head bent toward the current, a dark eye.
      ctx.fillStyle = 'rgba(30,30,30,0.9)';
      ctx.beginPath();
      ctx.arc(x + lean * len * 0.6 + 1.2 * s, base - len * 0.85, 0.8 * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** A manta gliding through the light shafts every few minutes, wings rising and falling slowly. */
  function drawManta(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 230, crossing = 75;
    const u = (t % period) / crossing;
    if (u >= 1) return;
    sight('manta');
    const lap = Math.floor(t / period);
    const dir = lap % 2 ? -1 : 1;
    const s = scale() * 1.4;
    const x = focus.x + focus.w * (dir > 0 ? -0.15 + u * 1.3 : 1.15 - u * 1.3);
    const y = focus.y + focus.h * (0.22 + 0.05 * Math.sin(lap)) + Math.sin(t * 0.3) * 10 * s;
    const flap = Math.sin(t * 1.1);
    ctx.save();
    ctx.translate(x, y);
    // Seen at a low angle: the wing span flattened, so it reads as a wide ray gliding past.
    ctx.scale(dir, 0.38);
    ctx.fillStyle = 'rgba(12,30,62,0.75)';
    // From a little below: a diamond of wings that bend at the tips, a whip of a tail.
    ctx.beginPath();
    ctx.moveTo(30 * s, 0);
    ctx.quadraticCurveTo(10 * s, -8 * s - flap * 6 * s, -6 * s, -46 * s - flap * 14 * s);
    ctx.quadraticCurveTo(-12 * s, -14 * s, -26 * s, 0);
    ctx.quadraticCurveTo(-12 * s, 14 * s, -6 * s, 46 * s + flap * 14 * s);
    ctx.quadraticCurveTo(10 * s, 8 * s + flap * 6 * s, 30 * s, 0);
    ctx.fill();
    // Cephalic fins at the front.
    ctx.beginPath();
    ctx.ellipse(31 * s, -5 * s, 6 * s, 2 * s, 0.3, 0, Math.PI * 2);
    ctx.ellipse(31 * s, 5 * s, 6 * s, 2 * s, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(12,30,62,0.6)';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(-24 * s, 0);
    ctx.quadraticCurveTo(-44 * s, Math.sin(t * 2) * 4 * s, -64 * s, Math.sin(t * 2 + 1) * 6 * s);
    ctx.stroke();
    ctx.restore();
  }

  /** Glass gardeners: shrimp working along the slope near the reef's foot, picking at the silt. */
  function drawGardeners(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale() * 1.8;
    for (let i = 0; i < 7; i++) {
      // Each wanders a short stretch of slope, pausing to pick.
      const a = t * (0.05 + (i % 3) * 0.015) + i * 2.1;
      // Spread along the slope either side of the trunk.
      const u = 0.5 + (i < 4 ? -1 : 1) * (0.1 + (i % 4) * 0.07) + Math.sin(a) * 0.03;
      const dir = Math.cos(a) >= 0 ? 1 : -1;
      const pick = Math.max(0, Math.sin(t * 3 + i * 1.3)) ** 6;
      const x = focus.x - focus.w * 0.1 + u * focus.w * 1.2;
      const y = slopeY(u) - 6 * s + pick * 3 * s;
      drawShrimp(ctx, x, y, s * (0.8 + (i % 2) * 0.3), dir, t, i, '225,240,255');
      if (pick > 0.5) {
        // A puff of silt lifted and eaten.
        ctx.fillStyle = `rgba(200,195,180,${0.35 * pick})`;
        ctx.beginPath();
        ctx.arc(x + dir * 14 * s, y + 4 * s, 3 * s * pick, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /** The Rasp: blunt-beaked grazers with coin scales, nosing along the slope. */
  function drawRasp(ctx: CanvasRenderingContext2D, t: number, n: number, trust: boolean, polite: boolean): void {
    if (n > 0) sight('rasp');
    const s = scale();
    for (let i = 0; i < Math.min(n, MAX_RASP); i++) {
      const g = grazers[i]!;
      let u = (((g.phase + t * g.speed) % 1) + 1) % 1;
      let dir = g.speed > 0 ? 1 : -1;
      // Trusting Rasp graze close around the reef's foot; polite ones keep to their own side of
      // the slope, turning back before they reach your stone.
      if (trust && i % 3 === 0) {
        const a = t * Math.abs(g.speed) * 6 + g.phase * 9;
        u = 0.5 + Math.sin(a) * 0.12;
        dir = Math.cos(a) >= 0 ? 1 : -1;
      } else if (polite) {
        const tri = u < 0.5 ? u * 2 : 2 - u * 2;
        const goingOut = u < 0.5;
        if (i % 2) { u = 0.6 + tri * 0.4; dir = goingOut ? 1 : -1; }
        else { u = 0.4 - tri * 0.4; dir = goingOut ? -1 : 1; }
      }
      const x = focus.x - focus.w * 0.1 + u * focus.w * 1.2;
      const peck = Math.max(0, Math.sin(t * 2.2 + i * 1.7)) ** 8;
      const y = slopeY(u) - (14 + g.lane * 50) * s + peck * 8 * s;
      const len = 22 * s * g.size;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      ctx.rotate(0.12 + peck * 0.35);
      // Body.
      const body = ctx.createLinearGradient(0, -len * 0.5, 0, len * 0.5);
      body.addColorStop(0, `hsl(${g.hue},35%,42%)`);
      body.addColorStop(1, `hsl(${g.hue + 20},30%,24%)`);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, len, len * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Coin scales.
      ctx.strokeStyle = `hsla(${g.hue + 30},40%,70%,0.25)`;
      ctx.lineWidth = 0.9 * s;
      for (let q = 0; q < 4; q++) {
        ctx.beginPath();
        ctx.arc(-len * 0.45 + q * len * 0.28, 0, len * 0.18, -1.2, 1.2);
        ctx.stroke();
      }
      // Tail.
      const tail = Math.sin(t * 6 + i) * len * 0.15;
      ctx.fillStyle = `hsl(${g.hue},30%,30%)`;
      ctx.beginPath();
      ctx.moveTo(-len * 0.9, 0);
      ctx.lineTo(-len * 1.5, -len * 0.45 + tail);
      ctx.lineTo(-len * 1.35, tail * 0.5);
      ctx.lineTo(-len * 1.5, len * 0.45 + tail);
      ctx.closePath();
      ctx.fill();
      // The beak: fused teeth, pale.
      ctx.fillStyle = '#e8e2d0';
      ctx.beginPath();
      ctx.moveTo(len * 0.85, -len * 0.18);
      ctx.quadraticCurveTo(len * 1.25, -len * 0.05, len * 1.12, len * 0.12);
      ctx.lineTo(len * 0.85, len * 0.16);
      ctx.closePath();
      ctx.fill();
      // Eye.
      ctx.fillStyle = '#0a0a10';
      ctx.beginPath();
      ctx.arc(len * 0.55, -len * 0.12, len * 0.07, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // A puff of sand on each peck.
      if (peck > 0.3) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, x + dir * len * 1.1, y + len * 0.2, 14 * s * peck, '240,220,180', 0.35 * peck);
        ctx.restore();
      }
    }
  }

  function vignette(ctx: CanvasRenderingContext2D): void {
    const c = cx(), cy = focus.y + focus.h * 0.5;
    const g = ctx.createRadialGradient(c, cy, Math.min(focus.w, focus.h) * 0.35, c, cy, Math.max(w, h) * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,4,16,0.6)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  return {
    bloomStrength: 0.45,
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
      // Water and light shafts change slowly: painted at half resolution five times a second.
      water.draw(ctx, w, h, t, 0.2, `${w}x${h} ${p.toFixed(3)}`, (c, tq) => drawWater(c, tq, p));
      ruins.draw(ctx, w, h, focus, v.height, RUINS, t);
      drawManta(ctx, t);
      drawMotes(ctx, t, v.siltLevel);
      shoals.drawBack(ctx, focus, reef, L, v, t, '#1d3557');
      drawShelf(ctx, v.sandBars, v.siltLevel);
      drawGardenEels(ctx, t);
      drawWall(ctx, t, v.wall);
      drawRasp(ctx, t, v.rasp, v.raspTrust, v.raspPolite);
      if (v.gardeners) drawGardeners(ctx, t);
      reef.draw(ctx, L, v, t);
      this.crownAt = reef.crown(L);
      reef.drawEffects(ctx, L, v, effects.live(t));
      shoals.drawFront(ctx, focus, reef, L, v, t, '#1d3557');
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      vignette(ctx);
    },
  };
}
