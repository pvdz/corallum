// The Sunlit Crown (Act IV): turquoise water under a moving ceiling of light, caustics on the
// sand, young reefs of every shape, bright reef fish, drifting larvae. The reef's own shape
// follows its Form dialect: a fan until it chooses, then antlers, a dome, or stacked tables.

import { drawParrotfish } from './rasp.ts';
import { createSlugs } from './slugs.ts';
import { drawSong } from './song.ts';
import { drawThorn } from './thorn.ts';
import { drawTerrace, drawRim } from './works.ts';
import { SHELLS } from '../content/shells.ts';
import { drawRelics } from './relics.ts';
import { drawResidents } from './residents.ts';
import { palette } from '../content/palettes.ts';
import { sight, speaking, spot, startled, pushed } from './sightings.ts';
import type { DialectId } from '../content/act4.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import type { CoralForm } from './coral.ts';
import { glow, drawOsselSand, speck, whaleSilhouette } from './draw.ts';
import { drawCraft, FLUORESCENT_POLYP } from './craft.ts';
import { drawColony, drawDaughters } from './daughters.ts';
import { createLayerCache } from './layer.ts';
import { createForeground } from './foreground.ts';
import { drawShellShape } from './shells.ts';
import { drawGhosts } from './ghosts.ts';
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
  pillar: { girth: 2.4, palette: ['#3a2c1c', '#c9a878', 'rgba(255,245,220,0.4)'], polyp: ['#f2e6c8', 'rgba(255,250,225,0.95)'] },
};

function formOf(id: DialectId | ''): CoralForm {
  return id === 'branching' || id === 'massive' || id === 'plating' || id === 'pillar' ? id : 'fan';
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
  const fore = createForeground(seed);
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
    const pal = palette(v.palette);
    return {
      cx: cx(), baseY: focus.y + focus.h * 0.97, unit: Math.min(focus.h * tall, focus.w * 1.5), s: scale(), dpr,
      top: 0.35 + 0.65 * progress(v.height), bandStep: 0,
      encrustColours: pal.pigments.slice(0, 2 + Math.min(pal.pigments.length - 2, Math.floor(v.pigments / 2))),
      polyp: v.craft === 'fluorescent' ? FLUORESCENT_POLYP : (pal.polyp as [string, string] | null) ?? FORM_LOOK[form].polyp,
      // By night the reef's own light comes back (fluorescent reefs glow brighter still).
      glowScale: (v.craft === 'fluorescent' ? 0.25 : 0) + 0.8 * nightAt(lastT),
      // Polyps pull in against the noon light and open wide to feed at night, as real corals do.
      // The canopy leans the polyps open to the light: wider with each spread.
      // Closed against warm water, they are pulled right in.
      polypScale: 1.2 * (0.8 + 0.35 * nightAt(lastT)) * (1 + 0.025 * Math.min(12, v.canopy)) * (v.heat.closed ? 0.3 : 1),
      // Each pigment grown adds colour: more of the reef crusted, in more hues (rose, gold, green…).
      ...bleached(FORM_LOOK[form].palette, v.heat.bleach, (0.3 + 0.7 * Math.min(1, v.pigments / 6)) * (0.8 + 0.2 * progress(v.height))),
    };
  }

  /**
   * Bleaching: an open reef in warm water loses its colour toward bone white (quantised, so the
   * reef's cached picture repaints only a few times through a spell).
   */
  function bleached(pal: [string, string, string], b: number, encrust: number): { palette: [string, string, string]; encrust: number } {
    const q = Math.round(b * 6) / 6;
    if (q === 0) return { palette: pal, encrust };
    const bone: [number, number, number][] = [[150, 144, 136], [226, 220, 208], [252, 250, 244]];
    const mix = (hex: string, to: [number, number, number]) => {
      const n = parseInt(hex.slice(1), 16);
      const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x, i) => Math.round(x + (to[i]! - x) * q));
      return `#${c.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
    };
    return { palette: [mix(pal[0], bone[0]!), mix(pal[1], bone[1]!), mix(pal[2], bone[2]!)], encrust: encrust * (1 - q) };
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

  /** Specks of drifting matter caught glittering in the sun shafts (drawn every frame, unlike the shafts). */
  function drawShaftMotes(ctx: CanvasRenderingContext2D, t: number, day: number): void {
    if (day <= 0) return;
    const sx = cx() + focus.w * 0.18;
    const s = scale();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const bx = sx + focus.w * ((i - 3) * 0.12) + Math.sin(t * 0.08 + i * 2.1) * focus.w * 0.03;
      for (let j = 0; j < 14; j++) {
        const v = ((j * 0.618034 + i * 0.37 + t * 0.006 * (1 + (j % 3) * 0.4)) % 1);
        const y = v * h * 0.85;
        // Within the shaft, which leans and widens with depth.
        const x = bx - focus.w * 0.1 * v + (((j * 0.381966 + i * 0.5) % 1) - 0.5) * focus.w * (0.02 + 0.08 * v) + Math.sin(t * 0.5 + j) * 3 * s;
        const tw = Math.max(0, Math.sin(t * (1.1 + (j % 5) * 0.3) + j * 1.7 + i));
        if (tw < 0.3) continue;
        const al = (tw - 0.3) * day * (1 - v * 0.6);
        glow(ctx, x, y, 5 * s, '255,250,215', 0.5 * al);
        ctx.fillStyle = `rgba(255,255,240,${al})`;
        speck(ctx, x - 1.2 * s, y - 1.2 * s, 2.4 * s);
      }
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
    const top = focus.y + focus.h * 0.86;
    ctx.save();
    ctx.clip();
    // Sand ripples: low crests laid by the swell, closer together far off, each with a shaded lee.
    ctx.lineWidth = 1.2 * dpr;
    for (let k = 0; k < 18; k++) {
      const v = (k + 0.5) / 18;
      const y0 = top + (h - top) * v * v;
      const amp = (1.5 + v * 4) * dpr, wl = (40 + v * 60) * dpr;
      ctx.strokeStyle = `rgba(140,112,70,${(0.18 + v * 0.22).toFixed(3)})`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8 * dpr) {
        const y = y0 + Math.sin(x / wl + k * 2.3) * amp + Math.sin(x / (wl * 0.37) + k) * amp * 0.3;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Caustics: a shifting net of light on the sand, two crossing families of wavering lines laid
    // flat (squashed toward the far edge) so the cells read as lying on the floor.
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(0, top);
    ctx.scale(1, 0.34);
    const depth = (h - top) / 0.34;
    const gap = 46 * dpr;
    // Three families (slanting both ways and nearly straight on), lines unevenly spaced and
    // wavering strongly, so the cells come out irregular like real caustics.
    for (const d of [-1, 0.35, 1]) {
      for (let k = -Math.ceil(depth / gap); k < Math.ceil(w / gap) + 2; k++) {
        const off = (((k * 0.618 + d) % 1) + 1) % 1 * gap * 0.7;
        // A line wholly off the screen (it wavers at most 38 px either side of its slant) is skipped.
        const xa = d > 0 ? k * gap + off : w - k * gap - off, xb = xa + depth * d;
        if (Math.max(xa, xb) < -40 * dpr || Math.min(xa, xb) > w + 40 * dpr) continue;
        const bright = 0.09 + 0.1 * Math.max(0, Math.sin(t * 0.7 + k * 1.9 + d * 3));
        ctx.strokeStyle = `rgba(255,255,235,${bright.toFixed(3)})`;
        ctx.lineWidth = (1.4 + Math.max(0, Math.sin(t * 0.9 + k * 2.7)) * 1.8) * dpr;
        ctx.beginPath();
        for (let v = 0; v <= depth; v += 15 * dpr) {
          const wl = (18 + ((k * 7) % 5) * 5) * dpr;
          const x = (d > 0 ? k * gap + off + v * d : w - k * gap - off + v * d) + Math.sin(v / wl + t * 0.8 + k * 1.3) * 16 * dpr + Math.sin(v / (wl * 2.7) - t * 0.5 + k) * 10 * dpr + Math.sin(t * 0.3 + k) * 12 * dpr;
          if (v === 0) ctx.moveTo(x, v); else ctx.lineTo(x, v);
        }
        ctx.stroke();
      }
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
   * The golden hours: as the sun goes down, and again as it comes up, warm light slants in from
   * the surface (amber at dusk, rose at dawn) and fades with depth.
   */
  function drawGoldenHour(ctx: CanvasRenderingContext2D, t: number): void {
    const u = (t % DAY) / DAY;
    const bump = (a: number, m: number, b: number) => (u <= a || u >= b ? 0 : u < m ? (u - a) / (m - a) : (b - u) / (b - m));
    const dusk = bump(0.48, 0.6, 0.7), dawn = bump(0.86, 0.94, 1);
    const k = Math.max(dusk, dawn);
    if (k <= 0) return;
    const rgb = dusk >= dawn ? '255,150,70' : '255,140,150';
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(${rgb},${0.4 * k})`);
    g.addColorStop(0.5, `rgba(${rgb},${0.12 * k})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
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
   * Strings of pearls: after dark, tiny crustaceans court by laying trails of blue light dots
   * as they swim up, each dot glowing for a few seconds; the trails rise in short slanting
   * strings over the reef, one after another.
   */
  function drawPearls(ctx: CanvasRenderingContext2D, t: number, night: number): void {
    if (night < 0.3) return;
    sight('sea-firefly');
    const s = scale();
    // Touched, every string flares at once.
    const touch = startled('sea-firefly', t);
    const flare = touch && touch.age < 1.5 ? 1 - touch.age / 1.5 : 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 7; k++) {
      const period = 9 + k * 1.7;
      const lap = Math.floor((t + k * 3.1) / period);
      const age = (t + k * 3.1) % period;
      const r = mulberry32(larvaSeed + lap * 131 + k);
      const x0 = focus.x + focus.w * range(r, 0.2, 0.8), y0 = focus.y + focus.h * range(r, 0.45, 0.8);
      const slant = range(r, -0.5, 0.5);
      // One dot every 0.18 s for 2.5 s, each glowing then fading over 3 s.
      for (let d = 0; d < 14; d++) {
        const born = d * 0.18;
        const a = age - born;
        if (a < 0 || a > 3) continue;
        const fade = (a < 0.2 ? a / 0.2 : 1 - (a - 0.2) / 2.8) * night;
        glow(ctx, x0 + slant * d * 6 * s, y0 - d * 9 * s, 4 * s * (1 + flare), '90,190,255', Math.min(1, 0.8 * fade + flare * night));
      }
      if (age < 2.5) spot('sea-firefly', x0 + slant * 40 * s, y0 - 60 * s, 50 * s);
    }
    ctx.restore();
  }

  /**
   * Sleeping Rasp: by night the grazers rest among the clumps at the reef's foot, each in a
   * bubble of mucus it blows around itself (real parrotfish do this), faintly catching the light.
   */
  function drawSleepers(ctx: CanvasRenderingContext2D, t: number, n: number, night: number): void {
    const count = Math.min(5, Math.ceil(n / 12));
    if (count <= 0 || night < 0.05) return;
    sight('rasp');
    const s = scale() * 1.3;
    const x0 = focus.x - focus.w * 0.1, span = focus.w * 1.2;
    ctx.save();
    ctx.globalAlpha = night;
    for (let k = 0; k < count; k++) {
      const u = [0.33, 0.62, 0.27, 0.7, 0.4][k]!;
      const x = x0 + u * span, y = floorY(u) - (9 + (k % 2) * 5) * s;
      const dir = k % 2 ? -1 : 1;
      const breathe = 1 + 0.03 * Math.sin(t * 0.8 + k);
      spot('rasp', x, y, 18 * s);
      // The fish, dim and still, its tail barely moving.
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      drawParrotfish(ctx, 9 * s, 170 + k * 12, Math.sin(t * 0.3 + k) * 0.6, s * 0.6);
      ctx.restore();
      // The cocoon: a clear bubble with a bright rim and one highlight.
      const R = 15 * s * breathe;
      const g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.3, R * 0.1, x, y, R);
      g.addColorStop(0, 'rgba(200,230,255,0.04)');
      g.addColorStop(0.85, 'rgba(170,215,255,0.10)');
      g.addColorStop(1, 'rgba(200,235,255,0.35)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, R * 1.15, R * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(235,245,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(x - R * 0.45, y - R * 0.4, R * 0.18, R * 0.08, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Rain (after the band "Rain"): a shower for one minute in every five. Seen from below, drops
   * make little expanding rings on the surface and the light dims a little.
   */
  /**
   * A storm (after the band "Storm"): for fifty seconds in every twelve minutes the surface is
   * torn white, the light shakes, the surge stirs the sand, and broken branches tumble past.
   */
  function drawStorm(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 720, length = 50;
    const u = ((t + 400) % period) / length;
    if (u >= 1) return;
    const k = Math.min(1, u * 4, (1 - u) * 4);
    const s = scale();
    const surge = Math.sin(t * 1.7) * 0.6 + Math.sin(t * 0.9) * 0.4;
    ctx.save();
    // The light shakes: the water greys and flickers.
    ctx.fillStyle = `rgba(40,55,70,${(0.16 + 0.05 * Math.sin(t * 13) * Math.sin(t * 7.3)) * k})`;
    ctx.fillRect(0, 0, w, h);
    // Torn white water at the surface.
    const top = focus.y + focus.h * 0.02;
    for (let i = 0; i < 90; i++) {
      const r = mulberry32(i * 613 + Math.floor(t * 3 + i) * 7);
      const x = ((r() + t * 0.15 + surge * 0.02) % 1) * w;
      const y = top + r() * focus.h * 0.07;
      ctx.fillStyle = `rgba(240,248,255,${0.35 * k * r()})`;
      ctx.beginPath();
      ctx.ellipse(x, y, (6 + r() * 18) * s, (2 + r() * 4) * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Sand stirred into the water, swinging with the surge.
    ctx.fillStyle = `rgba(215,200,165,${0.45 * k})`;
    for (let i = 0; i < 140; i++) {
      const fx = (i * 0.618) % 1, fy = (i * 0.37) % 1;
      const x = ((fx + surge * 0.05 + t * 0.01) % 1 + 1) % 1 * w;
      const y = focus.y + focus.h * (0.45 + fy * 0.5) + Math.sin(t * 2 + i) * 6 * s;
      speck(ctx, x, y, 1.6 * s);
    }
    // Broken branches tumbling down from the crown and away.
    for (let b = 0; b < 3; b++) {
      const q = (u * 1.4 - b * 0.25);
      if (q < 0 || q > 1) continue;
      const x = focus.x + focus.w * (0.55 + q * 0.45 + b * 0.05), y = focus.y + focus.h * (0.25 + q * 0.65);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(q * 9 + b);
      ctx.strokeStyle = `rgba(200,140,110,${0.9 * k})`;
      ctx.lineCap = 'round';
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(-14 * s, 0);
      ctx.lineTo(14 * s, 0);
      ctx.moveTo(4 * s, 0);
      ctx.lineTo(10 * s, -9 * s);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Christmas tree worms: small double spirals in bright colours set into the stone at fixed nodes.
   * Touched, they all vanish into their tubes at once and come out again one by one.
   */
  function drawTreeWorms(ctx: CanvasRenderingContext2D, reef: Reef, L: ReefLayout, t: number): void {
    const c = reef.coral;
    if (c.count < 20) return;
    sight('tree-worms');
    const touch = startled('tree-worms', t);
    const colours = ['#ff5a5a', '#ffd23f', '#3fa7ff', '#ff8c2a', '#ffffff', '#b35aff'];
    const s = scale() * 1.2;
    ctx.save();
    for (let k = 0; k < 9; k++) {
      const i = (k * 7919 + 13) % c.count;
      if (c.y[i]! > L.top * 0.8) continue;
      const [x, y] = reef.nodePx(L, i);
      if (k === 0) spot('tree-worms', x, y, Math.max(16 * s, 20 * dpr));
      const out = touch && touch.age < 2 + k * 0.5 ? Math.max(0, (touch.age - 1.5 - k * 0.3) / 1.2) : 1;
      if (out <= 0.05) continue;
      // Two little spiral trees: tiers of fine plumes, widest at the foot, each tier an arc of
      // colour over a dark edge, swaying a little.
      // Two little spiral crowns, each a cone of plumes in the worm's colour with fine tiers drooping
      // across it (a solid cone reads as a tiny fir; bare tier lines read as letters).
      const cones = new Path2D(), tiers = new Path2D();
      for (const side of [-1, 1]) {
        const bx = x + side * 4 * s, sway = Math.sin(t * 0.8 + k + side) * 0.8 * s;
        const hgt = 15 * s * out, half = 4.4 * s * out;
        cones.moveTo(bx - half, y - 1 * s * out);
        cones.quadraticCurveTo(bx - half * 0.4, y - hgt * 0.55, bx + sway, y - hgt);
        cones.quadraticCurveTo(bx + half * 0.4, y - hgt * 0.55, bx + half, y - 1 * s * out);
        cones.quadraticCurveTo(bx, y + 0.6 * s * out, bx - half, y - 1 * s * out);
        for (let q = 1; q < 5; q++) {
          const u = q / 5, cy = y - 1 * s * out - u * (hgt - 1 * s * out), rx = half * (1 - u) * 0.95, cx = bx + sway * u;
          tiers.moveTo(cx - rx, cy + 1.2 * s * out);
          tiers.quadraticCurveTo(cx, cy - 0.6 * s * out, cx + rx, cy + 1.2 * s * out);
        }
      }
      ctx.fillStyle = colours[k % colours.length]!;
      ctx.fill(cones);
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(20,20,30,0.35)';
      ctx.lineWidth = 0.8 * s;
      ctx.stroke(tiers);
    }
    ctx.restore();
  }

  /** The shark pups the reef sheltered (a moment): two small blacktips circling low among the branches. */
  function drawPups(ctx: CanvasRenderingContext2D, t: number, L: ReefLayout): void {
    const s = scale() * 1.8;
    for (let k = 0; k < 2; k++) {
      const a = t * (0.35 + k * 0.08) + k * Math.PI;
      const x = L.cx + Math.cos(a) * L.unit * 0.3, y = L.baseY - L.unit * (0.36 + 0.07 * k) + Math.sin(a) * L.unit * 0.04;
      const dir = -Math.sin(a) > 0 ? 1 : -1;
      // Behind the reef on the far side of the circle: drawn fainter.
      ctx.save();
      ctx.globalAlpha = Math.sin(a) > 0 ? 0.9 : 0.45;
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      // A small blacktip: dark above, pale below, its fins tipped black.
      const g = ctx.createLinearGradient(0, -4 * s, 0, 4 * s);
      g.addColorStop(0, '#76889a');
      g.addColorStop(0.55, '#a6b5c0');
      g.addColorStop(1, '#e4ecef');
      ctx.fillStyle = '#7f8f9e';
      ctx.beginPath();
      // Tail, swinging, and the fins behind the body.
      const sw = Math.sin(t * 3 + k) * 1.2 * s;
      ctx.moveTo(-10 * s, -0.8 * s);
      ctx.quadraticCurveTo(-13 * s, -3 * s + sw, -16.5 * s, -6 * s + sw);
      ctx.quadraticCurveTo(-14 * s, sw * 0.5, -15.5 * s, 3.6 * s + sw);
      ctx.lineTo(-10 * s, 0.8 * s);
      ctx.moveTo(2 * s, -3 * s); ctx.quadraticCurveTo(-0.6 * s, -5.6 * s, -2.6 * s, -8 * s); ctx.quadraticCurveTo(-2.6 * s, -4.6 * s, -4.5 * s, -2.6 * s);
      ctx.moveTo(5 * s, 2.2 * s); ctx.quadraticCurveTo(2 * s, 5 * s, -1 * s, 7 * s); ctx.quadraticCurveTo(-0.6 * s, 4 * s, -2 * s, 2.4 * s);
      ctx.fill();
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(14.5 * s, 0.6 * s);
      ctx.bezierCurveTo(12 * s, -3.4 * s, 4 * s, -4.2 * s, -10 * s, -1 * s);
      ctx.lineTo(-10 * s, 1 * s);
      ctx.bezierCurveTo(4 * s, 3.8 * s, 12 * s, 3 * s, 14.5 * s, 0.6 * s);
      ctx.fill();
      ctx.fillStyle = '#1b1f26';
      ctx.beginPath();
      ctx.moveTo(-1.4 * s, -6.4 * s); ctx.lineTo(-2.6 * s, -8 * s); ctx.lineTo(-3 * s, -6 * s);
      ctx.moveTo(0.2 * s, 5.8 * s); ctx.lineTo(-1 * s, 7 * s); ctx.lineTo(-0.9 * s, 5.4 * s);
      ctx.moveTo(-15.6 * s, -4.4 * s + sw); ctx.lineTo(-16.5 * s, -6 * s + sw); ctx.lineTo(-14.8 * s, -4.6 * s + sw);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(10.5 * s, -0.6 * s, 0.7 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Clouds over the sun: every couple of minutes a soft shadow slides across the scene from one
   * side to the other, the light dimming under it, as on a reef flat on a breezy day.
   */
  function drawCloudShadow(ctx: CanvasRenderingContext2D, t: number, day: number): void {
    const period = 140, pass = 40;
    const u = (t % period) / pass;
    if (u >= 1) return;
    const lap = Math.floor(t / period);
    const r = mulberry32(lap * 4099 + 7);
    const cxp = focus.x - focus.w * 0.6 + u * focus.w * 2.2, rw = focus.w * (0.45 + r() * 0.25);
    const cy = focus.y + focus.h * 0.55;
    ctx.save();
    ctx.translate(cxp, cy);
    ctx.scale(1, 1.6);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rw);
    g.addColorStop(0, `rgba(8,26,46,${0.42 * day})`);
    g.addColorStop(0.55, `rgba(8,26,46,${0.3 * day})`);
    g.addColorStop(1, 'rgba(8,26,46,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-rw, -rw, rw * 2, rw * 2);
    ctx.restore();
  }

  /** Dust from far away (the moment, once answered): rust-red motes drifting slowly down from the surface. */
  function drawDust(ctx: CanvasRenderingContext2D, t: number, a: number): void {
    const s = scale();
    ctx.save();
    const g = ctx.createLinearGradient(0, focus.y, 0, focus.y + focus.h * 0.3);
    g.addColorStop(0, `rgba(200,110,70,${0.16 * a})`);
    g.addColorStop(1, 'rgba(200,110,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(focus.x, focus.y, focus.w, focus.h * 0.3);
    for (let i = 0; i < 90; i++) {
      const u = (t * 0.012 + i * 0.6180339) % 1;
      const x = focus.x + ((i * 0.3819 + Math.sin(t * 0.2 + i) * 0.01) % 1) * focus.w;
      const y = focus.y + u * focus.h * 0.7;
      ctx.fillStyle = `rgba(${i % 3 ? '214,120,72' : '235,170,110'},${0.55 * a * (1 - u)})`;
      ctx.fillRect(x, y, (1 + (i % 3)) * s, (1 + (i % 3)) * s);
    }
    ctx.restore();
  }

  /** Warm water: an amber haze from the surface down and slow shimmering bands of heat. */
  function drawHeat(ctx: CanvasRenderingContext2D, t: number, warm: number): void {
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgba(255,186,110,${0.28 * warm})`);
    g.addColorStop(0.6, `rgba(255,170,100,${0.07 * warm})`);
    g.addColorStop(1, 'rgba(255,170,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 2 * dpr;
    for (let i = 0; i < 7; i++) {
      const y0 = h * (0.06 + i * 0.07) + Math.sin(t * 0.3 + i) * 6 * dpr;
      ctx.strokeStyle = `rgba(255,214,160,${0.05 * warm * (1 - i / 8)})`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12 * dpr) {
        const y = y0 + Math.sin(x / (40 * dpr) + t * (1.4 + i * 0.2)) * 3 * dpr;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

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
      // Rounded fins edged in black, an orange body, three white bands edged black (curved to
      // the body), and an eye with a pale rim.
      ctx.fillStyle = '#e8601a';
      ctx.strokeStyle = '#1a1210';
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      ctx.moveTo(-5 * s, 0);
      ctx.quadraticCurveTo(-9.5 * s, -4 * s, -9.2 * s, 0);
      ctx.quadraticCurveTo(-9.5 * s, 4 * s, -5 * s, 0);
      ctx.moveTo(2 * s, -3 * s);
      ctx.quadraticCurveTo(-1 * s, -5.6 * s, -4.4 * s, -2 * s);
      ctx.lineTo(1 * s, -2.6 * s);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 6 * s, 3.4 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.clip();
      for (const bx of [3, -0.6, -4.2]) {
        ctx.fillStyle = '#1a1210';
        ctx.beginPath();
        ctx.ellipse(bx * s, 0, 1.25 * s, 3.6 * s, 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(bx * s, 0, 0.8 * s, 3.6 * s, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#ffe8d0';
      ctx.beginPath();
      ctx.arc(4.4 * s, -0.8 * s, 0.95 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(4.5 * s, -0.8 * s, 0.6 * s, 0, Math.PI * 2);
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
      // An upright body with a pot belly and a crowned head, a tube of a snout, a curled tail.
      const P = (x: number, y: number): [number, number] => [x * s, y * s];
      ctx.beginPath();
      ctx.moveTo(...P(0.5, -12.5));
      ctx.quadraticCurveTo(...P(-1.6, -12.5), ...P(-2.2, -10.5));
      ctx.quadraticCurveTo(...P(-3.2, -8), ...P(-2.6, -5));
      ctx.bezierCurveTo(...P(-4.8, -2), ...P(-3.5, 6), ...P(-1.4, 9));
      ctx.lineTo(...P(1.4, 9));
      ctx.bezierCurveTo(...P(6.4, 6), ...P(6.4, -1), ...P(2, -4.5));
      ctx.quadraticCurveTo(...P(1, -6), ...P(2.6, -7.2));
      ctx.lineTo(...P(8.6, -7.4));
      ctx.quadraticCurveTo(...P(9.6, -8.3), ...P(8.6, -9.2));
      ctx.lineTo(...P(3.6, -9.6));
      ctx.quadraticCurveTo(...P(3.4, -12), ...P(0.5, -12.5));
      ctx.closePath();
      ctx.fill();
      // The tail, tapering as it curls under.
      ctx.lineWidth = 2.6 * s;
      ctx.beginPath();
      ctx.moveTo(...P(0, 8.5));
      ctx.quadraticCurveTo(...P(1.8, 12.5), ...P(-0.2, 15.6));
      ctx.stroke();
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(...P(-0.2, 15.6));
      ctx.quadraticCurveTo(...P(-2, 18), ...P(-3.4, 16));
      ctx.quadraticCurveTo(...P(-3.6, 14), ...P(-1.8, 13.8));
      ctx.stroke();
      // The rings of its armour, the crown's points, and the eye.
      ctx.strokeStyle = 'rgba(60,30,20,0.28)';
      ctx.lineWidth = Math.max(0.8, 0.7 * s);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const yy = -3 + i * 2;
        ctx.moveTo(...P(-3.4 + i * 0.25, yy));
        ctx.lineTo(...P(-1 + i * 0.2, yy + 0.8));
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(...P(-0.6, -12.3));
      ctx.lineTo(...P(-0.2, -14));
      ctx.lineTo(...P(0.6, -12.4));
      ctx.lineTo(...P(1.4, -13.6));
      ctx.lineTo(...P(1.8, -12));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,248,230,0.85)';
      ctx.beginPath();
      ctx.arc(...P(1.8, -9.9), 1.15 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#20140e';
      ctx.beginPath();
      ctx.arc(...P(2.0, -9.9), 0.6 * s, 0, Math.PI * 2);
      ctx.fill();
      // The dorsal fin on its back, fluttering.
      ctx.fillStyle = 'rgba(255,240,200,0.7)';
      ctx.beginPath();
      ctx.ellipse(-4.2 * s, 2 * s, 1.5 * s, 3 * s + Math.sin(t * 9) * 0.6 * s, 0.3, 0, Math.PI * 2);
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
    // A blunt snout with a small pouting mouth, a round eye with a pale rim, the gill opening,
    // and faint mottling over the disc.
    ctx.fillStyle = 'rgba(70,86,98,0.18)';
    ctx.beginPath();
    for (const [mx, my, mr] of [[-4, -8, 4], [6, 5, 5], [-8, 7, 3.5], [10, -7, 3], [0, 0, 3]] as const) {
      ctx.moveTo((mx + mr) * s, my * s);
      ctx.ellipse(mx * s, my * s, mr * s, mr * 0.8 * s, 0.4, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.fillStyle = '#e4ecf0';
    ctx.beginPath();
    ctx.arc(-13 * s, -3 * s, 2.6 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c2228';
    ctx.beginPath();
    ctx.arc(-13.4 * s, -3 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,74,86,0.6)';
    ctx.lineWidth = 0.9 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-22 * s, 0.4 * s);
    ctx.quadraticCurveTo(-21 * s, 1.6 * s, -20 * s, 0.6 * s);
    ctx.moveTo(-7 * s, -2 * s);
    ctx.quadraticCurveTo(-8.4 * s, 1 * s, -7 * s, 4 * s);
    ctx.stroke();
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
    // Each a small silver fish pointed along its circle, the whole ball in one fill.
    const ball = new Path2D();
    for (let i = 0; i < 160; i++) {
      const ring = Math.sqrt(((i * 0.618) % 1)) * R * squeeze;
      const spin = (i % 2 ? 1 : -1);
      const a = i * 2.4 + t * (1.2 + (i % 3) * 0.3) * spin;
      const x = cx + Math.cos(a) * ring * (form + (1 - form) * 3);
      const y = cy + Math.sin(a) * ring * 0.75 * (form + (1 - form) * 3);
      const h = Math.atan2(Math.cos(a) * 0.75 * spin, -Math.sin(a) * spin);
      const ca = Math.cos(h), sa = Math.sin(h);
      const P = (u: number, v: number): [number, number] => [x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s];
      const pts = [P(4, 0), P(0.6, -1.2), P(-2.8, -0.4), P(-5, -1.5), P(-4.2, 0), P(-5, 1.5), P(-2.8, 0.4), P(0.6, 1.1)];
      ball.moveTo(pts[0]![0], pts[0]![1]);
      for (let q = 1; q < pts.length; q++) ball.lineTo(pts[q]![0], pts[q]![1]);
      ball.closePath();
    }
    ctx.fillStyle = `rgba(215,230,240,${0.85 * form})`;
    ctx.fill(ball);
    // Hunters, jacks cutting through: a dark back over a silver belly, a sickle of a tail.
    for (let k = 0; k < 3; k++) {
      const p = ((t * 0.35 + k * 0.33) % 1);
      const hx = cx - R * 2.2 + p * R * 4.4;
      const hy = cy + Math.sin(p * Math.PI * 2 + k * 2) * R * 0.5;
      const tail = Math.sin(t * 8 + k) * 1.4 * s;
      ctx.save();
      ctx.globalAlpha = form;
      ctx.translate(hx, hy);
      const g = ctx.createLinearGradient(0, -4 * s, 0, 4 * s);
      g.addColorStop(0, '#1e3c5c');
      g.addColorStop(0.55, '#5a7c98');
      g.addColorStop(1, '#c8d6e0');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(13 * s, 0.4 * s);
      ctx.bezierCurveTo(10 * s, -4 * s, -4 * s, -4.4 * s, -10 * s, -1 * s);
      ctx.lineTo(-17 * s, -6 * s + tail);
      ctx.quadraticCurveTo(-14 * s, tail * 0.5, -17 * s, 6 * s + tail);
      ctx.lineTo(-10 * s, 1 * s);
      ctx.bezierCurveTo(-4 * s, 4.2 * s, 10 * s, 3.8 * s, 13 * s, 0.4 * s);
      // The dorsal fin.
      ctx.moveTo(2 * s, -3.6 * s);
      ctx.lineTo(-2 * s, -7 * s);
      ctx.lineTo(-4 * s, -3.2 * s);
      ctx.fill();
      ctx.fillStyle = '#e8eef2';
      ctx.beginPath();
      ctx.arc(9 * s, -0.6 * s, 1.1 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0c141c';
      ctx.beginPath();
      ctx.arc(9.2 * s, -0.6 * s, 0.6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * A green turtle comes to graze once there are meadows: it paddles slowly over the seagrass,
   * dips to crop it, and drifts on.
   */
  /**
   * A cuttlefish hovering beside the reef: waves of colour pulsing down its mantle, fins rippling.
   * Touched, it flashes white and jets backward, then drifts back.
   */
  function drawCuttlefish(ctx: CanvasRenderingContext2D, t: number): void {
    sight('cuttlefish');
    const s = scale() * 1.5;
    const touch = startled('cuttlefish', t);
    const jet = touch && touch.age < 5 ? Math.sin(Math.min(1, touch.age / 5) * Math.PI) : 0;
    const flash = touch && touch.age < 1.2 ? 1 - touch.age / 1.2 : 0;
    const x = focus.x + focus.w * 0.28 + Math.sin(t * 0.13) * 30 * s - jet * 90 * s;
    const y = focus.y + focus.h * 0.5 + Math.sin(t * 0.21) * 16 * s;
    spot('cuttlefish', x, y, 22 * s);
    ctx.save();
    ctx.translate(x, y);
    // Arms forward (to the right): a tapering bundle with a few loose tips feeling ahead.
    ctx.fillStyle = 'rgba(184,124,96,0.95)';
    ctx.beginPath();
    ctx.moveTo(12 * s, -3.4 * s);
    ctx.quadraticCurveTo(18 * s, -2 * s + Math.sin(t * 2) * 0.6 * s, 23 * s, Math.sin(t * 2.3) * 0.8 * s);
    ctx.quadraticCurveTo(18 * s, 2 * s + Math.sin(t * 2) * 0.6 * s, 12 * s, 3.4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,146,118,0.9)';
    ctx.lineWidth = 0.9 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let a = 0; a < 3; a++) {
      const yy = (a - 1) * 1.6 * s;
      ctx.moveTo(17 * s, yy);
      ctx.quadraticCurveTo(21 * s, yy * 1.6 + Math.sin(t * 2 + a) * 1.2 * s, 25 * s, yy * 2.2 + Math.sin(t * 2.4 + a) * 1.4 * s);
    }
    ctx.stroke();
    // The mantle: a shield, broad behind the head and tapering to a rounded tail, inside the fin.
    const mantle = (c: CanvasRenderingContext2D) => {
      c.beginPath();
      c.moveTo(8 * s, -5.6 * s);
      c.bezierCurveTo(0, -7.2 * s, -12 * s, -5.6 * s, -15.5 * s, -1.6 * s);
      c.quadraticCurveTo(-17 * s, 0, -15.5 * s, 1.6 * s);
      c.bezierCurveTo(-12 * s, 5.6 * s, 0, 7.2 * s, 8 * s, 5.6 * s);
      c.quadraticCurveTo(10 * s, 0, 8 * s, -5.6 * s);
      c.closePath();
    };
    // The fin: a rippling skirt all round the mantle, body-coloured, with a light edge.
    ctx.fillStyle = 'rgba(196,132,100,0.9)';
    ctx.beginPath();
    for (let i = 0; i <= 32; i++) {
      const th = (i / 32) * Math.PI * 2;
      const r = 1 + 0.06 * Math.sin(th * 8 + t * 6);
      const px = Math.cos(th) * 13.6 * s * r - 4 * s, py = Math.sin(th) * 8.6 * s * r * (1 - 0.18 * Math.max(0, -Math.cos(th)));
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(250,226,200,0.6)';
    ctx.lineWidth = Math.max(0.8, 0.7 * s);
    ctx.stroke();
    ctx.fillStyle = '#b07a5a';
    mantle(ctx);
    ctx.fill();
    // Passing clouds: soft bands of dark and light rolling down the mantle, and pale mottling.
    ctx.save();
    mantle(ctx);
    ctx.clip();
    ctx.lineWidth = 2.6 * s;
    for (let b = 0; b < 6; b++) {
      const bx = 9 * s - (((t * 9 + b * 5) % 30) * s);
      ctx.strokeStyle = `rgba(${b % 2 ? '90,40,30' : '232,176,128'},0.4)`;
      ctx.beginPath();
      ctx.moveTo(bx + 1.6 * s, -7.5 * s);
      ctx.quadraticCurveTo(bx - 1.6 * s, 0, bx + 1.6 * s, 7.5 * s);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(245,214,180,0.35)';
    ctx.beginPath();
    for (const [mx, my, mr] of [[-8, -2.6, 1.2], [-3, 2.8, 1], [2, -3.4, 0.9], [-11, 1.6, 0.8], [4, 1.4, 0.7]] as const) {
      ctx.moveTo((mx + mr) * s, my * s);
      ctx.ellipse(mx * s, my * s, mr * s, mr * 0.7 * s, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,250,${0.9 * flash})`;
      ctx.fillRect(-18 * s, -8 * s, 30 * s, 16 * s);
    }
    ctx.restore();
    // The head, a little narrower than the mantle's front, and its eye with the W-shaped pupil.
    ctx.fillStyle = '#b8805e';
    ctx.beginPath();
    ctx.ellipse(10.5 * s, 0, 3.8 * s, 4.2 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d6aa62';
    ctx.beginPath();
    ctx.arc(10.5 * s, -1.6 * s, 2.1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e1208';
    ctx.lineWidth = 0.9 * s;
    ctx.beginPath();
    ctx.moveTo(9.3 * s, -2.2 * s);
    ctx.lineTo(10 * s, -1.0 * s);
    ctx.lineTo(10.5 * s, -1.8 * s);
    ctx.lineTo(11 * s, -1.0 * s);
    ctx.lineTo(11.7 * s, -2.2 * s);
    ctx.stroke();
    // Startled: a puff of ink where it was.
    if (touch && touch.age < 4) {
      ctx.fillStyle = `rgba(30,25,35,${0.45 * (1 - touch.age / 4)})`;
      ctx.beginPath();
      ctx.arc(14 * s + jet * 90 * s, 0, (6 + touch.age * 8) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** A shell lying on the sand (tap to keep it): a small shape in its colour, glinting now and then. */
  function drawShell(ctx: CanvasRenderingContext2D, t: number, u: number, id: string): void {
    const s = scale() * 2.4;
    const x = focus.x - focus.w * 0.1 + u * focus.w * 1.2, y = floorY(u) + 1 * s;
    const sh = SHELLS.find((v) => v.id === id);
    spot('shell', x, y - 3 * s, 16 * s);
    ctx.save();
    ctx.translate(x, y);
    drawShellShape(ctx, id, sh?.colour ?? '#e8dcc8', s);
    ctx.restore();
    const glint = Math.max(0, Math.sin(t * 2.2)) ** 12;
    if (glint > 0.05) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x + 1 * s, y - 3 * s, 6 * s, '255,250,230', 0.8 * glint);
      ctx.restore();
    }
  }

  /** Eagle rays (rare): every 25 minutes a line of spotted rays flies across the upper water. */
  function drawEagleRays(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 1500, length = 40;
    const u = ((t + 400) % period) / length;
    if (u >= 1) return;
    sight('eagle-rays');
    const s = scale() * 1.4;
    for (let k = 0; k < 6; k++) {
      const x = focus.x + focus.w * (1.15 - u * 1.4 + k * 0.07);
      const y = focus.y + focus.h * (0.2 + k * 0.035) + Math.sin(t + k) * 4 * s;
      if (k === 0) spot('eagle-rays', x, y, 40 * s);
      const flap = Math.sin(t * 2.2 + k * 0.6) * 0.3;
      ctx.save();
      ctx.translate(x, y);
      // Seen from above, swimming toward -x: wings with a full leading edge out to pointed tips
      // (lifting and falling as they flap), a hollow trailing edge, the head jutting out in front.
      const tipX = (5 - Math.abs(flap) * 4) * s, tipY = (16 + flap * 10) * s;
      ctx.fillStyle = '#2c3a4a';
      ctx.beginPath();
      ctx.moveTo(-6 * s, -2 * s);
      ctx.quadraticCurveTo(-6 * s, -13 * s - flap * 6 * s, tipX, -tipY);
      ctx.quadraticCurveTo(2 * s, -6 * s, 9 * s, -1.6 * s);
      ctx.lineTo(9 * s, 1.6 * s);
      ctx.quadraticCurveTo(2 * s, 6 * s, tipX, tipY);
      ctx.quadraticCurveTo(-6 * s, 13 * s + flap * 6 * s, -6 * s, 2 * s);
      ctx.closePath();
      // The head: a rounded snout like a duck's bill.
      ctx.moveTo(-6 * s, 0);
      ctx.ellipse(-8.5 * s, 0, 3.6 * s, 2.3 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // A ridge down the back, a little lighter.
      ctx.fillStyle = 'rgba(80,100,124,0.5)';
      ctx.beginPath();
      ctx.ellipse(1 * s, 0, 7 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      // White spots scattered over the wings.
      ctx.fillStyle = 'rgba(230,240,250,0.85)';
      ctx.beginPath();
      for (const [px, py] of [[-2, -5], [1, -9], [3, -4], [-3, -10], [5, -12], [-2, 5], [1, 9], [3, 4], [-3, 10], [5, 12], [4, 0], [-3, 0]] as const) {
        const yy = py * (tipY / (16 * s));
        ctx.moveTo((px + 0.7) * s, yy * s);
        ctx.arc(px * s, yy * s, 0.7 * s, 0, Math.PI * 2);
      }
      ctx.fill();
      // The long whip of a tail.
      ctx.strokeStyle = '#2c3a4a';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(9 * s, 0);
      ctx.quadraticCurveTo(24 * s, Math.sin(t * 3 + k) * 3 * s, 42 * s, Math.sin(t * 3 + k + 1) * 2 * s);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** A banded sea snake winding up toward the surface to breathe and back down; touched, it turns away. */
  function drawSeaSnake(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 70;
    const u = (t % period) / period;
    if (u > 0.5) return;
    sight('sea-snake');
    const s = scale() * 1.5;
    const touch = startled('sea-snake', t);
    const away = touch && touch.age < 6 ? Math.sin(Math.min(1, touch.age / 6) * Math.PI) : 0;
    const k = u / 0.5;
    const x0 = focus.x + focus.w * (0.78 + away * 0.15);
    const y0 = focus.y + focus.h * (0.85 - 0.75 * Math.sin(k * Math.PI));
    spot('sea-snake', x0, y0, 20 * s);
    ctx.save();
    ctx.lineCap = 'round';
    // Bands along a wavy body, drawn as short segments.
    for (let i = 0; i < 26; i++) {
      const px = x0 + Math.sin(t * 3 - i * 0.45) * 6 * s;
      const py = y0 + i * 2.6 * s * (k < 0.5 ? 1 : -1);
      const nx = x0 + Math.sin(t * 3 - (i + 1) * 0.45) * 6 * s;
      const ny = y0 + (i + 1) * 2.6 * s * (k < 0.5 ? 1 : -1);
      ctx.strokeStyle = i % 4 < 2 ? '#1c2230' : '#c8d0dc';
      ctx.lineWidth = (3.4 - i * 0.07) * s;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(nx, ny);
      ctx.stroke();
    }
    // The paddle of a tail: flattened side-on, banded, sweeping.
    const sign = k < 0.5 ? 1 : -1;
    const tx = x0 + Math.sin(t * 3 - 26 * 0.45) * 6 * s, ty = y0 + 26 * 2.6 * s * sign;
    const sweep = Math.sin(t * 3 - 26 * 0.45 + 0.6) * 0.5;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(sweep);
    // A flat leaf of a paddle, wider than the body, ringed in the same bands.
    const leaf = (c: CanvasRenderingContext2D) => {
      c.beginPath();
      c.moveTo(-1.2 * s, 0);
      c.quadraticCurveTo(-3.4 * s, sign * 3 * s, -2.2 * s, sign * 6.4 * s);
      c.quadraticCurveTo(0, sign * 8.6 * s, 2.2 * s, sign * 6.4 * s);
      c.quadraticCurveTo(3.4 * s, sign * 3 * s, 1.2 * s, 0);
      c.closePath();
    };
    ctx.fillStyle = '#c8d0dc';
    leaf(ctx);
    ctx.fill();
    ctx.save();
    leaf(ctx);
    ctx.clip();
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(-4 * s, sign > 0 ? 2 * s : -4.2 * s, 8 * s, 2.2 * s);
    ctx.fillRect(-4 * s, sign > 0 ? 6.2 * s : -9 * s, 8 * s, 2.8 * s);
    ctx.restore();
    ctx.restore();
    // The head, a little wider, leading, with its eye and nostril on top.
    const hx = x0 + Math.sin(t * 3) * 6 * s, hy = y0 - 2 * s * sign;
    ctx.fillStyle = '#1c2230';
    ctx.beginPath();
    ctx.ellipse(hx, hy, 2.6 * s, 3.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8eef4';
    for (const ex of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + ex * 1.3 * s, hy - sign * 1 * s, 0.6 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * A giant clam set in the sand: wavy lips of shell, and between them its mantle, blue and green
   * with the symbionts it farms, glittering. Touched, it closes slowly and opens again.
   */
  function drawClam(ctx: CanvasRenderingContext2D, t: number): void {
    sight('giant-clam');
    const s = scale() * 1.8;
    const u = 0.24;
    const x = focus.x - focus.w * 0.1 + u * focus.w * 1.2, y = floorY(u) + 4 * s;
    const touch = startled('giant-clam', t);
    // How open: shut fast when touched, then slowly open again.
    const open = touch && touch.age < 8 ? Math.min(1, Math.max(0, (touch.age - 2) / 6)) * 0.85 + (touch.age < 0.4 ? 1 - touch.age / 0.4 : 0) * 0.15 : 1;
    const wdt = 30 * s, gap = 9 * s * open;
    spot('giant-clam', x, y - 8 * s, 30 * s);
    ctx.save();
    // The back valve, behind the mantle: its wavy lip, tapering to the hinge like the front one.
    ctx.fillStyle = '#b4aa94';
    ctx.beginPath();
    ctx.moveTo(x - wdt * 0.62, y + 1 * s);
    for (let i = 0; i <= 10; i++) {
      const bulge = Math.sin((i / 10) * Math.PI);
      ctx.lineTo(x - wdt + (i / 10) * wdt * 2, y - 6 * s - bulge * 6 * s - (gap / 2) * bulge + (i % 2 ? 2.4 : -2.4) * s * bulge);
    }
    ctx.lineTo(x + wdt * 0.62, y + 1 * s);
    ctx.closePath();
    ctx.fill();
    // The mantle between the lips.
    if (open > 0.05) {
      const g = ctx.createLinearGradient(x - wdt, 0, x + wdt, 0);
      const hue = (t * 8) % 360;
      g.addColorStop(0, `hsl(${(170 + hue * 0.1) % 360},70%,45%)`);
      g.addColorStop(0.5, `hsl(${(205 + hue * 0.1) % 360},85%,55%)`);
      g.addColorStop(1, `hsl(${(150 + hue * 0.1) % 360},70%,42%)`);
      ctx.fillStyle = g;
      // The mantle swells out over the lips, its edge ruffled.
      const mh = Math.max(0.5, gap * 0.75 + 1 * s), my = y - 12 * s;
      const mantle = () => {
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * Math.PI * 2;
          const ruff = 1 + 0.05 * Math.sin(a * 14 + t * 0.6) * open * Math.abs(Math.sin(a));
          const px = x + Math.cos(a) * wdt * 0.92 * ruff, py = my + Math.sin(a) * mh * ruff;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
      };
      mantle();
      ctx.fill();
      ctx.save();
      mantle();
      ctx.clip();
      // Wavy darker bands across it, and pale gardens of light glittering in its skin.
      ctx.strokeStyle = `rgba(10,40,90,${0.35 * open})`;
      ctx.lineWidth = 1.3 * s;
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) {
        for (let q = 0; q <= 16; q++) {
          const f = q / 16, px = x - wdt + f * wdt * 2, py = my + k * mh * 0.5 + Math.sin(f * 13 + k * 2) * mh * 0.18;
          if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
      for (let i = 0; i < 18; i++) {
        const a = 0.5 + 0.5 * Math.sin(t * 2.3 + i * 1.9);
        ctx.fillStyle = `rgba(200,255,250,${0.55 * a * open})`;
        ctx.beginPath();
        ctx.arc(x - wdt * 0.8 + ((i * 0.618) % 1) * wdt * 1.6, my + Math.sin(i * 2.7) * mh * 0.6, (0.6 + (i % 3) * 0.3) * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      // The inhalant siphon: a dark slit with a pale rim near the middle.
      if (open > 0.4) {
        ctx.fillStyle = 'rgba(8,24,40,0.8)';
        ctx.beginPath();
        ctx.ellipse(x + wdt * 0.12, my, 3.2 * s, Math.min(mh * 0.45, 1.6 * s), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(200,240,240,0.6)';
        ctx.lineWidth = 0.6 * s;
        ctx.stroke();
      }
    }
    // The shell, front valve: a fan of deep folds running down to the hinge, light and shaded in
    // turn, each fold's lip a scallop.
    const folds = 7;
    const edge = (q: number) => {
      const bulge = Math.sin(q * Math.PI);
      return y - 6 * s - bulge * 6 * s + (gap / 2) * bulge;
    };
    const hx = x, hy = y + 1 * s;
    for (let i = 0; i < folds; i++) {
      const q0 = i / folds, q1 = (i + 1) / folds, qm = (q0 + q1) / 2;
      const x0 = x - wdt + q0 * wdt * 2, x1 = x - wdt + q1 * wdt * 2, xm = (x0 + x1) / 2;
      const crest = 3.2 * s * (0.4 + 0.6 * Math.sin(qm * Math.PI));
      ctx.fillStyle = i % 2 ? '#c8bea6' : '#e0d8c2';
      ctx.beginPath();
      ctx.moveTo(hx + (x0 - hx) * 0.62, hy);
      ctx.lineTo(x0, edge(q0));
      ctx.quadraticCurveTo(xm, edge(qm) - crest * 2, x1, edge(q1));
      ctx.lineTo(hx + (x1 - hx) * 0.62, hy);
      ctx.closePath();
      ctx.fill();
    }
    // Shade toward the hinge and the sand.
    const sh = ctx.createLinearGradient(0, y - 12 * s, 0, hy);
    sh.addColorStop(0, 'rgba(90,76,60,0)');
    sh.addColorStop(1, 'rgba(90,76,60,0.45)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.moveTo(x - wdt, edge(0));
    for (let i = 0; i < folds; i++) {
      const q0 = i / folds, q1 = (i + 1) / folds, qm = (q0 + q1) / 2;
      const crest = 3.2 * s * (0.4 + 0.6 * Math.sin(qm * Math.PI));
      ctx.quadraticCurveTo(x - wdt + qm * wdt * 2, edge(qm) - crest * 2, x - wdt + q1 * wdt * 2, edge(q1));
    }
    ctx.lineTo(hx + wdt * 0.62, hy);
    ctx.lineTo(hx - wdt * 0.62, hy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,96,80,0.55)';
    ctx.lineWidth = 1 * s;
    ctx.stroke();
    // A rib down the middle of each fold, toward the hinge.
    ctx.strokeStyle = 'rgba(110,96,80,0.3)';
    ctx.beginPath();
    for (let i = 0; i < folds; i++) {
      const qm = (i + 0.5) / folds, xm = x - wdt + qm * wdt * 2;
      ctx.moveTo(xm, edge(qm) - 2 * s);
      ctx.lineTo(hx + (xm - hx) * 0.62, hy);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** The fry sheltered (a moment): a shimmer of tiny clear fish darting together among the branches. */
  function drawFry(ctx: CanvasRenderingContext2D, t: number, L: ReefLayout): void {
    const s = scale();
    ctx.save();
    ctx.fillStyle = 'rgba(230,245,255,0.55)';
    ctx.beginPath();
    for (let g = 0; g < 3; g++) {
      const cx = L.cx + (g - 1) * L.unit * 0.12 + Math.sin(t * 0.7 + g * 2) * 20 * s;
      const cy = L.baseY - L.unit * (0.3 + g * 0.15) + Math.cos(t * 0.5 + g) * 12 * s;
      for (let i = 0; i < 40; i++) {
        const a = i * 2.39996 + t * (0.9 + g * 0.2);
        const r = Math.sqrt(i / 40) * 26 * s;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.5;
        const ang = a + Math.PI / 2;
        ctx.moveTo(x + Math.cos(ang) * 2.2 * s, y + Math.sin(ang) * 2.2 * s);
        ctx.ellipse(x, y, 2.2 * s, 0.8 * s, ang, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    ctx.restore();
  }

  /**
   * A trumpetfish hanging head-down among the branches, still as a stick, waiting. Touched, it
   * swings level and drifts off a little way, then comes back to hang again.
   */
  function drawTrumpetfish(ctx: CanvasRenderingContext2D, t: number, L: ReefLayout): void {
    const s = scale() * 1.5;
    const touch = startled('trumpetfish', t);
    const away = touch && touch.age < 12 ? Math.sin((touch.age / 12) * Math.PI) : 0;
    sight('trumpetfish');
    const x = L.cx - L.unit * 0.16 - away * 90 * s, y = L.baseY - L.unit * 0.42 + Math.sin(t * 0.5) * 3 * s;
    const ang = Math.PI / 2 - 0.25 - away * 1.2 + Math.sin(t * 0.4) * 0.04;
    spot('trumpetfish', x, y, 26 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    // A long tube of a body, then a longer, thinner snout (along +x) with a small mouth at the tip;
    // the dorsal and anal fins sit far back by the tail, which is a small rounded fan.
    const len = 46 * s;
    const wag = Math.sin(t * 4) * s;
    ctx.fillStyle = '#c99a3a';
    ctx.beginPath();
    // Fins by the tail, and the tail itself.
    ctx.moveTo(-len * 0.3, -2.6 * s);
    ctx.lineTo(-len * 0.4, -5.2 * s + wag * 0.4);
    ctx.lineTo(-len * 0.42, -2.2 * s);
    ctx.closePath();
    ctx.moveTo(-len * 0.3, 2.6 * s);
    ctx.lineTo(-len * 0.4, 5.2 * s + wag * 0.4);
    ctx.lineTo(-len * 0.42, 2.2 * s);
    ctx.closePath();
    // The tail: a small fan, narrow where it joins and rounded at its edge.
    ctx.moveTo(-len * 0.46, -1.1 * s);
    ctx.lineTo(-len * 0.58, -3.2 * s + wag);
    ctx.quadraticCurveTo(-len * 0.63, wag, -len * 0.58, 3.2 * s + wag);
    ctx.lineTo(-len * 0.46, 1.1 * s);
    ctx.closePath();
    ctx.fill();
    const g = ctx.createLinearGradient(0, -3 * s, 0, 3 * s);
    g.addColorStop(0, '#b8862e');
    g.addColorStop(0.5, '#e2b955');
    g.addColorStop(1, '#f2d888');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-len * 0.47, -1.6 * s);
    ctx.quadraticCurveTo(-len * 0.1, -3.6 * s, len * 0.22, -2.4 * s);
    // The snout: a thin tube, flaring a little at the mouth.
    ctx.lineTo(len * 0.56, -1.1 * s);
    ctx.quadraticCurveTo(len * 0.6, 0, len * 0.56, 1.1 * s);
    ctx.lineTo(len * 0.22, 2.2 * s);
    ctx.quadraticCurveTo(-len * 0.1, 3.6 * s, -len * 0.47, 1.6 * s);
    ctx.closePath();
    ctx.fill();
    // Pale lines along the body, and a few dark spots toward the tail.
    ctx.strokeStyle = 'rgba(255,244,210,0.45)';
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    ctx.moveTo(-len * 0.42, -0.9 * s);
    ctx.quadraticCurveTo(-len * 0.1, -2 * s, len * 0.2, -1.3 * s);
    ctx.moveTo(-len * 0.42, 0.8 * s);
    ctx.quadraticCurveTo(-len * 0.1, 1.6 * s, len * 0.2, 1 * s);
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,26,10,0.55)';
    ctx.beginPath();
    for (const fx of [-0.44, -0.38]) { ctx.moveTo(len * fx + 0.9 * s, 0); ctx.arc(len * fx, 0, 0.9 * s, 0, Math.PI * 2); }
    ctx.fill();
    // The mouth at the snout's tip, a chin barbel, and a ringed eye where the snout begins.
    ctx.fillStyle = 'rgba(60,36,12,0.8)';
    ctx.beginPath();
    ctx.ellipse(len * 0.585, 0, 0.5 * s, 0.9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,110,40,0.9)';
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    ctx.moveTo(len * 0.5, 1.1 * s);
    ctx.lineTo(len * 0.47, 2.6 * s);
    ctx.stroke();
    ctx.fillStyle = '#fff6dc';
    ctx.beginPath();
    ctx.arc(len * 0.2, -0.7 * s, 1.4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1a08';
    ctx.beginPath();
    ctx.arc(len * 0.205, -0.7 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** Rarely (every eighteen minutes, by day), a tornado of barracuda: a slow spiral column of silver fish. */
  function drawBarracuda(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 1080, length = 70;
    const p = (t + 700) % period;
    if (p > length) return;
    sight('barracuda');
    const s = scale() * 1.3;
    const fade = Math.min(1, p / 8, (length - p) / 8);
    const cx = focus.x + focus.w * 0.82, cy = focus.y + focus.h * 0.38;
    spot('barracuda', cx, cy, 80 * s);
    ctx.save();
    ctx.globalAlpha = fade;
    for (let i = 0; i < 90; i++) {
      const lvl = i / 90;
      const a = t * 0.9 + i * 0.7;
      const r = (34 + 10 * Math.sin(lvl * 9)) * s;
      const x = cx + Math.cos(a) * r, y = cy - 90 * s + lvl * 190 * s + Math.sin(a) * r * 0.22;
      const dir = -Math.sin(a) >= 0 ? 1 : -1;
      const len = 11 * s;
      const back = Math.sin(a) > 0;
      // A long slim body with a pointed jaw, a forked tail, and (on the near side of the column)
      // a dark back and an eye.
      const h = len * 0.17;
      ctx.fillStyle = back ? 'rgba(150,170,185,0.75)' : 'rgba(215,228,236,0.95)';
      ctx.beginPath();
      ctx.moveTo(x + dir * len * 1.1, y + h * 0.2);
      ctx.quadraticCurveTo(x + dir * len * 0.6, y - h * 1.1, x - dir * len * 0.2, y - h);
      ctx.quadraticCurveTo(x - dir * len * 0.85, y - h * 0.5, x - dir * len, y);
      ctx.lineTo(x - dir * len * 1.4, y - len * 0.27);
      ctx.lineTo(x - dir * len * 1.25, y);
      ctx.lineTo(x - dir * len * 1.4, y + len * 0.27);
      ctx.lineTo(x - dir * len, y);
      ctx.quadraticCurveTo(x - dir * len * 0.85, y + h * 0.6, x - dir * len * 0.2, y + h);
      ctx.quadraticCurveTo(x + dir * len * 0.6, y + h * 1.1, x + dir * len * 1.1, y + h * 0.2);
      ctx.fill();
      if (!back) {
        ctx.strokeStyle = 'rgba(70,90,110,0.55)';
        ctx.lineWidth = Math.max(0.8, h * 0.5);
        ctx.beginPath();
        ctx.moveTo(x + dir * len * 0.6, y - h * 0.65);
        ctx.quadraticCurveTo(x, y - h * 0.95, x - dir * len * 0.8, y - h * 0.35);
        ctx.stroke();
        ctx.fillStyle = '#1c2630';
        ctx.beginPath();
        ctx.arc(x + dir * len * 0.72, y - h * 0.15, Math.max(0.6, h * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** A dugong grazing the meadows (four or more): nose down in the grass; touched, it rises to breathe and sinks back. */
  function drawDugong(ctx: CanvasRenderingContext2D, t: number, meadows: number): void {
    if (meadows < 4) return;
    sight('dugong');
    const s = scale() * 1.7;
    const touch = startled('dugong', t);
    const rise = touch && touch.age < 10 ? Math.sin(Math.min(1, touch.age / 10) * Math.PI) : 0;
    const u = (t * 0.004) % 1;
    const x = focus.x + focus.w * (0.12 + 0.76 * (0.5 - 0.5 * Math.cos(u * Math.PI * 2)));
    const dir = Math.sin(u * Math.PI * 2) > 0 ? 1 : -1;
    const y = floorY(Math.min(1, (x - focus.x + focus.w * 0.1) / (focus.w * 1.2))) - 14 * s - rise * focus.h * 0.45;
    spot('dugong', x, y, 30 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.rotate(0.12 * (1 - rise) - 0.3 * rise);
    const g = ctx.createLinearGradient(0, -8 * s, 0, 8 * s);
    g.addColorStop(0, '#8a8478');
    g.addColorStop(1, '#bdb6a6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(22 * s, 3 * s);
    ctx.quadraticCurveTo(20 * s, -7 * s, 4 * s, -8 * s);
    ctx.quadraticCurveTo(-14 * s, -8 * s, -20 * s, -1 * s);
    ctx.quadraticCurveTo(-14 * s, 6 * s, 4 * s, 7 * s);
    ctx.quadraticCurveTo(18 * s, 8 * s, 22 * s, 3 * s);
    ctx.fill();
    // The fluke, a whale-like tail.
    const sw = Math.sin(t * 1.5) * 0.15;
    ctx.save();
    ctx.translate(-19 * s, -1 * s);
    ctx.rotate(sw);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-6 * s, -7 * s, -10 * s, -8 * s);
    ctx.quadraticCurveTo(-7 * s, 0, -10 * s, 8 * s);
    ctx.quadraticCurveTo(-6 * s, 7 * s, 0, 0);
    ctx.fill();
    ctx.restore();
    // A flipper, the drooping snout and an eye.
    ctx.fillStyle = '#7a7468';
    ctx.beginPath();
    ctx.ellipse(8 * s, 6 * s, 5 * s, 2 * s, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(21 * s, 4 * s, 3 * s, 3.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2622';
    ctx.beginPath();
    ctx.arc(16 * s, -2 * s, 0.9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** A blacktip reef shark on its patrol: across the reef's edge every ninety seconds; touched, it turns away fast. */
  function drawReefShark(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 90, pass = 26;
    const lap = Math.floor(t / period);
    const touch = startled('reef-shark', t);
    const fled = touch && t - touch.age >= lap * period;
    const u = (t - lap * period) / pass * (fled ? 1.8 : 1);
    if (u < 0 || u > 1) return;
    sight('reef-shark');
    const s = scale() * 1.6;
    const dir = lap % 2 ? 1 : -1;
    const x = focus.x + focus.w * (dir > 0 ? -0.15 + u * 1.3 : 1.15 - u * 1.3);
    const y = focus.y + focus.h * (0.6 + 0.04 * Math.sin(lap * 1.7)) + Math.sin(t * 0.6) * 6 * s;
    spot('reef-shark', x, y, 32 * s);
    const sway = Math.sin(t * 3) * 0.12;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    const g = ctx.createLinearGradient(0, -8 * s, 0, 7 * s);
    g.addColorStop(0, '#7a8c96');
    g.addColorStop(0.55, '#a9b8c0');
    g.addColorStop(1, '#e8eef0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(31 * s, 1.4 * s);
    ctx.bezierCurveTo(28 * s, -5 * s, 16 * s, -7.6 * s, -8 * s, -5 * s);
    ctx.quadraticCurveTo(-20 * s, -3 * s, -26 * s, 0);
    ctx.quadraticCurveTo(-20 * s, 3.6 * s, -6 * s, 5 * s);
    ctx.bezierCurveTo(12 * s, 7 * s, 26 * s, 5.4 * s, 31 * s, 1.4 * s);
    ctx.fill();
    // Fins, curved and swept back, the big ones black-tipped; the tail swinging.
    const fin = (path: (c: CanvasRenderingContext2D) => void, tip: number[][] | null) => {
      ctx.fillStyle = '#8a9ba4';
      ctx.beginPath();
      path(ctx);
      ctx.fill();
      if (!tip) return;
      ctx.fillStyle = '#16191c';
      ctx.beginPath();
      tip.forEach(([px, py], i) => (i ? ctx.lineTo(px! * s, py! * s) : ctx.moveTo(px! * s, py! * s)));
      ctx.fill();
    };
    fin((c) => { c.moveTo(5 * s, -6 * s); c.quadraticCurveTo(0, -12 * s, -5 * s, -16 * s); c.quadraticCurveTo(-5 * s, -9 * s, -9 * s, -5 * s); c.closePath(); },
      [[-3.2, -13.4], [-5, -16], [-5.6, -12.6]]);
    fin((c) => { c.moveTo(11 * s, 4.6 * s); c.quadraticCurveTo(6 * s, 10 * s, 0, 14 * s); c.quadraticCurveTo(1 * s, 8 * s, -2 * s, 5.2 * s); c.closePath(); },
      [[2.4, 12.2], [0, 14], [0.6, 11.4]]);
    // The small second dorsal and anal fins by the tail.
    fin((c) => { c.moveTo(-16 * s, -3.4 * s); c.lineTo(-19 * s, -6.4 * s); c.lineTo(-20 * s, -2.8 * s); c.closePath();
      c.moveTo(-15 * s, 3.2 * s); c.lineTo(-18.5 * s, 5.8 * s); c.lineTo(-19.5 * s, 2.6 * s); c.closePath(); }, null);
    ctx.save();
    ctx.translate(-25 * s, 0);
    ctx.rotate(sway);
    fin((c) => { c.moveTo(0, -1 * s); c.quadraticCurveTo(-5 * s, -6 * s, -11 * s, -12 * s); c.quadraticCurveTo(-7 * s, -3 * s, -6.5 * s, 0); c.quadraticCurveTo(-7 * s, 3 * s, -9 * s, 7 * s); c.quadraticCurveTo(-4 * s, 3 * s, 0, 1 * s); c.closePath(); },
      [[-8.6, -9.6], [-11, -12], [-7.6, -6.6]]);
    ctx.restore();
    // Gill slits.
    ctx.strokeStyle = 'rgba(70,84,94,0.6)';
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    for (let q = 0; q < 5; q++) {
      const gx = (15 - q * 1.6) * s;
      ctx.moveTo(gx, -2.6 * s);
      ctx.quadraticCurveTo(gx - 0.8 * s, 0, gx, 2.6 * s);
    }
    ctx.stroke();
    ctx.fillStyle = '#101418';
    ctx.beginPath();
    ctx.arc(22 * s, -1.5 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /** The other reefs spawning at full moon: pink bundles rising everywhere from the floor. */
  function drawOthersSpawn(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    ctx.save();
    for (let i = 0; i < 140; i++) {
      const px = (i * 0.618034) % 1, ph = (i * 0.37) % 1;
      const rise = (t * (0.02 + (i % 5) * 0.004) + ph) % 1;
      const x = focus.x + px * focus.w + Math.sin(t * 0.7 + i) * 6 * s;
      const y = focus.y + focus.h * (0.95 - rise * 0.95);
      ctx.fillStyle = `rgba(255,${150 + (i % 4) * 20},${190 + (i % 3) * 15},${0.75 * Math.sin(rise * Math.PI)})`;
      ctx.beginPath();
      ctx.arc(x, y, (1.6 + (i % 3) * 0.7) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * The green turtle swims along the meadows; one let sleep in the branches (the moment) rests there
   * at night instead (`rest`: where, drawn after the reef).
   */
  function drawTurtle(ctx: CanvasRenderingContext2D, t: number, meadows: number, rest: readonly [number, number] | null = null): void {
    if (meadows < 2 && !rest) return;
    sight('turtle');
    const s = scale() * 1.4;
    const period = 140;
    const u = (t % period) / period;
    const dir = rest ? 1 : Math.floor(t / period) % 2 ? 1 : -1;
    const x = rest ? rest[0] : focus.x + focus.w * (dir > 0 ? -0.1 + u * 1.2 : 1.1 - u * 1.2);
    // Touched, it ducks its head and dives a little way, then comes back up.
    const touch = startled('turtle', t);
    const duck = touch && touch.age < 4 ? Math.sin(Math.min(1, touch.age / 4) * Math.PI) : 0;
    const dip = Math.max(Math.max(0, Math.sin(t * 0.5)) ** 4, duck);
    const y = rest ? rest[1] + Math.sin(t * 0.4) * 1.2 * s : focus.y + focus.h * 0.8 + dip * 14 * s + duck * 30 * s + Math.sin(t * 0.8) * 3 * s;
    // Asleep, the flippers barely move.
    const stroke = rest ? 0.15 * Math.sin(t * 0.3) : Math.sin(t * 1.6);
    spot('turtle', x, y, 30 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.rotate(dip * 0.25);
    // Flippers behind the shell: the long front one curved like a wing, a small paddle behind.
    ctx.fillStyle = '#5c7a4a';
    ctx.save();
    ctx.translate(9 * s, 3 * s);
    ctx.rotate(0.5 + stroke * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, -2 * s);
    ctx.quadraticCurveTo(6 * s, 6 * s, 2 * s, 18 * s);
    ctx.quadraticCurveTo(-1 * s, 10 * s, -3 * s, 1 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,58,32,0.6)';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    ctx.moveTo(1 * s, 2 * s);
    ctx.quadraticCurveTo(3.5 * s, 8 * s, 2 * s, 15 * s);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(-12 * s, 4 * s);
    ctx.rotate(-0.5 - stroke * 0.3);
    ctx.beginPath();
    ctx.ellipse(0, 4 * s, 2.6 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // The head on its neck: a rounded skull, a hooked beak, a pale throat and a ringed eye.
    ctx.fillStyle = '#6b8a55';
    ctx.beginPath();
    ctx.moveTo(14 * s, -3 * s);
    ctx.quadraticCurveTo(19 * s, -6 * s, 23.5 * s, -3.6 * s);
    ctx.quadraticCurveTo(26.5 * s, -2 * s, 26 * s, 0.4 * s);
    ctx.quadraticCurveTo(24 * s, 2.6 * s, 20 * s, 2 * s);
    ctx.quadraticCurveTo(17 * s, 3 * s, 14 * s, 2.4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(214,206,160,0.55)';
    ctx.beginPath();
    ctx.ellipse(20.5 * s, 1.2 * s, 4 * s, 1 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(36,50,28,0.7)';
    ctx.lineWidth = 0.55 * s;
    ctx.beginPath();
    ctx.moveTo(26 * s, 0.4 * s);
    ctx.quadraticCurveTo(24.5 * s, 0.2 * s, 23.2 * s, 0.8 * s);
    ctx.moveTo(19.5 * s, -4.6 * s);
    ctx.quadraticCurveTo(20.5 * s, -2.4 * s, 22.5 * s, -3.4 * s);
    ctx.stroke();
    ctx.fillStyle = '#e8e2c0';
    ctx.beginPath();
    ctx.arc(22.6 * s, -1.9 * s, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.arc(22.8 * s, -1.9 * s, 0.65 * s, 0, Math.PI * 2);
    ctx.fill();
    // The shell, domed, its lower edge a pale rim of small marginal plates.
    const shell = ctx.createLinearGradient(0, -12 * s, 0, 6 * s);
    shell.addColorStop(0, '#9a7844');
    shell.addColorStop(1, '#4f3c22');
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.moveTo(-19 * s, 1.5 * s);
    ctx.bezierCurveTo(-17 * s, -9 * s, 6 * s, -13 * s, 17 * s, -1.5 * s);
    ctx.quadraticCurveTo(0, 4.5 * s, -19 * s, 1.5 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(206,176,120,0.55)';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(-18 * s, 1.2 * s);
    ctx.quadraticCurveTo(0, 4 * s, 16.5 * s, -1.2 * s);
    ctx.stroke();
    // Plates: a row along the top and a row of side plates under it, their seams dark.
    ctx.strokeStyle = 'rgba(40,28,14,0.55)';
    ctx.lineWidth = 0.7 * s;
    ctx.beginPath();
    ctx.moveTo(-16 * s, -2 * s);
    ctx.bezierCurveTo(-12 * s, -7 * s, 6 * s, -9 * s, 14 * s, -2.5 * s);
    for (const [xb, xt] of [[-10, -8.5], [-2, -1.5], [6, 5.5]] as const) {
      ctx.moveTo(xb * s, 2.4 * s);
      ctx.quadraticCurveTo((xb + xt) * 0.5 * s - 0.6 * s, -2 * s, xt * s, -6.6 * s);
    }
    for (const [xb, xt] of [[-13, -12], [-5.5, -5], [2, 2], [10, 9]] as const) {
      ctx.moveTo(xb * s, -4.6 * s + Math.abs(xb) * 0.12 * s);
      ctx.lineTo(xt * s, -8.6 * s + Math.abs(xt) * 0.16 * s);
    }
    ctx.stroke();
    // A little light on the crown of the shell.
    ctx.fillStyle = 'rgba(255,230,180,0.12)';
    ctx.beginPath();
    ctx.ellipse(-1 * s, -7 * s, 9 * s, 2 * s, -0.05, 0, Math.PI * 2);
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
        // Branching coral: a short trunk forking twice, the branches tapering to pale knobbed tips.
        const tips: [number, number][] = [];
        const grow = (x0: number, y0: number, a: number, len: number, w: number, depth: number) => {
          const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
          ctx.lineWidth = w;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.quadraticCurveTo(x0 + Math.cos(a + 0.15) * len * 0.5, y0 + Math.sin(a + 0.15) * len * 0.5, x1, y1);
          ctx.stroke();
          if (depth === 0) { tips.push([x1, y1]); return; }
          const spread = 0.42 + 0.1 * Math.sin(c.u * 40 + depth);
          grow(x1, y1, a - spread, len * 0.72, w * 0.72, depth - 1);
          grow(x1, y1, a + spread, len * 0.72, w * 0.72, depth - 1);
        };
        const sway = Math.sin(t * 0.4 + c.u * 9) * 0.03;
        grow(x, y, -Math.PI / 2 + sway, r * 0.42, 4.5 * s * c.size, 2);
        ctx.fillStyle = `hsl(${c.hue},55%,78%)`;
        ctx.beginPath();
        for (const [tx, ty] of tips) { const tr = 2.2 * s * c.size; ctx.moveTo(tx + tr, ty); ctx.arc(tx, ty, tr, 0, Math.PI * 2); }
        ctx.fill();
      } else if (c.kind === 1) {
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.8, r * 0.55, 0, Math.PI, 0);
        ctx.fill();
        // A brain coral: the dome lit from above, its surface wound with meandering grooves (concentric
        // arcs read as a target).
        const hi = ctx.createRadialGradient(x - r * 0.2, y - r * 0.45, 0, x, y - r * 0.2, r * 0.9);
        hi.addColorStop(0, `hsla(${c.hue},60%,78%,0.5)`);
        hi.addColorStop(1, `hsla(${c.hue},60%,78%,0)`);
        ctx.fillStyle = hi;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.8, r * 0.55, 0, Math.PI, 0);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.78, r * 0.53, 0, Math.PI, 0);
        ctx.clip();
        ctx.strokeStyle = `hsla(${c.hue},40%,30%,0.45)`;
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const yy = y - r * 0.08 - k * r * 0.09;
          for (let q = 0; q <= 14; q++) {
            const f = q / 14, xx = x - r * 0.8 + f * r * 1.6;
            const wy = yy + Math.sin(f * 11 + k * 1.9 + c.u * 30) * r * 0.035;
            if (q === 0) ctx.moveTo(xx, wy); else ctx.lineTo(xx, wy);
          }
        }
        ctx.stroke();
        ctx.restore();
      } else {
        // Table coral: one wide flat top on a short thick stalk, seen nearly edge-on: its rim wavy,
        // its upper face lit, a band of shadow under the table, and the stalk in that shadow.
        const top = y - r * 0.6, rw = r * 1.05, th = r * 0.1;
        ctx.fillStyle = `hsl(${c.hue},30%,28%)`;
        ctx.beginPath();
        ctx.moveTo(x - 5 * s * c.size, y);
        ctx.quadraticCurveTo(x - 3 * s, top + th, x - 7 * s * c.size, top + th);
        ctx.lineTo(x + 7 * s * c.size, top + th);
        ctx.quadraticCurveTo(x + 3 * s, top + th, x + 5 * s * c.size, y);
        ctx.closePath();
        ctx.fill();
        const rim = (dy: number) => {
          ctx.beginPath();
          ctx.moveTo(x - rw, top + dy);
          for (let q = 1; q <= 12; q++) {
            const f = q / 12, ex = x - rw + f * rw * 2;
            ctx.lineTo(ex, top + dy + Math.sin(f * 9 + c.u * 20) * th * 0.5 - Math.sin(f * Math.PI) * th * 0.8);
          }
        };
        // Underside: a dark band.
        rim(th * 0.6);
        ctx.lineTo(x + rw * 0.8, top + th * 2.2);
        ctx.lineTo(x - rw * 0.8, top + th * 2.2);
        ctx.closePath();
        ctx.fillStyle = `hsl(${c.hue},35%,30%)`;
        ctx.fill();
        // The lit upper face, a thin lens.
        const g = ctx.createLinearGradient(0, top - th * 2, 0, top + th);
        g.addColorStop(0, `hsl(${c.hue},60%,74%)`);
        g.addColorStop(1, `hsl(${c.hue},45%,50%)`);
        ctx.fillStyle = g;
        rim(0);
        for (let q = 12; q >= 0; q--) {
          const f = q / 12, ex = x - rw + f * rw * 2;
          ctx.lineTo(ex, top + th * 0.6 + Math.sin(f * 9 + c.u * 20) * th * 0.5);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  /** Soft shadows on the sand under the reef fish, by day (fainter the higher they swim). */
  function drawFishShadows(ctx: CanvasRenderingContext2D, t: number, day: number): void {
    if (day <= 0) return;
    const s = scale();
    ctx.save();
    for (const f of fish) {
      const u = (((f.phase + t * f.speed) % 1) + 1) % 1;
      const x = focus.x - focus.w * 0.15 + u * focus.w * 1.3;
      const y = focus.y + focus.h * (0.25 + f.lane * 0.55);
      const fu = Math.min(1, Math.max(0, (x - focus.x + focus.w * 0.1) / (focus.w * 1.2)));
      const fy = floorY(fu) + 6 * s;
      const height = Math.max(0, fy - y) / focus.h;
      const len = 12 * s * f.size * (1 + height * 1.5);
      ctx.fillStyle = `rgba(30,50,60,${0.3 * day * Math.max(0.25, 1 - height * 1.4)})`;
      ctx.beginPath();
      // The sun is a little to one side: shadows fall a little the other way.
      ctx.ellipse(x + height * 40 * s, fy, len, len * 0.22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFish(ctx: CanvasRenderingContext2D, t: number): void {
    sight('reef-fish');
    const s = scale();
    // Touched, the fish near the touch dart away from it, and ease back to their lanes.
    const touch = startled('reef-fish', t);
    for (const f of fish) {
      const u = (((f.phase + t * f.speed) % 1) + 1) % 1;
      let x = focus.x - focus.w * 0.15 + u * focus.w * 1.3;
      let y = focus.y + focus.h * (0.25 + f.lane * 0.55) + Math.sin(t * 0.8 + f.phase * 10) * 10 * s;
      const dir = f.speed > 0 ? 1 : -1;
      if (touch && touch.age < 4) {
        const dx = x - touch.x, dy = y - touch.y, d = Math.hypot(dx, dy);
        if (d < 120 * s) {
          const push = (1 - d / (120 * s)) * 60 * s * Math.min(1, touch.age / 0.25) * Math.max(0, 1 - (touch.age - 0.5) / 3.5);
          x += (dx / (d || 1)) * push;
          y += (dy / (d || 1)) * push;
        }
      }
      // A sweep nearby makes them dart too.
      const [px, py] = pushed(x, y, t, 110 * s);
      x += px;
      y += py;
      const len = 12 * s * f.size;
      spot('reef-fish', x, y, Math.max(len * 1.5, 22 * dpr));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      // A deep-bodied reef fish: a rounded body with a pointed snout, dorsal and anal fins a shade
      // darker, a darker back and paler belly, a forked tail, a stripe on some, an eye with a light rim.
      const tail = Math.sin(t * 10 + f.phase * 7) * len * 0.2;
      ctx.fillStyle = `hsl(${f.hue},70%,44%)`;
      ctx.beginPath();
      ctx.moveTo(len * 0.25, -len * 0.55);
      ctx.quadraticCurveTo(-len * 0.2, -len * 0.95, -len * 0.75, -len * 0.25);
      ctx.lineTo(len * 0.25, -len * 0.4);
      ctx.moveTo(-len * 0.1, len * 0.5);
      ctx.quadraticCurveTo(-len * 0.45, len * 0.85, -len * 0.75, len * 0.25);
      ctx.lineTo(-len * 0.1, len * 0.35);
      ctx.moveTo(-len * 0.75, 0);
      ctx.lineTo(-len * 1.4, -len * 0.55 + tail);
      ctx.lineTo(-len * 1.2, tail * 0.5);
      ctx.lineTo(-len * 1.4, len * 0.55 + tail);
      ctx.closePath();
      ctx.fill();
      const g = ctx.createLinearGradient(0, -len * 0.62, 0, len * 0.62);
      g.addColorStop(0, `hsl(${f.hue},80%,48%)`);
      g.addColorStop(0.55, `hsl(${f.hue},85%,60%)`);
      g.addColorStop(1, `hsl(${f.hue},70%,78%)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(len * 1.05, len * 0.05);
      ctx.quadraticCurveTo(len * 0.7, -len * 0.62, 0, -len * 0.62);
      ctx.quadraticCurveTo(-len * 0.75, -len * 0.55, -len * 0.85, 0);
      ctx.quadraticCurveTo(-len * 0.75, len * 0.55, 0, len * 0.6);
      ctx.quadraticCurveTo(len * 0.7, len * 0.55, len * 1.05, len * 0.05);
      ctx.fill();
      if (f.stripe) {
        ctx.fillStyle = 'rgba(20,20,40,0.5)';
        ctx.beginPath();
        ctx.moveTo(len * 0.05, -len * 0.6);
        ctx.quadraticCurveTo(len * 0.22, 0, len * 0.05, len * 0.58);
        ctx.lineTo(-len * 0.17, len * 0.58);
        ctx.quadraticCurveTo(0, 0, -len * 0.17, -len * 0.6);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(len * 0.58, -len * 0.14, len * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(len * 0.6, -len * 0.14, len * 0.09, 0, Math.PI * 2);
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
    whaleSilhouette(ctx, s, beat);
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
      // The turtle let sleep in the branches (a moment) spends the night there instead.
      const turtleRests = v.moments.turtle === 'a' && night > 0.5;
      if (!turtleRests) drawTurtle(ctx, t, v.meadows);
      // The line's earlier reefs that climbed past this one, pale silhouettes far off (dark against the light).
      drawGhosts(ctx, focus, v.ancestors, v.height, t, scale(), 'rgba(20,60,85,1)');
      // The line's earlier endings: their reefs, far off on other seamounts, faint in the blue.
      if (v.endings > 0) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        for (let k = 0; k < Math.min(5, v.endings); k++) {
          const u = [0.1, 0.9, 0.24, 0.78, 0.36][k]!;
          const fx = focus.x + u * focus.w;
          drawColony(ctx, fx, focus.y + focus.h * (0.84 + 0.015 * (k % 2)), scale() * (2.2 - k * 0.2), t,
            { branch: '#4a7a8a', tip: '#7ab0b8', polyp: 'rgba(220,245,250,0.8)' }, seed ^ (0xe0d + k * 977));
        }
        ctx.restore();
      }
      // The storm's branch, let go, grows on far off on the sand.
      if (v.moments.storm === 'a') {
        const fx = focus.x + focus.w * 0.93;
        drawColony(ctx, fx, floorY(Math.min(1, (fx - focus.x + focus.w * 0.1) / (focus.w * 1.2))) + 2 * scale(), scale() * 1.5, t,
          { branch: '#c0703e', tip: '#e8a060', polyp: 'rgba(255,240,190,0.95)' }, seed ^ 0x570f);
      }
      drawAnemone(ctx, t);
      if (night < 0.5) drawCuttlefish(ctx, t);
      if (night < 0.5) drawReefShark(ctx, t);
      drawDugong(ctx, t, v.meadows);
      if (v.shell) drawShell(ctx, t, v.shell.x, v.shell.id);
      if (night < 0.5) drawSeaSnake(ctx, t);
      if (night < 0.5) drawBarracuda(ctx, t);
      if (night < 0.5) drawEagleRays(ctx, t);
      drawClumps(ctx, t);
      drawDaughters(ctx, v.polyps, (u) => [focus.x - focus.w * 0.1 + u * focus.w * 1.2, floorY(u) + 2 * scale()], scale() * 1.2, t,
        { branch: '#c0703e', tip: '#e8a060', polyp: 'rgba(255,240,190,0.95)',
          alt: { branch: '#8a5bb0', tip: '#b88ad8', polyp: 'rgba(240,220,255,0.95)' } }, larvaSeed, v.nurseries);
      drawTerrace(ctx, L.cx, L.unit, v.works.terrace, scale(), (x) => floorY(Math.min(1, Math.max(0, (x - focus.x + focus.w * 0.1) / (focus.w * 1.2)))), t);
      drawClam(ctx, t);
      drawRim(ctx, focus, v.works.rim, scale() * 1.6, floorY);
      {
        // Ossel, as the glittering sand it became (or, kept, its wall's foot): tap to hear it.
        const ox = focus.x - focus.w * 0.1 + 0.62 * focus.w * 1.2, oy = floorY(0.62) + 6 * scale();
        drawOsselSand(ctx, ox, oy, scale() * 1.4, t, speaking(t));
        spot('ossel', ox, oy, 30 * scale());
      }
      drawFishShadows(ctx, t, 1 - night);
      if (night > 0) drawNight(ctx, t, night, 0.6);
      if (v.othersSpawn) drawOthersSpawn(ctx, t);
      drawSleepers(ctx, t, v.rasp, night);
      reef.draw(ctx, L, v, t);
      // Fragments of other reefs, taken in: small colonies of their own colours at the foot.
      for (let k = 0; k < v.fragments; k++) {
        const fu = [0.38, 0.62, 0.32, 0.68, 0.45, 0.27, 0.73, 0.55][k]!;
        const fxp = focus.x - focus.w * 0.1 + fu * focus.w * 1.2;
        const hue = [12, 290, 40, 180, 330, 90, 220, 0][k]!;
        // Taken in small, each grows to its full size over the next hour.
        const grown = 0.45 + 0.55 * Math.min(1, (v.fragmentAges[k] ?? 3600) / 3600);
        drawColony(ctx, fxp, floorY(fu) + 2 * scale(), scale() * 1.1 * grown, t,
          { branch: `hsl(${hue},45%,45%)`, tip: `hsl(${hue},60%,70%)`, polyp: 'rgba(255,240,230,0.9)' }, seed ^ (0xf4a + k * 313));
      }
      drawRelics(ctx, reef, L, v.relics, t, v.moments['old-lamp'] === 'a');
      if (night < 0.5) drawTrumpetfish(ctx, t, L);
      if (v.moments.fry === 'a') drawFry(ctx, t, L);
      if (v.moments.pups === 'a') drawPups(ctx, t, L);
      if (v.thorn?.kind === 'thorn-star') drawThorn(ctx, reef, L, v.thorn.u, v.thorn.side, t);
      if (turtleRests) {
        const [tx, ty] = reef.crown(L);
        drawTurtle(ctx, t, v.meadows, [L.cx + (tx - L.cx) * 0.4, ty + (L.baseY - ty) * 0.35]);
      }
      drawCraft(ctx, v.craft, reef, L, t, 1);
      drawResidents(ctx, reef, L, v.residents, t, seed,
        (x) => floorY(Math.min(1, Math.max(0, (x - focus.x + focus.w * 0.1) / (focus.w * 1.2)))));
      slugs.draw(ctx, reef, L, t);
      drawTreeWorms(ctx, reef, L, t);
      this.crownAt = reef.crown(L);
      drawSong(ctx, v.song, this.crownAt[0], this.crownAt[1], t, scale());
      reef.drawEffects(ctx, L, v, effects.live(t));
      reef.drawCaustics(ctx, L, t, 1 - night, '255,250,215');
      // Reef fish shelter in the branches at night.
      ctx.save();
      ctx.globalAlpha = 1 - 0.85 * night;
      drawFish(ctx, t);
      ctx.restore();
      shoals.drawFront(ctx, focus, reef, L, v, t, '#5d7d96');
      if (v.bands.includes('storm')) drawStorm(ctx, t);
      if (v.heat.warm > 0) drawHeat(ctx, t, v.heat.warm);
      if (night < 0.5) drawCloudShadow(ctx, t, 1 - night * 2);
      if (v.moments.dust) drawDust(ctx, t, 1 - night * 0.7);
      drawShaftMotes(ctx, t, 1 - night);
      drawGoldenHour(ctx, t);
      if (night > 0) drawNight(ctx, t, night, 0.3);
      drawPearls(ctx, t, night);
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      fore.draw(ctx, focus, t, '8,40,58', 0.75);
    },
  };
}
