// The Twilight Shelf (Act III): blue water with real light in it, a silted slope, the Rasp
// grazing it, pale sand bars where they have been, and Ossel's dead wall beside the reef —
// until the truce decides what happens to it.

import { drawParrotfish } from './rasp.ts';
import { drawRising } from './rising.ts';
import { createSlugs } from './slugs.ts';
import { drawGhosts } from './ghosts.ts';
import { drawSisterFar } from './sister.ts';
import { drawThorn } from './thorn.ts';
import { drawBreakwater, drawLawn, drawStones, type Stone } from './works.ts';
import { drawRelics } from './relics.ts';
import { drawResidents } from './residents.ts';
import { sight, speaking, spot, startled } from './sightings.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import { facing, glow, speck } from './draw.ts';
import { drawColony, drawDaughters } from './daughters.ts';
import { createGround } from './ground.ts';
import { createLayerCache } from './layer.ts';
import { createForeground } from './foreground.ts';
import { createReef, type Reef, type ReefLayout } from './reef.ts';
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
  /** Scene time of the last frame (the layout reads the night from it). */
  let lastT = 0;
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
    u: i < 11 ? 0.1 + rng() * 0.1 : 0.72 + rng() * 0.16, len: range(rng, 22, 36), light: rng() < 0.6,
  }));
  const water = createLayerCache(0.5);
  // Its own fan in the corner, not another zone's.
  const fore = createForeground(seed ^ 0x3c4f);
  const slugs = createSlugs(7);
  const ruins = createRuins(seed);
  const effects = createEffects();
  let bloom: Bloom | null = null;
  let motes: Mote[] = [];
  const moteSeed = Math.floor(rng() * 1e9);
  const slopeSeed = Math.floor(rng() * 1e9);
  // The slope's two wave phases, from its own seed.
  const [slopePhaseA, slopePhaseB] = ((r) => [r() * 6, r() * 6])(mulberry32(slopeSeed));
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

  /**
   * The cold slide (once met, a moment): every seven minutes a river of cold, salt-heavy water pours
   * down the slope for a while, a pale haze hugging the ground with streaks racing down it.
   */
  function drawColdSlide(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 420, length = 50;
    const p = t % period;
    if (p > length) return;
    const k = Math.min(1, p / 6, (length - p) / 8);
    const s = Math.min(focus.w, focus.h) / 700;
    const x = (u: number) => focus.x - focus.w * 0.1 + u * focus.w * 1.2;
    ctx.save();
    // The haze: a band a little above the ground, thickest downhill where the cold pools.
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) ctx.lineTo(x(i / 40), slopeY(i / 40) - (18 + 26 * (1 - i / 40)) * s);
    for (let i = 40; i >= 0; i--) ctx.lineTo(x(i / 40), slopeY(i / 40) + 4 * s);
    ctx.closePath();
    ctx.fillStyle = `rgba(170,210,240,${0.22 * k})`;
    ctx.fill();
    // Streaks racing downhill along it.
    ctx.strokeStyle = `rgba(210,235,255,${0.6 * k})`;
    ctx.lineWidth = 1.8 * s;
    ctx.lineCap = 'round';
    for (let j = 0; j < 26; j++) {
      const u = 1 - ((t * 0.09 + j * 0.381966) % 1);
      const lift = (4 + (j % 5) * 6) * s;
      const u2 = Math.min(1, u + 0.05);
      ctx.beginPath();
      ctx.moveTo(x(u), slopeY(u) - lift);
      ctx.lineTo(x(u2), slopeY(u2) - lift);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** The slope that gave way (a moment): a pale fan of fallen rubble down the right; scoured, a clean channel through it. */
  function drawSlump(ctx: CanvasRenderingContext2D, channel: boolean): void {
    const s = scale();
    const x = (u: number) => focus.x - focus.w * 0.1 + u * focus.w * 1.2;
    const r = mulberry32(seed ^ 0x51a);
    ctx.save();
    ctx.fillStyle = 'rgba(170,175,190,0.22)';
    ctx.beginPath();
    ctx.moveTo(x(0.97), slopeY(0.97) - 4 * s);
    ctx.lineTo(x(0.72), slopeY(0.72) + 2 * s);
    ctx.lineTo(x(0.86), slopeY(0.86) + 10 * s);
    ctx.closePath();
    ctx.fill();
    // The rubble: broken stones of every size tumbled down the fan, the bigger ones further down.
    const rubble: Stone[] = [];
    for (let i = 0; i < 26; i++) {
      const u = 0.74 + r() * 0.22, lift = r() * 6 * s, rx = (2 + r() * 4) * s;
      rubble.push({ x: x(u), y: slopeY(u) - lift + rx * 0.6, rx, ry: rx * (0.55 + r() * 0.25), seed: i * 1.3 });
    }
    rubble.sort((p, q) => p.y - q.y);
    drawStones(ctx, rubble, 'rgba(150,154,170,0.75)', 'rgba(230,235,250,0.22)', 'rgba(30,34,50,0.5)', s);
    if (channel) {
      ctx.strokeStyle = 'rgba(40,50,80,0.5)';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const u = 0.95 - i * 0.02;
        if (i) ctx.lineTo(x(u), slopeY(u) + 3 * s);
        else ctx.moveTo(x(u), slopeY(u) + 3 * s);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /** The young Rasp the reef fed (a moment): small and pale, asleep on a dead branch low on the reef. */
  function drawYoungRasp(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, t: number): void {
    const s = scale();
    const x = L.cx - L.unit * 0.12, y = L.baseY - L.unit * 0.12;
    if (y > focus.y + focus.h) return;
    const len = 12 * s;
    const breath = 1 + 0.04 * Math.sin(t * 0.9);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.15);
    // A small parrotfish, asleep: its eye closed under a lid.
    const fl = len * breath;
    drawParrotfish(ctx, fl, 165, t * 0.6, s * 0.6);
    ctx.fillStyle = 'hsl(165,36%,42%)';
    ctx.beginPath();
    ctx.arc(fl * 0.6, -fl * 0.17, fl * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,40,40,0.8)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.arc(fl * 0.6, -fl * 0.2, fl * 0.09, 0.3, Math.PI - 0.3);
    ctx.stroke();
    ctx.restore();
    // A small stream of sleeping bubbles.
    ctx.fillStyle = 'rgba(220,235,255,0.6)';
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.3 + i / 3) % 1;
      ctx.beginPath();
      ctx.arc(x + len + Math.sin(u * 6) * 2 * s, y - 6 * s - u * 30 * s, (1 + u * 1.5) * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** The shelf surface: rises gently from left to right across the lower frame. */
  function slopeY(u: number): number {
    const a = slopePhaseA, b = slopePhaseB;
    return focus.y + focus.h * (0.92 - 0.14 * u + 0.015 * Math.sin(u * 9 + a) + 0.008 * Math.sin(u * 23 + b));
  }

  /**
   * Night on the shelf: the light from above fails for a while in every ten minutes of scene time
   * (the same day as the Sunlit Crown above). 0 day … 1 night; the shelf never goes fully dark.
   */
  function nightAt(t: number): number {
    const u = (t % 600) / 600;
    const ramp = (a: number, b: number) => Math.min(1, Math.max(0, (u - a) / (b - a)));
    const x = u < 0.75 ? ramp(0.55, 0.68) : 1 - ramp(0.88, 0.98);
    return x * x * (3 - 2 * x);
  }

  /**
   * Flashlight fish, out only at night: a loose school of small dark fish wandering over the reef,
   * each with a green-white lamp under its eye that it shutters off and on as it turns. Touched,
   * they all go dark at once, then light again one by one.
   */
  function drawFlashlightFish(ctx: CanvasRenderingContext2D, t: number, night: number): void {
    sight('flashlight-fish');
    const s = scale() * 1.3;
    const touch = startled('flashlight-fish', t);
    const cx0 = focus.x + focus.w * (0.18 + 0.08 * Math.sin(t * 0.05)), cy0 = focus.y + focus.h * (0.4 + 0.1 * Math.sin(t * 0.07));
    spot('flashlight-fish', cx0, cy0, Math.max(40 * s, focus.w * 0.08));
    ctx.save();
    // The school's bodies in one path: small dark fish, blunt-headed, a forked tail, each turning
    // through a sliver (draw.ts facing) as it wheels round.
    const bodies = new Path2D(), lamps: number[] = [];
    for (let k = 0; k < 14; k++) {
      const a = t * (0.3 + (k % 5) * 0.04) + k * 2.4;
      const x = cx0 + Math.cos(a) * (30 + (k * 13) % 50) * s, y = cy0 + Math.sin(a * 1.3) * (18 + (k * 7) % 30) * s;
      const dir = -facing(Math.cos(a + Math.PI / 2));
      const wag = Math.sin(t * 8 + k) * 0.4 * s;
      const X = (u: number) => x + u * dir * s, Y = (v: number) => y + v * s;
      bodies.moveTo(X(4.6), Y(0.2));
      bodies.quadraticCurveTo(X(4.2), Y(-2.2), X(1), Y(-2.2));
      bodies.quadraticCurveTo(X(-2), Y(-1.8), X(-3.2), Y(-0.5));
      bodies.lineTo(X(-5.4), Y(-2.1) + wag);
      bodies.lineTo(X(-4.5), Y(0) + wag);
      bodies.lineTo(X(-5.4), Y(2.1) + wag);
      bodies.lineTo(X(-3.2), Y(0.6));
      bodies.quadraticCurveTo(X(-1), Y(2.2), X(1.5), Y(2));
      bodies.quadraticCurveTo(X(4.4), Y(1.8), X(4.6), Y(0.2));
      bodies.closePath();
      // Shuttered now and then and while it turns end-on; all dark for a moment when touched,
      // then back one by one.
      const blink = Math.sin(t * 1.7 + k * 1.9) > 0.85 || Math.abs(dir) < 0.45;
      const dark = touch && touch.age < 2 + k * 0.15;
      if (!blink && !dark) lamps.push(X(2.6), y + 0.6 * s, Math.abs(dir));
    }
    ctx.fillStyle = `rgba(14,16,26,${0.9 * night})`;
    ctx.fill(bodies);
    for (let k = 0; k < lamps.length; k += 3) {
      const lx = lamps[k]!, ly = lamps[k + 1]!, wide = lamps[k + 2]!;
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, lx, ly, 8 * s, '170,255,210', night);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(235,255,240,${night})`;
      ctx.fillRect(lx - 1.1 * s * wide, ly - 0.5 * s, 2.2 * s * wide, 1.6 * s);
    }
    ctx.restore();
  }

  /** The night's veil (strong behind the reef, light in front) and, in front, plankton sparking blue. */
  function drawNight(ctx: CanvasRenderingContext2D, t: number, night: number, veil: number): void {
    ctx.save();
    ctx.fillStyle = `rgba(3,8,30,${veil * night})`;
    ctx.fillRect(0, 0, w, h);
    if (veil < 0.3) {
      ctx.globalCompositeOperation = 'lighter';
      const r = mulberry32(moteSeed ^ 0x71f);
      for (let i = 0; i < 60; i++) {
        const x = focus.x + r() * focus.w, y = focus.y + focus.h * (0.1 + 0.85 * r());
        const flash = Math.max(0, Math.sin(t * (0.5 + r()) + r() * 40)) ** 14;
        if (flash > 0.02) glow(ctx, x, y, 6 * scale(), '110,220,255', 0.7 * flash * night);
      }
    }
    ctx.restore();
  }

  function layout(v: ReefView): ReefLayout {
    // By day the reef's own light fades as it climbs toward the sun (over lit water its halos burn
    // white); by night the polyps open wide and their light shows.
    const dayGlow = 0.85 - 0.4 * progress(v.height), night = nightAt(lastT);
    return {
      glowScale: dayGlow + (1.6 - dayGlow) * night, polypScale: 1 + 0.3 * night,
      cx: cx(), baseY: focus.y + focus.h * 1.02, unit: Math.min(focus.h * 0.78, focus.w * 1.5), s: scale(), dpr,
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
    ground.draw(ctx, w, Math.min(h, focus.y + focus.h), s, surf, { light: '200,212,235', dark: '4,8,22', alpha: 0.75, tracks: false, shelf: true },
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
      // A low dune of warm sand where the wall stood, lying on the slope: its crest lit, rippled by
      // the current, a few grey chips of the old wall half buried in it, and a faint warmth over it
      // that brightens when it speaks.
      const hw = 84 * s, hh = 24 * s;
      const span = focus.w * 1.2;
      const baseAt = (x: number) => slopeY(u + (x - bx) / span) + 2 * s;
      const heightAt = (x: number) => {
        const f = (x - bx) / hw;
        // Steeper on the down-current (left) side, a long tail to the right.
        return hh * Math.max(0, 1 - f * f) * (f < 0 ? 1 + 0.25 * f : 1 - 0.15 * f);
      };
      const N = 24;
      const dune = new Path2D();
      const crest: [number, number][] = [];
      for (let i = 0; i <= N; i++) {
        const x = bx - hw + (2 * hw * i) / N;
        crest.push([x, baseAt(x) - heightAt(x)]);
      }
      dune.moveTo(crest[0]![0], crest[0]![1]);
      for (const [x, y] of crest) dune.lineTo(x, y);
      dune.closePath();
      const g = ctx.createLinearGradient(0, by - hh, 0, by + 2 * s);
      g.addColorStop(0, '#a89070');
      g.addColorStop(1, '#4e4036');
      ctx.fillStyle = g;
      ctx.fill(dune);
      ctx.save();
      ctx.clip(dune);
      // Ripples following the mound, each a little lower.
      ctx.strokeStyle = 'rgba(60,46,36,0.32)';
      ctx.lineWidth = Math.max(1, 0.9 * s);
      ctx.beginPath();
      for (let k = 1; k <= 5; k++) {
        const f = 1 - k / 6;
        for (let i = 0; i <= N; i++) {
          const x = bx - hw + (2 * hw * i) / N;
          const y = baseAt(x) - heightAt(x) * f + Math.sin(x / (7 * s) + k) * 0.8 * s;
          if (i) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
      // Chips of the old grey stone.
      const r = mulberry32(seed ^ 0xd17e);
      ctx.fillStyle = '#5c5866';
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const x = bx + range(r, -0.7, 0.7) * hw;
        const y = baseAt(x) - heightAt(x) * range(r, 0.15, 0.7);
        const rx = range(r, 2, 4.5) * s;
        ctx.moveTo(x + rx, y);
        ctx.ellipse(x, y, rx, rx * 0.55, range(r, -0.4, 0.4), 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.restore();
      // The crest catching the light from above.
      ctx.strokeStyle = 'rgba(220,196,150,0.55)';
      ctx.lineWidth = Math.max(1, 1.2 * s);
      ctx.beginPath();
      for (let i = 3; i <= N - 3; i++) {
        const [x, y] = crest[i]!;
        if (i > 3) ctx.lineTo(x, y + 0.5 * s);
        else ctx.moveTo(x, y + 0.5 * s);
      }
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, bx, by - hh * 0.6, 70 * s, '255,210,150', 0.05 + 0.03 * Math.sin(t * 0.8) + 0.25 * speaking(t));
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
      const talk = speaking(t);
      if (talk > 0) glow(ctx, ox, oy + 6 * s, 50 * s, '210,220,255', 0.25 * talk);
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
   * A moray in a hole in the slope: the head leaning out, mouth opening and shutting as it breathes.
   * Touched, it pulls back into the dark and slowly comes out again.
   */
  function drawMoray(ctx: CanvasRenderingContext2D, t: number): void {
    sight('moray');
    const s = scale() * 1.4;
    const u = 0.235;
    const hx = focus.x - focus.w * 0.1 + u * focus.w * 1.2, hy = slopeY(u) - 10 * s;
    const touch = startled('moray', t);
    const back = touch && touch.age < 7 ? Math.max(0, 1 - Math.max(0, touch.age - 0.3) / 6.7) : 0;
    const out = (0.85 + 0.15 * Math.sin(t * 0.3)) * (1 - back);
    spot('moray', hx - 10 * s, hy, 22 * s);
    ctx.save();
    // Its rock: a lumpy outcrop of old stone on the slope, lit along the top, the hole in its face.
    const rock = new Path2D();
    const foot = slopeY(u) + 4 * s;
    rock.moveTo(hx - 20 * s, foot);
    rock.bezierCurveTo(hx - 21 * s, hy - 6 * s, hx - 14 * s, hy - 15 * s, hx - 4 * s, hy - 14 * s);
    rock.bezierCurveTo(hx + 4 * s, hy - 17 * s, hx + 16 * s, hy - 12 * s, hx + 17 * s, hy - 3 * s);
    rock.bezierCurveTo(hx + 19 * s, hy + 3 * s, hx + 18 * s, foot - 2 * s, hx + 20 * s, foot);
    rock.closePath();
    const rg = ctx.createLinearGradient(0, hy - 16 * s, 0, foot);
    rg.addColorStop(0, '#3a4560');
    rg.addColorStop(0.5, '#263046');
    rg.addColorStop(1, '#161c2c');
    ctx.fillStyle = rg;
    ctx.fill(rock);
    ctx.strokeStyle = 'rgba(150,165,195,0.25)';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(hx - 18 * s, hy - 7 * s);
    ctx.bezierCurveTo(hx - 14 * s, hy - 15 * s, hx - 4 * s, hy - 14 * s, hx - 4 * s, hy - 14 * s);
    ctx.bezierCurveTo(hx + 4 * s, hy - 17 * s, hx + 14 * s, hy - 12 * s, hx + 16 * s, hy - 5 * s);
    ctx.stroke();
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
      g.addColorStop(0, '#647440');
      g.addColorStop(1, '#343e24');
      // A thick neck of even width out of the hole, then a blunt head: the upper jaw curving down
      // to the snout, the lower jaw dropping as it breathes.
      const neck = Math.min(4 * s, -len + 10 * s);
      const tip = -len;
      // The fin along the back, a pale ridge.
      ctx.fillStyle = '#7d8a52';
      ctx.beginPath();
      ctx.moveTo(4 * s, -5 * s);
      ctx.quadraticCurveTo((neck + 4 * s) / 2, -8 * s, neck - 1 * s, -5.6 * s);
      ctx.lineTo(4 * s, -5.6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(4 * s, -5.5 * s);
      ctx.lineTo(neck, -5.5 * s);
      ctx.bezierCurveTo(neck - 5 * s, -5.6 * s, tip + 1 * s, -4 * s, tip, -0.8 * s - gape * 0.3);
      ctx.lineTo(neck - 3 * s, 0.6 * s);
      ctx.lineTo(tip + 0.5 * s, 1 * s + gape * 0.7);
      ctx.bezierCurveTo(tip + 2 * s, 4.5 * s, neck - 4 * s, 5.8 * s, neck, 5.5 * s);
      ctx.lineTo(4 * s, 5.5 * s);
      ctx.closePath();
      ctx.fill();
      // The neck goes back into the dark of the hole.
      const dark = ctx.createLinearGradient(Math.min(-2 * s, neck + 6 * s), 0, 4 * s, 0);
      dark.addColorStop(0, 'rgba(10,15,26,0)');
      dark.addColorStop(1, 'rgba(10,15,26,1)');
      ctx.fillStyle = dark;
      ctx.fill();
      // The mouth's pale lining in the gape, and the jaw line running back.
      ctx.fillStyle = '#d8a0a0';
      ctx.beginPath();
      ctx.moveTo(tip + 0.5 * s, -0.6 * s - gape * 0.3);
      ctx.lineTo(neck - 3 * s, 0.6 * s);
      ctx.lineTo(tip + 1 * s, 0.8 * s + gape * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,26,14,0.7)';
      ctx.lineWidth = Math.max(1, 0.9 * s);
      ctx.beginPath();
      ctx.moveTo(neck - 3 * s, 0.6 * s);
      ctx.lineTo(neck + 1 * s, 1.2 * s);
      ctx.stroke();
      // Mottling: dark blotches and a few pale ones.
      for (let i = 0; i < 9; i++) {
        const mx = 2 * s - (len + 2 * s) * ((i * 0.618) % 1) * 0.85, my = (((i * 0.37) % 1) - 0.5) * 7 * s;
        ctx.fillStyle = i % 3 ? 'rgba(28,34,18,0.45)' : 'rgba(210,220,150,0.25)';
        ctx.beginPath();
        ctx.arc(mx, my, (1 + (i % 2) * 0.5) * s, 0, Math.PI * 2);
        ctx.fill();
      }
      // The eye: pale, with a dark pupil, high on the head.
      ctx.fillStyle = '#e8e0a0';
      ctx.beginPath();
      ctx.arc(tip + 4.5 * s, -2.8 * s, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#10140a';
      ctx.beginPath();
      ctx.arc(tip + 4.3 * s, -2.8 * s, 0.7 * s, 0, Math.PI * 2);
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
    const x = focus.x + focus.w * (0.78 + 0.05 * Math.sin(t * 0.04)), y = focus.y + focus.h * 0.38 + Math.sin(t * 0.15) * 12 * s + sink * 60 * s;
    spot('nautilus', x, y, 18 * s);
    ctx.save();
    ctx.translate(x, y);
    // Tentacles, trailing forward-left from the mouth (pulled in when touched).
    const reach = 1 - sink * 0.8;
    ctx.strokeStyle = 'rgba(206,176,146,0.7)';
    ctx.lineWidth = 0.9 * s;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(-8 * s, 2 * s + i * 0.6 * s);
      ctx.quadraticCurveTo(-14 * s * reach, (2 + i) * s, -(18 + (i % 3) * 3) * s * reach, (3 + i * 1.2) * s + Math.sin(t * 1.5 + i) * 1.5 * s);
      ctx.stroke();
    }
    // The shell: a cream disc (kept below white: it sits in lit water under the bloom), with the
    // tiger stripes as flames curling out from the coil over its older part, the front by the hood plain.
    const g = ctx.createRadialGradient(2 * s, -3 * s, 1 * s, 0, 0, 11 * s);
    g.addColorStop(0, '#cbb894');
    g.addColorStop(1, '#957b56');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 11 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, 11 * s, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(120,56,26,0.85)';
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      // Each flame: narrow at the coil, widening and curling as it runs out past the rim.
      const a = -1.5 + k * 0.42 + (k % 2) * 0.06;
      const w = 0.07 + 0.02 * (k % 3);
      const pt = (ang: number, r: number): [number, number] => [3 * s + Math.cos(ang) * r * s, 0.5 * s + Math.sin(ang) * r * s];
      const [x0, y0] = pt(a, 2.2);
      const [x1, y1] = pt(a + 0.35 - w, 8);
      const [x2, y2] = pt(a + 0.6 - w, 15);
      const [x3, y3] = pt(a + 0.6 + w, 15);
      const [x4, y4] = pt(a + 0.35 + w, 8);
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x1, y1, x2, y2);
      ctx.lineTo(x3, y3);
      ctx.quadraticCurveTo(x4, y4, x0, y0);
    }
    ctx.fill();
    // The rim catching the light along its top.
    ctx.strokeStyle = 'rgba(236,222,196,0.4)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.arc(0, 0, 10.4 * s, -2.6, -0.5);
    ctx.stroke();
    ctx.restore();
    // The coil's navel, set toward the back, and the one suture curling out from it to the mouth.
    ctx.fillStyle = 'rgba(110,80,55,0.75)';
    ctx.beginPath();
    ctx.arc(3 * s, 0.5 * s, 1.7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,90,60,0.55)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(3 * s, -1.2 * s);
    ctx.bezierCurveTo(-1 * s, -2.5 * s, -4 * s, -6 * s, -6.5 * s, -8.4 * s);
    ctx.stroke();
    // The leathery hood capping the shell's mouth, mottled, and an eye under its edge.
    ctx.fillStyle = '#8a5a3a';
    ctx.beginPath();
    ctx.moveTo(-6 * s, -8.6 * s);
    ctx.quadraticCurveTo(-12.5 * s, -6 * s, -12 * s, 0);
    ctx.quadraticCurveTo(-11.5 * s, 4 * s, -8.5 * s, 5.5 * s);
    ctx.quadraticCurveTo(-6.5 * s, 0, -6 * s, -8.6 * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(240,220,190,0.35)';
    ctx.beginPath();
    for (const [mx, my] of [[-10, -4], [-9, -0.5], [-10.6, 1.5], [-8.2, -6]] as const) {
      ctx.moveTo(mx * s + 0.7 * s, my * s);
      ctx.arc(mx * s, my * s, 0.7 * s, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = '#1a1210';
    ctx.beginPath();
    ctx.arc(-9.4 * s, 4.4 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * An upwelling: a column of cold, pale water rising from the deep on one side of the reef,
   * carrying a swirl of plankton motes up with it; brighter while it waits to be caught.
   */
  function drawUpwell(ctx: CanvasRenderingContext2D, t: number, up: { side: number; strength: number; caught: boolean }): void {
    const s = scale();
    const x = focus.x + focus.w * (up.side < 0 ? 0.12 : 0.86);
    const a = up.strength * (up.caught ? 0.4 : 1);
    ctx.save();
    // The column of cold, rich water welling up: paler than the water round it, its edges wavering,
    // widest at the floor and fraying out toward the top.
    const g = ctx.createLinearGradient(x - 80 * s, 0, x + 80 * s, 0);
    g.addColorStop(0, 'rgba(170,220,255,0)');
    g.addColorStop(0.5, `rgba(190,235,255,${0.38 * a})`);
    g.addColorStop(1, 'rgba(170,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const f = i / N, y = focus.y + focus.h * (1 - f);
      const half = (70 - 30 * f) * s + Math.sin(f * 9 - t * 1.4) * 10 * s;
      const cx = x + Math.sin(f * 4 + t * 0.5) * 12 * s;
      if (i === 0) ctx.moveTo(cx - half, y); else ctx.lineTo(cx - half, y);
    }
    for (let i = N; i >= 0; i--) {
      const f = i / N, y = focus.y + focus.h * (1 - f);
      const half = (70 - 30 * f) * s + Math.sin(f * 9 - t * 1.4 + 2) * 10 * s;
      const cx = x + Math.sin(f * 4 + t * 0.5) * 12 * s;
      ctx.lineTo(cx + half, y);
    }
    ctx.closePath();
    ctx.fill();
    // Motes carried up in it, round and of every size, swirling as they rise; the bigger ones glint.
    ctx.fillStyle = `rgba(225,245,255,${0.75 * a})`;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const u = ((i * 0.37 + t * (0.07 + (i % 5) * 0.012)) % 1);
      const px = x + Math.sin(t * 1.2 + i * 2.1 + u * 6) * (14 + (i % 7) * 7) * s * (1 - 0.4 * u);
      const py = focus.y + focus.h * (1 - u);
      const r = (0.8 + (i % 4) * 0.55) * s;
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i += 9) {
      const u = ((i * 0.37 + t * (0.07 + (i % 5) * 0.012)) % 1);
      const px = x + Math.sin(t * 1.2 + i * 2.1 + u * 6) * (14 + (i % 7) * 7) * s * (1 - 0.4 * u);
      glow(ctx, px, focus.y + focus.h * (1 - u), 7 * s, '200,240,255', 0.35 * a * Math.sin(u * Math.PI));
    }
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

  /**
   * A sardine run (rare): every 30 minutes, for a minute, a dense silver river across the upper
   * water. Touched, it opens a hole around the touch, as a shoal does around a hunter, and closes.
   */
  function drawSardineRun(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 1800, length = 60;
    const u = ((t + 600) % period) / length;
    if (u >= 1) return;
    sight('sardine-run');
    const s = scale();
    const k = Math.min(1, u * 6, (1 - u) * 6);
    // Tapped on the band itself, where it crosses the middle of the frame.
    const sx = focus.x + focus.w * 0.5;
    spot('sardine-run', sx, focus.y + focus.h * (0.24 + 0.06 * Math.sin(sx * 0.006 + t * 0.4)), focus.h * 0.1);
    ctx.save();
    ctx.globalAlpha = k;
    // Each a slim silver fish with a forked tail, swimming right; their dark backs in one stroke.
    ctx.fillStyle = '#a9bdd0';
    const fish = new Path2D(), backs = new Path2D();
    const touch = startled('sardine-run', t);
    const open = !touch || touch.age > 3.3 ? 0 : touch.age < 0.3 ? touch.age / 0.3 : 1 - (touch.age - 0.3) / 3;
    const hole = 64 * s;
    for (let i = 0; i < 420; i++) {
      // Packed close around a band that snakes across the water.
      const lane = ((i * 0.618034) % 1) - 0.5;
      let x = focus.x + (((t * 0.09 + i * 0.0071) % 1.2) - 0.1) * focus.w;
      const mid = focus.y + focus.h * (0.24 + 0.06 * Math.sin(x * 0.006 + t * 0.4));
      let y = mid + lane * focus.h * 0.07 * (1 - lane * lane * 2);
      if (open > 0) {
        const dx = x - touch!.x, dy = y - touch!.y, d = Math.hypot(dx, dy) || 1;
        const push = open * hole * Math.exp(-((d / hole) ** 2));
        x += (dx / d) * push;
        y += (dy / d) * push;
      }
      const wag = Math.sin(t * 9 + i) * 0.5 * s;
      fish.moveTo(x + 5 * s, y);
      fish.quadraticCurveTo(x + 1 * s, y - 1.5 * s, x - 3.8 * s, y - 0.5 * s);
      fish.lineTo(x - 6.8 * s, y - 1.9 * s + wag);
      fish.lineTo(x - 5.8 * s, y + wag * 0.5);
      fish.lineTo(x - 6.8 * s, y + 1.9 * s + wag);
      fish.lineTo(x - 3.8 * s, y + 0.5 * s);
      fish.quadraticCurveTo(x + 1 * s, y + 1.4 * s, x + 5 * s, y);
      backs.moveTo(x + 3.6 * s, y - 0.6 * s);
      backs.quadraticCurveTo(x, y - 1.3 * s, x - 3.6 * s, y - 0.4 * s);
    }
    ctx.fill(fish);
    ctx.strokeStyle = 'rgba(40,64,104,0.7)';
    ctx.lineWidth = 0.9 * s;
    ctx.stroke(backs);
    ctx.restore();
  }

  /** A frogfish on the slope, lumpy as a sponge, waving a small lure; touched, it gulps. */
  function drawFrogfish(ctx: CanvasRenderingContext2D, t: number, L: ReefLayout): void {
    sight('frogfish');
    const s = scale() * 1.6;
    // Clear of the pistol shrimp's burrow by the reef's foot (on the narrowest screens they meet:
    // it sits reefward of it).
    const burrow = L.cx - 0.2 * L.unit, gap = 18 * s;
    let x = focus.x - focus.w * 0.1 + 0.4 * focus.w * 1.2;
    if (Math.abs(x - burrow) < gap) x = burrow + gap;
    const u = (x - focus.x + focus.w * 0.1) / (focus.w * 1.2);
    const y = slopeY(u) - 8 * s;
    const touch = startled('frogfish', t);
    const gulp = touch && touch.age < 0.6 ? Math.sin((touch.age / 0.6) * Math.PI) : 0;
    spot('frogfish', x, y, 16 * s);
    ctx.save();
    ctx.translate(x, y);
    // Its arm-like fins, propping it on the slope like elbows, a flat hand on the stone each.
    ctx.strokeStyle = '#8a4a20';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(-3 * s, 4 * s);
    ctx.lineTo(-6.5 * s, 8 * s);
    ctx.moveTo(3 * s, 5 * s);
    ctx.lineTo(2 * s, 8.5 * s);
    ctx.stroke();
    ctx.fillStyle = '#8a4a20';
    ctx.beginPath();
    ctx.ellipse(-7.5 * s, 8.4 * s, 2.4 * s, 1 * s, 0, 0, Math.PI * 2);
    ctx.moveTo(4.2 * s, 8.8 * s);
    ctx.ellipse(2 * s, 8.8 * s, 2.2 * s, 0.9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // The rounded tail fan, curled forward a little.
    ctx.fillStyle = '#9a5424';
    ctx.beginPath();
    ctx.moveTo(8 * s, -1 * s);
    ctx.quadraticCurveTo(15 * s, -7 * s, 16 * s, 0);
    ctx.quadraticCurveTo(15 * s, 5 * s, 8 * s, 2.5 * s);
    ctx.closePath();
    ctx.fill();
    // The squat lumpy body, round as a sponge, with fleshy tags along its edge.
    const body = new Path2D();
    const N = 18;
    const pts: number[] = [];
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2;
      const lump = 1 + 0.07 * Math.sin(5 * a + 1) + 0.05 * Math.sin(9 * a + 2) + (k % 3 === 0 ? 0.08 : 0);
      pts.push(Math.cos(a) * 10 * s * lump, Math.sin(a) * 7.5 * s * lump - (Math.sin(a) < 0 ? 0.8 * s : 0));
    }
    body.moveTo((pts[0]! + pts[2 * N - 2]!) / 2, (pts[1]! + pts[2 * N - 1]!) / 2);
    for (let k = 0; k < N; k++) {
      const n = (k + 1) % N;
      body.quadraticCurveTo(pts[2 * k]!, pts[2 * k + 1]!, (pts[2 * k]! + pts[2 * n]!) / 2, (pts[2 * k + 1]! + pts[2 * n + 1]!) / 2);
    }
    const g = ctx.createRadialGradient(-2 * s, -4 * s, 0, 0, 0, 11 * s);
    g.addColorStop(0, '#d08040');
    g.addColorStop(0.7, '#a8602a');
    g.addColorStop(1, '#7a3e18');
    ctx.fillStyle = g;
    ctx.fill(body);
    // Darker mottling and pale warts, so it passes for a sponge.
    ctx.fillStyle = 'rgba(90,40,16,0.45)';
    ctx.beginPath();
    for (const [mx, my, mr] of [[2, -3, 2.2], [5, 2, 1.8], [-1, 3, 1.6], [6.5, -4, 1.3], [-5, 1.5, 1.2]] as const) {
      ctx.moveTo(mx * s + mr * s, my * s);
      ctx.arc(mx * s, my * s, mr * s, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(240,205,150,0.55)';
    ctx.beginPath();
    for (let k = 0; k < 11; k++) {
      const wx = Math.cos(k * 2.1 + 0.4) * 7.5 * s * ((k % 3) / 3 + 0.4), wy = Math.sin(k * 1.7) * 5.5 * s * ((k % 2) * 0.4 + 0.6);
      ctx.moveTo(wx + 0.6 * s, wy);
      ctx.arc(wx, wy, 0.6 * s, 0, Math.PI * 2);
    }
    ctx.fill();
    // The huge upturned mouth across the front, gaping wide on a gulp.
    ctx.fillStyle = '#2a120a';
    ctx.beginPath();
    ctx.moveTo(-10 * s, -2.5 * s);
    ctx.quadraticCurveTo(-7 * s, (1.5 + 3 * gulp) * s, -2.5 * s, -2.8 * s - gulp * s);
    ctx.quadraticCurveTo(-6.5 * s, (-3.5 - 4 * gulp) * s, -10 * s, -2.5 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,190,140,0.7)';
    ctx.lineWidth = Math.max(1, 0.6 * s);
    ctx.beginPath();
    ctx.moveTo(-10 * s, -2.5 * s);
    ctx.quadraticCurveTo(-7 * s, (1.5 + 3 * gulp) * s, -2.5 * s, -2.8 * s - gulp * s);
    ctx.stroke();
    // A small eye high on the head, ringed gold.
    ctx.fillStyle = '#e0b040';
    ctx.beginPath();
    ctx.arc(-4.5 * s, -6 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#140a06';
    ctx.beginPath();
    ctx.arc(-4.7 * s, -6 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
    // The lure on its rod, flicking: a fleshy tassel at the tip.
    const lx = -11 * s + Math.sin(t * 3) * 2 * s, ly = -15 * s + Math.cos(t * 3) * 1.5 * s;
    ctx.strokeStyle = 'rgba(220,170,120,0.85)';
    ctx.lineWidth = Math.max(1, 0.6 * s);
    ctx.beginPath();
    ctx.moveTo(-6.5 * s, -8.5 * s);
    ctx.quadraticCurveTo(-9 * s, -13 * s, lx, ly);
    for (let k = -1; k <= 1; k++) {
      const a = Math.PI * 0.5 + k * 0.6 + Math.sin(t * 6 + k) * 0.3;
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + Math.cos(a) * 2.2 * s, ly + Math.sin(a) * 2.2 * s);
    }
    ctx.stroke();
    ctx.fillStyle = '#f2e0b0';
    ctx.beginPath();
    ctx.arc(lx, ly, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Sea fans on the slope: flat purple gorgonians standing across the current, a lattice of fine
   * branches swaying together.
   */
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
      // A short stem, then branches fanning out and forking twice; each level's joints and the
      // tips are kept, left to right, for the web between them.
      const levels: [number, number, number][][] = [[], [], [], []];
      const branch = (x0: number, y0: number, ang: number, len: number, depth: number) => {
        const x1 = x0 + Math.sin(ang) * len, y1 = y0 - Math.cos(ang) * len;
        ctx.lineWidth = Math.max(0.6, (3 - depth) * 0.9) * s;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        levels[depth]!.push([ang, x1, y1]);
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
      for (const l of levels) l.sort((p, q) => p[0] - q[0]);
      // The living tissue: a faint web across the whole fan, behind its branches' lines.
      const tips = levels[3]!;
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = f.colour;
      ctx.beginPath();
      ctx.moveTo(0, -hgt * 0.18);
      for (const [, tx, ty] of tips) ctx.lineTo(tx, ty);
      ctx.closePath();
      ctx.fill();
      // Cross-links: neighbouring branches of each level joined, so the fan is a lattice.
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(0.5, 0.45 * s);
      ctx.beginPath();
      for (const l of levels.slice(1)) {
        for (let i = 1; i < l.length; i++) {
          const [, ax, ay] = l[i - 1]!, [, bx, by] = l[i]!;
          if (Math.hypot(bx - ax, by - ay) > hgt * 0.22) continue;
          ctx.moveTo(ax, ay);
          ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + 1.5 * s, bx, by);
        }
      }
      ctx.stroke();
      // Polyps along the outer twigs: tiny pale points.
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = 'rgba(255,240,250,0.9)';
      ctx.beginPath();
      for (const [, tx, ty] of [...tips, ...levels[2]!]) { ctx.moveTo(tx + 0.7 * s, ty); ctx.arc(tx, ty, 0.7 * s, 0, Math.PI * 2); }
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  /**
   * The Rasp nursery (a moment): a lip of stone on the slope by the reef's foot, and the young Rasp
   * that hatched there darting in and out of it.
   */
  function drawNursery(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale() * 1.9;
    const u = 0.38, x = focus.x - focus.w * 0.1 + u * focus.w * 1.2, y = slopeY(u) + 2 * s;
    ctx.save();
    // The lip: a low overhang of old stone, lit along its top, the dark of the crevice under it.
    const lip = new Path2D();
    lip.moveTo(x - 21 * s, y);
    lip.bezierCurveTo(x - 20 * s, y - 6 * s, x - 10 * s, y - 9.5 * s, x + 2 * s, y - 9 * s);
    lip.bezierCurveTo(x + 12 * s, y - 8.6 * s, x + 20 * s, y - 6 * s, x + 21 * s, y);
    lip.closePath();
    const lg = ctx.createLinearGradient(0, y - 9.5 * s, 0, y);
    lg.addColorStop(0, '#8e7e7a');
    lg.addColorStop(1, '#4e4448');
    ctx.fillStyle = lg;
    ctx.fill(lip);
    ctx.fillStyle = 'rgba(10,12,20,0.85)';
    ctx.beginPath();
    ctx.moveTo(x - 13 * s, y);
    ctx.quadraticCurveTo(x - 6 * s, y - 4.2 * s, x + 3 * s, y - 3.8 * s);
    ctx.quadraticCurveTo(x + 11 * s, y - 3.4 * s, x + 13 * s, y);
    ctx.closePath();
    ctx.fill();
    // The young Rasp darting in and out of it: little pale parrotfish, turning as they circle.
    for (let k = 0; k < 5; k++) {
      const a = t * (0.8 + k * 0.13) + k * 1.9;
      const fx = x + Math.cos(a) * (14 + k * 4) * s, fy = y - 10 * s + Math.sin(a * 1.4) * 6 * s;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.scale(facing(-Math.sin(a)), 1);
      drawParrotfish(ctx, 4.2 * s, 180 + k * 12, t * 6 + k, s * 0.35);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * The ledge the reef grew for the cleaner shrimp (a moment): a small shelf on a branch partway
   * up, three striped shrimp on it waving their long white antennae for customers.
   */
  function drawLedge(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, t: number): void {
    const c = reef.coral;
    let node = -1;
    for (let i = 0; i < c.count; i++) if (c.y[i]! > L.top * 0.38 && c.y[i]! < L.top * 0.45 && c.x[i]! > 0.05) { node = i; break; }
    if (node < 0) return;
    const [x, y] = reef.nodePx(L, node);
    const s = scale() * 1.3;
    ctx.save();
    // The shelf: a thin lip of stone grown out from the branch, lit along its top.
    ctx.fillStyle = '#8a6e66';
    ctx.beginPath();
    ctx.moveTo(x - 2 * s, y + 0.5 * s);
    ctx.quadraticCurveTo(x + 12 * s, y - 0.5 * s, x + 25 * s, y + 1.5 * s);
    ctx.quadraticCurveTo(x + 22 * s, y + 4.5 * s, x + 12 * s, y + 4.6 * s);
    ctx.quadraticCurveTo(x + 3 * s, y + 4.4 * s, x - 2 * s, y + 0.5 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(230,205,190,0.6)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(x - 1 * s, y + 0.6 * s);
    ctx.quadraticCurveTo(x + 12 * s, y - 0.3 * s, x + 24 * s, y + 1.6 * s);
    ctx.stroke();
    // Three cleaner shrimp standing on it: red, a white stripe down the back, tail fan spread,
    // long white antennae waving for customers.
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const sx = x + (3 + k * 8) * s, sy = y - 1.2 * s;
      const bob = Math.sin(t * 2 + k * 1.7) * 0.3 * s;
      ctx.save();
      ctx.translate(sx, sy + bob);
      // Legs down to the shelf.
      ctx.strokeStyle = 'rgba(220,70,70,0.85)';
      ctx.lineWidth = 0.4 * s;
      ctx.beginPath();
      for (let l = 0; l < 4; l++) {
        ctx.moveTo((1.6 - l * 0.9) * s, 0.6 * s);
        ctx.lineTo((1.2 - l * 1) * s, 1.9 * s);
      }
      ctx.stroke();
      // The body arching from the head (right) back and down to the tail fan.
      ctx.fillStyle = '#d8323a';
      ctx.beginPath();
      ctx.moveTo(3.4 * s, -0.2 * s);
      ctx.quadraticCurveTo(2.6 * s, -1.7 * s, 0, -1.6 * s);
      ctx.quadraticCurveTo(-2.6 * s, -1.4 * s, -3.4 * s, 0.4 * s);
      ctx.lineTo(-4.8 * s, 0);
      ctx.lineTo(-4.4 * s, 1.4 * s);
      ctx.lineTo(-3 * s, 1.1 * s);
      ctx.quadraticCurveTo(-1 * s, 0.9 * s, 0.5 * s, 0.9 * s);
      ctx.quadraticCurveTo(2.8 * s, 0.9 * s, 3.4 * s, -0.2 * s);
      ctx.fill();
      ctx.strokeStyle = 'rgba(250,250,250,0.95)';
      ctx.lineWidth = 0.55 * s;
      ctx.beginPath();
      ctx.moveTo(3 * s, -0.9 * s);
      ctx.quadraticCurveTo(0, -1.9 * s, -3.3 * s, 0);
      ctx.stroke();
      ctx.fillStyle = '#140808';
      ctx.beginPath();
      ctx.arc(2.6 * s, -0.5 * s, 0.4 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(250,250,250,0.8)';
      ctx.lineWidth = 0.5 * s;
      for (const side of [-1, 1]) {
        const a = -Math.PI / 2 + side * 0.4 + Math.sin(t * 3 + k * 2 + side) * 0.35;
        ctx.beginPath();
        ctx.moveTo(sx + 3.2 * s, sy - 0.6 * s + bob);
        ctx.quadraticCurveTo(sx + 3.2 * s + Math.cos(a) * 5 * s, sy + Math.sin(a) * 5 * s, sx + 3.2 * s + Math.cos(a) * 11 * s, sy + Math.sin(a) * 11 * s);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /** On a thorny seamount, crown-of-thorns starfish dot the slope all the time, creeping slowly. */
  function drawSlopeThorns(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    for (let k = 0; k < 7; k++) {
      const u = ((k * 0.137 + 0.05 + t * 0.0006 * (k % 2 ? 1 : -1)) % 1 + 1) % 1;
      const x = focus.x - focus.w * 0.1 + u * focus.w * 1.2, y = slopeY(u) + 1 * s;
      const r = (8 + (k % 3) * 1.5) * s;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.45);
      ctx.fillStyle = k % 2 ? '#9a3f62' : '#7c4a8a';
      ctx.beginPath();
      for (let a = 0; a < 14; a++) {
        const ang = (a / 14) * Math.PI * 2 + k;
        const rr = a % 2 ? r * 0.6 : r * 1.2;
        if (a === 0) ctx.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
        else ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * A mantis shrimp at the mouth of its burrow on the slope: a bright banded head and forelimbs out
   * of the hole, stalked eyes swivelling on their own. Touched, it strikes: a white flash and a ring.
   */
  function drawMantis(ctx: CanvasRenderingContext2D, t: number): void {
    sight('mantis-shrimp');
    const s = scale() * 2.2;
    // On open sand between the left eel bed and the frogfish, clear of the moray and the octopus;
    // on a narrow screen that slope is full (the reef's floor dwellers stand there too), so it
    // lives right of the reef, before the right eel bed, in front of the breakwater's rubble.
    const u = focus.w / dpr < 600 ? 0.66 : 0.34;
    const x = focus.x - focus.w * 0.1 + u * focus.w * 1.2, base = slopeY(u) + 2 * s;
    spot('mantis-shrimp', x, base - 6 * s, Math.max(20 * s, 22 * dpr));
    const touch = startled('mantis-shrimp', t);
    const strike = touch && touch.age < 0.6 ? touch.age / 0.6 : -1;
    ctx.save();
    // The burrow: a dark mouth in the sand, its back lip in shadow, a pale rim of sand in front.
    ctx.fillStyle = 'rgba(8,12,18,0.85)';
    ctx.beginPath();
    ctx.ellipse(x, base, 8 * s, 2.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    const reach = strike >= 0 ? Math.sin(strike * Math.PI) * 10 * s : 0;
    // It leans out to the left, bobbing a little as it watches.
    const bob = Math.sin(t * 0.8) * 0.4 * s;
    ctx.save();
    ctx.translate(x, base + bob);
    // Leaning well out of the hole toward the open sand, as it does when it watches.
    ctx.rotate(-0.42);
    // Small orange walking legs on the side it leans toward, feeling at the sand.
    ctx.strokeStyle = '#e88a3c';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, 0.45 * s);
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const ly = -2.2 * s - k * 1.7 * s, kick = Math.sin(t * 2.2 + k * 1.3) * 0.5 * s;
      ctx.moveTo(-3 * s, ly);
      ctx.quadraticCurveTo(-5 * s, ly + 0.6 * s, -5.6 * s + kick, ly + 2.4 * s);
    }
    ctx.stroke();
    // The body rising out of the hole: green, tapering to the head, a little curved, spotted like
    // a leopard, its abdomen a stack of overlapping plates.
    const body = new Path2D();
    body.moveTo(4.2 * s, 0);
    body.bezierCurveTo(4.4 * s, -4 * s, 3 * s, -8 * s, 1.6 * s, -10.5 * s);
    body.lineTo(-2.8 * s, -10.2 * s);
    body.bezierCurveTo(-3.6 * s, -7 * s, -4.2 * s, -3.5 * s, -4 * s, 0);
    body.closePath();
    const g = ctx.createLinearGradient(-4 * s, 0, 4 * s, 0);
    g.addColorStop(0, '#5fd08a');
    g.addColorStop(0.6, '#2c9a5c');
    g.addColorStop(1, '#1d6a40');
    ctx.fillStyle = g;
    ctx.fill(body);
    ctx.save();
    ctx.clip(body);
    for (let k = 0; k < 4; k++) {
      const yy = -k * 2.3 * s - 0.6 * s, hw = 4.4 * s - k * 0.5 * s;
      // Each plate's back edge in shadow, its front edge catching the light.
      ctx.strokeStyle = 'rgba(10,40,24,0.65)';
      ctx.lineWidth = Math.max(1, 0.55 * s);
      ctx.beginPath();
      ctx.moveTo(-hw, yy + 0.5 * s);
      ctx.quadraticCurveTo(0, yy - 0.9 * s, hw, yy + 0.5 * s);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(170,245,190,0.35)';
      ctx.lineWidth = Math.max(0.8, 0.35 * s);
      ctx.beginPath();
      ctx.moveTo(-hw, yy - 0.2 * s);
      ctx.quadraticCurveTo(0, yy - 1.6 * s, hw, yy - 0.2 * s);
      ctx.stroke();
    }
    // A pale ridge down the middle of the back.
    ctx.strokeStyle = 'rgba(190,255,210,0.3)';
    ctx.lineWidth = Math.max(0.8, 0.5 * s);
    ctx.beginPath();
    ctx.moveTo(-0.6 * s, 0);
    ctx.quadraticCurveTo(-0.4 * s, -5 * s, -0.9 * s, -10 * s);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(16,50,30,0.55)';
    ctx.beginPath();
    for (const [sx, sy] of [[-1.8, -1.4], [1.4, -3.4], [-0.6, -5.6], [2, -7], [-2.2, -8]] as const) {
      ctx.moveTo(sx * s + 0.45 * s, sy * s);
      ctx.arc(sx * s, sy * s, 0.45 * s, 0, Math.PI * 2);
    }
    ctx.fill();
    // The paddles beside its head (antennal scales), fanning slowly, orange edged with pink.
    for (const side of [-1, 1]) {
      const fan = 0.3 * Math.sin(t * 1.6 + side);
      ctx.save();
      ctx.translate(side * 2.6 * s, -11 * s);
      ctx.rotate(side * (0.9 + fan));
      ctx.fillStyle = '#f08a3a';
      ctx.beginPath();
      ctx.ellipse(0, -2 * s, 1.1 * s, 2.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff7aa8';
      ctx.lineWidth = Math.max(1, 0.4 * s);
      ctx.stroke();
      ctx.restore();
    }
    // The head shield, darker green, its front edge lit.
    ctx.fillStyle = '#237a4a';
    ctx.beginPath();
    ctx.ellipse(-0.9 * s, -11 * s, 3.6 * s, 1.9 * s, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(170,240,190,0.35)';
    ctx.beginPath();
    ctx.ellipse(-1.6 * s, -11.9 * s, 2 * s, 0.6 * s, -0.08, 0, Math.PI * 2);
    ctx.fill();
    // The striking limbs, folded under the head like a praying mantis: a thick red upper arm, the
    // club folded back up against it; on a strike the club unfolds and flicks out.
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const sx = side * 1.6 * s - 0.6 * s, sy = -9.6 * s;
      const ex = sx - 3.2 * s - reach * (side < 0 ? 1 : 0.7), ey = sy + 2.6 * s;
      const fold = strike >= 0 ? Math.sin(strike * Math.PI) : 0;
      const cx2 = ex + (1 - fold) * 2.4 * s - fold * 3 * s, cy2 = ey - (1 - fold) * 3.2 * s + fold * 0.6 * s;
      // A dark edge first, so each limb has a solid outline against the green.
      for (const [w, col, fore] of [[2.3, 'rgba(60,10,14,0.75)', 1.8], [1.7, side < 0 ? '#e0443a' : '#b8302c', 1.3]] as const) {
        ctx.strokeStyle = col;
        ctx.lineWidth = w * s;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.lineWidth = fore * s;
        if (w < 2) ctx.strokeStyle = side < 0 ? '#ff6a4a' : '#d84a3a';
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();
      }
      // The arm's lit edge.
      ctx.strokeStyle = 'rgba(255,190,160,0.5)';
      ctx.lineWidth = 0.4 * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 0.5 * s);
      ctx.lineTo(ex, ey - 0.5 * s);
      ctx.stroke();
      // The club at the elbow: a hard pale knob with a shine.
      ctx.fillStyle = 'rgba(60,10,14,0.75)';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.35 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = side < 0 ? '#ffd0a0' : '#e0a878';
      ctx.beginPath();
      ctx.arc(ex, ey, 1.05 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.arc(ex - 0.35 * s, ey - 0.35 * s, 0.35 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Antennae, long and fine, swept back.
    ctx.strokeStyle = 'rgba(255,180,120,0.75)';
    ctx.lineWidth = Math.max(1, 0.35 * s);
    ctx.beginPath();
    for (const k of [0, 1]) {
      ctx.moveTo(-3 * s, -11.6 * s);
      ctx.quadraticCurveTo(-6 * s, -17 * s - k * 2 * s, -2 * s + k * 3 * s + Math.sin(t * 1.1 + k) * s, -21 * s);
    }
    ctx.stroke();
    // Eyes on stalks, each looking its own way: an oval cut across by a dark band.
    for (const [k, side] of [[0, -1], [1, 1]] as const) {
      const a = -Math.PI / 2 + side * 0.4 + Math.sin(t * (0.9 + k * 0.6) + k * 2) * 0.5;
      const bx = -1 * s + side * 1.2 * s, by = -12.4 * s;
      const ex = bx + Math.cos(a) * 4.5 * s, ey = by + Math.sin(a) * 4.5 * s;
      ctx.strokeStyle = '#d8b34a';
      ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.save();
      ctx.translate(ex, ey);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillStyle = '#6ac8f0';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.9 * s, 1.3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#123040';
      ctx.fillRect(-1.9 * s, -0.25 * s, 3.8 * s, 0.5 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(-0.6 * s, -0.7 * s, 0.35 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    // The rim of sand in front of the hole, over the body's foot.
    ctx.fillStyle = 'rgba(120,130,150,0.55)';
    ctx.beginPath();
    ctx.ellipse(x, base + 0.6 * s, 8.6 * s, 2 * s, 0, 0, Math.PI);
    ctx.fill();
    if (strike >= 0) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x + reach, base - 7 * s, (6 + 20 * strike) * s, '255,250,230', 0.8 * (1 - strike));
      ctx.strokeStyle = `rgba(230,245,255,${0.6 * (1 - strike)})`;
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.arc(x + reach, base - 7 * s, 18 * strike * s, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Garden eels: a colony of thin eels standing out of their burrows in the sand, all leaning into
   * the current to catch drifting food, and ducking down in waves when something passes.
   * `which` colony (the left one is the first eleven eels); `drop` lowers the burrows on the sand.
   */
  function drawGardenEels(ctx: CanvasRenderingContext2D, t: number, which: 'all' | 'left' | 'right' = 'all', drop = 0): void {
    sight('garden-eel');
    const s = scale();
    // Touched, the whole colony drops into its burrows from the nearest outward, and comes back
    // up slowly, the bravest first.
    const touch = startled('garden-eel', t);
    for (const u of [0.15, 0.8]) {
      if ((which === 'left' && u > 0.5) || (which === 'right' && u < 0.5)) continue;
      spot('garden-eel', focus.x - focus.w * 0.1 + u * focus.w * 1.2, slopeY(u) - 15 * s + (u > 0.5 ? drop : 0), Math.max(36 * s, focus.w * 0.12));
    }
    const edge = new Path2D(), light = new Path2D(), dark = new Path2D(), heads = new Path2D(), spots = new Path2D(), eyes = new Path2D();
    for (const [k, e] of eels.entries()) {
      if ((which === 'left' && k >= 11) || (which === 'right' && k < 11)) continue;
      const x = focus.x - focus.w * 0.1 + e.u * focus.w * 1.2;
      const base = slopeY(e.u) + 3 * s + drop;
      // Every so often a wave of ducking runs through the colony.
      const wave = Math.max(0, Math.sin(t * 0.25 - e.u * 6));
      let out = 1 - Math.pow(wave, 6) * 0.85;
      // They sleep in their burrows at night, a few of the bravest still half out.
      out *= 1 - nightAt(t) * (k % 5 === 0 ? 0.5 : 0.97);
      if (touch && touch.age < 12 && Math.abs(touch.x - x) < focus.w * 0.25) {
        const a = touch.age - Math.abs(touch.x - x) / (600 * s);
        const hide = a < 0 ? 0 : a < 0.25 ? a / 0.25 : Math.max(0, 1 - (a - 3 - (k % 4) * 1.5) / 3);
        out = Math.min(out, 1 - hide * 0.97);
      }
      if (out < 0.04) continue;
      const len = e.len * s * out;
      const lean = 0.35 + 0.12 * Math.sin(t * 0.7 + k);
      // A slim body rising out of the burrow, bent over at the top like a question mark so the
      // head (a little thicker) faces down into the current.
      const tx = x + lean * len * 0.6, ty = base - len * 0.85;
      const hx = tx + 3.2 * s, hy = ty + 1.6 * s;
      const body = e.light ? light : dark;
      for (const p of [edge, body]) {
        p.moveTo(x, base);
        p.quadraticCurveTo(x + lean * len * 0.2, base - len * 0.6, tx, ty);
      }
      heads.moveTo(tx, ty);
      heads.lineTo(hx, hy);
      // Dark speckles down the body, and the eye.
      for (let q = 0.3; q < 0.95; q += 0.22) {
        const sx = x + 2 * (1 - q) * q * lean * len * 0.2 + q * q * (tx - x), sy = base + 2 * (1 - q) * q * -len * 0.6 + q * q * (ty - base);
        const off = ((k + q * 10) % 2 ? 0.6 : -0.6) * s;
        spots.moveTo(sx + off + 0.55 * s, sy);
        spots.arc(sx + off, sy, 0.55 * s, 0, Math.PI * 2);
      }
      eyes.moveTo(hx - 0.3 * s + 0.75 * s, hy - 0.9 * s);
      eyes.arc(hx - 0.3 * s, hy - 0.9 * s, 0.75 * s, 0, Math.PI * 2);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(40,36,30,0.55)';
    ctx.lineWidth = 3.8 * s;
    ctx.stroke(edge);
    ctx.lineWidth = 2.6 * s;
    ctx.strokeStyle = 'rgba(200,190,164,0.95)';
    ctx.stroke(light);
    ctx.strokeStyle = 'rgba(160,150,128,0.95)';
    ctx.stroke(dark);
    // The heads: the same pale, a touch thicker, with their edge.
    ctx.strokeStyle = 'rgba(40,36,30,0.55)';
    ctx.lineWidth = 4.6 * s;
    ctx.stroke(heads);
    ctx.strokeStyle = 'rgba(196,186,162,1)';
    ctx.lineWidth = 3.4 * s;
    ctx.stroke(heads);
    ctx.fillStyle = 'rgba(60,52,40,0.6)';
    ctx.fill(spots);
    ctx.fillStyle = 'rgba(20,20,20,0.95)';
    ctx.fill(eyes);
    ctx.restore();
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
    // Its resting places lie between the moray's hole and the mantis shrimp's burrow.
    const restAt = (k: number) => 0.26 + ((k * 0.37) % 1) * 0.04;
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
    // Arms: each a filled ribbon tapering from the base to a fine tip that curls over (alternately
    // up and under), joined near the body by a web of skin; the pale suckers show along the
    // underside toward the tip.
    const suckers = new Path2D();
    const web: [number, number][][] = [[], []];
    const arms = new Path2D();
    const L: [number, number][] = [], R: [number, number][] = [];
    for (let a = 0; a < 8; a++) {
      const side = a < 4 ? -1 : 1;
      const k = a % 4;
      const reach = (8.5 + k * 2.6) * s * (1 + 0.3 * moving);
      const wave = Math.sin(t * (moving ? 6 : 0.8) + a * 1.3) * 3 * s;
      const x0 = side * 2 * s, y0 = 2 * s, cx = side * reach * 0.5, cy = 6 * s + wave, x1 = side * reach, y1 = 8 * s - k * 1.5 * s + wave;
      const at = (u: number): [number, number] => [(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y1];
      // The spine: ten steps along the curve, then the curl (the heading turning a little more
      // each step, which way set by the arm and breathing slowly).
      const pts: [number, number][] = [];
      for (let i = 0; i <= 10; i++) pts.push(at(i / 10));
      let [px, py] = pts[10]!;
      let ang = Math.atan2(y1 - cy, x1 - cx);
      const turn = (a % 2 ? 1 : -1) * side * (0.42 + 0.12 * Math.sin(t * 0.7 + a));
      for (let i = 1; i <= 5; i++) {
        ang += turn;
        px += Math.cos(ang) * 1.3 * s;
        py += Math.sin(ang) * 1.3 * s;
        pts.push([px, py]);
      }
      L.length = 0;
      R.length = 0;
      const n = pts.length - 1;
      for (let i = 0; i <= n; i++) {
        const [ax, ay] = pts[Math.max(0, i - 1)]!, [bx, by] = pts[Math.min(n, i + 1)]!;
        const dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1;
        const w = (0.25 + 1.45 * Math.pow(1 - i / n, 1.4)) * s;
        const [qx, qy] = pts[i]!;
        L.push([qx - (dy / d) * w, qy + (dx / d) * w]);
        R.push([qx + (dy / d) * w, qy - (dx / d) * w]);
      }
      arms.moveTo(L[0]![0], L[0]![1]);
      for (const [qx, qy] of L) arms.lineTo(qx, qy);
      for (let i = n; i >= 0; i--) arms.lineTo(R[i]![0], R[i]![1]);
      arms.closePath();
      web[side < 0 ? 0 : 1]!.push(pts[4]!);
      for (const i of [6, 8, 10, 12]) {
        const [sx, sy] = pts[i]!;
        const r = (0.62 - i * 0.025) * s;
        suckers.moveTo(sx + r, sy + 0.9 * s);
        suckers.arc(sx, sy + 0.9 * s, r, 0, Math.PI * 2);
      }
    }
    // The web, a shade darker than the arms, fills between the four arms on each side.
    ctx.fillStyle = `rgb(${Math.round(rC * 0.82)},${Math.round(gC * 0.82)},${Math.round(bC * 0.82)})`;
    ctx.beginPath();
    ctx.moveTo(0, -1 * s);
    for (const [wx, wy] of web[0]!) ctx.lineTo(wx, wy);
    ctx.lineTo(0, 5 * s);
    for (const [wx, wy] of web[1]!.slice().reverse()) ctx.lineTo(wx, wy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgb(${rC},${gC},${bC})`;
    ctx.fill(arms);
    ctx.strokeStyle = `rgba(${Math.round(rC * 0.5)},${Math.round(gC * 0.5)},${Math.round(bC * 0.5)},0.35)`;
    ctx.lineWidth = 0.5 * s;
    ctx.stroke(arms);
    ctx.fillStyle = `rgba(${Math.min(255, rC + 70)},${Math.min(255, gC + 60)},${Math.min(255, bC + 50)},0.5)`;
    ctx.fill(suckers);
    // Mantle: lit from above, with darker mottling and a short siphon at its side.
    const mg = ctx.createRadialGradient(-2 * s, -9 * s, 0, 0, -4 * s, 10 * s);
    mg.addColorStop(0, `rgb(${Math.min(255, rC + 30)},${Math.min(255, gC + 26)},${Math.min(255, bC + 22)})`);
    mg.addColorStop(1, `rgb(${Math.round(rC * 0.78)},${Math.round(gC * 0.78)},${Math.round(bC * 0.78)})`);
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.ellipse(0, -4 * s, 7 * s, 9 * s * (1 + 0.1 * moving), -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(${Math.round(rC * 0.6)},${Math.round(gC * 0.6)},${Math.round(bC * 0.6)},0.28)`;
    ctx.beginPath();
    for (const [mx, my, mr] of [[-2.5, -9, 1.3], [1.5, -7.5, 1], [-3.5, -4, 1.1], [0.5, -11.5, 0.9], [-1, -2, 0.8], [2.5, -4.2, 0.7]] as const) {
      ctx.moveTo((mx + mr) * s, my * s);
      ctx.arc(mx * s, my * s, mr * s, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.strokeStyle = `rgb(${Math.round(rC * 0.85)},${Math.round(gC * 0.85)},${Math.round(bC * 0.85)})`;
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(5 * s, 1.5 * s);
    ctx.quadraticCurveTo(7 * s, 2.2 * s, 7.6 * s, 0.8 * s + Math.sin(t * 1.1) * 0.5 * s);
    ctx.stroke();
    // The eye: a golden iris on a raised lid of skin, its pupil a dark bar with rounded ends.
    ctx.fillStyle = 'rgba(210,170,96,0.95)';
    ctx.beginPath();
    ctx.ellipse(4 * s, -1 * s, 1.7 * s, 1.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(3.2 * s, -1 * s);
    ctx.lineTo(4.8 * s, -1 * s);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(90,60,40,0.6)';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    ctx.arc(4 * s, -1 * s, 1.9 * s, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
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
    ctx.moveTo(33 * s, -0.5 * s);
    ctx.bezierCurveTo(28 * s, -15 * s, -8 * s, -17 * s, -25 * s, -5 * s);
    ctx.lineTo(-25 * s, 5 * s);
    ctx.bezierCurveTo(-8 * s, 15 * s, 24 * s, 14 * s, 34.5 * s, (4 + 3 * gape) * s);
    ctx.lineTo(22 * s, (1.5 + 0.5 * gape) * s);
    ctx.closePath();
    ctx.save();
    ctx.fill();
    ctx.clip();
    // Mottling: pale and dark blotches, inside the body only.
    const mr = mulberry32(0x6a0b);
    const dark = new Path2D(), pale = new Path2D();
    for (let k = 0; k < 30; k++) {
      const mx = range(mr, -24, 28), my = range(mr, -13, 12);
      const rx = range(mr, 1.4, 3.2) * s, ry = rx * range(mr, 0.55, 0.9);
      const p = k % 3 ? dark : pale;
      p.moveTo(mx * s + rx, my * s);
      p.ellipse(mx * s, my * s, rx, ry, range(mr, 0, Math.PI), 0, Math.PI * 2);
    }
    ctx.fillStyle = 'rgba(35,26,20,0.4)';
    ctx.fill(dark);
    ctx.fillStyle = 'rgba(210,190,150,0.22)';
    ctx.fill(pale);
    // Gill cover: an arc that lifts as it breathes.
    ctx.strokeStyle = 'rgba(30,22,16,0.6)';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc((12 - gape) * s, 0, 11 * s, -1.1, 1.1);
    ctx.stroke();
    ctx.restore();
    // The open mouth: a wide gape, the lower jaw jutting past the upper, a reddish throat going dark
    // inside, and thick pale lips.
    const throat = ctx.createLinearGradient(34 * s, 0, 22 * s, 0);
    throat.addColorStop(0, '#5a2a24');
    throat.addColorStop(1, '#140a08');
    ctx.fillStyle = throat;
    ctx.beginPath();
    ctx.moveTo(33 * s, -0.5 * s);
    ctx.quadraticCurveTo(27 * s, (0.4 + 0.6 * gape) * s, 22 * s, (1.5 + 0.5 * gape) * s);
    ctx.quadraticCurveTo(28 * s, (3 + 2 * gape) * s, 34.5 * s, (4 + 3 * gape) * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(176,146,112,0.9)';
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.4 * s;
    ctx.beginPath();
    ctx.moveTo(33.6 * s, -1 * s);
    ctx.quadraticCurveTo(28 * s, (-0.2 + 0.6 * gape) * s, 23.5 * s, (1 + 0.5 * gape) * s);
    ctx.moveTo(35 * s, (4.6 + 3 * gape) * s);
    ctx.quadraticCurveTo(28.5 * s, (3.9 + 2.2 * gape) * s, 23.5 * s, (2.3 + 0.5 * gape) * s);
    ctx.stroke();
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

  /** The thermocline: where warm water rides over cold, a faint band that bends the light and wavers. */
  function drawThermocline(ctx: CanvasRenderingContext2D, t: number, night: number): void {
    const s = scale();
    const y0 = focus.y + focus.h * (0.34 + 0.02 * Math.sin(t * 0.05));
    ctx.save();
    const g = ctx.createLinearGradient(0, y0 - 30 * s, 0, y0 + 30 * s);
    g.addColorStop(0, 'rgba(160,210,255,0)');
    g.addColorStop(0.5, `rgba(160,210,255,${0.07 * (1 - night * 0.6)})`);
    g.addColorStop(1, 'rgba(160,210,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(focus.x, y0 - 30 * s, focus.w, 60 * s);
    ctx.strokeStyle = `rgba(200,230,255,${0.12 * (1 - night * 0.6)})`;
    ctx.lineWidth = 1 * s;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = focus.x; x <= focus.x + focus.w; x += 10 * s) {
        const y = y0 + (k - 1) * 9 * s + Math.sin(x / (60 * s) + t * (0.5 + k * 0.2) + k) * 4 * s;
        if (x === focus.x) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Fireworms: on nights after a full moon, small green rings of light spiral up from the sand to
   * spawn. A touched ring flares, bright and wide, and fades back.
   */
  function drawFireworms(ctx: CanvasRenderingContext2D, t: number, night: number): void {
    sight('fireworms');
    const s = scale();
    const touch = startled('fireworms', t);
    const a = Math.min(1, (night - 0.5) * 4);
    const x = (u: number) => focus.x - focus.w * 0.1 + u * focus.w * 1.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const u0 = 0.08 + ((i * 0.618) % 1) * 0.84;
      const rise = (t * 0.05 + i * 0.29) % 1;
      const cx0 = x(u0), cy0 = slopeY(u0) - rise * focus.h * 0.45;
      // Each ring bright enough to see can be tapped (the first one alone sat at the far left,
      // often off the scene or under the panel).
      if (Math.sin(rise * Math.PI) > 0.6) spot('fireworms', cx0, cy0, 26 * s);
      // (the touch followed up as the ring rises: 0.05 of its climb a second)
      const flare = touch && touch.age < 2.5 && Math.hypot(touch.x - cx0, touch.y - touch.age * 0.05 * focus.h * 0.45 - cy0) < 30 * s ? Math.exp(-touch.age * 1.6) : 0;
      const r = (10 + 5 * Math.sin(i)) * s * (1 + 0.5 * flare);
      const b = Math.min(1, a * Math.sin(rise * Math.PI) + 0.7 * flare);
      // The worm's ring of light (a yellow-green, which stays green over the blue water where a
      // pure green turned teal), and the spark of each worm chasing round it, brighter at its head.
      ctx.strokeStyle = `rgba(170,255,120,${(0.3 * b).toFixed(3)})`;
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.ellipse(cx0, cy0, r, r * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let k = 0; k < 8; k++) {
        const ang = t * 4 + i + k * (Math.PI / 4);
        glow(ctx, cx0 + Math.cos(ang) * r, cy0 + Math.sin(ang) * r * 0.6, 6.5 * s, '170,255,120', b * (0.35 + 0.65 * (k / 8)));
      }
    }
    ctx.restore();
  }

  /**
   * Rarely (every fifteen minutes), a great herd of Rasp streams along the shelf from right to
   * left, far off. Touched, the fish near the touch scatter and close ranks again.
   */
  function drawRaspHerd(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 900, length = 60;
    const p = (t + 450) % period;
    if (p > length) return;
    sight('rasp-herd');
    const s = scale();
    const fade = Math.min(1, p / 6, (length - p) / 6);
    const r = mulberry32(seed ^ 0x4e2d);
    const mid = focus.x + focus.w / 2, nearest = { d: Infinity, x: 0, y: 0 };
    ctx.save();
    // Far off and, by night, in the dark with everything else: a dimmer, deeper blue.
    const n = nightAt(t);
    ctx.globalAlpha = 0.85 * fade * (1 - 0.4 * n);
    ctx.fillStyle = `rgb(${Math.round(90 - 48 * n)},${Math.round(138 - 66 * n)},${Math.round(156 - 52 * n)})`;
    // Touched, the fish near the touch scatter up and down away from it, tails beating hard (the
    // extra beat is the integral of a fading boost, so the tails never jump), and close ranks.
    const touch = startled('rasp-herd', t);
    const ta = touch && touch.age < 3 ? touch.age : 0;
    const scatter = ta === 0 ? 0 : ta < 0.3 ? ta / 0.3 : 1 - (ta - 0.3) / 2.7;
    const beat = 12 * (ta - (ta * ta) / 6);
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const lag = r() * 0.5, lane = r(), size = 0.6 + r() * 0.6;
      const u = (p / length) * 1.6 - lag;
      if (u < -0.1 || u > 1.1) continue;
      const x = focus.x + focus.w * (1.05 - u * 1.1);
      let y = focus.y + focus.h * (0.45 + lane * 0.2) + Math.sin(t * 1.3 + i) * 3 * s;
      if (scatter > 0) y += Math.sign(y - touch!.y || 1) * scatter * 26 * s * Math.exp(-(((x - touch!.x) / (90 * s)) ** 2));
      // The tappable one: the fish nearest the middle (the first drawn may be off the scene).
      if (Math.abs(x - mid) < nearest.d) { nearest.d = Math.abs(x - mid); nearest.x = x; nearest.y = y; }
      const len = 11 * s * size, L = len, tail = Math.sin(t * 6 + beat + i) * len * 0.15;
      // Far off, each a parrotfish's outline (swimming left): a blunt brow, an arched back, a fan
      // of a tail; the whole herd in one path.
      ctx.moveTo(x - L * 0.92, y - L * 0.12);
      ctx.bezierCurveTo(x - L * 0.8, y - L * 0.5, x - L * 0.1, y - L * 0.54, x + L * 0.35, y - L * 0.32);
      ctx.quadraticCurveTo(x + L * 0.62, y - L * 0.18, x + L * 0.84, y - L * 0.12);
      ctx.lineTo(x + L * 1.34, y - L * 0.44 + tail);
      ctx.quadraticCurveTo(x + L * 1.22, y + tail * 0.6, x + L * 1.34, y + L * 0.44 + tail);
      ctx.lineTo(x + L * 0.84, y + L * 0.12);
      ctx.quadraticCurveTo(x + L * 0.5, y + L * 0.26, x + L * 0.1, y + L * 0.42);
      ctx.bezierCurveTo(x - L * 0.4, y + L * 0.5, x - L * 0.8, y + L * 0.34, x - L * 0.92, y + L * 0.14);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();
    if (nearest.d < Infinity) spot('rasp-herd', nearest.x, nearest.y, 60 * s);
  }

  /**
   * A sixgill shark, rarely (once in thirteen minutes): long, dark and slow, gliding low along the
   * slope from one side to the other, its eye glinting green. Touched, it turns down and away.
   */
  function drawSixgill(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 780, pass = 90;
    const u = (t % period) / pass;
    if (u >= 1) return;
    sight('sixgill');
    const s = scale() * 2.2;
    const touch = startled('sixgill', t);
    const dive = touch && touch.age < 8 ? Math.min(1, touch.age / 3) : 0;
    const su = 1 - u;
    const x = focus.x - focus.w * 0.1 + su * focus.w * 1.2;
    const y = slopeY(Math.max(0, Math.min(1, su))) - 75 * s + dive * 50 * s;
    spot('sixgill', x, y, 45 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dive * 0.25);
    ctx.scale(-1, 1);
    const sway = Math.sin(t * 1.3) * 3 * s;
    const g = ctx.createLinearGradient(0, -10 * s, 0, 10 * s);
    // Dark, near black above and a dusky grey-brown below, sitting in the blue.
    g.addColorStop(0, 'rgba(24,28,36,0.94)');
    g.addColorStop(0.6, 'rgba(40,44,52,0.92)');
    g.addColorStop(1, 'rgba(78,80,86,0.9)');
    ctx.fillStyle = g;
    // Body: long and heavy, blunt-headed, tapering to a long upper tail lobe with a small lower one.
    ctx.beginPath();
    ctx.moveTo(42 * s, 0.5 * s);
    ctx.bezierCurveTo(42 * s, -6 * s, 30 * s, -9 * s, 14 * s, -9 * s);
    ctx.quadraticCurveTo(-20 * s, -8.5 * s, -48 * s, -3 * s + sway);
    ctx.lineTo(-58 * s, -5 * s + sway * 1.3);
    ctx.quadraticCurveTo(-70 * s, -9 * s + sway * 1.5, -80 * s, -12 * s + sway * 1.7);
    ctx.quadraticCurveTo(-72 * s, -3 * s + sway * 1.5, -62 * s, 0.5 * s + sway * 1.4);
    ctx.lineTo(-66 * s, 4.5 * s + sway * 1.4);
    ctx.lineTo(-54 * s, 2.5 * s + sway * 1.2);
    ctx.quadraticCurveTo(-20 * s, 8 * s, 12 * s, 8.5 * s);
    ctx.bezierCurveTo(30 * s, 8.5 * s, 42 * s, 5 * s, 42 * s, 0.5 * s);
    ctx.fill();
    // The one dorsal fin, set far back and swept, and a broad pectoral.
    ctx.beginPath();
    ctx.moveTo(-22 * s, -7.5 * s);
    ctx.quadraticCurveTo(-28 * s, -16 * s, -36 * s, -15.5 * s);
    ctx.quadraticCurveTo(-34 * s, -10 * s, -38 * s, -6.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16 * s, 6 * s);
    ctx.quadraticCurveTo(12 * s, 14 * s, 2 * s, 17 * s);
    ctx.quadraticCurveTo(4 * s, 11 * s, -2 * s, 7.5 * s);
    ctx.closePath();
    ctx.fill();
    // A paler belly line along the flank.
    ctx.strokeStyle = 'rgba(150,158,168,0.2)';
    ctx.lineWidth = 2 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(34 * s, 4 * s);
    ctx.quadraticCurveTo(0, 6.5 * s, -40 * s, 2 * s + sway * 0.8);
    ctx.stroke();
    // Six gill slits, a shade lighter than the dark hide.
    ctx.strokeStyle = 'rgba(110,116,128,0.5)';
    ctx.lineWidth = 0.8 * s;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo((24 - k * 2.6) * s, -4 * s);
      ctx.quadraticCurveTo((22.6 - k * 2.6) * s, -0.5 * s, (23.4 - k * 2.6) * s, 3 * s);
      ctx.stroke();
    }
    ctx.fillStyle = '#0c1012';
    ctx.beginPath();
    ctx.arc(32 * s, -3 * s, 1.6 * s, 0, Math.PI * 2);
    ctx.fill();
    // The green eye.
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 32 * s, -3 * s, 5 * s, '120,255,160', 0.8);
    ctx.restore();
  }

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
    // Edges of the ribbon: the back (where the fin runs) and the belly, from the sway's own tangent.
    const N = 40;
    const back: [number, number][] = [], belly: [number, number][] = [], nrm: [number, number][] = [];
    for (let i = 0; i <= N; i++) {
      const f = i / N;
      const [x, y] = pt(f), [x2, y2] = pt(Math.min(1, f + 0.01) + (f >= 1 ? 0 : 0));
      let tx = x2 - x, ty = y2 - y;
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      const nx = ty === 0 && tx === 0 ? -1 : -ty, ny = tx;
      // Blunt at the head, tapering to a thread at the tail.
      const hw = (3.8 - 3.2 * f) * s * (0.55 + 0.45 * Math.min(1, f / 0.05));
      nrm.push([nx, ny]);
      back.push([x + nx * hw, y + ny * hw]);
      belly.push([x - nx * hw, y - ny * hw]);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // The dorsal fin, one red membrane along the whole back with a wave running down it, and its rays.
    const outer: [number, number][] = [];
    for (let i = 2; i <= N - 1; i++) {
      const f = i / N;
      const hgt = (4.2 + 1.6 * Math.sin(f * 24 - t * 4)) * s * (1 - f * 0.45);
      outer.push([back[i]![0] + nrm[i]![0] * hgt, back[i]![1] + nrm[i]![1] * hgt]);
    }
    ctx.fillStyle = 'rgba(226,72,74,0.55)';
    ctx.beginPath();
    ctx.moveTo(back[2]![0], back[2]![1]);
    for (const [x, y] of outer) ctx.lineTo(x, y);
    for (let i = N - 1; i >= 2; i--) ctx.lineTo(back[i]![0], back[i]![1]);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(170,40,50,0.55)';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    for (let i = 2; i <= N - 1; i++) { ctx.moveTo(back[i]![0], back[i]![1]); ctx.lineTo(outer[i - 2]![0], outer[i - 2]![1]); }
    ctx.stroke();
    // The crest: long red rays streaming up and back from the top of the head, each with a small pennant.
    const [hx, hy] = pt(0.03), [hnx, hny] = nrm[1]!;
    ctx.strokeStyle = 'rgba(232,74,72,0.9)';
    ctx.lineWidth = 1.1 * s;
    ctx.beginPath();
    const tips: [number, number][] = [];
    for (let k = 0; k < 6; k++) {
      const sx0 = hx + hnx * 3 * s, sy0 = hy + hny * 3 * s + k * 2.6 * s;
      const reach = (18 - k * 2) * s, sway = Math.sin(t * 1.7 + k * 0.9) * 3 * s;
      const ex = sx0 + hnx * (8 + k * 2.5) * s + sway, ey = sy0 - reach + hny * 4 * s;
      ctx.moveTo(sx0, sy0);
      ctx.quadraticCurveTo(sx0 + hnx * 2 * s, sy0 - reach * 0.6, ex, ey);
      tips.push([ex, ey]);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(240,96,92,0.95)';
    ctx.beginPath();
    for (const [x, y] of tips) { ctx.moveTo(x + 0.8 * s, y); ctx.ellipse(x, y, 0.8 * s, 2.4 * s, 0.5, 0, Math.PI * 2); }
    ctx.fill();
    // The two "oars": long pelvic rays from under the head, trailing down the belly side to a paddle.
    const [px, py] = belly[3]!, [pnx] = nrm[3]!;
    ctx.strokeStyle = 'rgba(226,90,88,0.8)';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    const paddles: [number, number][] = [];
    for (let k = 0; k < 2; k++) {
      const sway = Math.sin(t * 1.2 + k * 1.4) * 4 * s;
      const ex = px - pnx * (9 + k * 5) * s + sway, ey = py + (34 + k * 9) * s;
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px - pnx * (4 + k * 3) * s, py + 16 * s, ex, ey);
      paddles.push([ex, ey]);
    }
    ctx.stroke();
    ctx.fillStyle = 'rgba(236,104,98,0.9)';
    ctx.beginPath();
    for (const [x, y] of paddles) { ctx.moveTo(x + 1.6 * s, y); ctx.ellipse(x, y, 1.6 * s, 3 * s, 0, 0, Math.PI * 2); }
    ctx.fill();
    // The body itself, silver, lit across.
    const body = ctx.createLinearGradient(x0 - 6 * s, 0, x0 + 6 * s, 0);
    // Kept below white: the bloom would wash a white ribbon out to a featureless glare.
    body.addColorStop(0, '#5f6f88');
    body.addColorStop(0.45, '#a8b4c4');
    body.addColorStop(1, '#55667e');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(back[0]![0], back[0]![1]);
    for (let i = 1; i <= N; i++) ctx.lineTo(back[i]![0], back[i]![1]);
    for (let i = N; i >= 0; i--) ctx.lineTo(belly[i]![0], belly[i]![1]);
    // The rounded brow.
    const [h0x, h0y] = pt(0);
    ctx.quadraticCurveTo(h0x, h0y - 3.5 * s, back[0]![0], back[0]![1]);
    ctx.fill();
    // Dark wavy streaks slanting across the flank, uneven in length, and a pale lateral line.
    ctx.strokeStyle = 'rgba(34,42,62,0.65)';
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    for (let i = 4; i <= N - 3; i += 2) {
      const f = i / N, [x, y] = pt(f), [nx, ny] = nrm[i]!;
      const hw = (3.8 - 3.2 * f) * s;
      const a0 = 0.15 + ((i * 0.618) % 1) * 0.5, a1 = a0 + 0.35 + ((i * 0.38) % 1) * 0.35;
      ctx.moveTo(x + nx * hw * (1 - 2 * a0), y + ny * hw * (1 - 2 * a0) - 1.2 * s);
      ctx.lineTo(x + nx * hw * (1 - 2 * Math.min(0.95, a1)), y + ny * hw * (1 - 2 * Math.min(0.95, a1)) + 1.6 * s);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(225,232,242,0.25)';
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    for (let i = 3; i <= N - 4; i++) {
      const [x, y] = pt(i / N), [nx, ny] = nrm[i]!;
      const hw = (3.8 - 3.2 * (i / N)) * s;
      if (i === 3) ctx.moveTo(x + nx * hw * 0.2, y + ny * hw * 0.2); else ctx.lineTo(x + nx * hw * 0.2, y + ny * hw * 0.2);
    }
    ctx.stroke();
    // Head: an eye with a pale rim, and the small mouth at the tip.
    const [ex0, ey0] = pt(0.025);
    ctx.fillStyle = 'rgba(225,232,242,0.9)';
    ctx.beginPath();
    ctx.arc(ex0 - hnx * 1.2 * s, ey0, 1.9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#141b28';
    ctx.beginPath();
    ctx.arc(ex0 - hnx * 1.2 * s, ey0, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,46,60,0.7)';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    ctx.moveTo(h0x - hnx * 2.6 * s, h0y + 0.5 * s);
    ctx.quadraticCurveTo(h0x - hnx * 1.6 * s, h0y + 2.2 * s, h0x - hnx * 0.2 * s, h0y + 1.6 * s);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Rarely, a whale shark: once in eighteen minutes the biggest fish in the sea glides across the
   * upper water, broad-headed and spotted, mouth open for plankton. Touched, it tips its head down
   * and sinks a little way, unhurried, then rises back to its line.
   */
  function drawWhaleShark(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 1080, crossing = 70;
    const u = ((t + 500) % period) / crossing;
    if (u >= 1) return;
    sight('whale-shark');
    const s = scale() * 2.4;
    const touch = startled('whale-shark', t);
    const ta = touch && touch.age < 9 ? touch.age / 9 : 0;
    const dip = Math.sin(ta * Math.PI);
    const x = focus.x + focus.w * (-0.3 + u * 1.6), y = focus.y + focus.h * 0.3 + Math.sin(t * 0.25) * 8 * s + dip * 22 * s;
    spot('whale-shark', x, y, 70 * s);
    const sweep = Math.sin(t * 1.2);
    ctx.save();
    ctx.translate(x, y);
    // Tipping down at the front while it sinks, levelling as it rises (the head leads the dip).
    ctx.rotate(0.09 * Math.sin(ta * Math.PI * 2));
    // A broad flat head with the mouth across its very front, a long body and a tall tail.
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(61 * s, 1 * s);
      ctx.quadraticCurveTo(60 * s, -11 * s, 32 * s, -13 * s);
      ctx.quadraticCurveTo(-20 * s, -12 * s, -50 * s, -2 * s + sweep * 2 * s);
      ctx.lineTo(-74 * s, -20 * s + sweep * 6 * s);
      ctx.quadraticCurveTo(-68 * s, -6 * s, -64 * s, 0);
      ctx.lineTo(-70 * s, 11 * s + sweep * 4 * s);
      ctx.lineTo(-50 * s, 3 * s + sweep * 2 * s);
      ctx.quadraticCurveTo(-10 * s, 12 * s, 30 * s, 11 * s);
      ctx.quadraticCurveTo(58 * s, 10 * s, 61 * s, 1 * s);
    };
    // Countershaded: dark above, paler below.
    const shade = ctx.createLinearGradient(0, -13 * s, 0, 12 * s);
    shade.addColorStop(0, 'rgba(34,54,84,0.9)');
    shade.addColorStop(0.55, 'rgba(48,72,104,0.88)');
    shade.addColorStop(1, 'rgba(104,128,156,0.85)');
    ctx.fillStyle = 'rgba(34,54,84,0.88)';
    // Dorsal and pectoral fins (behind the body).
    ctx.beginPath();
    ctx.moveTo(2 * s, -12 * s); ctx.quadraticCurveTo(-8 * s, -20 * s, -13 * s, -25 * s); ctx.lineTo(-17 * s, -11 * s); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-34 * s, -6 * s); ctx.lineTo(-39 * s, -12 * s); ctx.lineTo(-42 * s, -4 * s); ctx.fill();
    ctx.fillStyle = shade;
    body();
    ctx.fill();
    ctx.save();
    body();
    ctx.clip();
    // The pattern: pale bars down the flank behind the gills and spots between them, finer
    // spots scattered over the head.
    ctx.strokeStyle = 'rgba(200,220,245,0.38)';
    ctx.lineWidth = 0.8 * s;
    for (let bx = 26; bx > -52; bx -= 7) {
      ctx.beginPath();
      ctx.moveTo(bx * s, -14 * s);
      ctx.quadraticCurveTo((bx - 1.5) * s, 0, bx * s, 6 * s);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(214,230,250,0.55)';
    const sr = mulberry32(0x5a7c);
    for (let k = 0; k < 70; k++) {
      const head = k < 22;
      const sx = head ? 58 - sr() * 26 : 26 - sr() * 78, sy = -12 + sr() * (head ? 14 : 18);
      ctx.beginPath();
      ctx.arc(sx * s, sy * s, (head ? 0.6 : 0.95) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Ridges along the flank.
    ctx.strokeStyle = 'rgba(150,175,205,0.35)';
    ctx.lineWidth = 0.7 * s;
    for (const ry of [-7, -2.5]) {
      ctx.beginPath();
      ctx.moveTo(30 * s, (ry - 1) * s);
      ctx.quadraticCurveTo(-10 * s, (ry + 1) * s, -50 * s, (ry * 0.2 + 0.5) * s);
      ctx.stroke();
    }
    ctx.restore();
    // Gill slits, the eye small and far forward, and the wide mouth.
    ctx.strokeStyle = 'rgba(20,32,52,0.7)';
    ctx.lineWidth = 0.8 * s;
    for (let g = 0; g < 5; g++) {
      const gx = 40 - g * 2.6;
      ctx.beginPath();
      ctx.moveTo(gx * s, -6 * s);
      ctx.quadraticCurveTo((gx - 1.2) * s, 0, gx * s, 6 * s);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(12,20,34,0.9)';
    ctx.beginPath();
    ctx.arc(51 * s, -4.5 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(12,20,34,0.85)';
    ctx.lineWidth = 1.6 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(60.5 * s, 1.5 * s);
    ctx.quadraticCurveTo(58 * s, 4.5 * s, 50 * s, 5 * s);
    ctx.stroke();
    ctx.lineCap = 'butt';
    // The pectoral fin below, in front of the body.
    ctx.fillStyle = 'rgba(40,62,94,0.9)';
    ctx.beginPath();
    ctx.moveTo(28 * s, 8 * s); ctx.quadraticCurveTo(20 * s, 18 * s, 12 * s, 23 * s); ctx.lineTo(10 * s, 10 * s); ctx.fill();
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
    // From a little above: a broad flat head, wings with a full leading edge sweeping back to
    // pointed tips, a hollowed trailing edge, and the body raised down the middle.
    const tipY = 50 * s + flap * 14 * s, tipX = -14 * s - Math.abs(flap) * 3 * s;
    ctx.beginPath();
    ctx.moveTo(25 * s, -9 * s);
    ctx.quadraticCurveTo(20 * s, -36 * s - flap * 8 * s, tipX, -tipY);
    ctx.quadraticCurveTo(-8 * s, -20 * s, -24 * s, -7 * s);
    ctx.quadraticCurveTo(-28 * s, 0, -24 * s, 7 * s);
    ctx.quadraticCurveTo(-8 * s, 20 * s, tipX, tipY);
    ctx.quadraticCurveTo(20 * s, 36 * s + flap * 8 * s, 25 * s, 9 * s);
    ctx.quadraticCurveTo(27 * s, 0, 25 * s, -9 * s);
    ctx.fill();
    // The cephalic fins: two lobes at the corners of the head, rolled forward.
    ctx.beginPath();
    ctx.ellipse(30 * s, -8 * s, 6 * s, 2.2 * s, 0.35, 0, Math.PI * 2);
    ctx.ellipse(30 * s, 8 * s, 6 * s, 2.2 * s, -0.35, 0, Math.PI * 2);
    ctx.fill();
    if (tilt > 0) {
      // The raised body, and the pale chevrons on the shoulders.
      ctx.fillStyle = 'rgba(40,64,104,0.35)';
      ctx.beginPath();
      ctx.ellipse(2 * s, 0, 24 * s, 8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(205,218,235,0.2)';
      ctx.beginPath();
      ctx.ellipse(10 * s, -14 * s, 10 * s, 3.6 * s, -0.7, 0, Math.PI * 2);
      ctx.ellipse(10 * s, 14 * s, 10 * s, 3.6 * s, 0.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Rolled over: the gill slits in two rows on the pale belly.
      ctx.strokeStyle = 'rgba(60,72,96,0.45)';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) for (const side of [-1, 1]) {
        ctx.moveTo((14 - k * 3.5) * s, side * 5 * s);
        ctx.lineTo((13 - k * 3.5) * s, side * 9 * s);
      }
      ctx.stroke();
    }
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
      const dir = facing(Math.cos(a));
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

  /**
   * The Rasp elder, while it asks its riddle: a big old grazer hanging still on the slope left of the
   * reef, scales gone pale, its beak worn down to a stub, fins barely moving.
   */
  function drawElder(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    const x = focus.x + focus.w * 0.22, y = slopeY(0.27) - 60 * s + Math.sin(t * 0.4) * 4 * s;
    const len = 46 * s;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t * 0.3) * 0.04);
    drawParrotfish(ctx, len, 198, t * 1.5, s, true);
    ctx.restore();
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
      drawParrotfish(ctx, len, g.hue, t * 6 + i, s);
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
      lastT = t;
      const night = nightAt(t);
      const L = layout(v);
      // Water and light shafts change slowly: painted at half resolution five times a second.
      water.draw(ctx, w, h, t, 0.2, `${w}x${h} ${p.toFixed(3)}`, (c, tq) => drawWater(c, tq, p));
      ruins.draw(ctx, w, h, focus, v.height, RUINS, t);
      drawManta(ctx, t);
      drawWhaleShark(ctx, t);
      drawOarfish(ctx, t);
      drawSixgill(ctx, t);
      drawRaspHerd(ctx, t);
      drawThermocline(ctx, t, night);
      // The blue hour: as dusk deepens, a short spell when everything is the same deep blue.
      {
        const bh = Math.max(0, 1 - Math.abs(night - 0.45) / 0.2);
        if (bh > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'color';
          ctx.fillStyle = `rgba(30,70,170,${0.35 * bh})`;
          ctx.fillRect(focus.x, focus.y, focus.w, focus.h);
          ctx.restore();
        }
      }
      drawMotes(ctx, t, v.siltLevel);
      drawRising(ctx, t, w, h, focus, dpr, v.rising, false);
      shoals.drawBack(ctx, focus, reef, L, v, t, '#1d3557');
      drawShelf(ctx, v.sandBars, v.siltLevel);
      drawChannels(ctx, t, v.channels);
      drawDaughters(ctx, v.polyps, (u) => [focus.x - focus.w * 0.1 + u * focus.w * 1.2, slopeY(u) + 3 * scale()], scale(), t,
        { branch: '#9a5a6c', tip: '#c98292', polyp: 'rgba(255,225,235,0.9)' }, slopeSeed, v.nurseries);
      drawSeaFans(ctx, t);
      // The breakwater is laid over the right-hand eel bed: that colony then stands on the sand in
      // front of it, drawn after it.
      const walled = v.works.breakwater > 0;
      drawGardenEels(ctx, t, walled ? 'left' : 'all');
      // On a narrow screen the mantis shrimp lives in the breakwater's rubble: drawn after it.
      const narrow = focus.w / dpr < 600;
      if (!narrow) drawMantis(ctx, t);
      if (v.seamount === 'thorny') drawSlopeThorns(ctx, t);
      drawMoray(ctx, t);
      drawCurrent(ctx, t, v.current);
      if (v.upwell) drawUpwell(ctx, t, v.upwell);
      drawNautilus(ctx, t);
      drawFrogfish(ctx, t, L);
      drawSardineRun(ctx, t);
      drawOctopus(ctx, t);
      drawCleaningStation(ctx, t);
      drawWall(ctx, t, v.wall);
      drawRasp(ctx, t, v.rasp, v.raspTrust, v.raspPolite);
      if (v.elder) drawElder(ctx, t);
      if (v.gardeners) drawGardeners(ctx, t);
      drawSiltSlide(ctx, t, v.siltLevel);
      if (v.moments.slope) drawSlump(ctx, v.moments.slope === 'b');
      drawGhosts(ctx, focus, v.ancestors, v.height, t, scale(), 'rgba(190,210,240,1)');
      drawSisterFar(ctx, focus, v.sister - v.gauge, t, scale(), true, v.sisterLit);
      drawBreakwater(ctx, focus, v.works.breakwater, scale(), slopeY);
      if (narrow) drawMantis(ctx, t);
      if (walled) drawGardenEels(ctx, t, 'right', 9 * scale());
      drawLawn(ctx, focus, v.works.lawn, scale(), slopeY);
      if (night > 0) drawNight(ctx, t, night, 0.5);
      reef.draw(ctx, L, v, t);
      // Fragments of other reefs, taken in: small colonies of their own colours at the foot.
      for (let k = 0; k < v.fragments; k++) {
        const fu = [0.38, 0.62, 0.32, 0.68, 0.45, 0.27, 0.73, 0.55][k]!;
        const fxp = focus.x - focus.w * 0.1 + fu * focus.w * 1.2;
        const hue = [12, 290, 40, 180, 330, 90, 220, 0][k]!;
        // Taken in small, each grows to its full size over the next hour.
        const grown = 0.45 + 0.55 * Math.min(1, (v.fragmentAges[k] ?? 3600) / 3600);
        drawColony(ctx, fxp, slopeY(fu) + 2 * scale(), scale() * 1.1 * grown, t,
          { branch: `hsl(${hue},45%,45%)`, tip: `hsl(${hue},60%,70%)`, polyp: 'rgba(255,240,230,0.9)' }, seed ^ (0xf4a + k * 313));
      }
      drawRelics(ctx, reef, L, v.relics, t, v.moments['old-lamp'] === 'a');
      if (v.moments.cleaners === 'a') drawLedge(ctx, reef, L, t);
      if (v.moments.eggs === 'a') drawNursery(ctx, t);
      if (v.moments['young-rasp'] === 'a') drawYoungRasp(ctx, reef, L, t);
      if (v.thorn?.kind === 'thorn-star') drawThorn(ctx, reef, L, v.thorn.u, v.thorn.side, t);
      slugs.draw(ctx, reef, L, t);
      drawResidents(ctx, reef, L, v.residents, t, seed,
        (x) => slopeY(Math.min(1, Math.max(0, (x - focus.x + focus.w * 0.1) / (focus.w * 1.2)))));
      this.crownAt = reef.crown(L);
      reef.drawEffects(ctx, L, v, effects.live(t));
      shoals.drawFront(ctx, focus, reef, L, v, t, '#1d3557');
      if (night > 0.5 && v.moonPhase > 0.5 && v.moonPhase < 0.75) drawFireworms(ctx, t, night);
      if (v.moments['cold-slide']) drawColdSlide(ctx, t);
      if (night > 0) drawNight(ctx, t, night, 0.2);
      if (night > 0.4) drawFlashlightFish(ctx, t, night);
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      fore.draw(ctx, focus, t, '4,12,30', 0.85);
      vignette(ctx);
    },
  };
}
