// The Breach (Act V): the surface at night. Stars, the moon in its real phase with a glitter
// path on the waves, the reef's crown breaking the water. Spawn bundles swell on the polyps;
// at the release they rise in their millions through the moonlight and spread on the surface.

import type { DialectId } from '../content/act4.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import type { CoralForm } from './coral.ts';
import { drawMoon, glow } from './draw.ts';
import { createReef, type Reef, type ReefLayout } from './reef.ts';
import { createEffects, type Focus, type ReefView, type Scene } from './scene.ts';

const FROM = 3980;
const TO = 4000;

const NIGHT_LOOK: Record<CoralForm, { girth: number; palette: [string, string, string]; polyp: [string, string] }> = {
  fan: { girth: 1, palette: ['#1a0f22', '#7a3c58', 'rgba(255,210,230,0.25)'], polyp: ['#ffb3c9', 'rgba(255,220,235,0.9)'] },
  branching: { girth: 0.9, palette: ['#21180f', '#8a6238', 'rgba(255,230,200,0.25)'], polyp: ['#ffb3c9', 'rgba(255,230,200,0.9)'] },
  massive: { girth: 3.2, palette: ['#171f14', '#5a7240', 'rgba(230,255,200,0.22)'], polyp: ['#ffb3c9', 'rgba(255,230,160,0.9)'] },
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
  const stars: Star[] = Array.from({ length: 160 }, () => ({ x: rng(), y: rng(), r: range(rng, 0.4, 1.4), tw: rng() * 10 }));
  const bundles: Bundle[] = Array.from({ length: 420 }, () => ({
    x: range(rng, -0.32, 0.32), delay: rng() * 14, speed: range(rng, 0.05, 0.11), drift: range(rng, -1, 1), size: range(rng, 0.6, 1.3),
  }));
  const far: Bundle[] = Array.from({ length: 120 }, () => ({
    x: rng(), delay: rng() * 20, speed: range(rng, 0.02, 0.05), drift: range(rng, -1, 1), size: range(rng, 0.3, 0.7),
  }));

  const scale = () => Math.min(focus.w, focus.h) / 700;
  const cx = () => focus.x + focus.w * 0.5;
  const waterY = () => focus.y + focus.h * 0.3;

  function progress(height: number): number {
    return Math.max(0, Math.min(1, (height - FROM) / (TO - FROM)));
  }

  function layout(v: ReefView, form: CoralForm): ReefLayout {
    // The crown rises from just under the surface to break it.
    const unit = focus.h * 0.8;
    const crownY = waterY() + focus.h * (0.12 - 0.16 * progress(v.height));
    return {
      cx: cx(), baseY: crownY + unit, unit, s: scale(), dpr, top: 1, bandStep: 0,
      palette: NIGHT_LOOK[form].palette, polyp: NIGHT_LOOK[form].polyp, glowScale: 0.6, polypScale: 1.1,
    };
  }

  function moonPos(): [number, number] {
    return [focus.x + focus.w * 0.72, focus.y + focus.h * 0.11];
  }

  function drawSky(ctx: CanvasRenderingContext2D, t: number, phase: number, great: boolean): void {
    const wy = waterY();
    const g = ctx.createLinearGradient(0, 0, 0, wy);
    g.addColorStop(0, '#05061a');
    g.addColorStop(1, '#1d2350');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, wy + 2);
    for (const st of stars) {
      const a = 0.4 + 0.4 * Math.sin(t * 1.3 + st.tw);
      ctx.fillStyle = `rgba(230,235,255,${a})`;
      ctx.fillRect(st.x * w, st.y * wy * 0.95, st.r * dpr, st.r * dpr);
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
    drawMoon(ctx, mx, my, r, phase);
  }

  function drawSea(ctx: CanvasRenderingContext2D, t: number, phase: number): void {
    const wy = waterY();
    const g = ctx.createLinearGradient(0, wy, 0, h);
    g.addColorStop(0, '#103a5a');
    g.addColorStop(0.4, '#08203a');
    g.addColorStop(1, '#030a18');
    ctx.fillStyle = g;
    ctx.fillRect(0, wy, w, h - wy);
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
      const n = Math.round(bundles.length * (0.12 + 0.88 * burst));
      const coral = reef.coral;
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
        const x = x0 + b.drift * u * u * focus.w * 0.12 + Math.sin(t * 1.5 + b.delay) * 5 * s * u;
        const y = y0 - u * (y0 - wy);
        const a = Math.min(1, u * 8) * (1 - u * 0.6);
        glow(ctx, x, y, 13 * s * b.size, '255,150,200', 0.85 * a);
        glow(ctx, x, y, 2.5 * s * b.size, '255,235,245', 0.9 * a);
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
  function drawBird(ctx: CanvasRenderingContext2D, t: number, v: ReefView, crown: readonly [number, number]): void {
    const s = scale() * 1.8;
    const [cx, cy] = crown;
    if (!v.bands.includes('air')) return;
    // The reef's top stands in the air at low tide: a low dark hump at the waterline, growing as
    // the reef climbs the last metres. The bird stands on it.
    const wy = waterY();
    const rise = Math.min(1, Math.max(0.3, (v.height - 3990) / 10));
    const hx = cx - 6 * s, hw = 22 * s, hh = 7 * s * rise;
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
    const flying = v.sinceBreach >= 0;
    const k = flying ? Math.min(1, v.sinceBreach / 12) : 0;
    if (k >= 1) return;
    const x = hx - hw * 0.35 - k * focus.w * 0.6;
    const y = wy - hh * 0.9 - 13 * s - k * k * focus.h * 0.35;
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

  return {
    bloomStrength: 0.5,
    crownAt: [0, 0] as [number, number],
    effect(kind) {
      effects.push(kind);
    },
    resize(nw, nh, ndpr, nfocus) {
      w = nw; h = nh; dpr = ndpr; focus = nfocus;
    },
    draw(ctx, t, v) {
      const form = formOf(v.form);
      const reef = reefFor(form);
      const L = layout(v, form);
      drawSky(ctx, t, v.moonPhase, v.greatMoon);
      drawSea(ctx, t, v.moonPhase);
      reef.draw(ctx, L, v, t);
      this.crownAt = reef.crown(L);
      reef.drawEffects(ctx, L, v, effects.live(t));
      drawWaves(ctx, t);
      drawSpawn(ctx, t, v, L, reef);
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
      // After the glow pass, so the crown's light does not swallow its silhouette.
      drawBird(ctx, t, v, this.crownAt);
    },
  };
}
