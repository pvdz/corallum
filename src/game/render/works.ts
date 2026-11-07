// Great works in the world (content/works.ts), drawn by the zone that builds them: the lantern
// spire beside the reef in the Midnight Water, the breakwater's arc of stacked stone upslope on the
// Twilight Shelf, the sun terrace's steps at the reef's foot in the Sunlit Crown. Each grows by stage.

import { glow, softRing } from './draw.ts';
import type { Focus } from './scene.ts';

/** One stone in a laid course: where it sits (its base centre), its half-width and height, a seed for its shape. */
type Stone = { x: number; y: number; rx: number; ry: number; seed: number };

/**
 * Laid stones, all in one batch: each a rounded lump with a flatter base, dark round the batch's
 * outer edge, a paler cap where the light falls on top. A later batch sits in front of an earlier one.
 */
function drawStones(ctx: CanvasRenderingContext2D, list: readonly Stone[], body: string, cap: string, joint: string, s: number): void {
  if (!list.length) return;
  const outline = new Path2D(), caps = new Path2D();
  for (const st of list) {
    const N = 9, pts: number[] = [];
    for (let j = 0; j < N; j++) {
      const a = (j / N) * Math.PI * 2 + st.seed;
      const rr = 1 + 0.12 * Math.sin(2 * a + st.seed * 3.1) + 0.08 * Math.sin(3 * a + st.seed * 1.7);
      const sy = Math.sin(a);
      pts.push(st.x + Math.cos(a) * st.rx * rr, st.y - st.ry + sy * st.ry * rr * (sy > 0 ? 0.8 : 1));
    }
    outline.moveTo((pts[0]! + pts[2 * N - 2]!) / 2, (pts[1]! + pts[2 * N - 1]!) / 2);
    for (let j = 0; j < N; j++) {
      const n = (j + 1) % N;
      outline.quadraticCurveTo(pts[2 * j]!, pts[2 * j + 1]!, (pts[2 * j]! + pts[2 * n]!) / 2, (pts[2 * j + 1]! + pts[2 * n + 1]!) / 2);
    }
    const cx = st.x - st.rx * 0.18, cy = st.y - st.ry * 1.45;
    caps.moveTo(cx + st.rx * 0.55, cy);
    caps.ellipse(cx, cy, st.rx * 0.55, st.ry * 0.32, -0.12, 0, Math.PI * 2);
  }
  // The joint is stroked first and twice as wide, so the fill covers its inner half and no
  // outline shows through a stone in front.
  ctx.strokeStyle = joint;
  ctx.lineWidth = Math.max(2, 2.4 * s);
  ctx.stroke(outline);
  ctx.fillStyle = body;
  ctx.fill(outline);
  ctx.fillStyle = cap;
  ctx.fill(caps);
}

/** The vent garden: small chimneys either side of the vent, each smoking a little, one more ring a stage. */
export function drawGarden(ctx: CanvasRenderingContext2D, cx: number, stage: number, s: number, t: number, floor: (x: number) => number): void {
  if (stage <= 0) return;
  const n = [0, 1, 4, 8][stage]!;
  ctx.save();
  for (let k = 0; k < n; k++) {
    const side = k % 2 ? 1 : -1;
    const x = cx + side * (70 + Math.floor(k / 2) * 34 + (k % 3) * 6) * s;
    const y = floor(x) + 3 * s;
    const hgt = (26 + (k % 3) * 12) * s;
    const g = ctx.createLinearGradient(x - 8 * s, 0, x + 8 * s, 0);
    g.addColorStop(0, '#1d1622');
    g.addColorStop(0.5, '#4a3640');
    g.addColorStop(1, '#170f1a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y);
    ctx.quadraticCurveTo(x - 6 * s, y - hgt * 0.6, x - 3 * s, y - hgt);
    ctx.lineTo(x + 3 * s, y - hgt);
    ctx.quadraticCurveTo(x + 6 * s, y - hgt * 0.6, x + 8 * s, y);
    ctx.closePath();
    ctx.fill();
    // Mineral bands, rust and pale, where the warm water has laid them down.
    ctx.strokeStyle = 'rgba(200,120,80,0.35)';
    ctx.lineWidth = 1.2 * s;
    for (let b = 1; b < 4; b++) {
      const by = y - hgt * (b / 4);
      const hw = 8 * s - 5 * s * (b / 4);
      ctx.beginPath();
      ctx.moveTo(x - hw, by);
      ctx.lineTo(x + hw, by + 1 * s);
      ctx.stroke();
    }
    // A thread of warm water above each.
    for (let q = 0; q < 4; q++) {
      const ph = (t * 0.4 + q * 0.25 + k * 0.17) % 1;
      ctx.fillStyle = `rgba(150,120,150,${0.25 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(x + Math.sin(t + q + k) * 3 * s, y - hgt - ph * 40 * s, (2 + ph * 5) * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, y - hgt, 18 * s, '255,140,90', 0.5 + 0.15 * Math.sin(t * 1.3 + k));
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/** The spawning pool: a pale rim of stone just under the surface around the crown. */
export function drawPool(ctx: CanvasRenderingContext2D, cx: number, waterY: number, stage: number, s: number, t: number): void {
  if (stage <= 0) return;
  const rw = [0, 60, 110, 160][stage]! * s, rh = rw * 0.12;
  // Wholly under the surface: the far side of the ring a little below the waterline.
  const cy = waterY + rh + 6 * s;
  ctx.save();
  // Still water inside: a soft warm sheen.
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = `rgba(255,190,200,${0.025 + 0.01 * Math.sin(t * 0.6)})`;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rw * 0.95, rh * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // The rim: a low band of stone with uneven stones heaped along it; the far side seen faintly
  // through the water, the near side darker and nearer.
  const n = 9 + stage * 6;
  for (const near of [false, true]) {
    ctx.strokeStyle = near ? 'rgba(96,84,74,0.6)' : 'rgba(130,120,112,0.28)';
    ctx.lineWidth = (2 + stage) * s * (near ? 1 : 0.7);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rw, rh, 0, near ? 0 : Math.PI, near ? Math.PI : Math.PI * 2);
    ctx.stroke();
    const heap: Stone[] = [];
    for (let i = 0; i < n; i++) {
      const k = Math.sin(i * 12.9898 + stage) * 43758.5453;
      const f = k - Math.floor(k);
      const a = ((i + f * 0.6) / n) * Math.PI * 2;
      if ((Math.sin(a) > 0) !== near) continue;
      const x = cx + Math.cos(a) * rw, y = cy + Math.sin(a) * rh - (1 + stage * 0.5) * s;
      const sz = (2.5 + stage * 0.8 + f * 3.5) * s * (near ? 1 : 0.75), ry = sz * (0.45 + f * 0.25);
      heap.push({ x, y: y + ry, rx: sz, ry, seed: i * 1.7 + stage });
    }
    // Nearer stones in front: those lower on the screen last.
    heap.sort((p, q) => p.y - q.y);
    if (near) drawStones(ctx, heap, 'rgba(104,92,80,0.8)', 'rgba(255,240,220,0.18)', 'rgba(50,44,38,0.45)', s);
    else drawStones(ctx, heap, 'rgba(136,126,116,0.3)', 'rgba(255,255,255,0.07)', 'rgba(60,56,52,0.14)', s);
  }
  ctx.restore();
}

/** The lantern spire: a rough shaft of stacked stone from the floor, lamps hung along it. */
/** The listening dome: a pale shell of thin stone on the floor to the right, rising by stages; murmurs ripple off it. */
export function drawDome(ctx: CanvasRenderingContext2D, F: Focus, stage: number, s: number, t: number, floorY: number): void {
  if (stage <= 0) return;
  const x = F.x + F.w * 0.8, r = 110 * s;
  const arc = [0, 0.35, 0.7, 1][stage]!;
  ctx.save();
  // Stones of the ring, then as much of the shell as is built (from both sides up toward the top).
  const ring: Stone[] = [];
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    ring.push({ x: x + Math.cos(a) * r, y: floorY + 2 * s, rx: 7 * s, ry: 4 * s, seed: i * 2.1 });
  }
  drawStones(ctx, ring, '#1c2440', 'rgba(150,170,230,0.14)', 'rgba(4,6,16,0.6)', s);
  if (stage >= 2) {
    const g = ctx.createRadialGradient(x - r * 0.3, floorY - r * 0.7, 0, x, floorY, r * 1.1);
    g.addColorStop(0, 'rgba(120,140,200,0.95)');
    g.addColorStop(1, 'rgba(40,52,90,0.95)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 9 * s;
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      const a0 = side < 0 ? Math.PI : 0, a1 = a0 - side * (Math.PI / 2) * arc;
      ctx.arc(x, floorY, r, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke();
    }
    // Ribs across the shell.
    ctx.lineWidth = 2 * s;
    for (let k = 1; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(x, floorY, r * (k / 4), r * arc, 0, Math.PI, 0);
      ctx.stroke();
    }
  }
  // Murmurs: rings of faint violet light spreading from it while scouts listen.
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < stage; k++) {
    const u = (t * 0.25 + k / stage) % 1;
    softRing(ctx, x, floorY - r * 0.4 * arc, r * (0.6 + u * 1.4), r * (0.3 + u * 0.7), (8 + 12 * u) * s, '190,170,255', 0.32 * (1 - u));
  }
  ctx.restore();
}

export function drawSpire(ctx: CanvasRenderingContext2D, F: Focus, stage: number, s: number, t: number, floorY: number): void {
  if (stage <= 0) return;
  const x = F.x + F.w * 0.17;
  const tall = [0, 0.12, 0.42, 0.6][stage]! * F.h;
  const w0 = 30 * s, w1 = 9 * s;
  const halfAt = (k: number) => w0 + (w1 - w0) * k ** 0.8;
  ctx.save();
  // The silhouette: lumpy edges, as if built of blocks that do not quite agree.
  const g = ctx.createLinearGradient(x - w0, 0, x + w0, 0);
  g.addColorStop(0, '#0b1022');
  g.addColorStop(0.45, '#2a3354');
  g.addColorStop(1, '#090d1c');
  ctx.fillStyle = g;
  ctx.beginPath();
  const steps = 18;
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const lump = Math.sin(i * 2.7) * 2.5 * s;
    const px = x - halfAt(k) - lump, py = floorY - tall * k;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = steps; i >= 0; i--) {
    const k = i / steps;
    const lump = Math.cos(i * 2.3) * 2.5 * s;
    ctx.lineTo(x + halfAt(k) + lump, floorY - tall * k);
  }
  ctx.closePath();
  ctx.fill();
  // Courses of staggered blocks.
  ctx.strokeStyle = 'rgba(150,170,230,0.14)';
  ctx.lineWidth = 1 * s;
  const course = 16 * s;
  let row = 0;
  for (let y = floorY - course; y > floorY - tall + 8 * s; y -= course, row++) {
    const k = (floorY - y) / tall;
    const hw = halfAt(k) * 0.92;
    ctx.beginPath();
    ctx.moveTo(x - hw, y);
    ctx.lineTo(x + hw, y);
    // Joints between blocks, offset every other course.
    for (let j = -1; j <= 1; j++) {
      const jx = x + (j * 0.55 + (row % 2 ? 0.27 : 0)) * hw;
      if (Math.abs(jx - x) < hw) {
        ctx.moveTo(jx, y);
        ctx.lineTo(jx, y + course);
      }
    }
    ctx.stroke();
  }
  // Lamps: shells hung on short threads, a few at the second stage, a column of them at the third.
  const lamps = stage >= 3 ? 7 : stage === 2 ? 3 : 0;
  for (let i = 0; i < lamps; i++) {
    const k = (i + 1) / (lamps + 1);
    const side = i % 2 ? 1 : -1;
    const ax = x + side * halfAt(k), ay = floorY - tall * k;
    const sway = Math.sin(t * 0.9 + i * 1.3) * 2 * s;
    const lx = ax + side * 6 * s + sway, ly = ay + 10 * s;
    ctx.strokeStyle = 'rgba(180,200,240,0.35)';
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(lx, ly - 3 * s);
    ctx.stroke();
    ctx.fillStyle = '#cfe6ff';
    ctx.beginPath();
    ctx.ellipse(lx, ly, 2.6 * s, 3.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    const pulse = 0.65 + 0.35 * Math.sin(t * 1.2 + i * 1.7);
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, lx, ly, 26 * s, '120,200,255', 0.55 * pulse);
    glow(ctx, lx, ly, 6 * s, '230,248,255', 0.9 * pulse);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (stage >= 3) {
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, x, floorY - tall - 8 * s, 70 * s, '140,210,255', 0.5 + 0.15 * Math.sin(t * 0.7));
    glow(ctx, x, floorY - tall - 8 * s, 10 * s, '235,250,255', 0.95);
  }
  ctx.restore();
}

/** The breakwater: courses of rounded stones in an arc along the slope, one more course per stage. */
export function drawBreakwater(ctx: CanvasRenderingContext2D, F: Focus, stage: number, s: number, slope: (u: number) => number): void {
  if (stage <= 0) return;
  for (let row = 0; row < stage; row++) {
    const course: Stone[] = [];
    for (let i = 0; i < 16; i++) {
      const u = 0.62 + i * 0.022 + (row % 2) * 0.011;
      const x = F.x - F.w * 0.1 + u * F.w * 1.2;
      const y = slope(u) - row * 11 * s - Math.sin((i / 15) * Math.PI) * 6 * s;
      const r = (8 + ((i * 7 + row * 3) % 4)) * s;
      course.push({ x, y, rx: r, ry: r * 0.62, seed: i * 1.37 + row * 2.9 });
    }
    // The newest course on top is the palest, its stones not yet silted.
    const top = row === stage - 1;
    drawStones(ctx, course, top ? '#7d7466' : '#5f584e', top ? 'rgba(255,240,220,0.2)' : 'rgba(255,240,220,0.12)', 'rgba(20,18,24,0.55)', s);
  }
}

/** The sun terrace: flat stepped slabs either side of the reef's foot, green with algae on top. */
export function drawTerrace(ctx: CanvasRenderingContext2D, cx: number, unit: number, stage: number, s: number, floor: (x: number) => number,
  t = 0): void {
  if (stage <= 0) return;
  const steps = [0, 1, 3, 5][stage]!;
  ctx.save();
  for (let k = 0; k < steps; k++) {
    for (const side of [-1, 1]) {
      const x = cx + side * (0.16 + k * 0.05) * unit;
      const y = floor(x) - (steps - k) * 5 * s;
      const w = 0.06 * unit, h = 6 * s + (steps - k) * 5 * s;
      // The slab: worn stone, rounded at the corners with an uneven top, a lit top face and a
      // front shading toward the sand; each slab a little different in tone.
      const n = ((k * 7 + (side > 0 ? 3 : 0)) * 0.618) % 1;
      const r = 2.2 * s;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y + h);
      ctx.lineTo(x - w / 2, y + r);
      ctx.quadraticCurveTo(x - w / 2, y, x - w / 2 + r, y);
      ctx.quadraticCurveTo(x - w * 0.1, y - (0.6 + n) * s, x + w * 0.15, y + 0.4 * s);
      ctx.lineTo(x + w / 2 - r, y);
      ctx.quadraticCurveTo(x + w / 2, y, x + w / 2, y + r);
      ctx.lineTo(x + w / 2, y + h);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      const tone = Math.round(-10 + n * 20);
      g.addColorStop(0, `rgb(${226 + tone},${208 + tone},${168 + tone})`);
      g.addColorStop(0.3, `rgb(${206 + tone},${186 + tone},${146 + tone})`);
      g.addColorStop(1, `rgb(${168 + tone},${148 + tone},${112 + tone})`);
      ctx.fillStyle = g;
      ctx.fill();
      // Seams between the set stones, a little askew, and a few pits.
      ctx.strokeStyle = 'rgba(90,70,50,0.35)';
      ctx.lineWidth = 0.8 * s;
      ctx.beginPath();
      ctx.moveTo(x - w * (0.1 + 0.1 * n), y + 3 * s);
      ctx.lineTo(x - w * 0.12, y + h);
      ctx.moveTo(x + w * (0.25 + 0.1 * n), y + 3 * s);
      ctx.lineTo(x + w * 0.3, y + h);
      ctx.moveTo(x - w / 2, y + h * 0.55 + n * 3 * s);
      ctx.lineTo(x - w * 0.12, y + h * 0.5 + n * 3 * s);
      ctx.stroke();
      ctx.fillStyle = 'rgba(80,62,44,0.35)';
      ctx.beginPath();
      for (let q = 0; q < 3; q++) {
        const px = x - w / 2 + w * ((n + q * 0.37) % 1), py = y + 5 * s + (h - 7 * s) * ((n * 3 + q * 0.53) % 1);
        ctx.moveTo(px + 0.8 * s, py);
        ctx.arc(px, py, 0.8 * s, 0, Math.PI * 2);
      }
      ctx.fill();
      // Algae along the top, tufts swaying.
      ctx.strokeStyle = 'rgba(110,170,90,0.8)';
      ctx.lineWidth = 2.6 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + 1.5 * s, y);
      ctx.quadraticCurveTo(x - w * 0.1, y - (0.6 + n) * s, x + w * 0.15, y + 0.4 * s);
      ctx.lineTo(x + w / 2 - 1.5 * s, y);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,190,100,0.85)';
      ctx.lineWidth = 1.2 * s;
      ctx.beginPath();
      for (let q = 0; q < 5; q++) {
        const tx = x - w / 2 + (q + 0.5) * (w / 5);
        const sway = Math.sin(t * 1.1 + q + k * 2 + side) * 2 * s;
        const tall = (6 + 4 * ((n + q * 0.31) % 1)) * s;
        ctx.moveTo(tx, y - 1 * s);
        ctx.quadraticCurveTo(tx + sway * 0.5, y - tall * 0.6, tx + sway, y - tall);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** The grazing lawn: a pale flat of dead stone on the slope, grazed into stripes, wider by stages. */
export function drawLawn(ctx: CanvasRenderingContext2D, F: Focus, stage: number, s: number, slope: (u: number) => number): void {
  if (stage <= 0) return;
  const x = (u: number) => F.x - F.w * 0.1 + u * F.w * 1.2;
  const u0 = 0.06, u1 = 0.06 + 0.07 * stage;
  ctx.save();
  ctx.fillStyle = 'rgba(205,200,180,0.35)';
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) { const u = u0 + (u1 - u0) * (i / 16); if (i) ctx.lineTo(x(u), slope(u) - 3 * s); else ctx.moveTo(x(u), slope(u) - 3 * s); }
  for (let i = 16; i >= 0; i--) { const u = u0 + (u1 - u0) * (i / 16); ctx.lineTo(x(u), slope(u) + 8 * s); }
  ctx.closePath();
  ctx.fill();
  // Beak marks: short pale scrapes in rows.
  ctx.strokeStyle = 'rgba(240,235,220,0.45)';
  ctx.lineWidth = 1 * s;
  for (let i = 0; i < 18 * stage; i++) {
    const u = u0 + (u1 - u0) * ((i * 0.618) % 1);
    const y = slope(u) + ((i * 0.37) % 1) * 8 * s - 2 * s;
    ctx.beginPath();
    ctx.moveTo(x(u) - 3 * s, y);
    ctx.lineTo(x(u) + 3 * s, y + 0.8 * s);
    ctx.stroke();
  }
  ctx.restore();
}

/** The lagoon rim: a low ring of piled stones on the sand to one side, more of it with each stage. */
export function drawRim(ctx: CanvasRenderingContext2D, F: Focus, stage: number, s: number, floor: (u: number) => number): void {
  if (stage <= 0) return;
  const cu = 0.76, R = 0.08;
  const x = (u: number) => F.x - F.w * 0.1 + u * F.w * 1.2;
  const span = [0, 0.4, 0.7, 1][stage]!;
  // The far side of the ring first, so the near stones sit in front.
  const far: Stone[] = [], near: Stone[] = [];
  for (let i = 0; i <= 24 * span; i++) {
    const a = Math.PI + (i / 24) * Math.PI;
    const u = cu + Math.cos(a) * R;
    const y = floor(u) + 3 * s + Math.sin(a) * 6 * s;
    (i % 2 ? far : near).push({ x: x(u), y: y + 3.5 * s, rx: (5 + (i % 3)) * s, ry: (3.5 + (i % 2)) * s, seed: i * 2.3 });
  }
  drawStones(ctx, far, '#a89a80', 'rgba(255,248,230,0.35)', 'rgba(70,58,40,0.45)', s);
  drawStones(ctx, near, '#bfb29a', 'rgba(255,248,230,0.35)', 'rgba(70,58,40,0.45)', s);
}

/** The beacon: a slim stone spire above the water beside the crown, its tip lit at the last stage. */
export function drawBeacon(ctx: CanvasRenderingContext2D, x: number, waterY: number, stage: number, s: number, t: number): void {
  if (stage <= 0) return;
  const hgt = [0, 18, 45, 70][stage]! * s;
  ctx.save();
  ctx.fillStyle = '#2a2c3e';
  ctx.beginPath();
  ctx.moveTo(x - 7 * s, waterY + 4 * s);
  ctx.lineTo(x - 2.5 * s, waterY - hgt);
  ctx.lineTo(x + 2.5 * s, waterY - hgt);
  ctx.lineTo(x + 7 * s, waterY + 4 * s);
  ctx.closePath();
  ctx.fill();
  if (stage >= 3) {
    ctx.globalCompositeOperation = 'lighter';
    const pulse = 0.7 + 0.3 * Math.sin(t * 1.4);
    glow(ctx, x, waterY - hgt - 2 * s, 30 * s, '170,255,230', 0.4 * pulse);
    glow(ctx, x, waterY - hgt - 2 * s, 5 * s, '230,255,245', 0.9 * pulse);
  }
  ctx.restore();
}

/** The snow fence: a low wall of stacked stones on the floor left of the reef, longer by stages, snow banked against it. */
export function drawFence(ctx: CanvasRenderingContext2D, cx: number, baseY: number, stage: number, s: number): void {
  if (stage <= 0) return;
  ctx.save();
  const n = [0, 4, 8, 12][stage]!;
  // Stacked by layers, the bottom one first, so each stone sits on those under it.
  for (let k = 0; k < 3; k++) {
    const layer: Stone[] = [];
    for (let i = 0; i < n; i++) {
      if (k > (i % 2) + (i % 3 === 0 ? 1 : 0)) continue;
      layer.push({ x: cx - 60 * s - i * 13 * s, y: baseY + 1.5 * s - k * 7 * s, rx: 7.5 * s, ry: 4.5 * s, seed: i * 1.9 + k * 4.1 });
    }
    drawStones(ctx, layer, k % 2 ? '#4a4f6e' : '#3c4060', 'rgba(200,210,240,0.16)', 'rgba(8,10,24,0.6)', s);
  }
  // Pale snow banked against its far side.
  ctx.fillStyle = 'rgba(190,200,230,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx - 60 * s - (n - 1) * 6.5 * s, baseY - 1 * s, n * 7 * s, 6 * s, 0, Math.PI, 0);
  ctx.fill();
  ctx.restore();
}
