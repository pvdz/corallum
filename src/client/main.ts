// Browser entry point: loads the save, catches up offline time, runs the frame loop.
//
// Debug URL params (used by tools/screenshot.ts and for testing):
//   ?t=<sec>      freeze the animation clock at <sec> and stop the sim (screenshots)
//   ?bot=<sec>    start from the state the headless bot reaches after <sec> of sim time
//                 (&truce=aab and &dialects=massive,mucus,brooding steer its choices)
//   ?skip=<sec>   advance the loaded state by <sec> as if you had been away
//   ?speed=<x>    run the sim <x> times faster
//   ?fresh        ignore the stored save
//   ?seed=<n>     world seed for a new game
// With ?t, ?bot or ?fresh nothing is written to storage.
// Console: corallum.skip(seconds), corallum.state, corallum.speed = x

import type { UpgradeId } from '../game/content/types.ts';
import { act, actAt } from '../game/content/acts.ts';
import { createAbyssScene } from '../game/render/abyss.ts';
import { createMidnightScene } from '../game/render/midnight.ts';
import { createBreachScene } from '../game/render/breach.ts';
import { createSunlitScene } from '../game/render/sunlit.ts';
import { createTwilightScene } from '../game/render/twilight.ts';
import type { Focus, ReefView, Scene } from '../game/render/scene.ts';
import { runBot } from '../game/sim/bot.ts';
import { advance, assign, breach, buy, choose, ended, moonFull, moonPhase, spawnTarget, feeding, lure, rates, read, setRasp, smother, speak, sweep } from '../game/sim/economy.ts';
import { deserialize, exportString, importString, serialize } from '../game/sim/save.ts';
import { newGame, type GameState } from '../game/sim/state.ts';
import { num } from '../game/ui/format.ts';
import { createFinale } from '../game/ui/finale.ts';
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
if (botT !== null) {
  const tr = params.get('truce');
  const dl = params.get('dialects')?.split(',');
  state = runBot((s) => s.t >= botT, botT, {
    truce: tr ? { terms: tr[0] === 'b' ? 'b' : 'a', story: tr[1] === 'b' ? 'b' : 'a', wall: tr[2] === 'b' ? 'b' : 'a' } : undefined,
    dialects: dl ? ({ form: dl[0], craft: dl[1], spawn: dl[2] } as never) : undefined,
  }).state;
}
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
// One scene per zone; the zone follows the reef's height, with a crossfade between them.
const scenes: Scene[] = [createAbyssScene(state.seed), createMidnightScene(state.seed), createTwilightScene(state.seed), createSunlitScene(state.seed),
  createBreachScene(state.seed)];
const sceneFor = (height: number) => scenes[Math.min(scenes.length, actAt(height)) - 1]!;
let scene = sceneFor(state.height);
let fadingFrom: Scene | null = null;
let fadeStart = 0;
const FADE = 3;
const fadeCanvas = document.createElement('canvas');
const fadeCtx = fadeCanvas.getContext('2d', { alpha: false })!;
const zoneTitle = document.createElement('div');
zoneTitle.id = 'zone-title';

const panel = createPanel(ui, {
  buy(id: UpgradeId) {
    if (!buy(state, id)) return;
    scene.effect(id);
    save();
  },
  assign(job, delta) {
    if (assign(state, job, delta)) save();
  },
  read(id) {
    if (!read(state, id)) return;
    scene.effect('reading');
    save();
  },
  setRasp(n) {
    setRasp(state, n);
  },
  speak(id) {
    if (!speak(state, id)) return;
    scene.effect('truce');
    save();
  },
  choose(id, choice) {
    if (!choose(state, id, choice)) return;
    scene.effect('truce');
    save();
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
panel.primeStories(state);

const finale = createFinale(ui, panel.growPage, {
  breach(memories) {
    if (!breach(state, memories)) return false;
    scene.effect('breach');
    save();
    return true;
  },
  done() {
    document.documentElement.classList.add('ended');
  },
});
if (ended(state)) document.documentElement.classList.add('ended');
const replay = document.createElement('button');
replay.className = 'plain';
replay.textContent = 'Read the ending again';
replay.addEventListener('click', () => finale.replay());
panel.reefPage.prepend(replay);

// Another tab (or a pasted save) may write the same storage. Before each write, check the
// stored save is still the one this page wrote; if not, stop writing so neither tab clobbers
// the other, and say so.
let ownSavedAt: number | null = botT === null && !params.has('fresh') ? savedAt : null;
let yielded = false;
function save(): void {
  if (ephemeral || yielded) return;
  const stored = storageGet();
  if (stored && ownSavedAt !== null && deserialize(stored)?.savedAt !== ownSavedAt) {
    yielded = true;
    document.documentElement.classList.add('yielded');
    return;
  }
  savedAt = Date.now();
  storageSet(serialize(state, savedAt));
  ownSavedAt = savedAt;
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
  canvas.width = fadeCanvas.width = w;
  canvas.height = fadeCanvas.height = h;
  for (const sc of scenes) sc.resize(w, h, dpr, focus);
}

function view(): ReefView {
  const r = rates(state);
  return {
    polyps: state.levels.polyp,
    symbionts: state.levels.symbiont,
    height: state.height,
    glowLevel: r.lureMax > 0 ? (lure(r, state.glow) - 1) / r.lureMax : 0,
    sinceSweep: state.t - state.lastSweep,
    vent: state.levels.vent,
    shoals: state.levels.shoal,
    jobs: state.jobs,
    planktonLevel: Math.min(1, (feeding(state.plankton) - 1) / 2),
    bands: state.bands,
    siltLevel: 1 - smother(state.silt),
    sandBars: state.levels.sandbar,
    rasp: state.rasp,
    wall: state.truce.wall,
    form: state.dialects.form,
    moonPhase: moonPhase(state.t),
    moonFull: moonFull(state.t),
    spawnLevel: state.spawn / spawnTarget(state),
    sinceBreach: ended(state) ? state.t - state.breachedAt : -1,
  };
}

/** True when no story card is covering the screen. */
function reader(): boolean {
  return !document.querySelector('.reader:not([hidden])');
}

function showZoneTitle(n: number): void {
  const a = act(n);
  zoneTitle.innerHTML = '';
  const num = document.createElement('span');
  num.textContent = ['I', 'II', 'III', 'IV', 'V'][n - 1] ?? String(n);
  const name = document.createElement('strong');
  name.textContent = a.name;
  const blurb = document.createElement('em');
  blurb.textContent = a.blurb;
  zoneTitle.append(num, name, blurb);
  zoneTitle.classList.remove('show');
  void zoneTitle.offsetWidth;
  zoneTitle.classList.add('show');
}
ui.append(zoneTitle);

// Until the first sweep, a quiet hint over the water.
const hint = document.createElement('div');
hint.id = 'sweep-hint';
hint.textContent = 'Tap the water to sweep your tentacles';
ui.append(hint);

// Tapping the water sweeps the tentacles: a small burst of calcite.
canvas.addEventListener('pointerdown', (e) => {
  const gain = sweep(state);
  if (gain <= 0) return;
  hint.classList.add('done');
  const f = document.createElement('div');
  f.className = 'float';
  f.textContent = `+${num(gain)}`;
  f.style.left = `${e.clientX}px`;
  f.style.top = `${e.clientY}px`;
  ui.append(f);
  setTimeout(() => f.remove(), 1200);
});

// Quality: if frames run slow for a while, drop the bloom pass.
let slowFrames = 0;
function qualityCheck(dt: number): void {
  if (scene.bloomStrength === 0 || frozenT !== null) return;
  slowFrames = dt > 1 / 40 && dt < 0.5 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
  if (slowFrames > 90) scene.bloomStrength = 0;
}

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
    qualityCheck(dt);
  }
  const tNow = frozenT ?? animT;
  const v = view();
  const want = sceneFor(state.height);
  if (want !== scene) {
    fadingFrom = scene;
    fadeStart = tNow;
    scene = want;
    showZoneTitle(actAt(state.height));
  }
  scene.draw(ctx, tNow, v);
  if (fadingFrom) {
    const k = (tNow - fadeStart) / FADE;
    if (k >= 1) fadingFrom = null;
    else {
      fadingFrom.draw(fadeCtx, tNow, v);
      ctx.save();
      ctx.globalAlpha = 1 - k * k * (3 - 2 * k);
      ctx.drawImage(fadeCanvas, 0, 0);
      ctx.restore();
    }
  }
  panel.update(state);
  finale.update(state);
  replay.hidden = !ended(state);
  title.classList.toggle('faded', state.levels.polyp > 0 || state.t > 25);
  hint.classList.toggle('show', state.earned.calcite < 40 && reader() && state.t > 2);
  if (now - lastSave > 5000) { save(); lastSave = now; }
  if (frozenT === null) requestAnimationFrame(frame);
  else document.documentElement.dataset.ready = '1';
}

window.addEventListener('resize', () => { needResize = true; });
new ResizeObserver(() => { needResize = true; }).observe(panel.element);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
requestAnimationFrame(frame);
