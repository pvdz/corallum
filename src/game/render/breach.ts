// The Breach (Act V): the surface at night. Stars, the moon in its real phase with a glitter
// path on the waves, the reef's crown breaking the water. Spawn bundles swell on the polyps;
// at the release they rise in their millions through the moonlight and spread on the surface.

import { drawResidents } from './residents.ts';
import { palette } from '../content/palettes.ts';
import { drawRelics } from './relics.ts';
import { sight, spot, startled } from './sightings.ts';
import type { DialectId } from '../content/act4.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import type { CoralForm } from './coral.ts';
import { drawMoon, glow } from './draw.ts';
import { createLayerCache } from './layer.ts';
import { drawCraft, FLUORESCENT_POLYP } from './craft.ts';
import { createReef, type Reef, type ReefLayout } from './reef.ts';
import { createEffects, type Focus, type ReefView, type Scene } from './scene.ts';

const FROM = 3980;
const TO = 4000;

const NIGHT_LOOK: Record<CoralForm, { girth: number; palette: [string, string, string]; polyp: [string, string] }> = {
  fan: { girth: 1, palette: ['#1a0f22', '#7a3c58', 'rgba(255,210,230,0.25)'], polyp: ['#ffb3c9', 'rgba(255,220,235,0.9)'] },
  branching: { girth: 0.9, palette: ['#21180f', '#8a6238', 'rgba(255,230,200,0.25)'], polyp: ['#ffb3c9', 'rgba(255,230,200,0.9)'] },
  massive: { girth: 3.2, palette: ['#0f140c', '#3a4a2a', 'rgba(230,255,200,0.1)'], polyp: ['#ffb3c9', 'rgba(255,230,160,0.9)'] },
  plating: { girth: 1.6, palette: ['#1d1430', '#634890', 'rgba(230,215,255,0.25)'], polyp: ['#ffb3c9', 'rgba(200,255,240,0.9)'] },
};

function formOf(id: DialectId | ''): CoralForm {
  return id === 'branching' || id === 'massive' || id === 'plating' ? id : 'fan';
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
    const unit = focus.h * 0.8;
    // The reef stands on the seamount, not on the water: it is placed against the still level.
    const crownY = stillY() + focus.h * (0.12 - 0.16 * progress(v.height));
    return {
      cx: cx(), baseY: crownY + unit, unit, s: scale(), dpr, top: 1, bandStep: 0,
      encrust: 1, encrustColours: [...palette(v.palette).night],
      palette: NIGHT_LOOK[form].palette, polyp: v.craft === 'fluorescent' ? FLUORESCENT_POLYP : (palette(v.palette).polyp as [string, string] | null) ?? NIGHT_LOOK[form].polyp,
      // The dome's many lit nodes add up: it glows at a lower scale so the night stays a night.
      glowScale: (form === 'massive' ? 0.3 : 0.6) * (v.craft === 'fluorescent' ? 1.5 : 1), polypScale: 1.1,
    };
  }

  function moonPos(): [number, number] {
    return [focus.x + focus.w * 0.72, focus.y + focus.h * 0.11];
  }

  function drawSky(ctx: CanvasRenderingContext2D, t: number, phase: number, great: boolean, dawn: number): void {
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
      galaxy.draw(ctx, w, h, 0, 1e9, `${w}x${h}x${wy}`, (c) => drawGalaxy(c, wy));
      ctx.restore();
    }
    for (const st of stars) {
      const a = (0.4 + 0.4 * Math.sin(t * 1.3 + st.tw)) * (1 - dawn);
      ctx.fillStyle = `rgba(230,235,255,${a})`;
      ctx.fillRect(st.x * w, st.y * wy * 0.95, st.r * dpr, st.r * dpr);
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
    drawMoonFace(ctx, phase, great, dawn);
  }

  /** The moon's disc itself; drawn again after the glow pass, which would wash out its seas. */
  function drawMoonFace(ctx: CanvasRenderingContext2D, phase: number, great: boolean, dawn: number): void {
    const [mx, my] = moonPos();
    ctx.save();
    ctx.globalAlpha = 1 - 0.65 * dawn;
    drawMoon(ctx, mx, my, 26 * scale() * (great ? 1.3 : 1), phase);
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
    // Glitter path.
    for (let i = 0; i < 60; i++) {
      const yy = wy + (i / 60) * focus.h * 0.25;
      const spread = 8 * dpr + (i / 60) * focus.w * 0.12;
      const xx = mx + Math.sin(t * 2.1 + i * 1.7) * spread;
      const a = (0.5 - i / 150) * (0.3 + 0.7 * lit) * (0.5 + 0.5 * Math.sin(t * 3 + i));
      ctx.fillStyle = `rgba(250,248,225,${Math.max(0, a)})`;
      ctx.fillRect(xx, yy, (10 + i * 0.5) * dpr, 1.4 * dpr);
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

  function drawWaves(ctx: CanvasRenderingContext2D, t: number): void {
    const wy = waterY();
    ctx.strokeStyle = 'rgba(200,225,255,0.35)';
    ctx.lineWidth = 1.5 * dpr;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8 * dpr) {
        const y = wy + k * 5 * dpr + Math.sin(x / (35 * dpr) + t * (1.2 + k * 0.4) + k) * 3 * dpr;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /** Spawn: ripening dots on the reef before; a rising, spreading column after the release. */
  function drawSpawn(ctx: CanvasRenderingContext2D, t: number, v: ReefView, L: ReefLayout, reef: Reef): void {
    const s = scale();
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
        const x = x0 + b.drift * u * u * focus.w * 0.12 + Math.sin(t * 1.5 + b.delay) * 5 * s * u + wobble;
        const y = y0 - u * (y0 - wy);
        const a = Math.min(1, u * 8) * (1 - u * 0.6);
        const size = b.size * (brooding ? 1.9 : 1);
        glow(ctx, x, y, 13 * s * size, brooding ? '255,175,150' : '255,150,200', 0.85 * a);
        glow(ctx, x, y, 2.5 * s * size, '255,235,245', 0.9 * a);
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
   * The sister reef on the next seamount: far off on the horizon once it nears the surface, a
   * small dark crown rising out of the haze, breaking the water when it arrives, lights on its tips.
   */
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
      ctx.fillStyle = `hsl(${hues[k % hues.length]},55%,46%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, len, len * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-len * 0.8, 0);
      ctx.lineTo(-len * 1.4, -len * 0.45);
      ctx.lineTo(-len * 1.4, len * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(len * 0.5, -len * 0.12, len * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (v.bands.includes('waiting-fish')) sight('reef-fish');
  }

  /** Moon jellies drifting under the surface: translucent saucers with four pale rings, pulsing. */
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
      // Four pale rings seen through the bell.
      ctx.strokeStyle = 'rgba(255,200,230,0.45)';
      for (const dx of [-0.45, -0.15, 0.15, 0.45]) {
        ctx.beginPath();
        ctx.arc(dx * r * pulse, -r * 0.15, r * 0.12, 0, Math.PI * 2);
        ctx.stroke();
      }
      // A fringe of short tentacles.
      ctx.strokeStyle = 'rgba(210,225,255,0.25)';
      for (let q = -4; q <= 4; q++) {
        ctx.beginPath();
        ctx.moveTo(q * r * 0.22 * pulse, 0);
        ctx.lineTo(q * r * 0.22 * pulse + Math.sin(t + q) * 2 * s, r * 0.5);
        ctx.stroke();
      }
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
      ctx.beginPath();
      ctx.moveTo(18 * s, 0);
      ctx.quadraticCurveTo(10 * s, -6 * s, -10 * s, -3 * s);
      ctx.lineTo(-16 * s, -7 * s);
      ctx.lineTo(-14 * s, 0);
      ctx.lineTo(-16 * s, 6 * s);
      ctx.lineTo(-10 * s, 2 * s);
      ctx.quadraticCurveTo(8 * s, 5 * s, 18 * s, 0);
      ctx.fill();
      // Dorsal fin and beak.
      ctx.beginPath();
      ctx.moveTo(2 * s, -4.5 * s);
      ctx.lineTo(-3 * s, -10 * s);
      ctx.lineTo(-5 * s, -3.5 * s);
      ctx.fill();
      // Moonlight along the back.
      ctx.strokeStyle = 'rgba(220,225,255,0.35)';
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(14 * s, -2 * s);
      ctx.quadraticCurveTo(6 * s, -5.5 * s, -8 * s, -3.2 * s);
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
      // Wings beating as it climbs away.
      const flap = Math.sin(t * 9);
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(-12 * s, -flap * 7 * s);
      ctx.quadraticCurveTo(-5 * s, -3 * s, 0, 0);
      ctx.quadraticCurveTo(5 * s, -3 * s, 12 * s, -flap * 7 * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0.5 * s, 4 * s, 1.8 * s, 0, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.strokeStyle = 'rgba(255,190,215,0.8)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.4 * size;
      for (let b = 0; b < 4; b++) {
        const a = -Math.PI / 2 + (b - 1.5) * 0.45;
        const len = (6 + (b % 2) * 3) * size * born;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
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
      drawSky(ctx, t, v.moonPhase, v.greatMoon, dawn);
      drawSea(ctx, t, v.moonPhase, dawn);
      drawSister(ctx, t, v.sister);
      drawChildren(ctx, v, t);
      drawMoonJellies(ctx, t);
      drawWaitingFish(ctx, t, v, this.crownAt);
      drawDolphins(ctx, t);
      drawTop(ctx, v, reef.crown(L));
      reef.draw(ctx, L, v, t);
      drawRelics(ctx, reef, L, v.relics, t);
      // Moonlight through the moving surface, on the stone below it.
      reef.drawCaustics(ctx, L, t, 0.55 * (1 - Math.abs(v.moonPhase - 0.5) * 2) * (1 - dawn) + 0.6 * dawn, dawn > 0.5 ? '255,235,200' : '200,215,255', waterY());
      drawCraft(ctx, v.craft, reef, L, t, 0.6);
      drawResidents(ctx, reef, L, v.residents, t, seed);
      this.crownAt = reef.crown(L);
      reef.drawEffects(ctx, L, v, effects.live(t));
      drawWaves(ctx, t);
      if (v.bands.includes('air')) drawGlowSurf(ctx, t, this.crownAt);
      drawSpawn(ctx, t, v, L, reef);
      if (this.bloomStrength > 0) {
        (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
        drawMoonFace(ctx, v.moonPhase, v.greatMoon, dawn);
      }
      // After the glow pass, so the crown's light does not swallow its silhouette.
      drawBird(ctx, t, v, this.crownAt);
    },
  };
}
