// A near foreground for depth: dark, out-of-focus silhouettes in the bottom corners (a sea fan on
// one side, blades of weed on the other), swaying slowly. Painted at quarter resolution and
// stretched, which blurs them like something too close to the eye.

import { mulberry32 } from '../sim/rng.ts';
import { createLayerCache } from './layer.ts';
import type { Focus } from './scene.ts';

export function createForeground(seed: number) {
  const cache = createLayerCache(0.25);
  const r = mulberry32(seed ^ 0xf0e6);
  // A sea fan: branches forking out from a short stem, fixed once per scene.
  type Seg = { x0: number; y0: number; x1: number; y1: number; w: number };
  const fan: Seg[] = [];
  const grow = (x: number, y: number, a: number, len: number, w: number, depth: number) => {
    const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len;
    fan.push({ x0: x, y0: y, x1, y1, w });
    if (depth === 0) return;
    for (const d of [-0.42, 0.38]) grow(x1, y1, a + d + (r() - 0.5) * 0.3, len * (0.72 + r() * 0.12), w * 0.7, depth - 1);
  };
  grow(0, 0, -Math.PI / 2 + 0.35, 0.11, 0.016, 6);
  const blades = Array.from({ length: 6 }, (_, i) => ({ x: i * 0.018 + r() * 0.01, h: 0.22 + r() * 0.16, ph: r() * 6 }));

  function paint(c: CanvasRenderingContext2D, focus: Focus, t: number, rgb: string, lights: string): void {
    const u = Math.min(focus.w, focus.h * 1.2);
    c.fillStyle = c.strokeStyle = `rgb(${rgb})`;
    c.lineCap = 'round';
    // The fan, bottom-left, leaning in and rocking a little.
    const fx = focus.x + focus.w * 0.02, fy = focus.y + focus.h * 1.02;
    const sway = Math.sin(t * 0.35) * 0.04;
    c.save();
    c.translate(fx, fy);
    c.rotate(sway);
    for (const sg of fan) {
      c.lineWidth = Math.max(1, sg.w * u);
      c.beginPath();
      c.moveTo(sg.x0 * u, sg.y0 * u);
      c.lineTo(sg.x1 * u, sg.y1 * u);
      c.stroke();
    }
    // In the dark, small lights live on it: blurred by the low resolution into soft discs.
    if (lights) {
      fan.forEach((sg, i) => {
        if (i % 3) return;
        const a = 0.4 + 0.6 * Math.max(0, Math.sin(t * 0.9 + i * 1.7));
        c.fillStyle = `rgba(${lights},${a})`;
        c.beginPath();
        c.arc(sg.x1 * u, sg.y1 * u, 0.006 * u, 0, Math.PI * 2);
        c.fill();
      });
      c.fillStyle = `rgb(${rgb})`;
    }
    c.restore();
    // Blades of weed, bottom-right, bending with the swell.
    const bx = focus.x + focus.w * 0.9;
    for (const b of blades) {
      const x0 = bx + b.x * u, y0 = focus.y + focus.h * 1.02, len = b.h * u;
      const bend = Math.sin(t * 0.5 + b.ph) * 0.25 * len;
      c.beginPath();
      c.moveTo(x0 - 0.01 * u, y0);
      c.quadraticCurveTo(x0 + bend * 0.4, y0 - len * 0.6, x0 + bend, y0 - len);
      c.quadraticCurveTo(x0 + bend * 0.4 + 0.012 * u, y0 - len * 0.6, x0 + 0.01 * u, y0);
      c.fill();
    }
  }

  return {
    /** `lights`: an rgb for small lights on the fan (in the dark zones), or ''. */
    draw(ctx: CanvasRenderingContext2D, focus: Focus, t: number, rgb: string, alpha: number, lights = ''): void {
      const { width: w, height: h } = ctx.canvas;
      ctx.save();
      ctx.globalAlpha = alpha;
      cache.draw(ctx, w, h, t, 0.1, `${focus.x},${focus.y},${focus.w},${focus.h},${rgb},${lights}`, (c, tq) => paint(c, focus, tq, rgb, lights));
      ctx.restore();
    },
  };
}
