// The small life of the Silt Floor: drifting jellies, brittle stars on the silt, and the vent
// chimney with its plume. Pure functions of time and a seed.

import { mulberry32, range } from '../sim/rng.ts';
import { glow } from './draw.ts';

export type Stage = { cx: number; baseY: number; w: number; h: number; s: number; dpr: number };

type Jelly = { x: number; y: number; size: number; period: number; phase: number; hue: number; drift: number };
type Star = { x: number; size: number; phase: number; rot: number };
type Lily = { x: number; size: number; phase: number; hue: string };

export function createLife(seed: number) {
  const rng = mulberry32(seed);
  const lilies: Lily[] = [
    { x: -0.42, size: 1.0, phase: 0, hue: '230,200,215' },
    { x: -0.06, size: 0.75, phase: 2.1, hue: '215,215,240' },
    { x: 0.2, size: 0.9, phase: 4.2, hue: '240,210,190' },
    { x: 0.4, size: 0.65, phase: 1.3, hue: '220,205,235' },
  ];
  const jellies: Jelly[] = Array.from({ length: 3 }, (_, i) => ({
    x: [-0.36, 0.33, -0.2][i]! + range(rng, -0.04, 0.04),
    y: [-0.62, -0.45, -0.78][i]! + range(rng, -0.04, 0.04),
    size: range(rng, 0.7, 1.15) * (i === 2 ? 0.6 : 1),
    period: range(rng, 2.8, 4.2),
    phase: rng() * 10,
    hue: range(rng, 250, 300),
    drift: range(rng, 0.008, 0.016) * (rng() < 0.5 ? -1 : 1),
  }));
  const stars: Star[] = Array.from({ length: 4 }, (_, i) => ({
    x: [-0.38, -0.22, 0.24, 0.41][i]! + range(rng, -0.03, 0.03),
    size: range(rng, 0.7, 1.1),
    phase: rng() * 10,
    rot: rng() * Math.PI * 2,
  }));

  function drawJelly(ctx: CanvasRenderingContext2D, st: Stage, j: Jelly, t: number): void {
    const s = st.s * j.size;
    // Wraps across the focus area very slowly.
    const span = st.w * 1.2;
    const xRaw = st.cx + j.x * st.w + j.drift * t * st.w * 0.05;
    const x = ((((xRaw - (st.cx - span / 2)) % span) + span) % span) + st.cx - span / 2;
    const beat = (t + j.phase) / j.period;
    const contract = Math.pow(Math.max(0, Math.sin(beat * Math.PI * 2)), 2);
    const y = st.baseY + j.y * st.h + Math.sin(beat * Math.PI * 2 - 0.8) * 6 * s;
    const bw = (26 - contract * 5) * s;
    const bh = (20 + contract * 4) * s;

    // Tentacles, trailing and lagging behind the beat.
    ctx.lineCap = 'round';
    for (let k = 0; k < 7; k++) {
      const ox = x + (k - 3) * bw * 0.22;
      ctx.strokeStyle = `hsla(${j.hue},80%,80%,${0.18 + (k % 2) * 0.1})`;
      ctx.lineWidth = (k % 3 === 0 ? 1.6 : 0.9) * s;
      ctx.beginPath();
      ctx.moveTo(ox, y);
      const len = (60 + (k % 3) * 22) * s;
      for (let q = 1; q <= 8; q++) {
        const f = q / 8;
        const wav = Math.sin(t * 1.6 + k + f * 5 - beat * 2) * 6 * s * f;
        ctx.lineTo(ox + wav + (k - 3) * f * 3 * s, y + f * len);
      }
      ctx.stroke();
    }
    // Bell.
    const g = ctx.createRadialGradient(x, y - bh * 0.4, 0, x, y - bh * 0.2, bw * 1.2);
    g.addColorStop(0, `hsla(${j.hue},90%,85%,0.35)`);
    g.addColorStop(0.7, `hsla(${j.hue},70%,60%,0.14)`);
    g.addColorStop(1, `hsla(${j.hue},70%,50%,0.02)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - bw, y);
    ctx.bezierCurveTo(x - bw, y - bh * 1.3, x + bw, y - bh * 1.3, x + bw, y);
    // Scalloped rim.
    for (let k = 6; k >= 0; k--) {
      const rx = x - bw + (k / 6) * bw * 2;
      ctx.quadraticCurveTo(rx + bw / 6, y + 4 * s, rx, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = `hsla(${j.hue},100%,88%,0.45)`;
    ctx.lineWidth = 1.1 * s;
    ctx.stroke();
    // Bioluminescent rim lights.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k <= 6; k++) {
      const rx = x - bw + (k / 6) * bw * 2;
      const a = 0.35 + 0.35 * Math.sin(t * 3 + k + j.phase);
      const rg = ctx.createRadialGradient(rx, y, 0, rx, y, 7 * s);
      rg.addColorStop(0, `hsla(${j.hue - 60},100%,80%,${a})`);
      rg.addColorStop(1, `hsla(${j.hue - 60},100%,70%,0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(rx - 7 * s, y - 7 * s, 14 * s, 14 * s);
    }
    ctx.restore();
  }

  function drawStar(ctx: CanvasRenderingContext2D, st: Stage, star: Star, t: number): void {
    const s = st.s * star.size;
    const x = st.cx + star.x * st.w;
    const y = st.baseY + 10 * s;
    ctx.strokeStyle = 'rgba(170,120,150,0.55)';
    ctx.fillStyle = 'rgba(190,140,170,0.7)';
    ctx.lineCap = 'round';
    for (let k = 0; k < 5; k++) {
      const a0 = star.rot + (k / 5) * Math.PI * 2;
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      let ax = x, ay = y, a = a0;
      for (let q = 0; q < 6; q++) {
        a += Math.sin(t * 0.4 + star.phase + k * 1.3 + q * 0.6) * 0.18;
        ax += Math.cos(a) * 4 * s;
        ay += Math.sin(a) * 4 * s * 0.45;
        ctx.lineTo(ax, ay);
        ctx.lineWidth = (2 - q * 0.28) * s;
      }
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(x, y, 3.2 * s, 1.8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Ossel's wall: a long-dead reef mound beside the young reef, slumped and banded, half buried
   * in the silt, with the broken stumps of its old branches. On it one pale polyp still lives,
   * breathing: Ossel, the voice that talks to you.
   */
  function drawOssel(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    const s = st.s;
    const r = mulberry32(seed ^ 0x055e1);
    const x0 = st.cx - st.w * 0.36, x1 = st.cx - st.w * 0.15;
    const base = st.baseY + 8 * s;
    const ph = [r() * 6.28, r() * 6.28, r() * 6.28] as const;
    // A slumped skyline: smooth swells, highest right of centre, tapering into the silt at both ends.
    const height = (u: number) => {
      const env = Math.pow(Math.sin(Math.PI * u), 0.35) * (0.6 + 0.4 * u);
      const swell = 1 + 0.18 * Math.sin(u * 9 + ph[0]) + 0.08 * Math.sin(u * 23 + ph[1]) + 0.03 * Math.sin(u * 61 + ph[2]);
      return 95 * s * env * swell;
    };
    const n = 48;
    const pts: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push([x0 + (x1 - x0) * u, base - height(u)]);
    }
    const fill = ctx.createLinearGradient(0, base - 130 * s, 0, base);
    fill.addColorStop(0, '#2a2a40');
    fill.addColorStop(1, '#14141f');
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(x0, base);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.lineTo(x1, base);
    ctx.closePath();
    ctx.fill();
    // Old bands follow the shape of the stone, each a little lower than the last.
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(170,170,205,0.10)';
    ctx.lineWidth = 1 * st.dpr;
    for (let k = 1; k < 14; k++) {
      const drop = k * 8.5 * s;
      ctx.beginPath();
      pts.forEach(([x, y], i) => {
        const yy = Math.min(base, y + drop + Math.sin(i * 0.7 + k) * 1.2 * s);
        if (i) ctx.lineTo(x, yy);
        else ctx.moveTo(x, yy);
      });
      ctx.stroke();
    }
    ctx.restore();
    // Broken stumps of the old branches, thick and blunt.
    ctx.strokeStyle = '#25253a';
    ctx.lineCap = 'round';
    for (const [u, lean, len, wid] of [[0.55, -0.25, 34, 9], [0.72, 0.2, 48, 11], [0.86, 0.45, 26, 8], [0.38, -0.4, 20, 7]] as const) {
      const i = Math.round(u * n);
      const [x, y] = pts[i]!;
      ctx.lineWidth = wid * s;
      ctx.beginPath();
      ctx.moveTo(x, y + 6 * s);
      ctx.quadraticCurveTo(x + lean * len * 0.3 * s, y - len * 0.5 * s, x + lean * len * s, y - len * s);
      ctx.stroke();
    }
    // Silt dusting every upward face.
    ctx.strokeStyle = 'rgba(185,190,215,0.18)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + 1.2 * s) : ctx.moveTo(x, y + 1.2 * s)));
    ctx.stroke();
    // Ossel: the one living polyp on the dead stone, pale, its tentacles opening and closing slowly.
    const breathe = 0.5 + 0.5 * Math.sin(t * 0.45);
    const oi = Math.round(0.62 * n);
    const [ox, oyTop] = pts[oi]!;
    const oy = oyTop + 14 * s;
    ctx.strokeStyle = `rgba(215,220,245,${0.45 + 0.25 * breathe})`;
    ctx.lineWidth = 1.1 * s;
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k - 3) * (0.22 + 0.1 * breathe);
      const len = (6 + 3 * breathe) * s;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(ox + Math.cos(a) * len * 0.6, oy + Math.sin(a) * len * 0.5, ox + Math.cos(a) * len, oy + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, ox, oy - 3 * s, 40 * s, '200,210,255', 0.10 + 0.10 * breathe);
    glow(ctx, ox, oy - 2 * s, 7 * s, '225,230,255', 0.45 + 0.3 * breathe);
    ctx.restore();
  }

  /**
   * Sea lilies: stalked crinoids rooted in the silt, their feathery arms held open into the
   * current and swaying slowly with it. Half-lit, pale, very old.
   */
  function drawLily(ctx: CanvasRenderingContext2D, st: Stage, c: Lily, t: number): void {
    const s = st.s * c.size;
    const x0 = st.cx + st.w * c.x, y0 = st.baseY + 4 * st.s;
    const sway = Math.sin(t * 0.35 + c.phase) * 0.12;
    const len = 46 * s;
    const tx = x0 + Math.sin(sway) * len, ty = y0 - Math.cos(sway) * len;
    ctx.save();
    ctx.lineCap = 'round';
    // The stalk, jointed, bending with the current.
    ctx.strokeStyle = 'rgba(190,175,200,0.55)';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + Math.sin(sway) * len * 0.2, y0 - len * 0.55, tx, ty);
    ctx.stroke();
    // The crown: ten feathery arms opening like a hand, pinnules along each.
    for (let a = 0; a < 10; a++) {
      const ang = -Math.PI / 2 + sway * 1.5 + (a - 4.5) * 0.19;
      const arm = (16 + (a % 3) * 3) * s;
      const curl = Math.sin(t * 0.6 + a + c.phase) * 0.12;
      const ex = tx + Math.cos(ang + curl) * arm, ey = ty + Math.sin(ang + curl) * arm;
      ctx.strokeStyle = `rgba(${c.hue},0.6)`;
      ctx.lineWidth = 1 * s;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(ang) * arm * 0.5, ty + Math.sin(ang) * arm * 0.6, ex, ey);
      ctx.stroke();
      ctx.lineWidth = 0.6 * s;
      for (let p = 1; p < 6; p++) {
        const u = p / 6;
        const px = tx + (ex - tx) * u, py = ty + (ey - ty) * u;
        const n = 3 * s * (1 - u * 0.5);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang + 1.3) * n, py + Math.sin(ang + 1.3) * n);
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang - 1.3) * n, py + Math.sin(ang - 1.3) * n);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /**
   * A rattail: a big-headed deep fish with a long tapering tail, nosing slowly along the silt
   * and crossing the frame every couple of minutes.
   */
  function drawRattail(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
    const period = 150;
    const u = (t % period) / period;
    if (u > 0.6) return;
    const s = st.s * 1.2;
    const x = st.cx - st.w * 0.7 + (u / 0.6) * st.w * 1.4;
    const y = st.baseY + 2 * s + Math.sin(t * 0.6) * 4 * s;
    ctx.save();
    ctx.translate(x, y);
    // Head down toward the silt, tail trailing up behind.
    ctx.rotate(0.06);
    const body = ctx.createLinearGradient(0, -10 * s, 0, 10 * s);
    body.addColorStop(0, '#3a3550');
    body.addColorStop(1, '#1d1a2c');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(26 * s, 0);
    ctx.quadraticCurveTo(22 * s, -11 * s, 6 * s, -10 * s);
    for (let i = 0; i <= 10; i++) {
      const f = i / 10;
      const tx = 6 * s - f * 70 * s;
      const ty = -10 * s * (1 - f) + Math.sin(t * 2 + f * 5) * 3 * s * f;
      ctx.lineTo(tx, ty);
    }
    for (let i = 10; i >= 0; i--) {
      const f = i / 10;
      ctx.lineTo(6 * s - f * 70 * s, 7 * s * (1 - f) + Math.sin(t * 2 + f * 5) * 3 * s * f);
    }
    ctx.quadraticCurveTo(22 * s, 9 * s, 26 * s, 0);
    ctx.fill();
    // A big eye that catches the reef's light.
    ctx.fillStyle = 'rgba(150,200,255,0.55)';
    ctx.beginPath();
    ctx.arc(15 * s, -3 * s, 3.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#05050c';
    ctx.beginPath();
    ctx.arc(15.5 * s, -3 * s, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
    // Chin barbel, feeling the silt.
    ctx.strokeStyle = 'rgba(150,140,180,0.6)';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(22 * s, 5 * s);
    ctx.quadraticCurveTo(24 * s, 10 * s, 21 * s + Math.sin(t * 3) * 2 * s, 13 * s);
    ctx.stroke();
    ctx.restore();
  }

  /** The vent chimney: grows a little with each tier, plume shimmers upward. */
  /** One mineral spire: a knobbly column of sulphide crust, narrowing to a smoking mouth. */
  function drawSpire(ctx: CanvasRenderingContext2D, x: number, base: number, hgt: number, wid: number, k: number, s: number): void {
    const n = 16;
    const knob = (f: number, side: number) =>
      wid * (1 - f * 0.62) * (1 + 0.16 * Math.sin(f * 17 + k * 3 + side) + 0.08 * Math.sin(f * 41 + k + side * 2));
    ctx.beginPath();
    ctx.moveTo(x - knob(0, 0), base);
    for (let i = 1; i <= n; i++) {
      const f = i / n;
      ctx.lineTo(x - knob(f, 0) + Math.sin(f * 5 + k) * 2 * s, base - f * hgt);
    }
    for (let i = n; i >= 0; i--) {
      const f = i / n;
      ctx.lineTo(x + knob(f, 1.3) + Math.sin(f * 5 + k) * 2 * s, base - f * hgt);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(x - wid, 0, x + wid, 0);
    g.addColorStop(0, '#1a1219');
    g.addColorStop(0.55, '#3a2a2e');
    g.addColorStop(1, '#171017');
    ctx.fillStyle = g;
    ctx.fill();
    // Mineral crust: rusty and sulphur-pale flecks clinging to the knobs.
    const r = mulberry32(seed ^ (0x5eed + k));
    for (let i = 0; i < 26; i++) {
      const f = r() * 0.95;
      const side = r() < 0.5 ? -1 : 1;
      const px = x + side * knob(f, side > 0 ? 1.3 : 0) * range(r, 0.2, 0.85);
      const py = base - f * hgt;
      ctx.fillStyle = r() < 0.7 ? `rgba(200,125,80,${range(r, 0.2, 0.45)})` : `rgba(225,215,150,${range(r, 0.18, 0.35)})`;
      ctx.beginPath();
      ctx.ellipse(px, py, range(r, 1.2, 3.2) * s, range(r, 0.8, 2) * s, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Tube worms crowding the warm water at the vent's foot: white stalks with red plumes. */
  function drawTubeWorms(ctx: CanvasRenderingContext2D, x: number, base: number, count: number, s: number, t: number): void {
    for (let i = 0; i < count; i++) {
      const off = ((i * 0.618) % 1 - 0.5) * 70 * s;
      const len = (14 + ((i * 7) % 5) * 4) * s;
      const sway = Math.sin(t * 0.9 + i * 1.7) * 2.5 * s;
      const bx = x + off, tx = bx + sway + off * 0.08, ty = base - len;
      ctx.strokeStyle = 'rgba(225,220,205,0.85)';
      ctx.lineWidth = 2.2 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, base + 2 * s);
      ctx.quadraticCurveTo(bx + sway * 0.3, base - len * 0.5, tx, ty);
      ctx.stroke();
      ctx.fillStyle = 'rgba(220,40,60,0.95)';
      ctx.beginPath();
      ctx.ellipse(tx, ty - 2 * s, 2.6 * s, 4.2 * s, sway * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawVent(ctx: CanvasRenderingContext2D, st: Stage, tier: number, t: number): { x: number; y: number } {
    const s = st.s;
    const x = st.cx + st.w * 0.3;
    const base = st.baseY + 6 * s;
    const hgt = (55 + tier * 22) * s;
    const top = base - hgt;
    // Each tier raises the main spire and grows another beside it.
    const spires: [number, number, number][] = [[0, hgt, 26 * s]];
    if (tier >= 2) spires.push([-30 * s, hgt * 0.55, 16 * s]);
    if (tier >= 3) spires.push([28 * s, hgt * 0.4, 14 * s]);
    for (let i = spires.length - 1; i >= 0; i--) drawSpire(ctx, x + spires[i]![0], base, spires[i]![1], spires[i]![2], i, s);
    drawTubeWorms(ctx, x, base, 5 + tier * 3, s, t);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [dx, h] of spires) {
      const flick = 0.35 + 0.1 * Math.sin(t * 2.3 + dx);
      glow(ctx, x + dx, base - h, (h === hgt ? 30 : 18) * s, '255,140,70', flick);
    }
    // Plume: rising, spreading, fading motes of warm cloudy water.
    const n = 46;
    for (let i = 0; i < n; i++) {
      const u = (t * 0.07 + i / n) % 1;
      const px = x + Math.sin(t * 0.8 + i * 2.1) * (4 + u * 26) * s + u * 18 * s;
      const py = top - u * st.h * 0.42;
      glow(ctx, px, py, (6 + u * 26) * s, '170,170,200', (1 - u) * 0.16);
    }
    ctx.restore();
    return { x, y: top };
  }

  return {
    drawBack(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
      drawJelly(ctx, st, jellies[2]!, t);
    },
    drawFront(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
      drawJelly(ctx, st, jellies[0]!, t);
      drawJelly(ctx, st, jellies[1]!, t);
    },
    drawFloor(ctx: CanvasRenderingContext2D, st: Stage, t: number): void {
      for (const c of lilies) drawLily(ctx, st, c, t);
      drawOssel(ctx, st, t);
      for (const star of stars) drawStar(ctx, st, star, t);
      drawRattail(ctx, st, t);
    },
    drawVent,
  };
}
