// The Midnight Water (Act II): black water with lights in it. The reef's upper growth rises
// out of the bottom of the frame; lanternfish shoals show what job each is doing — feeders
// circle the reef herding plankton, light-swimmers spiral above the crown, scouts dive into
// the dark below. Glass shrimp and a passing siphonophore appear once their bands are laid.

import { drawRising } from './rising.ts';
import { sight, speaking, spot, startled, pushed } from './sightings.ts';
import { drawGhosts } from './ghosts.ts';
import { drawSisterFar } from './sister.ts';
import { drawDragonfish } from './thorn.ts';
import { drawDome, drawSpire } from './works.ts';
import { drawRelics } from './relics.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import { drawDarkness, facing, glow, speck, whaleSilhouette } from './draw.ts';
import { createLayerCache } from './layer.ts';
import { createForeground } from './foreground.ts';
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
  // Its own fan in the corner, not the Silt Floor's again.
  const fore = createForeground(seed ^ 0x2b1d);

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
   * An anglerfish at the origin, facing +x: a globular dark body with a high forehead, a huge upturned
   * mouth (the lower jaw jutting past the upper) set with uneven glassy fangs, a small eye, a fanned
   * tail and small soft fins, the rod rising from the forehead to a fleshy bulb at (40, −30)·s (its
   * light is the caller's). Only the forehead catches the lure's light.
   */
  function anglerBody(ctx: CanvasRenderingContext2D, s: number, t: number): void {
    const wave = Math.sin(t * 3);
    // The tail: a rounded fan of rays on a thin stock, sculling.
    ctx.fillStyle = 'rgba(24,22,36,0.92)';
    ctx.beginPath();
    ctx.moveTo(-24 * s, -3 * s);
    ctx.quadraticCurveTo(-34 * s, (-14 + wave * 2) * s, -41 * s, (-12 + wave * 3) * s);
    ctx.quadraticCurveTo(-45 * s, (wave * 3) * s, -41 * s, (11 + wave * 3) * s);
    ctx.quadraticCurveTo(-34 * s, (12 + wave * 2) * s, -24 * s, 5 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,96,130,0.35)';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const v = -1 + k / 2;
      ctx.moveTo(-25 * s, v * 2.5 * s);
      ctx.lineTo(-41 * s, (v * 10 + wave * 3) * s);
    }
    ctx.stroke();
    // Small soft dorsal and anal fins near the tail.
    ctx.fillStyle = 'rgba(28,26,42,0.9)';
    ctx.beginPath();
    ctx.moveTo(-10 * s, -17 * s);
    ctx.quadraticCurveTo(-18 * s, (-24 + wave) * s, -24 * s, -6 * s);
    ctx.moveTo(-12 * s, 15 * s);
    ctx.quadraticCurveTo(-20 * s, (20 - wave) * s, -24 * s, 4 * s);
    ctx.fill();
    // The body: a high forehead falling to the tail stock, the round belly, the jaws.
    const body = ctx.createRadialGradient(14 * s, -16 * s, 0, 2 * s, 0, 30 * s);
    body.addColorStop(0, 'rgba(58,62,92,0.96)');
    body.addColorStop(0.45, 'rgba(30,28,46,0.96)');
    body.addColorStop(1, 'rgba(14,12,22,0.96)');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(25 * s, -10 * s);
    ctx.bezierCurveTo(22 * s, -20 * s, 10 * s, -25 * s, -2 * s, -22 * s);
    ctx.bezierCurveTo(-14 * s, -20 * s, -20 * s, -10 * s, -25 * s, -4 * s);
    ctx.lineTo(-25 * s, 6 * s);
    ctx.bezierCurveTo(-20 * s, 16 * s, -6 * s, 23 * s, 8 * s, 20 * s);
    ctx.bezierCurveTo(20 * s, 17 * s, 30 * s, 10 * s, 33 * s, 3 * s);
    ctx.lineTo(30 * s, 3.5 * s);
    ctx.lineTo(4 * s, 2 * s);
    ctx.closePath();
    ctx.fill();
    // The mouth: a dark gape from the jaws' tips back to the corner under the eye.
    ctx.fillStyle = 'rgba(4,3,10,0.97)';
    ctx.beginPath();
    ctx.moveTo(25 * s, -10 * s);
    ctx.quadraticCurveTo(13 * s, -6 * s, 3 * s, 2 * s);
    ctx.quadraticCurveTo(18 * s, 9 * s, 33 * s, 3 * s);
    ctx.closePath();
    ctx.fill();
    // Glassy fangs of every length: the upper ones hang, the lower ones rise, the longest at the front
    // and a few of the lower ones standing outside the lip.
    ctx.fillStyle = 'rgba(214,222,238,0.8)';
    ctx.beginPath();
    const up = [4.5, 2.2, 5.5, 2.8, 3.6, 1.8, 2.4];
    for (let k = 0; k < up.length; k++) {
      const u = k / (up.length - 1);
      const x = 24.5 * s - u * 19 * s, y = -9.5 * s + u * 10.5 * s, l = up[k]! * 1.25 * s * (1 - 0.4 * u);
      ctx.moveTo(x - 0.5 * s, y);
      ctx.quadraticCurveTo(x + 0.2 * s, y + l * 0.6, x - 0.6 * s, y + l);
      ctx.lineTo(x + 0.5 * s, y);
    }
    const low = [6, 3, 4.8, 2.4, 3.4, 1.8];
    for (let k = 0; k < low.length; k++) {
      const u = k / (low.length - 1);
      const x = 32 * s - u * 25 * s, y = 3.4 * s + u * 1.6 * s - Math.sin(u * Math.PI) * 2.6 * s, l = low[k]! * 1.25 * s * (1 - 0.35 * u);
      const out = k % 2 === 0 ? 0.9 * s : 0;
      ctx.moveTo(x - 0.5 * s, y);
      ctx.quadraticCurveTo(x + out, y - l * 0.6, x + out + 0.4 * s, y - l);
      ctx.lineTo(x + 0.5 * s, y);
    }
    ctx.fill();
    // The lure's light along the forehead.
    ctx.strokeStyle = 'rgba(140,215,240,0.22)';
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    ctx.moveTo(24 * s, -12 * s);
    ctx.bezierCurveTo(20 * s, -20 * s, 10 * s, -24 * s, -2 * s, -21.5 * s);
    ctx.stroke();
    // A small pectoral fan behind the gill, and the row of sense pits along the flank.
    ctx.fillStyle = 'rgba(16,14,26,0.85)';
    ctx.strokeStyle = 'rgba(80,88,124,0.3)';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    ctx.moveTo(-1 * s, 5 * s);
    ctx.quadraticCurveTo(-8 * s, (2 + wave) * s, -12 * s, (5 + wave) * s);
    ctx.quadraticCurveTo(-13 * s, (9 + wave) * s, -10 * s, (12 + wave) * s);
    ctx.quadraticCurveTo(-6 * s, (12 + wave * 0.5) * s, -1 * s, 9 * s);
    ctx.fill();
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      ctx.moveTo(-1.5 * s, (5.5 + k) * s);
      ctx.lineTo(-11.5 * s, (5 + k * 2.3 + wave) * s);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(150,170,210,0.12)';
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const x = 10 * s - k * 6 * s, y = -4 * s + k * 0.8 * s + Math.sin(k * 1.7) * 1.2 * s;
      ctx.moveTo(x + 0.7 * s, y);
      ctx.arc(x, y, 0.7 * s, 0, Math.PI * 2);
    }
    ctx.fill();
    // A small eye above the corner of the mouth.
    ctx.fillStyle = 'rgba(150,165,200,0.55)';
    ctx.beginPath();
    ctx.arc(12 * s, -12 * s, 1.7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05050c';
    ctx.beginPath();
    ctx.arc(12.4 * s, -12 * s, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
    // The rod from the forehead, thick at its root, and the fleshy bulb with two short filaments.
    ctx.strokeStyle = 'rgba(46,50,74,0.95)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    ctx.moveTo(14 * s, -20 * s);
    ctx.quadraticCurveTo(18 * s, -30 * s, 26 * s, -36 * s);
    ctx.stroke();
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(26 * s, -36 * s);
    ctx.quadraticCurveTo(34 * s, -40 * s, 39 * s, -32 * s);
    ctx.moveTo(40 * s, -28 * s);
    ctx.quadraticCurveTo((40 + wave * 0.6) * s, -25 * s, (39 + wave) * s, -23 * s);
    ctx.moveTo(41.5 * s, -28.5 * s);
    ctx.quadraticCurveTo((43 + wave * 0.6) * s, -26 * s, (43 + wave) * s, -24 * s);
    ctx.stroke();
    ctx.fillStyle = 'rgba(70,96,118,0.95)';
    ctx.beginPath();
    ctx.arc(40 * s, -30 * s, 2.4 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  /**
   * An anglerfish drifting through the dark every few minutes: a dark body you can barely see,
   * a mouth of glassy fangs, and the lure on its head pulsing like the reef's own light.
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
    // It pitches with its bob: nose down while it sinks, up while it rises.
    const vx = (focus.w * 1.2) / crossing, vy = Math.cos(t * 0.4) * 0.4 * 8 * s;
    ctx.rotate(Math.atan2(vy, vx) * 0.8);
    anglerBody(ctx, s, t);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 40 * s, -30 * s, 18 * s, '150,240,255', Math.min(1, 0.55 * pulse));
    if (lit > 0) glow(ctx, 40 * s, -30 * s, 4 * s, '230,255,255', 0.9 * Math.min(1, lit));
    ctx.restore();
  }

  /**
   * The flank's rock under the reef's light: a pool of its glow on the shoulder beneath it, and
   * boulders along the ridge, each a dark lump with its top caught by the light, fading with
   * distance from the reef (it is the only light down here).
   */
  function drawFlankRock(ctx: CanvasRenderingContext2D, ridge: readonly [number, number][], bottom: number): void {
    const s = scale();
    const ridgeY = (x: number) => {
      const k = Math.min(ridge.length - 2, Math.max(0, Math.floor(((x - ridge[0]![0]) / (ridge[ridge.length - 1]![0] - ridge[0]![0])) * (ridge.length - 1))));
      const [x0, y0] = ridge[k]!, [x1, y1] = ridge[k + 1]!;
      return y0 + (y1 - y0) * Math.min(1, Math.max(0, (x - x0) / (x1 - x0 || 1)));
    };
    const cx = focus.x + focus.w * 0.5, top = ridgeY(cx);
    if (top > bottom) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, cx, top + focus.h * 0.02, focus.w * 0.22, '90,120,220', 0.09);
    ctx.globalCompositeOperation = 'source-over';
    const r = mulberry32(seed ^ 0xb01d);
    for (let i = 0; i < 26; i++) {
      const u = r(), x = focus.x + u * focus.w * 1.05;
      const y = ridgeY(x) + range(r, 0.2, 1) * focus.h * 0.05;
      if (y > bottom) continue;
      const q = range(r, 3, 9) * s * (0.6 + 0.8 * (y - top) / (focus.h * 0.1 + 1));
      const lit = Math.exp(-(((x - cx) / (focus.w * 0.25)) ** 2));
      ctx.fillStyle = '#05060f';
      ctx.beginPath();
      ctx.ellipse(x, y, q * 1.3, q * 0.7, range(r, -0.2, 0.2), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(130,150,230,${0.08 + 0.32 * lit})`;
      ctx.lineWidth = Math.max(0.8, q * 0.18);
      ctx.beginPath();
      ctx.ellipse(x, y, q * 1.15, q * 0.6, 0, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    }
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
    const ridge: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      // A shoulder that peaks under the reef and falls away to both sides, with rough rock.
      const peak = Math.exp(-((u - 0.5) ** 2) / 0.08);
      const y = base - peak * focus.h * 0.08 + range(r, -1, 1) * focus.h * 0.008;
      ridge.push([focus.x + u * focus.w * 1.05, y]);
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
    drawFlankRock(ctx, ridge, h);
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
      // Vertebrae along it: small blocks, larger toward the chest, smaller down the tail.
      ctx.fillStyle = 'rgba(205,210,228,0.5)';
      const spines: number[] = [];
      ctx.beginPath();
      for (let k = 0; k < 19; k++) {
        const u = k / 18;
        const vx = wx - 60 * s + u * 124 * s;
        const vy = (1 - u) * (1 - u) * (wy + 2 * s) + 2 * (1 - u) * u * (wy - 4 * s) + u * u * (wy + 3 * s);
        const vr = (0.9 + 1.4 * Math.sin(Math.min(1, u * 1.4) * Math.PI * 0.5)) * s;
        ctx.moveTo(vx + vr * 1.1, vy - 1 * s);
        ctx.ellipse(vx, vy - 1 * s, vr * 1.1, vr * 0.85, 0, 0, Math.PI * 2);
        spines.push(vx, vy - 1 * s - vr * 0.7, vr);
      }
      ctx.fill();
      // Each vertebra's spine, a short blade raised and swept back toward the tail.
      ctx.lineWidth = 1.1 * s;
      ctx.beginPath();
      for (let k = 0; k < spines.length; k += 3) {
        ctx.moveTo(spines[k]!, spines[k + 1]!);
        ctx.lineTo(spines[k]! - spines[k + 2]! * 0.9, spines[k + 1]! - spines[k + 2]! * 1.6);
      }
      ctx.stroke();
      // The ribs: longest at the chest (toward the skull), rising and leaning back a little; the
      // first two (by the tail end) fallen half flat.
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      for (let k = 0; k < 11; k++) {
        const rx = wx - 14 * s + k * 6.5 * s;
        const rh = (7 + 11 * Math.sin(((k + 1) / 12) * Math.PI) * (0.5 + 0.5 * k / 10)) * s;
        const lean = k < 2 ? 0.45 : 1;
        ctx.moveTo(rx, wy - 2 * s);
        ctx.quadraticCurveTo(rx + 1.5 * s, wy - rh * lean, rx - 3.5 * s, wy - rh * 1.1 * lean);
      }
      ctx.stroke();
      // The skull: a broad cranium behind, the long flat beak of the upper jaw tapering forward,
      // a dark eye socket and the nostrils on top; one lower jaw, a long bowed bone, fallen beside it.
      const X = (u: number) => wx + u * s, Y = (v: number) => wy + v * s;
      ctx.fillStyle = 'rgba(200,205,225,0.5)';
      ctx.beginPath();
      ctx.moveTo(X(63), Y(3));
      ctx.bezierCurveTo(X(62), Y(-5), X(66), Y(-9.5), X(73), Y(-9));
      ctx.quadraticCurveTo(X(80), Y(-8.5), X(84), Y(-5));
      ctx.quadraticCurveTo(X(94), Y(-2.5), X(102), Y(0.5));
      ctx.quadraticCurveTo(X(90), Y(3), X(74), Y(3.5));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(8,10,28,0.65)';
      ctx.beginPath();
      ctx.ellipse(X(71), Y(-2.5), 2.6 * s, 1.9 * s, -0.2, 0, Math.PI * 2);
      ctx.moveTo(X(79), Y(-7.2));
      ctx.ellipse(X(78), Y(-7.2), 1.6 * s, 0.6 * s, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,205,225,0.5)';
      ctx.lineWidth = 1.8 * s;
      ctx.beginPath();
      ctx.moveTo(X(66), Y(5));
      ctx.quadraticCurveTo(X(86), Y(9), X(103), Y(4.5));
      ctx.stroke();
      // White mats of bacteria spreading over the bones and the silt beside them.
      ctx.fillStyle = 'rgba(235,240,245,0.16)';
      for (let k = 0; k < 7; k++) {
        ctx.beginPath();
        ctx.ellipse(wx - 50 * s + k * 19 * s, wy + 3 * s, (8 + (k % 3) * 4) * s, 2.2 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Bone-eating worms: red fuzz along the spine and the rib bases, swaying. Touched, they
      // pull into the bone at once (a ripple along the spine from the touch), and creep out again.
      const touch = startled('whale-fall', t);
      const pullAt = (bx: number) => {
        if (!touch || touch.age > 6) return 0;
        const a = touch.age - Math.abs(bx - touch.x) / (120 * s);
        return a < 0 ? 0 : a < 0.15 ? a / 0.15 : a < 2.5 ? 1 : Math.max(0, 1 - (a - 2.5) / 3);
      };
      ctx.strokeStyle = 'rgba(230,70,90,0.75)';
      ctx.lineWidth = 0.8 * s;
      for (let k = 0; k < 26; k++) {
        const bx = wx - 56 * s + k * 4.6 * s;
        const by = wy + 1 * s - Math.sin((k / 25) * Math.PI) * 2.5 * s;
        const out = 1 - 0.85 * pullAt(bx);
        const sw = Math.sin(t * 1.3 + k * 0.9) * 1.2 * s * out;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + sw, by - (2 + (k % 3)) * s * out);
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
      // Its two claws held up in front, picking, and its eyes on short stalks.
      ctx.lineWidth = 0.9 * s;
      ctx.fillStyle = 'rgba(225,145,120,0.9)';
      for (const side of [-1, 1]) {
        const pick = Math.max(0, Math.sin(t * 2.2 + side * 1.4)) * 1.2 * s;
        const px = cx2 + side * 3.6 * s, py = cy2 - 2.2 * s + pick;
        ctx.beginPath();
        ctx.moveTo(cx2 + side * 1.8 * s, cy2 - 0.6 * s);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(px + side * 0.5 * s, py - 0.5 * s, 1.3 * s, 0.8 * s, side * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(20,10,10,0.9)';
      ctx.beginPath();
      for (const side of [-1, 1]) { ctx.moveTo(cx2 + side * 0.9 * s + 0.45 * s, cy2 - 2.2 * s); ctx.arc(cx2 + side * 0.9 * s, cy2 - 2.2 * s, 0.45 * s, 0, Math.PI * 2); }
      ctx.fill();
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
    // The cloak: a web stretched between eight arms, its edge scalloped between the tips, wider
    // when it opens. Kept dark: it is a deep wine-black animal (the bloom would make it scarlet).
    const tips: [number, number][] = [];
    for (let a = 0; a <= 7; a++) {
      const ang = Math.PI / 2 + (a / 7 - 0.5) * (0.8 + 1.4 * open);
      const reach = (16 + 1.5 * Math.sin(t * 1.4 + a)) * s;
      tips.push([Math.cos(ang + 0.15) * reach, Math.sin(ang + 0.15) * reach]);
    }
    const web = ctx.createRadialGradient(0, 0, 2 * s, 0, 0, 17 * s);
    web.addColorStop(0, 'rgba(40,6,14,0.94)');
    web.addColorStop(1, 'rgba(20,2,8,0.85)');
    ctx.fillStyle = web;
    ctx.beginPath();
    ctx.moveTo(4.5 * s, -1.5 * s);
    ctx.lineTo(tips[0]![0], tips[0]![1]);
    for (let a = 1; a < tips.length; a++) {
      const [px, py] = tips[a - 1]!, [qx, qy] = tips[a]!;
      ctx.quadraticCurveTo((px + qx) * 0.36, (py + qy) * 0.36, qx, qy);
    }
    ctx.lineTo(-4.5 * s, -1.5 * s);
    ctx.closePath();
    ctx.fill();
    // The arms through the web, tapering and curling at the tips, soft spines along their inner side.
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(62,12,22,0.95)';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    for (const [tx, ty] of tips) {
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(tx * 0.7 - ty * 0.08, ty * 0.7 + tx * 0.08, tx, ty);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(150,80,92,0.25)';
    ctx.lineWidth = 0.4 * s;
    ctx.beginPath();
    for (const [tx, ty] of tips) {
      const l = Math.hypot(tx, ty) || 1, nx = -ty / l, ny = tx / l;
      for (let q = 0.35; q < 0.95; q += 0.15) {
        const cx = tx * q, cy = ty * q;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + nx * 0.9 * s, cy + ny * 0.9 * s);
      }
    }
    ctx.stroke();
    // The mantle: a soft bell, darker below, with its two ear-like fins.
    const mg = ctx.createLinearGradient(0, -18 * s, 0, 0);
    mg.addColorStop(0, '#3e0a18');
    mg.addColorStop(1, '#22040c');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.moveTo(-5 * s, 1 * s);
    ctx.bezierCurveTo(-6 * s, -10 * s, -4 * s, -17 * s, 0, -18 * s);
    ctx.bezierCurveTo(4 * s, -17 * s, 6 * s, -10 * s, 5 * s, 1 * s);
    ctx.closePath();
    ctx.fill();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 5.2 * s, -14 * s, 4 * s, 2 * s, side * 0.6 + Math.sin(t * 3) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Big eyes: deep blue, a dark pupil and a glint.
    for (const side of [-1, 1]) {
      const ex = side * 2.8 * s, ey = -3.5 * s;
      ctx.fillStyle = 'rgba(46,92,150,0.85)';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.4 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#08060c';
      ctx.beginPath();
      ctx.arc(ex, ey + 0.15 * s, 0.9 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(220,235,255,0.55)';
      ctx.beginPath();
      ctx.arc(ex - 0.4 * s, ey - 0.5 * s, 0.25 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    // Lights at the fins' roots and at every arm tip.
    for (const side of [-1, 1]) glow(ctx, side * 8.5 * s, -15 * s, 5 * s, '140,200,255', 0.5 + 0.4 * open);
    for (const [tx, ty] of tips) glow(ctx, tx, ty, 2.6 * s, '170,215,255', 0.35 + 0.3 * open);
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
   * A pyrosome's tube at the origin along +x (open mouth at +len/2): tapering to a closed rounded
   * tip, wide and open at the mouth (seen a little end-on), its skin knobbled all over with the
   * little animals of the colony. Its lights are the caller's.
   */
  function pyrosomeTube(ctx: CanvasRenderingContext2D, len: number, rad: number, s: number): void {
    const half = (f: number) => rad * (0.45 + 0.6 * f);
    const tube = new Path2D();
    const N = 14;
    for (let k = 0; k <= N; k++) {
      const f = k / N, px = -len / 2 + rad * 0.45 + f * (len - rad * 0.45);
      const r = half(f) * (1 + 0.06 * Math.sin(k * 2.7));
      if (k === 0) tube.moveTo(px, -r); else tube.lineTo(px, -r);
    }
    for (let k = N; k >= 0; k--) {
      const f = k / N, px = -len / 2 + rad * 0.45 + f * (len - rad * 0.45);
      tube.lineTo(px, half(f) * (1 + 0.06 * Math.sin(k * 1.9 + 1)));
    }
    tube.arc(-len / 2 + rad * 0.45, 0, rad * 0.45, Math.PI / 2, -Math.PI / 2);
    tube.closePath();
    // Brighter toward its edges, where the light passes through more of its wall.
    const g = ctx.createLinearGradient(0, -rad * 1.05, 0, rad * 1.05);
    g.addColorStop(0, 'rgba(170,190,255,0.24)');
    g.addColorStop(0.5, 'rgba(120,150,240,0.07)');
    g.addColorStop(1, 'rgba(170,190,255,0.2)');
    ctx.fillStyle = g;
    ctx.fill(tube);
    // The open mouth: the dark inside, ringed by a paler lip.
    ctx.beginPath();
    ctx.ellipse(len / 2, 0, rad * 0.38, rad * 1.02, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8,12,36,0.45)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,210,255,0.22)';
    ctx.lineWidth = 1.2 * s;
    ctx.stroke();
    // The animals: small knobs in staggered rows round the tube, fainter toward its far side.
    ctx.fillStyle = 'rgba(190,210,255,0.22)';
    ctx.beginPath();
    for (let row = 0; row < 11; row++) {
      const f = (row + 0.5) / 11, px = -len / 2 + rad * 0.6 + f * (len - rad * 0.9), hr = half(f);
      for (let q = 0; q < 5; q++) {
        const v = ((q + (row % 2) * 0.5) / 4.5) * 2 - 1;
        if (Math.abs(v) > 0.92) continue;
        const kr = (0.7 + 0.5 * f) * s;
        ctx.moveTo(px + kr, v * hr * 0.9);
        ctx.arc(px, v * hr * 0.9, kr, 0, Math.PI * 2);
      }
    }
    ctx.fill();
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
    pyrosomeTube(ctx, len, rad, s);
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
    // The same fish as the wild ones, smaller, resting by the reef it was let stay at.
    anglerBody(ctx, s * 0.55, t);
    const lx = 40 * s * 0.55, ly = -30 * s * 0.55;
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
    /** A flat uneven patch on the floor (a closed path), seeded by k. */
    const patch = (p: Path2D, px: number, py: number, rx: number, ry: number, k: number) => {
      const N = 10;
      for (let j = 0; j <= N; j++) {
        const a = (j / N) * Math.PI * 2, w = 1 + 0.25 * Math.sin(3 * a + k) + 0.12 * Math.sin(5 * a + k * 2.1);
        const qx = px + Math.cos(a) * rx * w, qy = py + Math.sin(a) * ry * w;
        if (j === 0) p.moveTo(qx, qy); else p.lineTo(qx, qy);
      }
      p.closePath();
    };
    if (built) {
      // Built over: a low crust of chalky stone, lumpy and pitted (kept below white, or the
      // bloom turns it to a glare).
      const crust = new Path2D();
      for (let k = 0; k < 6; k++) patch(crust, x + (k - 2.5) * 11 * s, y - 2 * s - Math.abs(Math.sin(k * 1.7)) * 3 * s, (10 + (k % 3) * 3) * s, 4.5 * s, k);
      const g = ctx.createLinearGradient(0, y - 10 * s, 0, y + 3 * s);
      g.addColorStop(0, '#b8b6ae');
      g.addColorStop(1, '#6e6c68');
      ctx.fillStyle = g;
      ctx.fill(crust);
      ctx.fillStyle = 'rgba(40,40,46,0.45)';
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const px = x + (((k * 0.618) % 1) - 0.5) * 60 * s, py = y - 2 * s - ((k * 0.37) % 1) * 5 * s, r = (0.6 + (k % 3) * 0.3) * s;
        ctx.moveTo(px + r, py);
        ctx.arc(px, py, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
      return;
    }
    // Mats of sulphur bacteria round the crack: grey-white, tinged yellow and orange at their edges.
    const mats = new Path2D(), tinge = new Path2D();
    for (let k = 0; k < 7; k++) {
      const px = x + (k - 3) * 10 * s + Math.sin(k * 2.3) * 4 * s, py = y - Math.abs(Math.sin(k * 1.7)) * 3 * s;
      patch(mats, px, py, (9 + (k % 3) * 3) * s, 2.8 * s, k);
      if (k % 2) patch(tinge, px + 4 * s, py + 0.8 * s, 5 * s, 1.4 * s, k + 3);
    }
    ctx.fillStyle = 'rgba(196,200,206,0.55)';
    ctx.fill(mats);
    ctx.fillStyle = 'rgba(214,170,90,0.4)';
    ctx.fill(tinge);
    // A bed of dark mussels crowding the warmest ground, each with a pale lip.
    ctx.fillStyle = '#1e1a24';
    ctx.strokeStyle = 'rgba(170,160,150,0.5)';
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    for (let k = 0; k < 14; k++) {
      const px = x + (((k * 0.618) % 1) - 0.5) * 34 * s, py = y - 1.5 * s - ((k * 0.414) % 1) * 3.5 * s, a = ((k * 0.73) % 1) * 1.4 - 0.7;
      ctx.moveTo(px + 2.6 * s * Math.cos(a), py + 2.6 * s * Math.sin(a));
      ctx.ellipse(px, py, 2.6 * s, 1.2 * s, a, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    // The crack itself: a dark jagged fissure.
    ctx.strokeStyle = 'rgba(6,8,14,0.95)';
    ctx.lineWidth = 2.2 * s;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 9 * s, y + 0.5 * s);
    ctx.lineTo(x - 4 * s, y - 0.8 * s);
    ctx.lineTo(x - 1 * s, y + 0.6 * s);
    ctx.lineTo(x + 3 * s, y - 0.6 * s);
    ctx.lineTo(x + 8 * s, y + 0.4 * s);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,220,255,0.5)';
    ctx.lineWidth = 0.8 * s;
    for (let k = 0; k < 10; k++) {
      const u = ((t * 0.12 + k * 0.137) % 1);
      const bx = x + Math.sin(t * 1.5 + k) * 4 * s + u * 10 * s, by = y - u * focus.h * 0.5;
      ctx.beginPath();
      ctx.arc(bx, by, (1.5 + u * 2) * s, 0, Math.PI * 2);
      ctx.stroke();
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
    pyrosomeTube(ctx, len, rad, s);
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
    const x = focus.x + focus.w * (dir > 0 ? -0.1 + u * 1.2 : 1.1 - u * 1.2), y = focus.y + focus.h * 0.55 + Math.sin(t * 0.3) * 6 * s;
    spot('lantern-shark', x, y, 26 * s);
    const lit = touch && touch.age < 10 ? 0 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const sway = Math.sin(t * 2) * 2 * s;
    // The body: slender, a rounded snout, tapering into a tail with a long upper lobe.
    const body = (c: CanvasRenderingContext2D): void => {
      c.beginPath();
      c.moveTo(19 * s, 0.6 * s);
      c.bezierCurveTo(19 * s, -2.2 * s, 14 * s, -4.2 * s, 6 * s, -4.4 * s);
      c.bezierCurveTo(-2 * s, -4.4 * s, -9 * s, -2.4 * s, -13 * s, -1.2 * s + sway * 0.3);
      c.lineTo(-22 * s, -6.5 * s + sway);
      c.quadraticCurveTo(-21 * s, -2 * s + sway * 0.6, -18.5 * s, 0.4 * s + sway * 0.5);
      c.lineTo(-20 * s, 3.4 * s + sway * 0.7);
      c.lineTo(-13 * s, 1.4 * s + sway * 0.3);
      c.bezierCurveTo(-8 * s, 2.8 * s, 0, 4.2 * s, 8 * s, 3.8 * s);
      c.bezierCurveTo(14 * s, 3.6 * s, 19 * s, 2.8 * s, 19 * s, 0.6 * s);
    };
    ctx.fillStyle = '#141824';
    body(ctx);
    ctx.fill();
    // Fins: two dorsals, each with its spine, and a pectoral.
    ctx.beginPath();
    ctx.moveTo(5 * s, -4.2 * s); ctx.quadraticCurveTo(2 * s, -8.6 * s, 0.5 * s, -8.6 * s); ctx.lineTo(0, -4.2 * s);
    ctx.moveTo(-6 * s, -3.4 * s); ctx.quadraticCurveTo(-9 * s, -8.2 * s, -10.5 * s, -8 * s); ctx.lineTo(-10.6 * s, -2.2 * s);
    ctx.moveTo(9 * s, 3.2 * s); ctx.quadraticCurveTo(5 * s, 7.4 * s, 2.4 * s, 7.6 * s); ctx.lineTo(4 * s, 3.6 * s);
    ctx.fill();
    // A faint rim of light along the back, so the dark shape reads against the dark water.
    ctx.strokeStyle = 'rgba(80,100,140,0.35)';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    ctx.moveTo(17 * s, -2.2 * s);
    ctx.bezierCurveTo(14 * s, -4.2 * s, 6 * s, -4.6 * s, -2 * s, -4 * s);
    ctx.moveTo(1.2 * s, -8.2 * s); ctx.lineTo(0.2 * s, -4.4 * s);
    ctx.moveTo(-10 * s, -7.6 * s); ctx.lineTo(-10.4 * s, -2.6 * s);
    ctx.stroke();
    // Gill slits.
    ctx.strokeStyle = 'rgba(40,48,70,0.9)';
    ctx.lineWidth = 0.4 * s;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) { ctx.moveTo((11 - k * 1.1) * s, -1.6 * s); ctx.lineTo((10.6 - k * 1.1) * s, 1.4 * s); }
    ctx.stroke();
    // The eye: large and green, catching what little light there is.
    ctx.fillStyle = 'rgba(70,150,120,0.9)';
    ctx.beginPath();
    ctx.ellipse(14.4 * s, -1.4 * s, 1.6 * s, 1.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05080c';
    ctx.beginPath();
    ctx.arc(14.6 * s, -1.4 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.fill();
    if (lit) {
      ctx.globalCompositeOperation = 'lighter';
      // The belly's light: a soft band along the underside, and the brighter marks on the flank.
      ctx.save();
      body(ctx);
      ctx.clip();
      const band = ctx.createLinearGradient(0, 0, 0, 4 * s);
      band.addColorStop(0, 'rgba(90,150,255,0)');
      band.addColorStop(1, 'rgba(90,150,255,0.45)');
      ctx.fillStyle = band;
      ctx.fillRect(-20 * s, 0, 38 * s, 5 * s);
      ctx.restore();
      for (let k = 0; k < 6; k++) glow(ctx, (12 - k * 4) * s, 3 * s, 3.4 * s, '120,190,255', 0.28);
      glow(ctx, -11 * s, 0.8 * s, 3 * s, '140,200,255', 0.5);
      glow(ctx, -16 * s, 0.4 * s + sway * 0.5, 2.4 * s, '140,200,255', 0.4);
      glow(ctx, 14.6 * s, -1.4 * s, 2 * s, '160,255,210', 0.45);
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
    // The outer house: a clear bubble of mucus, uneven, brighter toward its skin than inside,
    // sagging once abandoned.
    const fade = 1 - 0.5 * left;
    const RX = 46 * s, RY = (34 - 12 * left) * s, oy = 4 * s * left;
    const house = (c: CanvasRenderingContext2D) => {
      c.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const k = 1 + 0.03 * Math.sin(a * 3 + t * 0.3) + 0.015 * Math.sin(a * 5 - t * 0.2);
        const px = Math.cos(a) * RX * k, py = oy + Math.sin(a) * RY * k;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath();
    };
    const skin = ctx.createRadialGradient(0, oy, Math.min(RX, RY) * 0.2, 0, oy, RX);
    skin.addColorStop(0, `rgba(120,160,230,${0.02 * fade})`);
    skin.addColorStop(0.75, `rgba(130,170,235,${0.07 * fade})`);
    skin.addColorStop(1, `rgba(170,200,255,${0.16 * fade})`);
    ctx.fillStyle = skin;
    house(ctx);
    ctx.fill();
    ctx.strokeStyle = `rgba(170,200,255,${0.1 * fade})`;
    ctx.lineWidth = 0.8 * s;
    ctx.stroke();
    ctx.strokeStyle = `rgba(220,235,255,${0.22 * fade})`;
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.ellipse(-RX * 0.35, oy - RY * 0.55, RX * 0.25, RY * 0.12, -0.3, Math.PI * 1.05, Math.PI * 1.7);
    ctx.stroke();
    // The inner filter: two folded wings of fine mesh, ribs fanning out and threads across them.
    ctx.strokeStyle = `rgba(190,215,255,${0.12 * (1 - left)})`;
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    for (const side of [-1, 1]) {
      for (let k = 0; k < 9; k++) {
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(side * 15 * s, (-13 + k * 3.2) * s, side * 26 * s, (-15 + k * 3.8) * s);
      }
      for (let r = 1; r <= 4; r++) {
        const d = r * 6 * s;
        ctx.moveTo(side * d, -d * 0.55);
        ctx.quadraticCurveTo(side * (d + 2 * s), 0, side * d, d * 0.6);
      }
    }
    ctx.stroke();
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
   * `curious`: you held your light when it first passed (a moment), and it comes twice as often.
   */
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
    // The mantle, a long torpedo pointing forward (left), its fins a rounded diamond at the tip.
    ctx.beginPath();
    ctx.moveTo(-44 * s, 0);
    ctx.bezierCurveTo(-38 * s, -1.5 * s, -16 * s, -7.5 * s, 7 * s, -6.5 * s);
    ctx.quadraticCurveTo(9 * s, 0, 7 * s, 6.5 * s);
    ctx.bezierCurveTo(-16 * s, 7.5 * s, -38 * s, 1.5 * s, -44 * s, 0);
    ctx.moveTo(-48 * s, 0);
    ctx.lineTo(-39 * s, -11 * s + pulse * 2 * s);
    ctx.quadraticCurveTo(-32 * s, -5 * s, -26 * s, -2.5 * s);
    ctx.lineTo(-26 * s, 2.5 * s);
    ctx.quadraticCurveTo(-32 * s, 5 * s, -39 * s, 11 * s - pulse * 2 * s);
    ctx.closePath();
    // The head, a little narrower than the collar.
    ctx.moveTo(15 * s, 0);
    ctx.ellipse(11 * s, 0, 5 * s, 4.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eight thick arms, tapering, and two long tentacles ending in clubs.
    ctx.strokeStyle = '#3a1820';
    ctx.lineCap = 'round';
    const clubs: [number, number][] = [];
    for (let k = 0; k < 10; k++) {
      const long = k < 2;
      const len = (long ? 62 : 24) * s;
      const off = long ? (k - 0.5) * 2 * s : (k - 5.5) * 1.1 * s;
      const ex = 15 * s + len, ey = off * 3 + Math.sin(t * 0.6 + k) * (long ? 10 : 6) * s;
      for (const [w0, f0, f1] of long ? [[1.1, 0, 1]] as const : [[2.6, 0, 0.5], [1.4, 0.5, 1]] as const) {
        ctx.lineWidth = w0 * s;
        ctx.beginPath();
        const pt = (f: number): [number, number] => {
          const q = 1 - f;
          const c1x = 15 * s + len * 0.3, c1y = off + Math.sin(t + k) * 4 * s;
          const c2x = 15 * s + len * 0.7, c2y = off * 2 + Math.sin(t * 0.8 + k) * 6 * s;
          return [q * q * q * 15 * s + 3 * q * q * f * c1x + 3 * q * f * f * c2x + f * f * f * ex,
            q * q * q * off + 3 * q * q * f * c1y + 3 * q * f * f * c2y + f * f * f * ey];
        };
        for (let i = 0; i <= 8; i++) {
          const [px, py] = pt(f0 + (f1 - f0) * (i / 8));
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
      if (long) clubs.push([ex, ey]);
    }
    ctx.fillStyle = '#3a1820';
    ctx.beginPath();
    for (const [cx, cy] of clubs) { ctx.moveTo(cx + 4 * s, cy); ctx.ellipse(cx, cy, 4 * s, 1.6 * s, 0, 0, Math.PI * 2); }
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x + 11 * s, y - 1.5 * s, 3 * s, '180,200,255', 0.5 * Math.min(1, u * 6, (1 - u) * 6) * (1 - gone));
    ctx.restore();
  }

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

  /**
   * The migration: every eight minutes, for forty seconds, the deep rises. Hundreds of tiny
   * lights (krill, fish, shrimp) stream up past the reef from below, the largest journey any
   * animals make, made every night.
   */
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
    // Each comb row is a meridian of the body: a faint line, and on it short combs flashing in
    // rainbow as the light runs down them (dashes along the row, like the beating plates).
    const rowAt = (ax: number, f: number): [number, number] => {
      const py = f * ry * 1.7;
      return [ax * Math.sqrt(Math.max(0, 1 - (py / ry) ** 2)), py];
    };
    ctx.lineCap = 'round';
    for (let row = 0; row < 8; row++) {
      const ax = Math.sin((row / 8) * Math.PI * 2) * rx * 0.85;
      const bow = Math.cos((row / 8) * Math.PI * 2);
      if (bow < -0.3) continue;
      ctx.strokeStyle = `rgba(190,215,255,${0.08 * (0.5 + 0.5 * bow)})`;
      ctx.lineWidth = 0.7 * s;
      ctx.beginPath();
      for (let q = 0; q <= 12; q++) { const [px, py] = rowAt(ax, q / 12 * 0.94 - 0.47); if (q) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.stroke();
      ctx.lineWidth = 1.3 * s;
      for (let q = 0; q < 9; q++) {
        const f = q / 8 - 0.5;
        const [x0, y0] = rowAt(ax, f * 0.94 - 0.022);
        const [x1, y1] = rowAt(ax, f * 0.94 + 0.022);
        const hue = (t * 120 + q * 40 + row * 25) % 360;
        const a = Math.min(1, (0.2 + 0.5 * Math.max(0, Math.sin(t * (4 + 8 * beat) - q * 0.8 + row)) ** 2 + 0.6 * beat) * (0.5 + 0.5 * bow));
        ctx.strokeStyle = `hsla(${hue},100%,72%,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
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
      cx: cx(), baseY: focus.y + focus.h * 1.04, unit: Math.min(focus.h * 0.8, focus.w * 1.5), s: scale(), dpr,
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

  /**
   * Marine snow; above the snowline (that band) the Long Silt thins to a third. Flakes near the
   * reef's crown (within `lit`) catch its light and glint blue.
   */
  function drawSnow(ctx: CanvasRenderingContext2D, t: number, thin: boolean, crown: [number, number], lit: number): void {
    const dim = 'rgba(190,205,240,0.35)';
    for (const [i, f] of flakes.entries()) {
      if (thin && i % 3) continue;
      const y = ((f.y + t * f.speed) % 1) * (h + 10) - 5;
      const x = (((f.x + Math.sin(t * 0.25 + f.phase) * 0.003) % 1) + 1) % 1 * w;
      // A sweep nearby swirls the snow away from it.
      const [px, py] = pushed(x, y, t, 110 * scale());
      const d = Math.hypot(x + px - crown[0], y + py - crown[1]);
      const near = d < lit ? 1 - d / lit : 0;
      ctx.fillStyle = near > 0 ? `rgba(${190 - 40 * near},${215 + 30 * near},255,${0.35 + 0.55 * near})` : dim;
      speck(ctx, x + px, y + py, f.r * (1 + 0.6 * near));
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
      // The blade: a short back, a deep keel curving down to a point under the middle, the mouth
      // nearly upright at the front, a small forked tail on a thin stalk.
      const g = ctx.createLinearGradient(0, -4.5 * s, 0, 6.5 * s);
      g.addColorStop(0, '#10141f');
      g.addColorStop(0.4, '#2c3548');
      g.addColorStop(1, '#3e4a64');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(5.4 * s, -1.2 * s);
      ctx.quadraticCurveTo(3.6 * s, -4.4 * s, -0.5 * s, -4 * s);
      ctx.quadraticCurveTo(-3 * s, -3.2 * s, -4.6 * s, -1.4 * s);
      ctx.lineTo(-6 * s, -0.7 * s);
      ctx.lineTo(-8.8 * s, -3 * s);
      ctx.quadraticCurveTo(-7.7 * s, 0, -8.8 * s, 2.6 * s);
      ctx.lineTo(-6 * s, 0.7 * s);
      ctx.lineTo(-4.3 * s, 1.1 * s);
      ctx.quadraticCurveTo(-2.6 * s, 4.4 * s, -0.8 * s, 6.6 * s);
      ctx.quadraticCurveTo(2.6 * s, 6.3 * s, 4.4 * s, 3 * s);
      ctx.quadraticCurveTo(5.8 * s, 1.2 * s, 5.4 * s, -1.2 * s);
      ctx.fill();
      // The mirror of its flank, catching what light there is: a band down the deep of the body.
      ctx.fillStyle = 'rgba(190,205,235,0.14)';
      ctx.beginPath();
      ctx.moveTo(-3 * s, 0);
      ctx.quadraticCurveTo(0.5 * s, -1.2 * s, 3.8 * s, -0.4 * s);
      ctx.quadraticCurveTo(3.2 * s, 3 * s, -0.6 * s, 5 * s);
      ctx.quadraticCurveTo(-1.6 * s, 2.4 * s, -3 * s, 0);
      ctx.fill();
      // The mouth's line, nearly upright.
      ctx.strokeStyle = 'rgba(8,10,16,0.8)';
      ctx.lineWidth = Math.max(0.6, 0.45 * s);
      ctx.beginPath();
      ctx.moveTo(5.3 * s, -0.8 * s);
      ctx.lineTo(4.6 * s, 1.4 * s);
      ctx.stroke();
      // A big tubular eye turned upward: dark, rimmed silver.
      ctx.fillStyle = '#0c0f17';
      ctx.strokeStyle = 'rgba(150,165,195,0.35)';
      ctx.lineWidth = Math.max(0.5, 0.35 * s);
      ctx.beginPath();
      ctx.ellipse(2.9 * s, -2.5 * s, 1.1 * s, 1.6 * s, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Belly lights in a row along the keel, pointing down.
      ctx.globalCompositeOperation = 'lighter';
      for (let q = 0; q < 5; q++) {
        const u = 0.3 + q * 0.17, v = 1 - u;
        const bx = -2.6 + (u - 0.3) * 9, by = 4 + Math.sin((u - 0.3) * 4.6) * 2.4;
        glow(ctx, bx * s, (by - 0.5) * s, (1.1 + flare * 4) * s, '90,140,255', 0.32 + flare * 0.68);
      }
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
    // Body: a dark barrel tapering to a forked tail, lit faintly along its back by the dome's eyes,
    // with big fins held out, sculling gently, and a small mouth at the snout.
    const sc = Math.sin(t * 2) * 1.5 * s;
    const body = ctx.createLinearGradient(0, -5 * s, 0, 6 * s);
    body.addColorStop(0, '#3a3a52');
    body.addColorStop(1, '#16141f');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(12 * s, 1 * s);
    ctx.quadraticCurveTo(12 * s, -3 * s, 6 * s, -3.5 * s);
    ctx.quadraticCurveTo(-4 * s, -4 * s, -12 * s, -1 * s);
    ctx.lineTo(-19 * s, -5 * s + sc);
    ctx.quadraticCurveTo(-17 * s, 0.5 * s + sc, -19 * s, 6 * s + sc);
    ctx.lineTo(-12 * s, 2 * s);
    ctx.quadraticCurveTo(-2 * s, 6.5 * s, 8 * s, 4.5 * s);
    ctx.quadraticCurveTo(12 * s, 3.5 * s, 12 * s, 1 * s);
    ctx.fill();
    // The eyes' green light along its back only.
    ctx.strokeStyle = 'rgba(120,210,170,0.3)';
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(4 * s, -3.6 * s);
    ctx.quadraticCurveTo(-4 * s, -4.1 * s, -11.5 * s, -1.3 * s);
    ctx.stroke();
    // The big pectoral fin held out like a wing, clear and rayed, sculling; a small dorsal far back.
    const beat = Math.sin(t * 1.3) * 1.2 * s;
    ctx.fillStyle = 'rgba(96,104,140,0.4)';
    ctx.beginPath();
    ctx.moveTo(3 * s, 2.5 * s);
    ctx.quadraticCurveTo(-4 * s, 6 * s + beat, -12 * s, 8 * s + beat);
    ctx.quadraticCurveTo(-9 * s, 10.5 * s + beat, -3 * s, 9.5 * s + beat * 0.6);
    ctx.quadraticCurveTo(1 * s, 7 * s, 3 * s, 3.5 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,160,200,0.3)';
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const f = k / 4;
      ctx.moveTo(2.5 * s, 3 * s);
      ctx.lineTo((-11.5 + 8 * f) * s, (8.2 + 1.6 * f) * s + beat * (1 - 0.4 * f));
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(70,72,100,0.7)';
    ctx.beginPath();
    ctx.moveTo(-6 * s, -3.4 * s);
    ctx.quadraticCurveTo(-9 * s, -7.5 * s, -12 * s, -2 * s);
    ctx.fill();
    // A small mouth at the snout, and the two dark nostril pits above it that look like eyes.
    ctx.fillStyle = '#0a0a10';
    ctx.beginPath();
    ctx.arc(9.6 * s, -1.4 * s, 0.75 * s, 0, Math.PI * 2);
    ctx.moveTo(11.4 * s, -0.6 * s);
    ctx.arc(10.9 * s, -0.6 * s, 0.55 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,8,14,0.9)';
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    ctx.moveTo(12 * s, 1.6 * s);
    ctx.lineTo(10 * s, 2.2 * s);
    ctx.stroke();
    // The clear dome of the head.
    ctx.fillStyle = 'rgba(170,210,230,0.12)';
    ctx.strokeStyle = 'rgba(190,230,250,0.45)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.ellipse(5 * s, -4 * s, 7 * s, 6 * s, 0, Math.PI * 0.95, Math.PI * 2.05);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(230,245,255,0.35)';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.ellipse(5 * s, -4 * s, 5.6 * s, 4.6 * s, 0, Math.PI * 1.15, Math.PI * 1.45);
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
    // The stem: undulating in short waves that grow toward the tail, as it swims.
    const N = 34;
    const at = (k: number): [number, number] => {
      const xu = head - k * 0.018;
      const amp = (5 + k * 0.45) * s;
      return [focus.x + xu * focus.w, y0 + Math.sin(xu * 16 - t * 1.1) * amp + Math.sin(xu * 5 + t * 0.4) * 10 * s + k * 0.6 * s];
    };
    ctx.strokeStyle = 'rgba(200,230,255,0.2)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    for (let k = 0; k < N; k++) { const [x, y] = at(k); if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    const bell = (x: number, y: number, r: number, tilt: number, pulse: number) => {
      // A clear bell, cupped and tilted, its rim lit only on the leading side.
      ctx.fillStyle = `rgba(170,210,255,${0.12 + 0.1 * pulse})`;
      ctx.strokeStyle = `rgba(210,235,255,${0.3 + 0.25 * pulse})`;
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.1, r * 0.85, tilt, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.1, r * 0.85, tilt, -Math.PI * 0.9, -Math.PI * 0.2);
      ctx.stroke();
    };
    for (let k = N - 1; k >= 1; k--) {
      const [x, y] = at(k);
      if (x < focus.x - focus.w * 0.1 || x > focus.x + focus.w * 1.1) continue;
      const pulse = Math.min(1.6, 0.5 + 0.5 * Math.sin(t * 3 - k * 0.5) + (run >= 0 ? 1.5 * Math.exp(-((k / N - run) ** 2) / 0.006) : 0));
      // Every third member a feeding group (a bigger bell with a fishing tentacle), small bracts between.
      const group = k % 3 === 0;
      const r = (group ? 5.5 + 2 * pulse : 3 + pulse) * s * (1 - k / 70);
      if (group) {
        // The fishing tentacle: long, curling, with little side threads along it.
        ctx.strokeStyle = 'rgba(200,230,255,0.16)';
        ctx.lineWidth = 0.6 * s;
        ctx.beginPath();
        let px = x, py = y + r;
        ctx.moveTo(px, py);
        for (let q = 1; q <= 8; q++) {
          const nx = x + Math.sin(t * 0.9 + k + q * 0.7) * (2 + q) * s, ny = y + r + q * 8 * s;
          ctx.lineTo(nx, ny);
          if (q % 2 === 0) { ctx.moveTo(nx, ny); ctx.quadraticCurveTo(nx + 3 * s, ny + 1 * s, nx + 2.5 * s, ny + 3.5 * s); ctx.moveTo(nx, ny); }
          px = nx; py = ny;
        }
        ctx.stroke();
      }
      bell(x, y, r, -0.5, pulse);
    }
    // At the head, a cluster of swimming bells, pulsing together.
    const [hx0, hy0] = at(0);
    const beat = 0.5 + 0.5 * Math.sin(t * 3);
    for (const [ox, oy, rr] of [[-3, -5, 6.5], [-3, 5, 6.5], [4, -2.5, 7], [4, 3, 7], [10, 0, 6]] as const) bell(hx0 + ox * s, hy0 + oy * s, rr * s * (0.95 + 0.08 * beat), -0.2, beat);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, hx0 + 3 * s, hy0, 30 * s, '170,220,255', 0.35);
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


  /**
   * A gulper eel, rarely (once in eleven minutes): a long dark thread drifting across with a pouch of
   * a mouth and a pink light at its tail-tip. Touched, the mouth balloons open.
   */
  function drawGulper(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 660, pass = 70;
    const u = (t % period) / pass;
    if (u >= 1) return;
    sight('gulper');
    const s = scale() * 1.6;
    const touch = startled('gulper', t);
    const gape = touch && touch.age < 3 ? Math.sin(Math.min(1, touch.age / 3) * Math.PI) : 0;
    const x = focus.x + focus.w * (1.1 - 1.2 * u), y = focus.y + focus.h * (0.3 + 0.05 * Math.sin(t * 0.4));
    spot('gulper', x, y, 30 * s);
    ctx.save();
    // The whip of a body trailing behind (to the right, it swims left): one tapering shape along a
    // waving spine, a faint rim of light along the front of its back.
    const N = 30;
    const top: [number, number][] = [], bot: [number, number][] = [];
    let px = 0, py = 0;
    for (let i = 0; i <= N; i++) {
      const sx0 = x + 8 * s + i * 5 * s, sy0 = y + Math.sin(t * 2 - i * 0.35) * (2 + i * 0.25) * s;
      const half = Math.max(0.35, (3.2 - i * 0.1)) * s;
      top.push([sx0, sy0 - half]);
      bot.push([sx0, sy0 + half]);
      px = sx0; py = sy0;
    }
    ctx.fillStyle = '#150e18';
    ctx.beginPath();
    ctx.moveTo(top[0]![0], top[0]![1]);
    for (const [qx, qy] of top) ctx.lineTo(qx, qy);
    for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i]![0], bot[i]![1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(130,105,155,0.28)';
    ctx.lineWidth = 0.7 * s;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 22; i++) i ? ctx.lineTo(top[i]![0], top[i]![1] - 0.6 * s) : ctx.moveTo(top[i]![0], top[i]![1] - 0.6 * s);
    ctx.stroke();
    // The tail's fleshy tip and its light.
    ctx.fillStyle = 'rgba(150,60,100,0.8)';
    ctx.beginPath();
    ctx.ellipse(px + 1.5 * s, py, 2.2 * s, 1.1 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, px + 1.5 * s, py, 10 * s, '255,110,170', 0.5 + 0.4 * Math.sin(t * 3));
    ctx.globalCompositeOperation = 'source-over';
    // The head: a small skull over enormous jaws hinged far back. The upper jaw a thin bony rod to
    // the snout; below it the lower jaw's loose pouch of skin hangs open (touched, it balloons),
    // dark and a little translucent, its folds running from the hinge to the rim.
    const open = 0.35 + gape * 0.8;
    const sx = x - 18 * s;
    const sag = (8 + 14 * open) * s;
    // The lower jaw's tip, below and a little behind the snout; the gape opens forward between them.
    const lx = sx + 3 * s, ly = y + sag * 0.8;
    ctx.fillStyle = '#170f1a';
    ctx.beginPath();
    ctx.moveTo(x + 13 * s, y - 3.2 * s);
    ctx.quadraticCurveTo(x + 6 * s, y - 5.5 * s, x, y - 4.2 * s);
    ctx.quadraticCurveTo(x - 8 * s, y - 4.6 * s, sx, y - 3 * s);
    ctx.quadraticCurveTo(sx + 4 * s, y + sag * 0.35, lx, ly);
    ctx.quadraticCurveTo(x - 4 * s, y + sag * 1.08, x + 6 * s, y + 3.6 * s);
    ctx.quadraticCurveTo(x + 10 * s, y + 3.4 * s, x + 13 * s, y + 3.2 * s);
    ctx.closePath();
    ctx.fill();
    // The inside of the gape, darkest at its open edge.
    const inside = ctx.createLinearGradient(sx, 0, x + 6 * s, 0);
    inside.addColorStop(0, 'rgba(4,2,8,0.95)');
    inside.addColorStop(1, 'rgba(4,2,8,0)');
    ctx.fillStyle = inside;
    ctx.beginPath();
    ctx.moveTo(sx + 0.6 * s, y - 2.4 * s);
    ctx.quadraticCurveTo(sx + 4.4 * s, y + sag * 0.35, lx + 0.6 * s, ly - 0.8 * s);
    ctx.quadraticCurveTo(sx + 12 * s, y + sag * 0.45, x + 4 * s, y + 1 * s);
    ctx.closePath();
    ctx.fill();
    // The skin's folds fanning from the hinge to the open edge.
    ctx.strokeStyle = 'rgba(140,110,165,0.15)';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    for (let k = 1; k <= 4; k++) {
      const f = k / 5;
      const ex = sx + (1 - f) * 0.6 * s + f * (lx - sx) + Math.sin(f * Math.PI) * 2.5 * s, ey = y - 3 * s + f * (ly - y + 3 * s);
      ctx.moveTo(x + 7 * s, y + 0.5 * s);
      ctx.quadraticCurveTo((x + ex) / 2, (y + ey) / 2 + sag * 0.12, ex + 1.5 * s, ey);
    }
    ctx.stroke();
    // The two jaws' thin bones, faintly paler.
    ctx.strokeStyle = 'rgba(120,100,140,0.45)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(x + 6 * s, y - 2.6 * s);
    ctx.quadraticCurveTo(x - 6 * s, y - 3.6 * s, sx + 0.5 * s, y - 2.6 * s);
    ctx.moveTo(x + 6 * s, y + 3 * s);
    ctx.quadraticCurveTo(x - 4 * s, y + sag * 0.75, lx + 0.4 * s, ly - 0.4 * s);
    ctx.stroke();
    // A tiny eye at the very tip of the snout.
    ctx.fillStyle = 'rgba(200,220,255,0.85)';
    ctx.beginPath();
    ctx.arc(sx + 3 * s, y - 4 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Bristlemouths: a loose cloud of tiny silver fish drifting; touched, the cloud scatters and slowly gathers again. */
  function drawBristlemouths(ctx: CanvasRenderingContext2D, t: number): void {
    sight('bristlemouths');
    const s = scale();
    const touch = startled('bristlemouths', t);
    const scatter = touch && touch.age < 6 ? Math.sin(Math.min(1, touch.age / 6) * Math.PI) : 0;
    const cx = focus.x + focus.w * (0.2 + 0.1 * Math.sin(t * 0.03)), cy = focus.y + focus.h * (0.62 + 0.05 * Math.sin(t * 0.05));
    spot('bristlemouths', cx, cy, 60 * s);
    // Each a tiny slim fish, tilted a little; the cloud mostly faces one way, and the turn runs
    // through it as a wave. A few catch the light at any moment.
    const bodies = new Path2D(), glints = new Path2D();
    for (let i = 0; i < 60; i++) {
      const a = i * 2.39996 + t * 0.05;
      const r = Math.sqrt(i / 60) * 55 * s * (1 + 1.6 * scatter);
      const x = cx + Math.cos(a) * r + Math.sin(t * 0.7 + i) * 3 * s, y = cy + Math.sin(a) * r * 0.5;
      const dir = Math.sin(t * 0.08 - (x - cx) / (40 * s)) >= 0 ? 1 : -1;
      const len = (3.6 + 1.6 * ((i * 0.618) % 1)) * s;
      const tilt = Math.sin(t * 0.5 + i * 1.7) * 0.25;
      const hx = x + dir * len * Math.cos(tilt), hy = y + len * Math.sin(tilt);
      const nx = -Math.sin(tilt) * 0.55 * s, ny = Math.cos(tilt) * 0.55 * s;
      bodies.moveTo(x, y);
      bodies.lineTo((x + hx) / 2 + nx, (y + hy) / 2 + ny);
      bodies.lineTo(hx, hy);
      bodies.lineTo((x + hx) / 2 - nx, (y + hy) / 2 - ny);
      bodies.closePath();
      if (Math.sin(t * 1.3 + i * 2.1) > 0.93) {
        const gx = (x + 2 * hx) / 3, gy = (y + 2 * hy) / 3;
        glints.moveTo(gx + 0.9 * s, gy);
        glints.arc(gx, gy, 0.9 * s, 0, Math.PI * 2);
      }
    }
    ctx.save();
    ctx.fillStyle = 'rgba(180,192,210,0.55)';
    ctx.fill(bodies);
    ctx.fillStyle = 'rgba(235,242,255,0.9)';
    ctx.fill(glints);
    ctx.restore();
  }

  /** A whale far above, the one whose call carries down (the call sounds 40 s into each 170 s): a vast dim shape crossing. */
  function drawFarWhale(ctx: CanvasRenderingContext2D, t: number): void {
    const p = t % 170;
    if (p < 25 || p > 95) return;
    const k = (p - 25) / 70;
    const s = scale() * 3.2;
    const x = focus.x + focus.w * (1.2 - k * 1.4), y = focus.y + focus.h * 0.08;
    const a = Math.sin(k * Math.PI) * 0.45;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#2a3a66';
    ctx.translate(x, y);
    // Swimming left, far above: the same whale as by day in the shallows, dim against the dark.
    ctx.scale(-1, 1);
    ctx.rotate(0.04);
    whaleSilhouette(ctx, s * 0.72, Math.sin(t * 0.6));
    ctx.restore();
  }

  /** The jelly bloom (a moment, once met): small pale bells drifting through the water, pulsing together. */
  function drawJellyBloom(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    const beat = 0.85 + 0.15 * Math.sin(t * 1.6);
    ctx.save();
    for (let i = 0; i < 36; i++) {
      const x = focus.x + (((i * 0.618034 + t * 0.004 * (1 + (i % 3) * 0.3)) % 1) * focus.w);
      const y = focus.y + focus.h * (0.08 + ((i * 0.3819) % 1) * 0.6) + Math.sin(t * 0.5 + i) * 8 * s;
      const r = (3 + (i % 4)) * s * beat;
      ctx.fillStyle = 'rgba(210,215,240,0.28)';
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.7, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(210,215,240,0.18)';
      ctx.lineWidth = 0.7 * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.sin(t + i) * 2 * s, y + r * 2.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Rarely (every sixteen minutes), a rising river of firefly squid, blue sparks drifting up through
   * the dark. Touched, a ring of bright flashes spreads through the swarm from the touch.
   */
  function drawFireflySquid(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 960, length = 80;
    const p = (t + 300) % period;
    if (p > length) return;
    sight('firefly-squid');
    const s = scale();
    const fade = Math.min(1, p / 10, (length - p) / 10);
    const cx = focus.x + focus.w * 0.25;
    spot('firefly-squid', cx, focus.y + focus.h * 0.5, 90 * s);
    const where = (i: number): [number, number] => {
      const lane = ((i * 0.618034) % 1) - 0.5;
      const speed = 0.6 + ((i * 0.3819) % 1) * 0.8;
      const y = focus.y + focus.h * (1.05 - ((p * 0.012 * speed + (i * 0.137) % 1) % 1.1));
      return [cx + lane * focus.w * 0.28 + Math.sin(t * 0.8 + i) * 8 * s, y];
    };
    ctx.save();
    // The nearest few show their bodies: a mantle pointing up as they rise, the arms trailing to the
    // lit tips (the spark).
    ctx.fillStyle = `rgba(110,140,190,${0.3 * fade})`;
    ctx.strokeStyle = `rgba(120,150,200,${0.35 * fade})`;
    ctx.lineWidth = 0.7 * s;
    ctx.lineCap = 'round';
    for (let i = 0; i < 160; i += 10) {
      const [x, y] = where(i);
      const sway = Math.sin(t * 2 + i) * 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(x, y - 14 * s);
      ctx.quadraticCurveTo(x + 2.6 * s, y - 9 * s, x + 1.8 * s, y - 5 * s);
      ctx.lineTo(x - 1.8 * s, y - 5 * s);
      ctx.quadraticCurveTo(x - 2.6 * s, y - 9 * s, x, y - 14 * s);
      ctx.fill();
      ctx.beginPath();
      for (const a of [-1.2, -0.4, 0.4, 1.2]) { ctx.moveTo(x + a * 0.8 * s, y - 5 * s); ctx.lineTo(x + a * 1.2 * s + sway, y); }
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    const touch = startled('firefly-squid', t);
    const wave = touch && touch.age < 3 ? touch : null;
    for (let i = 0; i < 160; i++) {
      const lane = ((i * 0.618034) % 1) - 0.5;
      const speed = 0.6 + ((i * 0.3819) % 1) * 0.8;
      const y = focus.y + focus.h * (1.05 - ((p * 0.012 * speed + (i * 0.137) % 1) % 1.1));
      const x = cx + lane * focus.w * 0.28 + Math.sin(t * 0.8 + i) * 8 * s;
      const tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.7);
      const ring = wave ? (Math.hypot(x - wave.x, y - wave.y) - wave.age * 220 * s) / (28 * s) : 9;
      const flash = wave ? Math.exp(-ring * ring) * (1 - wave.age / 3) : 0;
      glow(ctx, x, y, (5 + 4 * tw + 7 * flash) * s, '90,170,255', Math.min(1, 0.55 * fade * (0.5 + tw) + 0.6 * flash));
      glow(ctx, x, y, 1.6 * s, '200,235,255', 0.9 * fade);
    }
    ctx.restore();
  }

  /** The fish with very large eyes (a moment on the dark seamount), staying by the reef's light. */
  function drawBigeye(ctx: CanvasRenderingContext2D, t: number, x0: number, y0: number): void {
    const s = scale() * 1.4;
    const x = x0 + Math.sin(t * 0.3) * 14 * s, y = y0 + Math.sin(t * 0.5) * 6 * s;
    const dir = facing(Math.cos(t * 0.3));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    // A deep red body under a big head, the spiny dorsal and the anal fin long and low, a forked
    // tail; the eye takes up half the head, a dark lens ringed in silver-red, catching the light.
    const wag = Math.sin(t * 4) * 1.2 * s;
    ctx.fillStyle = '#4a1822';
    ctx.beginPath();
    ctx.moveTo(8 * s, -8 * s);
    for (let q = 0; q <= 8; q++) {
      const f = q / 8, px = 8 * s - f * 22 * s, base = -8.6 * s + f * 3 * s;
      ctx.lineTo(px, base - (q % 2 ? 3.4 : 1.2) * s * (1 - f * 0.4));
    }
    ctx.lineTo(-14 * s, -4 * s);
    ctx.closePath();
    ctx.moveTo(-2 * s, 7.6 * s);
    ctx.quadraticCurveTo(-9 * s, 11 * s, -15 * s, 4 * s);
    ctx.lineTo(-12 * s, 3 * s);
    ctx.closePath();
    ctx.moveTo(-16 * s, -1.6 * s);
    ctx.lineTo(-26 * s, -8 * s + wag);
    ctx.quadraticCurveTo(-22 * s, wag, -26 * s, 8 * s + wag);
    ctx.lineTo(-16 * s, 1.6 * s);
    ctx.closePath();
    ctx.fill();
    const g = ctx.createLinearGradient(0, -9 * s, 0, 9 * s);
    g.addColorStop(0, '#6a2232');
    g.addColorStop(0.6, '#8a2c3a');
    g.addColorStop(1, '#a8505a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(17 * s, 1 * s);
    ctx.bezierCurveTo(16 * s, -8 * s, 4 * s, -9.6 * s, -6 * s, -7 * s);
    ctx.quadraticCurveTo(-13 * s, -4 * s, -16.5 * s, -1.4 * s);
    ctx.lineTo(-16.5 * s, 1.4 * s);
    ctx.quadraticCurveTo(-13 * s, 4.4 * s, -6 * s, 7.4 * s);
    ctx.bezierCurveTo(4 * s, 9.6 * s, 15 * s, 8 * s, 17 * s, 1 * s);
    ctx.fill();
    // Gill cover, and the upturned mouth.
    ctx.strokeStyle = 'rgba(30,8,12,0.55)';
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(3 * s, -6.6 * s);
    ctx.quadraticCurveTo(0.6 * s, 0, 3 * s, 6.8 * s);
    ctx.moveTo(17 * s, 1 * s);
    ctx.lineTo(13.5 * s, 3.4 * s);
    ctx.stroke();
    // The eye: huge, a dark lens ringed in silver-red, catching the reef's light.
    ctx.fillStyle = '#c8a0a4';
    ctx.beginPath();
    ctx.arc(9.5 * s, -1 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a12';
    ctx.beginPath();
    ctx.arc(10 * s, -1 * s, 4.6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,230,255,0.85)';
    ctx.beginPath();
    ctx.arc(8.6 * s, -2.6 * s, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 10 * s, -1 * s, 12 * s, '140,220,255', 0.3);
    ctx.restore();
  }

  /** A milky sea: the whole water glows a soft blue-white, flickering here and there with tiny lights. */
  function drawMilky(ctx: CanvasRenderingContext2D, t: number): void {
    const s = Math.min(focus.w, focus.h) / 700;
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.8);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, focus.y, 0, focus.y + focus.h);
    g.addColorStop(0, `rgba(120,170,220,${0.16 * breathe})`);
    g.addColorStop(0.6, `rgba(150,215,240,${0.26 * breathe})`);
    g.addColorStop(1, `rgba(120,170,220,${0.14 * breathe})`);
    ctx.fillStyle = g;
    ctx.fillRect(focus.x, focus.y, focus.w, focus.h);
    for (let i = 0; i < 320; i++) {
      const x = focus.x + ((i * 0.618034 + Math.sin(t * 0.1 + i) * 0.01) % 1) * focus.w;
      const y = focus.y + ((i * 0.3819 + t * 0.004 * (1 + (i % 3))) % 1) * focus.h;
      const a = Math.max(0, Math.sin(t * (1.2 + (i % 7) * 0.3) + i * 2.1));
      if (a < 0.4) continue;
      ctx.fillStyle = `rgba(210,240,255,${0.8 * (a - 0.4)})`;
      speck(ctx, x, y, 2.5 * s);
    }
    ctx.restore();
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
      // The old stone's lights answer the scouts listening at it.
      // Each Reading of Thousandfold's bands wakes more of the lights in its drowned towers.
      // A Reading just read: every light in the old stone flares, then settles.
      const read = effects.live(t).find((e) => e.kind === 'reading');
      const flare = read ? Math.max(0, 1 - read.age / 2.2) : 0;
      ruins.draw(ctx, w, h, focus, v.height, RUINS, t, [0, 1, 2],
        Math.min(1, Math.min(1, v.jobs.scout / 8) + flare), Math.min(1, (1 + v.readings) / 10 + flare));
      // The larvacean's house and the lantern shark pass in front of the old stone, behind the reef.
      drawLarvacean(ctx, t);
      drawLanternShark(ctx, t);
      drawAngler(ctx, t);
      for (const c of combs) drawComb(ctx, c, t);
      drawVampireSquid(ctx, t);
      drawPyrosome(ctx, t);
      drawMigration(ctx, t);
      if (v.bands.includes('glass')) for (let i = 0; i < 4; i++) swimShrimp(ctx, t, i);
      if (v.bands.includes('siphon')) drawSiphonophore(ctx, t);
      drawSnow(ctx, t, v.bands.includes('snowline'), reef.crown(L), L.unit * (0.5 + 0.4 * v.glowLevel));
      shoals.drawBack(ctx, focus, reef, L, v, t);
      drawFlank(ctx, p, t);
      drawGhosts(ctx, focus, v.ancestors, v.height, t, scale(), 'rgba(170,180,230,1)');
      drawSisterFar(ctx, focus, v.sister - v.gauge, t, scale(), false);
      drawSpire(ctx, focus, v.works.spire, scale(), t, focus.y + focus.h * 0.99);
      drawDome(ctx, focus, v.works.dome, scale(), t, focus.y + focus.h * 0.99);
      if (v.moments.seep) drawSeep(ctx, t, L, v.moments.seep === 'b');
      if (v.milky) drawMilky(ctx, t);
      drawFarWhale(ctx, t);
      drawBristlemouths(ctx, t);
      drawGulper(ctx, t);
      drawFireflySquid(ctx, t);
      {
        // Ossel, far below now: the old wall's one pale light at the bottom of the dark. Tap to hear it.
        const ox = focus.x + focus.w * 0.2, oy = focus.y + focus.h * 0.96, s = scale();
        const talk = speaking(t);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, ox, oy, (24 + 30 * talk) * s, '200,210,255', 0.12 + 0.05 * Math.sin(t * 0.45) + 0.25 * talk);
        glow(ctx, ox, oy, 3.5 * s, '230,235,255', 0.6 + 0.3 * Math.sin(t * 0.45) + 0.4 * talk);
        ctx.restore();
        spot('ossel', ox, oy, 30 * s);
      }
      if (v.moments['jelly-bloom']) drawJellyBloom(ctx, t);
      reef.draw(ctx, L, v, t);
      if (v.moments.eyes === 'a') {
        const [crx, cry] = reef.crown(L);
        drawBigeye(ctx, t, crx - 90 * scale(), cry + 40 * scale());
      }
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
      // The reef's light holds back the dark: the more glow, the wider the lit water round it.
      {
        const [dcx, dcy] = reef.crown(L);
        drawDarkness(ctx, dcx, dcy - L.unit * 0.1, Math.max(focus.w, focus.h) * (0.32 + 0.3 * v.glowLevel + 0.5 * Math.max(0, 1 - v.sinceFlare / 5)), 0.42);
      }
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      fore.draw(ctx, focus, t, '3,8,22', 0.9, '140,220,255');
      vignette(ctx);
    },
  };
}
