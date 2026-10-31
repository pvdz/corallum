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
import { drawFragment, drawPinned, drawStray, drawTangle } from '../game/render/tangle.ts';
import { drawOthersSpawn } from '../game/render/spawning.ts';
import { createBreachScene, lightningAt, squallAt } from '../game/render/breach.ts';
import { createSunlitScene } from '../game/render/sunlit.ts';
import { createTwilightScene } from '../game/render/twilight.ts';
import { createTaps } from '../game/render/taps.ts';
import { drawFeast, feastPos, feastReach } from '../game/render/feast.ts';
import { zoom, type EffectKind, type Focus, type ReefView, type Scene } from '../game/render/scene.ts';
import { runBot } from '../game/sim/bot.ts';
import { ROAM, SITES, type SiteId } from '../game/content/expeditions.ts';
import { WATER } from '../game/content/waters.ts';
import { COUSIN, SISTER } from '../game/content/sister.ts';
import { PALETTES } from '../game/content/palettes.ts';
import { REQUEST } from '../game/content/requests.ts';
import { SHELL, SHELLS } from '../game/content/shells.ts';
import { SHARD, SHARD_LINES } from '../game/content/shards.ts';
import { drawWater } from '../game/render/waters.ts';
import { advance, assign, breach, canBreach, buy, timeUntil, currentFeast, feast, feastPay, gift, tableFeast, greatTide, calciteHold, choose, ended, moonFull, moonPhase, untilFullMoon, spawnTarget, feeding, lure, rates, read, send, build, inFlurry, untilFlurry, inMilky, milkyGlow, moonlitSpawn, inHeat, untilHeat, closedNow, closeUp, cyclesBetween, dream, flare, elderBlessed, currentRiddle, setDay, currentUpwelling, catchUpwelling, currentSwell, rideSwell, answerOssel, osselAsks, heatLength, feedRising, inRising, canFeedRising, figureOpen, nameFigure, pickShell, currentShell, currentFragment, takeFragment, currentStray, callStray, currentRaft, shelterRaft, blueMoon, helpTangle, currentTangle, freeTangle, lucky, visitor, visited, meteorShower, makeWish, prune, oldKnobs, oldHeld, answerRiddle, dailyGift, forkOpen, strainOpen, takeFork, chooseStrain, chooseGrain, chooseSport, sportOpen, plant, answerSignal, currentSignal, setCurrent, callHome, cousinRaces, sisterNow, lightSister, prepareAway, nextMoment, othersSpawning, boonsOffered, chooseBoon, currentThorn, crabThorn, pryThorn, skipRequest, meetOthers, sisterAt, tripSeconds, remember, welcome, welcomeHaul, tripSite, house, meet, askFavour, setRasp, waterAt, untilWaterTurns, smother, speak, sweep } from '../game/sim/economy.ts';
import { deserialize, exportString, importString, serialize } from '../game/sim/save.ts';
import { newGame, type GameState } from '../game/sim/state.ts';
import { duration, metres, num, setScientific } from '../game/ui/format.ts';
import { createAudio, type Cue } from '../game/audio/audio.ts';
import { AWAY_CYCLES, AWAY_PREP, DAILY, DREAM, NOTIFY, SWELL, FEAST, SIGNAL, THORN, WELCOME, TODAY, TANGLE, FRAGMENT, STRAY, RAFT } from '../game/content/events.ts';
import { LINEAGE, LINEAGE_BANDS, SEAMOUNTS, TRIAL_TEXT } from '../game/content/lineage.ts';
import { CREATURES, JOURNAL_PASSING, GIFT, GIFT_TEXT, GIFT_WORD, LUCKY, giftOf, TRUST, trustLevel, COMPANION, type CreatureId } from '../game/content/creatures.ts';
import { newFeats } from '../game/content/feats.ts';
import { createPortraits } from './portraits.ts';
import { createZoom } from './zoom.ts';
import { drawMoon, glow as glowAt } from '../game/render/draw.ts';
import { ACT5, GAUGE_MOON } from '../game/content/act5.ts';
import { creatureAt, endFrameSpots, hover, poke, spoke, startle, tappable, takeSightings } from '../game/render/sightings.ts';
import { HEAT } from '../game/content/act4.ts';
import { AGAIN, QUESTION, QUESTIONS, OSSEL_PAST } from '../game/content/ossel.ts';
import { MILKY, RISING } from '../game/content/act2.ts';
import { UPWELL } from '../game/content/act3.ts';
import { FIGURES, SKY, WISH, type FigureId, type WishId } from '../game/content/sky.ts';
import { ACT1, FLARE, GRAINS, OLD, MILESTONES, SPORTS, STRAINS, type Milestone } from '../game/content/act1.ts';
import { diaryLine } from '../game/content/diary.ts';
import { OSSEL_LINES, OSSEL_LINES_TRUE, OSSEL_NOW, WHISPERS, WHISPER_BY } from '../game/content/whispers.ts';
import { UI } from '../game/content/ui.ts';
import { NEWS, ZONE_GUIDE } from '../game/content/guide.ts';
import { OSSEL_MISTAKE, OSSEL_MISTAKES } from '../game/content/ossel.ts';
import { buyTrait, forgetTrait, grainSense, habitPurchase, raspSense, shoalSense, spawnLesser } from '../game/sim/prestige.ts';
import { createFinale } from '../game/ui/finale.ts';
import { createPanel, reefName } from '../game/ui/panel.ts';
import { setting } from './settings.ts';

declare global {
  interface Window {
    corallum?: {
      state: GameState; skip(seconds: number): void; speed: number; prof: { draw: number; panel: number };
      /** Where the falling feast is, in CSS pixels (null when there is none). */
      readonly feast: { x: number; y: number } | null;
      /** Play a purchase flourish on the reef (for checking effects). */
      flourish(kind: string): void;
      /** View-mode zoom factor (1 = none). */
      readonly zoom: number;
      /** The tappable creatures on screen, in CSS pixels. */
      readonly spots: { id: string; x: number; y: number; n?: number }[];
      /** Move the clock to the next time slot with this water (for checking its look). */
      water(id: string): boolean;
      /** Move the clock to the next shell on the sand (for checking it). */
      shell(): boolean;
      /** Move the clock into the next tangle (a fish to free). */
      tangle(): boolean;
      /** Move the clock into the next lost shoal, or the next drifting fragment. */
      stray(): boolean;
      fragment(): boolean;
      /** Move the clock into the next weed raft at the Breach. */
      raft(): boolean;
      /** Move the clock to the next shoal signal; returns its pattern (for checking it). */
      signal(): number[] | null;
      /** Move the clock into the next thorn star's climb (for checking it). */
      thorn(): boolean;
    };
  }
}

const SAVE_KEY = 'corallum.save';
const AWAY_NOTICE = 60;
/** When the last save was copied out (wall clock), and how often to suggest another copy. */
const EXPORTED_KEY = 'corallum.exported';
const BACKUP_EVERY = 3 * 86400e3;

const params = new URLSearchParams(location.search);
// Offline play: a network-first service worker (src/client/sw.ts). Left out under automation
// (the browser tests) unless asked for with ?sw.
if ('serviceWorker' in navigator && (!navigator.webdriver || params.has('sw'))) {
  navigator.serviceWorker.register('/sw.js').catch(() => { /* no offline copy: the game still runs */ });
}
const frozenT = params.has('t') ? Number(params.get('t')) : null;
const botT = params.has('bot') ? Number(params.get('bot')) : null;
const ephemeral = frozenT !== null || botT !== null || params.has('fresh');
const seed = Number(params.get('seed') ?? 20261026);

function storageGet(): string | null {
  try { return localStorage.getItem(SAVE_KEY); } catch { return null; }
}
function storageSet(text: string): void {
  try { localStorage.setItem(SAVE_KEY, text); return; } catch { /* full, or private mode */ }
  // Storage full: the reef matters more than the journal's pictures. Close-ups go first, then the rest.
  for (const key of ['corallum.portraits.close', 'corallum.portraits']) {
    try {
      localStorage.removeItem(key);
      localStorage.setItem(SAVE_KEY, text);
      return;
    } catch { /* still no room: private mode, play unsaved */ }
  }
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
  const raw = params.has('fresh') ? null : storageGet();
  const loaded = raw ? deserialize(raw) : null;
  // A save that cannot be read is moved aside, so the new reef can save without overwriting it
  // (left in place it would also look like another tab's save, and this page would never write).
  if (raw && !loaded) {
    try {
      localStorage.setItem(`${SAVE_KEY}.unreadable`, raw);
      localStorage.removeItem(SAVE_KEY);
    } catch { /* no room to keep a copy: leave it where it is */ }
  }
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
  soundBtn.title = audio.enabled ? UI.soundOn : UI.soundOff;
  soundBtn.setAttribute('aria-pressed', String(audio.enabled));
}
soundBtn.addEventListener('click', () => {
  audio.setEnabled(!audio.enabled);
  try { localStorage.setItem(SOUND_KEY, audio.enabled ? 'on' : 'off'); } catch { /* no storage */ }
  renderSound();
});
renderSound();
// The sound sleeps while the page is hidden, and wakes when it is shown or touched.
document.addEventListener('visibilitychange', () => audio.wake(!document.hidden));
window.addEventListener('pointerdown', () => audio.wake(true));
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
/** Fewer words from Ossel: only the whispers that carry story. */
const quiet = setting('quiet', false);
/** Browser notifications for what waits while the tab is hidden; asks for permission when turned on. */
const notify = setting('notify', false, (on, initial) => {
  if (!on || initial || !('Notification' in window) || Notification.permission === 'granted') return;
  void Notification.requestPermission().then((p) => { if (p !== 'granted') notify.set(false); });
});
/** Larger text: the panel, the reader and Ossel's words a size up. */
const big = setting('big', false, (on, initial) => { document.documentElement.classList.toggle('big', on); if (!initial) relayout(); });
const sci = setting('sci', false, (on) => setScientific(on));
const volume = setting('volume', 0.9, (v) => audio.setVolume(v));
/** Full resolution: off renders at 1× (a quarter of the pixels on a 2× screen) for slow phones. */
const sharp = setting('sharp', true, (_, initial) => { if (!initial) relayout(); });
/** Vibration on phones: a tick per purchase, a pulse for milestones and feats (on for touch screens). */
const buzzing = setting('buzz', window.matchMedia('(pointer: coarse)').matches);
// Phones only vibrate after a real touch on the page (the browser refuses, and complains, before it).
let touched = false;
window.addEventListener('touchstart', () => { touched = true; }, { once: true, passive: true });
function buzz(ms: number | number[]): void {
  if (touched && buzzing.get() && 'vibrate' in navigator) navigator.vibrate(ms);
}

const portraits = createPortraits(!ephemeral);
const panel = createPanel(ui, {
  sharp, buzz: buzzing, volume, sci, calm, big, quiet, habits, glow, notify,
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
  buyMax(id: UpgradeId) {
    let n = 0;
    while (n < 1000 && purchase(id)) n++;
    if (n) save();
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
  answerRiddle(id, choice) {
    const ok = answerRiddle(state, id, choice);
    audio.cue(ok ? 'shard' : 'crunch');
    save();
    return ok;
  },
  takeFork(how) {
    if (!takeFork(state, how)) return;
    audio.cue(how === 'press' || how === 'wait' || how === 'follow' || how === 'gather' ? 'depart' : 'choice');
    save();
  },
  makeWish: wish,
  chooseSport(id) {
    if (!chooseSport(state, id)) return;
    scene.effect('symbiont');
    audio.cue('shimmer');
    save();
  },
  chooseGrain(id) {
    if (!chooseGrain(state, id)) return;
    scene.effect('skeleton');
    audio.cue('shimmer');
    save();
  },
  chooseStrain(id) {
    if (!chooseStrain(state, id)) return;
    scene.effect('symbiont');
    audio.cue('choice');
    save();
  },
  chooseBoon(id) {
    if (!chooseBoon(state, id)) return;
    scene.effect('truce');
    audio.cue('choice');
    save();
  },
  meetOthers(how) {
    if (!meetOthers(state, how)) return;
    scene.effect('ripen');
    audio.cue(how === 'join' ? 'release' : 'feast');
    buzz(25);
    save();
  },
  prepareAway() {
    const done = prepareAway(state);
    if (done.includes('trip')) audio.cue('depart');
    save();
    return done.length ? done.map((d) => (d === 'rasp' ? AWAY_PREP.rasp : AWAY_PREP.trip)).join(', ') : AWAY_PREP.nothing;
  },
  lamp(i) {
    lampFlash = { rgb: SIGNAL.lamps[i]!, at: performance.now() };
  },
  answerSignal(answer) {
    const pay = answerSignal(state, answer);
    audio.cue(pay > 0 ? 'shimmer' : 'touch');
    if (pay > 0) buzz([20, 30, 20]);
    save();
    return pay;
  },
  skipRequest() {
    if (skipRequest(state)) save();
  },
  plant(kind) {
    if (!plant(state, kind)) return;
    scene.effect('polyp');
    audio.cue('buy');
    save();
  },
  build(id) {
    if (!build(state, id)) return;
    scene.effect('grounds');
    audio.cue('zone');
    buzz([30, 40, 30]);
    save();
  },
  companion(id) {
    state.meta.companion = id;
    audio.cue('touch');
    save();
  },
  recolour(id) {
    const feat = PALETTES.find((p) => p.id === id)?.feat;
    if (feat && !state.meta.seen.includes(`f:${feat}`)) return;
    state.meta.palette = id;
    scene.effect('pigment');
    audio.cue('shimmer');
    save();
  },
  tracing: () => tracing?.id ?? null,
  trace(id) {
    tracing = tracing?.id === id || !figureOpen(state, id) ? null : { id, n: 0 };
    if (tracing) audio.cue('shimmer');
  },
  feedRising: sendFeeders,
  flare: flareLure,
  lightSister(yes) {
    if (!lightSister(state, yes)) return;
    audio.cue(yes ? 'shimmer' : 'choice');
    save();
  },
  blessed: () => elderBlessed(state),
  signalStreak: () => state.signal.streak,
  answerOssel(id, i) {
    const q = QUESTIONS.find((x) => x.id === id);
    if (!q || !answerOssel(state, id, i)) return;
    audio.cue('whisper');
    panel.story(QUESTION.kicker, q.answers[i].label, q.answers[i].reply);
    save();
  },
  dream() {
    if (!dream(state)) return;
    audio.cue('whisper');
    catchUp(DREAM.seconds);
    const said = DREAM.dreams[(state.seed + state.tally.sweeps + Math.floor(state.t)) % DREAM.dreams.length]!;
    panel.story(DREAM.kicker, DREAM.label(state.meta.dreams).replace(/ \(\d+\)$/, ''), said);
    save();
  },
  closeUp: setClosed,
  setCurrent(c) {
    setCurrent(state, c);
    audio.cue('sweep');
    // Turned toward an upwelling while it lasts: a haul.
    const gain = catchUpwelling(state);
    if (gain > 0) {
      const [x, y] = toScreen(scene.crownAt[0], scene.crownAt[1]);
      floatText(x / dpr, y / dpr, `+${num(gain)} calcite ${UPWELL.caught}`, 'feast-float');
      audio.cue('feast');
    }
    save();
  },
  favour(id) {
    if (!askFavour(state, id)) return;
    scene.effect('grounds');
    audio.cue('crunch');
    buzz(15);
    save();
  },
  meet(id, c) {
    if (!meet(state, id, c)) return;
    scene.effect('truce');
    audio.cue('choice');
    buzz(25);
    save();
  },
  house(id) {
    if (!house(state, id)) return;
    audio.cue('touch');
    buzz(15);
    save();
  },
  callHome() {
    if (!callHome(state)) return;
    audio.cue('story');
    save();
  },
  send() {
    if (!send(state)) return;
    audio.cue('depart');
    buzz(20);
    save();
  },
  spawnLesser(where, heirloom, vows) {
    const next = spawnLesser(state, where, heirloom as SiteId | '', vows);
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
    line.textContent = UI.driftsAway;
    send.append(line);
    ui.append(send);
    audio.cue('release');
    setTimeout(() => location.reload(), reducedMotion.matches ? 600 : 3400);
  },
  forgetTrait(id) {
    if (forgetTrait(state, id) > 0) { audio.cue('whisper'); save(); }
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
  timelapse() { startLapse(); },
  reset() {
    portraits.clear();
    state = newGame(seed);
    save();
    location.reload();
  },
});
panel.primeStories(state);
// A new day's gift (calendar days in local time; never in debug sessions).
if (frozenT === null && botT === null) {
  const now0 = new Date();
  const day = Math.floor((now0.getTime() - now0.getTimezoneOffset() * 60_000) / 86_400_000);
  setDay(state, day);
  const pay = dailyGift(state, day);
  if (pay > 0) setTimeout(() => showJournalNote(DAILY.kicker, `${DAILY.text} +${num(pay)} ${feastPay(state)} ${DREAM.gained}`), 2500);
}
// Once after an update: what is new (not on a brand-new reef, which meets everything as it comes).
if (!state.meta.seen.includes(NEWS.id) && (state.t > 600 || state.meta.spawnings > 0) && frozenT === null && botT === null) {
  state.meta.seen.push(NEWS.id);
  panel.story(NEWS.kicker, NEWS.title, NEWS.text);
} else if (!state.meta.seen.includes(NEWS.id) && state.t <= 600) state.meta.seen.push(NEWS.id);
// A new reef after an ending: Ossel remembers (once per number of endings, the last line for five or more).
if (state.meta.endings > 0 && state.t < 120 && frozenT === null && botT === null) {
  const n = Math.min(AGAIN.lines.length, state.meta.endings);
  if (!state.meta.seen.includes(`again:${n}`)) {
    state.meta.seen.push(`again:${n}`);
    panel.story(AGAIN.kicker, AGAIN.lines[n - 1]!.title, AGAIN.lines[n - 1]!.text);
  }
}
for (const m of OSSEL_MISTAKES) if (state.meta.seen.includes(`o:${m.id}`)) panel.keepStory('Ossel', OSSEL_MISTAKE.kicker, m.title, m.correction, false);
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
      `${lb.text}${where && where.id !== 'plain' ? ` ${where.text}` : ''}` +
      (where?.trial ? ` A hard place (${where.effect}): grow to ${where.trial.goal.toLocaleString('en-US')} m here, and the line learns it.` : ''));
  }
}
const replay = document.createElement('button');
replay.className = 'plain';
replay.textContent = UI.readAgain;
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
  const before = { calcite: state.calcite, glow: state.glow, height: state.height, bands: state.bands.length,
    relics: state.relics.length, roams: state.tally.roams, shards: state.meta.shards.length };
  // When the stores would have filled, from the state as it was left.
  const start = structuredClone(state);
  const fullAfter = timeUntil(start, 'calcite', 0.98 * calciteHold(start));
  const cycles = cyclesBetween(start, start.t, start.t + seconds);
  advance(state, seconds);
  panel.showAway(seconds, {
    bands: state.bands.slice(before.bands),
    calcite: Math.max(0, state.calcite - before.calcite),
    glow: Math.max(0, state.glow - before.glow),
    metres: state.height - before.height,
    full: state.calcite >= 0.98 * calciteHold(state),
    fullAfter: fullAfter < seconds ? fullAfter : null,
    relics: state.relics.slice(before.relics).map((id) => SITES.find((x) => x.id === id)?.relic ?? id),
    roams: state.tally.roams - before.roams,
    shards: state.meta.shards.length - before.shards,
    heat: cycles.heat ? (start.closed ? AWAY_CYCLES.heatClosed(cycles.heat) : start.meta.traits['sun-shy'] ? AWAY_CYCLES.heatShy(cycles.heat) : AWAY_CYCLES.heatOpen(cycles.heat)) : '',
    risings: cycles.risings ? AWAY_CYCLES.risings(cycles.risings) : '',
    old: oldKnobs(state) > oldKnobs(start) ? AWAY_CYCLES.knobs(oldKnobs(state)) : '',
  }, seconds >= WELCOME.after && state.levels.polyp > 0 ? [
    { label: WELCOME.haul, note: `+${num(welcomeHaul(state, seconds))} calcite`, take: () => { const g = welcome(state, 'haul', seconds); save(); return `+${num(g)} calcite`; } },
    { label: WELCOME.search, note: WELCOME.searchNote, take: () => { const n = welcome(state, 'search', seconds); save(); return n ? `${n} shard${n > 1 ? 's' : ''}` : 'nothing this time'; } },
  ] : undefined);
}

// Offline catch-up on load. Exact: the economy is closed-form and saturates by itself.
if (botT === null && frozenT === null) {
  const away = (Date.now() - savedAt) / 1000;
  if (away > AWAY_NOTICE && state.t > 0) catchUp(away);
  else if (away > 0) advance(state, away);
}
if (params.has('skip')) catchUp(Number(params.get('skip')));

let speed = Number(params.get('speed') ?? 1);
/** Relics found so far (a homecoming while watching gets the reading's light). */
let relicsSeen = state.relics.length;
/** A signal lamp's flash in the world (colour and when it lit). */
let lampFlash: { rgb: string; at: number } | null = null;
/** Shards the line had found (a new one is announced). */
let shardsSeen = state.meta.shards.length;
/** The intruder and the waiting choice last announced. */
let thornHeard = -1, choiceHeard = '|false|false|false';
/** The water last heard (a turn to a new water gets its swell). */
let waterHeard = '';
let risingHeard = true, heatHeard = true, upHeard = true, swellHeard = true;
/** Sister race marks decided and won (a new one is announced). */
let raceSeen = state.race.decided, raceWon = state.race.won;
/** The line's best times as last seen (a beaten one is announced). */
let recordsSeen = [...state.meta.records];
/** Roams come home (announced while watching). */
let roamsSeen = state.tally.roams;
/** Requests kept so far (a kept one while watching is announced). */
let requestsSeen = state.request.done;
/** Whether this reef's trial was already met when the page loaded (no announcement then). */
const trialAtLoad = state.meta.seen.includes(`trial:${state.seamount}`);
let trialShown = false;
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
  flourish: (kind: string) => scene.effect(kind as EffectKind),
  stray() {
    const t0 = state.t;
    for (let dt = 0; dt < 5000; dt += 2) {
      state.t = t0 + dt;
      if (currentStray(state)) { state.t += 5; return true; }
    }
    state.t = t0;
    return false;
  },
  fragment() {
    const t0 = state.t;
    for (let dt = 0; dt < 5000; dt += 2) {
      state.t = t0 + dt;
      if (currentFragment(state)) { state.t += 5; return true; }
    }
    state.t = t0;
    return false;
  },
  raft() {
    const t0 = state.t;
    for (let dt = 0; dt < 5000; dt += 2) {
      state.t = t0 + dt;
      if (currentRaft(state)) { state.t += 10; return true; }
    }
    state.t = t0;
    return false;
  },
  tangle() {
    const t0 = state.t;
    for (let dt = 0; dt < 5000; dt += 2) {
      state.t = t0 + dt;
      if (currentTangle(state)) { state.t += 4; return true; }
    }
    state.t = t0;
    return false;
  },
  shell() {
    const t0 = state.t;
    for (let dt = 0; dt < 5000; dt += 5) {
      state.t = t0 + dt;
      if (currentShell(state)) { state.t += 3; return true; }
    }
    state.t = t0;
    return false;
  },
  signal() {
    const t0 = state.t;
    for (let dt = 0; dt < 5000; dt += 5) {
      state.t = t0 + dt;
      const sg = currentSignal(state);
      if (sg) return sg.pattern;
    }
    state.t = t0;
    return null;
  },
  thorn() {
    const t0 = state.t;
    for (let dt = 0; dt < 5000; dt += 5) {
      state.t = t0 + dt;
      if (currentThorn(state)) { state.t += 20; return true; }
    }
    state.t = t0;
    return false;
  },
  water(id: string) {
    const k0 = Math.floor(state.t / WATER.period);
    for (let k = k0; k < k0 + 500; k++) {
      if (waterAt(state, k).id !== id) continue;
      state.t = k * WATER.period + 60;
      return true;
    }
    return false;
  },
  get spots() {
    return tappable().map((p) => ({ id: p.id, x: p.x / dpr, y: p.y / dpr, n: p.n }));
  },
};

// Layout: the panel covers the right side (wide screens) or the bottom (narrow ones);
// the scene frames the reef in what is left.
let dpr = 1;
let focusNow: Focus = { x: 0, y: 0, w: 1, h: 1 };
let lastDpr = 0;
function resize(): void {
  dpr = sharp.get() && !autoLowRes ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const w = Math.round(window.innerWidth * dpr);
  const h = Math.round(window.innerHeight * dpr);
  const r = panel.element.getBoundingClientRect();
  const side = r.left > window.innerWidth * 0.3;
  // A phone sheet drawn up tall covers the reef for a while; the scene keeps its usual framing.
  const top = panel.element.classList.contains('tall') ? window.innerHeight * 0.53 : r.top;
  // With the panel hidden (view mode) the scene frames the whole screen.
  const focus: Focus = viewMode ? { x: 0, y: 0, w, h } : side
    ? { x: 0, y: 0, w: Math.round(r.left * dpr), h }
    : { x: 0, y: 0, w, h: Math.round(top * dpr) };
  // Nothing moved (the sheet sliding, a panel card growing): the canvases and scenes stay as they are.
  if (canvas.width === w && canvas.height === h && dpr === lastDpr && focus.x === focusNow.x && focus.y === focusNow.y && focus.w === focusNow.w && focus.h === focusNow.h) return;
  lastDpr = dpr;
  canvas.width = fadeCanvas.width = w;
  canvas.height = fadeCanvas.height = h;
  for (const sc of scenes) sc.resize(w, h, dpr, focus);
  focusNow = focus;
}

function tripView(): ReefView['trip'] {
  const ex = state.expedition;
  const x = tripSite(state);
  if (!x) return null;
  const i = SITES.indexOf(x) + state.tally.roams;
  return { shoals: x.shoals, since: tripSeconds(state, x) - (ex.back - state.t), left: ex.back - state.t, side: i % 2 ? -1 : 1, site: x.id };
}

function thornView(): ReefView['thorn'] {
  const th = currentThorn(state);
  return th ? { u: (state.t - th.start) / THORN.life, side: th.side, kind: th.kind } : null;
}

/** What was waiting at the last check, so each thing is announced once as it begins. */
const announced = { rising: true, heat: true, away: false, moon: true };
/** Background-tab notifications (a setting): a rising, warm water on an open reef, shoals home, the full moon. */
function notifyWaiting(): void {
  const now = {
    rising: canFeedRising(state),
    heat: inHeat(state) && !closedNow(state),
    away: state.expedition.site !== '',
    moon: canBreach(state),
  };
  const say: string[] = [];
  if (now.rising && !announced.rising) say.push(NOTIFY.rising);
  if (now.heat && !announced.heat) say.push(NOTIFY.heat);
  if (!now.away && announced.away) say.push(NOTIFY.home);
  if (now.moon && !announced.moon) say.push(NOTIFY.moon);
  Object.assign(announced, now);
  if (!say.length || !notify.get() || !document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(reefName(state) || 'Corallum', { body: say.join(' '), tag: 'corallum', icon: '/favicon.ico' }); } catch { /* not allowed here */ }
}

/** Flare the lure (panel button or L): half the glow for a burst of calcite. */
function flareLure(): void {
  const gain = flare(state);
  if (gain <= 0) return;
  scene.effect('lure');
  audio.cue('shimmer');
  const [x, y] = toScreen(scene.crownAt[0], scene.crownAt[1]);
  floatText(x / dpr, y / dpr, `+${num(gain)} ${feastPay(state)} · ${FLARE.float}`, 'feast-float');
  save();
}

/** Send the feeding shoals into the rising (panel button or R). */
function sendFeeders(): void {
  const gain = feedRising(state);
  if (gain <= 0) return;
  const [x, y] = scene.crownAt;
  const [sx, sy] = toScreen(x, y);
  floatText(sx / dpr, sy / dpr, `+${num(gain)} calcite ${RISING.float}`, 'feast-float');
  audio.cue('feast');
  buzz([10, 30, 10]);
  save();
}

/** Close the polyps against warm water, or open them (panel button or C). */
function setClosed(closed: boolean): void {
  closeUp(state, closed);
  audio.cue('sweep');
  save();
}

/** The figure being traced in the night sky (stars joined so far); only on screen, never saved. */
let tracing: { id: FigureId; n: number } | null = null;

/** A star of the figure being traced was tapped: the next one joins it; the last names the figure. */
function tapStar(n: number, x: number, y: number): void {
  if (!tracing || frozenT !== null) return;
  if (n !== tracing.n) {
    // The wrong star: the figure stays as it was; a soft note says so.
    audio.cue('sweep');
    return;
  }
  tracing.n++;
  audio.cue('shimmer');
  buzz(6);
  const f = FIGURES.find((g) => g.id === tracing!.id)!;
  if (tracing.n < f.stars.length) return;
  tracing = null;
  if (!nameFigure(state, f.id)) return;
  floatText(x, y - 20, f.name, 'feast-float');
  showJournalNote(SKY.title, `${f.name} · ${f.text}`);
  audio.cue('moment');
  save();
}

/** The rising as the scenes show it: the stream thickens over half a minute and thins at the end. */
function risingView(): number {
  if (!inRising(state)) return 0;
  const u = state.t % HEAT.period - RISING.start;
  return Math.min(1, u / 30, (RISING.length - u) / 30);
}

/** The upwelling as the Twilight scene shows it: its side and how strong (eases in and out). */
function upwellView(): ReefView['upwell'] {
  const up = currentUpwelling(state);
  if (!up) return null;
  const u = (state.t - up.start) / UPWELL.life;
  return { side: up.side, strength: Math.min(1, u * 6, (1 - u) * 6), caught: state.upwelled === up.k };
}

/** The set of swells rolling in, as the Breach scene shows it. */
function swellView(): ReefView['swell'] {
  const sw = currentSwell(state);
  return sw ? { since: state.t - sw.start, caught: state.swell.k === sw.k ? state.swell.caught : 0 } : null;
}

/** Try to ride the swell (a tap near the crown, or S): spawn on a caught crest, a word on a miss. */
function trySwell(x: number, y: number): boolean {
  const pay = rideSwell(state);
  if (pay < 0) return false;
  if (pay > 0) {
    floatText(x, y - 20, `+${num(pay)} spawn ${SWELL.hit}`, 'feast-float');
    audio.cue('feast');
    buzz([10, 20, 10]);
    save();
  } else floatText(x, y - 20, SWELL.miss, 'feast-float');
  return true;
}

/** The warm spell as the Sunlit scene shows it: warmth eases in and out, an open reef pales and recovers. */
function heatView(): ReefView['heat'] {
  const closed = closedNow(state);
  if (!Number.isFinite(untilHeat(state))) return { warm: 0, bleach: 0, closed };
  const u = state.t % HEAT.period;
  const len = heatLength(state);
  const warm = u < len ? Math.min(1, u / 20, (len - u) / 20) : 0;
  const peak = Math.min(1, len / 150) * 0.75;
  // A sun-shy reef closed through the spell, so it has nothing to recover from after it.
  const bleach = closed || state.meta.traits['sun-shy'] ? 0 : u < len ? Math.min(1, u / 150) * 0.75 : Math.max(0, peak - (u - len) / 120);
  return { warm, bleach, closed };
}

function view(): ReefView {
  const r = rates(state);
  return {
    polyps: state.levels.polyp,
    polypTier: MILESTONES.polyp.filter((m) => state.levels.polyp >= m.level).length,
    glowTier: MILESTONES.symbiont.filter((m) => state.levels.symbiont >= m.level).length,
    symbionts: state.levels.symbiont,
    height: lapseHeight() ?? state.height,
    glowLevel: r.lureMax > 0 ? (lure(r, state.glow, state.height) - 1) / r.lureMax : 0,
    sinceFlare: state.t - state.lastFlare,
    calm: reducedMotion.matches || calm.get(),
    sinceSweep: state.t - state.lastSweep,
    vent: state.levels.vent,
    shoals: state.levels.shoal,
    jobs: state.jobs,
    trip: tripView(),
    residents: state.residents,
    relics: state.relics,
    palette: state.meta.palette,
    nurseries: state.levels.daughter,
    works: state.works,
    sister: sisterNow(state, state.t),
    current: state.current,
    song: state.dialects.song,
    garden: state.garden,
    gardenKinds: state.gardenKinds,
    cays: state.levels.cay,
    strainRgb: SPORTS.find((x) => x.id === state.sport)?.rgb ?? STRAINS.find((x) => x.id === state.strain)?.rgb ?? '',
    ancestors: state.meta.ancestors.map((a) => Number(a.split('|')[0]) || 0),
    gauge: gaugeAt(state.height),
    moments: state.moments,
    thorn: thornView(),
    shell: currentShell(state),
    flurry: inFlurry(state),
    milky: inMilky(state),
    heat: heatView(),
    sisterLit: state.race.lit > 0,
    grotto: state.levels.grotto,
    blueMoon: blueMoon(state.t),
    age: state.t,
    combo: state.t - state.lastSweep <= ACT1.comboGap ? state.combo : 1,
    fragments: state.fragments,
    fragmentAges: state.fragmentAt.map((x) => state.t - x),
    raft: (() => { const ra = currentRaft(state); return ra ? { k: ra.k, age: ra.age, life: RAFT.life } : null; })(),
    stranded: (() => { const tg = actAt(state.height) === 5 ? currentTangle(state) : null; return tg ? { k: tg.k, age: tg.age } : null; })(),
    meteor: meteorShower(state),
    old: { slots: state.oldSlots.slice(0, oldKnobs(state)), slot: state.pruned.slot, since: state.t - state.pruned.t,
      fall: ended(state) ? { slots: state.oldSlots.slice(0, Math.min(6, Math.floor(state.old))), since: state.t - state.breachedAt } : undefined },
    sweeten: state.levels.sweeten,
    endings: state.meta.endings,
    elder: !!currentRiddle(state),
    upwell: upwellView(),
    nets: state.levels.net,
    swell: swellView(),
    grains: state.grains.map((g) => GRAINS.find((x) => x.id === g)!.rgb),
    rising: risingView(),
    sky: { named: FIGURES.filter((f) => state.sky[f.id]).map((f) => f.id), tracing,
      known: FIGURES.filter((f) => !state.sky[f.id] && state.meta.seen.includes(`sky:${f.id}`)).map((f) => f.id) },
    othersSpawn: actAt(state.height) === 4 && moonFull(state.t),
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
/** A small note top-left ("Seen for the first time · Anglerfish"), one at a time; `now` goes ahead of the queue. */
function showJournalNote(kicker: string, name: string, now = false): void {
  if (now) journalQueue.unshift([kicker, name]);
  else journalQueue.push([kicker, name]);
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
    setTimeout(next, 4700); // the note's animation is 4.5 s
  };
  next();
}

/** Make a wish on falling stars (the wish card or W). */
function wish(id: WishId): void {
  const got = makeWish(state, id);
  if (!got) return;
  audio.cue('shimmer');
  scene.effect('wish');
  if (got >= 1000) showJournalNote(SHARD.found, SHARD_LINES[got - 1000] ?? '', true);
  else if (id === 'line') showJournalNote(WISH.kicker, WISH.lineGot, true);
  else floatText(innerWidth / 2, innerHeight / 3, `+${num(got)} ${feastPay(state)} ${WISH.float}`, 'feast-float');
  save();
}

/** The time-lapse: the reef regrows from the start of this zone to now over LAPSE seconds of scene time. */
const LAPSE = 8;
let lapseStart = -1;
function startLapse(): void {
  if (actAt(state.height) === 5) return;
  lapseStart = animT;
  hint.classList.add('done');
  audio.cue('zone');
}
function lapseHeight(): number | null {
  if (lapseStart < 0) return null;
  const k = (animT - lapseStart) / LAPSE;
  if (k >= 1 || k < 0) {
    lapseStart = -1;
    return null;
  }
  const from = act(actAt(state.height)).from;
  const e = k * k * (3 - 2 * k);
  return from + (state.height - from) * e;
}

/** Lucky neighbours on screen: golden sparks circling each one (where it was drawn last frame). */
function drawLucky(t: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // Today's visitor, untouched yet: a slow silver halo.
  const vis = visited(state) ? null : visitor(state);
  if (vis) {
    const p = tappable().find((q) => q.id === vis);
    if (p) {
      const r = Math.min(Math.max(p.r, 22 * dpr), 70 * dpr) * (1.1 + 0.08 * Math.sin(t * 1.5));
      glowAt(ctx, p.x, p.y, r * 1.3, '220,230,255', 0.12);
      ctx.strokeStyle = 'rgba(225,235,255,0.45)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  // One of its kind is the lucky one: the first drawn.
  const done = new Set<string>();
  for (const p of tappable()) {
    if (done.has(p.id) || p.id === 'ossel' || p.id === 'shell' || p.id === 'star' || p.id === 'old' || p.id === 'tangle' || p.id === 'fragment' || p.id === 'stray' || p.id === 'raft' || !lucky(state, p.id)) continue;
    done.add(p.id);
    // A soft chime the first time a lucky one shows in this span.
    const span = Math.floor(state.t / LUCKY.span);
    if (span !== luckyHeard && frozenT === null) {
      luckyHeard = span;
      audio.cue('shimmer');
    }
    const r = Math.min(Math.max(p.r, 22 * dpr), 70 * dpr);
    glowAt(ctx, p.x, p.y, r * 1.4, '255,200,90', 0.18);
    for (let k = 0; k < 8; k++) {
      const a = t * 1.6 + k * (Math.PI * 2 / 8);
      const tw = 0.5 + 0.5 * Math.sin(t * 5 + k * 1.9);
      glowAt(ctx, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.7, 7 * dpr, '255,215,120', 0.6 + 0.4 * tw);
    }
  }
  ctx.restore();
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
/** Ossel's lines about what is going on, said once a session each. */
const osselSaid = new Set<string>();
let osselTaps = 0;
function sayOssel(): void {
  if (++osselTaps >= 10 && !state.meta.seen.includes('did:ossel10')) state.meta.seen.push('did:ossel10');
  // Something going on gets a word first (each once a session), then the old lines in turn.
  const now = OSSEL_NOW.find((l) => !osselSaid.has(l.text) && l.when(state));
  if (now) osselSaid.add(now.text);
  // Once the line has caught Ossel out twice or more, Ossel speaks more humbly.
  const humbled = state.meta.seen.filter((k) => k.startsWith('o:')).length >= 2;
  const lines = humbled ? OSSEL_LINES_TRUE : OSSEL_LINES;
  showWhisperText(now ? now.text : lines[osselLine++ % lines.length]!);
}

function whisperCheck(now: number): void {
  // Quiet once the spawn has gone: nothing should talk over the ending.
  if (frozenT !== null || now - lastWhisper < 80_000 || now - lastWhisperCheck < 1000 || !reader() || ended(state)) return;
  lastWhisperCheck = now;
  // At the Breach only the moon speaks: the rest would talk over the spawning.
  // Fewer words: only the whispers that carry story (Ossel's claims, the moon).
  const w = ended(state) ? undefined : WHISPERS.find((x) => !state.meta.seen.includes(`w:${x.id}`) && (state.height < 3980 || x.id === 'moon' || x.id === 'wish' || x.id === 'moonlit') &&
    (!quiet.get() || x.id.startsWith('claim-') || x.id.startsWith('moon')) && x.when(state));
  if (!w) return;
  state.meta.seen.push(`w:${w.id}`);
  lastWhisper = now;
  showWhisperText(w.text);
}

/** A line from Ossel (or, once its wall is ground down, the sand) over the water. */
function showWhisperText(text: string): void {
  spoke(frozenT ?? animT);
  const speaker = state.truce.wall === 'a' ? WHISPER_BY.sand : WHISPER_BY.ossel;
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
hint.textContent = UI.tapHint;
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
let portraitAsk: (() => void) | null = null;
function takePortrait(): void {
  // Zoomed in (2× or more), a creature large in view earns a sharper close-up, once.
  const closeUp = zoom.k >= 2;
  for (const p of tappable()) {
    if (p.id === 'ossel' || p.id === 'shell' || p.id === 'star' || p.id === 'old' || p.id === 'tangle' || p.id === 'fragment' || p.id === 'stray' || p.id === 'raft' || !portraits.wants(p.id, closeUp)) continue;
    const [x, y] = toScreen(p.x, p.y);
    const r = p.r * zoom.k;
    if (closeUp && r < 60 * dpr) continue;
    const side = closeUp ? Math.min(canvas.height * 0.8, r * 2.4) : Math.min(280 * dpr, Math.max(70 * dpr, r * 2.4));
    const f = closeUp ? { x: 0, y: 0, w: canvas.width, h: canvas.height } : focusNow;
    if (x - side / 2 < f.x || x + side / 2 > f.x + f.w || y - side / 2 < f.y || y + side / 2 > f.y + f.h) continue;
    // Taken at the start of the next frame, before anything is drawn: the canvas then holds this
    // frame, finished, and the crop does not force its drawing through mid-frame.
    portraitAsk = () => portraits.capture(p.id, canvas, x, y, side, closeUp);
    if (closeUp && !state.meta.seen.includes('did:closeup')) state.meta.seen.push('did:closeup');
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
  // How well the line knows it (touches remembered across reefs).
  const tl = trustLevel(state.meta.trust[c.id] ?? 0);
  if (tl > 1) n.append(Object.assign(document.createElement('small'), { textContent: ` · ${TRUST.names[tl]}` }));
  if (state.meta.companion === c.id) n.append(Object.assign(document.createElement('small'), { textContent: ` · ${COMPANION.on.toLowerCase()} ★` }));
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

/** The sound a touched creature makes: glowing ones shimmer, birds cry, shelled ones click, fish bubble. */
function touchCue(id: string): Cue {
  if (giftOf(id as CreatureId) === 'glow') return 'shimmer';
  if (['shore-bird', 'gull', 'pelican'].includes(id)) return 'gull';
  if (['rasp', 'guard-crab', 'isopod', 'squat-lobster', 'pistol-shrimp', 'drill-snail', 'thorn-star', 'nautilus'].includes(id)) return 'crunch';
  if (['reef-fish', 'reef-shark', 'grouper', 'goby', 'damselfish', 'hatchetfish', 'flying-fish', 'clownfish', 'rattail', 'tripod-fish', 'moray', 'frogfish'].includes(id)) return 'sweep';
  return 'touch';
}

/** Each seamount's faint colour in the middle water: [colour, blend]. */
const SEAMOUNT_TINT: Record<string, [string, GlobalCompositeOperation]> = {
  warm: ['rgba(255,110,60,0.05)', 'lighter'], cold: ['rgba(120,200,255,0.05)', 'lighter'],
  crowded: ['rgba(180,160,120,0.04)', 'lighter'], hungry: ['rgba(120,120,120,0.10)', 'source-over'],
  silent: ['rgba(0,0,10,0.12)', 'source-over'], dark: ['rgba(0,0,8,0.22)', 'source-over'],
  lonely: ['rgba(80,120,200,0.04)', 'lighter'], buried: ['rgba(150,150,160,0.08)', 'source-over'],
};

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

// Moving over the water (a mouse; touches tap instead): polyps near the pointer pull their tentacles in.
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  const [wx, wy] = toWorld(e.clientX * dpr, e.clientY * dpr);
  hover(wx, wy, frozenT ?? animT);
});

// Tapping the water sweeps the tentacles: a small burst of calcite. Tapping a falling feast eats it.
canvas.addEventListener('pointerdown', (e) => {
  if (zoomer.pinchDown(e)) return;
  // The world point under the finger (the view may be zoomed).
  const [wx, wy] = toWorld(e.clientX * dpr, e.clientY * dpr);
  // Tapping a creature names it (the sweep still happens).
  const hit = creatureAt(wx, wy);
  // A shell on the sand: picked up for the line's shelf (no label, no gift).
  // Swells at the Breach: a tap near the crown rides the swell.
  if (currentSwell(state) && frozenT === null) {
    const [cx, cy] = scene.crownAt;
    if (Math.hypot(wx - cx, wy - cy) < 120 * dpr && trySwell(e.clientX, e.clientY)) return;
  }
  if (hit?.id === 'star') {
    tapStar(hit.n ?? -1, e.clientX, e.clientY);
    return;
  }
  if (hit?.id === 'raft') {
    if (frozenT === null) {
      const gain = shelterRaft(state);
      if (gain > 0) {
        floatText(e.clientX, e.clientY - 20, `+${num(gain)} ${feastPay(state)} ${RAFT.float}`, 'feast-float');
        audio.cue('shimmer');
        buzz(15);
        save();
      }
    }
    return;
  }
  if (hit?.id === 'stray') {
    if (frozenT === null && callStray(state)) {
      floatText(e.clientX, e.clientY - 20, STRAY.float, 'feast-float');
      scene.effect('shoal');
      audio.cue('depart');
      save();
    }
    return;
  }
  if (hit?.id === 'fragment') {
    if (frozenT === null && takeFragment(state)) {
      floatText(e.clientX, e.clientY - 20, FRAGMENT.float, 'feast-float');
      audio.cue('buy');
      buzz(15);
      save();
    }
    return;
  }
  if (hit?.id === 'tangle') {
    if (frozenT === null) {
      const gain = freeTangle(state);
      if (gain > 0) {
        floatText(e.clientX, e.clientY - 20, `+${num(gain)} ${feastPay(state)} ${actAt(state.height) === 5 ? TANGLE.tossed : actAt(state.height) === 1 ? TANGLE.lifted : TANGLE.float}`, 'feast-float');
        audio.cue('shimmer');
        buzz([10, 30, 10]);
        save();
      }
    }
    return;
  }
  if (hit?.id === 'old') {
    if (frozenT === null) {
      const gain = prune(state, hit.n ?? -1);
      if (gain > 0) {
        floatText(e.clientX, e.clientY - 20, `+${num(gain)} ${feastPay(state)} ${OLD.float}`, 'feast-float');
        const held = oldHeld(state);
        if (held) showJournalNote(OLD.held, diaryLine(held), true);
        audio.cue('crunch');
        buzz([12, 20, 12]);
        save();
      }
    }
    return;
  }
  if (hit?.id === 'shell') {
    if (frozenT === null) {
      const id = pickShell(state);
      if (id) {
        floatText(e.clientX, e.clientY - 20, `${SHELLS.find((x) => x.id === id)?.name ?? ''} ${SHELL.float}`, 'feast-float');
        audio.cue('shard');
        buzz(15);
        save();
      }
    }
    return;
  }
  const who = hit as (typeof hit & { id: CreatureId | 'ossel' }) | null;
  if (who?.id === 'ossel') sayOssel();
  if (who) {
    startle(who.id, frozenT ?? animT, wx, wy);
    if (who.id === 'whale') audio.cue('whale');
    else if (who.id !== 'ossel') audio.cue(touchCue(who.id));
    if (frozenT === null && who.id !== 'ossel' && !state.meta.seen.includes(`t:${who.id}`)) state.meta.seen.push(`t:${who.id}`);
    // Now and then a neighbour gives a little of what it lives by.
    // A thorn star is pried off the reef, for a burst.
    if ((who.id === 'thorn-star' || who.id === 'dragonfish' || who.id === 'drill-snail' || who.id === 'gull') && frozenT === null) {
      const pay = pryThorn(state);
      if (pay > 0) {
        floatText(e.clientX, e.clientY - 26, `+${num(pay)} ${feastPay(state)} ${who.id === 'dragonfish' ? THORN.dragon : who.id === 'drill-snail' ? THORN.snail : who.id === 'gull' ? THORN.gull : THORN.pried}`, 'feast-float');
        audio.cue('crunch');
        buzz([20, 30, 20]);
      }
    }
    const trustBefore = who.id !== 'ossel' ? state.meta.trust[who.id] ?? 0 : 0;
    const wasLucky = who.id !== 'ossel' && lucky(state, who.id);
    const wasVisitor = frozenT === null && who.id !== 'ossel' && who.id === visitor(state) && !visited(state);
    const g = frozenT === null && who.id !== 'ossel' ? gift(state, who.id) : null;
    if (g && wasLucky) audio.cue('shimmer');
    if (wasVisitor && visited(state)) showJournalNote(TODAY.visitor, `${CREATURES.find((c) => c.id === who.id)?.name ?? ''} · +1 lineage`, true);
    if (who.id !== 'ossel' && trustBefore < TRUST.at[2] && (state.meta.trust[who.id] ?? 0) >= TRUST.at[2]) {
      showJournalNote(TRUST.friendNote, `${CREATURES.find((c) => c.id === who.id)?.name ?? ''} · +${TRUST.friendLineage} lineage`);
      audio.cue('shard');
    }
    if (g) floatText(e.clientX, e.clientY - 26, `+${num(g.amount)} ${GIFT_TEXT[g.stock]}${wasLucky ? ` ${LUCKY.float}` : ''}`, 'feast-float');
    // A light tick on phones; a double one when it brought a gift.
    if (who.id !== 'ossel') buzz(g ? [8, 40, 8] : 8);
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
  // A combo throws up more motes with each sweep in the run.
  taps.push(wx, wy, animT, 6 + Math.min(10, state.combo - 1));
  poke(wx, wy, frozenT ?? animT);
  const lit = milkyGlow(state);
  if (lit > 0) floatText(e.clientX + 30, e.clientY - 18, `+${num(lit)} ${MILKY.float}`, 'feast-float');
  const moonlit = moonlitSpawn(state);
  if (moonlit > 0) floatText(e.clientX + 30, e.clientY - 18, `+${num(moonlit)} ${UI.moonlit}`, 'feast-float');
  floatText(e.clientX, e.clientY, state.combo > 1 ? `+${num(gain)} ×${(1 + ACT1.comboStep * (state.combo - 1)).toFixed(1)}` : `+${num(gain)}`);
});

// Quality: if frames run slow for a while, drop the bloom pass.
let slowFrames = 0;
/** The last lightning strike whose thunder was heard. */
let thunderHeard = -1;
let milkyHeard = false;
let starsHeard = false;
let whaleHeard = -1;
let luckyHeard = -1;
let tangleHeard = -1;
/** Slow frames for a while: first the glow pass goes, then (still slow) the resolution drops to 1×. */
let autoLowRes = false;
function qualityCheck(dt: number): void {
  if (frozenT !== null || autoLowRes) return;
  // Seconds spent in slow frames (fast frames pay it back): the slower the device, the sooner it acts.
  // Slow means well short of the pace asked for (60 fps, or 30 when idle; see frame()).
  slowFrames = dt > frameGap * 1.5 / 1000 && dt < 1 ? slowFrames + dt : Math.max(0, slowFrames - dt);
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
// The sister reef's place on the same column: a smaller, cooler mark.
const gaugeSister = document.createElement('i');
gaugeSister.className = 'sister';
gaugeSister.title = SISTER.title;
const gaugeCousin = document.createElement('i');
gaugeCousin.className = 'cousin';
gaugeCousin.title = COUSIN.title;
gauge.append(gaugeCousin, gaugeSister, gaugeMarker, gaugeLabel, gaugeMoon);
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
  gaugeSister.style.bottom = `${sisterNow(state, state.t) * 100}%`;
  gaugeSister.hidden = ended(state);
  gaugeCousin.hidden = ended(state) || !cousinRaces(state);
  gaugeCousin.style.bottom = `${sisterAt(state.t, COUSIN.schedule) * 100}%`;
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
/** When the player last did anything (performance.now): drift waits for a quiet spell. */
let lastInput = 0;
for (const type of ['pointerdown', 'pointermove', 'wheel', 'keydown'] as const) window.addEventListener(type, () => { lastInput = performance.now(); }, { passive: true });
const viewBtn = document.createElement('button');
viewBtn.id = 'view-mode';
viewBtn.type = 'button';
viewBtn.title = UI.hidePanel;
viewBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';
let viewSince = 0;
function setViewMode(on: boolean): void {
  viewMode = on;
  viewSince = on ? performance.now() : 0;
  if (!on) zoomer.reset();
  document.documentElement.classList.toggle('view-mode', on);
  viewBtn.setAttribute('aria-pressed', String(on));
  viewBtn.title = on ? UI.showPanel : UI.hidePanel;
  relayout();
}
viewBtn.addEventListener('click', () => setViewMode(!viewMode));

const zoomer = createZoom(canvas, () => viewMode, () => dpr);
const { toWorld, toScreen } = zoomer;
ui.append(viewBtn);

// A photo of the reef: the canvas as it is now, saved as a PNG (shown in view mode).
const photoBtn = document.createElement('button');
photoBtn.id = 'photo';
photoBtn.type = 'button';
photoBtn.title = UI.photo;
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
    if (actAt(state.height) === 2 && !state.meta.seen.includes('did:photo-dark')) state.meta.seen.push('did:photo-dark');
    const zoneShot = `did:photo-z${actAt(state.height)}`;
    if (!state.meta.seen.includes(zoneShot)) state.meta.seen.push(zoneShot);
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
  if (e.key === 'k' || e.key === 'K') {
    // Let the first knob of old stone go.
    const slot = state.oldSlots[0];
    if (frozenT === null && oldKnobs(state) > 0 && slot !== undefined) {
      const gain = prune(state, slot);
      if (gain > 0) {
        floatText(innerWidth / 2, innerHeight / 3, `+${num(gain)} ${feastPay(state)} ${OLD.float}`, 'feast-float');
        const held = oldHeld(state);
        if (held) showJournalNote(OLD.held, diaryLine(held), true);
        audio.cue('crunch');
        save();
      }
    }
    return;
  }
  if (e.key === 'w' || e.key === 'W') {
    wish(state.lineWishes < WISH.lineMax ? 'line' : 'ripen');
    return;
  }
  if (e.key === 't' || e.key === 'T') {
    startLapse();
    return;
  }
  if (e.key === '?') {
    panel.story(UI.keysKicker, UI.keysTitle,
      UI.keysHelp);
    return;
  }
  if (/^[1-4]$/.test(e.key) && panel.showTabAt(Number(e.key))) return;
  // The shoals' signal: 7, 8, 9, 0 press the four lamps.
  const lampKey = ['7', '8', '9', '0'].indexOf(e.key);
  if (lampKey >= 0 && panel.pressLamp(lampKey)) return;
  if (viewMode && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0')) {
    const k = e.key === '0' ? 1 : zoom.k * (e.key === '-' ? 1 / 1.25 : 1.25);
    zoomer.zoomAt(k, canvas.width / 2, canvas.height / 2);
    return;
  }
  if (e.key.toLowerCase() === 's' && currentSwell(state)) {
    const [cx, cy] = toScreen(scene.crownAt[0], scene.crownAt[1]);
    trySwell(cx / dpr, cy / dpr);
    return;
  }
  if (e.key.toLowerCase() === 'l') {
    flareLure();
    return;
  }
  if (e.key.toLowerCase() === 'r' && canFeedRising(state)) {
    sendFeeders();
    return;
  }
  if (e.key.toLowerCase() === 'c' && Number.isFinite(untilHeat(state))) {
    setClosed(!state.closed);
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
  if (e.key.toLowerCase() === 'e') {
    if (send(state)) {
      audio.cue('depart');
      save();
    }
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
let lastSense = 0;
/** When each rare visitor was last on screen (ms), so a visit is announced once. */
const rarePassing = new Map<string, number>();
let lastJournal = 0;
let lastFeatCheck = 0;
let shownRecord = -1;
let lastDolphinLap = -1;
let lastWhaleLap = -1;
// ?at=<sec> starts the scene clock there (to reach timed events such as rare creatures).
let animT = params.has('at') ? Number(params.get('at')) : 40;
let needResize = true;
function frameBody(now: number): void {
  if (portraitAsk) { portraitAsk(); portraitAsk = null; }
  if (needResize) { resize(); needResize = false; }
  const dt = Math.max(0, (now - last) / 1000);
  last = now;
  // Drift: in view mode, left alone a while, the camera wanders slowly round the reef.
  if (viewMode && now - lastInput > 25_000 && !(reducedMotion.matches || calm.get())) {
    const [crx, cry] = scene.crownAt;
    const tt = now / 1000;
    const k = 1.5 + 0.45 * Math.sin(tt / 23);
    const wx = crx + Math.sin(tt / 31) * canvas.width * 0.18;
    const wy = cry + canvas.height * (0.15 + 0.12 * Math.sin(tt / 19));
    zoomer.lookAt(k, wx, wy, Math.min(1, dt * 0.3));
  }
  if (frozenT === null) {
    // A long gap means the tab slept; treat it like being away.
    if (dt > AWAY_NOTICE) catchUp(dt * speed);
    else advance(state, dt * speed);
    if (state.meta.shards.length > shardsSeen) {
      showJournalNote(SHARD.found, SHARD_LINES[state.meta.shards.at(-1)!] ?? '');
      audio.cue('shard');
      buzz([20, 40, 20]);
    }
    shardsSeen = state.meta.shards.length;
    if (state.tally.roams > roamsSeen) showJournalNote(ROAM.back, state.diary.at(-1)?.split('|')[3] ?? ROAM.effect);
    roamsSeen = state.tally.roams;
    // An intruder arriving, a moment or a full-moon choice appearing: a cue each.
    const th = currentThorn(state);
    if (th && th.k !== thornHeard) audio.cue(th.kind === 'gull' ? 'gull' : 'intruder');
    thornHeard = th ? th.k : thornHeard;
    const waitingChoice = `${nextMoment(state)?.id ?? ''}|${othersSpawning(state)}|${forkOpen(state)}|${strainOpen(state)}|${sportOpen(state)}|${osselAsks(state)?.id ?? ''}`;
    if (waitingChoice !== choiceHeard && waitingChoice !== '|false|false|false') audio.cue('moment');
    choiceHeard = waitingChoice;
    // Ossel's mistakes: a claim heard, then the proof found: the correction is told.
    for (const m of OSSEL_MISTAKES) {
      if (!state.meta.seen.includes(`w:claim-${m.id}`) || state.meta.seen.includes(`o:${m.id}`) || !m.truth(state)) continue;
      state.meta.seen.push(`o:${m.id}`);
      remember(state, 'mistake', m.title.toLowerCase());
      panel.keepStory('Ossel', OSSEL_MISTAKE.kicker, m.title, m.correction, true);
    }
    // Rain at the Breach (the same five-minute shower the scene draws).
    audio.setSong(state.dialects.song);
    audio.setRain(actAt(state.height) === 5 && ((state.bands.includes('rain') && animT % 300 < 70) || squallAt(animT) > 0));
    // Thunder from the far storm, a couple of seconds after each flash.
    const strike = state.bands.includes('rain') && actAt(state.height) === 5 ? lightningAt(animT) : null;
    const strikeKey = strike && strike.since > 1.8 ? strike.lap * 10 + strike.k : -1;
    if (strikeKey >= 0 && strikeKey !== thunderHeard) { thunderHeard = strikeKey; audio.cue('thunder'); }
    // The water turning: a soft swell (not for still water).
    const wNow = waterAt(state).id;
    if (wNow !== waterHeard && waterHeard !== '' && wNow !== 'still') audio.cue('water');
    waterHeard = wNow;
    // The rising and warm water beginning: heard once each as they come.
    const risingNow = inRising(state), heatNow = inHeat(state);
    if (risingNow && !risingHeard) audio.cue('rising');
    if (heatNow && !heatHeard) audio.cue('heat');
    risingHeard = risingNow;
    const upNow = !!currentUpwelling(state), swellNow = !!currentSwell(state);
    if (upNow && !upHeard) audio.cue('upwell');
    if (swellNow && !swellHeard) audio.cue('swell');
    const milkyNow = inMilky(state);
    if (milkyNow && !milkyHeard) audio.cue('shimmer');
    milkyHeard = milkyNow;
    // Far off in the deep water, now and then, a whale calls.
    const callSlot = Math.floor(animT / 170);
    if (callSlot !== whaleHeard && (actAt(state.height) === 2 || actAt(state.height) === 3) && animT % 170 > 40) {
      whaleHeard = callSlot;
      audio.cue('whale');
    }
    const tangleNow = currentTangle(state)?.k ?? -1;
    if (tangleNow >= 0 && tangleNow !== tangleHeard) audio.cue('moment');
    tangleHeard = tangleNow;
    const starsNow = !!meteorShower(state);
    if (starsNow && !starsHeard) audio.cue('feast');
    starsHeard = starsNow;
    upHeard = upNow;
    swellHeard = swellNow;
    heatHeard = heatNow;
    if (state.race.decided > raceSeen) {
      const won = state.race.won > raceWon;
      const i = state.race.decided - 1;
      const was = recordsSeen[i] ?? 0, now = state.meta.records[i] ?? 0;
      if (was > 0 && now < was) showJournalNote(SISTER.record, `${metres(SISTER.marks[i]!)} in ${duration(now)}`);
      else showJournalNote(won ? SISTER.ahead : SISTER.behind, won ? `+${SISTER.lineage[i]} lineage` : '');
      recordsSeen = [...state.meta.records];
    }
    raceSeen = state.race.decided;
    raceWon = state.race.won;
    if (state.request.done > requestsSeen) {
      const [cx, cy] = scene.crownAt;
      floatText(cx / dpr, cy / dpr - 30, `+${num(state.request.paid)} ${feastPay(state)} ${REQUEST.float}`, 'feast-float');
      audio.cue('feast');
      buzz(30);
      // Every tenth: Ossel remembers something of its own.
      if (state.request.done % OSSEL_PAST.every === 0) {
        const past = OSSEL_PAST.lines[(state.request.done / OSSEL_PAST.every - 1) % OSSEL_PAST.lines.length]!;
        panel.story(OSSEL_PAST.kicker, past.title, `${past.text} ${OSSEL_PAST.gain}`);
      }
    }
    requestsSeen = state.request.done;
    if (state.relics.length > relicsSeen) {
      scene.effect('reading');
      audio.cue('story');
      buzz([30, 60, 30]);
    }
    relicsSeen = state.relics.length;
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
    // The first time the line comes this high: what is new here.
    const zg = ZONE_GUIDE[actAt(state.height)];
    if (zg && frozenT === null && botT === null && !state.meta.seen.includes(`zone:${actAt(state.height)}`)) {
      state.meta.seen.push(`zone:${actAt(state.height)}`);
      setTimeout(() => panel.story('A new zone', zg.title, zg.text), 5000);
    }
    audio.cue('zone');
    // Let the new zone arrive (title, ascent) before the band that tells it opens.
    panel.holdStories(4000);
    whisper.classList.remove('show');
    lastWhisper = Math.max(lastWhisper, now - 80_000 + 10_000);
  }
  const p0 = performance.now();
  zoomer.apply(ctx);
  scene.draw(ctx, tNow, v);
  const p1 = performance.now();
  if (fadingFrom) {
    const k = (tNow - fadeStart) / FADE;
    if (k >= 1) fadingFrom = null;
    else {
      zoomer.apply(fadeCtx);
      fadingFrom.draw(fadeCtx, tNow, v);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.save();
      ctx.globalAlpha = 1 - k * k * (3 - 2 * k);
      ctx.drawImage(fadeCanvas, 0, 0);
      ctx.restore();
      drawAscent(k);
      zoomer.apply(ctx);
    }
  }
  // The seamount's colour carried up through the middle water (screen space, faint).
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const zoneNow = actAt(state.height);
  const smTint = zoneNow >= 2 && zoneNow <= 3 ? SEAMOUNT_TINT[state.seamount] : undefined;
  if (smTint) {
    ctx.save();
    ctx.globalCompositeOperation = smTint[1];
    ctx.fillStyle = smTint[0];
    ctx.fillRect(focusNow.x, focusNow.y, focusNow.w, focusNow.h);
    ctx.restore();
  }
  // The water's mood over the scene (screen space).
  const wl = untilWaterTurns(state);
  drawWater(ctx, waterAt(state).id, focusNow, tNow, WATER.period - wl, wl, dpr, actAt(state.height) >= 4);
  zoomer.apply(ctx);
  // The companion: a small warm light circling the crown.
  if (state.meta.companion && !viewMode) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    const [cx, cy] = scene.crownAt;
    const a = animT * 0.6;
    glowAt(ctx, cx + Math.cos(a) * 46 * dpr, cy - 20 * dpr + Math.sin(a * 1.3) * 18 * dpr, 7 * dpr, '255,215,150', 0.55);
    ctx.restore();
    zoomer.apply(ctx);
  }
  // A signal lamp lit in the panel: the shoals around the crown flash its colour.
  if (lampFlash) {
    const age = (now - lampFlash.at) / 500;
    if (age >= 1) lampFlash = null;
    else {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      const [cx, cy] = scene.crownAt;
      for (let k = 0; k < 9; k++) {
        const a = k * 0.7 + 0.3;
        glowAt(ctx, cx + Math.cos(a) * (60 + (k % 3) * 30) * dpr, cy - 40 * dpr + Math.sin(a) * 40 * dpr, 14 * dpr, lampFlash.rgb, 0.8 * (1 - age));
      }
      ctx.restore();
      zoomer.apply(ctx);
    }
  }
  const fe = currentFeast(state);
  if (fe) drawFeast(ctx, fe, state.t - fe.start, tNow, focusNow, dpr, feastPay(state));
  const tg = currentTangle(state);
  // Under the full moon the other reefs spawn: their bundles rise through the water below the Breach.
  if (actAt(state.height) <= 4 && state.height >= 1 && moonFull(state.t)) {
    const strength = Math.min(1, (ACT5.fullWindow - Math.abs(moonPhase(state.t) - 0.5)) / (ACT5.fullWindow * 0.3));
    drawOthersSpawn(ctx, focusNow, tNow, strength, actAt(state.height) <= 2 ? 1 : actAt(state.height) === 3 ? 0.5 : 0, dpr);
  }
  const sy = currentStray(state);
  if (sy) drawStray(ctx, sy, STRAY.life, tNow, focusNow, dpr);
  const fr = currentFragment(state);
  if (fr) drawFragment(ctx, fr, FRAGMENT.life, tNow, focusNow, dpr);
  if (tg && actAt(state.height) === 1) drawPinned(ctx, tg, TANGLE.life, tNow, focusNow, dpr);
  else if (tg && actAt(state.height) !== 5) drawTangle(ctx, tg, TANGLE.life, tNow, focusNow, dpr);
  taps.draw(ctx, tNow, scene.crownAt, dpr, (x, y) => actAt(state.height) <= 2 || !!scene.darkAt?.(x, y));
  drawLucky(tNow);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  endFrameSpots();
  if (now - lastPortrait > 1000 && frozenT === null && !fadingFrom && (zoom.k === 1 || zoom.k >= 2)) {
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
  // The Breach's dolphins (render/breach.ts: a leap every 75 s of scene time) whistle as they go.
  const dolphinLap = Math.floor(tNow / 75);
  if (actAt(state.height) === 5 && dolphinLap !== lastDolphinLap && tNow % 75 < 2) audio.cue('dolphin');
  lastDolphinLap = dolphinLap;
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
      if (c) remember(state, 'seen', c.name);
      if (c?.note.startsWith('Rare.')) {
        showJournalNote('A rare sighting', c.name);
        audio.cue('feast');
      } else if (c) showJournalNote(UI.seenFirst, c.name);
    }
  }
  // Watching in view mode for five minutes (a secret feat).
  if (viewMode && viewSince && now - viewSince > 300_000 && !state.meta.seen.includes('did:watch')) state.meta.seen.push('did:watch');
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
  // A hard seamount's trial met (the sim records it the moment the reef reaches the goal).
  const trialKey = `trial:${state.seamount}`;
  if (!trialShown && state.meta.seen.includes(trialKey)) {
    trialShown = true;
    if (!trialAtLoad) {
      const tr = SEAMOUNTS.find((m) => m.id === state.seamount)?.trial;
      if (tr) showJournalNote(TRIAL_TEXT.note, tr.reward);
      audio.cue('spawning');
      buzz([40, 60, 40]);
    }
  }
  // The line's record (set by the sim at the exact moment of reaching the surface): announce a new one.
  if (state.meta.fastest !== shownRecord) {
    if (shownRecord > 0 && frozenT === null) showJournalNote('A new record', `The surface in ${duration(state.meta.fastest)}`);
    shownRecord = state.meta.fastest;
  }
  // Shared table: a feast left to sink is eaten by the scavengers, half for the reef.
  if (frozenT === null && tableFeast(state)) eatFeast(LINEAGE.tableShare);
  // Guard crabs drive off a thorn star nobody pried loose, at its last moment.
  const guardedOff = frozenT === null ? crabThorn(state) : null;
  if (guardedOff) {
    const pay = pryThorn(state, THORN.crabShare);
    const [cx, cy] = scene.crownAt;
    if (pay > 0) floatText(cx / dpr, cy / dpr, `+${num(pay)} ${feastPay(state)} ${guardedOff.kind === 'dragonfish' ? THORN.lamps : THORN.crabs}`, 'feast-float');
  }
  // Old habits: the reef's own small purchases, only while the page is open.
  if (habits.get() && frozenT === null && now - lastHabit > 250) {
    lastHabit = now;
    const id = habitPurchase(state);
    if (id) purchase(id);
    if (grainSense(state)) audio.cue('shimmer');
    if (helpTangle(state) > 0) audio.cue('shimmer');
  }
  // Shoal sense and Rasp sense: the line's settled habits, every half minute while watching.
  if (habits.get() && frozenT === null && now - lastSense > 30_000) {
    lastSense = now;
    shoalSense(state);
    raspSense(state, false);
  }
  replay.hidden = !ended(state);
  title.classList.toggle('faded', state.levels.polyp > 0 || state.t > 25);
  hint.classList.toggle('show', state.meta.spawnings === 0 && state.earned.calcite < 40 && reader() && state.t > 2);
  if (now - lastSave > 5000) { save(); lastSave = now; }
  // The tab title carries the reef's height, so a background tab still shows progress.
  if (now - lastTitle > 1000) {
    lastTitle = now;
    notifyWaiting();
    const who = reefName(state) || 'Corallum';
    const base = ended(state) ? `${who} · spawned` : state.height < 1 ? who : `${metres(state.height)} · ${who}`;
    // Something to do right now (a feast, an intruder, a choice waiting): a dot, for background tabs.
    const waiting = !!currentFeast(state) || !!currentThorn(state) || !!nextMoment(state) || othersSpawning(state) || boonsOffered(state).length > 0 ||
      forkOpen(state) || strainOpen(state) || sportOpen(state) || !!currentSignal(state) || !!currentShell(state) || canFeedRising(state) || !!currentSwell(state) || (!!currentUpwelling(state) && state.upwelled !== currentUpwelling(state)!.k);
    const pin = panel.pinnedText();
    const t = (waiting ? `● ${base}` : base) + (pin ? ` · ${pin}` : '');
    if (document.title !== t) document.title = t;
  }
}

/** Errors already reported: a fault that repeats every frame is told once, not sixty times a second. */
const frameFaults = new Set<string>();
// Frame pacing: at most 60 frames a second (a 120 Hz phone would draw twice what the eye needs
// here), and 30 after a minute with no touch, click or key: a reef left open costs half as much.
let lastDrawn = -Infinity;
let frameGap = 1000 / 60;
function frame(now: number): void {
  frameGap = now - lastInput > 60_000 ? 1000 / 30 : 1000 / 60;
  if (frozenT === null && now - lastDrawn < frameGap - 3) {
    requestAnimationFrame(frame);
    return;
  }
  lastDrawn = now;
  // One bad frame must not stop the reef: the loop goes on and the error is reported once.
  try { frameBody(now); }
  catch (e) {
    const key = String(e);
    if (!frameFaults.has(key)) { frameFaults.add(key); console.error(e); }
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
document.addEventListener('visibilitychange', () => {
  // Rasp sense: set the dial for being away as the page goes, and back for income on return.
  if (habits.get()) raspSense(state, document.hidden);
  if (document.hidden) save();
});
window.addEventListener('pagehide', save);
requestAnimationFrame(frame);
