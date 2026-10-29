// The Twilight Shelf (Act III): blue water with real light in it, a silted slope, the Rasp
// grazing it, pale sand bars where they have been, and Ossel's dead wall beside the reef —
// until the truce decides what happens to it.

import { drawRising } from './rising.ts';
import { createSlugs } from './slugs.ts';
import { drawGhosts } from './ghosts.ts';
import { drawSisterFar } from './sister.ts';
import { drawThorn } from './thorn.ts';
import { drawBreakwater } from './works.ts';
import { drawRelics } from './relics.ts';
import { drawResidents } from './residents.ts';
import { sight, spot, startled } from './sightings.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import { glow, speck } from './draw.ts';
import { drawDaughters } from './daughters.ts';
import { createGround } from './ground.ts';
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
  // Two garden eel colonies on the slope, either side of the reef's foot.
  const fans = [
    { u: 0.08, size: 1.1, colour: 'rgba(150,70,170,0.9)' },
    { u: 0.66, size: 0.8, colour: 'rgba(200,90,120,0.9)' },
    { u: 0.82, size: 1.3, colour: 'rgba(130,80,190,0.9)' },
  ];
  const eels = Array.from({ length: 22 }, (_, i) => ({
    u: (i < 11 ? 0.12 : 0.72) + rng() * 0.16, len: range(rng, 22, 36), light: rng() < 0.6,
  }));
  const water = createLayerCache(0.5);
  const slugs = createSlugs(7);
  const ruins = createRuins(seed);
  const effects = createEffects();
  let bloom: Bloom | null = null;
  let motes: Mote[] = [];
  const moteSeed = Math.floor(rng() * 1e9);
  const slopeSeed = Math.floor(rng() * 1e9);
  const ground = createGround(slopeSeed ^ 0x51f7);
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
      encrust: 0.4 + 0.3 * progress(v.height), encrustColours: ['#d0703c', '#8a4fb8', '#e0c050', '#3fa38c'],
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
      speck(ctx, x, y, m.r);
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
    const s = scale();
    const surf = (x: number) => slopeY(Math.min(1, Math.max(0, (x - x0) / span)));
    ground.draw(ctx, w, Math.min(h, focus.y + focus.h), s, surf, { light: '200,212,235', dark: '4,8,22', alpha: 0.75, tracks: false },
      `${w}x${h}:${focus.x},${focus.y},${focus.w},${focus.h}`);
    // Boulders furred with silt.
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

  /**
   * Feeding channels: grooves cut in the slope that lead the current to the reef's foot, each
   * with plankton streaming along it, faster near the reef.
   */
  function drawChannels(ctx: CanvasRenderingContext2D, t: number, n: number): void {
    if (n <= 0) return;
    const s = scale();
    const x0 = focus.x - focus.w * 0.1, span = focus.w * 1.2;
    const foot = 0.5;
    for (let k = 0; k < Math.min(6, n); k++) {
      // Alternate sides, the later ones further out; each groove bends down the slope.
      const side = k % 2 ? 1 : -1;
      const from = foot + side * (0.2 + Math.floor(k / 2) * 0.1);
      const sag = (8 + k * 3) * s;
      const pt = (q: number): [number, number] => {
        const u = from + (foot - from) * q;
        return [x0 + u * span, slopeY(u) + 6 * s + Math.sin(q * Math.PI) * sag];
      };
      ctx.lineCap = 'round';
      // Thrown-up sand banks either side, then the groove, then the light catching its far lip.
      for (const [col, wdt, dy] of [['rgba(215,200,165,0.28)', 3, -5], ['rgba(215,200,165,0.2)', 3, 5],
        ['rgba(2,6,18,0.6)', 7, 0], ['rgba(190,210,240,0.3)', 1.4, 3.5]] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = wdt * s;
        ctx.beginPath();
        for (let q = 0; q <= 1.0001; q += 0.05) {
          const [x, y] = pt(q);
          if (q === 0) ctx.moveTo(x, y + dy * s);
          else ctx.lineTo(x, y + dy * s);
        }
        ctx.stroke();
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let m = 0; m < 6; m++) {
        const q = ((t * 0.12 + m / 6 + k * 0.13) % 1) ** 1.6;
        const [x, y] = pt(q);
        glow(ctx, x, y - 1 * s, 4.5 * s, '230,240,150', 0.85 * Math.sin(q * Math.PI));
      }
      ctx.restore();
    }
  }

  /** Ossel's wall: a dead grey reef wall on the left. Ground away, it is a dune of warm sand. */
  function drawWall(ctx: CanvasRenderingContext2D, t: number, wall: '' | 'a' | 'b'): void {
    const s = scale();
    const u = 0.14;
    const bx = focus.x - focus.w * 0.1 + u * focus.w * 1.2;
    const by = slopeY(u);
    // Ossel (or the sand it became) answers a tap here too.
    spot('ossel', bx, by - 40 * s, 70 * s);
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
    // The outline: a slumped mound with knobbly flanks and a broken crest.
    const left: [number, number][] = [], right: [number, number][] = [], top: [number, number][] = [];
    for (let i = 0; i <= 8; i++) {
      const f = i / 8;
      left.push([bx - half * (1.05 - 0.25 * f) + range(r, -5, 5) * s, by - f * hgt * 0.78]);
      right.push([bx + half * (1.05 - 0.2 * f) + range(r, -5, 5) * s, by - f * hgt * 0.74]);
    }
    for (let i = 0; i <= 12; i++) {
      const f = i / 12;
      top.push([bx - half * 0.8 + f * half * 1.6, by - hgt * (0.78 + 0.22 * Math.sin(f * Math.PI)) + range(r, -10, 10) * s]);
    }
    const outline = () => {
      ctx.beginPath();
      ctx.moveTo(left[0]![0], by + 2 * s);
      for (const [x, y] of left) ctx.lineTo(x, y);
      for (const [x, y] of top) ctx.lineTo(x, y);
      for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i]![0], right[i]![1]);
      ctx.lineTo(right[0]![0], by + 2 * s);
      ctx.closePath();
    };
    // Broken branch stumps standing off the crest.
    ctx.strokeStyle = wall === 'b' ? '#4a3542' : '#2c2c36';
    ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const [x, y] = top[2 + k * 3]!;
      const len = range(r, 14, 30) * s, lean = range(r, -0.5, 0.5);
      ctx.lineWidth = range(r, 4, 7) * s;
      ctx.beginPath();
      ctx.moveTo(x, y + 4 * s);
      ctx.lineTo(x + Math.sin(lean) * len, y - Math.cos(lean) * len);
      ctx.stroke();
    }
    // Body: lit from above, dark at the foot.
    const g = ctx.createLinearGradient(0, by - hgt, 0, by);
    g.addColorStop(0, wall === 'b' ? '#5e4552' : '#40404c');
    g.addColorStop(1, wall === 'b' ? '#2e2029' : '#1c1c25');
    ctx.fillStyle = g;
    outline();
    ctx.fill();
    ctx.save();
    outline();
    ctx.clip();
    // Old bands in the dead stone, each with a line of silt settled on its ledge.
    for (let i = 1; i < 9; i++) {
      const yy = by - (i / 9 + range(r, -0.025, 0.025)) * hgt * 0.8;
      const tilt = range(r, -4, 4) * s;
      ctx.strokeStyle = 'rgba(10,10,18,0.35)';
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(bx - half * 1.1, yy + 1.5 * s - tilt);
      ctx.quadraticCurveTo(bx, yy - 2.5 * s, bx + half * 1.1, yy + 3.5 * s + tilt);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,195,180,0.16)';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(bx - half * 1.1, yy - tilt);
      ctx.quadraticCurveTo(bx, yy - 4 * s, bx + half * 1.1, yy + 2 * s + tilt);
      ctx.stroke();
    }
    // Holes where borers have been: dark, with a lit lower lip.
    for (let k = 0; k < 9; k++) {
      const hx = bx + range(r, -0.8, 0.8) * half, hy = by - range(r, 0.08, 0.7) * hgt, hr = range(r, 1.5, 4) * s;
      ctx.fillStyle = 'rgba(5,5,12,0.75)';
      ctx.beginPath();
      ctx.ellipse(hx, hy, hr, hr * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(190,190,200,0.15)';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.arc(hx, hy, hr, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
    // Dull crusts of sponge, the only colour left on it.
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = ['rgba(150,110,70,0.35)', 'rgba(110,120,90,0.3)', 'rgba(140,90,110,0.3)'][k % 3]!;
      ctx.beginPath();
      ctx.ellipse(bx + range(r, -0.9, 0.9) * half, by - range(r, 0.05, 0.6) * hgt, range(r, 4, 9) * s, range(r, 2, 4) * s, range(r, -0.4, 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    // The light from above lies along the left shoulder.
    const side = ctx.createLinearGradient(bx - half, 0, bx + half, 0);
    side.addColorStop(0, 'rgba(150,180,230,0.12)');
    side.addColorStop(0.5, 'rgba(0,0,0,0)');
    side.addColorStop(1, 'rgba(0,0,10,0.25)');
    ctx.fillStyle = side;
    ctx.fillRect(bx - half * 1.2, by - hgt * 1.1, half * 2.4, hgt * 1.1);
    ctx.restore();
    // Ossel, still alive near the crest: one pale polyp, breathing.
    if (wall === '') {
      const [ox, oy] = top[7]!;
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.6);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, ox, oy + 6 * s, 26 * s, '200,210,255', 0.08 + 0.06 * breathe);
      glow(ctx, ox, oy + 6 * s, 4 * s, '225,230,255', 0.4 + 0.25 * breathe);
      ctx.restore();
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
   * Sea fans on the slope: flat purple gorgonians standing across the current, a lattice of fine
   * branches swaying together.
   */
  /**
   * A moray in a hole in the slope: the head leaning out, mouth opening and shutting as it breathes.
   * Touched, it pulls back into the dark and slowly comes out again.
   */
  function drawMoray(ctx: CanvasRenderingContext2D, t: number): void {
    sight('moray');
    const s = scale() * 1.4;
    const u = 0.24;
    const hx = focus.x - focus.w * 0.1 + u * focus.w * 1.2, hy = slopeY(u) - 10 * s;
    const touch = startled('moray', t);
    const back = touch && touch.age < 7 ? Math.max(0, 1 - Math.max(0, touch.age - 0.3) / 6.7) : 0;
    const out = (0.85 + 0.15 * Math.sin(t * 0.3)) * (1 - back);
    spot('moray', hx - 10 * s, hy, 22 * s);
    ctx.save();
    // The hole: a dark mouth in the rock.
    ctx.fillStyle = '#0a0f1a';
    ctx.beginPath();
    ctx.ellipse(hx, hy, 10 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,130,150,0.4)';
    ctx.lineWidth = 2 * s;
    ctx.stroke();
    if (out > 0.05) {
      ctx.beginPath();
      ctx.ellipse(hx, hy, 9 * s, 6.5 * s, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.restore();
      ctx.save();
      // The head and neck leaning out to the left, mottled green-brown.
      const len = 26 * s * out;
      const gape = (0.3 + 0.7 * Math.max(0, Math.sin(t * 1.4))) * 3 * s;
      ctx.translate(hx, hy);
      ctx.rotate(-0.15);
      const g = ctx.createLinearGradient(0, -6 * s, 0, 6 * s);
      g.addColorStop(0, '#5a6a3a');
      g.addColorStop(1, '#3a4428');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(4 * s, -6 * s);
      ctx.quadraticCurveTo(-len * 0.5, -7 * s, -len, -2.5 * s - gape * 0.4);
      ctx.lineTo(-len - 3 * s, -1 * s);
      ctx.lineTo(-len + 2 * s, 0);
      ctx.lineTo(-len - 3 * s, 1 * s);
      ctx.lineTo(-len, 2.5 * s + gape * 0.6);
      ctx.quadraticCurveTo(-len * 0.5, 7 * s, 4 * s, 6 * s);
      ctx.closePath();
      ctx.fill();
      // Mottling, the eye, and the open mouth's pale lining.
      ctx.fillStyle = 'rgba(200,210,140,0.25)';
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(-len * (0.2 + i * 0.12), (i % 2 ? -2 : 2) * s, 1.4 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#e8e0a0';
      ctx.beginPath();
      ctx.arc(-len + 6 * s, -3 * s, 1.3 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d8a0a0';
      ctx.beginPath();
      ctx.moveTo(-len + 1 * s, 0);
      ctx.lineTo(-len - 2 * s, -gape * 0.4);
      ctx.lineTo(-len - 2 * s, gape * 0.6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * A nautilus drifting at mid-water: a striped spiral shell, tentacles trailing from its mouth.
   * Touched, it pulls in and sinks a little way, then rises again.
   */
  function drawNautilus(ctx: CanvasRenderingContext2D, t: number): void {
    sight('nautilus');
    const s = scale() * 1.5;
    const touch = startled('nautilus', t);
    const sink = touch && touch.age < 8 ? Math.sin(Math.min(1, touch.age / 8) * Math.PI) : 0;
    const x = focus.x + focus.w * (0.7 + 0.05 * Math.sin(t * 0.04)), y = focus.y + focus.h * 0.38 + Math.sin(t * 0.15) * 12 * s + sink * 60 * s;
    spot('nautilus', x, y, 18 * s);
    ctx.save();
    ctx.translate(x, y);
    // Tentacles, trailing forward-left from the mouth (pulled in when touched).
    const reach = 1 - sink * 0.8;
    ctx.strokeStyle = 'rgba(230,200,170,0.7)';
    ctx.lineWidth = 0.9 * s;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(-8 * s, 2 * s + i * 0.6 * s);
      ctx.quadraticCurveTo(-14 * s * reach, (2 + i) * s, -(18 + (i % 3) * 3) * s * reach, (3 + i * 1.2) * s + Math.sin(t * 1.5 + i) * 1.5 * s);
      ctx.stroke();
    }
    // The shell: a disc with the spiral's tiger stripes, and the coiled centre.
    const g = ctx.createRadialGradient(2 * s, -2 * s, 1 * s, 0, 0, 11 * s);
    g.addColorStop(0, '#f6efe0');
    g.addColorStop(1, '#d9c7a8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 11 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 11 * s, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(150,80,40,0.75)';
    ctx.lineWidth = 2.2 * s;
    for (let k = 0; k < 6; k++) {
      const a = -0.6 + k * 0.45;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 4 * s, Math.sin(a) * 4 * s - 3 * s);
      ctx.quadraticCurveTo(Math.cos(a + 0.4) * 9 * s, Math.sin(a + 0.4) * 9 * s - 3 * s, Math.cos(a + 0.7) * 12 * s, Math.sin(a + 0.7) * 12 * s);
      ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,90,60,0.6)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3; a += 0.2) {
      const r = 1 + a * 0.9;
      const px = Math.cos(a) * r * s * 0.6, py = Math.sin(a) * r * s * 0.6;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // The hood over the mouth, and an eye.
    ctx.fillStyle = '#8a5a3a';
    ctx.beginPath();
    ctx.ellipse(-8 * s, 1 * s, 3.5 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1210';
    ctx.beginPath();
    ctx.arc(-7.5 * s, 3 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** The current made visible: faint streaks running toward the shelf (+) or the open water (−). */
  function drawCurrent(ctx: CanvasRenderingContext2D, t: number, c: number): void {
    if (c === 0) return;
    const s = scale();
    ctx.save();
    ctx.strokeStyle = 'rgba(200,225,255,0.12)';
    ctx.lineWidth = 1.2 * s;
    for (let i = 0; i < 40; i++) {
      const y = focus.y + focus.h * (0.2 + 0.7 * ((i * 0.618034) % 1));
      const speed = (0.04 + (i % 5) * 0.01) * c;
      const u = ((((t * speed + i * 0.37) % 1.2) + 1.2) % 1.2) - 0.1;
      const x = focus.x + u * focus.w;
      const len = (18 + (i % 4) * 10) * s * Math.abs(c);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.sign(c) * len, y + Math.sin(t + i) * 2 * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** A sardine run (rare): every 30 minutes, for a minute, a dense silver river across the upper water. */
  function drawSardineRun(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 1800, length = 60;
    const u = ((t + 600) % period) / length;
    if (u >= 1) return;
    sight('sardine-run');
    const s = scale();
    const k = Math.min(1, u * 6, (1 - u) * 6);
    spot('sardine-run', focus.x + focus.w * 0.5, focus.y + focus.h * 0.25, focus.h * 0.1);
    ctx.save();
    ctx.globalAlpha = k;
    ctx.fillStyle = '#9fb4c8';
    ctx.beginPath();
    for (let i = 0; i < 420; i++) {
      // Packed close around a band that snakes across the water.
      const lane = ((i * 0.618034) % 1) - 0.5;
      const x = focus.x + (((t * 0.09 + i * 0.0071) % 1.2) - 0.1) * focus.w;
      const mid = focus.y + focus.h * (0.24 + 0.06 * Math.sin(x * 0.006 + t * 0.4));
      const y = mid + lane * focus.h * 0.07 * (1 - lane * lane * 2);
      ctx.moveTo(x + 5 * s, y);
      ctx.ellipse(x, y, 5 * s, 1.4 * s, 0.08, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.restore();
  }

  /** A frogfish on the slope, lumpy as a sponge, waving a small lure; touched, it gulps. */
  function drawFrogfish(ctx: CanvasRenderingContext2D, t: number): void {
    sight('frogfish');
    const s = scale() * 1.6;
    const u = 0.4;
    const x = focus.x - focus.w * 0.1 + u * focus.w * 1.2, y = slopeY(u) - 8 * s;
    const touch = startled('frogfish', t);
    const gulp = touch && touch.age < 0.6 ? Math.sin((touch.age / 0.6) * Math.PI) : 0;
    spot('frogfish', x, y, 16 * s);
    ctx.save();
    ctx.translate(x, y);
    // The lumpy body: overlapping blobs in sponge orange, with pale warts.
    ctx.fillStyle = '#a8602a';
    for (const [bx, by, br] of [[0, 0, 9], [-6, 2, 6], [6, 3, 6], [-3, -5, 5], [4, -5, 5]] as const) {
      ctx.beginPath();
      ctx.arc(bx * s, by * s, br * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(230,190,140,0.45)';
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      ctx.arc(Math.cos(k * 2.1) * 7 * s, Math.sin(k * 1.7) * 6 * s, 0.9 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // The upturned mouth, gaping on a gulp; one eye.
    ctx.fillStyle = '#3a1a10';
    ctx.beginPath();
    ctx.ellipse(-8 * s, -1 * s, (2 + 4 * gulp) * s, (1 + 4 * gulp) * s, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20140c';
    ctx.beginPath();
    ctx.arc(-4 * s, -6 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
    // The lure on its rod, flicking.
    const lx = -10 * s + Math.sin(t * 3) * 2 * s, ly = -14 * s + Math.cos(t * 3) * 1.5 * s;
    ctx.strokeStyle = 'rgba(220,170,120,0.8)';
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(-5 * s, -9 * s);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = '#f2e0b0';
    ctx.beginPath();
    ctx.arc(lx, ly, 1.3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSeaFans(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    for (const [k, f] of fans.entries()) {
      const x = focus.x - focus.w * 0.1 + f.u * focus.w * 1.2;
      const base = slopeY(f.u) + 2 * s;
      const sway = Math.sin(t * 0.5 + k * 1.3) * 0.08;
      const hgt = f.size * 60 * s;
      ctx.save();
      ctx.translate(x, base);
      ctx.rotate(sway);
      ctx.strokeStyle = f.colour;
      ctx.lineCap = 'round';
      // A short stem, then branches fanning out and forking twice.
      const branch = (x0: number, y0: number, ang: number, len: number, depth: number) => {
        const x1 = x0 + Math.sin(ang) * len, y1 = y0 - Math.cos(ang) * len;
        ctx.lineWidth = Math.max(0.6, (3 - depth) * 0.9) * s;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        if (depth < 3) {
          branch(x1, y1, ang - 0.32, len * 0.72, depth + 1);
          branch(x1, y1, ang + 0.32, len * 0.72, depth + 1);
        }
      };
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -hgt * 0.18);
      ctx.stroke();
      for (const a of [-0.7, -0.25, 0.25, 0.7]) branch(0, -hgt * 0.18, a, hgt * 0.32, 0);
      ctx.restore();
    }
  }

  /**
   * Garden eels: a colony of thin eels standing out of their burrows in the sand, all leaning into
   * the current to catch drifting food, and ducking down in waves when something passes.
   */
  function drawGardenEels(ctx: CanvasRenderingContext2D, t: number): void {
    sight('garden-eel');
    const s = scale();
    // Touched, the whole colony drops into its burrows from the nearest outward, and comes back
    // up slowly, the bravest first.
    const touch = startled('garden-eel', t);
    for (const u of [0.2, 0.8]) spot('garden-eel', focus.x - focus.w * 0.1 + u * focus.w * 1.2, slopeY(u) - 15 * s, Math.max(36 * s, focus.w * 0.12));
    for (const [k, e] of eels.entries()) {
      const x = focus.x - focus.w * 0.1 + e.u * focus.w * 1.2;
      const base = slopeY(e.u) + 3 * s;
      // Every so often a wave of ducking runs through the colony.
      const wave = Math.max(0, Math.sin(t * 0.25 - e.u * 6));
      let out = 1 - Math.pow(wave, 6) * 0.85;
      if (touch && touch.age < 12 && Math.abs(touch.x - x) < focus.w * 0.25) {
        const a = touch.age - Math.abs(touch.x - x) / (600 * s);
        const hide = a < 0 ? 0 : a < 0.25 ? a / 0.25 : Math.max(0, 1 - (a - 3 - (k % 4) * 1.5) / 3);
        out = Math.min(out, 1 - hide * 0.97);
      }
      if (out < 0.04) continue;
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

  /** An ink cloud `age` seconds old: dark puffs billowing out and thinning into the water. */
  function drawInk(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, s: number): void {
    const k = Math.min(1, age / 1.2);
    const fade = Math.max(0, 1 - age / 6);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      const r = (4 + 14 * k) * s * (0.6 + (i % 3) * 0.25);
      const d = 10 * s * k * (0.5 + (i % 4) * 0.3);
      ctx.fillStyle = `rgba(22,16,30,${0.55 * fade})`;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d + age * 3 * s, y + Math.sin(a) * d * 0.7 - age * 7 * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * An octopus on the slope: still and sand-coloured most of the time, then it crawls a short way,
   * flushing red, and settles again somewhere else.
   */
  function drawOctopus(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale() * 2.2;
    const period = 50;
    const leg = Math.floor(t / period);
    const u = (t % period) / period;
    // Crawls during the first fifth of each period, from one resting place to the next.
    const crawl = Math.min(1, u / 0.2);
    const ease = crawl * crawl * (3 - 2 * crawl);
    const restAt = (k: number) => 0.2 + ((k * 0.37) % 1) * 0.16;
    const pu = restAt(leg) + (restAt(leg + 1) - restAt(leg)) * ease;
    const moving = crawl < 1 ? Math.sin(Math.PI * crawl) : 0;
    const x = focus.x - focus.w * 0.1 + pu * focus.w * 1.2;
    const y = slopeY(pu) - 8 * s - moving * 6 * s;
    sight('octopus');
    spot('octopus', x, y, 26 * s);
    // Touched, it blanches, leaves a cloud of ink where it was and flushes dark.
    const touch = startled('octopus', t);
    const shock = touch && touch.age < 6 ? touch.age : -1;
    if (shock >= 0) drawInk(ctx, touch!.x, touch!.y, shock, s);
    const pale = shock >= 0 && shock < 0.6 ? 1 - shock / 0.6 : 0;
    const dark = shock >= 0.6 ? Math.max(0, 1 - (shock - 0.6) / 5) : 0;
    // Colour: sandy camouflage at rest, red while it moves.
    const mix = (c: number) => Math.round(c + (245 - c) * pale - c * 0.55 * dark);
    const rC = mix(150 + 90 * moving), gC = mix(130 - 70 * moving), bC = mix(105 - 50 * moving);
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = `rgb(${rC},${gC},${bC})`;
    ctx.fillStyle = `rgb(${rC},${gC},${bC})`;
    ctx.lineCap = 'round';
    for (let a = 0; a < 8; a++) {
      const side = a < 4 ? -1 : 1;
      const k = a % 4;
      const reach = (12 + k * 3) * s * (1 + 0.3 * moving);
      const wave = Math.sin(t * (moving ? 6 : 0.8) + a * 1.3) * 3 * s;
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.moveTo(side * 2 * s, 2 * s);
      ctx.quadraticCurveTo(side * reach * 0.5, 6 * s + wave, side * reach, 8 * s - k * 1.5 * s + wave);
      ctx.stroke();
    }
    // Mantle and eye.
    ctx.beginPath();
    ctx.ellipse(0, -4 * s, 7 * s, 9 * s * (1 + 0.1 * moving), -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(250,240,200,0.9)';
    ctx.beginPath();
    ctx.arc(4 * s, -1 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(3 * s, -1.4 * s, 2 * s, 0.8 * s);
    ctx.restore();
  }

  /**
   * A cleaning station: a big grouper hangs still beside the reef, mouth open, while two small
   * striped cleaner wrasse dart over it picking it clean.
   */
  function drawCleaningStation(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale() * 1.6;
    const x = focus.x + focus.w * 0.74, y = focus.y + focus.h * 0.6 + Math.sin(t * 0.3) * 3 * s;
    sight('grouper');
    spot('grouper', x, y, 40 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    // Touched, it shuts its mouth and the cleaners scatter; they come back after a while.
    const touch = startled('grouper', t);
    const shy = touch && touch.age < 6 ? (touch.age < 0.3 ? touch.age / 0.3 : Math.max(0, 1 - (touch.age - 3) / 3)) : 0;
    // The grouper: heavy, mottled, fins spread; it gapes slowly while it is cleaned.
    const gape = (0.5 + 0.5 * Math.sin(t * 0.5)) * (1 - shy);
    const sway = Math.sin(t * 0.9) * 2 * s;
    // Dorsal fin: a spiny front half, a soft rounded back half.
    ctx.fillStyle = '#4e4034';
    ctx.beginPath();
    ctx.moveTo(14 * s, -12 * s);
    for (let k = 0; k <= 8; k++) {
      const fx = 14 - k * 3.4;
      ctx.lineTo((fx - 1.2) * s, (-17 - (k % 2) * 1.5 - (k < 5 ? 1 : 0)) * s);
      ctx.lineTo((fx - 3.4) * s, -15.5 * s);
    }
    ctx.quadraticCurveTo(-20 * s, -18 * s, -24 * s, -7 * s);
    ctx.closePath();
    ctx.fill();
    // Anal fin.
    ctx.beginPath();
    ctx.moveTo(-6 * s, 12 * s);
    ctx.quadraticCurveTo(-16 * s, 18 * s, -22 * s, 8 * s);
    ctx.closePath();
    ctx.fill();
    // Tail: broad and rounded, swaying.
    ctx.beginPath();
    ctx.moveTo(-24 * s, -5 * s);
    ctx.quadraticCurveTo(-40 * s, -15 * s + sway, -40 * s, 0 + sway);
    ctx.quadraticCurveTo(-40 * s, 14 * s + sway, -24 * s, 5 * s);
    ctx.closePath();
    ctx.fill();
    // Body.
    const body = ctx.createLinearGradient(0, -14 * s, 0, 14 * s);
    body.addColorStop(0, '#6f5c49');
    body.addColorStop(0.6, '#584837');
    body.addColorStop(1, '#a08a6c');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(32 * s, -1 * s);
    ctx.bezierCurveTo(28 * s, -15 * s, -8 * s, -17 * s, -25 * s, -5 * s);
    ctx.lineTo(-25 * s, 5 * s);
    ctx.bezierCurveTo(-8 * s, 15 * s, 22 * s, 14 * s, 30 * s, (4 + 3 * gape) * s);
    ctx.lineTo(25 * s, (1 + gape) * s);
    ctx.closePath();
    ctx.save();
    ctx.fill();
    ctx.clip();
    // Mottling: pale and dark blotches, inside the body only.
    for (let k = 0; k < 22; k++) {
      const mx = ((k * 0.618) % 1) * 54 - 26, my = ((k * 0.382) % 1) * 24 - 12;
      ctx.fillStyle = k % 3 ? 'rgba(35,26,20,0.45)' : 'rgba(210,190,150,0.25)';
      ctx.beginPath();
      ctx.ellipse(mx * s, my * s, (1.8 + (k % 3) * 0.8) * s, (1.3 + (k % 2) * 0.7) * s, k, 0, Math.PI * 2);
      ctx.fill();
    }
    // Gill cover: an arc that lifts as it breathes.
    ctx.strokeStyle = 'rgba(30,22,16,0.6)';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc((12 - gape) * s, 0, 11 * s, -1.1, 1.1);
    ctx.stroke();
    ctx.restore();
    // The open mouth: a dark gape under the big upper jaw.
    ctx.fillStyle = '#1c120e';
    ctx.beginPath();
    ctx.moveTo(32 * s, -1 * s);
    ctx.quadraticCurveTo(27 * s, (1 + gape) * s, 30 * s, (4 + 3 * gape) * s);
    ctx.lineTo(25 * s, (1 + gape) * s);
    ctx.closePath();
    ctx.fill();
    // Pectoral fin, fanning to hold it still.
    ctx.fillStyle = 'rgba(120,98,74,0.85)';
    ctx.save();
    ctx.translate(6 * s, 3 * s);
    ctx.rotate(0.5 + 0.25 * Math.sin(t * 2.2));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-6 * s, -6 * s, -12 * s, -1 * s);
    ctx.quadraticCurveTo(-7 * s, 5 * s, 0, 0);
    ctx.fill();
    ctx.restore();
    // Eye: a gold ring, a dark pupil, a glint.
    ctx.fillStyle = '#c8a860';
    ctx.beginPath();
    ctx.arc(21 * s, -5 * s, 2.6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#120c08';
    ctx.beginPath();
    ctx.arc(21.4 * s, -5 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(20.8 * s, -5.7 * s, 0.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // The cleaners: tiny blue fish with a black stripe, darting about the grouper.
    for (let k = 0; k < 2; k++) {
      const a = t * (1.3 + k * 0.4) + k * 3;
      const flee = 1 + 3 * shy;
      const cx = x + Math.cos(a) * (18 + 8 * Math.sin(a * 1.7)) * s * flee, cy = y + Math.sin(a * 1.3) * 10 * s * flee;
      const dir = -Math.sin(a) >= 0 ? 1 : -1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(dir, 1);
      ctx.fillStyle = '#5ab8ff';
      ctx.beginPath();
      ctx.moveTo(5 * s, 0);
      ctx.quadraticCurveTo(1 * s, -2.2 * s, -4 * s, -0.6 * s);
      ctx.lineTo(-6.5 * s, -2 * s);
      ctx.lineTo(-6 * s, 0);
      ctx.lineTo(-6.5 * s, 2 * s);
      ctx.lineTo(-4 * s, 0.6 * s);
      ctx.quadraticCurveTo(1 * s, 2.2 * s, 5 * s, 0);
      ctx.fill();
      ctx.fillStyle = 'rgba(235,245,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(0.5 * s, 0.8 * s, 3.6 * s, 0.6 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // The black stripe from snout to tail.
      ctx.strokeStyle = '#0d1420';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(4.6 * s, -0.2 * s);
      ctx.lineTo(-6 * s, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * Rarely, a whale shark: once in eighteen minutes the biggest fish in the sea glides across the
   * upper water, broad-headed and spotted, mouth open for plankton.
   */
  /**
   * Rarely, an oarfish: once in about twenty-five minutes a long silver ribbon drifts down through
   * the open water head-up, its body barely moving while waves run down its red crest. Touched, it
   * coils away into the blue faster than it came.
   */
  function drawOarfish(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 1500, pass = 90;
    const touch = startled('oarfish', t);
    let u = ((t + 260) % period) / pass;
    if (touch && touch.age < 6 && u < 1.5) u += touch.age * 0.15;
    if (u >= 1) return;
    sight('oarfish');
    const s = scale() * 1.5;
    const x0 = focus.x + focus.w * 0.18 + u * focus.w * 0.1;
    const y0 = focus.y + focus.h * (-0.15 + u * 0.75);
    const len = 160 * s;
    spot('oarfish', x0, y0 + len * 0.3, 40 * s);
    // The body: a ribbon from the head (top) down, swaying in a slow standing wave.
    const pt = (f: number): [number, number] => [x0 + Math.sin(f * 5 - t * 0.9) * 6 * s * f, y0 + f * len];
    ctx.save();
    ctx.lineCap = 'round';
    const body = ctx.createLinearGradient(x0 - 6 * s, 0, x0 + 6 * s, 0);
    body.addColorStop(0, '#9fb0c4');
    body.addColorStop(0.5, '#e8eef6');
    body.addColorStop(1, '#8a9cb2');
    ctx.strokeStyle = body;
    for (let i = 0; i < 24; i++) {
      const f0 = i / 24, f1 = (i + 1) / 24;
      const [ax, ay] = pt(f0), [bx, by] = pt(f1);
      ctx.lineWidth = (7 - 5 * f0) * s;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }
    // The crest: red rays along the back, a wave running down them.
    ctx.strokeStyle = 'rgba(230,70,70,0.85)';
    ctx.lineWidth = 1.2 * s;
    for (let i = 0; i < 40; i++) {
      const f = i / 40;
      const [x, y] = pt(f);
      const ray = (i < 4 ? 14 - i * 2 : 5) * s * (0.6 + 0.4 * Math.sin(f * 20 - t * 4));
      ctx.beginPath();
      ctx.moveTo(x - 3 * s, y);
      ctx.lineTo(x - 3 * s - ray, y - ray * 0.4);
      ctx.stroke();
    }
    // Head: a small dark eye.
    ctx.fillStyle = '#1b2230';
    ctx.beginPath();
    ctx.arc(x0 + 1.5 * s, y0 + 4 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawWhaleShark(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 1080, crossing = 70;
    const u = ((t + 500) % period) / crossing;
    if (u >= 1) return;
    sight('whale-shark');
    const s = scale() * 2.4;
    const x = focus.x + focus.w * (-0.3 + u * 1.6), y = focus.y + focus.h * 0.3 + Math.sin(t * 0.25) * 8 * s;
    spot('whale-shark', x, y, 70 * s);
    const sweep = Math.sin(t * 1.2);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(40,62,92,0.85)';
    ctx.beginPath();
    ctx.moveTo(60 * s, 0);
    ctx.quadraticCurveTo(58 * s, -12 * s, 30 * s, -13 * s);
    ctx.quadraticCurveTo(-20 * s, -12 * s, -50 * s, -2 * s + sweep * 2 * s);
    ctx.lineTo(-72 * s, -18 * s + sweep * 6 * s);
    ctx.lineTo(-64 * s, 0);
    ctx.lineTo(-70 * s, 12 * s + sweep * 4 * s);
    ctx.lineTo(-50 * s, 3 * s + sweep * 2 * s);
    ctx.quadraticCurveTo(-10 * s, 12 * s, 30 * s, 11 * s);
    ctx.quadraticCurveTo(58 * s, 10 * s, 60 * s, 0);
    ctx.fill();
    // Dorsal and pectoral fins.
    ctx.beginPath();
    ctx.moveTo(0, -12 * s); ctx.lineTo(-12 * s, -24 * s); ctx.lineTo(-16 * s, -11 * s); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(26 * s, 9 * s); ctx.lineTo(14 * s, 22 * s); ctx.lineTo(8 * s, 10 * s); ctx.fill();
    // Pale spots and stripes.
    ctx.fillStyle = 'rgba(220,235,255,0.55)';
    const sr = mulberry32(0x5a7c);
    for (let k = 0; k < 46; k++) {
      const sx = 52 - sr() * 100, sy = (sr() * 2 - 1) * (10 - Math.abs(sx) * 0.08);
      ctx.beginPath();
      ctx.arc(sx * s, sy * s, 0.9 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(10,20,35,0.8)';
    ctx.fillRect(55 * s, -1 * s, 4 * s, 2 * s);
    ctx.restore();
  }

  /**
   * A turbidity current: every few minutes a cloud of silt breaks loose high on the slope and
   * rolls down it, billowing, thinning out as it goes. Thicker when the reef is choked with silt.
   */
  function drawSiltSlide(ctx: CanvasRenderingContext2D, t: number, siltLevel: number): void {
    const period = 210, length = 40;
    const u = ((t + 90) % period) / length;
    if (u >= 1) return;
    const s = scale();
    const a = Math.min(1, u * 5, (1 - u) * 3) * (0.35 + 0.4 * siltLevel);
    for (let k = 0; k < 14; k++) {
      const lag = k * 0.025;
      const p = u * 0.55 - lag;
      if (p < 0) continue;
      const su = 0.98 - p;
      const x = focus.x - focus.w * 0.1 + su * focus.w * 1.2;
      const y = slopeY(su) - (10 + (k % 3) * 9) * s;
      const r = (24 + k * 3 + u * 30) * s;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(175,160,130,${0.75 * a})`);
      g.addColorStop(1, 'rgba(175,160,130,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
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
    spot('manta', x, y, 45 * s);
    // Touched, it rolls right over, showing its pale belly, and glides on.
    const touch = startled('manta', t);
    const roll = touch && touch.age < 3 ? touch.age / 3 : 0;
    const tilt = Math.cos(roll * Math.PI * 2);
    ctx.save();
    ctx.translate(x, y);
    // Seen at a low angle: the wing span flattened, so it reads as a wide ray gliding past.
    ctx.scale(dir, 0.38 * (Math.abs(tilt) < 0.08 ? 0.08 * Math.sign(tilt || 1) : tilt));
    ctx.fillStyle = tilt < 0 ? 'rgba(200,210,225,0.8)' : 'rgba(12,30,62,0.75)';
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
    const touch = startled('rasp', t);
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
      spot('rasp', x, y, Math.max(len * 1.3, 22 * dpr));
      // Touched, the nearest Rasp turns to look, and lets fall a trickle of fine white sand:
      // what is left of the stone it has eaten.
      const met = touch && touch.age < 4 && Math.hypot(touch.x - x, touch.y - y) < len * 2.5 ? touch : null;
      if (met) {
        if (met.age < 2.5) dir = met.x >= x ? 1 : -1;
        ctx.fillStyle = 'rgba(250,246,232,0.95)';
        for (let j = 0; j < 16; j++) {
          const f = (met.age * 1.6 - j * 0.06);
          if (f < 0 || f > 1) continue;
          ctx.beginPath();
          ctx.arc(x - dir * len + Math.sin(j * 2.1) * 3 * s, y + len * 0.2 + f * 40 * s, 1.4 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
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
      drawWhaleShark(ctx, t);
      drawOarfish(ctx, t);
      drawMotes(ctx, t, v.siltLevel);
      drawRising(ctx, t, w, h, focus, dpr, v.rising, false);
      shoals.drawBack(ctx, focus, reef, L, v, t, '#1d3557');
      drawShelf(ctx, v.sandBars, v.siltLevel);
      drawChannels(ctx, t, v.channels);
      drawDaughters(ctx, v.polyps, (u) => [focus.x - focus.w * 0.1 + u * focus.w * 1.2, slopeY(u) + 3 * scale()], scale(), t,
        { branch: '#9a5a6c', tip: '#c98292', polyp: 'rgba(255,225,235,0.9)' }, slopeSeed, v.nurseries);
      drawSeaFans(ctx, t);
      drawGardenEels(ctx, t);
      drawMoray(ctx, t);
      drawCurrent(ctx, t, v.current);
      drawNautilus(ctx, t);
      drawFrogfish(ctx, t);
      drawSardineRun(ctx, t);
      drawOctopus(ctx, t);
      drawCleaningStation(ctx, t);
      drawWall(ctx, t, v.wall);
      drawRasp(ctx, t, v.rasp, v.raspTrust, v.raspPolite);
      if (v.gardeners) drawGardeners(ctx, t);
      drawSiltSlide(ctx, t, v.siltLevel);
      drawGhosts(ctx, focus, v.ancestors, v.height, t, scale(), 'rgba(190,210,240,1)');
      drawSisterFar(ctx, focus, v.sister - v.gauge, t, scale(), true);
      drawBreakwater(ctx, focus, v.works.breakwater, scale(), slopeY);
      reef.draw(ctx, L, v, t);
      drawRelics(ctx, reef, L, v.relics, t, v.moments['old-lamp'] === 'a');
      if (v.thorn?.kind === 'thorn-star') drawThorn(ctx, reef, L, v.thorn.u, v.thorn.side, t);
      slugs.draw(ctx, reef, L, t);
      drawResidents(ctx, reef, L, v.residents, t, seed,
        (x) => slopeY(Math.min(1, Math.max(0, (x - focus.x + focus.w * 0.1) / (focus.w * 1.2)))));
      this.crownAt = reef.crown(L);
      reef.drawEffects(ctx, L, v, effects.live(t));
      shoals.drawFront(ctx, focus, reef, L, v, t, '#1d3557');
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      vignette(ctx);
    },
  };
}
