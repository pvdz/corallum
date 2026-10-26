// Browser entry point: sizes the canvas to the device, runs the frame loop.
// URL params (used by tools/screenshot.ts): ?t=<seconds> freezes the clock at that time,
// ?seed=<n> picks the world seed.

import { createAbyssScene } from '../game/render/abyss.ts';

const canvas = document.getElementById('world') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;
const params = new URLSearchParams(location.search);
const frozenT = params.has('t') ? Number(params.get('t')) : null;
const seed = Number(params.get('seed') ?? 20261026);

const scene = createAbyssScene(seed);

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(window.innerWidth * dpr);
  const h = Math.round(window.innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    scene.resize(w, h, dpr);
  }
}

const start = performance.now();
function frame(now: number): void {
  resize();
  scene.draw(ctx, frozenT ?? (now - start) / 1000 + 40);
  if (frozenT === null) requestAnimationFrame(frame);
  else document.documentElement.dataset.ready = '1';
}

window.addEventListener('resize', resize);
requestAnimationFrame(frame);
