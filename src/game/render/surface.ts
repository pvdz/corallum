// Small life of the night surface over the Breach: a fleet of by-the-wind sailors, storm petrels
// pattering on the water, and sea sparkle lighting the wavelets blue. Drawn as functions of the
// scene clock; each reports itself to the journal and can be tapped.

import { mulberry32, range } from '../sim/rng.ts';
import { glow, speck } from './draw.ts';
import type { Focus } from './scene.ts';
import { sight, spot, startled } from './sightings.ts';

/** Where the surface is and how big things are, from the Breach scene. */
export type Surface = { focus: Focus; wy: number; s: number; dpr: number; dawn: number };

/**
 * By-the-wind sailors: every two minutes a fleet drifts across on the surface for most of a minute,
 * blue floats with slanted clear sails. Tapped, the fleet bobs and its sails flash in the light.
 */
export function drawSailors(ctx: CanvasRenderingContext2D, t: number, sf: Surface): void {
  const period = 120, pass = 70;
  const lap = Math.floor(t / period);
  const u = (t - lap * period) / pass;
  if (u < 0 || u > 1) return;
  sight('sailors');
  const { focus, wy, s } = sf;
  const r = mulberry32(lap * 7919 + 13);
  const dir = lap % 2 ? 1 : -1;
  const touch = startled('sailors', t);
  const bob = touch && touch.age < 2 ? Math.sin(touch.age * 9) * (1 - touch.age / 2) : 0;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const off = range(r, -0.08, 0.08), lag = range(r, 0, 0.12), size = range(r, 0.8, 1.2);
    const p = u * 1.2 - lag;
    const x = focus.x + focus.w * (dir > 0 ? -0.05 + p * 1.1 : 1.05 - p * 1.1) + off * focus.w * 0.3;
    const y = wy + Math.sin(t * 1.6 + i) * 1.5 * s + bob * 3 * s - 1 * s;
    if (i === 0) spot('sailors', x, y - 4 * s, 22 * s);
    const z = s * 2.8 * size;
    ctx.save();
    ctx.translate(x, y);
    // The fringe of short blue tentacles under the float's rim, hanging in the water.
    ctx.strokeStyle = 'rgba(60,110,220,0.7)';
    ctx.lineWidth = 0.35 * z;
    ctx.beginPath();
    for (let q = -4; q <= 4; q++) {
      const fx = q * 1.05 * z, sway = Math.sin(t * 2 + q + i) * 0.4 * z;
      ctx.moveTo(fx, 0.8 * z);
      ctx.lineTo(fx + sway, (1.9 + 0.3 * (q & 1)) * z);
    }
    ctx.stroke();
    // The float: a flat oval of deep blue, paler toward its middle where its growth rings lie.
    const fg = ctx.createRadialGradient(0, -0.3 * z, 0, 0, 0, 5 * z);
    fg.addColorStop(0, '#5a8fe8');
    fg.addColorStop(0.6, '#2858b8');
    fg.addColorStop(1, '#173c8a');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5 * z, 1.8 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(150,195,255,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, -0.25 * z, 3.4 * z, 1.05 * z, 0, 0, Math.PI * 2);
    ctx.ellipse(0, -0.35 * z, 1.9 * z, 0.55 * z, 0, 0, Math.PI * 2);
    ctx.fill('evenodd');
    // The sail: a stiff clear triangle set across the float at a slant (all of a fleet lean one way).
    // A thin clear membrane, its leading edge curved, catching the light only along its rim.
    ctx.fillStyle = `rgba(200,220,250,${0.22 + 0.3 * Math.max(0, bob)})`;
    ctx.strokeStyle = 'rgba(225,238,255,0.45)';
    ctx.lineWidth = 0.35 * z;
    ctx.beginPath();
    ctx.moveTo(-3.2 * z * dir, -0.6 * z);
    ctx.quadraticCurveTo(-1.6 * z * dir, -4.6 * z, 0.6 * z * dir, -5.2 * z);
    ctx.quadraticCurveTo(1.6 * z * dir, -2.6 * z, 3.2 * z * dir, -0.6 * z);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // The stiff ridge across the sail that holds it up.
    ctx.strokeStyle = 'rgba(225,238,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -0.8 * z);
    ctx.quadraticCurveTo(0.2 * z * dir, -3 * z, 0.6 * z * dir, -5 * z);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Storm petrels: a pair every minute, fluttering along just above the water with their feet
 * pattering on it. Tapped, they lift off and away.
 */
export function drawPetrels(ctx: CanvasRenderingContext2D, t: number, sf: Surface): void {
  const period = 60, pass = 16;
  const lap = Math.floor(t / period);
  const u = (t - lap * period) / pass;
  if (u < 0 || u > 1) return;
  sight('petrel');
  const { focus, wy, s } = sf;
  const dir = lap % 2 ? -1 : 1;
  const touch = startled('petrel', t);
  const lift = touch && t - touch.age >= lap * period ? touch.age : 0;
  for (let k = 0; k < 2; k++) {
    const uk = u - k * 0.06;
    if (uk < 0) continue;
    const x = focus.x + focus.w * (dir > 0 ? 0.1 + uk * 0.8 : 0.9 - uk * 0.8) + lift * dir * 30 * s;
    const hover = 14 * s + Math.abs(Math.sin(t * 2.3 + k)) * 5 * s;
    const y = wy - hover - lift * lift * 18 * s;
    if (k === 0) spot('petrel', x, y, 20 * s);
    const z = s * 2.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    // Wings: dark, long and pointed, beating fast (the far one a shade darker, behind).
    const wing = (shade: string, lag: number, reach: number) => {
      const f = Math.sin(t * 22 + k * 2 - lag);
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.moveTo(1 * z, -0.4 * z);
      ctx.quadraticCurveTo(0.5 * z, -4 * z * f - 0.5 * z, -2.5 * z * reach, -7 * z * f * reach - 0.6 * z);
      ctx.quadraticCurveTo(-2.4 * z, -2.6 * z * f, -1.8 * z, 0.2 * z);
      ctx.closePath();
      ctx.fill();
    };
    wing('#12141a', 0.4, 0.8);
    // Body, head with a short hooked bill, a forked tail, and the white rump patch.
    ctx.fillStyle = '#20222c';
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.6 * z, 1.4 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3.4 * z, -0.6 * z, 1.2 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4.4 * z, -0.9 * z);
    ctx.lineTo(5.6 * z, -0.4 * z);
    ctx.lineTo(4.4 * z, -0.1 * z);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-3 * z, -0.6 * z);
    ctx.lineTo(-5.6 * z, -1.3 * z);
    ctx.lineTo(-4.6 * z, 0);
    ctx.lineTo(-5.6 * z, 1 * z);
    ctx.lineTo(-3 * z, 0.6 * z);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8ecf2';
    ctx.beginPath();
    ctx.ellipse(-2.6 * z, -0.3 * z, 0.9 * z, 0.7 * z, 0, 0, Math.PI * 2);
    ctx.fill();
    wing('#262934', 0, 1);
    // Legs dangling to the water, feet pattering (little rings where they touch).
    if (!lift) {
      ctx.strokeStyle = '#20222c';
      ctx.lineWidth = 0.5 * z;
      ctx.beginPath();
      ctx.moveTo(0, 1 * z);
      ctx.lineTo(0.5 * z, hover);
      ctx.stroke();
    }
    ctx.restore();
    if (!lift && Math.sin(t * 11 + k) > 0.6) {
      ctx.strokeStyle = 'rgba(200,220,255,0.5)';
      ctx.lineWidth = 0.6 * sf.dpr;
      ctx.beginPath();
      ctx.ellipse(x + 0.5 * z * dir, wy, 3 * z, 0.8 * z, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/**
 * Sea sparkle: at night the wavelets near the reef light blue where they break, in a patch that
 * drifts along; touched, the whole patch flares out in a ring from the touch.
 */
export function drawSeaSparkle(ctx: CanvasRenderingContext2D, t: number, sf: Surface, crownX: number): void {
  if (sf.dawn > 0.5) return;
  const { focus, wy, s, dpr } = sf;
  const fade = 1 - sf.dawn * 2;
  const cx = crownX + Math.sin(t * 0.05) * focus.w * 0.25;
  sight('sea-sparkle');
  spot('sea-sparkle', cx, wy + 4 * s, 40 * s);
  const touch = startled('sea-sparkle', t);
  const flare = touch && touch.age < 3 ? 1 - touch.age / 3 : 0;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const r = mulberry32(i * 2654435761);
    const dx = range(r, -1, 1) * focus.w * 0.18, dy = range(r, 0, 1) * 10 * s;
    // Each spark lights as a wavelet passes over it, then dims.
    const ph = (t * range(r, 0.6, 1.2) + range(r, 0, 10)) % 3;
    let a = ph < 0.4 ? Math.sin((ph / 0.4) * Math.PI) : 0;
    const x = cx + dx + Math.sin(t + i) * 2 * s, y = wy + 1.5 * s + dy;
    if (flare > 0 && touch) {
      // The flare runs outward from the touch.
      const d = Math.hypot(x - touch.x, y - touch.y) / (focus.w * 0.3);
      const front = (1 - flare) * 1.4;
      a = Math.max(a, Math.max(0, 1 - Math.abs(d - front) * 4) * flare);
    }
    if (a <= 0.02) continue;
    glow(ctx, x, y, 9 * s, '90,190,255', 0.7 * a * fade);
    ctx.fillStyle = `rgba(190,235,255,${0.8 * a * fade})`;
    speck(ctx, x - dpr, y - dpr, 2 * dpr);
  }
  ctx.restore();
}
