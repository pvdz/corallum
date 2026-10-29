// The small life of the Silt Floor: drifting jellies, brittle stars on the silt, and the vent
// chimney with its plume. Pure functions of time and a seed.

import { sight, speaking, spot, startled } from './sightings.ts';
import type { CreatureId } from '../content/creatures.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { glow } from './draw.ts';

export type Stage = { cx: number; baseY: number; w: number; h: number; s: number; dpr: number };

type Jelly = { x: number; y: number; size: number; period: number; phase: number; hue: number; drift: number };
type Star = { x: number; size: number; phase: number; rot: number };
type Lily = { x: number; size: number; phase: number; hue: string };
type Sponge = { x: number; size: number };

export function createLife(seed: number) {
  const rng = mulberry32(seed);
  const sponges: Sponge[] = [
    { x: -0.47, size: 1.1 },
    { x: 0.15, size: 0.7 },
    { x: 0.46, size: 0.9 },
  ];
  const lilies: Lily[] = [
    { x: -0.42, size: 1.0, phase: 0, hue: '230,200,215' },
    { x: -0.06, size: 0.75, phase: 2.1, hue: '215,215,240' },
    { x: 0.2, size: 0.9, phase: 4.2, hue: '240,210,190' },
    { x: 0.4, size: 0.65, phase: 1.3, hue: '220,205,235' },
  ];
  const jellies: Jelly[] = Array.from({ length: 3 }, (_, i) => ({
    x: [-0.36, 0.33, -0.2][i]! + range(rng, -0.04, 0.04),
    y: [-0.62, -0.45, -0.78][i]! + range(rng, -0.04, 0.04),
    size: range(rng, 0.7, 1.15) * (i === 2 ? 0.6 : 1),
    period: range(rng, 2.8, 4.2),
    phase: rng() * 10,
    hue: range(rng, 250, 300),
    drift: range(rng, 0.008, 0.016) * (rng() < 0.5 ? -1 : 1),
  }));
  const stars: Star[] = Array.from({ length: 4 }, (_, i) => ({
    x: [-0.38, -0.22, 0.24, 0.41][i]! + range(rng, -0.03, 0.03),
    size: range(rng, 0.7, 1.1),
    phase: rng() * 10,
    rot: rng() * Math.PI * 2,
  }));

  /** How far a touch near (x, y) has a creature drawn in: 0..1, quick in and a slow `back` out. */
  function shrink(id: CreatureId, x: number, y: number, reach: number, t: number, back = 4): number {
    const touch = startled(id, t);
    if (!touch || Math.hypot(touch.x - x, touch.y - y) > reach) return 0;
    const a = touch.age;
    return a < 0.2 ? a / 0.2 : Math.max(0, 1 - (a - 1.5) / back);
  }

  function drawJelly(ctx: CanvasRenderingContext2D, st: Stage, j: Jelly, t: number): void {
    sight('jelly');
    const s = st.s * j.size;
    // Wraps across the focus area very slowly.
    const span = st.w * 1.2;
    const xRaw = st.cx + j.x * st.w + j.drift * t * st.w * 0.05;
    const x = ((((xRaw - (st.cx - span / 2)) % span) + span) % span) + st.cx - span / 2;
    const beat = (t + j.phase) / j.period;
    const contract = Math.pow(Math.max(0, Math.sin(beat * Math.PI * 2)), 2);
    const y = st.baseY + j.y * st.h + Math.sin(beat * Math.PI * 2 - 0.8) * 6 * s;
    const bw = (26 - contract * 5) * s;
    const bh = (20 + contract * 4) * s;
    spot('jelly', x, y - bh * 0.4, Math.max(bw * 1.4, 28 * st.dpr));
    // Touched, a jelly startles: a wave of light runs round its rim and it pulses hard.
    const touch = startled('jelly', t);
    const flash = touch && touch.age < 2.5 && Math.hypot(touch.x - x, touch.y - y) < 160 * s ? 1 - touch.age / 2.5 : 0;

    // Tentacles, trailing and lagging behind the beat.
    ctx.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const ox = x + (k - 3) * bw * 0.22;
      ctx.strokeStyle = `hsla(${j.hue},80%,80%,${0.18 + (k % 2) * 0.1})`;
      ctx.lineWidth = (k % 3 === 0 ? 1.6 : 0.9) * s;
      ctx.beginPath();
      ctx.moveTo(ox, y);
      const len = (60 + (k % 3) * 22) * s;
      for (let q = 1; q <= 8; q++) {
        const f = q / 8;
        const wav = Math.sin(t * 1.6 + k + f * 5 - beat * 2) * 6 * s * f;
        ctx.lineTo(ox + wav + (k - 3) * f * 3 * s, y + f * len);
      }
      ctx.stroke();
    }
    // Bell.
    const g = ctx.createRadialGradient(x, y - bh * 0.4, 0, x, y - bh * 0.2, bw * 1.2);
    g.addColorStop(0, `hsla(${j.hue},90%,85%,0.35)`);
    g.addColorStop(0.7, `hsla(${j.hue},70%,60%,0.14)`);
    g.addColorStop(1, `hsla(${j.hue},70%,50%,0.02)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - bw, y);
    ctx.bezierCurveTo(x - bw, y - bh * 1.3, x + bw, y - bh * 1.3, x + bw, y);
    // Scalloped rim.
    for (let k = 6; k >= 0; k--) {
      const rx = x - bw + (k / 6) * bw * 2;
      ctx.quadraticCurveTo(rx + bw / 6, y + 4 * s, rx, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `hsla(${j.hue},100%,88%,0.45)`;
    ctx.lineWidth = 1.1 * s;
    ctx.stroke();
    // Bioluminescent rim lights.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (flash > 0) glow(ctx, x, y - bh * 0.4, bw * (1.5 + 2 * (1 - flash)), '150,230,255', 0.55 * flash);
    for (let k = 0; k <= 6; k++) {
      const rx = x - bw + (k / 6) * bw * 2;
      // The startle runs along the rim from one side to the other, twice.
      const run = flash > 0 ? Math.max(0, 1 - Math.abs(((1 - flash) * 2 * 6) % 6 - k) / 1.5) : 0;
      const a = Math.min(1, 0.35 + 0.35 * Math.sin(t * 3 + k + j.phase) + run * flash * 1.2);
      const rg = ctx.createRadialGradient(rx, y, 0, rx, y, 7 * s);
      rg.addColorStop(0, `hsla(${j.hue - 60},100%,80%,${a})`);
      rg.addColorStop(1, `hsla(${j.hue - 60},100%,70%,0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(rx - 7 * s, y - 7 * s, 14 * s, 14 * s);
    }
    ctx.restore();
  }

  function drawStar(ctx: CanvasRenderingContext2D, st: Stage, star: Star, t: number): void {
    sight('brittle-star');
    const s = st.s * star.size;
    const x = st.cx + star.x * st.w;
    const y = st.baseY + 10 * s;
    spot('brittle-star', x, y, Math.max(22 * s, 24 * st.dpr));
    // Touched, it curls its arms in over itself.
    const curlIn = shrink('brittle-star', x, y, 40 * s, t);
    ctx.strokeStyle = 'rgba(170,120,150,0.55)';
    ctx.fillStyle = 'rgba(190,140,170,0.7)';
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const a0 = star.rot + (k / 5) * Math.PI * 2;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let ax = x, ay = y, a = a0;
      for (let q = 0; q < 6; q++) {
        a += Math.sin(t * 0.4 + star.phase + k * 1.3 + q * 0.6) * 0.18 + curlIn * 0.55;
        ax += Math.cos(a) * 4 * s * (1 - 0.45 * curlIn);
        ay += Math.sin(a) * 4 * s * 0.45 * (1 - 0.45 * curlIn);
        ctx.lineTo(ax, ay);
        ctx.lineWidth = (2 - q * 0.28) * s;
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(x, y, 3.2 * s, 1.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Ossel's wall: a long-dead reef mound beside the young reef, slumped and banded, half buried
   * in the silt, with the broken stumps of its old branches. On it one pale polyp still lives,
   * breathing: Ossel, the voice that talks to you.
   */
  function drawOssel(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    const s = st.s;
    const r = mulberry32(seed ^ 0x055e1);
    const x0 = st.cx - st.w * 0.36, x1 = st.cx - st.w * 0.15;
    const base = st.baseY + 8 * s;
    const ph = [r() * 6.28, r() * 6.28, r() * 6.28] as const;
    // A slumped skyline: smooth swells, highest right of centre, tapering into the silt at both ends.
    const height = (u: number) => {
      const env = Math.pow(Math.sin(Math.PI * u), 0.35) * (0.6 + 0.4 * u);
      const swell = 1 + 0.18 * Math.sin(u * 9 + ph[0]) + 0.08 * Math.sin(u * 23 + ph[1]) + 0.03 * Math.sin(u * 61 + ph[2]);
      return 95 * s * env * swell;
    };
    const n = 48;
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push([x0 + (x1 - x0) * u, base - height(u)]);
    }
    const fill = ctx.createLinearGradient(0, base - 130 * s, 0, base);
    fill.addColorStop(0, '#2a2a40');
    fill.addColorStop(1, '#14141f');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x0, base);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(x1, base);
    ctx.closePath();
    ctx.fill();
    // Old bands follow the shape of the stone, each a little lower than the last.
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(170,170,205,0.10)';
    ctx.lineWidth = 1 * st.dpr;
    for (let k = 1; k < 14; k++) {
      const drop = k * 8.5 * s;
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const yy = Math.min(base, y + drop + Math.sin(i * 0.7 + k) * 1.2 * s);
        if (i) ctx.lineTo(x, yy);
        else ctx.moveTo(x, yy);
      });
      ctx.stroke();
    }
    ctx.restore();
    // Broken stumps of the old branches, thick and blunt.
    ctx.strokeStyle = '#25253a';
    ctx.lineCap = 'round';
    for (const [u, lean, len, wid] of [[0.55, -0.25, 34, 9], [0.72, 0.2, 48, 11], [0.86, 0.45, 26, 8], [0.38, -0.4, 20, 7]] as const) {
      const i = Math.round(u * n);
      const [x, y] = pts[i]!;
      ctx.lineWidth = wid * s;
      ctx.beginPath();
      ctx.moveTo(x, y + 6 * s);
      ctx.quadraticCurveTo(x + lean * len * 0.3 * s, y - len * 0.5 * s, x + lean * len * s, y - len * s);
      ctx.stroke();
    }
    // Silt dusting every upward face.
    ctx.strokeStyle = 'rgba(185,190,215,0.18)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1.2 * s) : ctx.moveTo(x, y + 1.2 * s)));
    ctx.stroke();
    // Ossel: the one living polyp on the dead stone, pale, its tentacles opening and closing slowly.
    const breathe = 0.5 + 0.5 * Math.sin(t * 0.45);
    const oi = Math.round(0.62 * n);
    const [ox, oyTop] = pts[oi]!;
    const oy = oyTop + 14 * s;
    spot('ossel', ox, oy, 30 * s);
    ctx.strokeStyle = `rgba(215,220,245,${0.45 + 0.25 * breathe})`;
    ctx.lineWidth = 1.1 * s;
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * (0.22 + 0.1 * breathe);
      const len = (6 + 3 * breathe) * s;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(ox + Math.cos(a) * len * 0.6, oy + Math.sin(a) * len * 0.5, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, ox, oy - 3 * s, 40 * s, '200,210,255', 0.10 + 0.10 * breathe);
    glow(ctx, ox, oy - 2 * s, 7 * s, '225,230,255', 0.45 + 0.3 * breathe);
    // Speaking: its light rises and flickers with the words.
    const talk = speaking(t);
    if (talk > 0) {
      glow(ctx, ox, oy - 3 * s, 60 * s, '210,220,255', 0.25 * talk);
      glow(ctx, ox, oy - 2 * s, 12 * s, '240,245,255', 0.6 * talk);
    }
    ctx.restore();
  }

  /**
   * Rarely, a dumbo octopus: once in fifteen minutes a pale little octopus hovers across the
   * floor, flapping the two ear-like fins on its head.
   */
  /** Rarely (every thirteen minutes), a march of brittle stars crossing the floor together, arm over arm. */
  function drawStarMarch(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    const period = 780, length = 70;
    const p = (t + 400) % period;
    if (p > length) return;
    sight('star-march');
    const s = st.s * 1.1;
    const fade = Math.min(1, p / 6, (length - p) / 6);
    let first = true;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = 'rgba(205,160,170,0.9)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 45; i++) {
      const lag = (i * 0.618) % 1;
      const u = p / length * 1.5 - lag * 0.5;
      if (u < 0 || u > 1) continue;
      const x = st.cx - st.w * 0.6 + u * st.w * 1.2;
      const y = st.baseY + (2 + ((i * 0.37) % 1) * 14) * st.s;
      if (first) { spot('star-march', x, y, 40 * s); first = false; }
      ctx.lineWidth = 1.3 * s;
      for (let k = 0; k < 5; k++) {
        const a = k * (Math.PI * 2 / 5) + t * 0.8 + i;
        const bend = Math.sin(t * 3 + k + i) * 0.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * 4 * s, y + Math.sin(a) * 2 * s, x + Math.cos(a + bend) * 8 * s, y + Math.sin(a + bend) * 3.5 * s);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** A giant sea spider picking its way across the floor; touched, it freezes and folds its legs in. */
  function drawSeaSpider(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    sight('sea-spider');
    const s = st.s * 1.6;
    const touch = startled('sea-spider', t);
    const still = touch && touch.age < 5 ? 1 : 0;
    const u = ((t * 0.006) % 1);
    const x = st.cx - st.w * 0.42 + u * st.w * 0.3, y = st.baseY + 4 * st.s;
    spot('sea-spider', x, y - 6 * s, 24 * s);
    ctx.save();
    ctx.strokeStyle = 'rgba(225,200,170,0.9)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.2 * s;
    for (let k = 0; k < 8; k++) {
      const side = k < 4 ? -1 : 1, j = k % 4;
      const step = still ? 0 : Math.sin(t * 1.2 + k * 1.3) * 0.25;
      const reach = still ? 0.45 : 1;
      // Each leg rises to a high knee and comes down well out to the side, fanned from front to back.
      const a1 = -Math.PI / 2 + side * (0.35 + j * 0.3 + step);
      const kx = x + Math.cos(a1) * 9 * s * reach + side * j * 2 * s, ky = y - 5 * s + Math.sin(a1) * 9 * s * reach;
      const fx = kx + side * (6 + j * 2) * s * reach, fy = y + (j - 1.5) * 1.2 * s;
      ctx.beginPath();
      ctx.moveTo(x, y - 5 * s);
      ctx.lineTo(kx, ky);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(235,210,180,0.95)';
    ctx.beginPath();
    ctx.ellipse(x, y - 5 * s, 2.6 * s, 1.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Rarely (every twelve minutes), a ghost shark glides low over the silt, right to left, its wide
   * fins beating slowly. Touched, it turns its shining eye toward you and slips away faster.
   */
  function drawChimaera(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    const period = 720, crossing = 45;
    const touch = startled('chimaera', t);
    const hurry = touch && touch.age < 6 ? 1 : 0;
    const u = (((t + 520) % period) / crossing) * (1 + hurry * 0.6);
    if (u >= 1) return;
    sight('chimaera');
    const s = st.s * 1.8;
    const x = st.cx + st.w * (0.6 - u * 1.2), y = st.baseY - 40 * st.s + Math.sin(t * 0.8) * 5 * st.s;
    spot('chimaera', x, y, 30 * s);
    const beat = Math.sin(t * 2.2);
    ctx.save();
    ctx.translate(x, y);
    // Body: a blunt head tapering to a long whip of a tail (it swims left).
    const g = ctx.createLinearGradient(0, -6 * s, 0, 6 * s);
    g.addColorStop(0, 'rgba(200,195,215,0.9)');
    g.addColorStop(1, 'rgba(140,130,160,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-16 * s, 0);
    ctx.quadraticCurveTo(-14 * s, -6 * s, -4 * s, -5 * s);
    ctx.quadraticCurveTo(14 * s, -3 * s, 40 * s, Math.sin(t * 2) * 2 * s);
    ctx.quadraticCurveTo(14 * s, 3 * s, -4 * s, 5 * s);
    ctx.quadraticCurveTo(-14 * s, 5 * s, -16 * s, 0);
    ctx.fill();
    // The tail thread.
    ctx.strokeStyle = 'rgba(180,170,200,0.7)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(40 * s, Math.sin(t * 2) * 2 * s);
    ctx.quadraticCurveTo(52 * s, Math.sin(t * 2 + 1) * 4 * s, 64 * s, Math.sin(t * 2 + 2) * 3 * s);
    ctx.stroke();
    // A wide pectoral fin, beating slowly.
    ctx.fillStyle = 'rgba(170,160,190,0.75)';
    ctx.beginPath();
    ctx.moveTo(-6 * s, 2 * s);
    ctx.quadraticCurveTo(0, (14 + beat * 6) * s, 10 * s, (10 + beat * 5) * s);
    ctx.quadraticCurveTo(4 * s, 4 * s, 2 * s, 2 * s);
    ctx.fill();
    // Its big eye shines green.
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, -11 * s, -1.5 * s, (4 + 3 * hurry) * s, '120,255,170', 0.8);
    ctx.restore();
  }

  function drawDumbo(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    const period = 900, crossing = 40;
    const u = ((t + 300) % period) / crossing;
    if (u >= 1) return;
    sight('dumbo');
    const s = st.s * 2;
    // Touched, it flaps hard and bobs up out of reach, then sinks back.
    const touch = startled('dumbo', t);
    const bob = touch && touch.age < 5 ? Math.sin(Math.min(1, touch.age / 5) * Math.PI) : 0;
    const x = st.cx + st.w * (-0.6 + u * 1.2), y = st.baseY - 130 * st.s + Math.sin(t * 1.5) * 8 * st.s - bob * 50 * st.s;
    spot('dumbo', x, y, 24 * s);
    const flap = Math.sin(t * (5 + 10 * bob));
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(255,205,190,0.85)';
    // Mantle and its two ear fins.
    ctx.beginPath();
    ctx.ellipse(0, -2 * s, 7 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * 7 * s, -5 * s, 4 * s, 2 * s, side * (0.5 + flap * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    // A webbed skirt of arms below.
    ctx.beginPath();
    ctx.moveTo(-7 * s, 1 * s);
    for (let k = 0; k <= 8; k++) ctx.lineTo(-7 * s + k * 1.75 * s, (5 + (k % 2) * 2 + Math.sin(t * 3 + k) * 0.6) * s);
    ctx.lineTo(7 * s, 1 * s);
    ctx.fill();
    ctx.fillStyle = '#222';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 2.6 * s, -1.5 * s, 1 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Sea pigs: a little herd of plump pink sea cucumbers walking along the silt on stubby tube
   * feet, feelers waving on top, crossing the floor every few minutes.
   */
  function drawSeaPigs(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    const period = 190, crossing = 120;
    const u = (t % period) / crossing;
    if (u >= 1) return;
    sight('sea-pig');
    // Touched, the herd pulls its feelers in and stops still for a moment.
    const tuck = shrink('sea-pig', st.cx + st.w * (0.75 - u * 1.5) + 50 * st.s, st.baseY - 4 * st.s, 90 * st.s, t, 3);
    spot('sea-pig', st.cx + st.w * (0.75 - u * 1.5) + 50 * st.s, st.baseY - 4 * st.s, 70 * st.s);
    for (let k = 0; k < 4; k++) {
      const s = st.s * (1.4 + (k % 2) * 0.35);
      const x = st.cx + st.w * (0.75 - u * 1.5) + k * 34 * st.s - (k % 2) * 10 * st.s;
      const y = st.baseY + (3 + (k % 3) * 2) * st.s;
      const step = Math.sin(t * 2.5 + k);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      // Legs: a row of stubby tube feet paddling in turn.
      ctx.strokeStyle = 'rgba(230,160,175,0.85)';
      ctx.lineWidth = 1.6 * s;
      ctx.lineCap = 'round';
      for (let l = 0; l < 5; l++) {
        const lx = -6 * s + l * 3 * s;
        const kick = Math.sin(t * 2.5 + l * 1.2 + k) * 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(lx, 1 * s);
        ctx.lineTo(lx + kick, 4 * s);
        ctx.stroke();
      }
      // Body: a translucent pink loaf.
      const g = ctx.createLinearGradient(0, -6 * s, 0, 3 * s);
      g.addColorStop(0, 'rgba(255,200,210,0.85)');
      g.addColorStop(1, 'rgba(210,120,140,0.85)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -1.5 * s + step * 0.3 * s, 9 * s, 4.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // Feelers on the back.
      ctx.strokeStyle = 'rgba(255,190,200,0.8)';
      ctx.lineWidth = 1.1 * s;
      for (const fx of [-2, 1, 4]) {
        ctx.beginPath();
        ctx.moveTo(fx * s, -5 * s);
        ctx.quadraticCurveTo((fx + 1) * s, (-5 - 4 * (1 - tuck)) * s, (fx + 2 + Math.sin(t + fx) * 1.5 * (1 - tuck)) * s, (-5 - 5 * (1 - tuck)) * s);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Glass sponges: tall pale vases of silica lattice standing in the silt, catching the faint
   * light along their seams. They do not move; only a few motes drift through their walls.
   */
  function drawSponge(ctx: CanvasRenderingContext2D, st: Stage, g: Sponge, t: number): void {
    sight('glass-sponge');
    const s = st.s * g.size;
    const x = st.cx + st.w * g.x, base = st.baseY + 5 * st.s;
    const hgt = 70 * s, wid = 12 * s;
    spot('glass-sponge', x, base - hgt * 0.5, Math.max(hgt * 0.5, 24 * st.dpr));
    const edge = (u: number) => wid * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 0.12 * u);
    ctx.save();
    // The vase outline, filled faintly.
    ctx.beginPath();
    ctx.moveTo(x - edge(0), base);
    for (let i = 1; i <= 16; i++) { const u = i / 16; ctx.lineTo(x - edge(u), base - u * hgt); }
    for (let i = 16; i >= 0; i--) { const u = i / 16; ctx.lineTo(x + edge(u), base - u * hgt); }
    ctx.closePath();
    ctx.fillStyle = 'rgba(200,215,240,0.07)';
    ctx.fill();
    ctx.clip();
    // The lattice: a diagonal net of fine silica strands.
    ctx.strokeStyle = 'rgba(215,228,255,0.28)';
    ctx.lineWidth = 0.7 * s;
    for (let k = -8; k <= 8; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * 4 * s - wid * 2, base);
      ctx.lineTo(x + k * 4 * s + wid * 2, base - hgt);
      ctx.moveTo(x + k * 4 * s + wid * 2, base);
      ctx.lineTo(x + k * 4 * s - wid * 2, base - hgt);
      ctx.stroke();
    }
    for (let i = 1; i < 9; i++) {
      const y = base - (i / 9) * hgt;
      ctx.beginPath();
      ctx.moveTo(x - wid * 2, y);
      ctx.lineTo(x + wid * 2, y);
      ctx.stroke();
    }
    ctx.restore();
    // The rim, and its seams catching light.
    ctx.strokeStyle = 'rgba(230,238,255,0.5)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.ellipse(x, base - hgt, edge(1), 2.5 * s, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, base - hgt * (0.4 + 0.3 * Math.sin(t * 0.2 + g.x * 9)), 10 * s, '180,210,255', 0.12);
    ctx.restore();
  }

  /**
   * Sea pens: three feather-shaped colonies rooted in the silt, leaning and swaying in the current.
   * Touched, a wave of green light runs up each in turn from the root to the tip.
   */
  function drawSeaPens(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    sight('sea-pen');
    const touch = startled('sea-pen', t);
    const pens = [{ x: 0.07, size: 1, phase: 0.4 }, { x: 0.1, size: 0.7, phase: 2.2 }, { x: 0.33, size: 0.85, phase: 3.7 }];
    ctx.save();
    ctx.lineCap = 'round';
    for (const [k, p] of pens.entries()) {
      const s = st.s * p.size;
      const x0 = st.cx + st.w * p.x, y0 = st.baseY + 3 * st.s;
      const lean = 0.15 + Math.sin(t * 0.4 + p.phase) * 0.08;
      const len = 52 * s;
      if (k === 0) spot('sea-pen', x0 + Math.sin(lean) * len * 0.6, y0 - len * 0.6, Math.max(18 * s, 22 * st.dpr));
      // The stalk, then the feather: leaves (polyp rows) on both sides, shorter toward the tip.
      const at = (u: number): [number, number] => [x0 + Math.sin(lean * u) * len * u, y0 - Math.cos(lean * u) * len * u];
      ctx.strokeStyle = 'rgba(225,175,150,0.75)';
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (let i = 1; i <= 10; i++) { const [x, y] = at(i / 10); ctx.lineTo(x, y); }
      ctx.stroke();
      // Touched: the light runs up this pen a little after the one before it.
      const age = touch ? touch.age - k * 0.4 : Infinity;
      for (let i = 3; i <= 14; i++) {
        const u = i / 15;
        const [x, y] = at(u);
        const leaf = (12 - 7 * u) * s;
        for (const side of [-1, 1]) {
          const ang = -Math.PI / 2 + lean * u + side * (1.15 + 0.1 * Math.sin(t * 1.3 + i));
          ctx.strokeStyle = 'rgba(240,190,160,0.55)';
          ctx.lineWidth = 1.1 * s;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(ang) * leaf, y + Math.sin(ang) * leaf + 2 * s);
          ctx.stroke();
        }
        const wave = age >= 0 && age < 3 ? Math.exp(-(((u - age / 1.4) / 0.12) ** 2)) * (1 - age / 3) : 0;
        if (wave > 0.02) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          glow(ctx, x, y, 9 * s, '120,255,170', 0.7 * wave);
          ctx.restore();
        }
      }
    }
    ctx.restore();
  }

  /**
   * Sea lilies: stalked crinoids rooted in the silt, their feathery arms held open into the
   * current and swaying slowly with it. Half-lit, pale, very old.
   */
  function drawLily(ctx: CanvasRenderingContext2D, st: Stage, c: Lily, t: number): void {
    sight('sea-lily');
    const s = st.s * c.size;
    const x0 = st.cx + st.w * c.x, y0 = st.baseY + 4 * st.s;
    const sway = Math.sin(t * 0.35 + c.phase) * 0.12;
    const len = 46 * s;
    const tx = x0 + Math.sin(sway) * len, ty = y0 - Math.cos(sway) * len;
    spot('sea-lily', tx, ty, Math.max(20 * s, 24 * st.dpr));
    // Touched, it folds its arms up into a closed fist, and opens them again slowly.
    const fold = shrink('sea-lily', tx, ty, 40 * s, t, 5);
    ctx.save();
    ctx.lineCap = 'round';
    // The stalk, jointed, bending with the current.
    ctx.strokeStyle = 'rgba(190,175,200,0.55)';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + Math.sin(sway) * len * 0.2, y0 - len * 0.55, tx, ty);
    ctx.stroke();
    // The crown: ten feathery arms opening like a hand, pinnules along each.
    for (let a = 0; a < 10; a++) {
      const ang = -Math.PI / 2 + sway * 1.5 + (a - 4.5) * 0.19 * (1 - 0.8 * fold);
      const arm = (16 + (a % 3) * 3) * s * (1 - 0.35 * fold);
      const curl = Math.sin(t * 0.6 + a + c.phase) * 0.12;
      const ex = tx + Math.cos(ang + curl) * arm, ey = ty + Math.sin(ang + curl) * arm;
      ctx.strokeStyle = `rgba(${c.hue},0.6)`;
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(ang) * arm * 0.5, ty + Math.sin(ang) * arm * 0.6, ex, ey);
      ctx.stroke();
      ctx.lineWidth = 0.6 * s;
      for (let p = 1; p < 6; p++) {
        const u = p / 6;
        const px = tx + (ex - tx) * u, py = ty + (ey - ty) * u;
        const n = 3 * s * (1 - u * 0.5);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang + 1.3) * n, py + Math.sin(ang + 1.3) * n);
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang - 1.3) * n, py + Math.sin(ang - 1.3) * n);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * A rattail: a big-headed deep fish with a long tapering tail, nosing slowly along the silt
   * and crossing the frame every couple of minutes.
   */
  /**
   * The tripod fish: standing on the silt on three long fin-rays, facing the current, pectoral
   * fins held up like feelers. Touched, it lifts off, swims a little way and settles again.
   */
  function drawTripod(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    sight('tripod-fish');
    const s = st.s * 1.3;
    const touch = startled('tripod-fish', t);
    const hop = touch && touch.age < 6 ? Math.sin(Math.min(1, touch.age / 6) * Math.PI) : 0;
    const x = st.cx - st.w * 0.27 + hop * 40 * s;
    const ground = st.baseY + 4 * s;
    const lift = hop * 30 * s;
    const stand = (1 - hop) * 22 * s;
    const y = ground - stand - lift;
    spot('tripod-fish', x, y, 24 * s);
    ctx.save();
    // The three stilts: two pelvic rays and the tail's long lower ray.
    ctx.strokeStyle = 'rgba(190,190,210,0.7)';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    if (hop < 0.9) {
      ctx.moveTo(x + 4 * s, y + 2 * s);
      ctx.lineTo(x + 6 * s, y + 2 * s + stand);
      ctx.moveTo(x + 1 * s, y + 2 * s);
      ctx.lineTo(x - 1 * s, y + 2 * s + stand);
      ctx.moveTo(x - 16 * s, y);
      ctx.lineTo(x - 20 * s, y + stand + 1 * s);
    }
    // Pectoral feelers raised over the head into the current.
    ctx.moveTo(x + 3 * s, y - 2 * s);
    ctx.quadraticCurveTo(x + 10 * s, y - 14 * s, x + 18 * s, y - 16 * s + Math.sin(t * 1.3) * 2 * s);
    ctx.moveTo(x + 2 * s, y - 2 * s);
    ctx.quadraticCurveTo(x + 6 * s, y - 16 * s, x + 12 * s, y - 20 * s + Math.cos(t * 1.1) * 2 * s);
    ctx.stroke();
    // The body: slim, pale, tapering to the tail.
    ctx.fillStyle = '#4a4860';
    ctx.beginPath();
    ctx.moveTo(10 * s + x, y);
    ctx.quadraticCurveTo(x + 4 * s, y - 5 * s, x - 6 * s, y - 2.5 * s);
    ctx.lineTo(x - 18 * s, y);
    ctx.lineTo(x - 6 * s, y + 2.5 * s);
    ctx.quadraticCurveTo(x + 4 * s, y + 4 * s, x + 10 * s, y);
    ctx.fill();
    ctx.fillStyle = '#c8c4d8';
    ctx.beginPath();
    ctx.arc(x + 6 * s, y - 1 * s, 0.9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * A giant isopod trundling across the silt on many legs, armour plates catching the light.
   * Touched, it rolls up into a ball, then unrolls and goes on.
   */
  function drawIsopod(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    const period = 200;
    const u = (t % period) / period;
    if (u > 0.7) return;
    sight('isopod');
    const s = st.s * 2.2;
    const touch = startled('isopod', t);
    const ball = touch && touch.age < 7 ? Math.min(1, touch.age * 3, (7 - touch.age) / 1.5) : 0;
    const walk = ball > 0 ? 0 : 1;
    const x = st.cx - st.w * 0.12 - (u / 0.7) * st.w * 0.6;
    const y = st.baseY + 2 * s;
    spot('isopod', x, y - 5 * s, 16 * s);
    ctx.save();
    ctx.translate(x, y);
    if (ball > 0.5) {
      // Rolled up: a segmented ball.
      const r = 7 * s;
      ctx.fillStyle = '#b8a8a0';
      ctx.beginPath();
      ctx.arc(0, -r, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,60,0.6)';
      ctx.lineWidth = 0.8 * s;
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.ellipse(k * 2.4 * s, -r, 0.8 * s, r * 0.95, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Legs, scuttling in waves.
      ctx.strokeStyle = 'rgba(200,180,170,0.8)';
      ctx.lineWidth = 0.8 * s;
      for (let k = 0; k < 7; k++) {
        const lx = -8 * s + k * 2.6 * s, ph = Math.sin(t * 8 * walk + k);
        ctx.beginPath();
        ctx.moveTo(lx, -2 * s);
        ctx.lineTo(lx + ph * 1.5 * s, 0);
        ctx.stroke();
      }
      // The armoured back: overlapping plates.
      for (let k = 0; k < 7; k++) {
        const px = -9 * s + k * 3 * s;
        ctx.fillStyle = k % 2 ? '#c4b4ac' : '#b2a29a';
        ctx.beginPath();
        ctx.ellipse(px, -4 * s, 2.4 * s, 4 * s - Math.abs(k - 3) * 0.35 * s, 0, Math.PI, 0);
        ctx.fill();
      }
      // Head with antennae, leading the way (to the left).
      ctx.fillStyle = '#a89890';
      ctx.beginPath();
      ctx.ellipse(-11 * s, -2.5 * s, 2.6 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,180,170,0.7)';
      ctx.beginPath();
      ctx.moveTo(-13 * s, -3 * s);
      ctx.quadraticCurveTo(-17 * s, -7 * s, -20 * s, -6 * s + Math.sin(t * 2) * s);
      ctx.moveTo(-13 * s, -2 * s);
      ctx.quadraticCurveTo(-17 * s, -2 * s, -19 * s, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRattail(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    const period = 150;
    const u = (t % period) / period;
    if (u > 0.6) return;
    sight('rattail');
    const s = st.s * 1.2;
    const x = st.cx - st.w * 0.7 + (u / 0.6) * st.w * 1.4;
    const y = st.baseY + 2 * s + Math.sin(t * 0.6) * 4 * s;
    spot('rattail', x, y, 30 * s);
    ctx.save();
    ctx.translate(x, y);
    // Head down toward the silt, tail trailing up behind.
    ctx.rotate(0.06);
    const body = ctx.createLinearGradient(0, -10 * s, 0, 10 * s);
    body.addColorStop(0, '#3a3550');
    body.addColorStop(1, '#1d1a2c');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(26 * s, 0);
    ctx.quadraticCurveTo(22 * s, -11 * s, 6 * s, -10 * s);
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      const tx = 6 * s - f * 70 * s;
      const ty = -10 * s * (1 - f) + Math.sin(t * 2 + f * 5) * 3 * s * f;
      ctx.lineTo(tx, ty);
    }
    for (let i = 10; i >= 0; i--) {
      const f = i / 10;
      ctx.lineTo(6 * s - f * 70 * s, 7 * s * (1 - f) + Math.sin(t * 2 + f * 5) * 3 * s * f);
    }
    ctx.quadraticCurveTo(22 * s, 9 * s, 26 * s, 0);
    ctx.fill();
    // A big eye that catches the reef's light.
    ctx.fillStyle = 'rgba(150,200,255,0.55)';
    ctx.beginPath();
    ctx.arc(15 * s, -3 * s, 3.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05050c';
    ctx.beginPath();
    ctx.arc(15.5 * s, -3 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
    // Chin barbel, feeling the silt.
    ctx.strokeStyle = 'rgba(150,140,180,0.6)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(22 * s, 5 * s);
    ctx.quadraticCurveTo(24 * s, 10 * s, 21 * s + Math.sin(t * 3) * 2 * s, 13 * s);
    ctx.stroke();
    ctx.restore();
  }

  /** The vent chimney: grows a little with each tier, plume shimmers upward. */
  /** One mineral spire: a knobbly column of sulphide crust, narrowing to a smoking mouth. */
  function drawSpire(ctx: CanvasRenderingContext2D, x: number, base: number, hgt: number, wid: number, k: number, s: number): void {
    const n = 16;
    const knob = (f: number, side: number) =>
      wid * (1 - f * 0.62) * (1 + 0.16 * Math.sin(f * 17 + k * 3 + side) + 0.08 * Math.sin(f * 41 + k + side * 2));
    ctx.beginPath();
    ctx.moveTo(x - knob(0, 0), base);
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      ctx.lineTo(x - knob(f, 0) + Math.sin(f * 5 + k) * 2 * s, base - f * hgt);
    }
    for (let i = n; i >= 0; i--) {
      const f = i / n;
      ctx.lineTo(x + knob(f, 1.3) + Math.sin(f * 5 + k) * 2 * s, base - f * hgt);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(x - wid, 0, x + wid, 0);
    g.addColorStop(0, '#1a1219');
    g.addColorStop(0.55, '#3a2a2e');
    g.addColorStop(1, '#171017');
    ctx.fillStyle = g;
    ctx.fill();
    // Mineral crust: rusty and sulphur-pale flecks clinging to the knobs.
    const r = mulberry32(seed ^ (0x5eed + k));
    for (let i = 0; i < 26; i++) {
      const f = r() * 0.95;
      const side = r() < 0.5 ? -1 : 1;
      const px = x + side * knob(f, side > 0 ? 1.3 : 0) * range(r, 0.2, 0.85);
      const py = base - f * hgt;
      ctx.fillStyle = r() < 0.7 ? `rgba(200,125,80,${range(r, 0.2, 0.45)})` : `rgba(225,215,150,${range(r, 0.18, 0.35)})`;
      ctx.beginPath();
      ctx.ellipse(px, py, range(r, 1.2, 3.2) * s, range(r, 0.8, 2) * s, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Tube worms crowding the warm water at the vent's foot: white stalks with red plumes. */
  function drawTubeWorms(ctx: CanvasRenderingContext2D, x: number, base: number, count: number, s: number, t: number): void {
    sight('tube-worm');
    spot('tube-worm', x, base - 12 * s, 40 * s);
    // Touched, the plumes snap back into their tubes, the nearest first, and creep out again.
    const touch = startled('tube-worm', t);
    for (let i = 0; i < count; i++) {
      const off = ((i * 0.618) % 1 - 0.5) * 70 * s;
      let hide = 0;
      if (touch && touch.age < 10) {
        const a = touch.age - Math.abs(touch.x - (x + off)) / (300 * s);
        hide = a < 0 ? 0 : a < 0.12 ? a / 0.12 : Math.max(0, 1 - (a - 2 - (i % 3)) / 3);
      }
      const len = (14 + ((i * 7) % 5) * 4) * s * (1 - 0.7 * hide);
      const sway = Math.sin(t * 0.9 + i * 1.7) * 2.5 * s;
      const bx = x + off, tx = bx + sway + off * 0.08, ty = base - len;
      ctx.strokeStyle = 'rgba(225,220,205,0.85)';
      ctx.lineWidth = 2.2 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, base + 2 * s);
      ctx.quadraticCurveTo(bx + sway * 0.3, base - len * 0.5, tx, ty);
      ctx.stroke();
      if (hide > 0.9) continue;
      ctx.fillStyle = 'rgba(220,40,60,0.95)';
      ctx.beginPath();
      ctx.ellipse(tx, ty - 2 * s * (1 - hide), 2.6 * s * (1 - 0.6 * hide), 4.2 * s * (1 - hide), sway * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Squat lobsters crowding the vent's warm foot: pale little crabs waving long claws. */
  function drawSquatLobsters(ctx: CanvasRenderingContext2D, x: number, base: number, count: number, s: number, t: number): void {
    sight('squat-lobster');
    spot('squat-lobster', x, base - (14 + count * 4.5) * s, Math.max(24 * s, count * 5 * s));
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      // Clinging to the chimney's sides, at different heights up it.
      const cy = base - (14 + i * 9) * s, cx = x + side * (13 - i * 0.8) * s;
      const wave = Math.sin(t * 1.5 + i * 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(-side * 1.4, 1.4);
      ctx.fillStyle = 'rgba(245,235,220,0.95)';
      ctx.strokeStyle = 'rgba(245,235,220,0.95)';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(0, -2 * s, 4 * s, 2.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // Long claws held out in front, opening and closing.
      ctx.lineWidth = 1 * s;
      for (const dy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-3 * s, -2 * s);
        ctx.lineTo(-11 * s, (-5 + dy * 1.5 + wave) * s);
        ctx.lineTo(-14 * s, (-5 + dy * 2.5 + wave) * s);
        ctx.stroke();
      }
      ctx.lineWidth = 0.7 * s;
      for (let l = 0; l < 3; l++) {
        ctx.beginPath();
        ctx.moveTo(l * 1.5 * s, -1 * s);
        ctx.lineTo((l * 1.5 + 2) * s, 2 * s);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /**
   * Vent shrimp: a pale swarm crowding the upper chimney where the water is warmest, jostling and
   * shifting. Touched, they scatter off the stone and drift back over a few seconds.
   */
  function drawVentShrimp(ctx: CanvasRenderingContext2D, x: number, base: number, hgt: number, tier: number, s: number, t: number): void {
    sight('vent-shrimp');
    const top = base - hgt;
    spot('vent-shrimp', x, top + hgt * 0.25, 22 * s);
    const touch = startled('vent-shrimp', t);
    const scatter = touch && touch.age < 6 ? (touch.age < 0.4 ? touch.age / 0.4 : Math.max(0, 1 - (touch.age - 0.4) / 5.6)) : 0;
    ctx.save();
    for (let i = 0; i < 18 + tier * 8; i++) {
      const h = ((i * 0.37) % 1) * 0.45, side = i % 2 ? 1 : -1;
      const hx = x + side * (9 - h * 6) * s + Math.sin(t * 1.3 + i) * 1.5 * s;
      const hy = top + hgt * (0.06 + h) + Math.sin(t * 0.9 + i * 1.7) * 2 * s;
      const away = scatter * (16 + (i % 5) * 6) * s;
      const px = hx + side * away, py = hy - away * 0.6;
      ctx.fillStyle = 'rgba(235,225,215,0.85)';
      ctx.beginPath();
      ctx.ellipse(px, py, 3 * s, 1.3 * s, side * 0.8 + Math.sin(t * 3 + i) * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Yeti crabs at the foot of the vent: pale, their claws thick with silky hair, waving slowly all
   * in time to feed the bacteria they farm there. Touched, they fold their arms in a moment.
   */
  function drawYetiCrabs(ctx: CanvasRenderingContext2D, x: number, base: number, tier: number, s0: number, t: number): void {
    const s = s0 * 1.4;
    sight('yeti-crabs');
    spot('yeti-crabs', x - 24 * s0, base - 30 * s0, 26 * s0);
    const touch = startled('yeti-crabs', t);
    const fold = touch && touch.age < 4 ? Math.sin(Math.min(1, touch.age / 4) * Math.PI) : 0;
    ctx.save();
    for (let i = 0; i < 1 + tier; i++) {
      const cx = x - (16 + i * 9) * s0, cy = base - (22 + i * 7 + (i % 2) * 3) * s0;
      const side = i % 2 ? -1 : 1;
      // The wave: slow, shared, a little offset crab to crab.
      const wave = Math.sin(t * 1.1 + i * 0.5) * 0.5 * (1 - fold);
      ctx.fillStyle = 'rgba(232,226,212,0.95)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 4.5 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      for (const arm of [-1, 1]) {
        const a = -Math.PI / 2 + arm * (0.7 + wave * arm * side) - fold * arm * 0.6;
        const ex = cx + arm * 3 * s + Math.cos(a) * 9 * s, ey = cy - 1 * s + Math.sin(a) * 9 * s;
        ctx.strokeStyle = 'rgba(232,226,212,0.95)';
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.moveTo(cx + arm * 3 * s, cy - 1 * s);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // The hair: soft strands off the arm, a little yellow with what grows in it.
        ctx.strokeStyle = 'rgba(250,230,160,0.8)';
        ctx.lineWidth = 0.9 * s;
        ctx.beginPath();
        for (let h = 1; h <= 10; h++) {
          const u = h / 10, hx = cx + arm * 3 * s + (ex - cx - arm * 3 * s) * u, hy = cy - 1 * s + (ey - cy + 1 * s) * u;
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx + arm * 4 * s + Math.sin(t * 2 + h + i) * 1 * s, hy + 3.5 * s);
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx - arm * 2 * s + Math.sin(t * 1.7 + h) * 0.8 * s, hy + 3 * s);
        }
        ctx.stroke();
      }
      // Legs.
      ctx.strokeStyle = 'rgba(210,204,190,0.8)';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) for (const arm of [-1, 1]) {
        ctx.moveTo(cx + arm * 2 * s, cy + 1 * s);
        ctx.lineTo(cx + arm * (6 + k * 1.5) * s, cy + (4 - k * 0.5) * s);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawVent(ctx: CanvasRenderingContext2D, st: Stage, tier: number, t: number): { x: number; y: number } {
    const s = st.s;
    const x = st.cx + st.w * 0.3;
    const base = st.baseY + 6 * s;
    const hgt = (55 + tier * 22) * s;
    const top = base - hgt;
    // Each tier raises the main spire and grows another beside it.
    const spires: [number, number, number][] = [[0, hgt, 26 * s]];
    if (tier >= 2) spires.push([-30 * s, hgt * 0.55, 16 * s]);
    if (tier >= 3) spires.push([28 * s, hgt * 0.4, 14 * s]);
    for (let i = spires.length - 1; i >= 0; i--) drawSpire(ctx, x + spires[i]![0], base, spires[i]![1], spires[i]![2], i, s);
    drawTubeWorms(ctx, x, base, 5 + tier * 3, s, t);
    drawSquatLobsters(ctx, x, base, 2 + tier, s, t);
    drawVentShrimp(ctx, x, base, hgt, tier, s, t);
    drawYetiCrabs(ctx, x, base, tier, s, t);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [dx, h] of spires) {
      const flick = 0.35 + 0.1 * Math.sin(t * 2.3 + dx);
      glow(ctx, x + dx, base - h, (h === hgt ? 30 : 18) * s, '255,140,70', flick);
    }
    // Plume: rising, spreading, fading motes of warm cloudy water.
    const n = 46;
    for (let i = 0; i < n; i++) {
      const u = (t * 0.07 + i / n) % 1;
      const px = x + Math.sin(t * 0.8 + i * 2.1) * (4 + u * 26) * s + u * 18 * s;
      const py = top - u * st.h * 0.42;
      glow(ctx, px, py, (6 + u * 26) * s, '170,170,200', (1 - u) * 0.16);
    }
    ctx.restore();
    return { x, y: top };
  }

  return {
    drawBack(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
      drawJelly(ctx, st, jellies[2]!, t);
    },
    drawFront(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
      drawDumbo(ctx, st, t);
      drawChimaera(ctx, st, t);
      drawSeaSpider(ctx, st, t);
      drawStarMarch(ctx, st, t);
      drawJelly(ctx, st, jellies[0]!, t);
      drawJelly(ctx, st, jellies[1]!, t);
    },
    drawFloor(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
      for (const g of sponges) drawSponge(ctx, st, g, t);
      drawSeaPigs(ctx, st, t);
      for (const c of lilies) drawLily(ctx, st, c, t);
      drawSeaPens(ctx, st, t);
      drawOssel(ctx, st, t);
      for (const star of stars) drawStar(ctx, st, star, t);
      drawRattail(ctx, st, t);
      drawTripod(ctx, st, t);
      drawIsopod(ctx, st, t);
    },
    drawVent,
  };
}
