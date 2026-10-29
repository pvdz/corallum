// The Midnight Water (Act II): black water with lights in it. The reef's upper growth rises
// out of the bottom of the frame; lanternfish shoals show what job each is doing — feeders
// circle the reef herding plankton, light-swimmers spiral above the crown, scouts dive into
// the dark below. Glass shrimp and a passing siphonophore appear once their bands are laid.

import { drawRising } from './rising.ts';
import { sight, spot, startled } from './sightings.ts';
import { drawGhosts } from './ghosts.ts';
import { drawSisterFar } from './sister.ts';
import { drawDragonfish } from './thorn.ts';
import { drawSpire } from './works.ts';
import { drawRelics } from './relics.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import { glow, speck } from './draw.ts';
import { createLayerCache } from './layer.ts';
import { createReef, type Reef, type ReefLayout } from './reef.ts';
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
    let x = focus.x + focus.w * (dir > 0 ? -0.1 + u * 1.2 : 1.1 - u * 1.2);
    const y = focus.y + focus.h * (0.25 + 0.12 * i) + Math.sin(t * 0.7 + i) * 12 * s;
    // Touched, a shrimp flicks its tail and shoots backwards, then drifts on.
    const touch = startled('glass-shrimp', t);
    if (touch && touch.age < 5 && Math.abs(touch.y - y) < 40 * s) {
      const a = touch.age;
      x -= dir * 70 * s * (1 - (1 - Math.min(1, a / 0.4)) ** 3) * Math.max(0, 1 - (a - 1) / 4);
    }
    spot('glass-shrimp', x, y, Math.max(18 * s, 24 * dpr));
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
    // Touched, the lure flares once and goes out; it comes back slowly, a little wary.
    const touch = startled('anglerfish', t);
    const age = touch ? touch.age : Infinity;
    const lit = age < 0.3 ? 1.8 : age < 4 ? 0 : Math.min(1, (age - 4) / 3);
    const pulse = (0.6 + 0.4 * Math.sin(t * 2.4)) * lit;
    spot('anglerfish', x, y, 45 * s);
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
    glow(ctx, 40 * s, -30 * s, 18 * s, '150,240,255', Math.min(1, 0.55 * pulse));
    if (lit > 0) glow(ctx, 40 * s, -30 * s, 4 * s, '230,255,255', 0.9 * Math.min(1, lit));
    ctx.restore();
  }

  /**
   * The seamount's flank below the reef: a dark shoulder of rock along the bottom of the frame,
   * sinking away as the reef climbs (it is fully in view only early in the Midnight Water).
   */
  function drawFlank(ctx: CanvasRenderingContext2D, p: number, t: number): void {
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
    // A whale fall on the flank: an old skeleton, the spine and the arcs of the ribs, pale in the dark.
    const s = scale() * 1.4;
    const wx = focus.x + focus.w * 0.2, wy = base - focus.h * 0.035;
    if (wy < h) {
      sight('whale-fall');
      spot('whale-fall', wx, wy, 60 * s);
      ctx.save();
      ctx.strokeStyle = 'rgba(200,205,225,0.55)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.moveTo(wx - 60 * s, wy + 2 * s);
      ctx.quadraticCurveTo(wx, wy - 4 * s, wx + 64 * s, wy + 3 * s);
      ctx.stroke();
      ctx.lineWidth = 1.5 * s;
      for (let k = 0; k < 11; k++) {
        const rx = wx - 44 * s + k * 7.5 * s;
        const rh = (14 - Math.abs(k - 4) * 1.4) * s;
        ctx.beginPath();
        ctx.moveTo(rx, wy - 1 * s);
        ctx.quadraticCurveTo(rx + 5 * s, wy - rh, rx + 2 * s, wy - rh * 1.25);
        ctx.stroke();
      }
      // The skull, and the lights of the small things living on it.
      ctx.fillStyle = 'rgba(200,205,225,0.45)';
      ctx.beginPath();
      ctx.ellipse(wx + 74 * s, wy, 13 * s, 6 * s, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // White mats of bacteria spreading over the bones and the silt beside them.
      ctx.fillStyle = 'rgba(235,240,245,0.16)';
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.ellipse(wx - 50 * s + k * 19 * s, wy + 3 * s, (8 + (k % 3) * 4) * s, 2.2 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Bone-eating worms: red fuzz along the spine and the rib bases, swaying.
      ctx.strokeStyle = 'rgba(230,70,90,0.75)';
      ctx.lineWidth = 0.8 * s;
      for (let k = 0; k < 26; k++) {
        const bx = wx - 56 * s + k * 4.6 * s;
        const by = wy + 1 * s - Math.sin((k / 25) * Math.PI) * 2.5 * s;
        const sw = Math.sin(t * 1.3 + k * 0.9) * 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + sw, by - (2 + (k % 3)) * s);
        ctx.stroke();
      }
      // A hagfish weaving slowly in and out of the ribs.
      const hp = (t * 0.05) % 1;
      const hx = wx - 60 * s + hp * 130 * s;
      ctx.strokeStyle = 'rgba(150,120,140,0.7)';
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      for (let q = 0; q <= 10; q++) {
        const qx = hx - q * 2.6 * s;
        const qy = wy - 6 * s + Math.sin(t * 2.4 - q * 0.7 + hx * 0.05 / s) * 2.2 * s;
        if (q === 0) ctx.moveTo(qx, qy);
        else ctx.lineTo(qx, qy);
      }
      ctx.stroke();
      // A crab picking over the skull.
      const cx2 = wx + 70 * s + Math.sin(t * 0.3) * 6 * s, cy2 = wy - 6 * s;
      ctx.fillStyle = 'rgba(210,130,110,0.85)';
      ctx.beginPath();
      ctx.ellipse(cx2, cy2, 3.2 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(210,130,110,0.85)';
      ctx.lineWidth = 0.7 * s;
      for (const side of [-1, 1]) {
        for (let l = 0; l < 3; l++) {
          const kick = Math.sin(t * 5 + l * 2 + side) * 0.8 * s;
          ctx.beginPath();
          ctx.moveTo(cx2 + side * 2.5 * s, cy2 + 0.5 * s);
          ctx.lineTo(cx2 + side * (5 + l) * s, cy2 + (2.5 + kick / s * 0.3) * s);
          ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 6; k++) glow(ctx, wx - 40 * s + k * 20 * s, wy - 4 * s, 4 * s, '255,140,180', 0.4);
      ctx.restore();
    }
  }

  /**
   * A vampire squid drifting past: a small dark-red body with a webbed cloak of arms that opens
   * and closes slowly, and glowing tips at the ends of its fins.
   */
  function drawVampireSquid(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 130, crossing = 60;
    const u = ((t + 40) % period) / crossing;
    if (u >= 1) return;
    sight('vampire-squid');
    const s = scale() * 2.6;
    const lap = Math.floor((t + 40) / period);
    const dir = lap % 2 ? 1 : -1;
    const x = focus.x + focus.w * (dir > 0 ? -0.08 + u * 1.16 : 1.08 - u * 1.16);
    const y = focus.y + focus.h * (0.34 + 0.06 * Math.sin(lap * 2.1)) + Math.sin(t * 0.7) * 10 * s;
    // Touched, it throws out a cloud of glowing blue mucus where it was and pulls its cape wide.
    const touch = startled('vampire-squid', t);
    const age = touch ? touch.age : Infinity;
    if (age < 8) drawMucus(ctx, touch!.x, touch!.y, age, s);
    const startle = age < 3 ? 1 - age / 3 : 0;
    const open = (0.5 + 0.5 * Math.sin(t * 1.4)) * (1 - startle) + startle * 1.3;
    spot('vampire-squid', x, y, 30 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.rotate(-Math.PI / 2 + 0.3);
    // The cloak: a web between the arms, wider when it opens.
    ctx.fillStyle = 'rgba(55,8,20,0.8)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let a = 0; a <= 8; a++) {
      const ang = Math.PI / 2 + (a / 8 - 0.5) * (0.8 + 1.4 * open);
      ctx.lineTo(Math.cos(ang) * 16 * s, Math.sin(ang) * 16 * s);
    }
    ctx.closePath();
    ctx.fill();
    // Arm ribs through the web, curling at the tips.
    ctx.strokeStyle = 'rgba(160,40,60,0.9)';
    ctx.lineWidth = 1.1 * s;
    for (let a = 0; a <= 8; a++) {
      const ang = Math.PI / 2 + (a / 8 - 0.5) * (0.8 + 1.4 * open);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(ang) * 12 * s, Math.sin(ang) * 12 * s, Math.cos(ang + 0.3) * 17 * s, Math.sin(ang + 0.3) * 17 * s);
      ctx.stroke();
    }
    // The mantle, with its two fins.
    ctx.fillStyle = 'rgba(130,25,45,0.95)';
    ctx.beginPath();
    ctx.ellipse(0, -9 * s, 5 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 5 * s, -14 * s, 4 * s, 2 * s, side * 0.6 + Math.sin(t * 3) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Big blue eyes.
    ctx.fillStyle = 'rgba(120,200,255,0.9)';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 2.6 * s, -3 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const side of [-1, 1]) glow(ctx, side * 8.5 * s, -15 * s, 5 * s, '140,200,255', 0.5 + 0.4 * open);
    ctx.restore();
  }

  /** A vampire squid's defence: sticky glowing mucus, a cloud of blue sparks drifting and fading. */
  function drawMucus(ctx: CanvasRenderingContext2D, x: number, y: number, age: number, s: number): void {
    const spread = 1 - Math.exp(-age * 1.5);
    const fade = Math.max(0, 1 - age / 8);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const a = i * 2.399, r = Math.sqrt((i + 0.5) / 40) * 26 * s * spread;
      const tw = 0.6 + 0.4 * Math.sin(age * 6 + i * 1.7);
      glow(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.8 + age * 2 * s, 3.2 * s, '110,190,255', 0.8 * fade * tw);
    }
    ctx.restore();
  }

  /**
   * A pyrosome: a glowing tube colony drifting slowly, its light rippling along its length in
   * waves, each little animal in it flashing in turn.
   */
  function drawPyrosome(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale() * 1.5;
    const u = ((t * 0.006) % 1.4) - 0.2;
    if (u < -0.15 || u > 1.15) return;
    sight('pyrosome');
    const x = focus.x + focus.w * (1 - u), y = focus.y + focus.h * 0.62 + Math.sin(t * 0.25) * 12 * s;
    spot('pyrosome', x, y, 40 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.25 + Math.sin(t * 0.2) * 0.08);
    const len = 70 * s, rad = 9 * s;
    ctx.fillStyle = 'rgba(160,180,255,0.08)';
    ctx.strokeStyle = 'rgba(180,200,255,0.25)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0, len / 2, rad, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    // Touched, a bright wave runs the length of the colony and on into the water: each animal
    // flashes when its neighbour does.
    const touch = startled('pyrosome', t);
    const age = touch ? touch.age : Infinity;
    for (let k = 0; k < 26; k++) {
      const f = k / 25;
      const px = (f - 0.5) * len * 0.92;
      const py = Math.sin(k * 2.3) * rad * 0.6;
      const wave = Math.max(0, Math.sin(t * 2 - f * 8));
      const run = age < 3 ? Math.exp(-((f - age / 1.2) ** 2) / 0.01) * (1 - age / 3) : 0;
      glow(ctx, px, py, (5 + 4 * run) * s, run > 0.2 ? '170,215,255' : '120,170,255', Math.min(1, 0.15 + 0.7 * wave * wave + run));
    }
    ctx.restore();
  }

  /**
   * Lamp-nets: webs of glimmerseed strung between pairs of branches, a few lights trembling at the
   * knots; one more for each net woven (up to six drawn).
   */
  function drawNets(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, n: number, t: number): void {
    const c = reef.coral;
    const r = mulberry32(0x7e75);
    const pool: number[] = [];
    for (let i = 0; i < c.count; i++) if (c.y[i]! < L.top * 0.85 && c.y[i]! > L.top * 0.3) pool.push(i);
    if (pool.length < 4) return;
    ctx.save();
    for (let k = 0; k < Math.min(6, n); k++) {
      // Two nodes on either side of the trunk at about the same height.
      const a = pool[Math.floor(r() * pool.length)]!;
      let b = a, best = Infinity;
      for (const j of pool) {
        const dx = c.x[j]! - c.x[a]!, dy = Math.abs(c.y[j]! - c.y[a]!);
        if (Math.abs(dx) > 0.12 && Math.abs(dx) < 0.35 && dy < best) { best = dy; b = j; }
      }
      if (b === a) continue;
      const [ax, ay] = reef.nodePx(L, a), [bx, by] = reef.nodePx(L, b);
      const sag = 0.15 * Math.hypot(bx - ax, by - ay);
      ctx.strokeStyle = 'rgba(150,210,255,0.4)';
      ctx.lineWidth = 1.1 * L.dpr;
      for (let q = 0; q < 4; q++) {
        ctx.beginPath();
        ctx.moveTo(ax, ay + q * 4 * L.s);
        ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag + q * 4 * L.s, bx, by + q * 4 * L.s);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (let q = 1; q < 6; q++) {
        const u = q / 6, x = ax + (bx - ax) * u, y = ay + (by - ay) * u + sag * 4 * u * (1 - u) + 6 * L.s;
        glow(ctx, x, y, 6 * L.s, '130,200,255', 0.5 + 0.3 * Math.sin(t * 2 + q + k));
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  /**
   * The anglerfish the reef shared the dark with (a moment): it hangs beside the crown, a dark
   * round shape barely seen, its lure bobbing close to your own light.
   */
  function drawKeptAngler(ctx: CanvasRenderingContext2D, t: number, x: number, y: number): void {
    const s = scale() * 1.3;
    const bob = Math.sin(t * 0.7) * 3 * s;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = 'rgba(20,22,34,0.92)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-12 * s, 0); ctx.lineTo(-22 * s, -6 * s); ctx.lineTo(-22 * s, 6 * s); ctx.closePath();
    ctx.fill();
    // Teeth, faintly.
    ctx.strokeStyle = 'rgba(220,225,235,0.5)';
    ctx.lineWidth = 0.6 * s;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(8 * s + k * 1.4 * s, 3 * s);
      ctx.lineTo(8.5 * s + k * 1.4 * s, 5.5 * s);
      ctx.stroke();
    }
    // The stalk and its lure.
    const lx = 22 * s + Math.sin(t * 1.3) * 2 * s, ly = -16 * s + Math.cos(t * 1.1) * 2 * s;
    ctx.strokeStyle = 'rgba(60,64,80,0.9)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(6 * s, -8 * s);
    ctx.quadraticCurveTo(16 * s, -22 * s, lx, ly);
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, lx, ly, 9 * s, '160,240,255', 0.55 + 0.25 * Math.sin(t * 2));
    ctx.restore();
  }

  /**
   * The cold seep beside the reef (a moment): a crack at the bottom of the frame ringed with white
   * mats, a slow stream of bubbles going up; built over, it is crusted chalk-white instead.
   */
  function drawSeep(ctx: CanvasRenderingContext2D, t: number, L: ReefLayout, built: boolean): void {
    const s = scale();
    const x = L.cx + focus.w * 0.24, y = focus.y + focus.h * 0.985;
    ctx.save();
    ctx.fillStyle = built ? 'rgba(235,230,215,0.85)' : 'rgba(230,235,240,0.55)';
    for (let k = 0; k < 9; k++) {
      ctx.beginPath();
      ctx.ellipse(x + (k - 4) * 9 * s + Math.sin(k * 2.3) * 4 * s, y - Math.abs(Math.sin(k * 1.7)) * 4 * s, (8 + (k % 3) * 3) * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(8,10,16,0.9)';
    ctx.beginPath();
    ctx.ellipse(x, y, 7 * s, 2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!built) {
      ctx.strokeStyle = 'rgba(200,220,255,0.5)';
      ctx.lineWidth = 0.8 * s;
      for (let k = 0; k < 10; k++) {
        const u = ((t * 0.12 + k * 0.137) % 1);
        const bx = x + Math.sin(t * 1.5 + k) * 4 * s + u * 10 * s, by = y - u * focus.h * 0.5;
        ctx.beginPath();
        ctx.arc(bx, by, (1.5 + u * 2) * s, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * The fire-body the reef kept (a moment): a shorter glowing tube hung across the branches below
   * the crown, rippling slowly, still alive.
   */
  function drawKeptFireBody(ctx: CanvasRenderingContext2D, t: number, x: number, y: number): void {
    const s = scale() * 1.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.5 + Math.sin(t * 0.3) * 0.04);
    const len = 46 * s, rad = 6 * s;
    ctx.fillStyle = 'rgba(160,180,255,0.1)';
    ctx.strokeStyle = 'rgba(180,200,255,0.3)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0, len / 2, rad, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 16; k++) {
      const f = k / 15;
      const wave = Math.max(0, Math.sin(t * 1.4 - f * 7));
      glow(ctx, (f - 0.5) * len * 0.9, Math.sin(k * 2.3) * rad * 0.6, 4 * s, '120,170,255', Math.min(1, 0.18 + 0.6 * wave * wave));
    }
    ctx.restore();
  }

  /**
   * A lantern shark: every few minutes a small dark shark cruises slowly across low in the water,
   * its belly lit with a soft line of light. Touched, its light goes out and it slips away faster.
   */
  function drawLanternShark(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 260, pass = 60;
    const touch = startled('lantern-shark', t);
    let u = (t % period) / pass;
    if (touch && touch.age < 10 && u < 1.2) u += touch.age * 0.06;
    if (u >= 1) return;
    sight('lantern-shark');
    const s = scale() * 1.6;
    const dir = Math.floor(t / period) % 2 ? -1 : 1;
    const x = focus.x + focus.w * (dir > 0 ? -0.1 + u * 1.2 : 1.1 - u * 1.2), y = focus.y + focus.h * 0.7 + Math.sin(t * 0.3) * 6 * s;
    spot('lantern-shark', x, y, 26 * s);
    const lit = touch && touch.age < 10 ? 0 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const sway = Math.sin(t * 2) * 2 * s;
    ctx.fillStyle = '#141824';
    ctx.beginPath();
    ctx.moveTo(18 * s, 0);
    ctx.quadraticCurveTo(10 * s, -5 * s, -8 * s, -3 * s);
    ctx.lineTo(-16 * s, -7 * s + sway);
    ctx.lineTo(-14 * s, 0);
    ctx.lineTo(-17 * s, 5 * s + sway);
    ctx.lineTo(-8 * s, 2 * s);
    ctx.quadraticCurveTo(8 * s, 5 * s, 18 * s, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2 * s, -4 * s); ctx.lineTo(-2 * s, -9 * s); ctx.lineTo(-4 * s, -3.5 * s); ctx.fill();
    if (lit) {
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 6; k++) glow(ctx, (12 - k * 4) * s, 2.5 * s, 4 * s, '120,190,255', 0.35);
      glow(ctx, 14 * s, -1 * s, 2.5 * s, '180,255,220', 0.6);
    }
    ctx.restore();
  }

  /**
   * Rarely, a giant larvacean: a mucus house as wide as the crown drifting slowly across, an inner
   * filter like folded wings, and in it a small tadpole whose beating tail pumps the water through.
   * Touched, the tadpole bolts out of the back and the empty house drifts on, slowly collapsing.
   */
  function drawLarvacean(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 1320, pass = 110;
    const u = ((t + 700) % period) / pass;
    if (u >= 1) return;
    sight('larvacean');
    const s = scale() * 1.6;
    const x = focus.x + focus.w * (1.1 - u * 1.2), y = focus.y + focus.h * 0.16 + Math.sin(t * 0.2) * 10 * s;
    spot('larvacean', x, y, 50 * s);
    const touch = startled('larvacean', t);
    const left = touch ? Math.min(1, touch.age / 8) : 0;
    ctx.save();
    ctx.translate(x, y);
    // The outer house: a clear, faintly lit bubble, sagging once abandoned.
    ctx.strokeStyle = `rgba(170,200,255,${0.22 * (1 - 0.5 * left)})`;
    ctx.fillStyle = `rgba(120,160,230,${0.06 * (1 - 0.5 * left)})`;
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.ellipse(0, 4 * s * left, 46 * s, (34 - 12 * left) * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // The inner filter: two folded wings of fine mesh.
    ctx.strokeStyle = `rgba(190,215,255,${0.18 * (1 - left)})`;
    for (const side of [-1, 1]) {
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(side * 16 * s, (-12 + k * 4) * s, side * 26 * s, (-14 + k * 5) * s);
        ctx.stroke();
      }
    }
    // The tadpole: a small bright trunk and a beating tail; gone once touched.
    const tx = left > 0 ? -left * 140 * s : 0;
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, tx, 0, 7 * s, '200,225,255', 0.5);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(220,235,255,0.7)';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(tx, 0);
    for (let i = 1; i <= 8; i++) ctx.lineTo(tx + i * 2 * s, Math.sin(t * (left > 0 ? 30 : 14) - i * 0.9) * 2.5 * s * (i / 8));
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Rarely, a giant squid: once in every twenty minutes a huge dim shape slides through the deep
   * background, arms trailing, one eye the size of a dinner plate catching the reef's light.
   */
  /** `curious`: you held your light when it first passed (a moment), and it comes twice as often. */
  function drawGiantSquid(ctx: CanvasRenderingContext2D, t: number, curious = false): void {
    const period = curious ? 600 : 1200, crossing = 50;
    const u = ((t + 600) % period) / crossing;
    if (u >= 1) return;
    sight('giant-squid');
    const s = scale() * 3.2;
    const x = focus.x + focus.w * (1.25 - u * 1.5), y = focus.y + focus.h * 0.4 + Math.sin(t * 0.2) * 10 * s;
    spot('giant-squid', x, y, 60 * s);
    const pulse = Math.sin(t * 0.9);
    ctx.save();
    ctx.translate(x, y);
    // Touched, it is gone: it pulls back into the dark, and you are not sure you saw it.
    const touch = startled('giant-squid', t);
    const gone = touch && touch.age <= (t + 600) % period ? Math.min(1, touch.age / 1.5) : 0;
    ctx.globalAlpha = 0.55 * Math.min(1, u * 6, (1 - u) * 6) * (1 - gone);
    ctx.fillStyle = '#3a1820';
    // Mantle with its fins, pointing forward (left).
    ctx.beginPath();
    ctx.moveTo(-40 * s, 0);
    ctx.quadraticCurveTo(-20 * s, -9 * s, 8 * s, -6 * s);
    ctx.lineTo(8 * s, 6 * s);
    ctx.quadraticCurveTo(-20 * s, 9 * s, -40 * s, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-40 * s, 0);
    ctx.lineTo(-30 * s, -9 * s + pulse * 2 * s);
    ctx.lineTo(-28 * s, 9 * s - pulse * 2 * s);
    ctx.fill();
    // Arms: long, slowly undulating, two much longer than the rest.
    ctx.strokeStyle = '#3a1820';
    ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const long = k < 2;
      const len = (long ? 60 : 26) * s;
      const off = (k - 3.5) * 1.3 * s;
      ctx.lineWidth = (long ? 1.2 : 2) * s;
      ctx.beginPath();
      ctx.moveTo(8 * s, off);
      ctx.bezierCurveTo(8 * s + len * 0.3, off + Math.sin(t + k) * 4 * s,
        8 * s + len * 0.7, off * 2 + Math.sin(t * 0.8 + k) * 6 * s, 8 * s + len, off * 3 + Math.sin(t * 0.6 + k) * 8 * s);
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x + 4 * s, y - 2 * s, 3 * s, '180,200,255', 0.5 * Math.min(1, u * 6, (1 - u) * 6) * (1 - gone));
    ctx.restore();
  }

  /**
   * The migration: every eight minutes, for forty seconds, the deep rises. Hundreds of tiny
   * lights (krill, fish, shrimp) stream up past the reef from below, the largest journey any
   * animals make, made every night.
   */
  /**
   * A milky sea (rare): once every forty minutes, for two, the whole water glows a soft even blue
   * from countless bacteria, fading in and out. Touching it stirs brighter swirls where the finger was.
   */
  function drawMilkySea(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 2400, length = 120;
    const u = ((t + 900) % period) / length;
    if (u >= 1) return;
    sight('milky-sea');
    const k = Math.min(1, u * 5, (1 - u) * 5);
    spot('milky-sea', focus.x + focus.w * 0.75, focus.y + focus.h * 0.3, focus.h * 0.15);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(90,150,255,${0.12 * k})`;
    ctx.fillRect(focus.x, focus.y, focus.w, focus.h);
    const touch = startled('milky-sea', t);
    if (touch && touch.age < 4) {
      for (let i = 0; i < 6; i++) {
        const a = i + touch.age * 1.5;
        glow(ctx, touch.x + Math.cos(a) * touch.age * 30, touch.y + Math.sin(a) * touch.age * 20, 40 * scale(), '140,200,255', 0.4 * (1 - touch.age / 4));
      }
    }
    ctx.restore();
  }

  function drawMigration(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 480, length = 40;
    const u = ((t + 150) % period) / length;
    if (u >= 1) return;
    sight('migration');
    const s = scale();
    const swell = Math.min(1, u * 4, (1 - u) * 4);
    if (swell > 0.5) spot('migration', focus.x + focus.w * 0.3, focus.y + focus.h * 0.45, focus.h * 0.12);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const n = Math.round(260 * swell);
    for (let i = 0; i < n; i++) {
      const fx = (i * 0.618) % 1, speed = 0.25 + ((i * 0.37) % 1) * 0.35;
      const y = h - (((u * length * speed * 0.05 + (i * 0.173) % 1) % 1.1) * h * 1.05);
      const x = focus.x + focus.w * fx + Math.sin(t * 0.8 + i) * 6 * s;
      const hue = i % 5 === 0 ? '255,190,140' : i % 3 === 0 ? '170,255,220' : '140,200,255';
      glow(ctx, x, y, (4 + (i % 3) * 1.5) * s, hue, 0.85 * swell);
      glow(ctx, x, y + 9 * s, 3 * s, hue, 0.35 * swell);
      glow(ctx, x, y + 17 * s, 2 * s, hue, 0.15 * swell);
    }
    ctx.restore();
  }

  /** Comb jellies: glassy ovals whose eight comb rows ripple with travelling rainbow light. */
  function drawComb(ctx: CanvasRenderingContext2D, c: Comb, t: number): void {
    sight('comb-jelly');
    const s = scale() * c.size;
    const x = focus.x + focus.w * (0.5 + c.x + Math.sin(t * 0.03 + c.phase) * 0.04);
    const y = focus.y + focus.h * (c.y + Math.sin(t * 0.05 + c.phase * 2) * 0.03);
    const rx = 16 * s, ry = 26 * s;
    spot('comb-jelly', x, y, Math.max(ry, 24 * dpr));
    // Touched, its combs beat hard: the rainbow runs fast and bright for a moment.
    const touch = startled('comb-jelly', t);
    const beat = touch && touch.age < 3 && Math.hypot(touch.x - x, touch.y - y) < ry * 1.5 ? 1 - touch.age / 3 : 0;
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
        const a = Math.min(1, (0.25 + 0.35 * Math.max(0, Math.sin(t * (4 + 8 * beat) - q * 0.8 + row)) + 0.6 * beat) * (0.5 + 0.5 * bow));
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
    // Near the top of the zone the first grey light reaches down: a few faint shafts.
    const near = Math.max(0, (p - 0.75) / 0.25);
    if (near > 0) {
      for (let i = 0; i < 4; i++) {
        const bx = cx() + focus.w * ((i - 1.5) * 0.18) + Math.sin(t * 0.05 + i * 1.9) * focus.w * 0.02;
        const lg = ctx.createLinearGradient(0, 0, 0, h * 0.75);
        lg.addColorStop(0, `rgba(120,150,210,${0.07 * near})`);
        lg.addColorStop(1, 'rgba(120,150,210,0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(bx - focus.w * 0.015, 0);
        ctx.lineTo(bx + focus.w * 0.015, 0);
        ctx.lineTo(bx + focus.w * 0.06 - focus.w * 0.05, h * 0.75);
        ctx.lineTo(bx - focus.w * 0.06 - focus.w * 0.05, h * 0.75);
        ctx.closePath();
        ctx.fill();
      }
    }
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

  /** Near flakes, in front of the reef: bigger, softer and faster, so the snow has depth. */
  function drawNearSnow(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.fillStyle = 'rgba(200,215,245,0.22)';
    for (let i = 0; i < flakes.length; i += 6) {
      const f = flakes[i]!;
      const y = ((f.y + 0.3 + t * f.speed * 2.2) % 1) * (h + 20) - 10;
      const x = (((f.x + 0.5 + Math.sin(t * 0.2 + f.phase) * 0.006) % 1) + 1) % 1 * w;
      ctx.beginPath();
      ctx.arc(x, y, f.r * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Marine snow; above the snowline (that band) the Long Silt thins to a third. */
  function drawSnow(ctx: CanvasRenderingContext2D, t: number, thin: boolean): void {
    ctx.fillStyle = 'rgba(190,205,240,0.35)';
    for (const [i, f] of flakes.entries()) {
      if (thin && i % 3) continue;
      const y = ((f.y + t * f.speed) % 1) * (h + 10) - 5;
      const x = (((f.x + Math.sin(t * 0.25 + f.phase) * 0.003) % 1) + 1) % 1 * w;
      speck(ctx, x, y, f.r);
    }
  }

  /**
   * Hatchetfish: a small school of silver blades drifting together, belly lights pointing down.
   * Touched, every belly light flares at once and the school scatters, then gathers again.
   */
  function drawHatchetfish(ctx: CanvasRenderingContext2D, t: number): void {
    sight('hatchetfish');
    const s = scale() * 1.2;
    const touch = startled('hatchetfish', t);
    const scatter = touch && touch.age < 5 ? Math.sin(Math.min(1, touch.age / 5) * Math.PI) : 0;
    const flare = touch && touch.age < 1.5 ? 1 - touch.age / 1.5 : 0;
    const cx = focus.x + focus.w * (0.72 + 0.06 * Math.sin(t * 0.05)), cy = focus.y + focus.h * (0.34 + 0.04 * Math.sin(t * 0.08));
    spot('hatchetfish', cx, cy, 50 * s);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39;
      const ox = Math.cos(a) * (14 + (i % 3) * 9) * s * (1 + scatter * 3), oy = Math.sin(a) * (8 + (i % 2) * 6) * s * (1 + scatter * 3);
      const x = cx + ox + Math.sin(t * 0.7 + i) * 3 * s, y = cy + oy + Math.cos(t * 0.5 + i) * 2 * s;
      ctx.save();
      ctx.translate(x, y);
      if (i % 2) ctx.scale(-1, 1);
      // The blade: deep at the front, a thin tail.
      const g = ctx.createLinearGradient(0, -5 * s, 0, 5 * s);
      g.addColorStop(0, '#9fb0c8');
      g.addColorStop(1, '#4a5872');
      ctx.fillStyle = g;
      // Arched back, a deep keel of a belly, a small forked tail.
      ctx.beginPath();
      ctx.moveTo(5 * s, -1 * s);
      ctx.quadraticCurveTo(2 * s, -4 * s, -2 * s, -3 * s);
      ctx.lineTo(-5 * s, -1 * s);
      ctx.lineTo(-8 * s, -2.6 * s);
      ctx.lineTo(-7 * s, 0 * s);
      ctx.lineTo(-8 * s, 1.8 * s);
      ctx.lineTo(-5 * s, 0.6 * s);
      ctx.quadraticCurveTo(-1 * s, 7 * s, 4 * s, 3 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,235,255,0.5)';
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      ctx.moveTo(3.5 * s, -0.5 * s);
      ctx.quadraticCurveTo(0, 2 * s, -4 * s, 0);
      ctx.stroke();
      ctx.fillStyle = '#1a1e2a';
      ctx.beginPath();
      ctx.arc(3.2 * s, -1.4 * s, 1.1 * s, 0, Math.PI * 2);
      ctx.fill();
      // Belly lights pointing down.
      ctx.globalCompositeOperation = 'lighter';
      for (let q = 0; q < 4; q++) glow(ctx, (2.5 - q * 1.6) * s, (3.2 - q * 0.4) * s, (2 + flare * 4) * s, '120,170,255', 0.45 + flare * 0.5);
      ctx.restore();
    }
  }

  /**
   * The barreleye: a small dark fish hanging still, its head a transparent dome with two green tube
   * eyes inside, turned up toward the faint light. Touched, the eyes swing forward to look at you.
   */
  function drawBarreleye(ctx: CanvasRenderingContext2D, t: number): void {
    sight('barreleye');
    const s = scale() * 1.6;
    const x = focus.x + focus.w * 0.2 + Math.sin(t * 0.07) * 20 * s, y = focus.y + focus.h * 0.3 + Math.sin(t * 0.11) * 10 * s;
    const touch = startled('barreleye', t);
    const look = touch && touch.age < 6 ? Math.sin(Math.min(1, touch.age / 6) * Math.PI) : 0;
    spot('barreleye', x, y, 20 * s);
    ctx.save();
    ctx.translate(x, y);
    // Body: dark, with big fins held out, sculling gently.
    ctx.fillStyle = '#1c1a26';
    ctx.beginPath();
    ctx.moveTo(10 * s, 0);
    ctx.quadraticCurveTo(4 * s, 5 * s, -10 * s, 2 * s);
    ctx.lineTo(-16 * s, 4 * s + Math.sin(t * 2) * 1.5 * s);
    ctx.lineTo(-15 * s, -2 * s + Math.sin(t * 2) * 1.5 * s);
    ctx.lineTo(-10 * s, -1 * s);
    ctx.quadraticCurveTo(0, -3 * s, 10 * s, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,60,80,0.6)';
    ctx.beginPath();
    ctx.ellipse(-2 * s, 3 * s, 6 * s, 2 * s, 0.4 + Math.sin(t * 1.3) * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // The clear dome of the head.
    ctx.fillStyle = 'rgba(170,210,230,0.12)';
    ctx.strokeStyle = 'rgba(190,230,250,0.45)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.ellipse(5 * s, -4 * s, 7 * s, 6 * s, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.stroke();
    // Two green tube eyes inside the dome: up, or forward when touched.
    const a = -Math.PI / 2 + look * (Math.PI / 2);
    for (const ox of [3 * s, 6 * s]) {
      const ex = ox + Math.cos(a) * 3 * s, ey = -3 * s + Math.sin(a) * 3 * s;
      ctx.strokeStyle = '#4fdc7a';
      ctx.lineWidth = 2.2 * s;
      ctx.beginPath();
      ctx.moveTo(ox, -2.5 * s);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, ex, ey, 5 * s, '90,255,140', 0.6);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  function drawSiphonophore(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    const period = 140;
    const u = (t % period) / period;
    if (u > 0.55) return;
    sight('siphonophore');
    const head = -0.25 + (u / 0.55) * 1.6;
    const y0 = focus.y + focus.h * 0.22;
    spot('siphonophore', focus.x + (head - 0.3) * focus.w, y0 + 10 * s, Math.max(focus.w * 0.3, 40 * s));
    // Touched, a flash runs down the whole chain from the head.
    const touch = startled('siphonophore', t);
    const run = touch && touch.age < 2.5 ? touch.age / 1.8 : -1;
    ctx.save();
    for (let k = 0; k < 34; k++) {
      const xu = head - k * 0.018;
      if (xu < -0.1 || xu > 1.1) continue;
      const x = focus.x + xu * focus.w;
      const y = y0 + Math.sin(xu * 7 + t * 0.4) * 18 * s + k * 0.6 * s;
      const pulse = Math.min(1.6, 0.5 + 0.5 * Math.sin(t * 3 - k * 0.5) + (run >= 0 ? 1.5 * Math.exp(-((k / 34 - run) ** 2) / 0.006) : 0));
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
      drawRising(ctx, t, w, h, focus, dpr, v.rising, true);
      drawGiantSquid(ctx, t, v.moments.squid === 'b');
      drawLarvacean(ctx, t);
      drawLanternShark(ctx, t);
      // The old stone's lights answer the scouts listening at it.
      // Each Reading of Thousandfold's bands wakes more of the lights in its drowned towers.
      // A Reading just read: every light in the old stone flares, then settles.
      const read = effects.live(t).find((e) => e.kind === 'reading');
      const flare = read ? Math.max(0, 1 - read.age / 2.2) : 0;
      ruins.draw(ctx, w, h, focus, v.height, RUINS, t, [0, 1, 2],
        Math.min(1, Math.min(1, v.jobs.scout / 8) + flare), Math.min(1, (1 + v.readings) / 10 + flare));
      drawAngler(ctx, t);
      for (const c of combs) drawComb(ctx, c, t);
      drawVampireSquid(ctx, t);
      drawPyrosome(ctx, t);
      drawMigration(ctx, t);
      if (v.bands.includes('glass')) for (let i = 0; i < 4; i++) swimShrimp(ctx, t, i);
      if (v.bands.includes('siphon')) drawSiphonophore(ctx, t);
      drawSnow(ctx, t, v.bands.includes('snowline'));
      shoals.drawBack(ctx, focus, reef, L, v, t);
      drawFlank(ctx, p, t);
      drawGhosts(ctx, focus, v.ancestors, v.height, t, scale(), 'rgba(170,180,230,1)');
      drawSisterFar(ctx, focus, v.sister - v.gauge, t, scale(), false);
      drawSpire(ctx, focus, v.works.spire, scale(), t, focus.y + focus.h * 0.99);
      if (v.moments.seep) drawSeep(ctx, t, L, v.moments.seep === 'b');
      reef.draw(ctx, L, v, t);
      drawRelics(ctx, reef, L, v.relics, t, v.moments['old-lamp'] === 'a');
      if (v.nets > 0) drawNets(ctx, reef, L, v.nets, t);
      if (v.moments.angler === 'b') {
        const [crx, cry] = reef.crown(L);
        drawKeptAngler(ctx, t, crx + 70 * scale(), cry + (L.baseY - cry) * 0.18);
      }
      if (v.moments['fire-body'] === 'a') {
        const [crx, cry] = reef.crown(L);
        drawKeptFireBody(ctx, t, L.cx + (crx - L.cx) * 0.5 - 30 * scale(), cry + (L.baseY - cry) * 0.3);
      }
      this.crownAt = reef.crown(L);
      reef.drawEffects(ctx, L, v, effects.live(t));
      shoals.drawFront(ctx, focus, reef, L, v, t);
      drawHatchetfish(ctx, t);
      drawBarreleye(ctx, t);
      drawMilkySea(ctx, t);
      if (v.thorn?.kind === 'dragonfish') drawDragonfish(ctx, focus, v.thorn.u, v.thorn.side, t, scale());
      drawNearSnow(ctx, t);
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      vignette(ctx);
    },
  };
}
