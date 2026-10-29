// The DOM panel over the canvas: stocks, shoal jobs, upgrade cards, bands and Readings, the
// reader and the away summary. Built once; `update()` only rewrites text and classes, so it
// is cheap to call every frame.

import type { QuestionId } from '../content/ossel.ts';
import type { ForkId } from '../content/expeditions.ts';
import { FIGURES, type FigureId } from '../content/sky.ts';
import { ACT1, FLARE, FLURRY, GRAINS, MILESTONES, SPORTS, STRAINS, type GrainId, type SportId, type StrainId } from '../content/act1.ts';
import type { Band, Currency, UpgradeId } from '../content/types.ts';
import { GATE_TEXT, UPGRADES, effectText } from '../content/upgrades.ts';
import { JOBS, READINGS, type Job, type Reading, type ReadingId, RISING, MILKY } from '../content/act2.ts';
import { ACT3, CURRENT, FAVOURS, FAVOUR_TEXT, MEETINGS, type RiddleId, type FavourId, type Choice, type Meeting, type MeetingId, FAN, GUARD, UPWELL } from '../content/act3.ts';
import { DIALECTS, HEAT, TIERS, type DialectId } from '../content/act4.ts';
import { BOONS, SEAMOUNTS, TRIALS_FROM, TRIAL_TEXT, TRAIT_GROUPS, TRAITS, type BoonId, type SeamountId, type TraitId, FORGET, VOW, VOWS, type VowId } from '../content/lineage.ts';
import { GARDEN, LINE_TITLES, MEMORIES, type MemoryId, type GardenKind } from '../content/act5.ts';
import { COMPANION, CREATURES, TRUST, trustLevel, LUCKY } from '../content/creatures.ts';
import { GUIDE, STOCK_NOTES } from '../content/guide.ts';
import { upgradeIcon } from './icons.ts';
import { SHELL, SHELLS } from '../content/shells.ts';
import { button, el } from './dom.ts';
import { createChoices } from './choices.ts';
import { drawCity, drawTablet, drawSeaChart, SEAMOUNT_TINT, drawRings } from './drawings.ts';
import { FEATS } from '../content/feats.ts';
import { AWAY_CYCLES, AWAY_PREP, DAYS, DREAM, NOTIFY, SWELL, TODAY, WELCOME, intruderOf } from '../content/events.ts';
import { WATER } from '../content/waters.ts';
import { REQUEST } from '../content/requests.ts';
import { WORKS, WORK_TEXT, type WorkId } from '../content/works.ts';
import { SISTER } from '../content/sister.ts';
import { DIARY_TEXT, diaryLine } from '../content/diary.ts';
import { drawShellShape } from '../render/shells.ts';
import type { WishId } from '../content/sky.ts';
import { UI } from '../content/ui.ts';
import { OSSEL_MISTAKES } from '../content/ossel.ts';
import { PALETTES, PALETTE_TEXT } from '../content/palettes.ts';
import { SHARD, SHARD_LINES } from '../content/shards.ts';
import { MOMENT, MOMENTS, type Moment, type MomentId } from '../content/moments.ts';
import { PAIRS, RESIDENT, RESIDENTS, type ResidentId } from '../content/residents.ts';
import { CITY_MAP, EXPEDITION, site, type Site } from '../content/expeditions.ts';
import { canSpawnLesser, lineageFor, traitCost, traitMaxed, forgetRefund } from '../sim/prestige.ts';
import { ACTS, act, actAt, SURFACE } from '../content/acts.ts';
import {
  BANDS, bandMetres, ended, steadyCalciteRate, meetingWords, readingCost, bloomHold, spawnHold, spawnNet, spawnTarget, bloomNet, calciteHold, nextMeeting, nextTier, photo, raspMax, sandHold, sandNet, siltHold, siltNet, smother, calciteNet, calciteRate, canAfford, cost, feeding, glowHold, glowNet, idleShoals,
  jobOpen, maxed, murmurHold, murmurNet, nextReading, planktonHold, planktonNet, rates, reach, readingsRevealed,
  revealed, timeUntil, upgrade, nextSite, canSend, awayShoals, tripSite, callHomeCost, seasoned, tripSeconds, workOpen, workCost, canBuild, waterAt, untilWaterTurns, tierCost, nextMoment, currentRequest, canSkipRequest, plantCost, untilFeast, untilThorn, untilFlurry, untilMilky, untilHeat, heatLeft, closedNow, untilRising, untilSwell, currentUpwelling, canFlare, risingLeft, canFeedRising, risingHaul, moonFull, untilFullMoon, favourOpen, favourCost, favourMaxed, homes, residentsAsking, capReason, knownBonus, nextMilestone, milestoneMult, jobGain, upgradeGain, raspSettings, speaks, vowKept, visitor, visited } from '../sim/economy.ts';
import type { GameState } from '../sim/state.ts';
import { duration, metres, num, rate } from './format.ts';

export type PanelHooks = {
  buy(id: UpgradeId): void;
  /** Buy as many of one upgrade as can be afforded. */
  buyMax(id: UpgradeId): void;
  assign(job: Job, delta: 1 | -1): void;
  read(id: ReadingId): void;
  /** Send shoals to the next ruin. */
  send(): void;
  /** Call the shoals home early, for glow. */
  callHome(): void;
  /** Answer the Rasp elder's riddle; true if right. */
  answerRiddle(id: RiddleId, choice: number): boolean;
  /** Take the fork on a trip. */
  takeFork(how: ForkId): void;
  /** Choose the glimmerseed strain. */
  chooseStrain(id: StrainId): void;
  chooseGrain(id: GrainId): void;
  chooseSport(id: SportId): void;
  makeWish(id: WishId): void;
  /** Choose this seamount's boon. */
  chooseBoon(id: BoonId): void;
  /** Meet the other reefs' spawning. */
  meetOthers(how: 'feed' | 'join'): void;
  /** Ready the reef for an absence; returns what was done, in words. */
  prepareAway(): string;
  /** A signal lamp lit (the world flashes it too). */
  lamp?(i: number): void;
  /** Answer the shoals' signal; returns what it paid (0 if wrong). */
  answerSignal(answer: number[]): number;
  /** Ask Ossel for a different request. */
  skipRequest(): void;
  /** Plant a child in the epilogue garden. */
  plant(kind: GardenKind): void;
  /** Build the next stage of a great work. */
  build(id: WorkId): void;
  /** Keep a creature close ('' for none). */
  companion(id: string): void;
  /** Choose the line's colours. */
  recolour(id: string): void;
  /** Turn the current (−2 … +2). */
  setCurrent(c: number): void;
  closeUp(closed: boolean): void;
  dream(): void;
  flare(): void;
  lightSister(yes: boolean): void;
  /** Every riddle of the elder answered rightly. */
  blessed(): boolean;
  signalStreak(): number;
  answerOssel(id: QuestionId, i: 0 | 1): void;
  feedRising(): void;
  /** Trace a figure of the night sky (again: stop). */
  trace(id: FigureId): void;
  tracing(): FigureId | null;
  /** Ask the Rasp a favour. */
  favour(id: FavourId): void;
  /** Answer a moment. */
  meet(id: MomentId, c: 'a' | 'b'): void;
  /** Take a resident in, or let it go. */
  house(id: ResidentId): void;
  setRasp(n: number): void;
  choose(id: MeetingId, choice: Choice): void;
  speak(id: DialectId): void;
  spawnLesser(where: SeamountId, heirloom: string, vows: VowId[]): void;
  buyTrait(id: TraitId): void;
  forgetTrait(id: TraitId): void;
  exportSave(): string;
  importSave(text: string): boolean;
  reset(): void;
  /** Replay this zone's growth of the reef in a few seconds. */
  timelapse(): void;
  /** The soft glow (bloom) pass: read and set; off helps slow phones. */
  glow: { get(): boolean; set(on: boolean): void };
  /** The reef's name changed. */
  rename(name: string): void;
  /** Full-resolution rendering (off draws at 1× for slow phones). */
  sharp: { get(): boolean; set(on: boolean): void };
  /** Vibration on purchases and milestones (phones). */
  buzz: { get(): boolean; set(on: boolean): void };
  /** Sound volume, 0..1. */
  volume: { get(): number; set(v: number): void };
  /** Scientific notation for large numbers. */
  sci: { get(): boolean; set(on: boolean): void };
  /** Calmer motion: the world's ambient animation runs slower. */
  calm: { get(): boolean; set(on: boolean): void };
  /** Larger text. */
  big: { get(): boolean; set(on: boolean): void };
  /** Fewer whispers (only story). */
  quiet: { get(): boolean; set(on: boolean): void };
  notify: { get(): boolean; set(on: boolean): void };
  /** Old habits (a lineage trait): whether the reef buys cheap polyps and glimmerseed itself. */
  habits: { get(): boolean; set(on: boolean): void };
  /** A story card opened (for its sound). */
  storyShown?(): void;
  /** The journal's portrait of a creature (a data URL), if one was taken. */
  portrait?(id: string): string | null;
  /** How many portraits there are (the journal redraws when it grows). */
  readonly portraits?: number;
};

type Card = { root: HTMLElement; cost: HTMLElement; level: HTMLElement; effect: HTMLElement; eta: HTMLElement; btn: HTMLButtonElement; max: HTMLButtonElement | null };
type Story = { kicker: string; title: string; text: string };

function bandStory(b: Band, kept = false): Story {
  return { kicker: b.metres === 0 ? 'A seamount, 4,000 m down' : `Band at ${metres(b.metres)}`, title: b.title, text: kept && b.kept ? b.kept : b.text };
}
function readingStory(r: Reading): Story {
  return { kicker: 'A Thousandfold band, read', title: r.title, text: r.text };
}
function truceStory(m: Meeting, c: Choice): Story {
  const o = m[c];
  return { kicker: UI.truceKicker, title: `${m.title}: ${o.label}`, text: o.text };
}

export function createPanel(host: HTMLElement, hooks: PanelHooks) {
  const panel = el('aside', 'panel');
  panel.setAttribute('aria-label', 'Reef');

  // ---------- Stocks ----------
  const stocks = el('div', 'stocks');
  // Tapping a stock explains it, under the stocks, for a few seconds.
  const stockNote = el('p', 'stock-note');
  stockNote.hidden = true;
  let noteTimer = 0;
  const stock = (name: string, cls: string) => {
    const row = el('div', `stock ${cls}`);
    const value = el('span', 'stock-value', '0');
    const sub = el('span', 'stock-sub', '');
    row.append(el('span', 'stock-name', name), value, sub);
    const note = STOCK_NOTES[cls];
    if (note) {
      row.title = note;
      row.addEventListener('click', () => {
        const again = !stockNote.hidden && stockNote.dataset.stock === cls;
        stockNote.hidden = again;
        stockNote.dataset.stock = cls;
        stockNote.textContent = `${name}: ${note}`;
        clearTimeout(noteTimer);
        if (!again) noteTimer = window.setTimeout(() => { stockNote.hidden = true; }, 8000);
      });
    }
    stocks.append(row);
    return { row, value, sub };
  };
  const calcite = stock('Calcite', 'calcite');
  const glow = stock('Glow', 'glow');
  const plankton = stock('Plankton', 'plankton');
  const murmurs = stock('Murmurs', 'murmurs');
  const silt = stock('Silt', 'silt');
  const sand = stock('Sand', 'sand');
  const bloom = stock('Bloom', 'bloom');
  const spawn = stock('Spawn', 'spawn');
  const heightRow = el('div', 'stock height');
  const heightLabel = el('span', 'stock-name', 'Reef');
  const heightValue = el('span', 'stock-value', '0 m');
  const heightBar = el('div', 'bar');
  const heightFill = el('div', 'bar-fill');
  const heightTarget = el('div', 'bar-target');
  const heightSub = el('span', 'stock-sub', '');
  heightBar.append(heightTarget, heightFill);
  heightRow.append(heightLabel, heightValue, heightBar, heightSub);
  stocks.append(heightRow);

  // ---------- Tabs ----------
  const tabs = el('nav', 'tabs');
  const pages = el('div', 'pages');
  const tabButtons = new Map<string, HTMLButtonElement>();
  const tabPages = new Map<string, HTMLElement>();
  for (const [id, label] of [['grow', 'Grow'], ['bands', 'Bands'], ['lineage', 'Lineage'], ['reef', 'Reef']] as const) {
    tabs.append(button('tab', label, () => showTab(id)));
    tabButtons.set(id, tabs.lastElementChild as HTMLButtonElement);
    const page = el('section', `page page-${id}`);
    pages.append(page);
    tabPages.set(id, page);
  }
  const bandsDot = el('span', 'dot');
  tabButtons.get('bands')!.append(bandsDot);
  const reefDot = el('span', 'dot');
  reefDot.hidden = true;
  tabButtons.get('reef')!.append(reefDot);
  let seenStories = 0;
  let storyCount = 0;
  function showTab(id: string): void {
    for (const [k, b] of tabButtons) b.classList.toggle('on', k === id);
    for (const [k, p] of tabPages) p.hidden = k !== id;
    if (id === 'bands') seenStories = storyCount;
  }

  const grow = tabPages.get('grow')!;

  // ---------- The truce (a meeting waiting for a choice) ----------
  const truceBox = el('section', 'truce');
  truceBox.hidden = true;
  const truceTitle = el('h3');
  const truceText = el('p', 'truce-text');
  const truceWords = el('div', 'bar words');
  const truceWordsFill = el('div', 'bar-fill');
  truceWords.append(truceWordsFill);
  const truceWordsLabel = el('p', 'truce-words');
  const truceChoices = el('div', 'truce-choices');
  const choiceButtons = (['a', 'b'] as const).map((c) => {
    const b = button(`choice choice-${c}`, '', () => {
      const m = nextMeeting(lastState!);
      if (m) hooks.choose(m.id, c);
    });
    const label = el('strong');
    const effect = el('span');
    b.append(label, effect);
    truceChoices.append(b);
    return { b, label, effect };
  });
  truceBox.append(el('p', 'truce-kicker', 'The Rasp would talk'), truceTitle, truceText, truceWords, truceWordsLabel, truceChoices);
  grow.append(truceBox);

  // ---------- A moment waiting for an answer ----------
  const momentBox = el('section', 'truce moment');
  momentBox.hidden = true;
  const momentTitle = el('h3');
  const momentText = el('p', 'truce-text');
  const momentChoices = el('div', 'truce-choices');
  let momentNow: Moment | undefined;
  const momentButtons = (['a', 'b'] as const).map((c) => {
    const b = button('choice', '', () => { if (momentNow) hooks.meet(momentNow.id, c); });
    const label = el('strong');
    const effect = el('span');
    const before = el('em', 'carried-before', MOMENT.before);
    b.append(label, effect, before);
    momentChoices.append(b);
    return { b, label, effect, before, c };
  });
  momentBox.append(el('p', 'truce-kicker', MOMENT.kicker), momentTitle, momentText, momentChoices);
  grow.prepend(momentBox);

  // ---------- Choice cards: strain, boon, riddle, fork, signal, full moon (ui/choices.ts) ----------
  const choices = createChoices(grow, hooks, setShown);

  // ---------- Dialects (a tier waiting for a choice) ----------
  const dialectBox = el('section', 'dialects');
  dialectBox.hidden = true;
  const dialectKicker = el('p', 'truce-kicker');
  const dialectIntro = el('p', 'truce-text');
  const dialectCost = el('p', 'truce-words');
  const dialectChoices = el('div', 'dialect-choices');
  dialectBox.append(dialectKicker, dialectIntro, dialectCost, dialectChoices);
  grow.append(dialectBox);
  const dialectButtons = new Map<DialectId, HTMLButtonElement>();
  for (const d of DIALECTS) {
    const b = button(`choice dialect dialect-${d.id}`, '', () => hooks.speak(d.id));
    b.hidden = true;
    b.append(el('strong', '', d.name), el('em', '', d.flavour), el('span', '', d.effect));
    dialectChoices.append(b);
    dialectButtons.set(d.id, b);
  }

  // ---------- The Rasp dial ----------
  const raspBox = el('section', 'rasp');
  raspBox.hidden = true;
  const raspHead = el('header');
  const raspCount = el('span', 'level');
  raspHead.append(el('h3', '', 'The Rasp'), raspCount);
  const raspRow = el('div', 'rasp-row');
  const raspMinus = button('step', '−', () => hooks.setRasp((lastState?.rasp ?? 0) - 1));
  const raspSlider = el('input', 'rasp-slider');
  raspSlider.type = 'range';
  raspSlider.min = '0';
  raspSlider.step = '1';
  raspSlider.setAttribute('aria-label', UI.raspAria);
  raspSlider.addEventListener('input', () => hooks.setRasp(Number(raspSlider.value)));
  const raspPlus = button('step', '+', () => hooks.setRasp((lastState?.rasp ?? 0) + 1));
  raspRow.append(raspMinus, raspSlider, raspPlus);
  const raspWhat = el('p', 'rasp-what');
  // Favours: small asks paid in sand, once the truce has begun.
  const favourRow = el('div', 'favours');
  const favourButtons = FAVOURS.map((f) => {
    const b = button('favour', '', () => hooks.favour(f.id));
    const name = el('strong', '', f.name);
    const what = el('span', '', f.effect);
    const price = el('em');
    b.append(name, what, price);
    favourRow.append(b);
    return { f, b, price };
  });
  // The current: five steps from the open water to the shelf.
  const currentRow = el('div', 'current-row');
  const currentLabel = el('span', 'current-label', CURRENT.label);
  const currentSteps = el('div', 'current-steps');
  const currentWhat = el('span', 'current-what');
  const currentButtons = [-2, -1, 0, 1, 2].map((c) => {
    const b = button('current-step', c === 0 ? '·' : c < 0 ? '‹'.repeat(-c) : '›'.repeat(c), () => hooks.setCurrent(c));
    b.title = c === 0 ? 'straight along the reef' : c < 0 ? CURRENT.ends[0] : CURRENT.ends[1];
    currentSteps.append(b);
    return { c, b };
  });
  currentRow.append(currentLabel, currentSteps, currentWhat);
  raspBox.append(raspHead, raspRow, raspWhat, currentRow, favourRow);
  grow.append(raspBox);
  let lastState: GameState | null = null;

  // ---------- The water ----------
  const waterBox = el('div', 'water');
  waterBox.hidden = true;
  const waterName = el('strong');
  const waterLine = el('span', 'water-line');
  const waterNext = el('span', 'water-next');
  const waterSoon = el('span', 'water-soon');
  // The next twenty minutes as a strip: a mark for each thing coming, labels above and below.
  const almanac = el('div', 'almanac');
  let almanacKey = '';
  // Warm spells in the Sunlit Crown: open to the sun, or closed against the heat.
  const heatRow = el('div', 'heat-row');
  heatRow.hidden = true;
  const heatText = el('span', 'heat-text');
  const heatWhat = el('span', 'heat-what');
  let heatClosed = false;
  const heatButton = button('heat-toggle', '', () => hooks.closeUp(!heatClosed));
  heatRow.append(heatText, heatButton, heatWhat);
  // The rising: send the feeders in, once, while it passes.
  const riseRow = el('div', 'heat-row rise-row');
  riseRow.hidden = true;
  const riseText = el('span', 'heat-text');
  const riseWhat = el('span', 'heat-what');
  const riseButton = button('heat-toggle', RISING.send, () => hooks.feedRising());
  riseRow.append(riseText, riseButton, riseWhat);
  const todayLine = el('span', 'water-today');
  waterBox.append(waterName, waterLine, waterNext, waterSoon, almanac, todayLine, heatRow, riseRow);
  grow.prepend(waterBox);
  let waterShown = '';
  // Ossel's request: one small thing to do, with its progress.
  const askBox = el('div', 'ask');
  askBox.hidden = true;
  const askText = el('span', 'ask-text');
  const askBar = el('span', 'ask-bar');
  const askFill = el('span', 'ask-fill');
  askBar.append(askFill);
  const askCount = el('span', 'ask-count');
  const askSkip = button('step ask-skip', '↻', () => hooks.skipRequest());
  askSkip.title = REQUEST.skip;
  askSkip.setAttribute('aria-label', REQUEST.skip);
  const askKicker = el('em', '', REQUEST.kicker);
  askBox.append(askKicker, askText, askBar, askCount, askSkip);
  waterBox.after(askBox);
  // Before you go: one tap to ready the reef for an absence (shown once there is something to set).
  const prepBtn = button('plain prep-away', AWAY_PREP.label, () => { prepNote.textContent = hooks.prepareAway(); });
  prepBtn.title = AWAY_PREP.title;
  const prepNote = el('span', 'hint prep-note');
  // Dreams: sleep the reef forward, one kept dream at a time.
  const flareBtn = button('plain flare', FLARE.label, () => hooks.flare());
  flareBtn.title = FLARE.title;
  const dreamBtn = button('plain dream', '', () => hooks.dream());
  dreamBtn.title = DREAM.title;
  const prepRow = el('div', 'prep-row');
  prepRow.append(prepBtn, flareBtn, dreamBtn, prepNote);
  prepRow.hidden = true;
  askBox.after(prepRow);

  // ---------- Shoals ----------
  const shoalBox = el('section', 'shoals');
  shoalBox.hidden = true;
  const shoalHead = el('header');
  const shoalTitle = el('h3', '', 'Shoals');
  const shoalIdle = el('span', 'level');
  shoalHead.append(shoalTitle, shoalIdle);
  shoalBox.append(shoalHead);
  const jobRows = new Map<Job, { row: HTMLElement; count: HTMLElement; what: HTMLElement; minus: HTMLButtonElement; plus: HTMLButtonElement }>();
  for (const j of JOBS) {
    const row = el('div', `job job-${j.id}`);
    const label = el('div', 'job-label');
    const what = el('span', 'job-what');
    label.append(el('span', 'job-name', j.name), what);
    const minus = button('step', '−', () => hooks.assign(j.id, -1));
    const count = el('span', 'job-count', '0');
    const plus = button('step', '+', () => hooks.assign(j.id, 1));
    minus.setAttribute('aria-label', `Fewer shoals ${j.verb}`);
    plus.setAttribute('aria-label', `More shoals ${j.verb}`);
    row.append(label, minus, count, plus);
    shoalBox.append(row);
    jobRows.set(j.id, { row, count, what, minus, plus });
  }
  grow.append(shoalBox);

  // ---------- Residents ----------
  const homeBox = el('section', 'residents');
  homeBox.hidden = true;
  const homeHead = el('header');
  const homeCount = el('span', 'level');
  homeHead.append(el('h3', '', RESIDENT.label), homeCount);
  homeBox.append(homeHead, el('p', 'rasp-what', RESIDENT.intro));
  const homeRows = new Map<ResidentId, { row: HTMLElement; btn: HTMLButtonElement }>();
  for (const r of RESIDENTS) {
    const row = el('div', `job resident resident-${r.id}`);
    row.hidden = true;
    const label = el('div', 'job-label');
    label.append(el('span', 'job-name', r.name), el('span', 'job-what', r.effect), el('span', 'job-what resident-text', r.text));
    label.addEventListener('click', () => row.classList.toggle('open'));
    row.title = r.text;
    const btn = button('step take', RESIDENT.take, () => hooks.house(r.id));
    row.append(label, btn);
    homeBox.append(row);
    homeRows.set(r.id, { row, btn });
  }
  const pairLine = el('p', 'rasp-what pair-line');
  homeBox.append(pairLine);
  grow.append(homeBox);

  // ---------- Expeditions ----------
  const tripCard = el('article', 'card expedition');
  tripCard.hidden = true;
  const tripHead = el('header');
  const tripTitle = el('h3');
  tripHead.append(tripTitle, el('span', 'level', 'Expedition'));
  const tripHint = el('p', 'flavour');
  const tripEffect = el('p', 'effect');
  const tripBar = el('div', 'milestone-bar trip-bar');
  tripBar.append(el('div', 'milestone-fill'));
  const tripFoot = el('footer');
  const tripCost = el('span', 'cost');
  const tripBtn = button('buy shoals', '', () => (lastState?.expedition.site ? hooks.callHome() : hooks.send()));
  tripBtn.append(tripCost);
  const tripEta = el('span', 'eta');
  tripFoot.append(tripBtn, tripEta);
  tripCard.append(tripHead, tripHint, tripEffect, tripBar, tripFoot);
  tripCard.title = EXPEDITION.intro;
  grow.append(tripCard);

  // ---------- The epilogue garden (after the ending) ----------
  const gardenCard = el('article', 'card work garden');
  gardenCard.hidden = true;
  const gardenLevel = el('span', 'level');
  const gardenHead = el('header');
  gardenHead.append(el('h3', '', GARDEN.label), gardenLevel);
  const gardenFoot = el('footer');
  const gardenCost = el('span', 'cost');
  // One button per kind of child, all at the same price.
  const gardenKinds = el('div', 'boon-choices garden-kinds');
  const gardenBtns = GARDEN.kinds.map((k) => {
    const b = button('choice', '', () => hooks.plant(k.id as GardenKind));
    b.style.borderColor = k.colours.tip;
    b.append(el('strong', '', k.name), el('span', '', k.effect));
    gardenKinds.append(b);
    return b;
  });
  gardenFoot.append(gardenCost);
  gardenCard.append(gardenHead, el('p', 'flavour', GARDEN.text), el('p', 'effect', `${GARDEN.plant}: ${GARDEN.effect}`), gardenKinds, gardenFoot);
  grow.prepend(gardenCard);

  // ---------- Great works ----------
  const workCards = WORKS.map((w) => {
    const root = el('article', `card work work-${w.id}`);
    root.hidden = true;
    const head = el('header');
    const level = el('span', 'level');
    head.append(el('h3', '', w.name), level);
    const stages = el('div', 'work-stages');
    const pips = w.stageNames.map((n) => {
      const p = el('span', 'work-pip', n);
      stages.append(p);
      return p;
    });
    const foot = el('footer');
    const costEl = el('span', 'cost');
    const btn = button('buy work', '', () => hooks.build(w.id));
    btn.append(costEl);
    const eta = el('span', 'eta');
    foot.append(btn, eta);
    root.append(head, el('p', 'flavour', w.flavour), el('p', 'effect', w.effect), stages, foot);
    grow.append(root);
    return { w, root, level, pips, costEl, btn, eta };
  });

  // ---------- Upgrade cards ----------
  const cards = new Map<UpgradeId, Card>();
  const milestoneBars = new Map<UpgradeId, HTMLElement>();
  for (const u of UPGRADES) {
    const root = el('article', 'card');
    root.hidden = true;
    const head = el('header');
    const level = el('span', 'level');
    const title = el('h3');
    title.append(upgradeIcon(u.id), u.name);
    // A pin: this card's wait shows in the tab title.
    const pin = button('pin', '📌', () => { pinned = pinned === u.id ? '' : u.id; for (const [id, c] of cards) c.root.classList.toggle('pinned', id === pinned); });
    pin.title = 'Pin: show its wait in the tab title';
    pin.setAttribute('aria-label', `Pin ${u.name}`);
    title.append(pin);
    head.append(title, level);
    const flavour = el('p', 'flavour', u.flavour);
    const effect = el('p', 'effect', effectText(u.id));
    const foot = el('footer');
    const costEl = el('span', 'cost');
    const buyOnce = () => {
      hooks.buy(u.id);
      root.classList.remove('pop');
      void root.offsetWidth;
      root.classList.add('pop');
    };
    const btn = button(`buy ${u.currency}`, '', () => { if (!holdRepeat.repeated) buyOnce(); });
    const holdRepeat = repeatWhileHeld(btn, buyOnce);
    btn.append(costEl);
    const eta = el('span', 'eta');
    // Repeatable upgrades: a small button that buys as many as can be afforded.
    const max = u.maxLevel === Infinity ? button('step buy-max', 'max', () => hooks.buyMax(u.id)) : null;
    if (max) max.title = UI.buyMax;
    foot.append(btn, ...(max ? [max] : []), eta);
    root.append(head, flavour, effect, foot);
    // Polyps and glimmerseed: a thin bar toward the next milestone.
    if (u.id === 'polyp' || u.id === 'symbiont') {
      const bar = el('div', 'milestone-bar');
      bar.append(el('div', 'milestone-fill'));
      root.insertBefore(bar, foot);
      milestoneBars.set(u.id, bar);
    }
    flavour.addEventListener('click', () => root.classList.toggle('open'));
    grow.append(root);
    cards.set(u.id, { root, cost: costEl, level, effect, eta, btn, max });
  }

  // ---------- Bands and Readings ----------
  const bandsPage = tabPages.get('bands')!;
  const readingCard = el('article', 'card reading');
  readingCard.hidden = true;
  const readingHead = el('header');
  const readingTitle = el('h3');
  readingHead.append(readingTitle, el('span', 'level', 'Reading'));
  const readingHint = el('p', 'flavour', UI.readingHint);
  const readingEffect = el('p', 'effect');
  const readingFoot = el('footer');
  const readingCostEl = el('span', 'cost');
  const readingBtn = button('buy murmurs', '', () => {
    const next = currentReading;
    if (next) hooks.read(next.id);
  });
  readingBtn.append(readingCostEl);
  const readingEta = el('span', 'eta');
  readingFoot.append(readingBtn, readingEta);
  readingCard.append(readingHead, readingHint, readingEffect, readingFoot);
  const bandsIntro = el('p', 'hint', UI.bandsIntro);
  const bandList = el('ol', 'band-list');
  const codex = el('article', 'card codex');
  const codexList = el('dl', 'codex-list');
  const chart = el('canvas', 'growth-chart') as HTMLCanvasElement;
  codex.append(el('h3', '', UI.yourReef), codexList, chart);
  let chartLen = -1;
  /** The reef's height over this run, one point per sample, with the zone bounds as faint lines. */
  function renderChart(s: GameState): void {
    const hist = s.history;
    chart.hidden = hist.length < 2;
    if (hist.length === chartLen || hist.length < 2) return;
    chartLen = hist.length;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = chart.clientWidth || 300, H = 90;
    chart.width = W * dpr;
    chart.height = H * dpr;
    const c = chart.getContext('2d')!;
    c.scale(dpr, dpr);
    // Zones get equal bands, like the depth gauge, so the shallow zones are not squashed flat.
    const y = (m: number) => H - 4 - (H - 8) * gaugeFraction(m);
    // Each zone a faint band of its own colour, named at the left edge.
    const tints = ['rgba(60,50,140,0.16)', 'rgba(40,70,160,0.13)', 'rgba(40,120,190,0.12)', 'rgba(60,190,210,0.12)', 'rgba(220,170,230,0.12)'];
    c.font = '9px system-ui, sans-serif';
    c.textBaseline = 'middle';
    for (const [i, a] of ACTS.entries()) {
      const top = y(a.to), bottom = y(a.from);
      c.fillStyle = tints[i] ?? 'rgba(255,255,255,0.05)';
      c.fillRect(0, top, W, bottom - top);
      c.fillStyle = 'rgba(190,210,240,0.35)';
      c.fillText(a.name.replace(/^The /, ''), 4, (top + bottom) / 2);
    }
    const px = (i: number) => (i / (hist.length - 1)) * W;
    // A soft fill under the line, then the line.
    const fill = c.createLinearGradient(0, 0, 0, H);
    fill.addColorStop(0, 'rgba(255,194,176,0.28)');
    fill.addColorStop(1, 'rgba(255,194,176,0)');
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(0, H);
    hist.forEach((m, i) => c.lineTo(px(i), y(m)));
    c.lineTo(W, H);
    c.closePath();
    c.fill();
    c.strokeStyle = '#ffc2b0';
    c.lineWidth = 1.5;
    c.beginPath();
    hist.forEach((m, i) => {
      if (i) c.lineTo(px(i), y(m));
      else c.moveTo(px(i), y(m));
    });
    c.stroke();
    // Where the reef is now.
    const last = hist[hist.length - 1]!;
    c.fillStyle = '#ffe2d6';
    c.shadowColor = 'rgba(255,194,176,0.9)';
    c.shadowBlur = 6;
    c.beginPath();
    c.arc(W - 2.5, y(last), 2.5, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
  }
  // A portrait, large: tap anywhere (or Escape) to close.
  const lightbox = el('figure', 'lightbox');
  lightbox.hidden = true;
  const lightImg = el('img');
  const lightCap = el('figcaption');
  lightbox.append(lightImg, lightCap);
  lightbox.addEventListener('click', () => { lightbox.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lightbox.hidden = true; });
  host.append(lightbox);
  function showPortrait(src: string, name: string, note: string, zone: string): void {
    lightImg.src = src;
    lightImg.alt = name;
    lightCap.innerHTML = '';
    lightCap.append(el('strong', '', name), el('span', '', note), el('em', '', zone));
    lightbox.hidden = false;
  }
  // The journal of creatures seen (kept across spawnings).
  const journal = el('article', 'card codex journal');
  const journalHead = el('h3', '', UI.creaturesSeen);
  const journalList = el('div', 'journal-list');
  journal.append(journalHead, journalList);
  collapsible(journal, journalHead);
  let journalKey: string | null = null;
  function renderJournal(s: GameState): void {
    const seen = CREATURES.filter((c) => s.meta.seen.includes(`c:${c.id}`));
    const touched = s.meta.seen.filter((k) => k.startsWith('t:')).length;
    const luckyKey = s.meta.seen.filter((k) => k.startsWith('g:')).length;
    const key = seen.map((c) => c.id).join() + `|${hooks.portraits ?? 0}|${touched}|${luckyKey}|${s.meta.companion}|` + Object.values(s.meta.trust).map(trustLevel).join('');
    if (key === journalKey) return;
    journalKey = key;
    journalHead.textContent = `Creatures seen · ${seen.length} of ${CREATURES.length}${touched ? ` · ${touched} touched` : ''} · calcite +${Math.round((knownBonus(s) - 1) * 100)}%`;
    journalList.innerHTML = '';
    // Grouped by zone, with how many of each zone's creatures have been seen.
    const zones = [...new Set(CREATURES.map((c) => c.zone))];
    for (const zone of zones) {
      const inZone = CREATURES.filter((c) => c.zone === zone);
      const got = inZone.filter((c) => seen.includes(c)).length;
      const head = el('div', 'journal-zone', `${zone} · ${got} of ${inZone.length}`);
      // A small ring: how much of the zone has been seen.
      const f = got / inZone.length, r = 6, c = 2 * Math.PI * r;
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ring.setAttribute('viewBox', '0 0 16 16');
      ring.classList.add('zone-ring');
      ring.innerHTML = `<circle cx="8" cy="8" r="${r}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2.5"/>` +
        `<circle cx="8" cy="8" r="${r}" fill="none" stroke="${f >= 1 ? '#ffd9a8' : '#a8dcff'}" stroke-width="2.5" stroke-dasharray="${(f * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 8 8)" stroke-linecap="round"/>`;
      head.prepend(ring);
      journalList.append(head);
      for (const c of inZone) {
        const known = seen.includes(c);
        // Known: a portrait (when one was taken), the name and the note. Unknown: a one-line hint.
        const row = el('div', known ? 'journal-entry' : 'journal-entry unknown');
        const pic = known ? hooks.portrait?.(c.id) : null;
        if (pic) {
          const img = el('img', 'portrait');
          img.src = pic;
          img.alt = `${c.name}, as you first saw it`;
          img.tabIndex = 0;
          const enlarge = () => showPortrait(pic, c.name, c.note, c.zone);
          img.addEventListener('click', enlarge);
          img.addEventListener('keydown', (e) => { if (e.key === 'Enter') enlarge(); });
          row.append(img);
        } else row.append(el('div', 'portrait none'));
        const text = el('div', 'journal-text');
        const name = el('strong', '', known ? c.name : UI.notYetSeen);
        const tl = trustLevel(s.meta.trust[c.id] ?? 0);
        if (known && tl > 0) name.append(el('em', `touched trust-${tl}`, ` · ${TRUST.names[tl]}`));
        if (s.meta.seen.includes(`g:${c.id}`)) {
          const mark = el('em', 'lucky-mark', ' ✦');
          mark.title = LUCKY.seen;
          name.append(mark);
        }
        // A touched creature can be kept close as the line's companion.
        if (known && s.meta.seen.includes(`t:${c.id}`)) {
          const mine = s.meta.companion === c.id;
          const star = button(`companion${mine ? ' on' : ''}`, mine ? '★' : '☆', () => hooks.companion(mine ? '' : c.id));
          star.title = mine ? `${COMPANION.on} · ${COMPANION.note}` : `${COMPANION.label} (${COMPANION.note})`;
          name.append(star);
        }
        text.append(name,
          el('span', '', known ? c.note : c.note.startsWith('Rare.') ? 'Rare: watch for it.' : (/Only (?:on|after) [^.]*\./.exec(c.note)?.[0] ?? '')));
        row.append(text);
        journalList.append(row);
      }
    }
  }
  // Shards of Thousandfold: the tablet, filling in as the line finds its pieces.
  const tablet = el('article', 'card codex tablet');
  const tabletHead = el('h3');
  const tabletCanvas = el('canvas', 'tablet-stone') as HTMLCanvasElement;
  const tabletLines = el('ol', 'tablet-lines');
  tablet.append(tabletHead, el('p', 'hint', SHARD.intro), tabletCanvas, tabletLines);
  collapsible(tablet, tabletHead);
  let tabletKey = '';
  function renderTablet(s: GameState): void {
    const got = s.meta.shards;
    tablet.hidden = got.length === 0;
    const key = got.join();
    if (key === tabletKey || !got.length) return;
    tabletKey = key;
    tabletHead.textContent = `${SHARD.label} · ${got.length} of ${SHARD_LINES.length}`;
    tabletLines.innerHTML = '';
    SHARD_LINES.forEach((line, i) => tabletLines.append(el('li', got.includes(i) ? 'found' : '', got.includes(i) ? line : SHARD.missing)));
    if (got.length === SHARD_LINES.length) tabletLines.append(el('li', 'whole', SHARD.whole_text));
    drawTablet(tabletCanvas, got);
  }
  // Your own bands: the reef's diary of this run, newest first.
  const diary = el('article', 'card codex diary');
  const diaryHead = el('h3', '', DIARY_TEXT.label);
  const diaryList = el('ol', 'diary-list');
  // The bands as a cross-section of the stone: tap a ring to read it.
  const ringCanvas = el('canvas', 'city-map rings') as HTMLCanvasElement;
  const ringNote = el('p', 'hint ring-note', DIARY_TEXT.tap);
  let ringLines: string[] = [];
  let ringGeo = { cx: 0, cy: 0, r0: 0, step: 1 };
  let ringW = 0;
  ringCanvas.addEventListener('pointerdown', (e) => {
    const b = ringCanvas.getBoundingClientRect();
    const x = e.clientX - b.left - ringGeo.cx, y = (e.clientY - b.top - ringGeo.cy) / 0.92;
    const i = Math.floor((Math.hypot(x, y) - ringGeo.r0) / ringGeo.step);
    if (i < 0 || i >= ringLines.length) return;
    ringGeo = drawRings(ringCanvas, ringLines, i);
    const [t, h] = ringLines[i]!.split('|');
    ringNote.textContent = `${duration(Number(t))} · ${metres(Number(h))} · ${diaryLine(ringLines[i]!)}`;
  });
  diary.append(diaryHead, el('p', 'hint', DIARY_TEXT.intro), ringCanvas, ringNote, diaryList);
  collapsible(diary, diaryHead);
  let diaryLen = -1;
  function renderDiary(s: GameState): void {
    diary.hidden = s.diary.length === 0;
    // The rings are drawn at the canvas's size: again when it opens or the panel changes width.
    if (ringCanvas.clientWidth && ringCanvas.clientWidth !== ringW) {
      ringW = ringCanvas.clientWidth;
      ringGeo = drawRings(ringCanvas, ringLines, -1);
    }
    if (s.diary.length === diaryLen) return;
    diaryLen = s.diary.length;
    diaryHead.textContent = `${DIARY_TEXT.label} · ${s.diary.length}`;
    ringLines = s.diary.slice(-60);
    ringGeo = drawRings(ringCanvas, ringLines, -1);
    diaryList.innerHTML = '';
    for (const line of [...s.diary].reverse()) {
      const [t, h] = line.split('|');
      const li = el('li');
      li.append(el('span', 'diary-when', `${duration(Number(t))} · ${metres(Number(h))}`), el('span', 'diary-what', diaryLine(line)));
      diaryList.append(li);
    }
  }
  // The map of Thousandfold: the ruins the shoals have searched, lit on the buried city.
  const cityCard = el('article', 'card codex city');
  const cityHead = el('h3', '', CITY_MAP.label);
  const cityCanvas = el('canvas', 'city-map') as HTMLCanvasElement;
  const cityNote = el('p', 'hint');
  cityCard.append(cityHead, cityCanvas, cityNote);
  collapsible(cityCard, cityHead);
  let cityKey = '';
  function renderCity(s: GameState): void {
    cityCard.hidden = s.relics.length === 0 && s.tally.roams === 0;
    const ex = s.expedition, site = tripSite(s);
    const trip = site ? { site: site.id, done: Math.max(0, Math.min(1, 1 - (ex.back - s.t) / tripSeconds(s, site))) } : null;
    const key = `${s.relics.join()}|${s.tally.roams}|${trip ? `${trip.site}:${Math.round(trip.done * 100)}` : ''}`;
    if (cityCard.hidden || key === cityKey) return;
    cityKey = key;
    cityNote.textContent = s.tally.roams ? `${s.tally.roams} ${CITY_MAP.roams}` : '';
    drawCity(cityCanvas, s.relics, s.tally.roams, s.seed, trip);
  }
  // The shelf: shells the line has kept.
  const shelf = el('article', 'card codex shelf');
  const shelfHead = el('h3');
  const shelfRow = el('div', 'shelf-row');
  shelf.append(shelfHead, shelfRow);
  let shelfKey = '';
  function renderShelf(s: GameState): void {
    shelf.hidden = s.meta.shells.length === 0;
    const key = s.meta.shells.join();
    if (key === shelfKey) return;
    shelfKey = key;
    shelfHead.textContent = `${SHELL.label} · ${s.meta.shells.length} of ${SHELLS.length} · calcite +${s.meta.shells.length + (s.meta.shells.length >= SHELLS.length ? 5 : 0)}%`;
    shelfRow.innerHTML = '';
    for (const sh of SHELLS) {
      const got = s.meta.shells.includes(sh.id);
      const d = el('span', got ? 'shell-chip' : 'shell-chip missing', got ? '' : '?');
      if (got) {
        // The shell itself, drawn small, with its name as the tooltip.
        d.style.borderColor = sh.colour;
        d.title = sh.name;
        const c = el('canvas', 'shell-pic') as HTMLCanvasElement;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        c.width = 44 * dpr;
        c.height = 30 * dpr;
        const g = c.getContext('2d')!;
        g.scale(dpr, dpr);
        g.translate(22, 24);
        drawShellShape(g, sh.id, sh.colour, 2.6);
        d.append(c);
      }
      shelfRow.append(d);
    }
  }
  // Moments across the line: each one met, and the ways the line has met it.
  const momentCard = el('article', 'card codex moments-met');
  const momentHead = el('h3');
  const momentList = el('dl', 'codex-list');
  momentCard.append(momentHead, el('p', 'hint', UI.momentsIntro), momentList);
  collapsible(momentCard, momentHead);
  let momentKey = '';
  function renderMoments(s: GameState): void {
    const key = s.meta.seen.filter((k) => k.startsWith('m:')).join();
    if (key === momentKey) return;
    momentKey = key;
    const met = MOMENTS.filter((m) => s.meta.seen.includes(`m:${m.id}:a`) || s.meta.seen.includes(`m:${m.id}:b`));
    momentCard.hidden = met.length === 0;
    momentHead.textContent = `${UI.momentsLabel} · ${met.length} of ${MOMENTS.length}`;
    momentList.innerHTML = '';
    for (const m of MOMENTS) {
      const ways = (['a', 'b'] as const).filter((c) => s.meta.seen.includes(`m:${m.id}:${c}`)).map((c) => m[c].label);
      if (!ways.length) {
        // Hard places' moments stay hidden until met; others show a hint of where they wait.
        if (!m.seamount) momentList.append(el('dt', 'unknown', UI.notYetMet), el('dd', '', `${metres(m.metres)}`));
        continue;
      }
      momentList.append(el('dt', '', m.title), el('dd', '', ways.join(' · ')));
    }
  }
  bandsPage.append(codex, journal, readingCard, tablet, shelf, cityCard, diary, momentCard, bandsIntro, bandList);
  let codexKey = '';
  function codexRow(term: string, value: string): void {
    codexList.append(el('dt', '', term), el('dd', '', value));
  }
  function renderCodex(s: GameState): void {
    const key = JSON.stringify([s.meta.name, Math.floor(s.height), Math.floor(s.t / 60), s.feasts, s.truce, s.dialects, s.carried, s.meta.spawnings, s.meta.endings, s.readings.length, s.strain, s.sport, s.grains.length, s.sky, s.tally.risings]);
    if (key === codexKey) return;
    codexKey = key;
    codexList.innerHTML = '';
    const tr = seamountDef(s.seamount).trial;
    if (tr) codexRow('Trial', `${seamountDef(s.seamount).name}: grow to ${metres(tr.goal)}${s.meta.seen.includes(`trial:${s.seamount}`) ? ` · ${TRIAL_TEXT.met}` : ''} · ${tr.reward}`);
    const wrong = s.meta.seen.filter((k) => k.startsWith('o:')).length;
    if (wrong) codexRow('Ossel', `${wrong} of ${OSSEL_MISTAKES.length} mistakes found`);
    if (s.race.decided > 0) codexRow(UI.sisterReef, `first to ${s.race.won} of ${s.race.decided} marks` + (s.meta.endings > 0 ? ` · ahead of the quick cousin at ${s.race.cousin}` : ''));
    const recs = s.meta.records.map((t, i) => t > 0 ? `${metres(SISTER.marks[i]!)} in ${duration(t)}` : '').filter(Boolean);
    if (recs.length) codexRow('Line’s best', recs.join(' · '));
    const did: string[] = [];
    if (s.feasts) did.push(`${s.feasts} feast${s.feasts === 1 ? '' : 's'} caught`);
    if (s.tally.intruders) did.push(`${s.tally.intruders} intruder${s.tally.intruders === 1 ? '' : 's'} driven off`);
    if (s.signal.answered) did.push(`${s.signal.answered} signal${s.signal.answered === 1 ? '' : 's'} answered`);
    if (s.relics.length + s.tally.roams) did.push(`${s.relics.length + s.tally.roams} trip${s.relics.length + s.tally.roams === 1 ? '' : 's'}`);
    if (s.request.done) did.push(`${s.request.done} request${s.request.done === 1 ? '' : 's'} kept`);
    if (s.tally.risings) did.push(`${s.tally.risings} rising${s.tally.risings === 1 ? '' : 's'} fed on`);
    if (did.length) codexRow(UI.thisReef, did.join(' · '));
    const strain = STRAINS.find((x) => x.id === s.strain), sport = SPORTS.find((x) => x.id === s.sport);
    if (strain) codexRow('Glimmerseed', sport ? `${strain.name}, sported ${sport.name.toLowerCase()} (${sport.effect})` : `${strain.name} (${strain.effect})`);
    const grains = GRAINS.map((g) => [g.name, s.grains.filter((x) => x === g.id).length] as const).filter(([, n]) => n > 0);
    if (grains.length) codexRow(UI.theGrain, grains.map(([n, c]) => `${c} ${n.toLowerCase()}`).join(' · '));
    const stars = FIGURES.filter((f) => s.sky[f.id]).map((f) => f.name);
    if (stars.length) codexRow(UI.starsNamed, stars.join(' · '));
    codexRow('Grown', `${metres(s.height)} up the seamount, ${Math.round(Math.max(0, SURFACE - s.height)).toLocaleString('en-US')} m down`);
    codexRow(UI.bandsRead, `${s.bands.length} of your own, ${s.readings.length} of Thousandfold’s`);
    const truce = MEETINGS.filter((m) => s.truce[m.id]).map((m) => `${m.title}: ${m[s.truce[m.id] as Choice].label}`);
    if (truce.length) codexRow(UI.truceKicker, truce.join(' · '));
    const spoken = TIERS.filter((t) => s.dialects[t.tier]).map((t) => DIALECTS.find((d) => d.id === s.dialects[t.tier])!.name);
    if (spoken.length) codexRow('Dialects', spoken.join(' · '));
    if (s.meta.name) codexRow('Name', reefName(s));
    codexRow(UI.thisReef, `${duration(s.t)} growing · ${num(s.earned.calcite)} calcite gathered${s.feasts ? ` · ${s.feasts} feast${s.feasts === 1 ? '' : 's'} caught` : ''}`);
    const small = [
      s.tally.pruned ? UI.tallyPruned(s.tally.pruned) : '',
      s.tally.lucky ? UI.tallyLucky(s.tally.lucky) : '',
      s.tally.milky ? UI.tallyMilky(s.tally.milky) : '',
      s.lineWishes || s.wished >= 0 ? UI.tallyWished : '',
    ].filter(Boolean);
    if (small.length) codexRow(UI.smallThings, small.join(' · '));
    if (s.nursed) codexRow(GARDEN.nursed, GARDEN.kinds.filter((k) => s.nursed.includes(k.id)).map((k) => `${[...s.nursed].filter((c) => c === k.id).length} × ${k.name.toLowerCase().replace(/^a /, '')} (${k.effect.replace(' on the next reef', '')})`).join(' · '));
    if (s.vows.length) codexRow(VOW.label, VOWS.filter((v) => s.vows.includes(v.id)).map((v) => `${v.name.toLowerCase()} (${vowKept(s, v.id) ? VOW.kept : VOW.broken})`).join(' · '));
    if (s.meta.endings > 0) codexRow(UI.theSea, `healing: the Long Silt falls ×${(0.95 ** Math.min(6, s.meta.endings)).toFixed(2)} for the endings your line has reached`);
    if (s.meta.endings > 0) codexRow('Endings', `${s.meta.endings} · ${s.meta.carriedEver.length} of ${MEMORIES.length} memories carried so far`);
    if (s.carried.length) codexRow('Carried', s.carried.map((id) => MEMORIES.find((m) => m.id === id)?.title ?? id).join(' · '));
    if (s.meta.spawnings) codexRow('Lineage', `${s.meta.spawnings} lesser spawning${s.meta.spawnings === 1 ? '' : 's'}, best reef ${metres(s.meta.best)}`);
  }
  let currentReading: Reading | undefined;
  let lastBandCount = 0;
  let lastReadingCount = 0;
  let lastRelicCount = 0;
  const momentSeen = new Set<MomentId>();
  const truceSeen = new Set<MeetingId>();
  const dialectSeen = new Set<DialectId>();

  // ---------- Lineage ----------
  const lineagePage = tabPages.get('lineage')!;
  const lineageHead = el('div', 'lineage-head');
  const lineageCount = el('span', 'stock-value lineage-count');
  const lineageSub = el('span', 'stock-sub');
  lineageHead.append(el('span', 'stock-name', 'Lineage'), lineageCount, lineageSub);
  const spawnCard = el('article', 'card spawn-lesser');
  const spawnTitle = el('h3', '', UI.lesserTitle);
  const spawnText = el('p', 'flavour',
    UI.lesserText);
  const spawnFoot = el('footer');
  const spawnBtn = button('buy lineage', '', () => {
    const s = lastState;
    if (!s) return;
    const msg = ended(s)
      ? `Begin again on a new seamount, with +${lineageFor(s)} lineage?`
      : `Release a lesser spawning now for +${lineageFor(s)} lineage? This reef starts over.`;
    if (window.confirm(`${msg}\nIt will settle on ${seamountDef(whereNext).name.toLowerCase()}.`)) hooks.spawnLesser(whereNext, heirNext, [...vowsNext]);
  });
  // Where the spawn settles: each seamount bends the next run one way.
  let whereNext: SeamountId = 'plain';
  const whereBox = el('div', 'seamounts');
  const whereNote = el('p', 'hint');
  const whereButtons = SEAMOUNTS.map((m) => {
    const b = button('seamount', m.name.replace(/^A /, ''), () => {
      whereNext = m.id;
      for (const x of whereButtons) x.classList.toggle('on', x === b);
      whereNote.textContent = `${m.text} ${m.effect === 'as before' ? '' : `(${m.effect})`}` +
        (m.trial ? ` Grow to ${metres(m.trial.goal)} there and your line learns it: ${m.trial.reward}.` : '');
    });
    b.classList.toggle('on', m.id === whereNext);
    if (m.trial) b.classList.add('trial');
    return b;
  });
  whereBox.append(...whereButtons);
  whereNote.textContent = SEAMOUNTS[0]!.text;
  spawnFoot.append(spawnBtn);
  const spawnBuys = el('p', 'effect');
  // What it carries: one relic this reef found may go along (its effect in play on the next reef).
  let heirNext = '';
  const heirLabel = el('p', 'stock-name', EXPEDITION.heirLabel);
  const heirBox = el('div', 'seamounts heirs');
  const heirNote = el('p', 'hint', EXPEDITION.heirNote);
  let heirKey = '';
  function renderHeirs(s: GameState): void {
    vowLabel.hidden = vowBox.hidden = vowNote.hidden = s.meta.endings === 0;
    const key = s.relics.join();
    heirLabel.hidden = heirBox.hidden = heirNote.hidden = s.relics.length === 0;
    if (key === heirKey) return;
    heirKey = key;
    heirBox.innerHTML = '';
    if (!s.relics.includes(heirNext as never)) heirNext = '';
    for (const id of ['', ...s.relics]) {
      const x = id ? site(id) : undefined;
      const b = button('seamount', x ? x.relic : EXPEDITION.heirNone, () => {
        heirNext = id;
        for (const o of heirBox.children) o.classList.toggle('on', o === b);
        heirNote.textContent = x ? `${x.relic}: ${x.effect}, from the start of the next reef.` : EXPEDITION.heirNote;
      });
      b.classList.toggle('on', id === heirNext);
      heirBox.append(b);
    }
  }
  // Vows: once the line has reached an ending, the next reef may take any of them.
  const vowsNext = new Set<VowId>();
  const vowLabel = el('p', 'stock-name', VOW.label);
  const vowBox = el('div', 'seamounts vows');
  const vowNote = el('p', 'hint', VOW.note);
  for (const v of VOWS) {
    const b = button('seamount', v.name, () => {
      if (vowsNext.has(v.id)) vowsNext.delete(v.id);
      else vowsNext.add(v.id);
      b.classList.toggle('on', vowsNext.has(v.id));
      vowNote.textContent = `${v.name}: ${v.effect} · +${v.lineage} lineage at its ending if kept.`;
    });
    vowBox.append(b);
  }
  spawnCard.append(spawnTitle, spawnText, spawnBuys, el('p', 'stock-name', UI.whereItSettles), whereBox, whereNote, heirLabel, heirBox, heirNote, vowLabel, vowBox, vowNote, spawnFoot);
  // Feats: goals across all runs, one lineage each.
  const featCard = el('article', 'card codex feats');
  const featHead = el('h3', '', 'Feats');
  const featList = el('dl', 'codex-list');
  featCard.append(featHead, featList);
  collapsible(featCard, featHead);
  let featKey: string | null = null;
  function renderFeats(s: GameState): void {
    const done = FEATS.filter((f) => s.meta.seen.includes(`f:${f.id}`));
    // Progress toward the counted ones changes the key too (refreshed when a number moves).
    const key = done.map((f) => f.id).join() + '|' + FEATS.map((f) => (f.progress && !done.includes(f) ? f.progress(s)[0] : '')).join();
    if (key === featKey) return;
    featKey = key;
    featHead.textContent = `Feats · ${done.length} of ${FEATS.length} · one lineage each`;
    featList.innerHTML = '';
    for (const f of FEATS) {
      const got = done.includes(f);
      const pr = !got && f.progress ? f.progress(s) : null;
      const secret = f.hidden && !got;
      featList.append(el('dt', got ? '' : 'unknown', secret ? '???' : f.name), el('dd', got ? '' : 'unknown', secret ? 'A secret.' : pr ? `${f.text} (${Math.min(pr[0], pr[1])} of ${pr[1]})` : f.text));
    }
  }
  // The chronicle: every ending the line has reached, and what each carried.
  const chronicle = el('article', 'card codex chronicle');
  const chronHead = el('h3', '', UI.chronicle);
  const chronList = el('ol', 'diary-list');
  const seaChart = el('canvas', 'city-map sea-chart') as HTMLCanvasElement;
  chronicle.append(chronHead, seaChart, chronList);
  collapsible(chronicle, chronHead);
  let chronKey = '';
  function renderChronicle(s: GameState): void {
    chronicle.hidden = s.meta.chronicle.length === 0;
    const key = s.meta.chronicle.join(';');
    if (key === chronKey) return;
    chronKey = key;
    chronHead.textContent = `The chronicle · ${s.meta.chronicle.length} ending${s.meta.chronicle.length === 1 ? '' : 's'}`;
    chronList.innerHTML = '';
    drawSeaChart(seaChart, s.meta.chronicle);
    s.meta.chronicle.forEach((line, i) => {
      const [sm, ids, hours] = line.split('|');
      const names = (ids ?? '').split(',').map((id) => MEMORIES.find((m) => m.id === id)?.title ?? id).join(', ');
      const li = el('li');
      li.append(el('span', 'diary-when', `${i + 1} · ${seamountDef((sm ?? 'plain') as SeamountId).name.replace(/^A /, '')} · ${hours} h`), el('span', 'diary-what', names));
      chronList.append(li);
    });
  }
  lineagePage.append(lineageHead, spawnCard, chronicle);
  const traitCards = new Map<TraitId, Card>();
  const forgetButtons = new Map<TraitId, HTMLButtonElement>();
  const groupHead = (g: keyof typeof TRAIT_GROUPS) =>
    lineagePage.append(el('h4', 'trait-group', TRAIT_GROUPS[g].title), el('p', 'hint', TRAIT_GROUPS[g].text));
  const groupOf = (t: (typeof TRAITS)[number]) => t.kind ?? 'gift';
  const ordered = (['gift', 'way', 'habit'] as const).flatMap((k) => TRAITS.filter((t) => groupOf(t) === k));
  for (const tr of ordered) {
    const prev = ordered[ordered.indexOf(tr) - 1];
    if (!prev || groupOf(prev) !== groupOf(tr)) groupHead(groupOf(tr));
    const root = el('article', 'card trait');
    const head = el('header');
    const level = el('span', 'level');
    head.append(el('h3', '', tr.name), level);
    const effect = el('p', 'effect', tr.effect);
    const foot = el('footer');
    const costEl = el('span', 'cost');
    const btn = button('buy lineage', '', () => hooks.buyTrait(tr.id));
    btn.append(costEl);
    const eta = el('span', 'eta');
    // Forget: asks once (the label changes), forgets on the second press.
    let sure = 0;
    const forget = button('plain forget', '', () => {
      if (Date.now() - sure < 4000) { sure = 0; hooks.forgetTrait(tr.id); return; }
      sure = Date.now();
      forget.textContent = `${FORGET.sure} (+${forgetRefund(lastState!, tr.id)})`;
      setTimeout(() => { if (Date.now() - sure >= 4000) forget.textContent = FORGET.label; }, 4100);
    });
    forget.textContent = FORGET.label;
    forget.title = FORGET.title;
    foot.append(btn, eta, forget);
    root.append(head, el('p', 'flavour', tr.flavour), effect, foot);
    lineagePage.append(root);
    traitCards.set(tr.id, { root, cost: costEl, level, effect, eta, btn, max: null });
    forgetButtons.set(tr.id, forget);
  }
  lineagePage.append(featCard);
  // Your line: every earlier reef, oldest first.
  const lineCard = el('article', 'card codex line');
  const lineList = el('dl', 'codex-list');
  // One small coral per generation, as tall as it grew (zones spaced as on the gauge), the living
  // reef last; a moon over those that reached the surface.
  const lineChart = el('canvas', 'line-chart');
  lineCard.append(el('h3', '', UI.yourLine), lineChart, lineList);
  lineagePage.append(lineCard);
  let lineKey: string | null = null;
  function renderLine(s: GameState): void {
    const key = s.meta.ancestors.join() + s.meta.name + s.meta.fastest;
    lineCard.hidden = s.meta.ancestors.length === 0 && s.meta.fastest === 0;
    if (key === lineKey) return;
    lineKey = key;
    lineList.innerHTML = '';
    drawLine(s);
    if (s.meta.fastest > 0) lineList.append(el('dt', '', 'Record'), el('dd', '', `The surface in ${duration(s.meta.fastest)} of reef time`));
    s.meta.ancestors.forEach((a, i) => {
      const [h, sm, form, end] = a.split('|');
      const gen = s.meta.name ? reefName({ ...s, meta: { ...s.meta, spawnings: i } }) : `Reef ${i + 1}`;
      const where = SEAMOUNTS.find((m) => m.id === sm)?.name.replace(/^A /, '') ?? 'seamount';
      const shape = DIALECTS.find((d) => d.id === form)?.name;
      lineList.append(el('dt', '', gen), el('dd', '',
        `${end === '1' ? 'reached the surface and spawned' : `let go at ${metres(Number(h))}`} · ${where}${shape ? ` · ${shape}` : ''}`));
    });
  }
  function drawLine(s: GameState): void {
    const gens = s.meta.ancestors.map((a) => a.split('|')).map(([h, sm, , end]) => ({ h: Number(h), sm, end: end === '1' }));
    gens.push({ h: s.height, sm: s.seamount, end: ended(s) });
    lineChart.hidden = gens.length < 2;
    if (lineChart.hidden) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = lineChart.clientWidth || 300, H = 80;
    lineChart.width = W * dpr;
    lineChart.height = H * dpr;
    const c = lineChart.getContext('2d')!;
    c.scale(dpr, dpr);
    const tint = SEAMOUNT_TINT;
    const step = Math.min(34, (W - 8) / gens.length);
    gens.forEach((g, i) => {
      const x = 4 + step * (i + 0.5);
      const top = (H - 6) - (H - 20) * gaugeFraction(Math.max(1, g.h));
      const last = i === gens.length - 1;
      c.strokeStyle = tint[g.sm ?? 'plain'] ?? '#c98a9a';
      c.globalAlpha = last ? 1 : 0.75;
      c.lineCap = 'round';
      // A trunk and a few branches, scaled to its height.
      const hgt = (H - 6) - top;
      c.lineWidth = 2.2;
      c.beginPath();
      c.moveTo(x, H - 6);
      c.lineTo(x, top);
      for (const f of [0.35, 0.6, 0.8]) {
        if (hgt * f < 6) continue;
        const y = H - 6 - hgt * f;
        c.moveTo(x, y);
        c.lineTo(x - 5, y - 6);
        c.moveTo(x, y + 3);
        c.lineTo(x + 5, y - 3);
      }
      c.stroke();
      if (g.end) {
        c.fillStyle = '#f4f1dc';
        c.beginPath();
        c.arc(x, 6, 3.2, 0, Math.PI * 2);
        c.fill();
      }
      if (last) {
        c.fillStyle = '#ffe2d6';
        c.beginPath();
        c.arc(x, top, 2.6, 0, Math.PI * 2);
        c.fill();
      }
    });
    c.globalAlpha = 1;
  }

  // The next upgrade still hidden, and what opens it.
  const comingUp = el('p', 'hint coming-up');
  grow.append(comingUp);

  // ---------- Reef (settings) ----------
  const reefPage = tabPages.get('reef')!;
  const exportBtn = button('plain', UI.copySave, async () => {
    const text = hooks.exportSave();
    try {
      await navigator.clipboard.writeText(text);
      exportBtn.textContent = 'Copied ✓';
    } catch {
      window.prompt(UI.copyPrompt, text);
    }
    setTimeout(() => (exportBtn.textContent = UI.copySave), 2000);
  });
  // A file is easier to keep than a clipboard on a phone.
  const fileBtn = button('plain', UI.saveFile, () => {
    const text = hooks.exportSave();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = `corallum-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  });
  const fileInput = el('input') as HTMLInputElement;
  fileInput.type = 'file';
  fileInput.accept = '.txt,text/plain';
  fileInput.hidden = true;
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (f && !hooks.importSave(await f.text())) window.alert(UI.badSave);
    fileInput.value = '';
  });
  const loadFileBtn = button('plain', UI.loadFile, () => fileInput.click());
  const importBtn = button('plain', UI.loadText, () => {
    const text = window.prompt(UI.pastePrompt);
    if (text && !hooks.importSave(text)) window.alert(UI.badSave);
  });
  const resetBtn = button('plain danger', UI.reset, () => {
    if (window.confirm(UI.resetSure)) hooks.reset();
  });
  const backupNote = el('p', 'backup-note',
    UI.backup);
  backupNote.hidden = true;
  const glowToggle = el('label', 'toggle');
  const glowBox = el('input') as HTMLInputElement;
  glowBox.type = 'checkbox';
  glowBox.checked = hooks.glow.get();
  glowBox.addEventListener('change', () => hooks.glow.set(glowBox.checked));
  glowToggle.append(glowBox, el('span', '', UI.softGlow));
  const nameRow = el('label', 'name-row');
  const nameInput = el('input') as HTMLInputElement;
  nameInput.type = 'text';
  nameInput.maxLength = 24;
  nameInput.placeholder = UI.namePlaceholder;
  nameInput.addEventListener('change', () => hooks.rename(nameInput.value.trim()));
  nameRow.append(el('span', 'stock-name', 'Name'), nameInput);
  // The line's colours: a swatch per palette, open once the reef has known pigment.
  const paletteRow = el('div', 'palette-row');
  paletteRow.hidden = true;
  const swatches = PALETTES.map((p) => {
    const b = button('swatch', '', () => hooks.recolour(p.id));
    b.title = p.name;
    b.setAttribute('aria-label', p.name);
    b.style.background = `linear-gradient(135deg, ${p.pigments.slice(0, 4).join(', ')})`;
    b.append(el('span', '', p.name));
    paletteRow.append(b);
    return { p, b };
  });
  const paletteBox = el('div', 'palette-box');
  paletteBox.hidden = true;
  paletteBox.append(el('span', 'stock-name', PALETTE_TEXT.label), paletteRow);
  const volRow = el('label', 'toggle');
  const volInput = el('input') as HTMLInputElement;
  volInput.type = 'range';
  volInput.min = '0';
  volInput.max = '100';
  volInput.value = String(Math.round(hooks.volume.get() * 100));
  volInput.addEventListener('input', () => hooks.volume.set(Number(volInput.value) / 100));
  volRow.append(el('span', '', 'Volume'), volInput);
  const buzzToggle = el('label', 'toggle');
  const buzzBox = el('input') as HTMLInputElement;
  buzzBox.type = 'checkbox';
  buzzBox.checked = hooks.buzz.get();
  buzzBox.addEventListener('change', () => hooks.buzz.set(buzzBox.checked));
  buzzToggle.append(buzzBox, el('span', '', UI.vibration));
  buzzToggle.hidden = !('vibrate' in navigator);
  const sciToggle = el('label', 'toggle');
  const sciBox = el('input') as HTMLInputElement;
  sciBox.type = 'checkbox';
  sciBox.checked = hooks.sci.get();
  sciBox.addEventListener('change', () => hooks.sci.set(sciBox.checked));
  sciToggle.append(sciBox, el('span', '', UI.scientific));
  const sharpToggle = el('label', 'toggle');
  const sharpBox = el('input') as HTMLInputElement;
  sharpBox.type = 'checkbox';
  sharpBox.checked = hooks.sharp.get();
  sharpBox.addEventListener('change', () => hooks.sharp.set(sharpBox.checked));
  sharpToggle.append(sharpBox, el('span', '', UI.fullRes));
  const calmToggle = el('label', 'toggle');
  const calmBox = el('input') as HTMLInputElement;
  calmBox.type = 'checkbox';
  calmBox.checked = hooks.calm.get();
  calmBox.addEventListener('change', () => hooks.calm.set(calmBox.checked));
  calmToggle.append(calmBox, el('span', '', UI.calm));
  const bigToggle = el('label', 'toggle');
  const bigBox = el('input') as HTMLInputElement;
  bigBox.type = 'checkbox';
  bigBox.checked = hooks.big.get();
  bigBox.addEventListener('change', () => hooks.big.set(bigBox.checked));
  bigToggle.append(bigBox, el('span', '', UI.bigText));
  const quietToggle = el('label', 'toggle');
  const quietBox = el('input') as HTMLInputElement;
  quietBox.type = 'checkbox';
  quietBox.checked = hooks.quiet.get();
  quietBox.addEventListener('change', () => hooks.quiet.set(quietBox.checked));
  quietToggle.append(quietBox, el('span', '', UI.quiet));
  const notifyToggle = el('label', 'toggle');
  const notifyBox = el('input') as HTMLInputElement;
  notifyBox.type = 'checkbox';
  notifyBox.checked = hooks.notify.get();
  notifyBox.addEventListener('change', () => { hooks.notify.set(notifyBox.checked); notifyBox.checked = hooks.notify.get(); });
  notifyToggle.append(notifyBox, el('span', '', NOTIFY.setting));
  notifyToggle.hidden = !('Notification' in window);
  const habitToggle = el('label', 'toggle');
  const habitBox = el('input') as HTMLInputElement;
  habitBox.type = 'checkbox';
  habitBox.checked = hooks.habits.get();
  habitBox.addEventListener('change', () => hooks.habits.set(habitBox.checked));
  habitToggle.append(habitBox, el('span', '', UI.habits));
  habitToggle.hidden = true;
  const group = (title: string) => el('h4', 'settings-group', title);
  const guide = el('article', 'card codex guide');
  const guideHead = el('h3', '', UI.howGrows);
  const guideList = el('dl', 'codex-list');
  for (const [term, text] of GUIDE) guideList.append(el('dt', '', term), el('dd', '', text));
  guide.append(guideHead, guideList);
  collapsible(guide, guideHead);
  // What shapes this reef: every lasting effect from boons, relics, residents, moments, works,
  // favours and the line's hard places, one line each.
  const shapes = el('article', 'card codex shapes');
  const shapesHead = el('h3', '', UI.shapes);
  const shapesList = el('dl', 'codex-list');
  shapes.append(shapesHead, shapesList);
  collapsible(shapes, shapesHead);
  let shapesKey = '';
  function renderShapes(s: GameState): void {
    const rows: [string, string][] = [];
    const b = BOONS.find((x) => x.id === s.boon);
    if (b) rows.push([b.name, b.effect]);
    for (const id of s.relics) { const x = site(id); if (x) rows.push([x.relic, x.effect]); }
    if (s.heirloom && !s.relics.includes(s.heirloom)) { const x = site(s.heirloom); if (x) rows.push([`${x.relic} (heirloom)`, x.effect]); }
    for (const id of s.residents) { const r = RESIDENTS.find((x) => x.id === id); if (r) rows.push([r.name, r.effect]); }
    for (const p of PAIRS) if (s.residents.includes(p.a) && s.residents.includes(p.b)) rows.push([p.name, p.effect]);
    for (const m of MOMENTS) { const c = s.moments[m.id]; if (c) rows.push([m[c].label, m[c].effect]); }
    for (const w of WORKS) if (s.works[w.id] > 0) rows.push([`${w.name} (${s.works[w.id]}/${w.stages.length})`, w.effect]);
    if (s.favours.clear > 0) rows.push([`${FAVOURS[0]!.name} ×${s.favours.clear}`, FAVOURS[0]!.effect]);
    for (const m of SEAMOUNTS) if (m.trial && s.meta.seen.includes(`trial:${m.id}`)) rows.push(['Learned on ' + m.name.toLowerCase(), m.trial.reward.split(': ')[1] ?? m.trial.reward]);
    if (s.meta.carriedEver.length) rows.push([`${s.meta.carriedEver.length} memories carried by the line`, `calcite +${s.meta.carriedEver.length}%`]);
    shapes.hidden = rows.length === 0;
    const key = rows.map((r) => r.join(':')).join('|');
    if (key === shapesKey) return;
    shapesKey = key;
    shapesHead.textContent = `What shapes this reef · ${rows.length}`;
    shapesList.innerHTML = '';
    for (const [k, v] of rows) shapesList.append(el('dt', '', k), el('dd', '', v));
  }
  reefPage.append(
    nameRow,
    paletteBox,
    shapes,
    guide,
    group(UI.saves),
    el('p', 'hint', UI.autosave), backupNote, exportBtn, fileBtn, loadFileBtn, fileInput, importBtn,
    group(UI.sound), volRow, buzzToggle,
    group(UI.display), button('plain', UI.timelapse, () => hooks.timelapse()), glowToggle, sharpToggle, calmToggle, bigToggle, sciToggle, quietToggle, notifyToggle, habitToggle,
    el('p', 'hint', UI.keys),
    group(UI.startOver), resetBtn,
  );

  /** Nudge toward copying a save when the reef is worth keeping and no copy is recent. */
  function setBackupDue(due: boolean): void {
    reefDot.hidden = !due;
    backupNote.hidden = !due;
  }

  panel.append(stocks, stockNote, tabs, pages);
  host.append(panel);
  showTab('grow');

  // ---------- Reader ----------
  const reader = el('div', 'reader');
  reader.hidden = true;
  const readerCard = el('div', 'reader-card');
  const readerKicker = el('p', 'reader-depth');
  const readerTitle = el('h2');
  readerTitle.id = 'reader-title';
  const readerText = el('p', 'reader-text');
  reader.setAttribute('role', 'dialog');
  reader.setAttribute('aria-modal', 'true');
  reader.setAttribute('aria-labelledby', 'reader-title');
  const readerClose = button('plain', 'Continue', () => closeReader());
  readerCard.append(readerKicker, readerTitle, readerText, readerClose);
  reader.append(readerCard);
  host.append(reader);
  const queue: Story[] = [];
  let held = false;
  function openStory(st: Story): void {
    hooks.storyShown?.();
    readerKicker.textContent = st.kicker;
    readerTitle.textContent = st.title;
    readerText.textContent = st.text;
    reader.hidden = false;
    readerClose.focus({ preventScroll: true });
  }
  function showStory(st: Story): void {
    if (reader.hidden && away.hidden && !held) openStory(st);
    else queue.push(st);
  }
  function closeReader(): void {
    reader.hidden = true;
    const next = queue.shift();
    if (next) openStory(next);
  }
  reader.addEventListener('click', (e) => { if (e.target === reader) closeReader(); });

  // ---------- Away summary ----------
  const away = el('div', 'reader away');
  away.hidden = true;
  const awayCard = el('div', 'reader-card');
  const awayText = el('p', 'reader-text');
  const awayList = el('dl', 'codex-list away-list');
  const awayHint = el('p', 'hint');
  const awayClose = button('plain', UI.awayClose, () => {
    away.hidden = true;
    const next = queue.shift();
    if (next) openStory(next);
  });
  // A welcome-back gift after a long time away: two buttons, one to take.
  const welcomeBox = el('div', 'welcome');
  welcomeBox.hidden = true;
  awayCard.append(el('h2', '', UI.awayTitle), awayText, awayList, welcomeBox, awayHint, awayClose);
  away.append(awayCard);
  host.append(away);
  // Escape closes whichever card is open.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!reader.hidden) closeReader();
    else if (!away.hidden) awayClose.click();
  });

  function storyItem(depth: string, title: string, st: Story, cls = ''): HTMLLIElement {
    const li = el('li');
    const b = button(`band ${cls}`, '', () => openStory(st));
    b.append(el('span', 'band-depth', depth), el('span', 'band-title', title));
    li.append(b);
    return li;
  }
  function appendBand(b: Band): void {
    const li = storyItem(metres(b.metres), b.title, bandStory(b, lastState?.truce.wall === 'b'));
    li.dataset.band = b.id;
    bandList.prepend(li);
  }
  /** A choice made live goes on top; one from a loaded save sits just above the band that opened it. */
  function addChoice(li: HTMLLIElement, afterBand: string): void {
    const anchor = primed ? null : bandList.querySelector(`li[data-band="${afterBand}"]`);
    if (anchor) anchor.before(li);
    else bandList.prepend(li);
  }
  function relicStory(x: Site): Story {
    return { kicker: `${EXPEDITION.kicker} · ${x.name}`, title: x.relic, text: x.text };
  }
  function appendRelic(x: Site): void {
    bandList.prepend(storyItem('found', x.name, relicStory(x), 'is-relic'));
  }
  function appendReading(r: Reading): void {
    bandList.prepend(storyItem('read', r.title, readingStory(r), 'is-reading'));
  }

  let primed = false;
  /** The pinned upgrade ('' none) and its wait, for the tab title. */
  let pinned = '';
  let pinnedText = '';
  /** Show or hide a section; one appearing during play rises in with a brief glow. */
  function setShown(e: HTMLElement, show: boolean): void {
    if (show && e.hidden && primed) {
      e.classList.remove('fresh');
      void e.offsetWidth;
      e.classList.add('fresh');
    }
    e.hidden = !show;
  }
  let etaTurn = 0;
  let jobGains: { feed: number; light: number } | null = null;
  let raspBest = -1;
  let raspHold = -1;
  let tickZone = -1;
  // ---------- Choices waiting: a strip of chips at the top of the Grow tab ----------
  // When two or more choice cards are open, each gets a chip named by its kicker; a tap scrolls to it.
  const waitBar = el('div', 'wait-bar');
  waitBar.hidden = true;
  grow.prepend(waitBar);
  let waitKey = '';
  function renderWaitBar(): void {
    const open = [...grow.querySelectorAll<HTMLElement>(':scope > section:not([hidden])')]
      .map((sec) => ({ sec, label: sec.querySelector('.truce-kicker')?.textContent ?? '' }))
      .filter((x) => x.label);
    const key = open.map((x) => x.label).join('|');
    if (key === waitKey) return;
    waitKey = key;
    waitBar.hidden = open.length < 2;
    waitBar.innerHTML = '';
    for (const x of open) waitBar.append(button('wait-chip', x.label, () => x.sec.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  }

  return {
    setBackupDue,
    /** The pinned card's wait ('' if nothing is pinned). */
    pinnedText(): string {
      return pinned ? pinnedText : '';
    },
    /** Press signal lamp i (keys 7–0), when the signal card is up. */
    pressLamp(i: number): boolean {
      return choices.pressLamp(i);
    },
    update(s: GameState): void {
      const r = rates(s);
      // Countdown labels look ahead with the integrator; twice a second is plenty.
      // One countdown refreshes per frame, in turn, so no frame pays for all of them.
      etaTurn = (etaTurn + 1) % (UPGRADES.length + 1);
      let etaSlot = 0;
      calcite.value.textContent = num(s.calcite);
      calcite.sub.textContent = `${rate(calciteRate(s, r))} · holds ~${num(calciteHold(s, r))}`;
      calcite.row.classList.toggle('falling', calciteNet(s, r) < 0);
      glow.row.hidden = !(s.levels.symbiont > 0 || s.glow > 0.05);
      glow.value.textContent = num(s.glow);
      glow.sub.textContent = `${rate(glowNet(s, r))} · holds ~${num(glowHold(s, r))}`;
      plankton.row.hidden = !(s.jobs.feed > 0 || s.plankton > 0.05);
      plankton.value.textContent = num(s.plankton);
      plankton.sub.textContent = `${rate(planktonNet(s, r))} · ×${feeding(s.plankton).toFixed(2)} calcite`;
      // Murmurs pay for Readings and the truce's words; once both are done the stock leaves the panel.
      const murmursWanted = s.readings.length < READINGS.length || MEETINGS.some((m) => !s.truce[m.id]);
      murmurs.row.hidden = !(s.jobs.scout > 0 || (s.murmurs > 0.05 && murmursWanted));
      murmurs.value.textContent = num(s.murmurs);
      murmurs.sub.textContent = `${rate(murmurNet(s, r))} · holds ~${num(murmurHold(s, r))}`;
      silt.row.hidden = !(r.siltP > 0 || s.silt > 0.5);
      silt.value.textContent = num(s.silt);
      silt.sub.textContent = `${rate(siltNet(s, r))} · polyps ×${smother(s.silt).toFixed(2)}`;
      silt.row.classList.toggle('falling', smother(s.silt) < 0.5);
      sand.row.hidden = !(r.sandP > 0 || s.sand > 0.5);
      sand.value.textContent = num(s.sand);
      sand.sub.textContent = `${rate(sandNet(s, r))} · holds ~${num(sandHold(s, r))}`;
      bloom.row.hidden = !(r.bloomP > 0 || s.bloom > 0.5);
      bloom.value.textContent = num(s.bloom);
      bloom.sub.textContent = `${rate(bloomNet(s, r))} · ×${photo(s.bloom).toFixed(2)} calcite`;
      spawn.row.hidden = !(r.spawnP > 0 || s.spawn > 0.5);
      spawn.value.textContent = num(s.spawn);
      spawn.sub.textContent = `${rate(spawnNet(s, r))} · of ${num(spawnTarget(s))} · holds ~${num(spawnHold(s, r))}`;

      // Dialects.
      const tier = nextTier(s);
      dialectBox.hidden = !tier;
      if (tier) {
        dialectKicker.textContent = `A dialect: ${tier.title}`;
        dialectIntro.textContent = tier.intro;
        const tc = tierCost(s, tier);
        const ok = s.bloom >= tc;
        dialectCost.textContent = ok
          ? `Costs ${num(tc)} bloom. Choosing is permanent.`
          : `Costs ${num(tc)} bloom · ${num(s.bloom)} gathered · ${etaText(timeUntil(s, 'bloom', tc))}`;
        for (const d of DIALECTS) {
          const b = dialectButtons.get(d.id)!;
          b.hidden = d.tier !== tier.tier;
          b.disabled = !ok;
        }
      }

      // The truce.
      lastState = s;
      const m = nextMeeting(s);
      truceBox.hidden = !m;
      if (m) {
        truceTitle.textContent = m.title;
        truceText.textContent = m.text;
        const words = meetingWords(s, m);
        const learned = Math.min(1, s.murmurs / words);
        truceWordsFill.style.width = `${learned * 100}%`;
        const ready = learned >= 1;
        truceWordsLabel.textContent = ready
          ? UI.wordsReady
          : `Words learned: ${num(s.murmurs)} / ${num(words)} murmurs${s.jobs.scout ? ` · ${etaText(timeUntil(s, 'murmurs', words))}` : ' — set shoals to scout'}`;
        for (const c of ['a', 'b'] as const) {
          const cb = choiceButtons[c === 'a' ? 0 : 1]!;
          cb.label.textContent = m[c].label;
          cb.effect.textContent = m[c].effect;
          cb.b.disabled = !ready;
        }
      }

      // The Rasp dial.
      const rmax = raspMax(s);
      raspBox.hidden = rmax === 0 && s.levels.grounds === 0;
      if (!raspBox.hidden) {
        raspSlider.max = String(rmax);
        if (document.activeElement !== raspSlider) raspSlider.value = String(s.rasp);
        raspCount.textContent = `${s.rasp} of ${rmax} grazing`;
        raspMinus.disabled = s.rasp <= 0;
        raspPlus.disabled = s.rasp >= rmax;
        const eats = speaks(s, 'mucus') ? 0 : ACT3.raspEat * s.rasp * s.calcite * (s.truce.terms === 'b' ? ACT3.politeEat : 1);
        if (etaTurn === 0 || raspBest < 0) {
          const best = raspSettings(s);
          raspBest = best.forIncome;
          raspHold = best.forHold;
        }
        // Two good settings: most income while you watch, most held for while you are away.
        const mark = (n: number) => `${n}${n === s.rasp ? ' ✓' : ''}`;
        const bestNote = raspBest === raspHold
          ? `Best setting: ${mark(raspBest)}`
          : `Best for income: ${mark(raspBest)} · best before going away: ${mark(raspHold)}`;
        currentRow.hidden = actAt(s.height) < 3;
        for (const x of currentButtons) x.b.classList.toggle('on', x.c === s.current);
        // An upwelling waiting to be caught takes over the line under the dial.
        const up = currentUpwelling(s);
        currentWhat.textContent = up && s.upwelled !== up.k ? UPWELL.now(up.side, duration(up.start + UPWELL.life - s.t)) : CURRENT.what(s.current);
        currentRow.classList.toggle('upwelling', !!up && s.upwelled !== up.k);
        favourRow.hidden = !favourOpen(s);
        for (const x of favourButtons) {
          const done = favourMaxed(s, x.f.id);
          const c = favourCost(s, x.f.id);
          x.price.textContent = done ? FAVOUR_TEXT.done : `${num(c)} sand`;
          x.b.disabled = done || s.sand < c;
        }
        raspWhat.textContent = s.rasp === 0
          ? `No Rasp graze; the silt settles where it falls. ${bestNote}`
          : `${rate(r.sandP)} sand${eats > 0 ? ` · eat ${rate(eats).slice(1)} calcite` : ''} · holds ~${num(calciteHold(s, r))}\n${bestNote}`;
      }

      // Height: progress within the current act's zone, with depth.
      const zone = act(actAt(s.height));
      heightLabel.textContent = zone.name;
      heightValue.textContent = metres(s.height);
      const span = zone.to - zone.from;
      const frac = (x: number) => Math.max(0, Math.min(100, ((x - zone.from) / span) * 100));
      heightFill.style.width = `${frac(s.height)}%`;
      // Story bands in this zone, as ticks on the bar: bright once laid.
      if (tickZone !== zone.from) {
        tickZone = zone.from;
        for (const tk of heightBar.querySelectorAll('.tick')) tk.remove();
        for (const b of BANDS) {
          if (b.metres <= zone.from || b.metres > zone.to) continue;
          const tk = el('i', 'tick');
          tk.style.left = `${frac(b.metres)}%`;
          tk.dataset.band = b.id;
          tk.title = `${metres(b.metres)}: ${b.title}`;
          heightBar.append(tk);
        }
      }
      for (const tk of heightBar.querySelectorAll<HTMLElement>('.tick')) tk.classList.toggle('passed', s.bands.includes(tk.dataset.band!));
      heightTarget.style.width = `${frac(r.heightTarget)}%`;
      const depth = `${Math.round(Math.max(0, SURFACE - s.height)).toLocaleString('en-US')} m down`;
      const next = BANDS.find((b) => !s.bands.includes(b.id));
      const reachText = s.height > 60 ? ` · reach ×${reach(s.height).toFixed(1)}` : '';
      heightSub.textContent = r.heightTarget > s.height + 0.05
        ? `${depth} · rising to ${metres(r.heightTarget)}`
        : next ? `${depth} · next band at ${metres(next.metres)}${reachText}` : `${depth}${reachText}`;

      // Shoals.
      const shoals = s.levels.shoal;
      setShown(shoalBox, shoals > 0);
      if (shoals > 0) {
        const idle = idleShoals(s);
        const gone = awayShoals(s);
        const sea = seasoned(s);
        shoalIdle.textContent = (sea > 1 ? `${EXPEDITION.seasonedWord} ×${sea.toFixed(2)} · ` : '') + (idle > 0 ? `${idle} idle · ` : '') + (gone > 0 ? `${gone} away · ` : '') + (idle > 0 || gone > 0 ? `of ${shoals}` : `${shoals}`);
        shoalBox.classList.toggle('has-idle', idle > 0);
        const perFeed = s.jobs.feed > 0 ? r.planktonP / s.jobs.feed : 0;
        const perLight = s.jobs.light > 0
          ? (r.glowP - ACT1.symbiontGlow * s.levels.symbiont * milestoneMult('symbiont', s.levels.symbiont)) / s.jobs.light : 0;
        // What one more feeder or light-swimmer is worth in calcite, refreshed a few times a second.
        if (etaTurn === 0 || !jobGains) jobGains = { feed: jobGain(s, 'feed'), light: jobGain(s, 'light') };
        const gainText = (g: number) => g >= 0.0005 ? ` · one more: +${(g * 100).toFixed(g < 0.1 ? 1 : 0)}% calcite` : ' · one more: no gain now';
        for (const j of JOBS) {
          const row = jobRows.get(j.id)!;
          const open = jobOpen(s, j.id);
          row.row.classList.toggle('locked', !open);
          // Fanning only exists on the shelf: no locked row before then.
          row.row.hidden = (j.id === 'fan' || j.id === 'guard') && !open;
          row.count.textContent = String(s.jobs[j.id]);
          row.minus.disabled = s.jobs[j.id] <= 0;
          row.plus.disabled = !open || idle <= 0;
          const perScout = s.jobs.scout > 0 ? r.murmurP / s.jobs.scout : 0;
          row.row.title = j.verb;
          row.what.textContent = !open ? (j.id === 'fan' ? FAN.locked : 'they do not yet know how to listen')
            : j.id === 'fan' ? FAN.what(FAN.sweep.toFixed(3))
            : j.id === 'guard' ? GUARD.what(s.jobs.guard, GUARD.need)
            : j.id === 'feed' ? (perFeed ? `${rate(perFeed)} plankton each` : 'herd plankton to the polyps') + gainText(jobGains.feed)
            : j.id === 'light' ? (perLight ? `${rate(perLight)} glow each` : 'swim the glow pattern') + gainText(jobGains.light)
            : perScout ? `${rate(perScout)} murmurs each` : 'listen at buried bands';
        }
      }

      // The water: what it lowers now, when it turns, and what comes next.
      const water = waterAt(s);
      // Always shown (still water at first), so its line never pushes the cards down mid-press.
      waterBox.hidden = false;
      {
        const k = Math.floor(s.t / WATER.period);
        const next = waterAt(s, k + 1);
        waterBox.dataset.water = water.id;
        waterName.textContent = water.name;
        // Water-wise deepens every discount by 0.1: say the real factor.
        const ww = s.meta.traits['water-wise'] ? 0.1 : 0;
        waterLine.textContent = water.factor < 1 ? water.line.replace(/×0\.\d/, `×${(water.factor - ww).toFixed(1)}`) : water.line;
        const after = waterAt(s, k + 2);
        // The next two slots: "then the same, then carrying".
        const say = (w: typeof water, prev: typeof water) => w.id === prev.id ? WATER.same : w.name.toLowerCase().replace(/ water$/, '');
        const turning = s.bands.includes(WATER.band);
        waterNext.textContent = turning ? `${WATER.turns} ${duration(untilWaterTurns(s))} · ${WATER.next} ${say(next, water)}, ${WATER.next} ${say(after, next)}` : '';
        if (!turning) waterLine.textContent = WATER.notYet;
        // What comes soon, for planning: the next feast, intruder and full moon (within twenty minutes).
        const soon: [number, string][] = [];
        const fe = untilFeast(s), th = untilThorn(s), kind = intruderOf(actAt(s.height));
        if (fe < 1200) soon.push([fe, WATER.feast]);
        const fl = untilFlurry(s);
        if (fl < 1200) soon.push([fl, FLURRY.word + ' (sweeps ×3)']);
        const mk = untilMilky(s);
        if (mk < 1200) soon.push([mk, MILKY.word]);
        if (th < 1200 && kind) soon.push([th, WATER.intruder[kind]!]);
        const day = DAYS.find((d) => d.id === s.meta.today);
        const vis = visitor(s);
        const visName = vis ? CREATURES.find((c) => c.id === vis)?.name.toLowerCase() : '';
        todayLine.textContent = [day ? `${TODAY.label}: ${day.name.toLowerCase()} · ${day.effect}` : '',
          visName ? `${TODAY.visitor}: ${visName} (${visited(s) ? TODAY.visited : TODAY.visitorGift})` : ''].filter(Boolean).join(' · ');
        const usw = untilSwell(s);
        if (usw < 1200) soon.push([usw, SWELL.word]);
        const ur = untilRising(s);
        if (ur > 0 && ur < 1200) soon.push([ur, RISING.word]);
        setShown(riseRow, ur === 0 && (canFeedRising(s) || s.rose === Math.floor(s.t / HEAT.period)));
        if (!riseRow.hidden) {
          const go = canFeedRising(s);
          riseText.textContent = RISING.now(duration(risingLeft(s)));
          riseButton.hidden = !go;
          riseWhat.textContent = go ? `${RISING.share(s.jobs.feed, s.levels.shoal)} · +${num(risingHaul(s))} calcite` : RISING.sent;
        }
        const uh = untilHeat(s);
        if (uh > 0 && uh < 1200) soon.push([uh, HEAT.word]);
        heatRow.hidden = !Number.isFinite(uh);
        if (Number.isFinite(uh)) {
          heatClosed = s.closed;
          heatRow.classList.toggle('warm', uh === 0);
          heatRow.classList.toggle('closed', s.closed);
          heatText.textContent = uh === 0 ? HEAT.now(duration(heatLeft(s))) : HEAT.next(duration(uh));
          heatButton.textContent = s.closed ? HEAT.closed : HEAT.open;
          heatWhat.textContent = s.closed ? HEAT.closedWhat : closedNow(s) ? HEAT.shy : HEAT.openWhat;
        }
        if (s.height >= 1) soon.push([moonFull(s.t) ? 0 : untilFullMoon(s.t), WATER.moon]);
        soon.sort((a, b) => a[0] - b[0]);
        // Redrawn when the marks move by a whole percent of the strip.
        const marks = soon.filter(([t]) => t < 1200);
        // The water's turns too, when it changes to something else.
        if (turning) {
          const ut = untilWaterTurns(s);
          if (next.id !== water.id && ut < 1200) marks.push([ut, next.name.toLowerCase()]);
          if (after.id !== next.id && ut + WATER.period < 1200) marks.push([ut + WATER.period, after.name.toLowerCase()]);
          marks.sort((a, b) => a[0] - b[0]);
        }
        const key = marks.map(([t, w]) => `${Math.round(t / 12)}${w}`).join('|');
        if (key !== almanacKey) {
          almanacKey = key;
          almanac.innerHTML = '';
          almanac.hidden = marks.length === 0;
          // Each label goes in the first of three rows where it does not run into the last one there.
          const W = almanac.clientWidth || 300;
          const rowEnd = [-1e9, -1e9, -1e9];
          marks.forEach(([t, w]) => {
            const label = w.replace(/^(a|an|the) /, '').split(' (')[0]!;
            const f0 = Math.max(0, t) / 1200, cx = f0 * W, wide = label.length * 5.8 + 8;
            // Where the label really sits: anchored at the ends, centred elsewhere.
            const left = f0 < 0.08 ? cx - 4 : f0 > 0.92 ? cx + 4 - wide : cx - wide / 2;
            // No room in any row: the mark keeps its dot and tooltip, without a label.
            const row = rowEnd.findIndex((end) => left > end);
            if (row >= 0) rowEnd[row] = left + wide;
            const m = el('span', `mark row${row}${t <= 0 ? ' now' : ''}`);
            m.style.left = `${(Math.max(0, t) / 1200) * 100}%`;
            // Labels at the ends keep inside the card.
            const f = Math.max(0, t) / 1200;
            m.style.transform = f < 0.08 ? 'translateX(-4px)' : f > 0.92 ? 'translateX(calc(-100% + 4px))' : '';
            m.title = `${w} ${t > 0 ? `in ${duration(t)}` : WATER.now}`;
            m.append(el('i'));
            if (row >= 0) m.append(el('b', '', label));
            almanac.append(m);
          });
        }
        waterSoon.textContent = soon.length ? `${WATER.soon}: ${soon.map(([t, w]) => `${w} ${t > 0 ? `in ${duration(t)}` : WATER.now}`).join(' · ')}` : '';
        if (waterShown && waterShown !== water.id) { waterBox.classList.remove('turned'); void waterBox.offsetWidth; waterBox.classList.add('turned'); }
        waterShown = water.id;
      }

      // Ossel's request.
      const rq = currentRequest(s);
      // Its slot is kept from the start for the same reason; empty until the first request.
      askBox.hidden = false;
      askBox.classList.toggle('waiting', !rq);
      if (rq) {
        askText.textContent = rq.n === 1 && rq.def.one ? rq.def.one : rq.def.ask.replace('{n}', String(rq.n));
        askFill.style.width = `${(rq.got / rq.n) * 100}%`;
        askCount.textContent = `${rq.got}/${rq.n}`;
        // One-step asks need no bar; a streak goes up with the kicker, out of the text's way.
        askBar.hidden = rq.n === 1;
        askKicker.textContent = s.request.streak > 1 ? `${REQUEST.kicker} · ${s.request.streak} ${REQUEST.streakWord}` : REQUEST.kicker;
        askSkip.disabled = !canSkipRequest(s);
      }

      choices.update(s);
      renderWaitBar();

      // A moment waiting for an answer, and answers given.
      const mo = nextMoment(s);
      if (mo !== momentNow) {
        momentNow = mo;
        setShown(momentBox, !!mo);
        if (mo) {
          momentTitle.textContent = mo.title;
          momentText.textContent = mo.text;
          for (const x of momentButtons) {
            x.label.textContent = mo[x.c].label;
            x.effect.textContent = mo[x.c].effect;
            // A way an earlier reef of the line already went.
            x.before.hidden = !s.meta.seen.includes(`m:${mo.id}:${x.c}`);
          }
        }
      }
      for (const m of MOMENTS) {
        const c = s.moments[m.id];
        if (!c || momentSeen.has(m.id)) continue;
        momentSeen.add(m.id);
        const st = { kicker: `${MOMENT.kicker}: ${m.title}`, title: m[c].label, text: m[c].text };
        bandList.prepend(storyItem('moment', m.title, st, 'is-moment'));
        storyCount++;
        if (primed) showStory(st);
      }

      prepRow.hidden = !(raspMax(s) > 0 || s.levels.shoal > 0 || s.meta.dreams > 0 || s.height >= FLARE.fromHeight);
      flareBtn.hidden = s.height < FLARE.fromHeight || ended(s);
      flareBtn.disabled = !canFlare(s);
      flareBtn.textContent = canFlare(s) ? FLARE.label : `${FLARE.label} ${Math.ceil(FLARE.cooldown - (s.t - s.lastFlare))}s`;
      prepBtn.hidden = !(raspMax(s) > 0 || s.levels.shoal > 0);
      dreamBtn.hidden = s.meta.dreams <= 0 || ended(s);
      dreamBtn.textContent = DREAM.label(s.meta.dreams);

      // Residents: who may move in, and who has.
      const nHomes = homes(s);
      setShown(homeBox, nHomes > 0);
      if (nHomes > 0) {
        const asking = residentsAsking(s);
        homeCount.textContent = `${s.residents.length} of ${nHomes} home${nHomes === 1 ? '' : 's'}`;
        // Pairings: the ones living now, else a hint at those within reach.
        const live = PAIRS.filter((p) => s.residents.includes(p.a) && s.residents.includes(p.b));
        pairLine.textContent = live.length ? live.map((p) => `${p.name}: ${p.effect}`).join(' · ') : nHomes >= 2 ? RESIDENT.pairHint : '';
        for (const r of RESIDENTS) {
          const h = homeRows.get(r.id)!;
          h.row.hidden = !asking.includes(r);
          const living = s.residents.includes(r.id);
          h.row.classList.toggle('living', living);
          h.btn.textContent = living ? RESIDENT.release : s.residents.length >= nHomes ? RESIDENT.full : RESIDENT.take;
          h.btn.disabled = !living && s.residents.length >= nHomes;
        }
      }

      // Expeditions: the next ruin, or the shoals away at one.
      const away = tripSite(s);
      const ahead = away ?? nextSite(s);
      setShown(tripCard, !!ahead);
      if (ahead) {
        tripTitle.textContent = ahead.name;
        tripHint.textContent = ahead.hint;
        tripBar.hidden = !away;
        if (away) {
          const left = Math.max(0, s.expedition.back - s.t);
          (tripBar.firstChild as HTMLElement).style.width = `${(1 - left / tripSeconds(s, away)) * 100}%`;
          tripEffect.textContent = away.relic
            ? `${away.shoals} shoals ${EXPEDITION.away} · bringing ${away.relic.toLowerCase()} (${away.effect})`
            : `${away.shoals} shoals ${EXPEDITION.away} · ${away.effect}`;
          // While away: they can be called home early, for glow.
          const cc = callHomeCost(s);
          tripCost.textContent = `↩ ${num(cc)} glow`;
          tripBtn.title = EXPEDITION.call;
          tripBtn.disabled = s.glow < cc;
          tripEta.textContent = `back in ${duration(left)}`;
          tripCard.classList.remove('ready');
        } else {
          tripEffect.textContent = ahead.relic ? `${duration(tripSeconds(s, ahead))} away · a relic: ${ahead.effect}` : `${duration(tripSeconds(s, ahead))} away · ${ahead.effect}`;
          tripCost.textContent = `${ahead.shoals} shoals`;
          const ok = canSend(s);
          tripBtn.disabled = !ok;
          tripCard.classList.toggle('ready', ok);
          tripEta.textContent = ok ? 'they stop their work while away' : `you have ${s.levels.shoal}`;
        }
      }

      // The garden, once the spawn is released.
      setShown(gardenCard, ended(s));
      if (ended(s)) {
        gardenLevel.textContent = `${s.garden}/${GARDEN.max}`;
        const full = s.garden >= GARDEN.max;
        gardenCost.textContent = full ? 'Complete' : `${num(plantCost(s))} calcite`;
        for (const b of gardenBtns) b.disabled = full || s.calcite < plantCost(s);
      }

      // Great works.
      for (const x of workCards) {
        const open = workOpen(s, x.w.id);
        setShown(x.root, open);
        if (!open) continue;
        const n = s.works[x.w.id];
        x.level.textContent = `${WORK_TEXT.stage} ${Math.min(n + 1, x.w.stages.length)}/${x.w.stages.length}`;
        x.pips.forEach((p, i) => p.classList.toggle('built', i < n));
        const c = workCost(s, x.w.id);
        if (!c) {
          x.costEl.textContent = WORK_TEXT.built;
          x.btn.disabled = true;
          x.eta.textContent = '';
          x.root.classList.add('maxed');
          // Built in full: to the end of the list, one line, like a finished upgrade.
          if (!x.root.classList.contains('done')) {
            x.root.classList.add('done');
            grow.append(x.root);
          }
          continue;
        }
        const parts = Object.entries(c) as [Currency, number][];
        x.costEl.textContent = parts.map(([k, v]) => `${num(v)} ${k}`).join(' + ');
        const ok = canBuild(s, x.w.id);
        x.btn.disabled = !ok;
        x.root.classList.toggle('ready', ok);
        if (ok) setEta(x.eta, 0);
        else if (etaTurn === 0 || !x.eta.textContent) setEta(x.eta, Math.max(...parts.map(([k, v]) => timeUntil(s, k, v))));
      }

      // The best buy: the calcite upgrade that pays back soonest (once per round of eta updates).
      if (etaTurn === 0) {
        let best: UpgradeId | null = null, bestBack = Infinity;
        const base = steadyCalciteRate(s);
        for (const u of UPGRADES) {
          if (u.currency !== 'calcite' || u.id === 'lattice' || !revealed(s, u.id) || maxed(s, u.id) || !(base > 0)) continue;
          const g = upgradeGain(s, u.id);
          const back = g >= 0.0005 ? cost(s, u.id) / (g * base) : Infinity;
          if (back < bestBack) { bestBack = back; best = u.id; }
        }
        for (const [id, c] of cards) c.root.classList.toggle('best', id === best);
      }

      // Upgrade cards.
      for (const u of UPGRADES) {
        const c = cards.get(u.id)!;
        const show = revealed(s, u.id);
        if (show && c.root.hidden && primed) c.root.classList.add('new');
        c.root.hidden = !show;
        if (!show) continue;
        const lv = s.levels[u.id];
        c.level.textContent = u.maxLevel === Infinity ? (lv ? `×${lv}` : '') : `${lv}/${u.maxLevel}`;
        if (u.id === 'skeleton') c.effect.textContent = `the reef rises ${metres(bandMetres(lv))}`;
        // What one more would really add, after every multiplier (refreshed on the card's turn).
        if ((u.id === 'polyp' || u.id === 'symbiont') && (etaSlot === etaTurn || !c.effect.dataset.live)) {
          c.effect.textContent = marginalText(s, u.id);
          const bar = milestoneBars.get(u.id);
          if (bar) {
            const lv = s.levels[u.id];
            const next = nextMilestone(u.id, lv);
            const prev = [...MILESTONES[u.id]].reverse().find((m) => m.level <= lv)?.level ?? 0;
            bar.hidden = !next;
            if (next) (bar.firstChild as HTMLElement).style.width = `${((lv - prev) / (next.level - prev)) * 100}%`;
          }
          c.effect.dataset.live = '1';
        }
        // For multipliers: what the next level is worth to this reef now, once things settle.
        if (GAIN_SHOWN.has(u.id) && (etaSlot === etaTurn || !c.effect.dataset.live) && !maxed(s, u.id)) {
          const g = upgradeGain(s, u.id);
          const pct = g >= 0.0005 ? `+${(g * 100).toFixed(g < 0.1 ? 1 : 0)}%` : 'no gain';
          c.effect.textContent = `${effectText(u.id)} · now ${pct}${u.id === 'lattice' ? ' held' : g >= 0.0005 ? ' calcite' : ''}`;
          c.effect.dataset.live = '1';
        }
        if (maxed(s, u.id)) {
          // A band held by a story gate says which one, beside a short button.
          const gate = u.id === 'skeleton' ? capReason(s) : null;
          // Held, not finished: a daughter colony waits for the next to settle, the shoals for a lonely seamount's cap.
          const waiting = (u.id === 'daughter' || u.id === 'shoal') && s.levels[u.id] < u.maxLevel;
          c.cost.textContent = waiting ? 'Held' : gate === null ? 'Complete' : gate === 'surface' ? GATE_TEXT.surface : 'Held';
          c.btn.disabled = true;
          c.eta.textContent = waiting ? (u.id === 'daughter' ? GATE_TEXT.daughter : GATE_TEXT.lonely) : gate && gate !== 'surface' ? GATE_TEXT[gate] : '';
          c.root.classList.add('maxed');
          // Finished for good (not just held back by a story gate): to the end of the list, one line.
          if (u.id !== 'skeleton' && !waiting && !c.root.classList.contains('done')) {
            c.root.classList.add('done');
            grow.append(c.root);
          }
          continue;
        }
        c.root.classList.remove('maxed');
        const price = cost(s, u.id);
        c.root.classList.toggle('watered', water.upgrades.includes(u.id));
        const cur = upgrade(u.id).currency;
        c.cost.textContent = `${num(price)} ${cur}`;
        const ok = canAfford(s, u.id);
        c.btn.disabled = !ok;
        if (c.max) c.max.hidden = !ok;
        c.root.classList.toggle('ready', ok);
        const due = etaSlot++ === etaTurn || !c.eta.textContent;
        if (ok) {
          // Affordable and paid in calcite: how long it takes to earn back its price, once settled.
          if (due && cur === 'calcite' && u.id !== 'lattice') {
            const g = upgradeGain(s, u.id);
            const back = g >= 0.0005 ? price / (g * steadyCalciteRate(s)) : Infinity;
            c.eta.textContent = Number.isFinite(back) ? `pays back in ${duration(back)}` : '';
          } else if (cur !== 'calcite' || u.id === 'lattice') setEta(c.eta, 0);
        } else if (due) setEta(c.eta, timeUntil(s, cur, price));
        if (u.id === pinned) pinnedText = ok ? `${u.name} ready` : `${u.name} ${c.eta.textContent}`;
      }

      // Readings.
      currentReading = nextReading(s);
      readingCard.hidden = !readingsRevealed(s) || !currentReading;
      if (currentReading && !readingCard.hidden) {
        readingTitle.textContent = currentReading.title;
        readingEffect.textContent = currentReading.effect;
        const rc = readingCost(s, currentReading);
        readingCostEl.textContent = `${num(rc)} murmurs`;
        const ok = s.murmurs >= rc;
        readingBtn.disabled = !ok;
        readingCard.classList.toggle('ready', ok);
        if (ok) setEta(readingEta, 0);
        else if (etaTurn === UPGRADES.length || !readingEta.textContent) setEta(readingEta, timeUntil(s, 'murmurs', rc));
        if (!ok && s.jobs.scout === 0) readingEta.textContent = 'set shoals to scout';
      }

      // New bands and readings open in the reader and join the list.
      if (s.bands.length !== lastBandCount) {
        for (const id of s.bands.slice(lastBandCount)) {
          const b = BANDS.find((x) => x.id === id);
          if (!b) continue;
          appendBand(b);
          storyCount++;
          if ((lastBandCount > 0 || id === 'wake') && !s.meta.seen.includes(id)) showStory(bandStory(b, s.truce.wall === 'b'));
        }
        lastBandCount = s.bands.length;
      }
      if (s.readings.length !== lastReadingCount) {
        for (const id of s.readings.slice(lastReadingCount)) {
          const rd = READINGS.find((x) => x.id === id);
          if (!rd) continue;
          appendReading(rd);
          storyCount++;
          if (!s.meta.seen.includes(id)) showStory(readingStory(rd));
        }
        lastReadingCount = s.readings.length;
      }
      if (s.relics.length !== lastRelicCount) {
        for (const id of s.relics.slice(lastRelicCount)) {
          const x = site(id);
          if (!x) continue;
          appendRelic(x);
          storyCount++;
          if (primed && !s.meta.seen.includes(`x:${id}`)) showStory(relicStory(x));
        }
        lastRelicCount = s.relics.length;
      }
      for (const mt of MEETINGS) {
        const c = s.truce[mt.id];
        if (!c || truceSeen.has(mt.id)) continue;
        truceSeen.add(mt.id);
        addChoice(storyItem('truce', mt.title, truceStory(mt, c), 'is-truce'), mt.after);
        storyCount++;
        if (primed) showStory(truceStory(mt, c));
      }
      for (const t of TIERS) {
        const id = s.dialects[t.tier];
        if (!id || dialectSeen.has(id)) continue;
        dialectSeen.add(id);
        const d = DIALECTS.find((x) => x.id === id)!;
        const st = { kicker: `A dialect: ${t.title}`, title: d.name, text: `${d.flavour} You will not be the others.` };
        addChoice(storyItem('dialect', d.name, st, 'is-dialect'), t.band);
        storyCount++;
        if (primed) showStory(st);
      }
      // Lineage.
      const lineageOpen = canSpawnLesser(s) || s.meta.spawnings > 0 || s.meta.lineage > 0;
      tabButtons.get('lineage')!.hidden = !lineageOpen;
      if (lineageOpen) {
        lineageCount.textContent = String(s.meta.lineage);
        // Hard seamounts once the line has spawned; a trial met is marked.
        SEAMOUNTS.forEach((m, i) => {
          const b = whereButtons[i]!;
          if (!m.trial) return;
          b.hidden = s.meta.spawnings < TRIALS_FROM;
          b.classList.toggle('met', s.meta.seen.includes(`trial:${m.id}`));
        });
        // The line's title: the memory its endings carried most.
        const counts = new Map<string, number>();
        for (const line of s.meta.chronicle) for (const id of (line.split('|')[1] ?? '').split(',')) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
        const top = [...counts].sort((a, b) => b[1] - a[1])[0];
        const title = top ? LINE_TITLES[top[0] as MemoryId] : undefined;
        lineageSub.textContent = (title ? `${title} · ` : '') + `${s.meta.spawnings} spawning${s.meta.spawnings === 1 ? '' : 's'} · best reef ${metres(Math.max(s.meta.best, s.height))}` +
          (s.seamount !== 'plain' ? ` · this reef: ${seamountDef(s.seamount).name.toLowerCase()}` : '');
        const can = canSpawnLesser(s);
        spawnTitle.textContent = ended(s) ? UI.beginAgain : UI.lesserTitle;
        spawnBtn.disabled = !can;
        spawnBtn.textContent = can ? `+${lineageFor(s)} lineage` : UI.midnightFirst;
        // What that lineage would buy in the next run, cheapest first.
        const buys = can ? affordableTraits(s, s.meta.lineage + lineageFor(s)) : [];
        spawnBuys.textContent = buys.length ? `Enough for: ${buys.join(', ')}` : '';
        spawnBuys.hidden = !buys.length;
        for (const tr of TRAITS) {
          const c = traitCards.get(tr.id)!;
          const lv = s.meta.traits[tr.id];
          forgetButtons.get(tr.id)!.hidden = lv === 0;
          c.root.classList.toggle('maxed', traitMaxed(s, tr.id));
          c.level.textContent = tr.max === Infinity ? (lv ? `×${lv}` : '') : `${lv}/${tr.max}`;
          if (traitMaxed(s, tr.id)) {
            c.cost.textContent = 'Complete';
            c.btn.disabled = true;
            c.root.classList.add('maxed');
            continue;
          }
          const price = traitCost(s, tr.id);
          c.cost.textContent = `${price} lineage`;
          c.btn.disabled = s.meta.lineage < price;
          c.root.classList.toggle('ready', s.meta.lineage >= price);
        }
      }
      renderCodex(s);
      renderJournal(s);
      renderChart(s);
      renderTablet(s);
      renderDiary(s);
      renderMoments(s);
      renderShapes(s);
      renderShelf(s);
      renderChronicle(s);
      renderHeirs(s);
      renderCity(s);
      renderFeats(s);
      renderLine(s);
      habitToggle.hidden = !s.meta.traits['old-habits'] && !s.meta.traits['shoal-sense'] && !s.meta.traits['rasp-sense'] && !s.meta.traits.layering;
      const hidden = UPGRADES.find((u) => !revealed(s, u.id));
      comingUp.textContent = hidden ? `Coming up: ${hidden.name} — ${revealText(s, hidden)}` : '';
      comingUp.hidden = !hidden;
      if (comingUp !== grow.lastElementChild) grow.append(comingUp);
      if (document.activeElement !== nameInput && nameInput.value !== s.meta.name) nameInput.value = s.meta.name;
      const coloured = s.levels.pigment > 0 || s.meta.best >= 3800 || s.meta.palette !== '';
      paletteBox.hidden = !coloured;
      paletteRow.hidden = !coloured;
      for (const x of swatches) {
        x.b.classList.toggle('on', x.p.id === s.meta.palette);
        // Some colours are earned by a feat.
        const locked = !!x.p.feat && !s.meta.seen.includes(`f:${x.p.feat}`);
        x.b.disabled = locked;
        x.b.classList.toggle('locked', locked);
        x.b.title = locked ? `${x.p.name} · ${PALETTE_TEXT.locked} “${FEATS.find((f) => f.id === x.p.feat)?.name ?? ''}”` : x.p.name;
      }
      bandsDot.hidden = seenStories >= storyCount;
      primed = true;
    },
    /** Show the offline summary; any bands read while away are queued behind it. */
    showAway(seconds: number, gained: { calcite: number; glow: number; metres: number; full: boolean; bands: string[]; fullAfter: number | null;
      relics?: string[]; roams?: number; shards?: number; heat?: string; risings?: string; old?: string }, gifts?: { label: string; note: string; take: () => string }[]): void {
      // A headline, then what changed as labelled rows (like the Your reef card).
      awayText.textContent = `You were gone ${duration(seconds)}. The reef kept growing.`;
      awayList.innerHTML = '';
      const row = (term: string, value: string) => awayList.append(el('dt', '', term), el('dd', '', value));
      row('Calcite', `+${num(gained.calcite)}`);
      if (gained.glow > 0.5) row('Glow', `+${num(gained.glow)}`);
      if (gained.metres > 0.05) row('Rose', metres(gained.metres));
      const titles = gained.bands.map((id) => BANDS.find((b) => b.id === id)?.title).filter((x): x is string => !!x);
      if (titles.length) row(titles.length === 1 ? UI.newBand : UI.newBands, titles.map((t) => `“${t}”`).join(', '));
      if (gained.relics?.length) row(UI.shoalsBrought, gained.relics.join(', ').toLowerCase());
      if (gained.roams) row('Roamed', gained.roams === 1 ? 'the shoals came home from the dark' : `${gained.roams} times`);
      if (gained.shards) row('Shards', `${gained.shards} found`);
      if (gained.heat) row(AWAY_CYCLES.heat, gained.heat);
      if (gained.risings) row(AWAY_CYCLES.rising, gained.risings);
      if (gained.old) row(AWAY_CYCLES.old, gained.old);
      if (gained.full) {
        row('Full', `the stores filled${gained.fullAfter !== null && gained.fullAfter > 60 ? ` after ${duration(gained.fullAfter)}` : ''}; the rest dissolved back into the sea`);
        awayHint.textContent = 'A denser lattice holds more while you are away.';
      } else awayHint.textContent = '';
      welcomeBox.innerHTML = '';
      welcomeBox.hidden = !gifts?.length;
      if (gifts?.length) {
        welcomeBox.append(el('p', 'welcome-head', WELCOME.head));
        const buttons = gifts.map((g) => {
          const b = button('choice welcome-gift', '', () => {
            const said = g.take();
            for (const x of buttons) x.disabled = true;
            b.classList.add('taken');
            b.lastChild!.textContent = `${WELCOME.took} · ${said}`;
          });
          b.append(el('strong', '', g.label), el('span', '', g.note));
          welcomeBox.append(b);
          return b;
        });
      }
      away.hidden = false;
    },
    /** List the bands and readings of a loaded save without opening the reader for each. */
    primeStories(s: GameState): void {
      // Newest first: readings (mostly older) go in before the bands so the bands land on top.
      for (const id of s.readings) {
        const rd = READINGS.find((x) => x.id === id);
        if (rd) appendReading(rd);
      }
      for (const id of s.bands) {
        const b = BANDS.find((x) => x.id === id);
        if (b) appendBand(b);
      }
      lastBandCount = s.bands.length;
      lastReadingCount = s.readings.length;
      storyCount = seenStories = lastBandCount + lastReadingCount;
    },
    /** Keep stories queued for a while (a new reef shows the open water before the first one). */
    holdStories(ms: number): void {
      held = true;
      setTimeout(() => {
        held = false;
        const next = reader.hidden && away.hidden ? queue.shift() : undefined;
        if (next) openStory(next);
      }, ms);
    },
    /** Open a story card (or queue it behind the one showing). */
    story(kicker: string, title: string, text: string): void {
      showStory({ kicker, title, text });
    },
    /** A story kept in the Bands list too (Ossel's mistakes); `open` shows it now. */
    keepStory(depth: string, kicker: string, title: string, text: string, open: boolean): void {
      const st = { kicker, title, text };
      bandList.prepend(storyItem(depth, title, st, 'is-moment'));
      if (open) showStory(st);
    },
    /** Switch to the n-th visible tab (1-based); false if there is none. */
    showTabAt(n: number): boolean {
      const ids = [...tabButtons].filter(([, b]) => !b.hidden).map(([id]) => id);
      const id = ids[n - 1];
      if (!id) return false;
      showTab(id);
      return true;
    },
    element: panel,
    growPage: grow,
    reefPage,
  };
}

/**
 * Press and hold to keep buying: after a short pause, one purchase every 110 ms while the button
 * stays enabled. `repeated` tells the click that ends a hold not to buy one more.
 */
function repeatWhileHeld(btn: HTMLButtonElement, fn: () => void): { repeated: boolean } {
  const state = { repeated: false };
  let wait = 0, tick = 0;
  const stop = () => { clearTimeout(wait); clearInterval(tick); };
  btn.addEventListener('pointerdown', () => {
    stop();
    state.repeated = false;
    wait = window.setTimeout(() => {
      tick = window.setInterval(() => {
        if (btn.disabled) return stop();
        state.repeated = true;
        fn();
      }, 110);
    }, 450);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel'] as const) btn.addEventListener(ev, stop);
  return state;
}

const GAIN_SHOWN = new Set<UpgradeId>(['lattice', 'lure', 'vent', 'sandbar', 'channel', 'pigment', 'canopy', 'meadow']);

/** The reef's name with its generation: "Mara", then "Mara II" on the next seamount, and so on. */
export function reefName(s: GameState): string {
  if (!s.meta.name) return '';
  const n = s.meta.spawnings + 1;
  const roman = ['', '', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
  return s.meta.name + (n < roman.length ? roman[n] : ` ${n}`);
}

function seamountDef(id: SeamountId) {
  return SEAMOUNTS.find((m) => m.id === id)!;
}

/** 0 (seamount) … 1 (surface), each zone an equal share. */
function gaugeFraction(h: number): number {
  const n = actAt(h);
  const a = ACTS[n - 1]!;
  return (n - 1 + Math.min(1, Math.max(0, (h - a.from) / (a.to - a.from)))) / ACTS.length;
}

/** A long card that starts folded: tapping its heading opens and closes it. */
function collapsible(card: HTMLElement, head: HTMLElement): void {
  card.classList.add('collapsible', 'folded');
  head.setAttribute('role', 'button');
  head.tabIndex = 0;
  head.setAttribute('aria-expanded', 'false');
  const toggle = () => {
    const folded = card.classList.toggle('folded');
    head.setAttribute('aria-expanded', String(!folded));
  };
  head.addEventListener('click', toggle);
  head.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
}

/** What opens a hidden upgrade, in words. */
function revealText(s: GameState, u: (typeof UPGRADES)[number]): string {
  const r = u.reveal;
  if (r.band) {
    const b = BANDS.find((x) => x.id === r.band);
    return b ? `when the reef reaches ${metres(b.metres)}` : 'later in the story';
  }
  if (r.height !== undefined) return `when the reef reaches ${metres(r.height)}`;
  if (r.level) {
    const [id, n] = r.level;
    return `after ${n} × ${UPGRADES.find((x) => x.id === id)?.name.toLowerCase() ?? id}`;
  }
  if (r.earned !== undefined) return `after ${num(r.earned)} calcite gathered`;
  return 'soon';
}

/** Names of traits the given lineage would buy, taking the cheapest step each time. */
function affordableTraits(s: GameState, lineage: number): string[] {
  const levels = { ...s.meta.traits };
  const bought = new Map<string, number>();
  for (let guard = 0; guard < 50; guard++) {
    let pick: (typeof TRAITS)[number] | null = null;
    let price = Infinity;
    for (const tr of TRAITS) {
      if (levels[tr.id] >= tr.max) continue;
      const c = traitCost({ ...s, meta: { ...s.meta, traits: levels } }, tr.id);
      if (c < price) { price = c; pick = tr; }
    }
    if (!pick || price > lineage) break;
    lineage -= price;
    levels[pick.id]++;
    bought.set(pick.name, (bought.get(pick.name) ?? 0) + 1);
  }
  return [...bought].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name));
}

/** The gain from one more polyp or glimmerseed, with everything that multiplies it. */
function marginalText(s: GameState, id: 'polyp' | 'symbiont'): string {
  const next: GameState = { ...s, levels: { ...s.levels, [id]: s.levels[id] + 1 } };
  const gain = id === 'polyp'
    ? `+${num(calciteRate(next) - calciteRate(s))} calcite/s`
    : `+${num(rates(next).glowP - rates(s).glowP)} glow/s`;
  const ms = nextMilestone(id, s.levels[id]);
  return ms ? `${gain} · ×${ACT1.milestoneFactor} at ${ms.level}` : gain;
}

function etaText(t: number): string {
  return t <= 0 ? '' : !Number.isFinite(t) ? 'beyond what the reef can hold' : t < 1 ? 'any moment' : `in ${duration(t)}`;
}

function setEta(eta: HTMLElement, t: number): void {
  eta.textContent = etaText(t);
  eta.classList.toggle('never', !Number.isFinite(t));
}

export type Panel = ReturnType<typeof createPanel>;
