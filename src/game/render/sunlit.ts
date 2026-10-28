// The Sunlit Crown (Act IV): turquoise water under a moving ceiling of light, caustics on the
// sand, young reefs of every shape, bright reef fish, drifting larvae. The reef's own shape
// follows its Form dialect: a fan until it chooses, then antlers, a dome, or stacked tables.

import type { DialectId } from '../content/act4.ts';
import { mulberry32, range } from '../sim/rng.ts';
import { createBloom, type Bloom } from './bloom.ts';
import type { CoralForm } from './coral.ts';
import { glow } from './draw.ts';
import { createReef, type Reef, type ReefLayout } from './reef.ts';
import { createEffects, type Focus, type ReefView, type Scene } from './scene.ts';
import { createShoals } from './shoals.ts';

const FROM = 3800;
const TO = 3980;

type Fish = { lane: number; speed: number; phase: number; size: number; hue: number; stripe: boolean };
type Clump = { u: number; size: number; kind: number; hue: number };
type Larva = { x: number; y: number; phase: number; speed: number };

/** Each form's reef, its girth and its stone colours (shadow, flesh, highlight). */
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
      polyp: FORM_LOOK[form].polyp, glowScale: 0, polypScale: 1.2,
    };
  }

  function build(): void {
    const lr = mulberry32(larvaSeed);
    larvae = Array.from({ length: Math.round((w * h) / (dpr * dpr) / 9000) }, () => ({
      x: lr(), y: lr(), phase: lr() * 6, speed: range(lr, 0.004, 0.012),
    }));
  }

  function drawWater(ctx: CanvasRenderingContext2D, t: number, p: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, `rgb(${120 + p * 60},${220 + p * 20},${235 + p * 15})`);
    g.addColorStop(0.35, '#2aa7c4');
    g.addColorStop(0.8, '#0f6c93');
    g.addColorStop(1, '#0a4f70');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // The surface: a bright rippling band with the sun's glare in it.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sx = cx() + focus.w * 0.18;
    glow(ctx, sx, -h * 0.02, h * 0.45, '255,250,220', 0.35 + 0.1 * p);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2 * dpr;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 12 * dpr) {
        const y = h * (0.02 + k * 0.025) + Math.sin(x / (40 * dpr) + t * (1 + k * 0.3) + k) * 4 * dpr;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // Sun shafts.
    for (let i = 0; i < 6; i++) {
      const bx = sx + focus.w * ((i - 3) * 0.12) + Math.sin(t * 0.08 + i * 2.1) * focus.w * 0.03;
      const spread = focus.w * (0.02 + 0.015 * Math.sin(t * 0.13 + i));
      const lg = ctx.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, `rgba(255,255,230,${0.10 + 0.05 * Math.sin(t * 0.3 + i)})`);
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
    const s = scale();
    for (const f of fish) {
      const u = (((f.phase + t * f.speed) % 1) + 1) % 1;
      const x = focus.x - focus.w * 0.15 + u * focus.w * 1.3;
      const y = focus.y + focus.h * (0.25 + f.lane * 0.55) + Math.sin(t * 0.8 + f.phase * 10) * 10 * s;
      const dir = f.speed > 0 ? 1 : -1;
      const len = 12 * s * f.size;
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
      const L = layout(v, form);
      drawWater(ctx, t, p);
      drawLarvae(ctx, t);
      shoals.drawBack(ctx, focus, reef, L, v, t, '#5d7d96');
      drawFloor(ctx, t);
      drawClumps(ctx, t);
      reef.draw(ctx, L, v, t);
      this.crownAt = reef.crown(L);
      reef.drawEffects(ctx, L, v, effects.live(t));
      drawFish(ctx, t);
      shoals.drawFront(ctx, focus, reef, L, v, t, '#5d7d96');
      if (this.bloomStrength > 0) (bloom ??= createBloom()).apply(ctx, this.bloomStrength);
    },
  };
}
