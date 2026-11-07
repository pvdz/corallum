// The Breach (Act V): the surface at night. Stars, the moon in its real phase with a glitter
// path on the waves, the reef's crown breaking the water. Spawn bundles swell on the polyps;
// at the release they rise in their millions through the moonlight and spread on the surface.

import { drawResidents } from './residents.ts';
import { drawGull } from './thorn.ts';
import { drawColony } from './daughters.ts';
import { drawSong } from './song.ts';
import { drawBeacon, drawPool } from './works.ts';
import { palette } from '../content/palettes.ts';
import { GARDEN } from '../content/act5.ts';
import { drawRelics } from './relics.ts';
import { sight, speaking, spot, startled } from './sightings.ts';
import type { DialectId } from '../content/act4.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import type { CoralForm } from './coral.ts';
import { drawMoon, glow, drawOsselSand, speck, drawSmallFish, softRing } from './draw.ts';
import { FIGURES, WISH, type Figure } from '../content/sky.ts';
import { SWELL } from '../content/events.ts';
import { drawPetrels, drawSailors, drawSeaSparkle, type Surface } from './surface.ts';
import { createLayerCache } from './layer.ts';
import { createForeground } from './foreground.ts';
import { drawCraft, FLUORESCENT_POLYP } from './craft.ts';
import { createReef, type Reef, type ReefLayout } from './reef.ts';
import { createEffects, type Focus, type ReefView, type Scene } from './scene.ts';

/** A squall: every 25 minutes, for a minute and a half, the wind gets up (0 calm … 1 at its height). */
export function squallAt(t: number): number {
  const p = (t + 500) % 1500;
  return p > 90 ? 0 : Math.min(1, p / 10, (90 - p) / 15);
}

/** Every third shower at the Breach is a far storm: lightning strikes this many seconds into it. */
const STRIKES = [12, 27, 41, 55];
/** Seconds since the last lightning strike of a storm shower (with which strike), or null between storms. */
export function lightningAt(t: number): { since: number; k: number; lap: number } | null {
  const lap = Math.floor(t / 300);
  if (lap % 3 !== 1) return null;
  const u = t - lap * 300;
  let k = -1;
  for (let j = 0; j < STRIKES.length; j++) if (u >= STRIKES[j]!) k = j;
  if (k < 0 || u - STRIKES[k]! > 3) return null;
  return { since: u - STRIKES[k]!, k, lap };
}

const FROM = 3980;
const TO = 4000;

const NIGHT_LOOK: Record<CoralForm, { girth: number; palette: [string, string, string]; polyp: [string, string] }> = {
  fan: { girth: 1, palette: ['#1a0f22', '#7a3c58', 'rgba(255,210,230,0.25)'], polyp: ['#ffb3c9', 'rgba(255,220,235,0.9)'] },
  branching: { girth: 0.9, palette: ['#21180f', '#8a6238', 'rgba(255,230,200,0.25)'], polyp: ['#ffb3c9', 'rgba(255,230,200,0.9)'] },
  massive: { girth: 3.2, palette: ['#0f140c', '#3a4a2a', 'rgba(230,255,200,0.1)'], polyp: ['#ffb3c9', 'rgba(255,230,160,0.9)'] },
  plating: { girth: 1.6, palette: ['#1d1430', '#634890', 'rgba(230,215,255,0.25)'], polyp: ['#ffb3c9', 'rgba(200,255,240,0.9)'] },
  pillar: { girth: 2.4, palette: ['#1c160e', '#6a5a40', 'rgba(255,240,215,0.25)'], polyp: ['#ffb3c9', 'rgba(255,245,220,0.9)'] },
};

function formOf(id: DialectId | ''): CoralForm {
  return id === 'branching' || id === 'massive' || id === 'plating' || id === 'pillar' ? id : 'fan';
}

/** Released bundles: three shades of pink and salmon, each in a few opacity steps. */
const BEAD_SHADES = 3;
const BEAD_STEPS = 4;
const PINK_SHADES: readonly [number, number, number][] = [[244, 118, 160], [255, 150, 172], [250, 132, 118]];
const GOLD: readonly [number, number, number] = [255, 186, 86];
/** Brooders' larvae: paler, peach. */
const BROOD_SHADES = ['255,170,140', '255,190,160', '250,160,130'];
/** A bead's shade, pink turning golden as the spawn is sweetened (g 0..1). */
function beadShade(k: number, g: number): string {
  const p = PINK_SHADES[k]!;
  return `${Math.round(p[0] + (GOLD[0] - p[0]) * g)},${Math.round(p[1] + (GOLD[1] - p[1]) * g)},${Math.round(p[2] + (GOLD[2] - p[2]) * g)}`;
}

type Star = { x: number; y: number; r: number; tw: number };
type Bundle = { x: number; delay: number; speed: number; drift: number; size: number };

export function createBreachScene(seed: number): Scene {
  const rng = mulberry32(seed ^ 0xb7ea);
  let w = 1, h = 1, dpr = 1;
  let focus: Focus = { x: 0, y: 0, w: 1, h: 1 };
  const reefSeed = Math.floor(rng() * 1e9);
  const reefs = new Map<CoralForm, Reef>();
  const reefFor = (f: CoralForm) => {
    let r = reefs.get(f);
    if (!r) reefs.set(f, (r = createReef(reefSeed, f, NIGHT_LOOK[f].girth)));
    return r;
  };
  const effects = createEffects();
  let bloom: Bloom | null = null;
  const galaxy = createLayerCache(1);
  const fore = createForeground(seed);
  const stars: Star[] = Array.from({ length: 160 }, () => ({ x: rng(), y: rng(), r: range(rng, 0.4, 1.4), tw: rng() * 10 }));
  const bundles: Bundle[] = Array.from({ length: 420 }, () => ({
    x: range(rng, -0.32, 0.32), delay: rng() * 14, speed: range(rng, 0.05, 0.11), drift: range(rng, -1, 1), size: range(rng, 0.6, 1.3),
  }));
  const far: Bundle[] = Array.from({ length: 120 }, () => ({
    x: rng(), delay: rng() * 20, speed: range(rng, 0.02, 0.05), drift: range(rng, -1, 1), size: range(rng, 0.3, 0.7),
  }));

  const scale = () => Math.min(focus.w, focus.h) / 700;
  const cx = () => focus.x + focus.w * 0.5;
  // The tide: the surface rises and falls a little over three minutes of scene time.
  let tideT = 0;
  /** The dawn after the release, 0..1, as last drawn. */
  let lastDawn = 0;
  const stillY = () => focus.y + focus.h * 0.3;
  const waterY = () => stillY() + focus.h * 0.012 * Math.sin((tideT / 180) * Math.PI * 2);

  function progress(height: number): number {
    return Math.max(0, Math.min(1, (height - FROM) / (TO - FROM)));
  }

  function layout(v: ReefView, form: CoralForm): ReefLayout {
    // The crown rises from just under the surface to break it.
    // A tall, narrow frame (an iPad upright beside the panel) caps the reef by width, as in every zone.
    const unit = Math.min(focus.h * 0.8, focus.w * 1.5);
    // The reef stands on the seamount, not on the water: it is placed against the still level.
    const crownY = stillY() + focus.h * (0.12 - 0.16 * progress(v.height));
    return {
      cx: cx(), baseY: crownY + unit, unit, s: scale(), dpr, top: 1, bandStep: 0,
      encrust: 1, encrustColours: [...palette(v.palette).night],
      palette: NIGHT_LOOK[form].palette, polyp: v.craft === 'fluorescent' ? FLUORESCENT_POLYP : (palette(v.palette).polyp as [string, string] | null) ?? NIGHT_LOOK[form].polyp,
      // The dome's many lit nodes add up: it glows at a lower scale so the night stays a night.
      // By day (the dawn after the release) the light washes most of it out, as in the Sunlit Crown.
      glowScale: (form === 'massive' ? 0.3 : 0.6) * (v.craft === 'fluorescent' ? 1.5 : 1) * (1 - 0.65 * lastDawn), polypScale: 1.1,
    };
  }

  function moonPos(): [number, number] {
    return [focus.x + focus.w * 0.72, focus.y + focus.h * 0.11];
  }

  function drawSky(ctx: CanvasRenderingContext2D, t: number, phase: number, great: boolean, dawn: number, blue = false): void {
    const wy = waterY();
    const g = ctx.createLinearGradient(0, 0, 0, wy);
    g.addColorStop(0, '#05061a');
    g.addColorStop(1, '#1d2350');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, wy + 2);
    // After the spawning, dawn: rose and gold rising from the horizon, the stars going out.
    if (dawn > 0) {
      const d = ctx.createLinearGradient(0, 0, 0, wy);
      d.addColorStop(0, `rgba(70,90,160,${0.5 * dawn})`);
      d.addColorStop(0.65, `rgba(230,140,150,${0.45 * dawn})`);
      d.addColorStop(1, `rgba(255,200,140,${0.75 * dawn})`);
      ctx.fillStyle = d;
      ctx.fillRect(0, 0, w, wy + 2);
    }
    // The Milky Way: a faint band of dust and crowded stars across the sky, gone with the dawn.
    if (dawn < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - dawn;
      // Only the sky above the highest tide: the sea is painted over everything below it. Laid out
      // on the still water line, so the stars stay put while the tide moves (and it paints once).
      const sy = Math.round(stillY()), top = Math.ceil(sy + focus.h * 0.012) + 2;
      galaxy.draw(ctx, w, top, 0, 1e9, `${w}x${sy}`, (c) => drawGalaxy(c, sy));
      ctx.restore();
    }
    for (const st of stars) {
      const a = (0.4 + 0.4 * Math.sin(t * 1.3 + st.tw)) * (1 - dawn);
      ctx.fillStyle = `rgba(230,235,255,${a})`;
      speck(ctx, st.x * w, st.y * wy * 0.95, st.r * dpr);
    }
    // Now and then a shooting star: a short bright streak fading along its path.
    for (let k = 0; k < 2; k++) {
      const period = 37 + k * 23;
      const u = ((t + k * 11) % period) / 1.2;
      if (u < 1) {
        const lap = Math.floor((t + k * 11) / period);
        const r = mulberry32(seed + lap * 977 + k);
        const x0 = w * range(r, 0.1, 0.8), y0 = wy * range(r, 0.05, 0.4);
        const dx = w * 0.18, dy = wy * 0.12;
        const hx = x0 + dx * u, hy = y0 + dy * u;
        const g = ctx.createLinearGradient(hx - dx * 0.3, hy - dy * 0.3, hx, hy);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(1, `rgba(255,255,255,${0.8 * (1 - u)})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.5 * dpr;
        ctx.beginPath();
        ctx.moveTo(hx - dx * 0.3, hy - dy * 0.3);
        ctx.lineTo(hx, hy);
        ctx.stroke();
      }
    }
    // The moon, lit to its phase.
    const [mx, my] = moonPos();
    // A great tide moon rides lower and larger, with a warm ring around it.
    const r = 26 * scale() * (great ? 1.3 : 1);
    const lit = 1 - Math.abs(phase - 0.5) * 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, mx, my, r * 5, great ? '255,215,160' : '230,230,200', (great ? 0.22 : 0.15) * lit + 0.03);
    if (great) glow(ctx, mx, my, r * 2.2, '255,200,150', 0.18 * lit);
    ctx.restore();
    drawMoonFace(ctx, phase, great, dawn, blue);
  }

  /**
   * A set of swells: each a long hump of water rolling in from the left and passing under the
   * crown at its crest. Around the crown, a ring closes in on each crest still to catch; a caught
   * crest flashes gold.
   */
  function drawSwell(ctx: CanvasRenderingContext2D, sw: { since: number; caught: number }, crown: readonly [number, number]): void {
    const s = scale(), wy = waterY();
    const speed = focus.w * 0.11;
    ctx.save();
    for (let i = 0; i < SWELL.waves; i++) {
      const d = sw.since - (SWELL.lead + i * SWELL.gap);
      if (d < -4 || d > 3) continue;
      // The hump: a raised band of water centred where this swell is now.
      const hx = crown[0] + d * speed, hw = 90 * s, hh = 26 * s;
      const g = ctx.createLinearGradient(0, wy - hh, 0, wy + 4 * s);
      g.addColorStop(0, 'rgba(60,120,170,0.9)');
      g.addColorStop(1, 'rgba(16,58,90,0.95)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(hx - hw * 2, wy + 2 * s);
      for (let x = -2; x <= 2; x += 0.1) ctx.lineTo(hx + x * hw, wy - hh * Math.exp(-x * x * 1.6));
      ctx.lineTo(hx + hw * 2, wy + 2 * s);
      ctx.closePath();
      ctx.fill();
      // Foam on the crest.
      ctx.strokeStyle = 'rgba(230,240,255,0.55)';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      for (let x = -0.6; x <= 0.6; x += 0.1) ctx.lineTo(hx + x * hw, wy - hh * Math.exp(-x * x * 1.6) - 1 * s);
      ctx.stroke();
      // The timing ring: closing in on the crown, meeting it at the crest.
      const caught = (sw.caught & (1 << i)) !== 0;
      if (caught && d >= 0 && d < 1) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, crown[0], crown[1], (30 + 40 * d) * s, '255,215,140', 0.6 * (1 - d));
        ctx.restore();
      } else if (!caught && d > -2.5 && d < SWELL.slack) {
        const r = (24 + Math.max(0, -d) * 34) * s;
        const near = Math.abs(d) <= SWELL.slack;
        ctx.strokeStyle = near ? 'rgba(255,225,160,0.95)' : 'rgba(200,225,255,0.55)';
        ctx.lineWidth = (near ? 3 : 1.5) * s;
        ctx.beginPath();
        ctx.arc(crown[0], crown[1], r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * Rarely, a meteor shower: for forty seconds in every twenty minutes, streaks fall across the
   * sky from one point, thick for a while, then thinning out. Touched, a big bright fireball.
   */
  /**
   * A sargassum raft: a long mat of golden-brown weed drifting across the surface, its float
   * bladders bobbing, small fish and the reef's young sheltering in its shade below.
   */
  function drawRaft(ctx: CanvasRenderingContext2D, ra: { k: number; age: number; life: number }, t: number): void {
    const s = scale() * 1.8;
    const wy = waterY();
    const a = Math.min(1, ra.age / 4, (ra.life - ra.age) / 4);
    if (a <= 0) return;
    const dir = ra.k % 2 ? 1 : -1;
    const u = ra.age / ra.life;
    const x = focus.x + focus.w * (dir > 0 ? 0.15 + u * 0.7 : 0.85 - u * 0.7);
    const len = 70 * s;
    spot('raft', x, wy, Math.max(len * 0.7, 30 * dpr));
    ctx.save();
    ctx.globalAlpha = a;
    // The shade under it, and the young hiding there.
    const sh = ctx.createRadialGradient(x, wy + 8 * s, 0, x, wy + 8 * s, len);
    sh.addColorStop(0, 'rgba(0,10,20,0.35)');
    sh.addColorStop(1, 'rgba(0,10,20,0)');
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(x, wy + 10 * s, len, 18 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 14; i++) {
      const px = x + Math.sin(i * 2.1 + t * 0.8) * len * 0.6, py = wy + (6 + (i % 4) * 4) * s + Math.sin(t * 1.3 + i) * 2 * s;
      ctx.fillStyle = i % 3 ? 'rgba(255,190,210,0.7)' : 'rgba(200,220,170,0.7)';
      ctx.beginPath();
      ctx.arc(px, py, (i % 3 ? 1.1 : 1.8) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    // Trailing fronds below the surface: limp stems, each with a few narrow blades along it.
    const fronds = new Path2D(), blades = new Path2D();
    for (let i = 0; i < 11; i++) {
      const fx = x - len * 0.85 + ((i * 0.618 + 0.1) % 1) * len * 1.7;
      const deep = (10 + (i % 4) * 7) * s;
      const sw = Math.sin(t * 0.8 + i * 1.3) * 5 * s;
      const ex = fx - dir * 12 * s + sw, ey = wy + deep;
      fronds.moveTo(fx, wy + 1 * s);
      fronds.quadraticCurveTo(fx - dir * 6 * s + sw * 0.5, wy + deep * 0.5, ex, ey);
      for (let b = 1; b <= 3; b++) {
        const f = b / 4, bx = fx + (ex - fx) * f, by = wy + 1 * s + (ey - wy) * f;
        const side = b % 2 ? 1 : -1;
        blades.moveTo(bx, by);
        blades.quadraticCurveTo(bx + side * 3 * s, by + 1.5 * s, bx + side * 5 * s - dir * 2 * s, by + 4 * s);
      }
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(150,118,48,0.65)';
    ctx.lineWidth = 1 * s;
    ctx.stroke(fronds);
    ctx.strokeStyle = 'rgba(176,140,58,0.55)';
    ctx.lineWidth = 1.6 * s;
    ctx.stroke(blades);
    // The mat at the surface: clumps of branching weed, uneven along its length, with clustered
    // round air bladders that keep it afloat, lit from the sky on top.
    const mat = new Path2D(), lit = new Path2D(), bladders = new Path2D();
    for (let c = 0; c < 9; c++) {
      const f = (c + 0.5) / 9;
      const cx = x - len + f * len * 2 + Math.sin(c * 2.7) * 6 * s;
      const hump = Math.sin(f * Math.PI) * (0.7 + 0.5 * ((c * 0.618) % 1));
      const cy = wy - hump * 3 * s + Math.sin(t * 1.4 + c * 0.9) * 1.2 * s;
      const rw = (9 + ((c * 0.38) % 1) * 7) * s, rh = (2 + hump * 2.2) * s;
      // A clump: a lumpy mound of blades.
      mat.moveTo(cx - rw, cy + 1 * s);
      for (let q = 0; q <= 6; q++) {
        const qa = Math.PI * (1 - q / 6);
        const bump = 1 + 0.25 * Math.sin(q * 2.3 + c);
        mat.lineTo(cx + Math.cos(qa) * rw, cy + 1 * s - Math.sin(qa) * rh * bump);
      }
      mat.closePath();
      lit.moveTo(cx - rw * 0.6, cy - rh * 0.55);
      lit.quadraticCurveTo(cx, cy - rh * 1.1, cx + rw * 0.55, cy - rh * 0.6);
      for (let b = 0; b < 3; b++) {
        const bx = cx + (b - 1) * rw * 0.45 + Math.sin(c + b) * 2 * s, by = cy - rh * (0.5 + 0.3 * ((b + c) % 2));
        const br = (1.1 + ((b * 0.7 + c * 0.3) % 1) * 0.8) * s;
        bladders.moveTo(bx + br, by);
        bladders.arc(bx, by, br, 0, Math.PI * 2);
      }
    }
    ctx.fillStyle = 'rgba(184,138,50,1)';
    ctx.fill(mat);
    ctx.strokeStyle = 'rgba(232,192,96,0.9)';
    ctx.lineWidth = 1.1 * s;
    ctx.stroke(lit);
    ctx.fillStyle = 'rgba(240,206,112,1)';
    ctx.fill(bladders);
    ctx.restore();
  }

  /** A man-o'-war drifting on the surface, its crest catching the wind; touched, it deflates its sail a moment. */
  function drawManOWar(ctx: CanvasRenderingContext2D, t: number): void {
    sight('man-o-war');
    const s = scale() * 1.6;
    const wy = waterY();
    const u = (t * 0.004 + 0.3) % 1;
    const x = focus.x + focus.w * (0.1 + u * 0.8), y = wy - 3 * s + Math.sin(t * 1.4) * 2 * s;
    const touch = startled('man-o-war', t);
    const sag = touch && touch.age < 3 ? Math.sin(Math.min(1, touch.age / 3) * Math.PI) : 0;
    spot('man-o-war', x, y, 26 * s);
    ctx.save();
    // Tentacles below the surface, long and blue, swaying.
    ctx.strokeStyle = 'rgba(110,140,255,0.45)';
    ctx.lineWidth = 0.8 * s;
    for (let k = 0; k < 7; k++) {
      ctx.beginPath();
      ctx.moveTo(x - 6 * s + k * 2 * s, wy + 2 * s);
      ctx.quadraticCurveTo(x - 6 * s + k * 2 * s + Math.sin(t * 0.9 + k) * 10 * s, wy + 30 * s, x - 8 * s + k * 2.5 * s + Math.sin(t * 0.7 + k * 2) * 14 * s, wy + (50 + k * 6) * s);
      ctx.stroke();
    }
    // The float.
    const g = ctx.createLinearGradient(x, y - 8 * s, x, y + 3 * s);
    g.addColorStop(0, 'rgba(200,170,255,0.9)');
    g.addColorStop(1, 'rgba(90,120,240,0.85)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y, 11 * s, 4.5 * s, -0.1, 0, Math.PI * 2);
    ctx.fill();
    // The crest, a frilled sail along the top.
    ctx.fillStyle = 'rgba(240,150,230,0.85)';
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y - 2 * s);
    for (let k = 0; k <= 8; k++) ctx.lineTo(x - 8 * s + k * 2 * s, y - (6 + (k % 2) * 1.5) * s * (1 - 0.7 * sag) * Math.sin((k / 8) * Math.PI));
    ctx.lineTo(x + 8 * s, y - 2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Rarely (every fifteen minutes), far off, a humpback leaps clear of the sea and falls back in a burst of spray. */
  function drawBreaching(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 900, length = 9;
    const p = (t + 210) % period;
    if (p > length) return;
    sight('breaching');
    const s = scale() * 1.3;
    const wy = waterY();
    const x0 = focus.x + focus.w * 0.82;
    const k = Math.min(1, p / 3);
    // Up out of the water and over, rotating from nose-up to belly-up.
    const rise = Math.sin(k * Math.PI) * 60 * s;
    const ang = -1.2 + k * 2;
    spot('breaching', x0, wy - 30 * s, 60 * s);
    if (k < 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, wy + 1);
      ctx.clip();
      ctx.translate(x0 + k * 30 * s, wy + 20 * s - rise);
      ctx.rotate(ang);
      // A humpback, head first (+x): a flat rostrum studded with knobs, a small hump of a dorsal
      // fin, the flukes; a pale grooved throat; the long white flipper out like a wing.
      ctx.fillStyle = '#1c2230';
      ctx.beginPath();
      ctx.moveTo(44 * s, 1 * s);
      ctx.quadraticCurveTo(36 * s, -6 * s, 26 * s, -9 * s);
      ctx.bezierCurveTo(10 * s, -13 * s, -16 * s, -10 * s, -40 * s, -2.6 * s);
      ctx.lineTo(-47 * s, -13 * s);
      ctx.quadraticCurveTo(-49 * s, -5 * s, -51 * s, 0);
      ctx.quadraticCurveTo(-49 * s, 5 * s, -47 * s, 13 * s);
      ctx.lineTo(-40 * s, 2.6 * s);
      ctx.bezierCurveTo(-18 * s, 10 * s, 6 * s, 13.5 * s, 26 * s, 10 * s);
      ctx.quadraticCurveTo(38 * s, 7 * s, 44 * s, 1 * s);
      // The dorsal hump.
      ctx.moveTo(-14 * s, -9.6 * s);
      ctx.quadraticCurveTo(-19 * s, -14 * s, -24 * s, -8.4 * s);
      ctx.fill();
      ctx.fillStyle = 'rgba(196,202,214,0.9)';
      ctx.beginPath();
      ctx.moveTo(42 * s, 2.6 * s);
      ctx.quadraticCurveTo(36 * s, 7 * s, 24 * s, 9.6 * s);
      ctx.quadraticCurveTo(8 * s, 12 * s, -6 * s, 9 * s);
      ctx.quadraticCurveTo(14 * s, 5.4 * s, 42 * s, 2.6 * s);
      ctx.fill();
      ctx.strokeStyle = 'rgba(70,80,100,0.55)';
      ctx.lineWidth = 0.7 * s;
      ctx.beginPath();
      for (let q = 0; q < 6; q++) {
        const f = q / 5;
        ctx.moveTo(40 * s, (3 + f * 0.8) * s);
        ctx.quadraticCurveTo(18 * s, (6 + f * 3) * s, -4 * s, (8.6 + f * 0.2) * s);
      }
      ctx.stroke();
      // Knobs along the rostrum, and the eye.
      ctx.fillStyle = 'rgba(120,130,150,0.8)';
      ctx.beginPath();
      for (const [kx, ky] of [[40, -1.6], [36, -3.6], [32, -5.6], [37.5, 0.6], [33, -1.8]] as const) {
        ctx.moveTo((kx + 0.9) * s, ky * s);
        ctx.arc(kx * s, ky * s, 0.9 * s, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = '#05070c';
      ctx.beginPath();
      ctx.arc(24 * s, 1.6 * s, 1.1 * s, 0, Math.PI * 2);
      ctx.fill();
      // The flipper, a third of the body long, its leading edge knobbled.
      ctx.fillStyle = '#d4d8e0';
      ctx.beginPath();
      ctx.moveTo(14 * s, 8 * s);
      for (let q = 0; q <= 5; q++) {
        const f = q / 5;
        const lx = 14 * s - f * 30 * s, ly = 8 * s + f * 28 * s;
        ctx.quadraticCurveTo(lx + 2.4 * s, ly - 0.6 * s, lx - 0.4 * s, ly + 1.2 * s);
      }
      ctx.quadraticCurveTo(-12 * s, 30 * s, 4 * s, 9.6 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // The splash: a mound of foam rising and falling where it went in, spray flung out of it and
    // falling back, and rings spreading.
    const sp = (p - 2.6) / 6;
    if (sp > 0 && sp < 1) {
      ctx.save();
      const cx2 = x0 + 40 * s, lift = Math.sin(sp * Math.PI);
      // The mound: a ragged crest of white water, jets standing out of it as it rises.
      const mw = (14 + sp * 26) * s, mh = (4 + lift * 22) * s;
      ctx.fillStyle = `rgba(235,240,250,${0.7 * (1 - sp)})`;
      ctx.beginPath();
      const crest: [number, number][] = [];
      for (let q = 0; q <= 12; q++) {
        const a = Math.PI * (1 - q / 12);
        const rag = 1 + 0.12 * Math.sin(q * 2.7 + sp * 9) + (q % 3 === 1 ? 0.18 * lift : 0);
        crest.push([cx2 + Math.cos(a) * mw, wy + 1 * s - Math.sin(a) * mh * rag]);
      }
      // Smooth through the crest's points (each curve ends half way to the next point).
      ctx.moveTo(crest[0]![0], crest[0]![1]);
      for (let q = 1; q < crest.length - 1; q++) {
        const [ax, ay] = crest[q]!, [bx, by] = crest[q + 1]!;
        ctx.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2);
      }
      ctx.lineTo(crest[crest.length - 1]![0], crest[crest.length - 1]![1]);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = `rgba(240,244,252,${0.85 * (1 - sp)})`;
      ctx.beginPath();
      for (let q = 0; q < 34; q++) {
        const f = Math.sin(q * 12.9898) * 43758.5453, r1 = f - Math.floor(f);
        const g = Math.sin(q * 78.233) * 12543.21, r2 = g - Math.floor(g);
        const vx = (r1 - 0.5) * 90 * s, vy = (60 + r2 * 70) * s;
        const tt = sp * 1.4;
        const dx = cx2 + vx * tt, dy = wy - vy * tt + 120 * s * tt * tt;
        if (dy > wy) continue;
        const r = (0.8 + r2 * 1.8) * s;
        ctx.moveTo(dx + r, dy);
        ctx.arc(dx, dy, r, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.strokeStyle = `rgba(220,230,250,${0.5 * (1 - sp)})`;
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.ellipse(x0 + 40 * s, wy + 2 * s, (20 + sp * 90) * s, (4 + sp * 12) * s, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /** A small fish stranded on the crown above the water, flapping: tap to toss it back. */
  function drawStranded(ctx: CanvasRenderingContext2D, L: ReefLayout, st: { k: number; age: number }, t: number): void {
    const s = scale() * 1.5;
    const side = st.k % 2 ? 1 : -1;
    const x = L.cx + side * L.unit * 0.12, y = waterY() - 30 * scale();
    spot('tangle', x, y, 28 * s);
    const flop = Math.abs(Math.sin(t * 7)) * 5 * s;
    ctx.save();
    ctx.translate(x, y - flop);
    ctx.rotate(Math.sin(t * 7) * 0.6);
    // A small silver fish.
    drawSmallFish(ctx, s, '#5c7a96', '#b4c8da', '#e8f0f6');
    ctx.restore();
    // A glint of wet scales, and a ring: it can be touched.
    const p = (t * 0.6) % 1;
    const rr = (16 + 12 * p) * s;
    softRing(ctx, x, y, rr, rr, 6 * s, '230,240,255', 0.45 * (1 - p));
  }

  /** Where the king tide reached (a moment): a line of dried weed and pale salt along the reef above the water. */
  function drawWrack(ctx: CanvasRenderingContext2D, L: ReefLayout): void {
    const s = scale();
    const y = waterY() - 26 * s;
    const r = mulberry32(seed ^ 0x71de);
    ctx.save();
    for (let i = 0; i < 40; i++) {
      const x = L.cx + (r() - 0.5) * L.unit * 0.5;
      ctx.fillStyle = i % 3 ? `rgba(120,95,50,${0.55 + r() * 0.3})` : 'rgba(235,235,225,0.7)';
      ctx.beginPath();
      ctx.ellipse(x, y + (r() - 0.5) * 6 * s, (2 + r() * 4) * s, (0.8 + r()) * s, r() - 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Shooting stars: the shower the reef can wish on (content/sky.ts WISH), on the reef's own clock. */
  function drawMeteors(ctx: CanvasRenderingContext2D, t: number, dawn: number, shower: { k: number; u: number } | null): void {
    const length = WISH.length;
    if (!shower || dawn > 0.6) return;
    const u = shower.u, local = u * length;
    sight('meteors');
    const wy = waterY();
    const rx = focus.x + focus.w * 0.85, ry = focus.y;
    spot('meteors', focus.x + focus.w * 0.6, focus.y + (wy - focus.y) * 0.4, focus.w * 0.2);
    const touch = startled('meteors', t);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rate = Math.sin(u * Math.PI);
    for (let k = 0; k < 400; k++) {
      const r = mulberry32(k * 911 + shower.k * 7);
      const start = r() * length, dur = 0.6 + r() * 0.6;
      const p = (local - start) / dur;
      if (p < 0 || p > 1 || r() > rate) continue;
      const ang = Math.PI * (0.7 + r() * 0.25), len = (wy - focus.y) * (0.3 + r() * 0.5);
      const x0 = rx + (r() - 0.5) * focus.w * 0.3, y0 = ry + r() * (wy - focus.y) * 0.3;
      const hx = x0 + Math.cos(ang) * len * p, hy = y0 + Math.sin(ang) * len * p;
      const g = ctx.createLinearGradient(hx - Math.cos(ang) * 40 * dpr, hy - Math.sin(ang) * 40 * dpr, hx, hy);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, `rgba(235,240,255,${0.8 * (1 - p) * (1 - dawn)})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.3 * dpr;
      ctx.beginPath();
      ctx.moveTo(hx - Math.cos(ang) * 40 * dpr, hy - Math.sin(ang) * 40 * dpr);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    }
    if (touch && touch.age < 2) {
      const p = touch.age / 2;
      const x = touch.x - p * focus.w * 0.3, y = touch.y + p * (wy - touch.y) * 0.8;
      glow(ctx, x, y, 14 * dpr, '255,230,190', 0.9 * (1 - p));
    }
    ctx.restore();
  }

  /** A figure's star i, in device pixels: placed in the focus's share of the sky. */
  function starAt(f: Figure, i: number): [number, number] {
    const top = focus.y, sky = (waterY() - top) * 0.92;
    const [u, v] = f.stars[i]!;
    const y = top + sky * (f.at[1] + (v - 0.5) * f.size[1]);
    // A narrow sky (a phone upright): the figures spread over the strip between the buttons in the
    // top-left corner and the depth gauge, a little wider, so each star can take a finger.
    if (focus.w / dpr < 700) {
      const left = 112 * dpr, right = 52 * dpr, span = focus.w - left - right;
      return [focus.x + left + span * f.at[0] + (u - 0.5) * f.size[0] * 1.3 * focus.w, y];
    }
    return [focus.x + focus.w * (f.at[0] + (u - 0.5) * f.size[0]), y];
  }

  /**
   * The figures of the night sky: named ones joined by faint lines for good; the one being traced
   * shows all its stars brighter, the joined part drawn, the next star pulsing. Its stars are tappable.
   */
  function drawFigures(ctx: CanvasRenderingContext2D, t: number, v: ReefView, dawn: number): void {
    const tr = v.sky.tracing;
    if (!v.sky.named.length && !tr && !v.sky.known.length) return;
    ctx.save();
    ctx.lineCap = 'round';
    for (const f of FIGURES) {
      const isNamed = v.sky.named.includes(f.id);
      const tracing = tr?.id === f.id;
      // Named by an earlier reef of the line: a faint dotted outline until this reef names it too.
      if (!isNamed && !tracing && v.sky.known.includes(f.id)) {
        const pts = f.stars.map((_, i) => starAt(f, i));
        ctx.setLineDash([2 * dpr, 4 * dpr]);
        ctx.strokeStyle = `rgba(200,215,255,${0.16 * (1 - 0.7 * dawn)})`;
        ctx.lineWidth = dpr;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        if (f.close !== undefined) ctx.lineTo(pts[f.close]![0], pts[f.close]![1]);
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }
      if (!isNamed && !tracing) continue;
      const n = isNamed ? f.stars.length : tr!.n;
      const pts = f.stars.map((_, i) => starAt(f, i));
      const fade = 1 - 0.7 * dawn;
      // The lines joined so far (all of a named figure, closing it if it closes).
      ctx.strokeStyle = isNamed ? `rgba(200,215,255,${0.28 * fade})` : `rgba(255,236,190,${0.75 * fade})`;
      ctx.lineWidth = (isNamed ? 1 : 1.6) * dpr;
      ctx.beginPath();
      for (let i = 0; i < n; i++) i === 0 ? ctx.moveTo(pts[i]![0], pts[i]![1]) : ctx.lineTo(pts[i]![0], pts[i]![1]);
      if (isNamed && f.close !== undefined) ctx.lineTo(pts[f.close]![0], pts[f.close]![1]);
      ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i]!;
        const next = tracing && i === n;
        const joined = isNamed || i < n;
        const tw = 0.85 + 0.15 * Math.sin(t * 2 + i * 1.7);
        const r = (next ? 2.6 + 0.8 * Math.sin(t * 5) : joined ? 2 : 1.6) * dpr;
        glow(ctx, x, y, r * (next ? 7 : 4), next ? '255,230,170' : '210,225,255', (next ? 0.5 : joined ? 0.3 : 0.18) * fade * tw);
        ctx.fillStyle = `rgba(255,250,235,${(joined || next ? 0.95 : 0.7) * fade})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        if (tracing) spot('star', x, y, Math.max(16 * dpr, 0.03 * focus.w), i);
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  /** The moon's disc itself; drawn again after the glow pass, which would wash out its seas. */
  function drawMoonFace(ctx: CanvasRenderingContext2D, phase: number, great: boolean, dawn: number, blue = false): void {
    const [mx, my] = moonPos();
    ctx.save();
    ctx.globalAlpha = 1 - 0.65 * dawn;
    const r = 26 * scale() * (great ? 1.3 : 1);
    drawMoon(ctx, mx, my, r, phase);
    // A blue moon: the same moon, washed in cold blue light.
    if (blue) {
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, mx, my, r * 2.6, '110,160,255', 0.35);
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.arc(mx, my, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(120,170,255,0.3)';
      ctx.fillRect(mx - r, my - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  /** The galaxy band, painted once per size into its cache: soft dust and many faint stars. */
  function drawGalaxy(c: CanvasRenderingContext2D, wy: number): void {
    const r = mulberry32(seed ^ 0x9a1a);
    // The band runs from low left to high right, across the top of the sky.
    const along = (u: number): [number, number] => [w * (-0.1 + 1.2 * u), wy * (0.85 - 0.75 * u)];
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const [x, y] = along(r());
      glow(c, x + range(r, -1, 1) * w * 0.03, y + range(r, -1, 1) * wy * 0.06, range(r, 0.04, 0.1) * w, '150,160,220', 0.05);
    }
    // A dark lane of dust down its middle.
    c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 18; i++) {
      const [x, y] = along(i / 17);
      glow(c, x, y + wy * 0.01, w * 0.035, '5,6,26', 0.18);
    }
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 700; i++) {
      const [x, y] = along(r());
      const spread = (r() - 0.5) * (r() - 0.5) * 4;
      c.fillStyle = `rgba(220,225,255,${range(r, 0.15, 0.55)})`;
      c.fillRect(x + spread * w * 0.04, y + spread * wy * 0.1, range(r, 0.6, 1.4) * dpr, range(r, 0.6, 1.4) * dpr);
    }
  }

  function drawSea(ctx: CanvasRenderingContext2D, t: number, phase: number, dawn = 0): void {
    const wy = waterY();
    const g = ctx.createLinearGradient(0, wy, 0, h);
    g.addColorStop(0, '#103a5a');
    g.addColorStop(0.4, '#08203a');
    g.addColorStop(1, '#030a18');
    ctx.fillStyle = g;
    ctx.fillRect(0, wy, w, h - wy);
    // At dawn the surface water takes the sky's warm colour, fading with depth.
    if (dawn > 0) {
      const d = ctx.createLinearGradient(0, wy, 0, wy + focus.h * 0.25);
      d.addColorStop(0, `rgba(255,170,140,${0.35 * dawn})`);
      d.addColorStop(1, 'rgba(255,170,140,0)');
      ctx.fillStyle = d;
      ctx.fillRect(0, wy, w, focus.h * 0.25);
    }
    const lit = 1 - Math.abs(phase - 0.5) * 2;
    const [mx] = moonPos();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Glitter: the moon's path caught on the wave tops, a thin band of glints along the
    // waterline under the moon (below it the scene is under water, seen from the side).
    for (let i = 0; i < 60; i++) {
      const q = i / 60;
      const yy = wy - 2 * dpr + q * q * focus.h * 0.03;
      const spread = 10 * dpr + (1 - q) * focus.w * 0.1;
      const xx = mx + Math.sin(t * 2.1 + i * 1.7) * spread;
      const a = (0.55 - q * 0.4) * (0.3 + 0.7 * lit) * (0.5 + 0.5 * Math.sin(t * 3 + i));
      ctx.fillStyle = `rgba(250,248,225,${Math.max(0, a)})`;
      ctx.fillRect(xx, yy, (6 + (1 - q) * 14) * dpr, 1.2 * dpr);
    }
    // Moonlight shafts.
    for (let i = 0; i < 4; i++) {
      const sx = mx + (i - 1.5) * focus.w * 0.08 + Math.sin(t * 0.1 + i) * 20 * dpr;
      const lg = ctx.createLinearGradient(0, wy, 0, h);
      lg.addColorStop(0, `rgba(200,220,255,${0.06 * lit})`);
      lg.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(sx - 10 * dpr, wy);
      ctx.lineTo(sx + 10 * dpr, wy);
      ctx.lineTo(sx - focus.w * 0.1 + 60 * dpr, h);
      ctx.lineTo(sx - focus.w * 0.1 - 60 * dpr, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  /** Sea sparkle before dawn: blue glints where the small waves break along the surface. */
  function drawSparkle(ctx: CanvasRenderingContext2D, t: number, dawn: number): void {
    if (dawn >= 1) return;
    const wy = waterY();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const x = focus.x + ((i * 0.618034 + t * 0.004 * (i % 3 + 1)) % 1) * focus.w;
      const on = Math.max(0, Math.sin(t * 1.7 + i * 2.3)) ** 8;
      if (on < 0.05) continue;
      glow(ctx, x, wy + Math.sin(x * 0.02 + t) * 2 * dpr, 6 * dpr, '90,190,255', 0.7 * on * (1 - dawn));
    }
    ctx.restore();
  }

  /** The squall's spray: white spume torn off the wave tops and blown along, and rain driven slantwise. */
  function drawSquall(ctx: CanvasRenderingContext2D, t: number, k: number): void {
    const s = scale(), wy = waterY();
    ctx.save();
    ctx.fillStyle = `rgba(20,24,40,${0.25 * k})`;
    ctx.fillRect(0, 0, w, wy);
    ctx.strokeStyle = `rgba(200,215,240,${0.35 * k})`;
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    for (let i = 0; i < 140; i++) {
      const x = ((i * 0.618 + t * 0.9) % 1.2 - 0.1) * w;
      const y = ((i * 0.381 + t * 1.6) % 1) * wy;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 14 * s, y + 9 * s);
    }
    ctx.stroke();
    ctx.fillStyle = `rgba(240,245,255,${0.6 * k})`;
    for (let i = 0; i < 50; i++) {
      const x = ((i * 0.618 + t * 0.35) % 1) * w, y = wy - 4 * s - ((i * 0.37 + t * 0.8) % 1) * 18 * s;
      ctx.beginPath();
      ctx.arc(x, y, (1 + (i % 3)) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWaves(ctx: CanvasRenderingContext2D, t: number): void {
    const wy = waterY();
    const sq = squallAt(t);
    ctx.strokeStyle = `rgba(200,225,255,${0.35 + 0.3 * sq})`;
    ctx.lineWidth = 1.5 * dpr;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8 * dpr) {
        const y = wy + k * 5 * dpr + Math.sin(x / (35 * dpr) + t * (1.2 + k * 0.4 + sq * 1.5) + k) * (3 + 7 * sq) * dpr;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /** Spawn: ripening dots on the reef before; a rising, spreading column after the release. */
  function drawSpawn(ctx: CanvasRenderingContext2D, t: number, v: ReefView, L: ReefLayout, reef: Reef): void {
    const s = scale();
    // Sweetened spawn goes golden: pink toward amber with each level.
    const g = Math.min(1, v.sweeten / 6);
    const bundle = `255,${Math.round(150 + 60 * g)},${Math.round(200 - 90 * g)}`;
    const wy = waterY();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Other reefs, far off, spawning on full-moon nights.
    if (v.moonFull || v.sinceBreach >= 0) {
      for (const b of far) {
        const u = ((t * b.speed + b.delay) % 1);
        const x = b.x * w + Math.sin(t * 0.5 + b.delay) * 6 * dpr;
        const y = h - u * (h - wy);
        glow(ctx, x, y, 4 * s * b.size, '255,170,210', 0.35 * Math.sin(u * Math.PI));
      }
    }
    if (v.sinceBreach >= 0) {
      // The release: everything rises at once, then a slow trickle forever after.
      const burst = Math.max(0, 1 - v.sinceBreach / 150);
      // Brooders release fewer, bigger larvae that swim; broadcasters cloud the water.
      const brooding = v.spawnMode === 'brooding';
      const n = Math.round(bundles.length * (0.12 + 0.88 * burst) * (brooding ? 0.35 : 1));
      const coral = reef.coral;
      if (v.spawnMode === 'fragmenting') drawFragments(ctx, v, L, reef, wy);
      // Each bundle is a bead of colour with a soft halo: the halos add up in the water (lighter),
      // the beads are painted over (source-over), so a cloud of them stays pink, not white.
      // Beads are batched into one path per shade and opacity step.
      const beads: Path2D[] = Array.from({ length: BEAD_SHADES * BEAD_STEPS }, () => new Path2D());
      const shines: Path2D[] = Array.from({ length: BEAD_STEPS }, () => new Path2D());
      for (let i = 0; i < n; i++) {
        const b = bundles[i]!;
        // Each bundle leaves a polyp on the reef and rises straight for the light.
        const node = (i * 7919) % coral.count;
        const [x0, y0] = reef.nodePx(L, node);
        if (y0 < wy) continue;
        // Staggered starts in the first seconds, then each bundle loops slowly forever.
        const age = v.sinceBreach - b.delay * 0.4;
        if (age < 0) continue;
        const u = (age * b.speed * 1.4) % 1;
        const wobble = brooding ? Math.sin(t * 4 + b.delay * 3) * 9 * s * u : 0;
        const x = x0 + b.drift * u * focus.w * 0.4 + Math.sin(t * 1.5 + b.delay) * 5 * s * u + wobble;
        const y = y0 - u * (y0 - wy);
        const a = Math.min(1, u * 8) * (1 - u * 0.6);
        const size = b.size * (brooding ? 1.9 : 1);
        glow(ctx, x, y, 15 * s * size, brooding ? '255,175,150' : bundle, 0.6 * a);
        const step = Math.min(BEAD_STEPS - 1, Math.floor(a * BEAD_STEPS));
        if (step <= 0) continue;
        const r = Math.max(3.4 * s * size, 1.2 * dpr);
        const p = beads[(i % BEAD_SHADES) * BEAD_STEPS + step]!;
        p.moveTo(x + r, y);
        p.arc(x, y, r, 0, Math.PI * 2);
        const q = shines[step]!;
        const hr = r * 0.38;
        q.moveTo(x - r * 0.3 + hr, y - r * 0.3);
        q.arc(x - r * 0.3, y - r * 0.3, hr, 0, Math.PI * 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      for (let k = 0; k < BEAD_SHADES; k++) {
        const rgb = brooding ? BROOD_SHADES[k]! : beadShade(k, g);
        for (let st = 1; st < BEAD_STEPS; st++) {
          ctx.fillStyle = `rgba(${rgb},${(0.9 * (st + 0.5) / BEAD_STEPS).toFixed(3)})`;
          ctx.fill(beads[k * BEAD_STEPS + st]!);
        }
      }
      for (let st = 1; st < BEAD_STEPS; st++) {
        ctx.fillStyle = `rgba(255,236,240,${(0.8 * (st + 0.5) / BEAD_STEPS).toFixed(3)})`;
        ctx.fill(shines[st]!);
      }
      ctx.globalCompositeOperation = 'lighter';
      // While the release is at its height the water itself goes pink with it.
      if (burst > 0) {
        const veil = ctx.createLinearGradient(0, wy, 0, h);
        veil.addColorStop(0, `rgba(255,140,190,${0.16 * burst})`);
        veil.addColorStop(1, `rgba(255,140,190,${0.04 * burst})`);
        ctx.fillStyle = veil;
        ctx.fillRect(0, wy, w, h - wy);
      }
      // The slick spreading on the surface.
      const spread = Math.min(1, v.sinceBreach / 60);
      ctx.save();
      ctx.translate(L.cx, wy);
      ctx.scale(1, 0.12);
      glow(ctx, 0, 0, focus.w * (0.15 + 0.5 * spread), '255,160,205', 0.55 * (0.4 + 0.6 * burst));
      ctx.restore();
    } else if (v.spawnLevel > 0) {
      // Pink bundles swelling under the mouths.
      const n = Math.round(80 * Math.min(1, v.spawnLevel));
      const pr = mulberry32(seed ^ 0x5a);
      for (let i = 0; i < n; i++) {
        const x = L.cx + range(pr, -0.3, 0.3) * L.unit;
        const y = L.baseY - range(pr, 0.25, 0.95) * L.unit;
        if (y < wy) continue;
        glow(ctx, x, y, 4 * s, '255,160,205', 0.5 + 0.3 * Math.sin(t * 2 + i));
      }
    }
    ctx.restore();
  }

  /**
   * A shore bird standing on the crown where it breaks the air ("Birds walk on you"), pecking now
   * and then. When the spawn is released it lifts off and flies away over the water.
   */
  /**
   * Glowing surf: where little waves break against the reef's emerged top, the plankton in the
   * water flashes blue, in pulses that run along the waterline with each wave.
   */
  function drawGlowSurf(ctx: CanvasRenderingContext2D, t: number, crown: readonly [number, number]): void {
    const s = scale();
    const wy = waterY();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 40; i++) {
      const side = i % 2 ? 1 : -1;
      const d = (8 + (i * 13) % 90) * s;
      const x = crown[0] + side * d;
      // Each wave runs outward from the stone; a spark lights as it passes.
      const wave = ((t * 0.45 - d / (120 * s)) % 1 + 1) % 1;
      const a = Math.max(0, 1 - wave * 3) * (1 - d / (110 * s));
      if (a <= 0.02) continue;
      glow(ctx, x, wy + Math.sin(i) * 2 * s, 12 * s, '70,190,255', 0.9 * a);
      glow(ctx, x, wy + Math.sin(i) * 2 * s, 3 * s, '210,245,255', a);
    }
    ctx.restore();
  }

  /**
   * Rain (once the reef has read the band): a shower every few minutes, streaks from the sky and
   * small rings spreading on the surface where the drops land.
   */
  /**
   * A turtle surfacing: every three minutes a head and the top of a shell break the water beside
   * the crown, a puff of breath, and down again. Touched, it ducks under at once.
   */
  function drawBreathingTurtle(ctx: CanvasRenderingContext2D, t: number, crownX: number): void {
    const period = 180, up = 9;
    const touch = startled('breathing-turtle', t);
    const u = (t % period) / up;
    if (u >= 1 || (touch && touch.age < 4)) return;
    sight('breathing-turtle');
    const s = scale() * 1.6;
    const rise = Math.sin(u * Math.PI);
    const x = crownX + 160 * s, wy = waterY();
    spot('breathing-turtle', x, wy - 6 * s, 26 * s);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, wy + 1);
    ctx.clip();
    // The shell's top, barely out of the water.
    const sy = wy + 4 * s - rise * 6 * s;
    ctx.fillStyle = '#4d5a3a';
    ctx.beginPath();
    ctx.ellipse(x - 14 * s, sy, 18 * s, 7 * s, 0, Math.PI, 0);
    ctx.fill();
    // Its plates' seams, and the wet shine along the top.
    ctx.strokeStyle = 'rgba(24,30,18,0.6)';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    ctx.ellipse(x - 14 * s, sy, 13 * s, 4 * s, 0, Math.PI * 1.05, Math.PI * 1.95);
    for (const dx of [-8, -1, 6]) { ctx.moveTo(x + (dx - 14) * s, sy - 4 * s * Math.sqrt(1 - (dx / 13) ** 2)); ctx.lineTo(x + (dx - 14) * s * 1.02, sy - 6.8 * s * Math.sqrt(1 - (dx / 18) ** 2)); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,235,245,0.35)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.ellipse(x - 14 * s, sy, 16 * s, 6 * s, 0, Math.PI * 1.25, Math.PI * 1.6);
    ctx.stroke();
    // The head, higher, nose up: a hooked beak, a pale throat, a ringed eye.
    const hx = x + 6 * s, hy = wy - rise * 10 * s;
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#6a7350';
    ctx.beginPath();
    ctx.moveTo(-6 * s, 2 * s);
    ctx.quadraticCurveTo(-5 * s, -4.6 * s, 2 * s, -4 * s);
    ctx.quadraticCurveTo(6.6 * s, -2.6 * s, 6.4 * s, 0.4 * s);
    ctx.quadraticCurveTo(3 * s, 4 * s, -6 * s, 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(214,206,160,0.5)';
    ctx.beginPath();
    ctx.ellipse(0, 2.4 * s, 4.5 * s, 1.1 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,36,22,0.7)';
    ctx.lineWidth = 0.5 * s;
    ctx.beginPath();
    ctx.moveTo(6.4 * s, 0.4 * s);
    ctx.quadraticCurveTo(4.6 * s, 0.4 * s, 3.4 * s, 1.2 * s);
    ctx.stroke();
    ctx.fillStyle = '#e0dcc0';
    ctx.beginPath();
    ctx.arc(2.4 * s, -1.6 * s, 1.1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#121410';
    ctx.beginPath();
    ctx.arc(2.6 * s, -1.6 * s, 0.65 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    // A puff of breath at the top of the rise.
    if (u > 0.4 && u < 0.7) glow(ctx, x + 10 * s, wy - 16 * s, 8 * s, '230,235,245', 0.4 * Math.sin(((u - 0.4) / 0.3) * Math.PI));
  }

  /**
   * A moonbow: for a little while after each shower, with the moon bright enough, a pale arc
   * stands over the sea on the side away from the moon, its colours barely there.
   */
  function drawMoonbow(ctx: CanvasRenderingContext2D, t: number, phase: number, dawn: number): void {
    const since = (t % 300) - 70;
    const lit = 1 - Math.abs(phase - 0.5) * 2;
    if (since < 0 || since > 60 || lit < 0.4 || dawn > 0.5) return;
    const a = Math.min(1, since / 8, (60 - since) / 15) * (lit - 0.4) / 0.6;
    sight('moonbow');
    const wy = waterY();
    const cx0 = focus.x + focus.w * 0.25, r = focus.w * 0.3;
    spot('moonbow', cx0, wy - r * 0.8, r * 0.3);
    const bands = ['255,140,140', '255,210,140', '200,255,170', '150,200,255', '200,160,255'];
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, wy);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    bands.forEach((c, i) => {
      ctx.strokeStyle = `rgba(${c},${0.07 * a})`;
      ctx.lineWidth = 5 * scale();
      ctx.beginPath();
      ctx.arc(cx0, wy + r * 0.25, r - i * 5 * scale(), Math.PI, 0);
      ctx.stroke();
    });
    ctx.restore();
  }

  /** A storm far off: a forked bolt to the horizon, the sky lit for an instant, a glint on the sea. */
  function drawLightning(ctx: CanvasRenderingContext2D, t: number, calm: boolean): void {
    const l = lightningAt(t);
    if (!l) return;
    sight('far-storm');
    const s = scale();
    const wy = waterY();
    const r = mulberry32(l.lap * 131 + l.k * 17 + 5);
    const x0 = focus.x + focus.w * (0.12 + r() * 0.76);
    // Two quick flickers, then a fading afterglow; calm, only a slow soft glow.
    const f = calm ? 0.35 * Math.sin(Math.min(1, l.since / 3) * Math.PI)
      : l.since < 0.08 ? 1 : l.since < 0.16 ? 0.25 : l.since < 0.26 ? 0.9 : Math.max(0, 1 - (l.since - 0.26) / 0.9);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // The whole sky over the sea lights up, most around the bolt.
    const g = ctx.createRadialGradient(x0, wy - (wy - focus.y) * 0.5, 0, x0, wy - (wy - focus.y) * 0.5, focus.w * 0.7);
    g.addColorStop(0, `rgba(190,200,255,${0.32 * f})`);
    g.addColorStop(1, `rgba(120,130,200,${0.08 * f})`);
    ctx.fillStyle = g;
    ctx.fillRect(focus.x, focus.y, focus.w, wy - focus.y);
    if (l.since < 0.6) {
      // The bolt: a jagged main stroke from the clouds to the horizon, with two forks.
      const top = focus.y + (wy - focus.y) * 0.3, bottom = wy - 2 * s;
      const pts: [number, number][] = [[x0, top]];
      const n = 11;
      for (let i = 1; i <= n; i++) pts.push([pts[i - 1]![0] + (r() - 0.5) * 24 * s, top + (bottom - top) * (i / n)]);
      const strokeBolt = (p: [number, number][], width: number, a: number) => {
        ctx.strokeStyle = `rgba(225,230,255,${a})`;
        ctx.lineWidth = width;
        ctx.beginPath();
        p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      };
      ctx.shadowColor = 'rgba(170,180,255,0.9)';
      ctx.shadowBlur = 18 * s;
      strokeBolt(pts, 2.4 * s, f);
      for (const at of [3, 6]) {
        const fork: [number, number][] = [pts[at]!];
        const dir = r() < 0.5 ? -1 : 1;
        for (let i = 1; i <= 4; i++) fork.push([fork[i - 1]![0] + dir * (6 + r() * 14) * s, fork[i - 1]![1] + (10 + r() * 16) * s]);
        strokeBolt(fork, 1.2 * s, 0.7 * f);
      }
      ctx.shadowBlur = 0;
      // Where it meets the sea, a bright glint spreading along the water.
      glow(ctx, pts[n]![0], wy, 60 * s, '200,210,255', 0.6 * f);
    }
    // The flash on the water's skin, all along.
    ctx.fillStyle = `rgba(200,210,255,${0.12 * f})`;
    ctx.fillRect(focus.x, wy - 1 * s, focus.w, 3 * s);
    ctx.restore();
    spot('far-storm', x0, wy - (wy - focus.y) * 0.4, 60 * s);
  }

  function drawRain(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 300, length = 70;
    const u = (t % period) / length;
    if (u >= 1) return;
    const k = Math.min(1, u * 5, (1 - u) * 5);
    const s = scale();
    const wy = waterY();
    ctx.save();
    // Three depths of drops, each falling at its own speed along the wind's slant and landing at a
    // new place each time: far drops short and faint, near ones longer and brighter.
    const fall = wy - focus.y, slant = 0.17;
    for (let z = 0; z < 3; z++) {
      const len = (6 + 6 * z) * s;
      ctx.strokeStyle = `rgba(210,225,255,${(0.17 + 0.13 * z) * k})`;
      ctx.lineWidth = (0.6 + 0.4 * z) * s;
      ctx.beginPath();
      for (let i = z; i < 180; i += 3) {
        const speed = 1.1 + 0.4 * z + ((i * 0.7548776) % 1) * 0.4;
        const f = t * speed + ((i * 0.5698403) % 1);
        const lap = Math.floor(f), ph = f - lap;
        const u0 = (i * 0.618034 + lap * 0.2549) % 1;
        // The tail reaches the surface as the drop lands.
        const y = focus.y - len + ph * fall;
        const x = focus.x - 0.05 * focus.w + u0 * (focus.w * 1.1 + fall * slant) - ph * fall * slant;
        ctx.moveTo(x, y);
        ctx.lineTo(x - len * slant, y + len);
      }
      ctx.stroke();
    }
    // Rings on the surface.
    ctx.strokeStyle = `rgba(220,235,255,${0.3 * k})`;
    for (let i = 0; i < 26; i++) {
      const ph = (t * 1.3 + i * 0.29) % 1;
      const x = focus.x + ((i * 0.381966 + Math.floor(t * 1.3 + i * 0.29) * 0.13) % 1) * focus.w;
      ctx.beginPath();
      ctx.ellipse(x, wy + 2 * s, ph * 9 * s, ph * 2.5 * s, 0, 0, Math.PI * 2);
      ctx.globalAlpha = 1 - ph;
      ctx.stroke();
    }
    ctx.restore();
  }

  /** The green flash: the instant the sun's rim clears the sea after the release. */
  function drawGreenFlash(ctx: CanvasRenderingContext2D, since: number): void {
    const u = (since - 150) / 3;
    if (u < 0 || u > 1) return;
    sight('green-flash');
    const s = scale();
    const x = focus.x + focus.w * 0.62, y = waterY() - 2 * s;
    spot('green-flash', x, y, 40 * s);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y, 70 * s, '120,255,150', 0.7 * Math.sin(u * Math.PI));
    glow(ctx, x, y, 14 * s, '200,255,210', Math.sin(u * Math.PI));
    ctx.restore();
  }

  /** A pelican after dawn: glides low across, then plunges; touched, it climbs away. */
  function drawPelican(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 45, u = (t % period) / period;
    if (u > 0.6) return;
    sight('pelican');
    const s = scale() * 1.6;
    const wy = waterY();
    const touch = startled('pelican', t);
    const climb = touch && touch.age < 6 ? Math.min(1, touch.age / 3) : 0;
    const k = u / 0.6;
    const dir = Math.floor(t / period) % 2 ? 1 : -1;
    const x = focus.x + focus.w * (dir > 0 ? -0.05 + k * 1.1 : 1.05 - k * 1.1);
    // Gliding, then (after 70% of the pass) a plunge, unless it was startled.
    const plunge = k > 0.7 && !climb ? (k - 0.7) / 0.3 : 0;
    const y = wy - (55 - plunge * 60 + climb * 80) * s;
    if (plunge >= 1) return;
    spot('pelican', x, y, 26 * s);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.rotate(plunge * 1.2);
    const fold = plunge;
    const flap = Math.sin(t * 2.2) * 0.25 * (1 - fold);
    const span = 30 * s * (1 - fold * 0.75);
    // Wings: broad and long, bent at the wrist, filled, the far one darker and behind; dark
    // against the dawn, the flight feathers a shade darker at the trailing edge.
    const wing = (side: number, shade: string) => {
      const wx = side * span * 0.45, wyy = (-7 - flap * 6) * s, tx = side * span, ty = (-2 - flap * 10) * s;
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.moveTo(side * 1 * s, -2 * s);
      ctx.quadraticCurveTo(side * span * 0.2, wyy - 2 * s, wx, wyy);
      ctx.quadraticCurveTo(side * span * 0.75, wyy - 1 * s, tx, ty);
      ctx.quadraticCurveTo(side * span * 0.7, ty + 2.6 * s, wx, wyy + 3.6 * s);
      ctx.quadraticCurveTo(side * span * 0.2, 1 * s, side * 1 * s, 2 * s);
      ctx.closePath();
      ctx.fill();
    };
    wing(-1, '#36312f');
    // Body, a short tail, the neck folded back so the head sits on the shoulders, and the long bill
    // with its pouch hanging under it.
    ctx.fillStyle = '#5a5450';
    ctx.beginPath();
    ctx.ellipse(-2 * s, 1 * s, 8 * s, 3 * s, 0, 0, Math.PI * 2);
    ctx.moveTo(-9 * s, 0);
    ctx.lineTo(-13 * s, -0.5 * s);
    ctx.lineTo(-12.5 * s, 2.5 * s);
    ctx.lineTo(-9 * s, 2.5 * s);
    ctx.moveTo(9.4 * s, -1 * s);
    ctx.arc(7 * s, -1 * s, 2.4 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e2d4';
    ctx.beginPath();
    ctx.arc(7.2 * s, -2 * s, 1.3 * s, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c09048';
    ctx.beginPath();
    ctx.moveTo(8.5 * s, -2 * s);
    ctx.lineTo(21 * s, -0.4 * s);
    ctx.lineTo(20 * s, 0.4 * s);
    ctx.quadraticCurveTo(14 * s, 4 * s, 9 * s, 2.2 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1614';
    ctx.beginPath();
    ctx.arc(7.6 * s, -1.6 * s, 0.5 * s, 0, Math.PI * 2);
    ctx.fill();
    wing(1, '#4a4440');
    ctx.restore();
  }

  /** Turtle hatchlings at dawn after the release: tiny turtles paddling along the surface; touched, they dive. */
  function drawHatchlings(ctx: CanvasRenderingContext2D, t: number, since: number): void {
    if (since < 60) return;
    sight('hatchlings');
    const s = scale() * 2;
    const wy = waterY();
    const touch = startled('hatchlings', t);
    const dive = touch && touch.age < 5 ? Math.sin(Math.min(1, touch.age / 5) * Math.PI) : 0;
    for (let k = 0; k < 7; k++) {
      const u = ((t * 0.012 + k * 0.11) % 1.2) - 0.1;
      const x = focus.x + u * focus.w;
      const y = wy + 3 * s + Math.sin(t * 2 + k) * 1.2 * s + dive * (12 + k * 3) * s;
      if (k === 0) spot('hatchlings', x, y, 26 * s);
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 1 - dive * 0.6;
      // A hatchling in profile, swimming right: a domed shell with a pale rim, a round head, the big
      // front flipper sweeping (hatchlings are mostly flipper), a small one behind.
      const paddle = Math.sin(t * 6 + k) * 0.6;
      ctx.fillStyle = '#3a3a2a';
      ctx.save();
      ctx.translate(1.4 * s, 0.6 * s);
      ctx.rotate(0.6 + paddle);
      ctx.beginPath();
      ctx.moveTo(0, -0.6 * s);
      ctx.quadraticCurveTo(2.6 * s, 1.6 * s, 0.8 * s, 5 * s);
      ctx.quadraticCurveTo(-0.6 * s, 2.4 * s, -0.8 * s, 0.2 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.ellipse(-2.8 * s, 1 * s, 1.1 * s, 0.6 * s, -0.5 - paddle * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-3.8 * s, 0.6 * s);
      ctx.quadraticCurveTo(-3.6 * s, -2.6 * s, 0, -2.6 * s);
      ctx.quadraticCurveTo(3.4 * s, -2.4 * s, 3.6 * s, 0.4 * s);
      ctx.quadraticCurveTo(0, 1.4 * s, -3.8 * s, 0.6 * s);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,190,150,0.55)';
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      ctx.moveTo(-3.6 * s, 0.5 * s);
      ctx.quadraticCurveTo(0, 1.2 * s, 3.4 * s, 0.4 * s);
      ctx.stroke();
      ctx.fillStyle = '#4a4834';
      ctx.beginPath();
      ctx.arc(4.6 * s, -0.6 * s, 1.3 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8e2c8';
      ctx.beginPath();
      ctx.arc(5.1 * s, -0.9 * s, 0.35 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Flying fish: every so often a few burst from the water, glide low over the surface on spread
   * wing-fins, and drop back in. Tapped in the air, they glide on farther.
   */
  function drawFlyingFish(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 24, flight = 4.5;
    const lap = Math.floor(t / period);
    const touch = startled('flying-fish', t);
    const extra = touch && t - touch.age >= lap * period ? 2.5 : 0;
    const u = (t - lap * period) / (flight + extra);
    if (u < 0 || u > 1) return;
    sight('flying-fish');
    const s = scale() * 1.3;
    const wy = waterY();
    const dir = lap % 2 ? 1 : -1;
    const x0 = focus.x + focus.w * (dir > 0 ? 0.15 : 0.85) + Math.sin(lap * 3.1) * focus.w * 0.05;
    for (let k = 0; k < 3; k++) {
      const uk = Math.max(0, Math.min(1, u * 1.15 - k * 0.07));
      if (uk <= 0 || uk >= 1) continue;
      const x = x0 + dir * uk * focus.w * (0.45 + extra * 0.08) + k * 14 * s;
      const y = wy - Math.sin(uk * Math.PI) * (26 + k * 6) * s;
      if (k === 0) spot('flying-fish', x, y, 18 * s);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      ctx.rotate(-Math.cos(uk * Math.PI) * 0.25);
      // Dark blue back, silver belly.
      const g = ctx.createLinearGradient(0, -2.5 * s, 0, 2.5 * s);
      g.addColorStop(0, '#2c4a78');
      g.addColorStop(1, '#a9bcd4');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(9 * s, 0);
      ctx.quadraticCurveTo(4 * s, -2.6 * s, -6 * s, -1 * s);
      ctx.lineTo(-9 * s, 0);
      ctx.lineTo(-6 * s, 1.2 * s);
      ctx.quadraticCurveTo(4 * s, 2.6 * s, 9 * s, 0);
      ctx.fill();
      // A forked tail, the lower lobe longer.
      ctx.fillStyle = '#3a5a88';
      ctx.beginPath();
      ctx.moveTo(-8 * s, 0);
      ctx.lineTo(-12 * s, -2.5 * s);
      ctx.lineTo(-10.5 * s, 0);
      ctx.lineTo(-13.5 * s, 3.5 * s);
      ctx.closePath();
      ctx.fill();
      // The long wing-fin sweeping back from the shoulder, faintly ribbed.
      ctx.fillStyle = 'rgba(150,185,230,0.6)';
      ctx.beginPath();
      ctx.moveTo(4 * s, -1 * s);
      ctx.quadraticCurveTo(-2 * s, -7 * s, -10 * s, -5 * s);
      ctx.quadraticCurveTo(-4 * s, -2.5 * s, 2 * s, -0.5 * s);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,235,255,0.5)';
      ctx.lineWidth = 0.4 * s;
      ctx.beginPath();
      for (let r = 0; r < 4; r++) {
        ctx.moveTo(3 * s, -1 * s);
        ctx.lineTo(-4 * s - r * 1.6 * s, -5.5 * s + r * 0.6 * s);
      }
      ctx.stroke();
      ctx.fillStyle = '#e8eef8';
      ctx.beginPath();
      ctx.arc(6.5 * s, -0.4 * s, 0.7 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * The sister reef on the next seamount: far off on the horizon once it nears the surface, a
   * small dark crown rising out of the haze, breaking the water when it arrives, lights on its tips.
   */
  function drawSisterSpawn(ctx: CanvasRenderingContext2D, t: number, since: number): void {
    const s = scale();
    const wy = waterY();
    const x = focus.x + focus.w * 0.12;
    const fade = Math.max(0.2, 1 - since / 300);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 60; i++) {
      const u = (since * 0.05 + i * 0.137) % 1;
      const px = x + Math.sin(i * 2.1 + t * 0.4) * 30 * s * u + (i % 2 ? 1 : -1) * u * 20 * s;
      const py = wy + (1 - u) * focus.h * 0.25;
      glow(ctx, px, py, 7 * s, '255,150,200', 0.5 * fade * Math.sin(u * Math.PI));
    }
    // The slick on the surface over her.
    ctx.translate(x, wy);
    ctx.scale(1, 0.12);
    glow(ctx, 0, 0, focus.w * 0.12, '255,160,205', 0.4 * fade);
    ctx.restore();
  }

  function drawSister(ctx: CanvasRenderingContext2D, t: number, f: number): void {
    if (f < 0.85) return;
    const s = scale();
    const y0 = waterY();
    const rise = Math.min(1, (f - 0.85) / 0.15);
    const x = focus.x + focus.w * 0.12;
    // Only the part above the water shows: a low bumpy crown, taller as the sister nears the air.
    const H = (4 + 22 * rise) * s;
    ctx.save();
    ctx.fillStyle = `rgba(22,26,48,${0.4 + 0.4 * rise})`;
    ctx.beginPath();
    ctx.moveTo(x - 50 * s, y0);
    const tips: [number, number][] = [];
    for (let k = 0; k <= 10; k++) {
      const u = k / 10;
      const hk = H * Math.sin(u * Math.PI) ** 0.7 * (0.75 + 0.25 * Math.sin(k * 2.7));
      const px = x - 50 * s + u * 100 * s, py = y0 - hk;
      ctx.lineTo(px, py);
      if (k % 2 === 1) tips.push([px, py]);
    }
    ctx.lineTo(x + 50 * s, y0);
    ctx.closePath();
    ctx.fill();
    if (rise >= 1) {
      ctx.globalCompositeOperation = 'lighter';
      for (const [k, [px, py]] of tips.entries()) glow(ctx, px, py, 6 * s, '255,210,230', 0.45 + 0.25 * Math.sin(t * 1.3 + k));
    }
    ctx.restore();
  }

  /**
   * The waiting fish (after that band): bright reef fish crowd under the crown, patient, turning
   * slow circles, waiting for the spawn. After the release they scatter into the drifting bundles.
   */
  function drawWaitingFish(ctx: CanvasRenderingContext2D, t: number, v: ReefView, crown: readonly [number, number]): void {
    if (!v.bands.includes('waiting-fish')) return;
    const s = scale();
    const wy = waterY();
    const feeding = v.sinceBreach >= 0 ? Math.min(1, v.sinceBreach / 20) : 0;
    // Touched, the crowd bursts outward and drifts back over a few seconds.
    const touch = startled('reef-fish', t);
    const burst = touch && touch.age < 4 ? Math.sin(Math.min(1, touch.age / 4) * Math.PI) ** 0.6 : 0;
    const hues = [48, 200, 330, 20, 160, 280];
    for (let k = 0; k < 18; k++) {
      const a = t * (0.25 + (k % 4) * 0.06) * (k % 2 ? 1 : -1) + k * 1.9;
      const rx = (60 + (k % 5) * 22) * s * (1 + feeding * 1.5 + burst * 1.8), ry = (18 + (k % 3) * 10) * s * (1 + burst);
      const x = crown[0] + Math.cos(a) * rx;
      const y = Math.max(wy + 14 * s, crown[1] + 40 * s + (k % 6) * 14 * s + Math.sin(a) * ry - feeding * 30 * s);
      const dir = -Math.sin(a) * (k % 2 ? 1 : -1) >= 0 ? 1 : -1;
      const len = (7 + (k % 3) * 2) * s;
      spot('reef-fish', x, y, Math.max(14 * s, 18 * dpr));
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(dir, 1);
      // A small reef fish in its colour: darker back, pale belly, fins, eye (the shared small fish,
      // whose length is about 21 of its units).
      const hue = hues[k % hues.length]!;
      drawSmallFish(ctx, len / 9, `hsl(${hue},55%,36%)`, `hsl(${hue},60%,50%)`, `hsl(${hue},55%,72%)`);
      ctx.restore();
    }
    if (v.bands.includes('waiting-fish')) sight('reef-fish');
  }

  /** Moon jellies drifting under the surface: translucent saucers with a pale four-lobed clover, pulsing. */
  function drawMoonJellies(ctx: CanvasRenderingContext2D, t: number): void {
    const s = scale();
    const wy = waterY();
    sight('moon-jelly');
    for (let k = 0; k < 6; k++) {
      const u = ((t * 0.008 + k * 0.17) % 1);
      const x = focus.x + focus.w * (k % 2 ? 0.05 + u * 0.25 : 0.95 - u * 0.25);
      const y = wy + focus.h * (0.12 + 0.1 * (k % 3)) + Math.sin(t * 0.4 + k) * 10 * s;
      spot('moon-jelly', x, y, Math.max(20 * s, 24 * dpr));
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.6 + k);
      const r = (14 + (k % 3) * 4) * s;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(200,215,255,0.13)';
      ctx.strokeStyle = 'rgba(220,230,255,0.35)';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * pulse, r * 0.45 / pulse, 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      // Four pale horseshoes seen through the bell: a four-leaf clover, foreshortened from the side
      // (the near and far leaves flattened, the two side ones turned edge-on), slowly turning.
      // Soft filled lobes, no outlines (rings read as eyes or letters).
      ctx.fillStyle = 'rgba(255,190,225,0.2)';
      ctx.beginPath();
      const turn = t * 0.15 + k;
      for (let q = 0; q < 4; q++) {
        const a = turn + q * Math.PI / 2;
        const lx = Math.cos(a) * r * 0.3 * pulse, ly = -r * 0.16 + Math.sin(a) * r * 0.07;
        const rx = r * 0.2 * (0.5 + 0.5 * Math.abs(Math.sin(a))), ry = r * 0.09;
        ctx.moveTo(lx + rx, ly);
        ctx.ellipse(lx, ly, rx, ry, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      // The four oral arms: short frilly ribbons hanging from the middle, swaying.
      ctx.fillStyle = 'rgba(230,220,250,0.16)';
      ctx.beginPath();
      for (let q = 0; q < 4; q++) {
        const ox = (q - 1.5) * r * 0.12, sw = Math.sin(t * 0.9 + q + k) * 2 * s;
        const len = r * (0.55 + 0.1 * (q % 2));
        ctx.moveTo(ox - r * 0.05, 0);
        for (let i = 1; i <= 4; i++) ctx.lineTo(ox - r * 0.05 - (i % 2) * r * 0.04 + sw * (i / 4), (i / 4) * len);
        for (let i = 4; i >= 1; i--) ctx.lineTo(ox + r * 0.05 + (i % 2) * r * 0.04 + sw * (i / 4), (i / 4) * len);
        ctx.closePath();
      }
      ctx.fill();
      // A fine fringe of many short tentacles all round the rim.
      ctx.strokeStyle = 'rgba(210,225,255,0.22)';
      ctx.lineWidth = 0.5 * s;
      ctx.beginPath();
      for (let q = 0; q <= 22; q++) {
        const fx = (q / 22 - 0.5) * 2 * r * pulse;
        const fl = r * (0.14 + 0.05 * Math.sin(q * 1.7));
        ctx.moveTo(fx, 0);
        ctx.quadraticCurveTo(fx + Math.sin(t * 1.3 + q) * 1.2 * s, fl * 0.6, fx + Math.sin(t * 1.1 + q) * 2 * s, fl);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  /** Now and then a pod of dolphins arcs out of the moonlit water, one after another. */
  function drawDolphins(ctx: CanvasRenderingContext2D, t: number): void {
    const period = 75;
    const u = (t % period) / 6;
    // Touched, the pod answers with a higher leap of its own, from where it was touched.
    const touch = startled('dolphin', t);
    const encore = touch && touch.age < 9.6 ? touch : null;
    if (u >= 1.6 && !encore) return;
    sight('dolphin');
    const lap = Math.floor(t / period);
    leaps(ctx, focus.x + focus.w * (lap % 2 ? 0.12 : 0.62), u, 1);
    if (encore) leaps(ctx, encore.x - focus.w * 0.04, encore.age / 6, 1.5);
  }

  /** A pod of three leaping in turn: `u` runs 0..1.6 over the sequence, `lift` scales the arcs. */
  function leaps(ctx: CanvasRenderingContext2D, x0: number, u: number, lift: number): void {
    const s = scale() * 1.6;
    const wy = waterY();
    for (let k = 0; k < 3; k++) {
      const p = u - k * 0.3;
      if (p < 0 || p > 1) continue;
      // A leap: a parabola from the water and back, body tilted along the arc.
      const x = x0 + (p + k * 0.25) * focus.w * 0.22;
      const y = wy - Math.sin(Math.PI * p) * 46 * s * lift;
      const ang = -Math.cos(Math.PI * p) * 0.9;
      spot('dolphin', x, y, 26 * s);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = '#0c1028';
      // A dolphin's side: a short beak below a rounded melon, the body thickest behind the head,
      // a long tail stock narrowing to the flukes (seen edge-on: a thin swept crescent).
      ctx.beginPath();
      ctx.moveTo(21 * s, 0.6 * s);
      ctx.lineTo(16.5 * s, 0.2 * s);
      ctx.quadraticCurveTo(15.5 * s, -3.6 * s, 11 * s, -4.4 * s);
      ctx.quadraticCurveTo(0, -6.2 * s, -9 * s, -3 * s);
      ctx.quadraticCurveTo(-13 * s, -1.6 * s, -15.5 * s, -0.8 * s);
      ctx.quadraticCurveTo(-19 * s, -4.5 * s, -22 * s, -5.5 * s);
      ctx.quadraticCurveTo(-20 * s, -1 * s, -17.5 * s, 0.2 * s);
      ctx.quadraticCurveTo(-20 * s, 2 * s, -22 * s, 5 * s);
      ctx.quadraticCurveTo(-18.5 * s, 3.6 * s, -15.5 * s, 1 * s);
      ctx.quadraticCurveTo(-12 * s, 1.6 * s, -8 * s, 3 * s);
      ctx.quadraticCurveTo(4 * s, 5.4 * s, 12 * s, 3 * s);
      ctx.quadraticCurveTo(16 * s, 2 * s, 21 * s, 0.6 * s);
      ctx.closePath();
      ctx.fill();
      // Dorsal fin, curved back, and a pectoral fin under the front.
      ctx.beginPath();
      ctx.moveTo(1 * s, -5.6 * s);
      ctx.quadraticCurveTo(-1 * s, -10.5 * s, -6 * s, -11 * s);
      ctx.quadraticCurveTo(-4 * s, -7.5 * s, -6 * s, -4 * s);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8 * s, 3.4 * s);
      ctx.quadraticCurveTo(6 * s, 7.5 * s, 2.5 * s, 8.5 * s);
      ctx.quadraticCurveTo(4 * s, 5.5 * s, 3.5 * s, 3.8 * s);
      ctx.closePath();
      ctx.fill();
      // Moonlight along the back.
      ctx.strokeStyle = 'rgba(220,225,255,0.35)';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(14 * s, -3.6 * s);
      ctx.quadraticCurveTo(4 * s, -6.2 * s, -9 * s, -3.4 * s);
      ctx.stroke();
      ctx.restore();
      // Splash rings where it leaves and re-enters.
      if (p < 0.12 || p > 0.88) {
        ctx.strokeStyle = 'rgba(210,225,255,0.5)';
        ctx.lineWidth = 1 * s;
        ctx.beginPath();
        ctx.ellipse(x, wy, 10 * s, 2.5 * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  /** Where the reef's top stands in the air: a low hump at the waterline that grows over the last metres. */
  function topOf(v: ReefView, crown: readonly [number, number]) {
    const s = scale() * 1.8;
    const rise = Math.min(1, Math.max(0.3, (v.height - 3990) / 10));
    // High water covers more of the stone, low water bares it.
    const wy = waterY();
    const hh = Math.max(1.5 * s, 7 * s * rise + (wy - stillY()) * 0.8);
    return { s, wy, hx: crown[0] - 6 * s, hw: 22 * s, hh };
  }

  /** The reef's top in the air at low tide (drawn behind the reef so wide forms cover it). */
  function drawTop(ctx: CanvasRenderingContext2D, v: ReefView, crown: readonly [number, number]): void {
    if (!v.bands.includes('air')) return;
    const { s, wy, hx, hw, hh } = topOf(v, crown);
    ctx.fillStyle = '#1b1426';
    ctx.beginPath();
    ctx.moveTo(hx - hw, wy + 2 * s);
    ctx.bezierCurveTo(hx - hw * 0.6, wy - hh, hx + hw * 0.5, wy - hh * 1.2, hx + hw, wy + 2 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,225,255,0.25)';
    ctx.lineWidth = 1 * s;
    ctx.beginPath();
    ctx.moveTo(hx - hw * 0.7, wy - hh * 0.55);
    ctx.bezierCurveTo(hx - hw * 0.4, wy - hh * 0.95, hx + hw * 0.2, wy - hh * 1.05, hx + hw * 0.45, wy - hh * 0.8);
    ctx.stroke();
  }

  function drawBird(ctx: CanvasRenderingContext2D, t: number, v: ReefView, crown: readonly [number, number]): void {
    if (!v.bands.includes('air')) return;
    sight('shore-bird');
    const { s, wy, hx, hw, hh } = topOf(v, crown);
    const flying = v.sinceBreach >= 0;
    const k = flying ? Math.min(1, v.sinceBreach / 12) : 0;
    if (k >= 1) return;
    const x = hx - hw * 0.35 - k * focus.w * 0.6;
    const y = wy - hh * 0.9 - 13 * s - k * k * focus.h * 0.35;
    spot('shore-bird', x, y, Math.max(14 * s, 24 * dpr));
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#0b0b1c';
    ctx.strokeStyle = '#0b0b1c';
    ctx.lineCap = 'round';
    if (!flying) {
      const peck = Math.max(0, Math.sin(t * 0.7)) ** 12;
      // Legs.
      ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(-1 * s, 3 * s);
      ctx.lineTo(-2 * s, 13 * s);
      ctx.moveTo(1.5 * s, 3 * s);
      ctx.lineTo(2 * s, 13 * s);
      ctx.stroke();
      // Body and tail.
      ctx.beginPath();
      ctx.ellipse(0, 0, 7 * s, 4 * s, -0.15, 0, Math.PI * 2);
      ctx.moveTo(-6 * s, -1 * s);
      ctx.lineTo(-11 * s, 1 * s);
      ctx.lineTo(-6 * s, 2 * s);
      ctx.fill();
      // Neck, head and a long bill dipping when it pecks.
      ctx.save();
      ctx.translate(5 * s, -2 * s);
      ctx.rotate(0.9 * peck);
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(2 * s, -5 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(2.5 * s, -6 * s, 2.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 0.9 * s;
      ctx.beginPath();
      ctx.moveTo(4 * s, -6 * s);
      ctx.lineTo(10 * s, -4.5 * s);
      ctx.stroke();
      ctx.restore();
      // Moonlight on its back.
      ctx.strokeStyle = 'rgba(220,225,255,0.35)';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7 * s, 4 * s, -0.15, Math.PI * 1.1, Math.PI * 1.75);
      ctx.stroke();
    } else {
      // Wings beating as it climbs away: filled, pointed, bent at the wrist.
      const flap = Math.sin(t * 9);
      ctx.beginPath();
      for (const d of [-1, 1]) {
        ctx.moveTo(d * 1 * s, -1 * s);
        ctx.quadraticCurveTo(d * 4 * s, (-3 - flap * 2) * s, d * 6 * s, (-3.5 - flap * 3) * s);
        ctx.quadraticCurveTo(d * 9 * s, (-3.5 - flap * 4) * s, d * 12 * s, -flap * 7 * s);
        ctx.quadraticCurveTo(d * 8 * s, (-1 - flap * 3) * s, d * 5 * s, (-0.5 - flap * 1.5) * s);
        ctx.quadraticCurveTo(d * 3 * s, 0.5 * s, d * 1 * s, 1 * s);
        ctx.closePath();
      }
      ctx.ellipse(0, 0.5 * s, 4 * s, 1.8 * s, 0, 0, Math.PI * 2);
      ctx.moveTo(4.6 * s, -0.4 * s);
      ctx.arc(3.6 * s, -0.4 * s, 1.2 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(4.6 * s, -0.4 * s);
      ctx.lineTo(9 * s, 0.4 * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * After the release, your children settle: tiny new reefs appear one by one in the deep below,
   * more as time passes (dozens within the hour), each a few pale branches and a pink glow.
   */
  function drawChildren(ctx: CanvasRenderingContext2D, v: ReefView, t: number): void {
    if (v.sinceBreach < 30) return;
    const s = scale();
    const wy = waterY();
    const n = Math.min(40, Math.floor(6 * Math.log2(1 + (v.sinceBreach - 30) / 30)));
    const r = mulberry32(seed ^ 0xc41d);
    for (let i = 0; i < n; i++) {
      const x = focus.x + focus.w * range(r, 0.03, 0.97);
      const depth = range(r, 0.55, 1);
      const y = wy + (h - wy) * depth;
      const size = (0.5 + depth) * s * range(r, 0.6, 1.1);
      const born = Math.min(1, (v.sinceBreach - 30 - i * 20) / 20);
      if (born <= 0) continue;
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.4 * depth * born;
      // A lump of old rubble to cling to, and on it a tiny colony: three curved branches, each
      // forking once, a polyp's pink point at every tip.
      ctx.fillStyle = 'rgba(70,64,80,0.7)';
      ctx.beginPath();
      ctx.ellipse(x, y + 1.2 * size, 5 * size, 2 * size, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,215,0.8)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.2 * size;
      ctx.beginPath();
      const tips: [number, number][] = [];
      for (let b = 0; b < 3; b++) {
        const a = -Math.PI / 2 + (b - 1) * 0.55 + Math.sin(i * 2.3 + b) * 0.12;
        const len = (5 + (b % 2) * 2.5) * size * born;
        const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 - Math.sin(a) * 1.2 * size, y + Math.sin(a) * len * 0.5, ex, ey);
        for (const side of [-1, 1]) {
          const fa = a + side * 0.5, fl = len * 0.45;
          const fx = ex + Math.cos(fa) * fl, fy = ey + Math.sin(fa) * fl;
          ctx.moveTo(ex, ey);
          ctx.lineTo(fx, fy);
          tips.push([fx, fy]);
        }
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,214,230,0.95)';
      ctx.beginPath();
      for (const [tx, ty] of tips) { ctx.moveTo(tx + 0.9 * size, ty); ctx.arc(tx, ty, 0.9 * size, 0, Math.PI * 2); }
      ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x, y - 5 * size, 10 * size, '255,150,200', 0.25 * born * (0.7 + 0.3 * Math.sin(t + i)));
      ctx.restore();
    }
  }

  /** Fragmenting: pieces of branch break away at the release and tumble down to settle elsewhere. */
  function drawFragments(ctx: CanvasRenderingContext2D, v: ReefView, L: ReefLayout, reef: Reef, wy: number): void {
    const s = scale();
    const coral = reef.coral;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    for (let k = 0; k < 10; k++) {
      const node = (k * 4099 + 17) % coral.count;
      const [x0, y0] = reef.nodePx(L, node);
      if (y0 < wy) continue;
      const age = v.sinceBreach - k * 1.3;
      if (age < 0) continue;
      const fall = Math.min(1, age / 40);
      const x = x0 + (k % 2 ? 1 : -1) * fall * focus.w * (0.08 + 0.03 * (k % 3));
      const y = y0 + fall * fall * (h - y0) * 0.9;
      const spin = age * (0.6 + 0.2 * (k % 3)) * (k % 2 ? 1 : -1);
      const len = (12 + (k % 4) * 4) * s;
      ctx.strokeStyle = 'rgba(230,170,120,0.85)';
      ctx.lineWidth = 3.2 * s;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(spin) * len / 2, y - Math.sin(spin) * len / 2);
      ctx.lineTo(x + Math.cos(spin) * len / 2, y + Math.sin(spin) * len / 2);
      ctx.stroke();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, x + Math.cos(spin) * len / 2, y + Math.sin(spin) * len / 2, 5 * s, '255,200,220', 0.6);
      ctx.restore();
    }
    ctx.restore();
  }

  return {
    bloomStrength: 0.5,
    crownAt: [0, 0] as [number, number],
    // Under the surface, until the dawn after the release.
    darkAt: (_x: number, y: number) => y > waterY() && lastDawn < 0.5,
    effect(kind) {
      effects.push(kind);
    },
    resize(nw, nh, ndpr, nfocus) {
      w = nw; h = nh; dpr = ndpr; focus = nfocus;
    },
    draw(ctx, t, v) {
      tideT = t;
      const form = formOf(v.form);
      const reef = reefFor(form);
      const L = layout(v, form);
      // Dawn comes up over the three minutes after the release, then holds.
      const dawn = v.sinceBreach > 30 ? Math.min(1, (v.sinceBreach - 30) / 180) : 0;
      lastDawn = dawn;
      drawSky(ctx, t, v.moonPhase, v.greatMoon, dawn, v.blueMoon);
      drawFigures(ctx, t, v, dawn);
      drawMeteors(ctx, t, dawn, v.meteor);
      drawSea(ctx, t, v.moonPhase, dawn);
      drawSister(ctx, t, v.sister);
      // Her way lit, the sister reef spawns with you: a far pink plume rising from her seamount.
      if (v.sisterLit && v.sinceBreach >= 0) drawSisterSpawn(ctx, t, v.sinceBreach);
      drawChildren(ctx, v, t);
      drawMoonJellies(ctx, t);
      drawWaitingFish(ctx, t, v, this.crownAt);
      drawDolphins(ctx, t);
      drawBreaching(ctx, t);
      drawManOWar(ctx, t);
      drawFlyingFish(ctx, t);
      const sf: Surface = { focus, wy: waterY(), s: scale(), dpr, dawn };
      drawSailors(ctx, t, sf);
      drawPetrels(ctx, t, sf);
      drawBreathingTurtle(ctx, t, this.crownAt[0]);
      drawSeaSparkle(ctx, t, sf, this.crownAt[0]);
      if (v.sinceBreach >= 0) drawHatchlings(ctx, t, v.sinceBreach);
      if (v.sinceBreach >= 60) drawPelican(ctx, t);
      if (v.sinceBreach >= 0) drawGreenFlash(ctx, v.sinceBreach);
      if (v.thorn?.kind === 'gull') drawGull(ctx, this.crownAt[0], waterY(), v.thorn.u, v.thorn.side, t, scale());
      if (v.bands.includes('rain')) { drawLightning(ctx, t, v.calm); drawRain(ctx, t); drawMoonbow(ctx, t, v.moonPhase, lastDawn); }
      drawPool(ctx, L.cx, waterY(), v.works.pool, scale(), t);
      drawBeacon(ctx, L.cx + L.unit * 0.32, waterY(), v.works.beacon, scale() * 1.4, t);
      {
        // Ossel's sand in the shallows beside the crown: tap to hear it.
        const ox = L.cx - 170 * scale(), oy = waterY() + 120 * scale();
        drawOsselSand(ctx, ox, oy, scale() * 1.4, t, speaking(t));
        spot('ossel', ox, oy, 30 * scale());
      }
      // Sand cays the reef has raised: low pale islands breaking the surface beside it.
      for (let k = 0; k < v.cays; k++) {
        const side = k % 2 ? -1 : 1;
        const cx2 = L.cx + side * (190 + Math.floor(k / 2) * 110) * scale();
        const w2 = (60 + (k % 3) * 18) * scale(), h2 = (8 + (k % 2) * 4) * scale();
        // Moonlit sand by night, warm by dawn.
        ctx.fillStyle = dawn > 0.5 ? '#c9b48c' : '#5e5a66';
        ctx.beginPath();
        ctx.ellipse(cx2, waterY() + 2 * scale(), w2, h2, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = 'rgba(200,210,255,0.18)';
        ctx.fillRect(cx2 - w2 * 0.9, waterY() + 1 * scale(), w2 * 1.8, 1.5 * scale());
      }
      // The epilogue garden: children taking hold in the shallows either side of the crown.
      for (let k = 0; k < v.garden; k++) {
        const side = k % 2 ? 1 : -1;
        const gx = L.cx + side * (110 + Math.floor(k / 2) * 46 + (k % 3) * 8) * scale();
        const kind = GARDEN.kinds.find((x) => x.id === v.gardenKinds[k]);
        // The garden matures over the hours after the release: each child up to twice its first size.
        const grown = 1 + Math.min(1, Math.max(0, v.sinceBreach - 300 * k) / 7200);
        const gy = waterY() + (70 + (k % 4) * 14) * scale(), gs = scale() * (0.8 + (k % 3) * 0.15) * grown;
        // Each takes hold on a lump of old rubble from the reef's own flank.
        ctx.fillStyle = 'rgba(64,58,74,0.85)';
        ctx.beginPath();
        ctx.moveTo(gx - 14 * gs, gy + 1 * gs);
        ctx.quadraticCurveTo(gx - 12 * gs, gy - 5 * gs, gx - 3 * gs, gy - 4 * gs);
        ctx.quadraticCurveTo(gx + 6 * gs, gy - 6.5 * gs, gx + 13 * gs, gy - 1 * gs);
        ctx.quadraticCurveTo(gx + 15 * gs, gy + 4 * gs, gx + 6 * gs, gy + 5 * gs);
        ctx.quadraticCurveTo(gx - 6 * gs, gy + 6 * gs, gx - 14 * gs, gy + 1 * gs);
        ctx.fill();
        ctx.fillStyle = 'rgba(120,112,130,0.4)';
        ctx.beginPath();
        ctx.ellipse(gx - 2 * gs, gy - 3.6 * gs, 7 * gs, 1.4 * gs, -0.1, 0, Math.PI * 2);
        ctx.fill();
        drawColony(ctx, gx, gy - 3 * gs, gs, t,
          kind?.colours ?? { branch: '#b0607a', tip: '#e8a0b8', polyp: 'rgba(255,225,235,0.95)' }, seed + k * 131);
      }
      drawTop(ctx, v, reef.crown(L));
      reef.draw(ctx, L, v, t);
      drawRelics(ctx, reef, L, v.relics, t, v.moments['old-lamp'] === 'a');
      // Moonlight through the moving surface, on the stone below it.
      reef.drawCaustics(ctx, L, t, 0.55 * (1 - Math.abs(v.moonPhase - 0.5) * 2) * (1 - dawn) + 0.6 * dawn, dawn > 0.5 ? '255,235,200' : '200,215,255', waterY());
      drawCraft(ctx, v.craft, reef, L, t, 0.6);
      drawResidents(ctx, reef, L, v.residents, t, seed);
      this.crownAt = reef.crown(L);
      if (v.moments['king-tide']) drawWrack(ctx, L);
      if (v.stranded) drawStranded(ctx, L, v.stranded, t);
      if (v.raft) drawRaft(ctx, v.raft, t);
      drawSong(ctx, v.song, this.crownAt[0], this.crownAt[1], t, scale());
      reef.drawEffects(ctx, L, v, effects.live(t));
      drawWaves(ctx, t);
      if (squallAt(t) > 0) drawSquall(ctx, t, squallAt(t));
      if (v.swell) drawSwell(ctx, v.swell, this.crownAt);
      drawSparkle(ctx, t, dawn);
      if (v.bands.includes('air')) drawGlowSurf(ctx, t, this.crownAt);
      drawSpawn(ctx, t, v, L, reef);
      if (this.bloomStrength > 0) {
        // The glow pass fades with the dawn: over a bright sky it would blow the crown out to white.
        (bloom ??= createBloom()).apply(ctx, this.bloomStrength * (1 - 0.6 * dawn));
        drawMoonFace(ctx, v.moonPhase, v.greatMoon, dawn, v.blueMoon);
      }
      // After the glow pass, so the crown's light does not swallow its silhouette.
      drawBird(ctx, t, v, this.crownAt);
      fore.draw(ctx, focus, t, '6,24,44', 0.7);
    },
  };
}
