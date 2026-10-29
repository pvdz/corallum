// The Sunlit Crown (Act IV): turquoise water under a moving ceiling of light, caustics on the
// sand, young reefs of every shape, bright reef fish, drifting larvae. The reef's own shape
// follows its Form dialect: a fan until it chooses, then antlers, a dome, or stacked tables.

import { createSlugs } from './slugs.ts';
import { sight, spot, startled } from './sightings.ts';
import type { DialectId } from '../content/act4.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import type { CoralForm } from './coral.ts';
import { glow } from './draw.ts';
import { drawCraft, FLUORESCENT_POLYP } from './craft.ts';
import { createLayerCache } from './layer.ts';
import { createReef, type Reef, type ReefLayout } from './reef.ts';
import { createEffects, type Focus, type ReefView, type Scene } from './scene.ts';
import { createShoals } from './shoals.ts';

const FROM = 3800;
const TO = 3980;

type Fish = { lane: number; speed: number; phase: number; size: number; hue: number; stripe: boolean };
type Clump = { u: number; size: number; kind: number; hue: number };
type Larva = { x: number; y: number; phase: number; speed: number };

/** Each form's reef, its girth and its stone colours (shadow, flesh, highlight). */
/** Length of a sunlit day, in seconds of scene time. */
const DAY = 600;

const FORM_LOOK: Record<CoralForm, { girth: number; palette: [string, string, string]; polyp: [string, string] }> = {
  fan: { girth: 1, palette: ['#3a1d33', '#c25a76', 'rgba(255,225,210,0.35)'], polyp: ['#ffd2c4', 'rgba(255,240,170,0.95)'] },
  branching: { girth: 0.9, palette: ['#3b2a18', '#d99a54', 'rgba(255,240,200,0.4)'], polyp: ['#7fe0c9', 'rgba(220,255,140,0.95)'] },
  massive: { girth: 3.2, palette: ['#2a3320', '#8fae5e', 'rgba(235,255,200,0.35)'], polyp: ['#ff9ec4', 'rgba(255,220,120,0.95)'] },
  plating: { girth: 1.6, palette: ['#33204a', '#9a6fd0', 'rgba(235,220,255,0.35)'], polyp: ['#ffe08a', 'rgba(140,255,230,0.95)'] },
};

function formOf(id: DialectId | ''): CoralForm {
  return id === 'branching' || id === 'massive' || id === 'plating' ? id : 'fan';
}

export function createSunlitScene(seed: number): Scene {
  const rng = mulberry32(seed ^ 0x5011);
  let w = 1, h = 1, dpr = 1;
  let focus: Focus = { x: 0, y: 0, w: 1, h: 1 };
  const reefSeed = Math.floor(rng() * 1e9);
  const reefs = new Map<CoralForm, Reef>();
  const reefFor = (f: CoralForm) => {
    let r = reefs.get(f);
    if (!r) reefs.set(f, (r = createReef(reefSeed, f, FORM_LOOK[f].girth)));
    return r;
  };
  const shoals = createShoals(seed ^ 0x77);
  const water = createLayerCache(0.5);
  const slugs = createSlugs(7);
  let lastT = 0;
  const effects = createEffects();
  let bloom: Bloom | null = null;
  const fish: Fish[] = Array.from({ length: 14 }, () => ({
    lane: rng(), speed: range(rng, 0.02, 0.05) * (rng() < 0.5 ? -1 : 1), phase: rng(), size: range(rng, 0.6, 1.1),
    hue: [48, 190, 12, 280, 160][Math.floor(rng() * 5)]!, stripe: rng() < 0.5,
  }));
  const clumps: Clump[] = Array.from({ length: 11 }, () => ({
    u: rng(), size: range(rng, 0.5, 1.2), kind: Math.floor(rng() * 3), hue: range(rng, 0, 360),
  }));
  let larvae: Larva[] = [];
  const larvaSeed = Math.floor(rng() * 1e9);

  const scale = () => Math.min(focus.w, focus.h) / 700;
  const cx = () => focus.x + focus.w * 0.5;
  const floorY = (u: number) => focus.y + focus.h * (0.9 + 0.02 * Math.sin(u * 7 + 1.3));

  function progress(height: number): number {
    return Math.max(0, Math.min(1, (height - FROM) / (TO - FROM)));
  }

  function layout(v: ReefView, form: CoralForm): ReefLayout {
    const tall = form === 'massive' ? 0.7 : form === 'plating' ? 0.75 : 0.8;
    return {
      cx: cx(), baseY: focus.y + focus.h * 0.97, unit: focus.h * tall, s: scale(), dpr,
      top: 0.35 + 0.65 * progress(v.height), bandStep: 0, palette: FORM_LOOK[form].palette,
      encrust: 0.8 + 0.2 * progress(v.height), encrustColours: ['#ff6b3d', '#a35cff', '#ffd23f', '#2ec4b6', '#ff4f8b'],
      polyp: v.craft === 'fluorescent' ? FLUORESCENT_POLYP : FORM_LOOK[form].polyp,
      // By night the reef's own light comes back (fluorescent reefs glow brighter still).
      glowScale: (v.craft === 'fluorescent' ? 0.25 : 0) + 0.8 * nightAt(lastT),
      // Polyps pull in against the noon light and open wide to feed at night, as real corals do.
      polypScale: 1.2 * (0.8 + 0.35 * nightAt(lastT)),
    };
  }

  function build(): void {
    const lr = mulberry32(larvaSeed);
    larvae = Array.from({ length: Math.round((w * h) / (dpr * dpr) / 9000) }, () => ({
      x: lr(), y: lr(), phase: lr() * 6, speed: range(lr, 0.004, 0.012),
    }));
  }

  function drawWater(ctx: CanvasRenderingContext2D, t: number, p: number, night: number): void {
    // Day colours blend toward a deep moonlit navy by night.
    const mix = (day: [number, number, number], dark: [number, number, number]) =>
      `rgb(${day.map((c, i) => Math.round(c + (dark[i]! - c) * night)).join(',')})`;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, mix([120 + p * 60, 220 + p * 20, 235 + p * 15], [40, 70, 120]));
    g.addColorStop(0.35, mix([42, 167, 196], [14, 40, 82]));
    g.addColorStop(0.8, mix([15, 108, 147], [6, 22, 52]));
    g.addColorStop(1, mix([10, 79, 112], [4, 14, 36]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // The surface: a bright rippling band with the sun's glare in it (the moon's, at night).
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sx = cx() + focus.w * 0.18;
    glow(ctx, sx, -h * 0.02, h * 0.45, '255,250,220', (0.35 + 0.1 * p) * (1 - night));
    glow(ctx, cx() - focus.w * 0.2, -h * 0.02, h * 0.3, '190,210,255', 0.22 * night);
    ctx.strokeStyle = `rgba(${night > 0.5 ? '190,210,255' : '255,255,255'},${0.18 - 0.08 * night})`;
    ctx.lineWidth = 2 * dpr;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12 * dpr) {
        const y = h * (0.02 + k * 0.025) + Math.sin(x / (40 * dpr) + t * (1 + k * 0.3) + k) * 4 * dpr;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Moon shafts: few, thin and silver.
    if (night > 0) {
      for (let i = 0; i < 3; i++) {
        const bx = cx() - focus.w * (0.2 - i * 0.1) + Math.sin(t * 0.06 + i * 2.7) * focus.w * 0.02;
        const lg = ctx.createLinearGradient(0, 0, 0, h * 0.8);
        lg.addColorStop(0, `rgba(190,210,255,${0.07 * night})`);
        lg.addColorStop(1, 'rgba(190,210,255,0)');
        ctx.fillStyle = lg;
        ctx.beginPath();
        ctx.moveTo(bx - focus.w * 0.006, 0);
        ctx.lineTo(bx + focus.w * 0.006, 0);
        ctx.lineTo(bx + focus.w * 0.03 - focus.w * 0.06, h * 0.8);
        ctx.lineTo(bx - focus.w * 0.03 - focus.w * 0.06, h * 0.8);
        ctx.closePath();
        ctx.fill();
      }
    }
    // Sun shafts.
    for (let i = 0; i < 6 && night < 1; i++) {
      const bx = sx + focus.w * ((i - 3) * 0.12) + Math.sin(t * 0.08 + i * 2.1) * focus.w * 0.03;
      const spread = focus.w * (0.02 + 0.015 * Math.sin(t * 0.13 + i));
      const lg = ctx.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, `rgba(255,255,230,${(0.10 + 0.05 * Math.sin(t * 0.3 + i)) * (1 - night)})`);
      lg.addColorStop(1, 'rgba(255,255,230,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(bx - spread * 0.4, 0);
      ctx.lineTo(bx + spread * 0.4, 0);
      ctx.lineTo(bx + spread * 2.5 - focus.w * 0.1, h);
      ctx.lineTo(bx - spread * 2.5 - focus.w * 0.1, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloor(ctx: CanvasRenderingContext2D, t: number): void {
    const x0 = focus.x - focus.w * 0.1, span = focus.w * 1.2;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i <= 40; i++) ctx.lineTo(x0 + (i / 40) * span, floorY(i / 40));
    ctx.lineTo(w, h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, focus.y + focus.h * 0.88, 0, h);
    g.addColorStop(0, '#e9d7a8');
    g.addColorStop(1, '#b49a6a');
    ctx.fillStyle = g;
    ctx.fill();
    // Caustics: a shifting net of light on the sand.
    ctx.save();
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,255,240,0.22)';
    ctx.lineWidth = 1.5 * dpr;
    const top = focus.y + focus.h * 0.86;
    for (let k = 0; k < 14; k++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 10 * dpr) {
        const y = top + (k / 14) * (h - top) + Math.sin(x / (30 * dpr) + t * 0.9 + k * 1.7) * 5 * dpr
          + Math.sin(x / (13 * dpr) - t * 1.3 + k) * 2.5 * dpr;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Seagrass meadows sown on the sand flats: patches of blades swaying, one patch per meadow. */
  function drawMeadows(ctx: CanvasRenderingContext2D, t: number, meadows: number): void {
    if (meadows <= 0) return;
    const s = scale();
    const x0 = focus.x - focus.w * 0.1, span = focus.w * 1.2;
    for (let m = 0; m < meadows; m++) {
      // Patches alternate left and right of the reef, spreading outward.
      const side = m % 2 ? 1 : -1;
      const u = 0.5 + side * (0.17 + Math.floor(m / 2) * 0.055);
      if (u < 0.02 || u > 0.98) continue;
      for (let b = 0; b < 16; b++) {
        const bu = u + ((b * 0.618) % 1 - 0.5) * 0.05;
        const x = x0 + bu * span, y = floorY(bu) + 2 * s;
        const len = (18 + ((b * 7) % 5) * 5) * s;
        const bend = Math.sin(t * 0.8 + b * 0.9 + m) * 6 * s + 4 * s;
        ctx.strokeStyle = b % 3 ? 'rgba(70,150,90,0.85)' : 'rgba(110,175,95,0.85)';
        ctx.lineWidth = 2.2 * s;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + bend * 0.3, y - len * 0.6, x + bend, y - len);
        ctx.stroke();
      }
    }
  }

  /**
   * The day: 10 minutes of scene time, mostly light, with a dusk, a short night and a dawn.
   * Returns 0 (full day) … 1 (deep night).
   */
  function nightAt(t: number): number {
    const u = (t % DAY) / DAY;
    const ramp = (a: number, b: number) => Math.min(1, Math.max(0, (u - a) / (b - a)));
    const x = u < 0.75 ? ramp(0.55, 0.68) : 1 - ramp(0.88, 0.98);
    return x * x * (3 - 2 * x);
  }

  /**
   * Night over the sunlit water: a deep blue veil (strong behind the reef, light in front of it)
   * and the plankton's sparks, which only show in the dark.
   */
  function drawNight(ctx: CanvasRenderingContext2D, t: number, night: number, veil: number): void {
    ctx.save();
    ctx.fillStyle = `rgba(4,10,40,${veil * night})`;
    ctx.fillRect(0, 0, w, h);
    if (veil < 0.5) {
      // Sparks in front: the plankton flashing when anything moves through it.
      ctx.globalCompositeOperation = 'lighter';
      const r = mulberry32(larvaSeed ^ 0x4e1);
      for (let i = 0; i < 70; i++) {
        const x = focus.x + r() * focus.w, y = focus.y + focus.h * (0.15 + 0.8 * r());
        const ph = r() * 40;
        const flash = Math.max(0, Math.sin(t * (0.6 + r()) + ph)) ** 12;
        if (flash < 0.02) continue;
        glow(ctx, x, y, 6 * scale(), '120,230,255', 0.7 * flash * night);
      }
      // The moon's path on the surface.
      const g = ctx.createLinearGradient(0, 0, 0, focus.y + focus.h * 0.18);
      g.addColorStop(0, `rgba(200,215,255,${0.12 * night})`);
      g.addColorStop(1, 'rgba(200,215,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, focus.y + focus.h * 0.18);
    }
    ctx.restore();
  }

  /**
   * Rain (after the band "Rain"): a shower for one minute in every five. Seen from below, drops
   * make little expanding rings on the surface and the light dims a little.
   */
  function drawRain(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 300, length = 60;
    const u = (t % period) / length;
    if (u >= 1) return;
    const strength = Math.min(1, u * 5, (1 - u) * 5);
    ctx.save();
    ctx.fillStyle = `rgba(20,40,70,${0.12 * strength})`;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = `rgba(230,245,255,${0.55 * strength})`;
    ctx.lineWidth = 1 * dpr;
    const top = focus.y + focus.h * 0.03;
    for (let i = 0; i < 60; i++) {
      const life = 1.2;
      const ph = ((t + i * 0.37) % life) / life;
      const lap = Math.floor((t + i * 0.37) / life);
      const r = mulberry32(i * 977 + lap);
      const x = focus.x + r() * focus.w;
      const y = top + r() * focus.h * 0.05;
      ctx.beginPath();
      ctx.ellipse(x, y, (2 + ph * 14) * dpr, (0.6 + ph * 3) * dpr, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 1 - ph;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Dappled light on the coral: the caustic net from the surface moving over the branches, drawn
   * as soft glints on the reef's nodes where the pattern is bright.
   */
  function drawCausticsOnReef(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, t: number, day: number): void {
    if (day <= 0.05) return;
    const c = reef.coral;
    const s = L.s;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < c.count; i += 2) {
      if (c.y[i]! > L.top || c.parent[i]! < 0) continue;
      const [x, y] = reef.nodePx(L, i);
      // Two crossing wave trains make a moving net; only its bright crests light the stone.
      const u = x / (14 * s), v = y / (14 * s);
      const net = Math.sin(u + t * 0.9) * Math.sin(v * 0.8 - t * 0.7) + Math.sin((u + v) * 0.7 + t * 0.5);
      const a = Math.max(0, net - 0.6) * 0.6 * day;
      if (a < 0.02) continue;
      glow(ctx, x, y, 12 * s, '255,250,215', Math.min(0.6, a));
    }
    ctx.restore();
  }

  /** An anemone on the sand with its pair of clownfish weaving in and out of the tentacles. */
  function drawAnemone(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale() * 1.5;
    const u = 0.79;
    const x = focus.x - focus.w * 0.1 + u * focus.w * 1.2, y = floorY(u) + 2 * s;
    sight('clownfish');
    spot('clownfish', x, y - 20 * s, 34 * s);
    // Tentacles: a fat swaying fountain.
    ctx.lineCap = 'round';
    for (let k = 0; k < 26; k++) {
      const a = -Math.PI / 2 + (k / 25 - 0.5) * 2.4;
      const len = (18 + (k % 4) * 3) * s;
      const sway = Math.sin(t * 1.2 + k * 0.4) * 0.12;
      ctx.strokeStyle = k % 2 ? 'rgba(170,220,120,0.9)' : 'rgba(200,235,150,0.9)';
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(x, y - 4 * s);
      ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5, y - 4 * s + Math.sin(a) * len * 0.6,
        x + Math.cos(a + sway) * len, y - 4 * s + Math.sin(a + sway) * len);
      ctx.stroke();
      ctx.fillStyle = 'rgba(240,120,200,0.9)';
      ctx.beginPath();
      ctx.arc(x + Math.cos(a + sway) * len, y - 4 * s + Math.sin(a + sway) * len, 1.6 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Touched, they dive deep into the tentacles and come out again a little later.
    const touch = startled('clownfish', t);
    const age = touch ? touch.age : Infinity;
    const hide = age < 0.3 ? age / 0.3 : age < 3.5 ? 1 : Math.max(0, 1 - (age - 3.5) / 2);
    // The clownfish: orange with white bands, circling close.
    for (let k = 0; k < 2; k++) {
      const a = t * (0.9 + k * 0.3) * (1 + hide) + k * 2.5;
      const fx = x + Math.cos(a) * (16 + k * 6) * s * (1 - 0.8 * hide);
      const fy = y - (20 - 12 * hide) * s + Math.sin(a * 1.7) * 8 * s * (1 - 0.8 * hide);
      const dir = -Math.sin(a) >= 0 ? 1 : -1;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.scale(dir * (1 - 0.35 * hide), 1 - 0.35 * hide);
      ctx.globalAlpha = 1 - 0.6 * hide;
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6 * s, 3.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-5 * s, 0);
      ctx.lineTo(-9 * s, -3 * s);
      ctx.lineTo(-9 * s, 3 * s);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (const bx of [2.5, -1.5]) ctx.fillRect(bx * s, -3.2 * s, 1.4 * s, 6.4 * s);
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(4 * s, -0.8 * s, 0.7 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Seahorses holding on to the seagrass by their tails, swaying with the blades (3+ meadows). */
  function drawSeahorses(ctx: CanvasRenderingContext2D, t: number, meadows: number): void {
    if (meadows < 3) return;
    const s = scale() * 1.9;
    const x0 = focus.x - focus.w * 0.1, span = focus.w * 1.2;
    sight('seahorse');
    const touch = startled('seahorse', t);
    for (const [k, u] of [0.3, 0.72].entries()) {
      const x = x0 + u * span + Math.sin(t * 0.8 + k) * 3 * s, y = floorY(u) - 20 * s;
      spot('seahorse', x, y, 20 * s);
      // Touched, a seahorse pales to the colour of the sand and draws in, then colours up again.
      const near = touch && touch.age < 6 && Math.hypot(touch.x - x, touch.y - y) < 30 * s;
      const pale = near ? (touch!.age < 0.5 ? touch!.age / 0.5 : Math.max(0, 1 - (touch!.age - 2) / 4)) : 0;
      const [r0, g0, b0] = k ? [224, 160, 64] : [216, 112, 90];
      const mixc = (c: number, to: number) => Math.round(c + (to - c) * pale);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(t * 0.8 + k) * 0.12 * (1 - pale));
      ctx.scale(1 - 0.12 * pale, 1 - 0.12 * pale);
      ctx.strokeStyle = `rgb(${mixc(r0, 235)},${mixc(g0, 220)},${mixc(b0, 185)})`;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.lineCap = 'round';
      // Curled tail, an upright S of a body, a snout and a little fin.
      ctx.lineWidth = 2.4 * s;
      ctx.beginPath();
      ctx.moveTo(0, 12 * s);
      ctx.quadraticCurveTo(4 * s, 16 * s, 2 * s, 18 * s);
      ctx.quadraticCurveTo(-1 * s, 19 * s, 0, 15 * s);
      ctx.stroke();
      ctx.lineWidth = 4.2 * s;
      ctx.beginPath();
      ctx.moveTo(0, 12 * s);
      ctx.bezierCurveTo(4 * s, 6 * s, -3 * s, 0, 1 * s, -6 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(2 * s, -8 * s, 2.6 * s, 2.2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1.6 * s;
      ctx.beginPath();
      ctx.moveTo(3 * s, -8 * s);
      ctx.lineTo(8 * s, -7 * s);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,200,0.7)';
      ctx.beginPath();
      ctx.ellipse(-3 * s, 2 * s, 1.6 * s, 3 * s + Math.sin(t * 9) * 0.6 * s, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Rarely, a mola: once in sixteen minutes an ocean sunfish drifts across, a huge flat silver
   * disc with a tall fin above and below, sculling slowly.
   */
  function drawMola(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 960, crossing = 60;
    const u = ((t + 200) % period) / crossing;
    if (u >= 1) return;
    sight('mola');
    const s = scale() * 2.6;
    const x = focus.x + focus.w * (1.15 - u * 1.3), y = focus.y + focus.h * 0.38 + Math.sin(t * 0.4) * 6 * s;
    spot('mola', x, y, 34 * s);
    // Touched, it sculls hard and tips to look at you with one round eye.
    const touch = startled('mola', t);
    const stir = touch && touch.age < 3 ? 1 - touch.age / 3 : 0;
    const scull = Math.sin(t * (1.4 + 4 * stir)) * (0.35 + 0.25 * stir);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(stir * Math.PI) * 0.25);
    const g = ctx.createLinearGradient(0, -20 * s, 0, 20 * s);
    g.addColorStop(0, '#b8c6d0');
    g.addColorStop(1, '#6f8290');
    ctx.fillStyle = g;
    // Fins first (behind the body), sculling opposite each other.
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.rotate(dir * scull * 0.4);
      ctx.beginPath();
      ctx.moveTo(4 * s, dir * 14 * s);
      ctx.quadraticCurveTo(10 * s, dir * 34 * s, 2 * s, dir * 38 * s);
      ctx.lineTo(-6 * s, dir * 14 * s);
      ctx.fill();
      ctx.restore();
    }
    // The disc, its clipped tail, the eye and small mouth (facing left).
    ctx.beginPath();
    ctx.ellipse(0, 0, 22 * s, 17 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a6b78';
    ctx.beginPath();
    ctx.ellipse(21 * s, 0, 4 * s, 14 * s, 0, -Math.PI / 2, Math.PI / 2);
    ctx.fill();
    ctx.fillStyle = '#1c2228';
    ctx.beginPath();
    ctx.arc(-13 * s, -3 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-21 * s, 1 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * A bait ball: every seven minutes, for forty-five seconds, the small silver fish crowd into a
   * swirling ball in the upper water while a few hunters dart through it.
   */
  function drawBaitBall(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 420, length = 45;
    const u = ((t + 200) % period) / length;
    if (u >= 1) return;
    sight('bait-ball');
    const s = scale();
    const form = Math.min(1, u * 5, (1 - u) * 5);
    const cx = focus.x + focus.w * 0.78, cy = focus.y + focus.h * 0.3;
    // Touched, the ball bursts open in a silver flash and pulls itself together again.
    const touch = startled('bait-ball', t);
    const age = touch ? touch.age : Infinity;
    const burst = age < 0.25 ? age / 0.25 : Math.max(0, 1 - (age - 0.25) / 3.5) ** 2;
    const R = 66 * s * (1 + 1.4 * burst);
    spot('bait-ball', cx, cy, R * 1.3);
    // The ball: fish on rings, swimming round it, the whole thing breathing as the hunters pass.
    const squeeze = 1 - 0.18 * Math.max(0, Math.sin(t * 2.2));
    for (let i = 0; i < 160; i++) {
      const ring = Math.sqrt(((i * 0.618) % 1)) * R * squeeze;
      const a = i * 2.4 + t * (1.2 + (i % 3) * 0.3) * (i % 2 ? 1 : -1);
      const x = cx + Math.cos(a) * ring * (form + (1 - form) * 3);
      const y = cy + Math.sin(a) * ring * 0.75 * (form + (1 - form) * 3);
      const dir = Math.cos(a + Math.PI / 2) * (i % 2 ? 1 : -1);
      ctx.fillStyle = `rgba(215,230,240,${0.85 * form})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 4 * s, 1.4 * s, dir > 0 ? 0.3 : -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Hunters: dark streaks cutting through.
    for (let k = 0; k < 3; k++) {
      const p = ((t * 0.35 + k * 0.33) % 1);
      const hx = cx - R * 2.2 + p * R * 4.4;
      const hy = cy + Math.sin(p * Math.PI * 2 + k * 2) * R * 0.5;
      ctx.fillStyle = `rgba(30,60,90,${0.85 * form})`;
      ctx.beginPath();
      ctx.ellipse(hx, hy, 12 * s, 3.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 11 * s, hy);
      ctx.lineTo(hx - 17 * s, hy - 5 * s);
      ctx.lineTo(hx - 17 * s, hy + 5 * s);
      ctx.fill();
    }
  }

  /**
   * A green turtle comes to graze once there are meadows: it paddles slowly over the seagrass,
   * dips to crop it, and drifts on.
   */
  function drawTurtle(ctx: CanvasRenderingContext2D, t: number, meadows: number): void {
    if (meadows < 2) return;
    sight('turtle');
    const s = scale() * 1.4;
    const period = 140;
    const u = (t % period) / period;
    const dir = Math.floor(t / period) % 2 ? 1 : -1;
    const x = focus.x + focus.w * (dir > 0 ? -0.1 + u * 1.2 : 1.1 - u * 1.2);
    // Touched, it ducks its head and dives a little way, then comes back up.
    const touch = startled('turtle', t);
    const duck = touch && touch.age < 4 ? Math.sin(Math.min(1, touch.age / 4) * Math.PI) : 0;
    const dip = Math.max(Math.max(0, Math.sin(t * 0.5)) ** 4, duck);
    const y = focus.y + focus.h * 0.8 + dip * 14 * s + duck * 30 * s + Math.sin(t * 0.8) * 3 * s;
    const stroke = Math.sin(t * 1.6);
    spot('turtle', x, y, 30 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.rotate(dip * 0.25);
    // Flippers behind the shell, then the shell, then the head.
    ctx.fillStyle = '#5c7a4a';
    for (const [fx, fy, a] of [[8, 6, 0.6 + stroke * 0.5], [-10, 6, -0.4 - stroke * 0.3]] as const) {
      ctx.save();
      ctx.translate(fx * s, fy * s);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, 6 * s, 3 * s, 9 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const shell = ctx.createLinearGradient(0, -12 * s, 0, 8 * s);
    shell.addColorStop(0, '#8a6a3c');
    shell.addColorStop(1, '#4f3c22');
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18 * s, 9 * s, 0, Math.PI, 0);
    ctx.quadraticCurveTo(0, 6 * s, -18 * s, 0);
    ctx.fill();
    // Scutes.
    ctx.strokeStyle = 'rgba(40,28,14,0.6)';
    ctx.lineWidth = 0.8 * s;
    for (const sx of [-8, 0, 8]) {
      ctx.beginPath();
      ctx.ellipse(sx * s, -4 * s, 4 * s, 3 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#6b8a55';
    ctx.beginPath();
    ctx.ellipse(21 * s, -1 * s, 5 * s, 3.5 * s, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(23 * s, -2 * s, 0.9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Other young reefs on the sand, each in one of the three Form shapes. */
  function drawClumps(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    for (const c of clumps) {
      if (Math.abs(c.u - 0.5) < 0.12) continue;
      const x = focus.x - focus.w * 0.1 + c.u * focus.w * 1.2;
      const y = floorY(c.u) + 4 * s;
      const r = 34 * s * c.size;
      ctx.fillStyle = `hsl(${c.hue},45%,52%)`;
      ctx.strokeStyle = `hsl(${c.hue},45%,52%)`;
      ctx.lineCap = 'round';
      if (c.kind === 0) {
        ctx.lineWidth = 4 * s * c.size;
        for (let k = 0; k < 5; k++) {
          const a = -Math.PI / 2 + (k - 2) * 0.35 + Math.sin(t * 0.4 + k) * 0.03;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          ctx.stroke();
        }
      } else if (c.kind === 1) {
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.8, r * 0.55, 0, Math.PI, 0);
        ctx.fill();
        ctx.strokeStyle = `hsla(${c.hue},40%,30%,0.5)`;
        ctx.lineWidth = 1.2 * s;
        for (let k = 1; k < 4; k++) {
          ctx.beginPath();
          ctx.ellipse(x, y, r * 0.8 * (k / 4), r * 0.55 * (k / 4), 0, Math.PI, 0);
          ctx.stroke();
        }
      } else {
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.ellipse(x + (k - 1) * 4 * s, y - k * r * 0.35, r * (1 - k * 0.2), r * 0.12, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  function drawFish(ctx: CanvasRenderingContext2D, t: number): void {
    sight('reef-fish');
    const s = scale();
    for (const f of fish) {
      const u = (((f.phase + t * f.speed) % 1) + 1) % 1;
      const x = focus.x - focus.w * 0.15 + u * focus.w * 1.3;
      const y = focus.y + focus.h * (0.25 + f.lane * 0.55) + Math.sin(t * 0.8 + f.phase * 10) * 10 * s;
      const dir = f.speed > 0 ? 1 : -1;
      const len = 12 * s * f.size;
      spot('reef-fish', x, y, Math.max(len * 1.5, 22 * dpr));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      ctx.fillStyle = `hsl(${f.hue},85%,58%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, len, len * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      const tail = Math.sin(t * 10 + f.phase * 7) * len * 0.2;
      ctx.beginPath();
      ctx.moveTo(-len * 0.8, 0);
      ctx.lineTo(-len * 1.4, -len * 0.5 + tail);
      ctx.lineTo(-len * 1.4, len * 0.5 + tail);
      ctx.closePath();
      ctx.fill();
      if (f.stripe) {
        ctx.fillStyle = 'rgba(20,20,40,0.55)';
        ctx.fillRect(-len * 0.15, -len * 0.6, len * 0.22, len * 1.2);
      }
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(len * 0.55, -len * 0.12, len * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Now and then a whale crosses far off in the haze: a long soft shadow, flukes beating slowly. */
  function drawWhale(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 210, crossing = 80;
    const u = (t % period) / crossing;
    if (u >= 1) return;
    sight('whale');
    const lap = Math.floor(t / period);
    const dir = lap % 2 ? -1 : 1;
    const s = Math.min(focus.w, focus.h) / 700 * 1.6;
    const x = focus.x + focus.w * (dir > 0 ? -0.25 + u * 1.5 : 1.25 - u * 1.5);
    const y = focus.y + focus.h * (0.2 + 0.06 * (lap % 3)) + Math.sin(t * 0.15) * 6 * s;
    const fade = Math.min(1, u * 8, (1 - u) * 8);
    const beat = Math.sin(t * 0.9);
    spot('whale', x, y, 110 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.globalAlpha = 0.28 * fade;
    ctx.fillStyle = '#1f5b7e';
    // Body: blunt head, long taper to the tail stock.
    ctx.beginPath();
    ctx.moveTo(90 * s, 0);
    ctx.bezierCurveTo(90 * s, -18 * s, 40 * s, -24 * s, -10 * s, -18 * s);
    ctx.bezierCurveTo(-50 * s, -12 * s, -80 * s, -4 * s, -100 * s, beat * 3 * s);
    ctx.bezierCurveTo(-80 * s, 8 * s, -40 * s, 18 * s, 0, 20 * s);
    ctx.bezierCurveTo(50 * s, 22 * s, 90 * s, 14 * s, 90 * s, 0);
    ctx.fill();
    // Flukes.
    ctx.beginPath();
    ctx.moveTo(-98 * s, beat * 3 * s);
    ctx.quadraticCurveTo(-112 * s, (-14 + beat * 6) * s, -128 * s, (-16 + beat * 10) * s);
    ctx.quadraticCurveTo(-116 * s, (beat * 6) * s, -128 * s, (16 + beat * 10) * s);
    ctx.quadraticCurveTo(-112 * s, (14 + beat * 6) * s, -98 * s, beat * 3 * s);
    ctx.fill();
    // Long pectoral fin.
    ctx.beginPath();
    ctx.moveTo(40 * s, 12 * s);
    ctx.quadraticCurveTo(20 * s, 40 * s, -6 * s, (46 + beat * 4) * s);
    ctx.quadraticCurveTo(14 * s, 30 * s, 24 * s, 14 * s);
    ctx.fill();
    ctx.restore();
  }

  function drawLarvae(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const s = scale();
    for (const l of larvae) {
      const y = (((l.y - t * l.speed) % 1) + 1) % 1 * h;
      const x = (l.x + Math.sin(t * 0.5 + l.phase) * 0.01) * w;
      glow(ctx, x, y, 3 * s, '255,240,220', 0.5);
    }
    ctx.restore();
  }

  return {
    bloomStrength: 0,
    crownAt: [0, 0] as [number, number],
    darkAt: () => nightAt(lastT) > 0.5,
    effect(kind) {
      effects.push(kind);
    },
    resize(nw, nh, ndpr, nfocus) {
      w = nw; h = nh; dpr = ndpr; focus = nfocus;
      build();
    },
    draw(ctx, t, v) {
      const p = progress(v.height);
      const form = formOf(v.form);
      const reef = reefFor(form);
      lastT = t;
      const night = nightAt(t);
      const L = layout(v, form);
      // The night is quantised so the cache repaints only when it has visibly changed.
      const nq = Math.round(night * 40) / 40;
      water.draw(ctx, w, h, t, 0.2, `${w}x${h} ${p.toFixed(3)} ${nq}`, (c, tq) => drawWater(c, tq, p, nq));
      if (v.bands.includes('rain')) drawRain(ctx, t);
      drawWhale(ctx, t);
      drawMola(ctx, t);
      drawBaitBall(ctx, t);
      drawLarvae(ctx, t);
      shoals.drawBack(ctx, focus, reef, L, v, t, '#5d7d96');
      drawFloor(ctx, t);
      drawMeadows(ctx, t, v.meadows);
      drawSeahorses(ctx, t, v.meadows);
      drawTurtle(ctx, t, v.meadows);
      drawAnemone(ctx, t);
      drawClumps(ctx, t);
      if (night > 0) drawNight(ctx, t, night, 0.6);
      reef.draw(ctx, L, v, t);
      drawCraft(ctx, v.craft, reef, L, t, 1);
      slugs.draw(ctx, reef, L, t);
      this.crownAt = reef.crown(L);
      reef.drawEffects(ctx, L, v, effects.live(t));
      drawCausticsOnReef(ctx, reef, L, t, 1 - night);
      // Reef fish shelter in the branches at night.
      ctx.save();
      ctx.globalAlpha = 1 - 0.85 * night;
      drawFish(ctx, t);
      ctx.restore();
      shoals.drawFront(ctx, focus, reef, L, v, t, '#5d7d96');
      if (night > 0) drawNight(ctx, t, night, 0.3);
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
    },
  };
}
