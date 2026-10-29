// Small canvas drawings for the panel's cards: the shards' tablet and the map of Thousandfold.

import { CITY_MAP, SITES } from '../content/expeditions.ts';
import { SHARD_LINES } from '../content/shards.ts';

/** The buried city from above: concentric wall rings, the five ruins (lit when searched), roam paths. */
export function drawCity(c: HTMLCanvasElement, found: readonly string[], roams: number, seed: number): void {
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
  lonely: '#9fd8ff', buried: '#a9a49a', dark: '#6a6a90', shallow: '#f0c080', thorny: '#c06a8a',
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
    g.fillStyle = 'rgba(120,220,210,0.25)';
    g.beginPath();
    g.arc(x, y, r + 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = SEAMOUNT_TINT[sm ?? 'plain'] ?? '#c98a9a';
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,245,230,0.8)';
    g.font = '9px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText(String(i + 1), x, y - r - 6);
  });
}
