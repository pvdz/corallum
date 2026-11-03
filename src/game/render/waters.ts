// The water's moods made visible: a light overlay over any scene, fading in after the water
// turns and out before it turns again. Rich water lifts golden motes, lamp water sparks blue,
// carrying water spreads slow rings of sound, a gritty tide streaks sand across, clear water
// glints, warm water shimmers. Still and slack water show nothing.

import type { WaterId } from '../content/waters.ts';
import { glow } from './draw.ts';
import type { Focus } from './scene.ts';

const FADE = 20;

/** `since`/`left`: sim seconds since the water turned and until it turns again. */
export function drawWater(ctx: CanvasRenderingContext2D, id: WaterId, F: Focus, t: number, since: number, left: number,
  dpr: number, light: boolean): void {
  const a = Math.min(1, since / FADE, left / FADE);
  if (a <= 0 || id === 'still' || id === 'slack') return;
  const s = dpr;
  ctx.save();
  ctx.beginPath();
  ctx.rect(F.x, F.y, F.w, F.h);
  ctx.clip();
  if (id === 'rich' || id === 'lamp' || id === 'clear') {
    ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
    const rgb = id === 'rich' ? '240,200,110' : id === 'lamp' ? '120,190,255' : '255,255,255';
    const n = id === 'rich' ? 70 : 40;
    for (let i = 0; i < n; i++) {
      const px = (i * 0.618034) % 1, ph = (i * 0.37) % 1;
      // Rich water rises from below; lamp and clear water hang and twinkle.
      const rise = id === 'rich' ? ((t * 0.018 + ph) % 1) : ph;
      const x = F.x + (px + Math.sin(t * 0.2 + i) * 0.01) * F.w;
      const y = F.y + F.h * (1 - rise);
      const tw = id === 'rich' ? Math.sin(rise * Math.PI) : Math.max(0, Math.sin(t * (0.6 + (i % 5) * 0.2) + i * 1.7)) ** 6;
      glow(ctx, x, y, (id === 'rich' ? 7 : 8) * s, rgb, a * tw * (light ? 0.6 : 0.85));
    }
  } else if (id === 'carrying') {
    // Sound carrying: wide faint rings from far points, one after another.
    ctx.lineWidth = 1.2 * s;
    for (let k = 0; k < 3; k++) {
      const u = ((t * 0.07 + k / 3) % 1);
      const cx = F.x + F.w * (0.2 + 0.6 * ((k * 0.41 + Math.floor(t * 0.07 + k / 3) * 0.29) % 1));
      const cy = F.y + F.h * 0.45;
      ctx.strokeStyle = `rgba(200,180,255,${0.22 * a * (1 - u)})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, u * F.w * 0.45, u * F.w * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (id === 'gritty') {
    // Fine sand carried sideways in streaks: each a trail of grains, faint at its tail and
    // densest at its head, riding a slow wave. Three paths (tail, middle, head) for all of them.
    const rgb = light ? '236,222,186' : '240,220,180';
    const parts = [new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < 90; i++) {
      // Stirred up from the floor: thickest low down, thinning toward the surface.
      const y = F.y + F.h * (0.2 + 0.8 * Math.sqrt((i * 0.618034) % 1));
      const x = F.x + ((t * (0.06 + (i % 7) * 0.01) + i * 0.13) % 1.2 - 0.1) * F.w;
      const len = (18 + (i % 4) * 10) * s;
      const wave = (q: number) => y + Math.sin(t * 0.8 + i + q * 2.2) * 2.2 * s;
      for (let k = 0; k < 3; k++) {
        const q0 = k / 3, q1 = (k + 1) / 3;
        parts[k]!.moveTo(x + len * q0, wave(q0));
        parts[k]!.quadraticCurveTo(x + len * (q0 + q1) / 2, wave((q0 + q1) / 2), x + len * q1, wave(q1));
      }
    }
    ctx.lineCap = 'round';
    [0.1, 0.2, 0.34].forEach((k, j) => {
      ctx.strokeStyle = `rgba(${rgb},${(k * a * (light ? 1.3 : 1)).toFixed(3)})`;
      ctx.lineWidth = (0.8 + 0.25 * j) * s;
      ctx.stroke(parts[j]!);
    });
  } else if (id === 'warm') {
    // Heat shimmer: slow wavering bands.
    ctx.strokeStyle = `rgba(255,200,160,${0.12 * a})`;
    ctx.lineWidth = 2 * s;
    for (let k = 0; k < 9; k++) {
      const y0 = F.y + F.h * (0.1 + k * 0.1);
      ctx.beginPath();
      for (let q = 0; q <= 24; q++) {
        const x = F.x + (q / 24) * F.w;
        const y = y0 + Math.sin(q * 0.9 + t * 1.3 + k) * 4 * s;
        if (q === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
