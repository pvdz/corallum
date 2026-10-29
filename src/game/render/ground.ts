// The floor in front of the reef: a plane of silt seen at a low angle, from the surface line down
// to the bottom of the frame. Ripples, pebbles, shell bits, burrows with their spoil mounds and the
// wandering tracks of sea cucumbers. Static, so it is painted once per size into a cropped canvas.

import { mulberry32, range } from '../sim/rng.ts';

export type GroundStyle = {
  /** Light marks (ripple crests, pebble tops, shells): an "r,g,b" triple. */
  light: string;
  /** Dark marks (ripple troughs, burrows, shadows). */
  dark: string;
  /** Overall strength of the marks, 0..1 (deep water shows them faintly). */
  alpha: number;
  /** Sea-cucumber tracks (the abyss), or none. */
  tracks: boolean;
};

export function createGround(seed: number) {
  let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  let key = '';
  let top = 0;
  return {
    /**
     * Draw the floor detail below `surf(x)` (device pixels) across [0, w], down to `h` (the bottom
     * of the framed scene: what lies under a bottom panel is not worth detail).
     * `s` is the scene's scale (1 at a 700 px focus), `key` repaints when it changes.
     */
    draw(ctx: CanvasRenderingContext2D, w: number, h: number, s: number, surf: (x: number) => number,
      style: GroundStyle, k: string): void {
      if (k !== key || !canvas) {
        let minY = h;
        for (let x = 0; x <= w; x += 8) minY = Math.min(minY, surf(x));
        top = Math.max(0, Math.floor(minY) - 4);
        const ch = Math.max(1, Math.ceil(h - top));
        canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.ceil(w), ch) : document.createElement('canvas');
        canvas.width = Math.ceil(w);
        canvas.height = ch;
        const c = canvas.getContext('2d') as CanvasRenderingContext2D;
        c.translate(0, -top);
        paint(c, w, h, s, surf, style, seed);
        key = k;
      }
      ctx.drawImage(canvas, 0, top);
    },
  };
}

function paint(c: CanvasRenderingContext2D, w: number, h: number, s: number, surf: (x: number) => number,
  st: GroundStyle, seed: number): void {
  const r = mulberry32(seed);
  // Depth d in 0..1 runs from the surface line (far) to the frame's bottom edge (near).
  const at = (x: number, d: number) => {
    const y0 = surf(x);
    return y0 + Math.max(0, h - y0) * d ** 1.5;
  };
  // Stay inside the floor.
  c.save();
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 6) c.lineTo(x, surf(x));
  c.lineTo(w, surf(w));
  c.lineTo(w, h);
  c.closePath();
  c.clip();
  const A = st.alpha;
  // Ripples: long low crests across the slope, closer together toward the horizon.
  c.lineCap = 'round';
  const rows = 26;
  for (let i = 1; i < rows; i++) {
    const d = i / rows + range(r, -0.012, 0.012);
    const ph = r() * 10, amp = (1 + 3 * d) * s;
    const x0 = range(r, -0.1, 0.5) * w, x1 = x0 + range(r, 0.25, 0.8) * w;
    for (const [col, dy, a] of [[st.dark, 1.2 * (1 + 2 * d) * s, 0.35], [st.light, 0, 0.22]] as const) {
      c.strokeStyle = `rgba(${col},${A * a * (0.4 + 0.6 * d)})`;
      c.lineWidth = (0.6 + 1.6 * d) * s;
      c.beginPath();
      for (let x = x0; x <= x1; x += 10) {
        const y = at(x, d) + Math.sin(x / (40 * s) + ph) * amp + dy;
        if (x === x0) c.moveTo(x, y);
        else c.lineTo(x, y);
      }
      c.stroke();
    }
  }
  // Sea-cucumber tracks: a slow looping path pressed into the silt, two rows of dimples.
  if (st.tracks) {
    for (let k = 0; k < 2; k++) {
      let x = range(r, 0.05, 0.95) * w, d = range(r, 0.15, 0.5), dir = r() * Math.PI * 2;
      for (let i = 0; i < 140; i++) {
        dir += range(r, -0.25, 0.25);
        const step = (3 + 6 * d) * s;
        x += Math.cos(dir) * step;
        d = Math.min(0.95, Math.max(0.05, d + Math.sin(dir) * 0.006));
        const y = at(x, d);
        const q = (0.8 + 2 * d) * s;
        c.fillStyle = `rgba(${st.dark},${A * 0.4})`;
        c.beginPath();
        c.ellipse(x, y - q, q * 1.2, q * 0.45, 0, 0, Math.PI * 2);
        c.ellipse(x, y + q, q * 1.2, q * 0.45, 0, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  // Burrows: a dark mouth beside a little cone of thrown-up silt.
  for (let i = 0; i < 9; i++) {
    const x = r() * w, d = range(r, 0.1, 0.9), y = at(x, d), q = (1.5 + 4 * d) * s;
    c.fillStyle = `rgba(${st.light},${A * 0.18})`;
    c.beginPath();
    c.ellipse(x + q * 2.2, y - q * 0.3, q * 2.2, q * 0.9, 0, Math.PI, 0);
    c.fill();
    c.fillStyle = `rgba(${st.dark},${A * 0.8})`;
    c.beginPath();
    c.ellipse(x, y, q, q * 0.4, 0, 0, Math.PI * 2);
    c.fill();
  }
  // Pebbles and dropstones: shadow, body, a lit top. Bigger and fewer up close.
  for (let i = 0; i < 70; i++) {
    const x = r() * w, d = r() ** 0.7, y = at(x, d);
    const q = (0.6 + 3.2 * d) * s * range(r, 0.6, 1.5);
    c.fillStyle = `rgba(${st.dark},${A * 0.55})`;
    c.beginPath();
    c.ellipse(x + q * 0.4, y + q * 0.25, q * 1.25, q * 0.45, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = `rgba(${st.light},${A * 0.28})`;
    c.beginPath();
    c.ellipse(x, y, q, q * 0.6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = `rgba(${st.light},${A * 0.35})`;
    c.beginPath();
    c.ellipse(x - q * 0.2, y - q * 0.25, q * 0.5, q * 0.2, 0, 0, Math.PI * 2);
    c.fill();
  }
  // Shell bits and urchin tests: pale little arcs and rings.
  for (let i = 0; i < 26; i++) {
    const x = r() * w, d = range(r, 0.05, 0.95), y = at(x, d), q = (0.8 + 2.6 * d) * s;
    c.strokeStyle = `rgba(${st.light},${A * 0.45})`;
    c.lineWidth = (0.5 + 0.8 * d) * s;
    c.beginPath();
    if (i % 3) c.arc(x, y, q, Math.PI * (1 + r() * 0.3), Math.PI * (1.7 + r() * 0.3));
    else c.ellipse(x, y, q, q * 0.55, 0, 0, Math.PI * 2);
    c.stroke();
  }
  // Nearer floor is in deeper shadow: it is out of the reef's light.
  const g = c.createLinearGradient(0, Math.min(h, surf(w / 2)), 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${0.25})`);
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  c.restore();
}
