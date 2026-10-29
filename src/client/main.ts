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
//   ?at=<sec>     start the scene clock at <sec> (live, unlike ?t)
//   ?fps          show frame rate and draw time (for trying it on a phone)
// With ?t, ?bot or ?fresh nothing is written to storage.
// Console: corallum.skip(seconds), corallum.state, corallum.speed = x, corallum.feast

import type { UpgradeId } from '../game/content/types.ts';
import { ACTS, act, actAt } from '../game/content/acts.ts';
import { createAbyssScene } from '../game/render/abyss.ts';
import { createMidnightScene } from '../game/render/midnight.ts';
import { createBreachScene } from '../game/render/breach.ts';
import { createSunlitScene } from '../game/render/sunlit.ts';
import { createTwilightScene } from '../game/render/twilight.ts';
import { createTaps } from '../game/render/taps.ts';
import { drawFeast, feastPos, feastReach } from '../game/render/feast.ts';
import { zoom, type Focus, type ReefView, type Scene } from '../game/render/scene.ts';
import { runBot } from '../game/sim/bot.ts';
import { advance, assign, breach, buy, timeUntil, currentFeast, feast, feastPay, gift, tableFeast, greatTide, calciteHold, choose, ended, moonFull, moonPhase, untilFullMoon, spawnTarget, feeding, lure, rates, read, setRasp, smother, speak, sweep } from '../game/sim/economy.ts';
import { deserialize, exportString, importString, serialize } from '../game/sim/save.ts';
import { newGame, type GameState } from '../game/sim/state.ts';
import { duration, metres, num, setScientific } from '../game/ui/format.ts';
import { createAudio } from '../game/audio/audio.ts';
import { FEAST } from '../game/content/events.ts';
import { LINEAGE, LINEAGE_BANDS, SEAMOUNTS } from '../game/content/lineage.ts';
import { CREATURES, JOURNAL_PASSING, GIFT, GIFT_TEXT, GIFT_WORD, giftOf } from '../game/content/creatures.ts';
import { newFeats } from '../game/content/feats.ts';
import { createPortraits } from './portraits.ts';
import { drawMoon } from '../game/render/draw.ts';
import { GAUGE_MOON } from '../game/content/act5.ts';
import { creatureAt, endFrameSpots, startle, tappable, takeSightings } from '../game/render/sightings.ts';
import { ACT1, MILESTONES, type Milestone } from '../game/content/act1.ts';
import { OSSEL_LINES, WHISPERS } from '../game/content/whispers.ts';
import { buyTrait, habitPurchase, spawnLesser } from '../game/sim/prestige.ts';
import { createFinale } from '../game/ui/finale.ts';
import { createPanel, reefName } from '../game/ui/panel.ts';
import { setting } from './settings.ts';

declare global {
  interface Window {
    corallum?: {
      state: GameState; skip(seconds: number): void; speed: number; prof: { draw: number; panel: number };
      /** Where the falling feast is, in CSS pixels (null when there is none). */
      readonly feast: { x: number; y: number } | null;
      /** View-mode zoom factor (1 = none). */
      readonly zoom: number;
      /** The tappable creatures on screen, in CSS pixels. */
      readonly spots: { id: string; x: number; y: number }[];
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
const titleName = document.createElement('p');
titleName.className = 'reef-name';
title.append(titleName);
/** Under the title: the reef's name, if it has one. */
function showReefName(): void {
  titleName.textContent = reefName(state);
}
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
zoneTitle.setAttribute('role', 'status');
zoneTitle.setAttribute('aria-live', 'polite');

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

// Player settings (client/settings.ts), each remembered per browser.
const bloomDefaults = scenes.map((sc) => sc.bloomStrength);
/** Soft glow: the bloom pass, on unless turned off. */
const glow = setting('glow', true, (on) => scenes.forEach((sc, i) => { sc.bloomStrength = on ? bloomDefaults[i]! : 0; }));
/** Old habits (a lineage trait): the reef's own small purchases, while the page is open. */
const habits = setting('habits', true);
/** Calmer motion: as the system's reduced-motion setting, by choice. */
const calm = setting('calm', false, (on) => document.documentElement.classList.toggle('calm', on));
const sci = setting('sci', false, (on) => setScientific(on));
const volume = setting('volume', 0.9, (v) => audio.setVolume(v));
/** Full resolution: off renders at 1× (a quarter of the pixels on a 2× screen) for slow phones. */
const sharp = setting('sharp', true, (_, initial) => { if (!initial) relayout(); });
/** Vibration on phones: a tick per purchase, a pulse for milestones and feats (on for touch screens). */
const buzzing = setting('buzz', window.matchMedia('(pointer: coarse)').matches);
function buzz(ms: number | number[]): void {
  if (buzzing.get() && 'vibrate' in navigator) navigator.vibrate(ms);
}

const portraits = createPortraits(!ephemeral);
const panel = createPanel(ui, {
  sharp, buzz: buzzing, volume, sci, calm, habits, glow,
  rename(name) {
    state.meta.name = name;
    showReefName();
    save();
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
  spawnLesser(where) {
    const next = spawnLesser(state, where);
    if (!next) return;
    if (ephemeral) {
      state = next;
      return;
    }
    // The new reef is saved now but shown only after the send-off, over the reef left behind.
    savedAt = Date.now();
    storageSet(serialize(next, savedAt));
    // A short send-off before the new seamount: the spawn rises, the water darkens.
    yielded = true;
    const send = document.createElement('div');
    send.id = 'send-off';
    for (let i = 0; i < 60; i++) {
      const m = document.createElement('i');
      m.style.left = `${(i * 61.8) % 100}%`;
      m.style.animationDelay = `${(i % 12) * 0.12}s`;
      send.append(m);
    }
    const line = document.createElement('p');
    line.textContent = 'Your spawn drifts away to find a new seamount.';
    send.append(line);
    ui.append(send);
    audio.cue('release');
    setTimeout(() => location.reload(), reducedMotion.matches ? 600 : 3400);
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
  portrait: (id) => portraits.get(id),
  get portraits() { return portraits.count; },
  reset() {
    portraits.clear();
    state = newGame(seed);
    save();
    location.reload();
  },
});
panel.primeStories(state);
showReefName();
// Feats already earned when a reef loads (older saves, or long absences) are granted together.
if (frozenT === null && botT === null) {
  const already = newFeats(state);
  if (already.length > 1) {
    for (const f of already) state.meta.seen.push(`f:${f.id}`);
    state.meta.lineage += already.length;
    setTimeout(() => showJournalNote(`Feats · +${already.length} lineage`, `${already.length} feats already earned`), 1500);
  }
}
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
    const where = SEAMOUNTS.find((m) => m.id === state.seamount);
    panel.story(`Lesser spawning ${n}${where && where.id !== 'plain' ? ` · ${where.name.toLowerCase()}` : ''}`, lb.title,
      `${lb.text}${where && where.id !== 'plain' ? ` ${where.text}` : ''}`);
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
  // When the stores would have filled, from the state as it was left.
  const start = structuredClone(state);
  const fullAfter = timeUntil(start, 'calcite', 0.98 * calciteHold(start));
  advance(state, seconds);
  panel.showAway(seconds, {
    bands: state.bands.slice(before.bands),
    calcite: Math.max(0, state.calcite - before.calcite),
    glow: Math.max(0, state.glow - before.glow),
    metres: state.height - before.height,
    full: state.calcite >= 0.98 * calciteHold(state),
    fullAfter: fullAfter < seconds ? fullAfter : null,
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
    const [x, y] = feastPos(f, state.t - f.start, focusNow, feastPay(state));
    return { x: x / dpr, y: y / dpr };
  },
  get zoom() { return zoom.k; },
  get spots() {
    return tappable().map((p) => ({ id: p.id, x: p.x / dpr, y: p.y / dpr }));
  },
};

// Layout: the panel covers the right side (wide screens) or the bottom (narrow ones);
// the scene frames the reef in what is left.
let dpr = 1;
let focusNow: Focus = { x: 0, y: 0, w: 1, h: 1 };
function resize(): void {
  dpr = sharp.get() && !autoLowRes ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const w = Math.round(window.innerWidth * dpr);
  const h = Math.round(window.innerHeight * dpr);
  const r = panel.element.getBoundingClientRect();
  const side = r.left > window.innerWidth * 0.3;
  // With the panel hidden (view mode) the scene frames the whole screen.
  const focus: Focus = viewMode ? { x: 0, y: 0, w, h } : side
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
    readings: state.readings.length,
    siltLevel: 1 - smother(state.silt),
    sandBars: state.levels.sandbar,
    channels: state.levels.channel,
    meadows: state.levels.meadow,
    pigments: state.levels.pigment,
    lattice: state.levels.lattice,
    canopy: state.levels.canopy,
    seamount: state.seamount,
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
  buzz(8);
  if (id === 'polyp' || id === 'symbiont') {
    const ms = MILESTONES[id].find((m) => before < m.level && state.levels[id] >= m.level);
    if (ms) showMilestone(ms, id === 'polyp' ? 'polyps' : 'glimmerseed');
  }
  return true;
}

const milestoneBox = document.createElement('div');
milestoneBox.id = 'milestone';
milestoneBox.setAttribute('role', 'status');
milestoneBox.setAttribute('aria-live', 'polite');
ui.append(milestoneBox);
let zoneTitleUntil = 0;
function showMilestone(ms: Milestone, what: string): void {
  // Not on top of a zone title: wait for it to finish.
  const wait = zoneTitleUntil - performance.now();
  if (wait > 0) {
    setTimeout(() => showMilestone(ms, what), wait);
    return;
  }
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
  buzz([30, 60, 30]);
}

const journalNote = document.createElement('div');
journalNote.id = 'journal-note';
journalNote.setAttribute('role', 'status');
journalNote.setAttribute('aria-live', 'polite');
ui.append(journalNote);
let journalQueue: [string, string][] = [];
let journalBusy = false;
/** A small note top-left ("Seen for the first time · Anglerfish"), one at a time. */
function showJournalNote(kicker: string, name: string): void {
  journalQueue.push([kicker, name]);
  if (journalBusy) return;
  const next = () => {
    const n = journalQueue.shift();
    if (!n) { journalBusy = false; return; }
    journalBusy = true;
    journalNote.textContent = '';
    const k = document.createElement('span');
    k.textContent = n[0];
    const b = document.createElement('strong');
    b.textContent = n[1];
    journalNote.append(k, b);
    journalNote.classList.remove('show');
    void journalNote.offsetWidth;
    journalNote.classList.add('show');
    setTimeout(next, 3200);
  };
  next();
}

/** Crossing into a new zone: a rush of bright motes streaming up past the reef during the fade. */
function drawAscent(k: number): void {
  const h = canvas.height;
  const a = Math.sin(Math.PI * k);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) {
    const x = focusNow.x + ((i * 0.618) % 1) * focusNow.w;
    const speed = 0.6 + ((i * 0.37) % 1) * 0.9;
    const y = h - (((k * speed * 1.6 + (i * 0.29) % 1) % 1.2) * h * 1.1);
    const len = (14 + (i % 5) * 6) * dpr;
    const g = ctx.createLinearGradient(x, y, x, y + len);
    g.addColorStop(0, `rgba(220,240,255,${0.7 * a})`);
    g.addColorStop(1, 'rgba(220,240,255,0)');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + len);
    ctx.stroke();
  }
  ctx.restore();
}

/** The panel's tint for each zone: violet-black, deep blue, twilight blue, sea green, night. */
const ZONE_TINTS = ['14, 20, 46', '10, 14, 40', '16, 34, 68', '14, 52, 70', '20, 22, 52'];
function setZoneTint(n: number): void {
  const tint = ZONE_TINTS[n - 1] ?? ZONE_TINTS[0]!;
  document.documentElement.style.setProperty('--zone-tint', tint);
  // Phones colour their address bar from the theme colour: let it follow the zone too.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `rgb(${tint})`);
}
setZoneTint(actAt(state.height));

function showZoneTitle(n: number): void {
  // Not behind the away summary or a story: wait until it is closed, so the title is seen.
  if (document.querySelector('.away:not([hidden]), .reader:not([hidden])')) {
    setTimeout(() => showZoneTitle(n), 500);
    return;
  }
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
  zoneTitleUntil = performance.now() + 7000;
}
ui.append(zoneTitle);
ui.append(soundBtn);

// Ossel's whispers: one at a time, at most every 80 s, each once per lineage.
const whisper = document.createElement('div');
whisper.id = 'whisper';
whisper.setAttribute('role', 'status');
whisper.setAttribute('aria-live', 'polite');
ui.append(whisper);
let lastWhisper = -Infinity;
let lastWhisperCheck = 0;
/** Tapping Ossel: one of its lines, in turn, over the water. */
let osselLine = 0;
function sayOssel(): void {
  showWhisperText(OSSEL_LINES[osselLine++ % OSSEL_LINES.length]!);
}

function whisperCheck(now: number): void {
  // Quiet once the spawn has gone: nothing should talk over the ending.
  if (frozenT !== null || now - lastWhisper < 80_000 || now - lastWhisperCheck < 1000 || !reader() || ended(state)) return;
  lastWhisperCheck = now;
  // At the Breach only the moon speaks: the rest would talk over the spawning.
  const w = WHISPERS.find((x) => !state.meta.seen.includes(`w:${x.id}`) && (state.height < 3980 || x.id === 'moon') && x.when(state));
  if (!w) return;
  state.meta.seen.push(`w:${w.id}`);
  lastWhisper = now;
  showWhisperText(w.text);
}

/** A line from Ossel (or, once its wall is ground down, the sand) over the water. */
function showWhisperText(text: string): void {
  const speaker = state.truce.wall === 'a' ? 'the sand' : 'Ossel';
  whisper.innerHTML = '';
  const q = document.createElement('q');
  q.textContent = text;
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

const creatureLabel = document.createElement('div');
creatureLabel.id = 'creature-label';
creatureLabel.setAttribute('role', 'status');
creatureLabel.setAttribute('aria-live', 'polite');
ui.append(creatureLabel);
let labelTimer = 0;
/** The journal's portraits: the first creature on screen without one, if it is well inside the scene. */
let lastPortrait = 0;
function takePortrait(): void {
  for (const p of tappable()) {
    if (p.id === 'ossel' || portraits.has(p.id)) continue;
    const side = Math.min(280 * dpr, Math.max(70 * dpr, p.r * 2.4));
    const f = focusNow;
    if (p.x - side / 2 < f.x || p.x + side / 2 > f.x + f.w || p.y - side / 2 < f.y || p.y + side / 2 > f.y + f.h) continue;
    portraits.capture(p.id, canvas, p.x, p.y, side);
    return;
  }
}

/** Name a creature beside where it was tapped: above it, clear of its body (`r`), or below if there is no room. */
function showCreatureLabel(id: string, x: number, y: number, r = 20): void {
  const c = CREATURES.find((k) => k.id === id);
  if (!c) return;
  creatureLabel.innerHTML = '';
  const n = document.createElement('strong');
  n.textContent = c.name;
  const t = document.createElement('span');
  t.textContent = c.note;
  // What it gives when touched, and when it will give again.
  const g = document.createElement('em');
  const wait = state.gifts[c.id] + GIFT.cooldown - state.t;
  g.textContent = wait > 0 ? `${GIFT_WORD[giftOf(c.id)]} again in ${duration(wait)}` : `${GIFT_WORD[giftOf(c.id)]} when touched`;
  creatureLabel.append(n, t, g);
  const reach = Math.min(r, 90);
  const lw = creatureLabel.offsetWidth || 220, lh = creatureLabel.offsetHeight || 56;
  const left = Math.min(window.innerWidth - lw - 8, Math.max(8, x - lw / 2));
  const above = y - reach - 10 - lh;
  creatureLabel.style.left = `${left}px`;
  creatureLabel.style.top = `${above >= 8 ? above : y + reach + 10}px`;
  creatureLabel.classList.add('show');
  clearTimeout(labelTimer);
  labelTimer = window.setTimeout(() => creatureLabel.classList.remove('show'), 3500);
}

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

/**
 * Eat the falling feast, if there is one; motes stream from it into the crown. `share` below 1
 * is the shared table: the scavengers bring part of a feast nobody tapped.
 */
function eatFeast(share = 1): boolean {
  const f = currentFeast(state);
  if (!f) return false;
  const [x, y] = feastPos(f, state.t - f.start, focusNow, feastPay(state));
  const gain = feast(state, share);
  if (gain <= 0) return false;
  taps.push(x, y, animT, share < 1 ? 8 : 16);
  audio.cue('feast');
  const what = feastPay(state) === 'calcite' ? (share < 1 ? FEAST.brought : FEAST.ate) : feastPay(state);
  const [sx, sy] = toScreen(x, y);
  floatText(sx / dpr, sy / dpr, `+${num(gain)} ${what}`, 'feast-float');
  save();
  return true;
}

// Tapping the water sweeps the tentacles: a small burst of calcite. Tapping a falling feast eats it.
canvas.addEventListener('pointerdown', (e) => {
  if (pinchDown(e)) return;
  // The world point under the finger (the view may be zoomed).
  const [wx, wy] = toWorld(e.clientX * dpr, e.clientY * dpr);
  // Tapping a creature names it (the sweep still happens).
  const who = creatureAt(wx, wy);
  if (who?.id === 'ossel') sayOssel();
  if (who) {
    startle(who.id, frozenT ?? animT, wx, wy);
    if (who.id === 'whale') audio.cue('whale');
    else if (who.id !== 'ossel') audio.cue(giftOf(who.id) === 'glow' ? 'shimmer' : who.id === 'rasp' ? 'crunch' : 'touch');
    if (frozenT === null && who.id !== 'ossel' && !state.meta.seen.includes(`t:${who.id}`)) state.meta.seen.push(`t:${who.id}`);
    // Now and then a neighbour gives a little of what it lives by.
    const g = frozenT === null && who.id !== 'ossel' ? gift(state, who.id) : null;
    if (g) floatText(e.clientX, e.clientY - 26, `+${num(g.amount)} ${GIFT_TEXT[g.stock]}`, 'feast-float');
    if (who.id !== 'ossel') {
      const [lx, ly] = toScreen(who.x, who.y);
      showCreatureLabel(who.id, lx / dpr, ly / dpr, (who.r * zoom.k) / dpr);
    }
  }
  const f = currentFeast(state);
  if (f) {
    const [fx, fy] = feastPos(f, state.t - f.start, focusNow, feastPay(state));
    if (Math.hypot(wx - fx, wy - fy) < feastReach(focusNow, dpr) && eatFeast()) return;
  }
  const gain = sweep(state);
  if (gain <= 0) return;
  hint.classList.add('done');
  audio.cue('sweep');
  taps.push(wx, wy, animT);
  floatText(e.clientX, e.clientY, `+${num(gain)}`);
});

// Quality: if frames run slow for a while, drop the bloom pass.
let slowFrames = 0;
/** Slow frames for a while: first the glow pass goes, then (still slow) the resolution drops to 1×. */
let autoLowRes = false;
function qualityCheck(dt: number): void {
  if (frozenT !== null || autoLowRes) return;
  // Seconds spent in slow frames (fast frames pay it back): the slower the device, the sooner it acts.
  slowFrames = dt > 1 / 40 && dt < 1 ? slowFrames + dt : Math.max(0, slowFrames - dt);
  if (slowFrames <= 3) return;
  slowFrames = 0;
  if (scene.bloomStrength > 0) scene.bloomStrength = 0;
  else if (sharp.get() && dpr > 1) {
    autoLowRes = true;
    relayout();
  }
}

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// The depth gauge: the whole column from the seamount to the surface, one equal segment per
// zone (linear within it), with a marker at the reef's height.
const gauge = document.createElement('div');
gauge.id = 'depth-gauge';
const gaugeMarker = document.createElement('i');
const gaugeLabel = document.createElement('span');
for (const a of ACTS) {
  const seg = document.createElement('b');
  seg.className = `zone-${a.n}`;
  seg.title = a.name;
  gauge.append(seg);
}
// Above the surface end of the gauge, the moon in its current phase (redrawn as it changes).
const gaugeMoon = document.createElement('canvas');
gaugeMoon.className = 'gauge-moon';
gaugeMoon.width = gaugeMoon.height = 36;
let gaugeMoonPhase = -1;
gauge.append(gaugeMarker, gaugeLabel, gaugeMoon);
ui.append(gauge);
function updateGaugeMoon(): void {
  const p = Math.round(moonPhase(state.t) * 48) / 48;
  if (p === gaugeMoonPhase) return;
  gaugeMoonPhase = p;
  const c = gaugeMoon.getContext('2d')!;
  c.clearRect(0, 0, 36, 36);
  drawMoon(c, 18, 18, 14, p);
  // A faint rim, so a new moon is a shape and not a hole.
  c.strokeStyle = 'rgba(220,225,255,0.45)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.arc(18, 18, 14, 0, Math.PI * 2);
  c.stroke();
  gaugeMoon.title = moonFull(state.t) ? GAUGE_MOON.full : `${GAUGE_MOON.until} ${duration(untilFullMoon(state.t))}`;
}
/** 0 (seamount) … 1 (surface) along the gauge. */
function gaugeAt(h: number): number {
  const n = actAt(h);
  const a = ACTS[n - 1]!;
  return (n - 1 + Math.min(1, (h - a.from) / (a.to - a.from))) / ACTS.length;
}
let gaugeShown = -1;
function updateGauge(): void {
  updateGaugeMoon();
  const h = Math.round(state.height * 10) / 10;
  if (h === gaugeShown) return;
  gaugeShown = h;
  // A brand-new reef keeps the opening clear: the gauge appears with the first metre of stone.
  gauge.hidden = state.height < 1;
  const f = gaugeAt(state.height);
  gaugeMarker.style.bottom = `${f * 100}%`;
  gaugeLabel.style.bottom = `${f * 100}%`;
  gaugeLabel.textContent = metres(state.height);
}

// View mode: hide the panel and let the reef have the whole screen (button top-left, or H).
let viewMode = false;
const viewBtn = document.createElement('button');
viewBtn.id = 'view-mode';
viewBtn.type = 'button';
viewBtn.title = 'Hide the panel (H)';
viewBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';
function setViewMode(on: boolean): void {
  viewMode = on;
  if (!on) zoom.k = 1;
  document.documentElement.classList.toggle('view-mode', on);
  viewBtn.setAttribute('aria-pressed', String(on));
  viewBtn.title = on ? 'Show the panel (H) · scroll, pinch or + / − to look closer' : 'Hide the panel (H)';
  relayout();
}
viewBtn.addEventListener('click', () => setViewMode(!viewMode));

// View-mode zoom: up to 3× into the world, by wheel, pinch or + / −. The scene is drawn under the
// transform (not upscaled), so the detail stays sharp. zoomC is the world point at the centre.
const ZOOM_MAX = 3;
let zoomCx = 0, zoomCy = 0;
function zoomOffset(): [number, number] {
  if (zoom.k === 1) return [0, 0];
  return [canvas.width / 2 - zoom.k * zoomCx, canvas.height / 2 - zoom.k * zoomCy];
}
function applyZoom(c: CanvasRenderingContext2D): void {
  const [ex, ey] = zoomOffset();
  c.setTransform(zoom.k, 0, 0, zoom.k, ex, ey);
}
function toWorld(sx: number, sy: number): [number, number] {
  const [ex, ey] = zoomOffset();
  return [(sx - ex) / zoom.k, (sy - ey) / zoom.k];
}
function toScreen(wx: number, wy: number): [number, number] {
  const [ex, ey] = zoomOffset();
  return [wx * zoom.k + ex, wy * zoom.k + ey];
}
/** Zoom to `k`, keeping the world point under screen point (sx, sy) where it is; the view stays inside the world. */
function zoomAt(k: number, sx: number, sy: number): void {
  const [wx, wy] = toWorld(sx, sy);
  zoom.k = Math.min(ZOOM_MAX, Math.max(1, k));
  const W = canvas.width, H = canvas.height;
  zoomCx = wx - (sx - W / 2) / zoom.k;
  zoomCy = wy - (sy - H / 2) / zoom.k;
  zoomCx = Math.min(W - W / (2 * zoom.k), Math.max(W / (2 * zoom.k), zoomCx));
  zoomCy = Math.min(H - H / (2 * zoom.k), Math.max(H / (2 * zoom.k), zoomCy));
}
canvas.addEventListener('wheel', (e) => {
  if (!viewMode) return;
  e.preventDefault();
  zoomAt(zoom.k * Math.exp(-e.deltaY * 0.0015), e.clientX * dpr, e.clientY * dpr);
}, { passive: false });
// Pinch: two fingers zoom about their midpoint, and moving the midpoint pans.
const fingers = new Map<number, [number, number]>();
let pinch: { d: number; mx: number; my: number } | null = null;
function pinchState(): { d: number; mx: number; my: number } {
  const [a, b] = [...fingers.values()] as [[number, number], [number, number]];
  return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 };
}
/** A finger went down; true when it starts a pinch (in view mode), which is not a tap. */
function pinchDown(e: PointerEvent): boolean {
  if (!viewMode || e.pointerType !== 'touch') return false;
  fingers.set(e.pointerId, [e.clientX * dpr, e.clientY * dpr]);
  if (fingers.size !== 2) return false;
  pinch = pinchState();
  return true;
}
canvas.addEventListener('pointermove', (e) => {
  if (!fingers.has(e.pointerId)) return;
  fingers.set(e.pointerId, [e.clientX * dpr, e.clientY * dpr]);
  if (!pinch || fingers.size !== 2) return;
  const now = pinchState();
  // Pan by the midpoint's travel, then zoom about the new midpoint.
  zoomCx -= (now.mx - pinch.mx) / zoom.k;
  zoomCy -= (now.my - pinch.my) / zoom.k;
  zoomAt(zoom.k * (now.d / Math.max(1, pinch.d)), now.mx, now.my);
  pinch = now;
});
for (const type of ['pointerup', 'pointercancel'] as const) {
  canvas.addEventListener(type, (e) => {
    fingers.delete(e.pointerId);
    if (fingers.size < 2) pinch = null;
  });
}
ui.append(viewBtn);

// A photo of the reef: the canvas as it is now, saved as a PNG (shown in view mode).
const photoBtn = document.createElement('button');
photoBtn.id = 'photo';
photoBtn.type = 'button';
photoBtn.title = 'Save a picture of the reef';
photoBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
photoBtn.addEventListener('click', () => {
  // A copy of the scene with a small caption in the corner: name, height, zone.
  const shot = document.createElement('canvas');
  shot.width = canvas.width;
  shot.height = canvas.height;
  const sc = shot.getContext('2d')!;
  sc.drawImage(canvas, 0, 0);
  const caption = `${reefName(state) || 'Corallum'} · ${metres(state.height)} · ${act(actAt(state.height)).name}`;
  const fs = Math.round(16 * dpr);
  sc.font = `${fs}px Georgia, 'Times New Roman', serif`;
  sc.textBaseline = 'bottom';
  sc.fillStyle = 'rgba(0,0,0,0.45)';
  const tw = sc.measureText(caption).width;
  sc.fillRect(fs * 0.8, shot.height - fs * 2.6, tw + fs * 1.2, fs * 1.8);
  sc.fillStyle = 'rgba(240,248,255,0.92)';
  sc.fillText(caption, fs * 1.4, shot.height - fs * 1.15);
  shot.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const who = (reefName(state) || 'corallum').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = `${who}-${Math.round(state.height)}m.png`;
    if (!state.meta.seen.includes('did:photo')) state.meta.seen.push('did:photo');
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    audio.cue('buy');
  }, 'image/png');
});
ui.append(photoBtn);

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
  if (e.key === '?') {
    panel.story('Keys', 'Shortcuts',
      'Space sweeps your tentacles. 1–4 switch the panel tabs. F catches a falling feast. P buds a polyp, B lays a band, G hosts ' +
      'glimmerseed. H hides the panel to see the whole reef. Hold any buy button to keep buying. ' +
      'Tap a creature to learn its name; tap Ossel and it will answer.');
    return;
  }
  if (/^[1-4]$/.test(e.key) && panel.showTabAt(Number(e.key))) return;
  if (viewMode && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0')) {
    const k = e.key === '0' ? 1 : zoom.k * (e.key === '-' ? 1 / 1.25 : 1.25);
    zoomAt(k, canvas.width / 2, canvas.height / 2);
    return;
  }
  if (e.key.toLowerCase() === 'h') {
    setViewMode(!viewMode);
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
    `${scene.bloomStrength > 0 ? '' : ' · bloom off'}${autoLowRes ? ' · auto 1×' : ''} · ${canvas.width}×${canvas.height}`;
  fpsFrames = 0;
  fpsSince = 0;
}

let last = performance.now();
let lastSave = last;
let lastTitle = 0;
let lastHabit = 0;
/** When each rare visitor was last on screen (ms), so a visit is announced once. */
const rarePassing = new Map<string, number>();
let lastJournal = 0;
let lastFeatCheck = 0;
let shownRecord = -1;
let lastWhaleLap = -1;
// ?at=<sec> starts the scene clock there (to reach timed events such as rare creatures).
let animT = params.has('at') ? Number(params.get('at')) : 40;
let needResize = true;
function frame(now: number): void {
  if (needResize) { resize(); needResize = false; }
  const dt = Math.max(0, (now - last) / 1000);
  last = now;
  if (frozenT === null) {
    // A long gap means the tab slept; treat it like being away.
    if (dt > AWAY_NOTICE) catchUp(dt * speed);
    else advance(state, dt * speed);
    animT += Math.min(dt, 0.1) * (reducedMotion.matches || calm.get() ? 0.3 : 1);
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
    setZoneTint(actAt(state.height));
    audio.cue('zone');
    // Let the new zone arrive (title, ascent) before the band that tells it opens.
    panel.holdStories(4000);
    whisper.classList.remove('show');
    lastWhisper = Math.max(lastWhisper, now - 80_000 + 10_000);
  }
  const p0 = performance.now();
  applyZoom(ctx);
  scene.draw(ctx, tNow, v);
  const p1 = performance.now();
  if (fadingFrom) {
    const k = (tNow - fadeStart) / FADE;
    if (k >= 1) fadingFrom = null;
    else {
      applyZoom(fadeCtx);
      fadingFrom.draw(fadeCtx, tNow, v);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.save();
      ctx.globalAlpha = 1 - k * k * (3 - 2 * k);
      ctx.drawImage(fadeCanvas, 0, 0);
      ctx.restore();
      drawAscent(k);
      applyZoom(ctx);
    }
  }
  const fe = currentFeast(state);
  if (fe) drawFeast(ctx, fe, state.t - fe.start, tNow, focusNow, dpr, feastPay(state));
  taps.draw(ctx, tNow, scene.crownAt, dpr, (x, y) => actAt(state.height) <= 2 || !!scene.darkAt?.(x, y));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  endFrameSpots();
  if (now - lastPortrait > 1000 && frozenT === null && !fadingFrom && zoom.k === 1) {
    lastPortrait = now;
    takePortrait();
  }
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
  updateGauge();
  // The journal: creatures drawn on screen are recorded the first time they are seen.
  // (Not while the title is still showing over a new reef: the note would sit on it.)
  if (now - lastJournal > 1000 && title.classList.contains('faded')) {
    lastJournal = now;
    for (const id of takeSightings()) {
      const key = `c:${id}`;
      const c = CREATURES.find((x) => x.id === id);
      // A rare visitor already in the journal: say it is passing, once per visit.
      if (frozenT === null && c?.note.startsWith('Rare.') && state.meta.seen.includes(key) && now - (rarePassing.get(id) ?? -1e9) > 120_000) {
        showJournalNote(JOURNAL_PASSING, c.name);
        audio.cue('whisper');
      }
      if (c?.note.startsWith('Rare.')) rarePassing.set(id, now);
      if (frozenT !== null || state.meta.seen.includes(key)) continue;
      state.meta.seen.push(key);
      if (c?.note.startsWith('Rare.')) {
        showJournalNote('A rare sighting', c.name);
        audio.cue('feast');
      } else if (c) showJournalNote('Seen for the first time', c.name);
    }
  }
  // Feats: each earned once per lineage, worth one lineage (checked once a second).
  if (now - lastFeatCheck > 1000 && frozenT === null && botT === null) {
    lastFeatCheck = now;
    for (const f of newFeats(state)) {
      state.meta.seen.push(`f:${f.id}`);
      state.meta.lineage += 1;
      showJournalNote('Feat · +1 lineage', f.name);
      buzz(25);
      audio.cue('buy');
    }
  }
  // The line's record (set by the sim at the exact moment of reaching the surface): announce a new one.
  if (state.meta.fastest !== shownRecord) {
    if (shownRecord > 0 && frozenT === null) showJournalNote('A new record', `The surface in ${duration(state.meta.fastest)}`);
    shownRecord = state.meta.fastest;
  }
  // Shared table: a feast left to sink is eaten by the scavengers, half for the reef.
  if (frozenT === null && tableFeast(state)) eatFeast(LINEAGE.tableShare);
  // Old habits: the reef's own small purchases, only while the page is open.
  if (habits.get() && frozenT === null && now - lastHabit > 250) {
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
    const who = reefName(state) || 'Corallum';
    const t = ended(state) ? `${who} · spawned` : state.height < 1 ? who : `${metres(state.height)} · ${who}`;
    if (document.title !== t) document.title = t;
  }
  if (frozenT === null) requestAnimationFrame(frame);
  else document.documentElement.dataset.ready = '1';
}

/** Layout changed: resize on the next frame (a frozen ?t page draws just that one frame). */
function relayout(): void {
  needResize = true;
  if (frozenT !== null) requestAnimationFrame(frame);
}
window.addEventListener('resize', relayout);
new ResizeObserver(relayout).observe(panel.element);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
window.addEventListener('pagehide', save);
requestAnimationFrame(frame);
