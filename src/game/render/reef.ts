// Draws one reef crown: the branching coral, its polyps, symbiont specks, and the purchase
// effects that play on it. Every zone scene owns one (with its own seed) and tells it where
// the reef stands and how much of it has grown.

import { generateCoral, thickness, type CoralForm } from './coral.ts';
import { glow, ring } from './draw.ts';
import { shy, spot } from './sightings.ts';
import { zoom, type EffectKind, type ReefView } from './scene.ts';

/** Where and how big the reef is drawn. */
export type ReefLayout = {
  cx: number;
  baseY: number;
  /** Pixels per reef unit (the coral is 1 unit tall when fully grown). */
  unit: number;
  /** General UI scale for polyps and glows. */
  s: number;
  dpr: number;
  /** Fraction of the coral grown, 0..1. */
  top: number;
  /** Fraction of the coral between growth-band lines. */
  bandStep: number;
  /** Colours (r,g,b) of the grains chosen for every tenth band, in order: those rings are tinted. */
  grains?: readonly string[];
  /** Colours of the stone: shadow, flesh, highlight. */
  palette?: [string, string, string];
  /** Polyp stalk and tentacle colours. */
  polyp?: [string, string];
  /** How strongly polyp tips and symbionts glow (the deep is 1; daylight washes it out). */
  glowScale?: number;
  /** Polyp size relative to the scene scale. */
  polypScale?: number;
  /** Encrusting life on the older stone: how much (0..1) and in which colours. */
  encrust?: number;
  encrustColours?: readonly string[];
};

const MAX_POLYPS = 90;
const MAX_SPECKS = 240;
/** `a` (#rrggbb or rgb()) mixed toward `b` by k (#rrggbb; anything else leaves `a`). */
function mixHex(a: string, b: string, k: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(b)) return a;
  const parts = (c: string): number[] => c.startsWith('#') ? [0, 1, 2].map((i) => parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16)) : (c.match(/\d+/g) ?? []).map(Number);
  const pa = parts(a), pb = parts(b);
  return `rgb(${[0, 1, 2].map((i) => Math.round(pa[i]! + (pb[i]! - pa[i]!) * k)).join(',')})`;
}

/** Old-stone knobs: points round the lump's outline. */
const KNOB_EDGE = 22;
const DEFAULT_PALETTE: [string, string, string] = ['#1d1026', '#6a3a50', 'rgba(255,170,160,0.22)'];

export function createReef(seed: number, form: CoralForm = 'fan', girth = 1) {
  const coral = generateCoral(seed, form);
  const radii = new Float32Array(coral.count);
  let radiiTop = -1;
  let visibleCount = 0;

  function refresh(L: ReefLayout): void {
    if (L.top === radiiTop) return;
    thickness(coral, L.top, radii);
    // Thick trunks read as sausages; cap the pipe model's growth, then apply the form's girth.
    for (let i = 0; i < radii.length; i++) radii[i] = Math.min(radii[i]!, 0.016) * girth;
    radiiTop = L.top;
    visibleCount = 0;
    for (let i = 0; i < coral.count; i++) if (coral.y[i]! <= L.top) visibleCount++;
  }

  /** Polyps shown: one per bought polyp, but never crowding the stone that is on screen. */
  function shownPolyps(L: ReefLayout, v: ReefView): number {
    refresh(L);
    return Math.min(MAX_POLYPS, 1 + v.polyps, 1 + Math.floor(visibleCount * 0.3));
  }

  // The branches are the reef's biggest drawing cost and barely move, so they are drawn into a
  // cache and redrawn only when the reef or its framing changes (no sway: it was about a pixel).
  let branchCache: HTMLCanvasElement | OffscreenCanvas | null = null;
  let branchKey = '';
  let cachedKey = '';
  let box = { x: 0, y: 0, w: 1, h: 1 };
  let steady = 0;
  let cachedBaseY = 0;
  function drawBranchesCached(ctx: CanvasRenderingContext2D, L: ReefLayout): void {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    // The base is keyed to 2 px: at the Breach it drifts by a fraction of a pixel every frame as the
    // crown rises, and the cached image is shifted by that drift instead of being redrawn.
    const key = `${w}x${h} ${L.cx} ${Math.round(L.baseY / 2)} ${L.unit} ${L.top.toFixed(3)} ${L.bandStep} ${(L.palette ?? DEFAULT_PALETTE).join()} ${L.grains?.join('/') ?? ''}`;
    // While the reef is still moving (settling after a band) the cache would be redrawn every
    // frame at extra cost: draw straight to the screen until it has held still for 30 frames.
    if (key !== branchKey) {
      branchKey = key;
      steady = 0;
    }
    if (zoom.k > 1 || (cachedKey !== key && ++steady < 30)) {
      drawBranches(ctx, L, 0);
      return;
    }
    if (cachedKey !== key) {
      // The cache covers only the reef's own box (a full-screen copy costs more than a small reef).
      refresh(L);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity;
      for (let i = 0; i < coral.count; i++) {
        if (coral.y[i]! > L.top) continue;
        const [x, y] = nodePx(L, i);
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
      }
      const pad = 0.04 * L.unit + 4;
      box = {
        x: Math.max(0, Math.floor(x0 - pad)), y: Math.max(0, Math.floor(y0 - pad)),
        w: 0, h: 0,
      };
      box.w = Math.max(1, Math.min(w, Math.ceil(x1 + pad)) - box.x);
      box.h = Math.max(1, Math.min(h, Math.ceil(L.baseY + pad)) - box.y);
      if (!branchCache || branchCache.width !== box.w || branchCache.height !== box.h) {
        branchCache = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(box.w, box.h) : document.createElement('canvas');
        branchCache.width = box.w;
        branchCache.height = box.h;
      }
      const c = branchCache.getContext('2d') as CanvasRenderingContext2D;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, box.w, box.h);
      c.translate(-box.x, -box.y);
      drawBranches(c, L, 0);
      cachedKey = key;
      cachedBaseY = L.baseY;
    }
    ctx.drawImage(branchCache!, box.x, box.y + (L.baseY - cachedBaseY));
  }

  function nodePx(L: ReefLayout, i: number): [number, number] {
    return [L.cx + coral.x[i]! * L.unit, L.baseY - coral.y[i]! * L.unit];
  }

  /** Nodes carrying polyps: the crown first, then the fixed settling order. */
  function polypNodes(L: ReefLayout, n: number): number[] {
    const out: number[] = [];
    let crown = 0;
    for (let i = 0; i < coral.count; i++) if (coral.y[i]! <= L.top && coral.y[i]! > coral.y[crown]!) crown = i;
    out.push(crown);
    for (let k = 0; k < coral.count && out.length < n; k++) {
      const i = coral.polypOrder[k]!;
      if (coral.y[i]! <= L.top && i !== crown && coral.parent[i]! >= 0) out.push(i);
    }
    return out;
  }

  function leanOf(i: number): number {
    const p = coral.parent[i]!;
    if (p < 0) return 0;
    const dx = coral.x[i]! - coral.x[p]!, dy = coral.y[i]! - coral.y[p]!;
    return Math.max(-1, Math.min(1, (dx / (Math.hypot(dx, dy) || 1)) * 1.6));
  }

  function crown(L: ReefLayout): [number, number] {
    if (L.top <= 0) return [L.cx, L.baseY];
    return nodePx(L, polypNodes(L, 1)[0]!);
  }

  function drawBranches(ctx: CanvasRenderingContext2D, L: ReefLayout, t: number): void {
    if (L.top <= 0) return;
    refresh(L);
    const u = L.unit;
    const minW = 1.2 * L.dpr;
    const [shadow, flesh, light] = L.palette ?? DEFAULT_PALETTE;
    ctx.lineCap = 'round';
    const passes: [string, number, number][] = [[shadow, 1.3, 0.15], [flesh, 1.0, 0], [light, 0.4, -0.35]];
    for (const [color, wMul, shift] of passes) {
      ctx.strokeStyle = color;
      for (let i = 0; i < coral.count; i++) {
        const r = radii[i]!;
        const p = coral.parent[i]!;
        if (r <= 0 || p < 0) continue;
        const [x0, y0] = nodePx(L, p);
        const [x1, y1] = nodePx(L, i);
        const lw = Math.max(minW, r * u * 2 * wMul);
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x0 + shift * lw * 0.5, y0);
        ctx.lineTo(x1 + shift * lw * 0.5, y1);
        ctx.stroke();
      }
    }
    // Corallites: the cups each polyp sits in, small pits with a pale rim along every thick branch.
    ctx.fillStyle = shadow;
    const rims: number[] = [];
    ctx.globalAlpha = 0.55;
    // Pits and rims each in one path (they rarely overlap).
    ctx.beginPath();
    for (let i = 0; i < coral.count; i++) {
      const r = radii[i]!;
      const p = coral.parent[i]!;
      if (r <= 0 || p < 0) continue;
      const lw = r * u * 2;
      if (lw < 5 * L.dpr) continue;
      const [x0, y0] = nodePx(L, p);
      const [x1, y1] = nodePx(L, i);
      const len = Math.hypot(x1 - x0, y1 - y0);
      const nx = -(y1 - y0) / (len || 1), ny = (x1 - x0) / (len || 1);
      const n = Math.floor(len / (lw * 0.55));
      for (let k = 0; k < n; k++) {
        const h = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
        const across = ((h - Math.floor(h)) - 0.5) * 0.7 * lw;
        const along = (k + 0.5) / n;
        const px = x0 + (x1 - x0) * along + nx * across, py = y0 + (y1 - y0) * along + ny * across;
        const pr = lw * 0.07 + 0.4 * L.dpr;
        ctx.moveTo(px + pr, py);
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        rims.push(px - pr * 0.4, py - pr * 0.5, pr * 0.55);
      }
    }
    ctx.fill();
    ctx.fillStyle = light;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    for (let k = 0; k < rims.length; k += 3) {
      ctx.moveTo(rims[k]! + rims[k + 2]!, rims[k + 1]!);
      ctx.arc(rims[k]!, rims[k + 1]!, rims[k + 2]!, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    // Growth bands: faint rings where the stone crossed each band line.
    if (L.bandStep > 0) {
      ctx.fillStyle = 'rgba(255,215,200,0.16)';
      for (let i = 0; i < coral.count; i++) {
        const r = radii[i]!;
        const p = coral.parent[i]!;
        if (r <= 0 || p < 0) continue;
        const ring = Math.floor(coral.y[i]! / L.bandStep);
        if (ring === Math.floor(coral.y[p]! / L.bandStep)) continue;
        const [x, y] = nodePx(L, i);
        const rw = Math.max(minW, r * u * 1.1);
        // Every tenth band carries the grain it set with, as a stronger coloured ring round the
        // stem: the front half of an ellipse, so zoomed in it wraps the branch instead of lying
        // across it as a flat bar.
        const grain = ring % 10 === 0 && ring > 0 ? L.grains?.[ring / 10 - 1] : undefined;
        if (grain) {
          const th = Math.max(2, L.dpr * 2.6), ry = rw * 0.28;
          ctx.lineWidth = Math.max(1, L.dpr);
          ctx.strokeStyle = 'rgba(30,14,24,0.5)';
          ctx.beginPath();
          ctx.ellipse(x, y + th * 0.75, rw * 1.04, ry, 0, 0, Math.PI);
          ctx.stroke();
          ctx.lineWidth = th;
          ctx.strokeStyle = `rgba(${grain},0.9)`;
          ctx.beginPath();
          ctx.ellipse(x, y - ry * 0.4, rw * 1.04, ry, 0, 0, Math.PI);
          ctx.stroke();
        } else ctx.fillRect(x - rw, y, rw * 2, Math.max(1, L.dpr * 0.7));
      }
    }
  }

  /**
   * Encrusting life on the older stone (the lower part of the reef): little sponges, tunicate
   * cups and lichen-like crusts, more of them as `encrust` rises. Fixed places per node.
   */
  function drawEncrusting(ctx: CanvasRenderingContext2D, L: ReefLayout, t: number): void {
    const colours = L.encrustColours ?? ['#c86a3c', '#7a4fb0', '#d9b44a'];
    const s = L.s * 2;
    const limit = L.top * 0.75;
    const want = Math.floor(coral.count * 0.35 * Math.min(1, L.encrust!));
    let drawn = 0;
    for (let k = 0; k < coral.count && drawn < want; k++) {
      // A fixed shuffle so the same nodes are always the encrusted ones.
      const i = (k * 7919) % coral.count;
      const y = coral.y[i]!;
      if (y > limit || coral.parent[i]! < 0 || radii[i]! <= 0) continue;
      drawn++;
      const [x, py] = nodePx(L, i);
      const side = (i * 0.618) % 1 < 0.5 ? -1 : 1;
      const off = radii[i]! * L.unit * 0.9 * side;
      const col = colours[i % colours.length]!;
      const kind = i % 3;
      ctx.fillStyle = col;
      if (kind === 0) {
        // A sponge: a little lumpy cushion.
        ctx.beginPath();
        ctx.ellipse(x + off, py, 3.2 * s, 2.2 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (kind === 1) {
        // A tunicate: a small open cup that breathes.
        const open = 1 + 0.15 * Math.sin(t * 0.8 + i);
        ctx.beginPath();
        ctx.ellipse(x + off, py - 1.5 * s, 1.8 * s, 3 * s * open, side * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(x + off + side * 0.8 * s, py - 3.6 * s * open, 0.9 * s, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // A crust: a flat smear of colour hugging the stone.
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.ellipse(x + off * 0.6, py, 4.5 * s, 1.4 * s, side * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  /** Plating: each layer of growth is a wide flat table, seen nearly edge-on. */
  const TABLE_LAYERS = [0.3, 0.52, 0.74, 0.96];
  function drawTables(ctx: CanvasRenderingContext2D, L: ReefLayout, t: number): void {
    const [shadow, flesh, light] = L.palette ?? DEFAULT_PALETTE;
    for (const ly of TABLE_LAYERS) {
      if (ly > L.top + 0.02) continue;
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < coral.count; i++) {
        if (coral.y[i]! > L.top || Math.abs(coral.y[i]! - ly) > 0.05) continue;
        lo = Math.min(lo, coral.x[i]!);
        hi = Math.max(hi, coral.x[i]!);
      }
      if (!(hi > lo)) continue;
      // A table grows out from its stem as the layer fills in.
      const grown = Math.min(1, (L.top - ly + 0.02) / 0.12);
      const mid = (lo + hi) / 2, half = ((hi - lo) / 2 + 0.03) * grown;
      const x = L.cx + mid * L.unit, y = L.baseY - ly * L.unit + Math.sin(t * 0.4 + ly * 9) * L.dpr;
      const rx = half * L.unit, ry = Math.max(3 * L.dpr, rx * 0.09);
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(x, y + ry * 0.5, rx * 1.02, ry * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flesh;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.1, y - ry * 0.35, rx * 0.8, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function polypPose(x: number, y: number, s: number, t: number, lean: number, phase: number): [number, number] {
    return [x + Math.sin(t * 0.6 + phase) * 2 * s + lean * 4 * s, y - 24 * s];
  }

  function drawPolyp(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, lean: number, phase: number, flick: number, colours: [string, string]): void {
    const [ox, oy] = polypPose(x, y, s, t, lean, phase);
    ctx.strokeStyle = colours[0];
    ctx.lineCap = 'round';
    ctx.lineWidth = 7 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x - 4 * s, y - 14 * s, ox, oy);
    ctx.stroke();
    ctx.strokeStyle = colours[1];
    ctx.lineWidth = 2.2 * s;
    const open = 1 - flick * 0.6;
    // The eight tentacles in one stroke.
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + lean * 0.4 + (i - 3.5) * 0.32 * open + Math.sin(t * 0.9 + i + phase) * 0.08;
      const len = (16 + Math.sin(t * 1.1 + i * 1.3 + phase) * 2) * s;
      const tx = ox + Math.cos(a) * len, ty = oy + Math.sin(a) * len;
      ctx.moveTo(ox, oy);
      ctx.quadraticCurveTo(ox + Math.cos(a - 0.4) * len * 0.6, oy + Math.sin(a - 0.4) * len * 0.6, tx, ty);
    }
    ctx.stroke();
  }

  /**
   * The aragonite lattice: tight-packed crystal in the stone catching the light, a few glints per
   * level, each twinkling now and then at a fixed place along the branches.
   */
  function drawGlints(ctx: CanvasRenderingContext2D, L: ReefLayout, lattice: number, t: number): void {
    const n = Math.min(lattice * 8, 64);
    const s = L.s;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < n; k++) {
      const i = (k * 7919 + 13) % coral.count;
      if (coral.y[i]! > L.top) continue;
      const tw = Math.max(0, Math.sin(t * (0.7 + (k % 5) * 0.23) + k * 2.1)) ** 8;
      if (tw < 0.03) continue;
      const [x, y] = nodePx(L, i);
      const r = 2.2 * s * (0.6 + 0.4 * tw);
      glow(ctx, x, y, r * 3, '220,240,255', 0.35 * tw);
      ctx.strokeStyle = `rgba(255,255,255,${0.8 * tw})`;
      ctx.lineWidth = 0.6 * s;
      ctx.beginPath();
      ctx.moveTo(x - r * 2, y);
      ctx.lineTo(x + r * 2, y);
      ctx.moveTo(x, y - r * 2);
      ctx.lineTo(x, y + r * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw(ctx: CanvasRenderingContext2D, L: ReefLayout, v: ReefView, t: number): void {
    const s = L.s;
    const [crx, cry] = crown(L);
    const hp = Math.min(1, L.top) * L.unit;
    const pulse = 0.75 + 0.25 * Math.sin(t * 1.3);
    const lit = 0.35 + 0.65 * v.glowLevel;
    // Each glimmerseed milestone makes the reef's own light a little stronger.
    const gs = (L.glowScale ?? 1) * (1 + 0.08 * v.glowTier);
    const colours = L.polyp ?? ['#ff9d86', 'rgba(255,190,170,0.9)'];

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, L.cx, L.baseY - hp * 0.55 - 30 * s, 230 * s + hp * 0.75, '60,190,255', 0.10 * pulse * (0.6 + lit) * gs);
    glow(ctx, crx, cry - 26 * s, 90 * s, '140,240,255', 0.28 * pulse * gs);
    ctx.restore();

    if (form === 'plating') drawTables(ctx, L, t);
    drawBranchesCached(ctx, L);
    if (L.encrust && L.encrust > 0) drawEncrusting(ctx, L, t);
    if (v.grotto > 0) drawGrottoes(ctx, L, v.grotto, t);
    if (v.lattice > 0) drawGlints(ctx, L, v.lattice, t);

    const nodes = polypNodes(L, shownPolyps(L, v));
    // Before the stone has grown, new polyps cluster around its foot on the silt.
    const footWanted = Math.min(12, 1 + v.polyps) - nodes.length;
    if (footWanted > 0) {
      const flickFoot = Math.max(0, 1 - v.sinceSweep / 0.35);
      for (let k = 0; k < footWanted; k++) {
        const side = k % 2 ? 1 : -1;
        const off = (8 + Math.floor(k / 2) * 9 + (k % 3) * 2) * s;
        drawPolyp(ctx, L.cx + side * off, L.baseY + (2 + (k % 3)) * s, s * (0.5 + 0.08 * (k % 4)), t, side * 0.5, k * 1.7, flickFoot, colours);
      }
    }
    const flick = Math.max(0, 1 - v.sinceSweep / 0.35);
    const tips: [number, number][] = [];
    /** The middle of each polyp's ring of tips (one halo a polyp). */
    const crowns: [number, number][] = [];
    // Side polyps first, crown polyp last so it sits on top.
    for (let k = nodes.length - 1; k >= 0; k--) {
      const i = nodes[k]!;
      const [x, y] = nodePx(L, i);
      // Each polyp milestone fills the polyps out a little.
      const ps = s * (L.polypScale ?? 1) * (1 + 0.06 * v.polypTier) * (k === 0 ? 1 : 0.42 + 0.25 * ((i * 0.618) % 1));
      const lean = k === 0 ? 0 : leanOf(i);
      drawPolyp(ctx, x, y, ps, t, lean, i * 0.37, Math.max(flick, shy(x, y, t, 70 * s)), colours);
      const [ox, oy] = polypPose(x, y, ps, t, lean, i * 0.37);
      let hx = 0, hy = 0;
      for (let q = 0; q < 8; q += 2) {
        const a = -Math.PI / 2 + lean * 0.4 + (q - 3.5) * 0.32;
        const tx = ox + Math.cos(a) * 16 * ps, ty = oy + Math.sin(a) * 16 * ps;
        tips.push([tx, ty]);
        hx += tx / 4; hy += ty / 4;
      }
      crowns.push([hx, hy]);
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Feeding: with plankton in the water, motes drift in to the tentacle tips and vanish there.
    if (v.planktonLevel > 0.05 && tips.length) {
      const n = Math.round(60 * v.planktonLevel);
      for (let k = 0; k < n; k++) {
        const [tx, ty] = tips[(k * 7) % tips.length]!;
        const u = (t * 0.45 + k * 0.371) % 1;
        const a = k * 2.399;
        const d = (1 - u) * 34 * s;
        const mx = tx + Math.cos(a) * d, my = ty + Math.sin(a) * d * 0.7 - (1 - u) * 6 * s;
        glow(ctx, mx, my, 11 * s, '170,255,150', 0.45 * Math.sin(u * Math.PI));
        glow(ctx, mx, my, 3.5 * s, '235,255,220', 0.95 * Math.sin(u * Math.PI));
      }
    }
    // The tentacle tips' light: one soft halo over each polyp's ring of tips (its four glows
    // overlapped into one anyway), and each tip a bright point, the points in a few batched fills.
    // A sweep combo running: the tips burn brighter with every sweep in the row.
    const heat = Math.min(1, ((v.combo ?? 1) - 1) / 10);
    crowns.forEach(([hx, hy], k) => {
      const p = 0.6 + 0.4 * Math.sin(t * 2 + k * 3.2);
      glow(ctx, hx, hy, 13 * s * (1 + heat * 0.25), '160,250,255', Math.min(1, 0.8 * p * gs * (1 + heat * 0.4)));
    });
    if (gs > 0.02) {
      const pts = [new Path2D(), new Path2D(), new Path2D()];
      const pr = Math.max(0.7 * L.dpr, 1.3 * s);
      tips.forEach(([tx, ty], i) => {
        const q = Math.min(2, Math.floor((0.5 + 0.5 * Math.sin(t * 2 + i * 0.8)) * 3));
        pts[q]!.moveTo(tx + pr, ty);
        pts[q]!.arc(tx, ty, pr, 0, Math.PI * 2);
      });
      pts.forEach((path, q) => {
        ctx.fillStyle = `rgba(200,252,255,${Math.min(1, (0.35 + 0.25 * q) * gs * (1 + heat * 0.4)).toFixed(3)})`;
        ctx.fill(path);
      });
    }
    // Glimmerseed symbionts speckle the branches.
    const specks = Math.min(MAX_SPECKS, v.symbionts * 6, Math.floor(visibleCount * 0.6));
    for (let k = 0, shown = 0; k < coral.count && shown < specks; k++) {
      const i = (k * 7919) % coral.count;
      if (coral.y[i]! > L.top) continue;
      shown++;
      const [x, y] = nodePx(L, i);
      const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + (i % 7) * 0.2) + i);
      glow(ctx, x, y, 5 * s * (0.6 + (i % 5) * 0.2), v.strainRgb || '120,255,210', (0.25 + 0.6 * lit) * tw * gs);
    }
    // Under every full moon, long before the surface, the reef remembers: a few pink bundles
    // slip from the polyps and drift up into the dark (the Breach draws the real spawning).
    if (v.moonFull && v.height < 3980) {
      for (let k = 0; k < 16; k++) {
        const i = nodes[(k * 7) % Math.max(1, nodes.length)];
        if (i === undefined) break;
        const [x, y] = nodePx(L, i);
        const u = ((t * 0.06 + k * 0.173) % 1);
        const a = Math.sin(u * Math.PI);
        const bx = x + Math.sin(t * 0.8 + k) * 10 * s * u, by = y - u * 260 * s;
        glow(ctx, bx, by, 12 * s, '255,120,190', a * 0.55);
        glow(ctx, bx, by, 3.5 * s, '255,215,235', a);
      }
    }
    ctx.restore();
    if (v.old && (v.old.slots.length || v.old.since < 2 || (v.old.fall && v.old.fall.since < 6))) drawOld(ctx, L, v.old, t);
  }

  /** Branch tips (no child) on screen, in a fixed scattered order: where old stone gathers. */
  let tipsTop = -1;
  let tipNodes: number[] = [];
  function oldTips(L: ReefLayout): number[] {
    if (L.top === tipsTop) return tipNodes;
    tipsTop = L.top;
    const hasChild = new Uint8Array(coral.count);
    for (let i = 0; i < coral.count; i++) {
      const p = coral.parent[i]!;
      if (p >= 0 && coral.y[i]! <= L.top) hasChild[p] = 1;
    }
    const tips: number[] = [];
    for (let i = 0; i < coral.count; i++) if (!hasChild[i] && coral.y[i]! <= L.top && coral.parent[i]! >= 0) tips.push(i);
    // Spread over the reef: below the crown, highest first, each well apart from those taken.
    tips.sort((a, b) => coral.y[b]! - coral.y[a]!);
    const top = coral.y[tips[0] ?? 0] ?? 0;
    tipNodes = [];
    for (const gap of [0.12, 0.07, 0.03, 0]) {
      for (const i of tips) {
        if (tipNodes.length >= 6 || tipNodes.includes(i) || coral.y[i]! > top * 0.97) continue;
        if (tipNodes.every((j) => Math.hypot(coral.x[i]! - coral.x[j]!, coral.y[i]! - coral.y[j]!) >= gap * Math.max(0.3, top))) tipNodes.push(i);
      }
    }
    while (tipNodes.length < 6) tipNodes.push(-1);
    return tipNodes;
  }

  /** Where the old-stone knob in `slot` sits (device pixels), or null if the reef has no tip for it. */
  function oldAt(L: ReefLayout, slot: number): [number, number] | null {
    const i = oldTips(L)[slot];
    if (i === undefined || i < 0) return null;
    return nodePx(L, i);
  }

  /** Grottoes: arched dark hollows in a mound of stone at the reef's foot; a resident's eyes glint inside. */
  function drawGrottoes(ctx: CanvasRenderingContext2D, L: ReefLayout, n: number, t: number): void {
    const s = L.s;
    const [shadow, flesh] = L.palette ?? DEFAULT_PALETTE;
    for (let k = 0; k < n; k++) {
      const side = k === 0 ? -1 : 1;
      const x = L.cx + side * (34 + 10 * k) * s, y = L.baseY + 2 * s;
      const rw = 22 * s, rh = 20 * s;
      ctx.save();
      // The mound.
      ctx.fillStyle = flesh;
      ctx.beginPath();
      ctx.ellipse(x, y, rw * 1.25, rh * 1.15, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = shadow;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(x + rw * 0.3, y, rw * 0.9, rh * 0.95, 0, Math.PI, 0);
      ctx.fill();
      ctx.globalAlpha = 1;
      // The hollow, deep dark.
      const g = ctx.createRadialGradient(x, y - rh * 0.2, 0, x, y - rh * 0.2, rw * 0.7);
      g.addColorStop(0, '#020308');
      g.addColorStop(1, '#0c0f1a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, y, rw * 0.55, rh * 0.75, 0, Math.PI, 0);
      ctx.fill();
      // Two small eyes, now and then.
      const blink = Math.sin(t * 0.7 + k * 2.4);
      if (blink > -0.2) {
        ctx.fillStyle = `rgba(255,236,170,${Math.min(1, (blink + 0.2) * 2)})`;
        for (const ex of [-3.2, 3.2]) {
          ctx.beginPath();
          ctx.arc(x + ex * s + Math.sin(t * 0.3 + k) * 3 * s, y - rh * 0.35, 1.5 * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  /** Grey knobs of old stone on the tips (tappable), and the last one broken off tumbling down. */
  function drawOld(ctx: CanvasRenderingContext2D, L: ReefLayout, old: ReefView['old'], t: number): void {
    const s = L.s;
    // Ashen grey taking on the reef's own stone (whose colours each scene sets for its light), so
    // at night the knobs are not the brightest thing on the reef.
    const [shadow, flesh] = L.palette ?? DEFAULT_PALETTE;
    const lum = /^#[0-9a-f]{6}$/i.test(flesh) ? (0.299 * parseInt(flesh.slice(1, 3), 16) + 0.587 * parseInt(flesh.slice(3, 5), 16) + 0.114 * parseInt(flesh.slice(5, 7), 16)) / 255 : 0.45;
    const dark = Math.min(0.35, Math.max(0, (0.45 - lum) * 1.5));
    const knobTone = [mixHex(mixHex('#bdb9b1', flesh, 0.2), shadow, dark), mixHex(mixHex('#85817a', flesh, 0.25), shadow, dark), mixHex('#4a4844', shadow, 0.5)] as const;
    const knob = (x: number, y: number, r: number, rot: number, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.globalAlpha = a;
      // Grey skeleton (the stone kept too long, 'the grey on the tips'): one ashen, knotted lump
      // with no living tissue, its outline lumpy and a little taller than wide, lit from above.
      ctx.beginPath();
      for (let k = 0; k <= KNOB_EDGE; k++) {
        const a = (k / KNOB_EDGE) * Math.PI * 2;
        const rr = r * (1 + 0.16 * Math.sin(3 * a + 1) + 0.09 * Math.sin(5 * a + 2.3) + 0.05 * Math.sin(8 * a));
        const px = Math.cos(a) * rr * 0.95, py = Math.sin(a) * rr * 1.08 - 0.1 * r;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.lineWidth = 2.4 * s;
      ctx.strokeStyle = 'rgba(30,30,32,0.45)';
      ctx.stroke();
      const g = ctx.createRadialGradient(-0.35 * r, -0.55 * r, 0, 0, 0, 1.2 * r);
      g.addColorStop(0, knobTone[0]);
      g.addColorStop(0.55, knobTone[1]);
      g.addColorStop(1, knobTone[2]);
      ctx.fillStyle = g;
      ctx.fill();
      // A paler lobe where the light falls (top left): volume, without features to read as a face.
      ctx.fillStyle = 'rgba(220,216,206,0.22)';
      ctx.beginPath();
      ctx.ellipse(-0.3 * r, -0.45 * r, 0.5 * r, 0.36 * r, -0.5, 0, Math.PI * 2);
      ctx.fill();
      // The empty cups the polyps left: small dark pits on the lit faces.
      ctx.fillStyle = 'rgba(48,46,44,0.5)';
      ctx.beginPath();
      // Spread evenly over the lump (a golden-angle spiral), so no two read as a pair of eyes.
      for (let k = 0; k < 14; k++) {
        const a = k * 2.399, d = 0.82 * r * Math.sqrt((k + 0.5) / 14);
        const px = Math.cos(a) * d * 0.95, py = Math.sin(a) * d * 1.05 - 0.1 * r, pr = Math.max(0.6, (0.6 + 0.4 * ((k * 0.618) % 1)) * s);
        ctx.moveTo(px + pr, py);
        ctx.arc(px, py, pr, 0, Math.PI * 2);
      }
      ctx.fill();
      // A crack across it that breathes: it is ready to break.
      ctx.strokeStyle = `rgba(40,38,36,${0.45 + 0.3 * Math.sin(t * 2.2 + x * 0.01)})`;
      ctx.lineWidth = Math.max(1, 1.1 * s);
      ctx.beginPath();
      ctx.moveTo(-0.15 * r, -1.05 * r);
      ctx.lineTo(0.05 * r, -0.55 * r);
      ctx.lineTo(-0.12 * r, -0.15 * r);
      ctx.lineTo(0.14 * r, 0.3 * r);
      ctx.stroke();
      ctx.restore();
    };
    for (const slot of old.slots) {
      const p = oldAt(L, slot);
      if (!p) continue;
      const r = 13 * s;
      // A slow shimmer of dust shows it is ready to fall.
      const wob = Math.sin(t * 1.7 + slot * 2.1) * 0.08;
      knob(p[0], p[1] - r * 0.5, r, wob, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      glow(ctx, p[0], p[1] - r * 0.5, r * 2.4, '200,190,170', 0.06 + 0.04 * Math.sin(t * 2 + slot));
      ctx.restore();
      spot('old', p[0], p[1] - r * 0.5, Math.max(22 * s, 18), slot);
    }
    // The release: every knob lets go, one after another, and tumbles down past the branches.
    if (old.fall && old.fall.since >= 0 && old.fall.since < 6) {
      old.fall.slots.forEach((slot, k) => {
        const p = oldAt(L, slot);
        const u = old.fall!.since - 0.5 - k * 0.6;
        if (!p) return;
        if (u < 0) { knob(p[0], p[1] - 6.5 * s, 13 * s, 0, 1); return; }
        if (u > 2.5) return;
        const y = Math.min(p[1] + 0.5 * 700 * s * u * u, L.baseY);
        knob(p[0] + (k % 2 ? 1 : -1) * 30 * s * u, y, 13 * s, u * 4 * (k % 2 ? 1 : -1), Math.max(0, 1 - u / 2.5));
      });
    }
    if (old.since >= 0 && old.since < 2 && old.slot >= 0) {
      const p = oldAt(L, old.slot);
      if (p) {
        const u = old.since;
        const fall = 0.5 * 900 * s * u * u;
        const x = p[0] + 40 * s * u, y = p[1] + fall;
        knob(x, Math.min(y, L.baseY), 13 * s, u * 5, Math.max(0, 1 - u / 2));
        // A puff of pale dust where it broke.
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let k = 0; k < 7; k++) {
          const a = k * 0.9 + old.slot;
          glow(ctx, p[0] + Math.cos(a) * 30 * s * u, p[1] - 4 * s + Math.sin(a) * 20 * s * u, 6 * s, '230,220,200', 0.45 * Math.max(0, 1 - u));
        }
        ctx.restore();
      }
    }
  }

  /** Purchase flourishes on the reef. Returns kinds it did not handle (scene-specific). */
  function drawEffects(
    ctx: CanvasRenderingContext2D, L: ReefLayout, v: ReefView,
    live: { kind: EffectKind; age: number; start: number }[],
  ): void {
    const s = L.s;
    const u = L.unit;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // Light alone vanishes over bright water: some flourishes also paint a little colour.
    const painted = (fn: () => void) => {
      ctx.globalCompositeOperation = 'source-over';
      fn();
      ctx.globalCompositeOperation = 'lighter';
    };
    for (const fx of live) {
      const k = fx.age / 2.2;
      switch (fx.kind) {
        case 'polyp': {
          const nodes = polypNodes(L, shownPolyps(L, v));
          const [x, y] = nodePx(L, nodes[nodes.length - 1]!);
          glow(ctx, x, y - 10 * s, (20 + 50 * k) * s, '255,200,180', 0.7 * (1 - k));
          ring(ctx, x, y - 10 * s, (6 + 60 * k) * s, '255,190,170', 0.6 * (1 - k), 2 * s);
          break;
        }
        case 'skeleton': {
          // A new band runs up through the stone: the branches light where it passes, under a
          // soft sash of light that fades out at both sides.
          const rise = 1 - (1 - Math.min(1, fx.age / 1.4)) ** 2;
          const yy = L.baseY - rise * Math.min(1, L.top) * u;
          const a = 0.5 * (1 - k);
          ctx.save();
          ctx.translate(L.cx, yy);
          ctx.scale(1, 0.09);
          glow(ctx, 0, 0, u * 0.42, '255,190,160', a);
          ctx.restore();
          const reach = 30 * s;
          for (let i = 0; i < coral.count; i++) {
            if (coral.y[i]! > L.top) continue;
            const y = L.baseY - coral.y[i]! * u;
            const d = Math.abs(y - yy);
            if (d > reach) continue;
            glow(ctx, L.cx + coral.x[i]! * u, y, 11 * s, '255,214,186', a * 1.6 * (1 - d / reach));
          }
          break;
        }
        case 'symbiont': {
          for (let i = 0; i < 14; i++) {
            const node = (i * 7919 + Math.floor(fx.start * 13)) % coral.count;
            if (coral.y[node]! > L.top) continue;
            const [tx, ty] = nodePx(L, node);
            const ease = 1 - (1 - Math.min(1, fx.age / 1.4)) ** 3;
            const mx = tx + Math.sin(i * 2.3) * 120 * s * (1 - ease), my = ty - 220 * s * (1 - ease);
            glow(ctx, mx, my, 7 * s, '120,255,210', 0.9 * (1 - k * 0.7));
            painted(() => {
              ctx.fillStyle = `rgba(30,190,140,${0.8 * (1 - k)})`;
              ctx.beginPath();
              ctx.arc(mx, my, 2.4 * s, 0, Math.PI * 2);
              ctx.fill();
            });
          }
          break;
        }
        case 'lure': {
          const [cx, cy] = crown(L);
          for (let i = 0; i < 3; i++) {
            const kk = Math.max(0, k * 1.4 - i * 0.18);
            if (kk > 0 && kk < 1) ring(ctx, cx, cy - 20 * s, (10 + kk * 260) * s, '120,240,255', 0.5 * (1 - kk), 2.5 * s);
          }
          break;
        }
        case 'lattice': {
          const top = Math.min(1, L.top);
          glow(ctx, L.cx, L.baseY - top * u * 0.5, top * u * 0.7 + 60 * s, '255,230,220', 0.25 * Math.sin(Math.PI * k));
          break;
        }
        case 'shoal': {
          const [cx, cy] = crown(L);
          ring(ctx, cx, cy - 20 * s, (30 + k * 180) * s, '255,230,150', 0.35 * (1 - k), 1.5 * s);
          painted(() => ring(ctx, cx, cy - 20 * s, (30 + k * 180) * s, '60,120,200', 0.3 * (1 - k), 1.2 * s));
          break;
        }
        case 'wish': {
          // A wish: one bright star falls out of the sky into the crown, and the crown flares.
          const [cx, cy] = crown(L);
          const fall = Math.min(1, fx.age / 0.9);
          const sx = cx + 420 * s * (1 - fall), sy = cy - 520 * s * (1 - fall);
          if (fall < 1) {
            const g = ctx.createLinearGradient(sx + 80 * s, sy - 100 * s, sx, sy);
            g.addColorStop(0, 'rgba(255,230,160,0)');
            g.addColorStop(1, 'rgba(255,240,200,0.95)');
            ctx.strokeStyle = g;
            ctx.lineWidth = 3 * s;
            ctx.beginPath();
            ctx.moveTo(sx + 80 * s, sy - 100 * s);
            ctx.lineTo(sx, sy);
            ctx.stroke();
            glow(ctx, sx, sy, 16 * s, '255,235,180', 0.9);
          } else {
            const f = (fx.age - 0.9) / 1.3;
            if (f < 1) {
              glow(ctx, cx, cy - 10 * s, (40 + 140 * f) * s, '255,220,140', 0.6 * (1 - f));
              ring(ctx, cx, cy - 10 * s, (20 + 160 * f) * s, '255,230,170', 0.5 * (1 - f), 2 * s);
            }
          }
          break;
        }
        case 'truce': {
          // A choice made: two slow rose-gold rings spreading from the reef's heart.
          const top = Math.min(1, L.top);
          const cy = L.baseY - top * u * 0.45;
          ring(ctx, L.cx, cy, (40 + k * 320) * s, '255,165,140', 0.5 * (1 - k), 2 * s);
          if (k > 0.2) ring(ctx, L.cx, cy, (40 + (k - 0.2) * 320) * s, '255,165,140', 0.35 * (1 - k), 1.2 * s);
          glow(ctx, L.cx, cy, top * u * 0.5 + 40 * s, '255,210,180', 0.2 * Math.sin(Math.PI * k));
          painted(() => ring(ctx, L.cx, cy, (40 + k * 320) * s, '200,90,80', 0.3 * (1 - k), 1.5 * s));
          break;
        }
        case 'reading': {
          // A band read: blue light climbing the reef from the foot to the crown.
          const top = Math.min(1, L.top);
          const y = L.baseY - k * top * u;
          glow(ctx, L.cx, y, 80 * s, '140,200,255', 0.45 * Math.sin(Math.PI * k));
          // The branches it passes take the colour too (painted, so it shows in daylight).
          painted(() => {
            ctx.fillStyle = `rgba(70,150,255,${0.75 * Math.sin(Math.PI * k)})`;
            for (let i = 0; i < coral.count; i += 2) {
              if (coral.y[i]! > L.top) continue;
              const ny = L.baseY - coral.y[i]! * u;
              if (Math.abs(ny - y) > 26 * s) continue;
              ctx.beginPath();
              ctx.arc(L.cx + coral.x[i]! * u, ny, 3 * s, 0, Math.PI * 2);
              ctx.fill();
            }
          });
          break;
        }
        case 'pigment': {
          // A new colour washes up through the reef from the foot: a band of rose, gold and green
          // light climbing the branches, and sparks of it left behind.
          const top = Math.min(1, L.top);
          const by = L.baseY - Math.min(1, k * 1.3) * top * u;
          const a = 0.7 * Math.sin(Math.PI * Math.min(1, k * 1.3));
          // Rose, gold and green side by side, each a soft sash that fades at every edge.
          ctx.save();
          ctx.translate(L.cx, by);
          ctx.scale(1, 0.09);
          glow(ctx, -u * 0.14, 0, u * 0.22, '255,110,170', a);
          glow(ctx, 0, 0, u * 0.22, '255,215,90', a);
          glow(ctx, u * 0.14, 0, u * 0.22, '120,240,170', a);
          ctx.restore();
          for (let i = 0; i < 48; i++) {
            const node = (i * 4513 + Math.floor(fx.start * 7)) % coral.count;
            if (coral.y[node]! > Math.min(top, k * 1.3 * top)) continue;
            const [tx, ty] = nodePx(L, node);
            const col = ['255,110,170', '255,215,90', '120,240,170'][i % 3]!;
            glow(ctx, tx, ty, 16 * s, col, 0.8 * (1 - k));
            // Painted as well as lit, so it shows in daylight too.
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = `rgba(${col},${0.85 * (1 - k)})`;
            ctx.beginPath();
            ctx.arc(tx, ty, 6 * s * (1 + k), 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
          }
          break;
        }
        case 'settled': {
          // The reef has reached the height of its last band: the crown brightens once and rests.
          const [cx, cy] = crown(L);
          const a = Math.sin(Math.PI * Math.min(1, fx.age / 1.4));
          glow(ctx, cx, cy - 6 * s, (30 + 50 * k) * s, '255,226,200', 0.35 * a);
          painted(() => ring(ctx, cx, cy - 6 * s, (14 + 70 * k) * s, '255,200,170', 0.35 * (1 - k), 1.2 * s));
          break;
        }
        case 'canopy': {
          // The branches lean open to the light: a soft gold bloom over the crown.
          const [cx, cy] = crown(L);
          glow(ctx, cx, cy - 30 * s, (60 + 160 * k) * s, '255,240,170', 0.4 * Math.sin(Math.PI * k));
          painted(() => ring(ctx, cx, cy - 30 * s, (40 + 200 * k) * s, '230,170,40', 0.55 * (1 - k), 2.5 * s));
          break;
        }
        case 'ripen': {
          // The spawn ripens: pink lights swell in the polyps and fade.
          const nodes = polypNodes(L, shownPolyps(L, v));
          for (let i = 0; i < nodes.length; i += 3) {
            const [tx, ty] = nodePx(L, nodes[i]!);
            glow(ctx, tx, ty - 6 * s, 8 * s, '255,140,200', 0.7 * Math.sin(Math.PI * k));
          }
          painted(() => {
            ctx.fillStyle = `rgba(240,90,160,${0.8 * Math.sin(Math.PI * k)})`;
            for (let i = 0; i < nodes.length; i += 3) {
              const [tx, ty] = nodePx(L, nodes[i]!);
              ctx.beginPath();
              ctx.arc(tx, ty - 6 * s, 3.2 * s * (0.6 + 0.6 * Math.sin(Math.PI * k)), 0, Math.PI * 2);
              ctx.fill();
            }
          });
          break;
        }
        case 'meadow':
        case 'sandbar':
        case 'channel':
        case 'grounds': {
          // Work on the floor: a puff of pale sand spreading at the reef's foot.
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = fx.kind === 'meadow' ? `rgba(120,200,110,${0.45 * (1 - k)})` : `rgba(235,215,170,${0.55 * (1 - k)})`;
          for (const side of [-1, 1]) {
            for (let p = 0; p < 5; p++) {
              const x = L.cx + side * (30 + (60 + p * 25) * k) * s, y = L.baseY - (4 + p * 5 * k) * s;
              ctx.beginPath();
              ctx.ellipse(x, y, (10 + 18 * k) * s, (5 + 6 * k) * s, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          ctx.globalCompositeOperation = 'lighter';
          break;
        }
        default:
          break;
      }
    }
    ctx.restore();
  }

  /**
   * Caustics on the stone: two crossing wave trains make a moving net of light and only its bright
   * crests light the branches. `strength` 0..1; only nodes below `belowY` (under the water).
   */
  function drawCaustics(ctx: CanvasRenderingContext2D, L: ReefLayout, t: number, strength: number, rgb: string, belowY = -Infinity): void {
    if (strength <= 0.05) return;
    const s = L.s;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < coral.count; i += 2) {
      if (coral.y[i]! > L.top || coral.parent[i]! < 0) continue;
      const [x, y] = nodePx(L, i);
      if (y < belowY) continue;
      const u = x / (14 * s), v = y / (14 * s);
      const net = Math.sin(u + t * 0.9) * Math.sin(v * 0.8 - t * 0.7) + Math.sin((u + v) * 0.7 + t * 0.5);
      const a = Math.max(0, net - 0.6) * 0.6 * strength;
      if (a < 0.02) continue;
      glow(ctx, x, y, 12 * s, rgb, Math.min(0.6, a));
    }
    ctx.restore();
  }

  return { draw, drawEffects, drawCaustics, crown, nodePx, coral };
}

export type Reef = ReturnType<typeof createReef>;
