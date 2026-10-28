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
//   ?fps          show frame rate and draw time (for trying it on a phone)
// With ?t, ?bot or ?fresh nothing is written to storage.
// Console: corallum.skip(seconds), corallum.state, corallum.speed = x, corallum.feast

import type { UpgradeId } from '../game/content/types.ts';
import { act, actAt } from '../game/content/acts.ts';
import { createAbyssScene } from '../game/render/abyss.ts';
import { createMidnightScene } from '../game/render/midnight.ts';
import { createBreachScene } from '../game/render/breach.ts';
import { createSunlitScene } from '../game/render/sunlit.ts';
import { createTwilightScene } from '../game/render/twilight.ts';
import { createTaps } from '../game/render/taps.ts';
import { drawFeast, feastPos, feastReach } from '../game/render/feast.ts';
import type { Focus, ReefView, Scene } from '../game/render/scene.ts';
import { runBot } from '../game/sim/bot.ts';
import { advance, assign, breach, buy, currentFeast, feast, greatTide, calciteHold, choose, ended, moonFull, moonPhase, spawnTarget, feeding, lure, rates, read, setRasp, smother, speak, sweep } from '../game/sim/economy.ts';
import { deserialize, exportString, importString, serialize } from '../game/sim/save.ts';
import { newGame, type GameState } from '../game/sim/state.ts';
import { metres, num } from '../game/ui/format.ts';
import { createAudio } from '../game/audio/audio.ts';
import { LINEAGE_BANDS } from '../game/content/lineage.ts';
import { ACT1, MILESTONES, type Milestone } from '../game/content/act1.ts';
import { WHISPERS } from '../game/content/whispers.ts';
import { buyTrait, habitPurchase, spawnLesser } from '../game/sim/prestige.ts';
import { createFinale } from '../game/ui/finale.ts';
import { createPanel } from '../game/ui/panel.ts';

declare global {
  interface Window {
    corallum?: {
      state: GameState; skip(seconds: number): void; speed: number; prof: { draw: number; panel: number };
      /** Where the falling feast is, in CSS pixels (null when there is none). */
      readonly feast: { x: number; y: number } | null;
    };
  }
}

const SAVE_KEY = 'corallum.save';
const AWAY_NOTICE = 60;
/** When the last save was copied out (wall clock), and how often to suggest another copy. */
const EXPORTED_KEY = 'corallum.exported';
const BACKUP_EVERY = 3 * 86400e3;

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

// Sound: off unless the player turned it on; browsers need a gesture before it can start.
const audio = createAudio();
const SOUND_KEY = 'corallum.sound';
let soundWanted = false;
try { soundWanted = localStorage.getItem(SOUND_KEY) === 'on'; } catch { /* no storage */ }
const soundBtn = document.createElement('button');
soundBtn.id = 'sound';
soundBtn.type = 'button';
function renderSound(): void {
  const waves = audio.enabled
    ? '<path d="M15 9a4 4 0 0 1 0 6M17.5 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'
    : '<path d="M15.5 9.5l5 5M20.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
  soundBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" fill="currentColor"/>${waves}</svg>`;
  soundBtn.title = audio.enabled ? 'Sound on (click to mute)' : 'Sound off (click for sound)';
  soundBtn.setAttribute('aria-pressed', String(audio.enabled));
}
soundBtn.addEventListener('click', () => {
  audio.setEnabled(!audio.enabled);
  try { localStorage.setItem(SOUND_KEY, audio.enabled ? 'on' : 'off'); } catch { /* no storage */ }
  renderSound();
});
renderSound();
if (soundWanted) {
  const start = () => { audio.setEnabled(true); renderSound(); };
  window.addEventListener('pointerdown', start, { once: true });
  window.addEventListener('keydown', start, { once: true });
}

// Soft glow (the bloom pass): on unless the player turned it off; remembered per browser.
const GLOW_KEY = 'corallum.glow';
const bloomDefaults = scenes.map((sc) => sc.bloomStrength);
let glowOn = true;
try { glowOn = localStorage.getItem(GLOW_KEY) !== 'off'; } catch { /* no storage */ }
function applyGlow(): void {
  scenes.forEach((sc, i) => { sc.bloomStrength = glowOn ? bloomDefaults[i]! : 0; });
}
applyGlow();

// Old habits (a lineage trait): on unless switched off; remembered per browser.
const HABITS_KEY = 'corallum.habits';
let habitsOn = true;
try { habitsOn = localStorage.getItem(HABITS_KEY) !== 'off'; } catch { /* no storage */ }

// Calmer motion: the system setting, or this switch (remembered per browser).
const CALM_KEY = 'corallum.calm';
let calmOn = false;
try { calmOn = localStorage.getItem(CALM_KEY) === 'on'; } catch { /* no storage */ }
document.documentElement.classList.toggle('calm', calmOn);

const panel = createPanel(ui, {
  calm: {
    get: () => calmOn,
    set(on) {
      calmOn = on;
      document.documentElement.classList.toggle('calm', on);
      try { localStorage.setItem(CALM_KEY, on ? 'on' : 'off'); } catch { /* no storage */ }
    },
  },
  habits: {
    get: () => habitsOn,
    set(on) {
      habitsOn = on;
      try { localStorage.setItem(HABITS_KEY, on ? 'on' : 'off'); } catch { /* no storage */ }
    },
  },
  glow: {
    get: () => glowOn,
    set(on) {
      glowOn = on;
      try { localStorage.setItem(GLOW_KEY, on ? 'on' : 'off'); } catch { /* no storage */ }
      applyGlow();
    },
  },
  storyShown() {
    audio.cue('story');
  },
  buy(id: UpgradeId) {
    if (purchase(id)) save();
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
  spawnLesser() {
    const next = spawnLesser(state);
    if (!next) return;
    state = next;
    if (ephemeral) return;
    savedAt = Date.now();
    storageSet(serialize(state, savedAt));
    location.reload();
  },
  buyTrait(id) {
    if (buyTrait(state, id)) save();
  },
  speak(id) {
    if (!speak(state, id)) return;
    scene.effect('truce');
    audio.cue('choice');
    save();
  },
  choose(id, choice) {
    if (!choose(state, id, choice)) return;
    scene.effect('truce');
    audio.cue('choice');
    save();
  },
  exportSave() {
    try { localStorage.setItem(EXPORTED_KEY, String(Date.now())); } catch { /* no storage */ }
    panel.setBackupDue(false);
    return exportString(state, Date.now());
  },
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
// A brand-new reef: let the title and the dark water show before the first band's story.
if (state.bands.length === 0 && state.meta.spawnings === 0 && frozenT === null) panel.holdStories(3500);

const finale = createFinale(ui, panel.growPage, {
  breach(memories) {
    if (!breach(state, memories)) return false;
    scene.effect('breach');
    audio.cue('release');
    save();
    return true;
  },
  done() {
    document.documentElement.classList.add('ended');
  },
});
if (ended(state)) document.documentElement.classList.add('ended');

// A new seamount after a spawning: a note from one of the reef's descendants.
{
  const n = state.meta.spawnings;
  const key = `lineage:${n}`;
  const lb = LINEAGE_BANDS[Math.min(n, LINEAGE_BANDS.length) - 1];
  if (n > 0 && lb && !state.meta.seen.includes(key)) {
    state.meta.seen.push(key);
    panel.story(`Lesser spawning ${n}`, lb.title, lb.text);
  }
}
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
  panel.setBackupDue(backupDue());
}

/** Suggest copying a save once the reef is an hour old (or has spawned) and no copy is recent. */
function backupDue(): boolean {
  if (state.t < 3600 && state.meta.spawnings === 0) return false;
  let last = 0;
  try { last = Number(localStorage.getItem(EXPORTED_KEY)) || 0; } catch { return false; }
  return Date.now() - last > BACKUP_EVERY;
}

/** Advance by a long span and tell the player what happened while they were gone. */
function catchUp(seconds: number): void {
  const before = { calcite: state.calcite, glow: state.glow, height: state.height, bands: state.bands.length };
  advance(state, seconds);
  panel.showAway(seconds, {
    bands: state.bands.slice(before.bands),
    calcite: Math.max(0, state.calcite - before.calcite),
    glow: Math.max(0, state.glow - before.glow),
    metres: state.height - before.height,
    full: state.calcite >= 0.98 * calciteHold(state),
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
/** Rolling average milliseconds per frame (read from the console: corallum.prof). */
const prof = { draw: 0, panel: 0 };
window.corallum = {
  get state() { return state; },
  skip: (sec: number) => catchUp(sec),
  get speed() { return speed; },
  set speed(x: number) { speed = x; },
  prof,
  get feast() {
    const f = currentFeast(state);
    if (!f) return null;
    const [x, y] = feastPos(f, state.t - f.start, focusNow);
    return { x: x / dpr, y: y / dpr };
  },
};

// Layout: the panel covers the right side (wide screens) or the bottom (narrow ones);
// the scene frames the reef in what is left.
let dpr = 1;
let focusNow: Focus = { x: 0, y: 0, w: 1, h: 1 };
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
  focusNow = focus;
}

function view(): ReefView {
  const r = rates(state);
  return {
    polyps: state.levels.polyp,
    polypTier: MILESTONES.polyp.filter((m) => state.levels.polyp >= m.level).length,
    glowTier: MILESTONES.symbiont.filter((m) => state.levels.symbiont >= m.level).length,
    symbionts: state.levels.symbiont,
    height: state.height,
    glowLevel: r.lureMax > 0 ? (lure(r, state.glow, state.height) - 1) / r.lureMax : 0,
    sinceSweep: state.t - state.lastSweep,
    vent: state.levels.vent,
    shoals: state.levels.shoal,
    jobs: state.jobs,
    planktonLevel: Math.min(1, (feeding(state.plankton) - 1) / 2),
    bands: state.bands,
    siltLevel: 1 - smother(state.silt),
    sandBars: state.levels.sandbar,
    meadows: state.levels.meadow,
    rasp: state.rasp,
    wall: state.truce.wall,
    raspTrust: state.truce.story === 'a',
    gardeners: state.meta.traits['glass-gardeners'] > 0,
    raspPolite: state.truce.terms === 'b',
    form: state.dialects.form,
    craft: state.dialects.craft,
    spawnMode: state.dialects.spawn,
    moonPhase: moonPhase(state.t),
    moonFull: moonFull(state.t),
    greatMoon: greatTide(state),
    spawnLevel: state.spawn / spawnTarget(state),
    sinceBreach: ended(state) ? state.t - state.breachedAt : -1,
  };
}

/** True when no story card is covering the screen. */
function reader(): boolean {
  return !document.querySelector('.reader:not([hidden])');
}

/** Buy one, with its flourish; a milestone reached gets its own moment. */
function purchase(id: UpgradeId): boolean {
  const before = state.levels[id];
  if (!buy(state, id)) return false;
  scene.effect(id);
  audio.cue('buy');
  if (id === 'polyp' || id === 'symbiont') {
    const ms = MILESTONES[id].find((m) => before < m.level && state.levels[id] >= m.level);
    if (ms) showMilestone(ms, id === 'polyp' ? 'polyps' : 'glimmerseed');
  }
  return true;
}

const milestoneBox = document.createElement('div');
milestoneBox.id = 'milestone';
ui.append(milestoneBox);
function showMilestone(ms: Milestone, what: string): void {
  milestoneBox.innerHTML = '';
  const name = document.createElement('strong');
  name.textContent = ms.name;
  const gain = document.createElement('span');
  gain.textContent = `${what} ×${ACT1.milestoneFactor}`;
  const text = document.createElement('em');
  text.textContent = ms.text;
  milestoneBox.append(name, gain, text);
  milestoneBox.classList.remove('show');
  void milestoneBox.offsetWidth;
  milestoneBox.classList.add('show');
  audio.cue('choice');
  scene.effect('reading');
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
ui.append(soundBtn);

// Ossel's whispers: one at a time, at most every 80 s, each once per lineage.
const whisper = document.createElement('div');
whisper.id = 'whisper';
ui.append(whisper);
let lastWhisper = -Infinity;
function whisperCheck(now: number): void {
  // Quiet once the spawn has gone: nothing should talk over the ending.
  if (frozenT !== null || now - lastWhisper < 80_000 || !reader() || ended(state)) return;
  const w = WHISPERS.find((x) => !state.meta.seen.includes(`w:${x.id}`) && x.when(state));
  if (!w) return;
  state.meta.seen.push(`w:${w.id}`);
  lastWhisper = now;
  const speaker = state.truce.wall === 'a' ? 'the sand' : 'Ossel';
  whisper.innerHTML = '';
  const q = document.createElement('q');
  q.textContent = w.text;
  const who = document.createElement('span');
  who.textContent = `— ${speaker}`;
  whisper.append(q, who);
  whisper.classList.remove('show');
  void whisper.offsetWidth;
  whisper.classList.add('show');
  audio.cue('whisper');
}

// Until the first sweep, a quiet hint over the water.
const hint = document.createElement('div');
hint.id = 'sweep-hint';
hint.textContent = 'Tap the water to sweep your tentacles';
ui.append(hint);

const taps = createTaps();

/** A float of text over the water, e.g. "+12". */
function floatText(x: number, y: number, text: string, cls = ''): void {
  const f = document.createElement('div');
  f.className = `float ${cls}`;
  f.textContent = text;
  f.style.left = `${x}px`;
  f.style.top = `${y}px`;
  ui.append(f);
  setTimeout(() => f.remove(), cls ? 2200 : 1200);
}

/** Eat the falling feast, if there is one; motes stream from it into the crown. */
function eatFeast(): boolean {
  const f = currentFeast(state);
  if (!f) return false;
  const [x, y] = feastPos(f, state.t - f.start, focusNow);
  const gain = feast(state);
  if (gain <= 0) return false;
  taps.push(x, y, animT, 16);
  audio.cue('feast');
  floatText(x / dpr, y / dpr, `+${num(gain)} · a feast`, 'feast-float');
  save();
  return true;
}

// Tapping the water sweeps the tentacles: a small burst of calcite. Tapping a falling feast eats it.
canvas.addEventListener('pointerdown', (e) => {
  const f = currentFeast(state);
  if (f) {
    const [fx, fy] = feastPos(f, state.t - f.start, focusNow);
    if (Math.hypot(e.clientX * dpr - fx, e.clientY * dpr - fy) < feastReach(focusNow, dpr) && eatFeast()) return;
  }
  const gain = sweep(state);
  if (gain <= 0) return;
  hint.classList.add('done');
  audio.cue('sweep');
  taps.push(e.clientX * dpr, e.clientY * dpr, animT);
  floatText(e.clientX, e.clientY, `+${num(gain)}`);
});

// Quality: if frames run slow for a while, drop the bloom pass.
let slowFrames = 0;
function qualityCheck(dt: number): void {
  if (scene.bloomStrength === 0 || frozenT !== null) return;
  slowFrames = dt > 1 / 40 && dt < 0.5 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
  if (slowFrames > 90) scene.bloomStrength = 0;
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Keyboard: Space sweeps; F eats a falling feast; P, B and G buy a polyp, a band and glimmerseed.
const KEYS: Record<string, UpgradeId> = { p: 'polyp', b: 'skeleton', g: 'symbiont' };
window.addEventListener('keydown', (e) => {
  const target = e.target as HTMLElement | null;
  if (e.ctrlKey || e.metaKey || e.altKey || target?.closest('input, textarea, button, select')) return;
  if (e.key === ' ') {
    e.preventDefault();
    if (sweep(state) > 0) {
      audio.cue('sweep');
      const [x, y] = scene.crownAt;
      taps.push(x + (Math.sin(animT * 7) > 0 ? 1 : -1) * 160 * dpr, y - 60 * dpr, animT);
    }
    return;
  }
  if (e.key.toLowerCase() === 'f') {
    eatFeast();
    return;
  }
  const id = KEYS[e.key.toLowerCase()];
  if (id) purchase(id);
});

// ?fps: a small readout of frame rate and draw time, for checking real devices.
const fpsBox = params.has('fps') ? document.createElement('div') : null;
if (fpsBox) { fpsBox.id = 'fps'; ui.append(fpsBox); }
let fpsFrames = 0, fpsSince = 0;
function fpsTick(now: number, dt: number): void {
  fpsFrames++;
  fpsSince += dt;
  if (fpsSince < 0.5) return;
  fpsBox!.textContent = `${Math.round(fpsFrames / fpsSince)} fps · draw ${prof.draw.toFixed(1)} ms · panel ${prof.panel.toFixed(1)} ms` +
    `${scene.bloomStrength > 0 ? '' : ' · bloom off'} · ${canvas.width}×${canvas.height}`;
  fpsFrames = 0;
  fpsSince = 0;
}

let last = performance.now();
let lastSave = last;
let lastTitle = 0;
let lastHabit = 0;
let lastWhaleLap = -1;
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
    animT += Math.min(dt, 0.1) * (reducedMotion.matches || calmOn ? 0.3 : 1);
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
  const p0 = performance.now();
  scene.draw(ctx, tNow, v);
  const p1 = performance.now();
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
  const fe = currentFeast(state);
  if (fe) drawFeast(ctx, fe, state.t - fe.start, tNow, focusNow, dpr);
  taps.draw(ctx, tNow, scene.crownAt, dpr);
  const p2 = performance.now();
  panel.update(state);
  const p3 = performance.now();
  finale.update(state);
  prof.draw += (p1 - p0 - prof.draw) * 0.05;
  prof.panel += (p3 - p2 - prof.panel) * 0.05;
  audio.setZone(actAt(state.height));
  // The Sunlit Crown's whale (render/sunlit.ts: every 210 s of scene time) calls as it sets off.
  const whaleLap = Math.floor(tNow / 210);
  if (actAt(state.height) === 4 && whaleLap !== lastWhaleLap && tNow % 210 < 5) audio.cue('whale');
  lastWhaleLap = whaleLap;
  whisperCheck(now);
  if (fpsBox) fpsTick(now, dt);
  // Old habits: the reef's own small purchases, only while the page is open.
  if (habitsOn && frozenT === null && now - lastHabit > 250) {
    lastHabit = now;
    const id = habitPurchase(state);
    if (id) purchase(id);
  }
  replay.hidden = !ended(state);
  title.classList.toggle('faded', state.levels.polyp > 0 || state.t > 25);
  hint.classList.toggle('show', state.meta.spawnings === 0 && state.earned.calcite < 40 && reader() && state.t > 2);
  if (now - lastSave > 5000) { save(); lastSave = now; }
  // The tab title carries the reef's height, so a background tab still shows progress.
  if (now - lastTitle > 1000) {
    lastTitle = now;
    const t = ended(state) ? 'Corallum · spawned' : state.height < 1 ? 'Corallum' : `${metres(state.height)} · Corallum`;
    if (document.title !== t) document.title = t;
  }
  if (frozenT === null) requestAnimationFrame(frame);
  else document.documentElement.dataset.ready = '1';
}

window.addEventListener('resize', () => { needResize = true; });
new ResizeObserver(() => { needResize = true; }).observe(panel.element);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
requestAnimationFrame(frame);
