// Small canvas drawings for the panel's cards: the shards' tablet and the map of Thousandfold.

import { CITY_MAP, SITES } from '../content/expeditions.ts';
import { SHARD_LINES } from '../content/shards.ts';

/**
 * The buried city from above: concentric wall rings, the ruins (lit when searched), roam paths,
 * and the shoals away on a trip: a dotted way to the ruin and their lights out along it and back.
 */
export function drawCity(c: HTMLCanvasElement, found: readonly string[], roams: number, seed: number,
  trip: { site: string; done: number } | null = null): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = c.clientWidth || 300, H = 150;
  c.width = W * dpr;
  c.height = H * dpr;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  g.clearRect(0, 0, W, H);
  // Wall upon wall: rough rings around the city's heart.
  const cx = W * 0.5, cy = H * 0.52;
  g.strokeStyle = 'rgba(160,180,220,0.18)';
  g.lineWidth = 1;
  for (let ring = 1; ring <= 7; ring++) {
    g.beginPath();
    for (let a = 0; a <= 64; a++) {
      const th = (a / 64) * Math.PI * 2;
      const r = ring * 0.065 * W * (1 + 0.06 * Math.sin(th * 5 + ring * 1.3));
      const x = cx + Math.cos(th) * r, y = cy + Math.sin(th) * r * 0.42;
      if (a === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  // Roams: faint wandering lines out from the reef (bottom centre), one per roam, seeded.
  g.strokeStyle = 'rgba(140,205,255,0.16)';
  for (let k = 0; k < Math.min(24, roams); k++) {
    let x = W * 0.5, y = H - 4;
    g.beginPath();
    g.moveTo(x, y);
    for (let q = 0; q < 6; q++) {
      x += Math.sin(seed * 0.001 + k * 2.3 + q * 1.7) * W * 0.07;
      y -= H * 0.12;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // The trip under way.
  const where = trip ? (CITY_MAP.where as Record<string, [number, number]>)[trip.site] : undefined;
  if (trip && where) {
    const hx = W * 0.5, hy = H - 4, tx = where[0] * W, ty = where[1] * H;
    g.save();
    g.setLineDash([2, 4]);
    g.strokeStyle = 'rgba(140,220,255,0.55)';
    g.beginPath();
    g.moveTo(hx, hy);
    g.quadraticCurveTo((hx + tx) / 2 + W * 0.08, (hy + ty) / 2, tx, ty);
    g.stroke();
    g.restore();
    // Out to the ruin over the first half, home over the second.
    const k = 1 - Math.abs(2 * trip.done - 1);
    const qx = (hx + tx) / 2 + W * 0.08, qy = (hy + ty) / 2;
    const px = (1 - k) ** 2 * hx + 2 * (1 - k) * k * qx + k * k * tx, py = (1 - k) ** 2 * hy + 2 * (1 - k) * k * qy + k * k * ty;
    for (let i = 0; i < 5; i++) {
      g.fillStyle = `rgba(160,235,255,${0.9 - i * 0.15})`;
      g.beginPath();
      g.arc(px + Math.cos(i * 1.3) * 3, py + Math.sin(i * 2.1) * 2, 1.6, 0, Math.PI * 2);
      g.fill();
    }
    const halo = g.createRadialGradient(px, py, 0, px, py, 12);
    halo.addColorStop(0, 'rgba(140,220,255,0.35)');
    halo.addColorStop(1, 'rgba(140,220,255,0)');
    g.fillStyle = halo;
    g.fillRect(px - 12, py - 12, 24, 24);
  }
  // The ruins.
  g.font = '11px system-ui, sans-serif';
  g.textAlign = 'center';
  for (const x of SITES) {
    const [u, v] = CITY_MAP.where[x.id];
    const px = u * W, py = v * H;
    const lit = found.includes(x.id);
    g.fillStyle = lit ? '#ffd9a8' : 'rgba(255,255,255,0.15)';
    g.beginPath();
    g.arc(px, py, lit ? 4 : 3, 0, Math.PI * 2);
    g.fill();
    if (lit) {
      g.fillStyle = 'rgba(255,217,168,0.85)';
      g.fillText(x.name.replace(/^The /, ''), px, py - 8);
    }
  }
}

/**
 * The tablet: a round stone cracked into twelve wedges; found ones carved with lines of small
 * glyphs (seeded per wedge), missing ones a dark gap with a faint outline.
 */
export function drawTablet(c: HTMLCanvasElement, got: readonly number[]): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const S = 150;
  c.width = c.height = S * dpr;
  c.style.width = c.style.height = `${S}px`;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  const cx = S / 2, cy = S / 2, R = S / 2 - 6;
  const n = SHARD_LINES.length;
  // Crack lines wander a little: each wedge edge is a jagged radius.
  const edge = (k: number): [number, number][] => {
    const a = (k / n) * Math.PI * 2 - Math.PI / 2;
    const pts: [number, number][] = [];
    for (let q = 0; q <= 6; q++) {
      const r = (q / 6) * R;
      const j = q > 0 && q < 6 ? Math.sin(k * 12.9 + q * 4.1) * 0.06 : 0;
      pts.push([cx + Math.cos(a + j) * r, cy + Math.sin(a + j) * r]);
    }
    return pts;
  };
  for (let k = 0; k < n; k++) {
    const a0 = (k / n) * Math.PI * 2 - Math.PI / 2, a1 = ((k + 1) / n) * Math.PI * 2 - Math.PI / 2;
    const e0 = edge(k), e1 = edge(k + 1);
    const wedge = new Path2D();
    wedge.moveTo(cx, cy);
    for (const [x, y] of e0) wedge.lineTo(x, y);
    wedge.arc(cx, cy, R, a0, a1);
    for (const [x, y] of [...e1].reverse()) wedge.lineTo(x, y);
    wedge.closePath();
    const have = got.includes(k);
    if (have) {
      const grad = g.createRadialGradient(cx - 20, cy - 24, 10, cx, cy, R);
      grad.addColorStop(0, '#d9d0bf');
      grad.addColorStop(1, '#9d9381');
      g.fillStyle = grad;
      g.fill(wedge);
      // Carved glyphs: short strokes along arcs, seeded by the wedge.
      g.save();
      g.clip(wedge);
      g.strokeStyle = 'rgba(70, 60, 48, 0.75)';
      g.lineWidth = 1.1;
      for (let ring = 0; ring < 4; ring++) {
        const r = R * (0.38 + ring * 0.16);
        for (let q = 0; q < 5; q++) {
          const a = a0 + ((q + 0.5) / 5) * (a1 - a0);
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          const h = (k * 7 + ring * 3 + q) % 4;
          g.beginPath();
          if (h === 0) { g.moveTo(x - 2, y - 2); g.lineTo(x + 2, y + 2); }
          else if (h === 1) { g.arc(x, y, 1.6, 0, Math.PI * 2); }
          else if (h === 2) { g.moveTo(x - 2.4, y); g.lineTo(x + 2.4, y); g.moveTo(x, y - 2.4); g.lineTo(x, y + 2.4); }
          else { g.moveTo(x - 2, y + 2); g.lineTo(x, y - 2.4); g.lineTo(x + 2, y + 2); }
          g.stroke();
        }
      }
      g.restore();
      g.strokeStyle = 'rgba(40, 34, 28, 0.6)';
      g.lineWidth = 1;
      g.stroke(wedge);
    } else {
      g.setLineDash([2, 3]);
      g.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      g.lineWidth = 1;
      g.stroke(wedge);
      g.setLineDash([]);
    }
  }
}

/** Seamount colours for the line's charts. */
export const SEAMOUNT_TINT: Record<string, string> = {
  plain: '#c98a9a', warm: '#e0886a', cold: '#8ab8e0', crowded: '#b49ad8', hungry: '#b8ae96', silent: '#7f86a8',
  lonely: '#9fd8ff', buried: '#a9a49a', dark: '#6a6a90', shallow: '#f0c080', thorny: '#c06a8a', heavy: '#8f8a80', gleaming: '#ffe6a0', tidal: '#6ab0d8',
};

/**
 * The reseeded sea, from above: every ending of the line a small reef islet (a ring of shallows
 * round a coloured heart, larger for each memory carried), placed outward on a slow spiral from
 * the first, with the drift of each spawn to the next drawn as a dotted line.
 */
export function drawSeaChart(c: HTMLCanvasElement, chronicle: readonly string[]): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = c.clientWidth || 300, H = 140;
  c.width = W * dpr;
  c.height = H * dpr;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  // Open water: deep blue, lighter toward the middle, faint swell lines.
  const bg = g.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.6);
  bg.addColorStop(0, '#173c5e');
  bg.addColorStop(1, '#081a2e');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(160,200,240,0.07)';
  for (let k = 0; k < 9; k++) {
    g.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = (k + 0.5) * (H / 9) + Math.sin(x * 0.04 + k * 1.7) * 3;
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
  const at = (i: number): [number, number] => {
    const a = i * 2.399963, r = 12 + 26 * Math.sqrt(i);
    return [W / 2 + Math.cos(a) * r * (W / H) * 0.55, H / 2 + Math.sin(a) * r * 0.55];
  };
  g.setLineDash([2, 3]);
  g.strokeStyle = 'rgba(255,220,180,0.3)';
  g.beginPath();
  chronicle.forEach((_, i) => { const [x, y] = at(i); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
  g.stroke();
  g.setLineDash([]);
  chronicle.forEach((line, i) => {
    const [sm, ids] = line.split('|');
    const n = (ids ?? '').split(',').filter(Boolean).length;
    const [x, y] = at(i);
    const r = 3 + n;
    // An uneven outline round (x, y): radius rr, wobbling by its own phase.
    const blob = (rr: number, wob: number, ph: number) => {
      g.beginPath();
      for (let k = 0; k <= 20; k++) {
        const a = (k / 20) * Math.PI * 2;
        const q = rr * (1 + wob * Math.sin(a * 3 + ph) + wob * 0.6 * Math.sin(a * 5 + ph * 1.7));
        if (k) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.85);
        else g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q * 0.85);
      }
      g.closePath();
    };
    // The shallows: turquoise over sand, a paler rim where the swell breaks, a few patch reefs off it.
    blob(r + 5, 0.12, i * 1.9);
    g.fillStyle = 'rgba(110,210,205,0.28)';
    g.fill();
    g.strokeStyle = 'rgba(200,245,240,0.35)';
    g.lineWidth = 0.8;
    g.stroke();
    g.fillStyle = 'rgba(150,230,215,0.4)';
    for (let k = 0; k < 3; k++) {
      const a = i * 2.1 + k * 2.3, d = r + 7 + (k % 2) * 3;
      g.beginPath();
      g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85, 1 + (k % 2) * 0.6, 0, Math.PI * 2);
      g.fill();
    }
    // The reef itself, its seamount's colour, lumpy.
    blob(r, 0.16, i * 3.1 + 1);
    g.fillStyle = SEAMOUNT_TINT[sm ?? 'plain'] ?? '#c98a9a';
    g.fill();
    // A blue moon ending wears a blue ring; one with vows kept, a gold one.
    const flags = line.split('|')[3] ?? '';
    if (flags.includes('b')) { g.strokeStyle = 'rgba(130,180,255,0.9)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r + 2.5, 0, Math.PI * 2); g.stroke(); }
    if (flags.includes('v')) { g.strokeStyle = 'rgba(255,210,120,0.9)'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, r + 5, 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = 'rgba(255,245,230,0.8)';
    g.font = '9px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(String(i + 1), x, y - r - 6);
  });
}

/** Colours of the reef's own bands by what they remember (diary keys). */
const RING_TINT: Record<string, string> = {
  feast: '#e8b07a', seen: '#9fd8ff', relic: '#ffd9a8', moment: '#c9a0ff', resident: '#8fe0b0', work: '#d8c3a5',
  shard: '#f0e6c0', ahead: '#ff9db8', cousin: '#ff9db8', behind: '#a88fb0', trial: '#ffd27a', request: '#b8d0e8',
  reading: '#b39dff', roam: '#7fb8d8', mistake: '#ff8a7a', asked: '#ffe0f0', carcass: '#c8b8a8', visit: '#ffb3c9',
};

/**
 * The reef's own bands as a cross-section of its stone: one ring per thing it laid down, the first
 * at the heart, each tinted by what it remembers; `hi` (an index into `lines`) is drawn bright.
 * Returns the ring radii so a tap can be matched to a band.
 */
export function drawRings(c: HTMLCanvasElement, lines: readonly string[], hi: number): { cx: number; cy: number; r0: number; step: number } {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = c.clientWidth || 300, H = 170;
  c.width = W * dpr;
  c.height = H * dpr;
  const g = c.getContext('2d')!;
  g.scale(dpr, dpr);
  g.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;
  const R = H * 0.46, r0 = 6;
  const n = Math.max(1, lines.length);
  const step = (R - r0) / n;
  // The stone itself.
  const stone = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  stone.addColorStop(0, '#4a3a40');
  stone.addColorStop(1, '#2a2028');
  g.fillStyle = stone;
  g.beginPath();
  g.arc(cx, cy, R + 2, 0, Math.PI * 2);
  g.fill();
  lines.forEach((line, i) => {
    const key = line.split('|')[2] ?? '';
    const r = r0 + (i + 0.5) * step;
    g.strokeStyle = RING_TINT[key] ?? '#c0b0b8';
    g.globalAlpha = i === hi ? 1 : 0.55;
    g.lineWidth = Math.max(1, step * (i === hi ? 0.9 : 0.6));
    g.beginPath();
    // Slightly wobbling, as stone grows.
    for (let a = 0; a <= 72; a++) {
      const th = (a / 72) * Math.PI * 2;
      const rr = r + step * (0.3 * Math.sin(th * 3 + i * 1.7) + 0.15 * Math.sin(th * 7 + i));
      const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr * 0.92;
      if (a === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  });
  g.globalAlpha = 1;
  return { cx, cy, r0, step };
}
