// Browser entry point: loads the save, catches up offline time, runs the frame loop.
//
// Debug URL params (used by tools/screenshot.ts and for testing):
//   ?t=<sec>      freeze the animation clock at <sec> and stop the sim (screenshots)
//   ?bot=<sec>    start from the state the headless bot reaches after <sec> of sim time
//   ?skip=<sec>   advance the loaded state by <sec> as if you had been away
//   ?speed=<x>    run the sim <x> times faster
//   ?fresh        ignore the stored save
//   ?seed=<n>     world seed for a new game
// With ?t, ?bot or ?fresh nothing is written to storage.
// Console: corallum.skip(seconds), corallum.state, corallum.speed = x

import { ACT1, type UpgradeId } from '../game/content/act1.ts';
import { createAbyssScene, type Focus, type ReefView } from '../game/render/abyss.ts';
import { runBot } from '../game/sim/bot.ts';
import { advance, buy, lure, rates, sweep } from '../game/sim/economy.ts';
import { deserialize, exportString, importString, serialize } from '../game/sim/save.ts';
import { newGame, type GameState } from '../game/sim/state.ts';
import { num } from '../game/ui/format.ts';
import { createPanel } from '../game/ui/panel.ts';

declare global {
  interface Window {
    corallum?: { state: GameState; skip(seconds: number): void; speed: number };
  }
}

const SAVE_KEY = 'corallum.save';
const AWAY_NOTICE = 60;

const params = new URLSearchParams(location.search);
const frozenT = params.has('t') ? Number(params.get('t')) : null;
const botT = params.has('bot') ? Number(params.get('bot')) : null;
const ephemeral = frozenT !== null || botT !== null || params.has('fresh');
const seed = Number(params.get('seed') ?? 20261026);

function storageGet(): string | null {
  try { return localStorage.getItem(SAVE_KEY); } catch { return null; }
}
function storageSet(text: string): void {
  try { localStorage.setItem(SAVE_KEY, text); } catch { /* private mode: play unsaved */ }
}

let state: GameState;
let savedAt = Date.now();
if (botT !== null) state = runBot((s) => s.t >= botT, botT).state;
else {
  const loaded = params.has('fresh') ? null : deserialize(storageGet() ?? '');
  state = loaded?.state ?? newGame(seed);
  if (loaded) savedAt = loaded.savedAt;
}

if (frozenT !== null) document.documentElement.classList.add('frozen');

const canvas = document.getElementById('world') as HTMLCanvasElement;
const ctx = canvas.getContext('2d', { alpha: false })!;
const ui = document.getElementById('ui')!;
const title = document.getElementById('title')!;
const scene = createAbyssScene(state.seed);

const panel = createPanel(ui, {
  buy(id: UpgradeId) {
    if (buy(state, id)) save();
  },
  exportSave: () => exportString(state, Date.now()),
  importSave(text) {
    const f = importString(text);
    if (!f) return false;
    state = f.state;
    save();
    location.reload();
    return true;
  },
  reset() {
    state = newGame(seed);
    save();
    location.reload();
  },
});
panel.primeBands(state);

function save(): void {
  if (ephemeral) return;
  savedAt = Date.now();
  storageSet(serialize(state, savedAt));
}

/** Advance by a long span and tell the player what happened while they were gone. */
function catchUp(seconds: number): void {
  const before = { calcite: state.calcite, glow: state.glow, height: state.height };
  advance(state, seconds);
  panel.showAway(seconds, {
    calcite: Math.max(0, state.calcite - before.calcite),
    glow: Math.max(0, state.glow - before.glow),
    metres: state.height - before.height,
  });
}

// Offline catch-up on load. Exact: the economy is closed-form and saturates by itself.
if (botT === null && frozenT === null) {
  const away = (Date.now() - savedAt) / 1000;
  if (away > AWAY_NOTICE && state.t > 0) catchUp(away);
  else if (away > 0) advance(state, away);
}
if (params.has('skip')) catchUp(Number(params.get('skip')));

let speed = Number(params.get('speed') ?? 1);
window.corallum = {
  get state() { return state; },
  skip: (sec: number) => catchUp(sec),
  get speed() { return speed; },
  set speed(x: number) { speed = x; },
};

// Layout: the panel covers the right side (wide screens) or the bottom (narrow ones);
// the scene frames the reef in what is left.
let dpr = 1;
function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(window.innerWidth * dpr);
  const h = Math.round(window.innerHeight * dpr);
  const r = panel.element.getBoundingClientRect();
  const side = r.left > window.innerWidth * 0.3;
  const focus: Focus = side
    ? { x: 0, y: 0, w: Math.round(r.left * dpr), h }
    : { x: 0, y: 0, w, h: Math.round(r.top * dpr) };
  canvas.width = w;
  canvas.height = h;
  scene.resize(w, h, dpr, focus);
}

function view(): ReefView {
  const r = rates(state);
  return {
    polyps: state.levels.polyp,
    symbionts: state.levels.symbiont,
    height: state.height,
    frameMetres: ACT1.goalMetres,
    glowLevel: r.lureMax > 0 ? (lure(r, state.glow) - 1) / r.lureMax : 0,
    sinceSweep: state.t - state.lastSweep,
  };
}

// Tapping the water sweeps the tentacles: a small burst of calcite.
canvas.addEventListener('pointerdown', (e) => {
  const gain = sweep(state);
  if (gain <= 0) return;
  const f = document.createElement('div');
  f.className = 'float';
  f.textContent = `+${num(gain)}`;
  f.style.left = `${e.clientX}px`;
  f.style.top = `${e.clientY}px`;
  ui.append(f);
  setTimeout(() => f.remove(), 1200);
});

let last = performance.now();
let lastSave = last;
let animT = 40;
let needResize = true;
function frame(now: number): void {
  if (needResize) { resize(); needResize = false; }
  const dt = Math.max(0, (now - last) / 1000);
  last = now;
  if (frozenT === null) {
    // A long gap means the tab slept; treat it like being away.
    if (dt > AWAY_NOTICE) catchUp(dt * speed);
    else advance(state, dt * speed);
    animT += Math.min(dt, 0.1);
  }
  scene.draw(ctx, frozenT ?? animT, view());
  panel.update(state);
  title.classList.toggle('faded', state.levels.polyp > 0 || state.t > 25);
  if (now - lastSave > 5000) { save(); lastSave = now; }
  if (frozenT === null) requestAnimationFrame(frame);
  else document.documentElement.dataset.ready = '1';
}

window.addEventListener('resize', () => { needResize = true; });
new ResizeObserver(() => { needResize = true; }).observe(panel.element);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
requestAnimationFrame(frame);
