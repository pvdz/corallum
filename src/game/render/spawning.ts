// The other reefs' spawning under the full moon (the Silt Floor to the Sunlit Crown): slow pink and
// peach bundles rising from the far reefs below, wobbling as they go. A pure function of the clock.

import { glow } from './draw.ts';
import type { Focus } from './scene.ts';

/**
 * `strength` 0..1 follows the full moon (it swells in and out); `dark` is how deep the water is
 * (0 in the light, 1 on the floor), where the bundles catch the reef's glow faintly.
 */
export function drawOthersSpawn(ctx: CanvasRenderingContext2D, focus: Focus, t: number, strength: number, dark: number, dpr: number): void {
  if (strength <= 0) return;
  const s = Math.min(focus.w, focus.h) / 700;
  const n = Math.round(150 * strength);
  ctx.save();
  for (let i = 0; i < n; i++) {
    // Each bundle its own rate and lane; it rises the whole height in 40 to 70 seconds.
    const rate = 1 / (40 + ((i * 37) % 31));
    const u = (t * rate + i * 0.618) % 1;
    const lane = (i * 0.754877) % 1;
    const x = focus.x + focus.w * lane + Math.sin(t * 0.4 + i * 1.3) * 14 * s;
    const y = focus.y + focus.h * (1.05 - u * 1.15);
    const a = Math.min(1, u * 6, (1 - u) * 4) * strength;
    const r = (2.2 + (i % 3) * 0.9) * s;
    const rgb = i % 4 === 0 ? '255,214,170' : i % 4 === 1 ? '255,200,215' : '255,150,180';
    if (dark > 0.3) glow(ctx, x, y, r * 4, rgb, 0.25 * a * dark);
    glow(ctx, x, y, r * 2.5, rgb, 0.18 * a);
    ctx.fillStyle = `rgba(${rgb},${(0.85 * a).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(r, 0.8 * dpr), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
