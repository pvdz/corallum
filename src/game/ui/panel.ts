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
import { GUIDE, HOLD_HINT, HOLD_HINT_ANY, STOCK_NOTES } from '../content/guide.ts';
import { pinIcon, upgradeIcon } from './icons.ts';
import { SHELL, SHELLS } from '../content/shells.ts';
import { button, el, quietRepeatedWrites } from './dom.ts';
import { createChoices } from './choices.ts';
import { drawCity, drawTablet, drawSeaChart, SEAMOUNT_TINT, drawRings } from './drawings.ts';
import { FEATS } from '../content/feats.ts';
import { AWAY_CYCLES, AWAY_PREP, AWAY_ROWS, DAYS, DREAM, NOTIFY, SWELL, TODAY, WELCOME, intruderOf } from '../content/events.ts';
import { WATER, WATERS } from '../content/waters.ts';
import { REQUEST } from '../content/requests.ts';
import { WORKS, WORK_TEXT, type WorkId } from '../content/works.ts';
import { SISTER } from '../content/sister.ts';
import { DIARY_TEXT, diaryLine } from '../content/diary.ts';
import { drawShellShape } from '../render/shells.ts';
import type { WishId } from '../content/sky.ts';
import { CODEX, UI } from '../content/ui.ts';
import { createAsk } from './ask.ts';
import { OSSEL_MISTAKES } from '../content/ossel.ts';
import { PALETTES, PALETTE_TEXT } from '../content/palettes.ts';
import { SHARD, SHARD_LINES } from '../content/shards.ts';
import { MOMENT, MOMENTS, type Moment, type MomentId } from '../content/moments.ts';
import { PAIRS, RESIDENT, RESIDENTS, type ResidentId } from '../content/residents.ts';
import { CITY_MAP, EXPEDITION, site, type Site } from '../content/expeditions.ts';
import { canSpawnLesser, lineageFor, traitCost, traitMaxed, forgetRefund } from '../sim/prestige.ts';
import { ACTS, act, actAt, SURFACE } from '../content/acts.ts';
import {
  BANDS, bandMetres, ended, steadyCalciteRate, meetingWords, readingCost, spawnHold, spawnNet, spawnTarget, bloomNet, calciteHold, nextMeeting, nextTier, photo, raspMax, sandHold, sandNet, siltNet, smother, calciteNet, calciteRate, canAfford, cost, feeding, glowHold, glowNet, idleShoals,
  jobOpen, maxed, murmurHold, murmurNet, nextReading, planktonNet, rates, reach, readingsRevealed,
  revealed, timeUntil, upgrade, nextSite, canSend, awayShoals, tripSite, callHomeCost, seasoned, tripSeconds, workOpen, workCost, canBuild, waterAt, untilWaterTurns, tierCost, nextMoment, currentRequest, canSkipRequest, plantCost, untilFeast, untilSignal, untilUpwelling, untilTangle, untilStray, untilFragment, untilShell, untilThorn, untilFlurry, untilMilky, untilHeat, heatLeft, closedNow, untilRising, untilSwell, currentUpwelling, canFlare, risingLeft, canFeedRising, risingHaul, moonFull, untilFullMoon, favourOpen, favourCost, favourMaxed, homes, residentsAsking, capReason, knownBonus, nextMilestone, jobGain, upgradeGain, raspSettings, speaks, vowKept, visitor, visited } from '../sim/economy.ts';
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
  /** Replay the reef's growth: this zone's, or (`whole`) the whole climb from the seafloor. */
  timelapse(whole?: boolean): void;
  /** The soft glow (bloom) pass: read and set; off helps slow phones. */
  glow: { get(): boolean; set(on: boolean): void };
  /** The reef's name changed. */
  rename(name: string): void;
  /** Full-resolution rendering (off draws at 1× for slow phones). */
  sharp: { get(): boolean; set(on: boolean): void };
  /** Vibration on purchases and milestones (phones). */
  buzz: { get(): boolean; set(on: boolean): void };
  /** Loudness of the sounds (cues and the sea), 0..1. */
  volume: { get(): number; set(v: number): void };
  /** Loudness of the music, 0..1. */
  music: { get(): number; set(v: number): void };
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
type Story = { kicker: string; title: string; text: string; rows?: readonly (readonly [string, string])[] };

function bandStory(b: Band, kept = false): Story {
  return { kicker: b.metres === 0 ? UI.bandFirst : UI.bandAt(metres(b.metres)), title: b.title, text: kept && b.kept ? b.kept : b.text };
}
function readingStory(r: Reading): Story {
  return { kicker: UI.readingKicker, title: r.title, text: r.text };
}
function truceStory(m: Meeting, c: Choice): Story {
  const o = m[c];
  return { kicker: UI.truceKicker, title: `${m.title}: ${o.label}`, text: o.text };
}

export function createPanel(host: HTMLElement, hooks: PanelHooks) {
  const ask = createAsk(host);
  quietRepeatedWrites();
  const panel = el('aside', 'panel');
  panel.setAttribute('aria-label', UI.panelAria);

  // ---------- Stocks ----------
  const stocks = el('div', 'stocks');
  // Tapping a stock explains it, under the stocks, for a few seconds.
  const stockNote = el('p', 'stock-note');
  stockNote.hidden = true;
  let noteTimer = 0;
  const stock = (name: string, cls: string) => {
    const row = el('div', `stock ${cls}`);
    const value = el('span', 'stock-value', '0');
    // The rate, then what it holds or does: two parts, so a phone can put them on two lines.
    const sub = el('span', 'stock-sub', '');
    // A no-break space before each dot: a wrapped line never starts with "·".
    const rateEl = el('span', 'stock-rate', ''), sep = el('span', 'stock-sep', '\u00a0· '), restEl = el('span', 'stock-rest', '');
    sub.append(rateEl, sep, restEl);
    const setSub = (text: string) => {
      const i = text.indexOf(' · ');
      const a = i < 0 ? text : text.slice(0, i), b = i < 0 ? '' : text.slice(i + 3).replaceAll(' · ', '\u00a0· ');
      if (rateEl.textContent !== a) rateEl.textContent = a;
      if (restEl.textContent !== b) {
        // "holds " and a trailing " calcite" are words of their own, so a phone on its side can drop
        // them and keep the number ("~2.31B", "×46.2"); a tap on the stock still gives the whole line.
        const h = b.indexOf('holds ');
        const unit = b.endsWith(' calcite') ? b.length - 8 : -1;
        if (h < 0 && unit < 0) restEl.textContent = b;
        else if (h >= 0) restEl.replaceChildren(b.slice(0, h), el('span', 'hold-word', 'holds '), b.slice(h + 6));
        else restEl.replaceChildren(b.slice(0, unit), el('span', 'unit-word', ' calcite'));
      }
      sep.hidden = !b;
    };
    row.append(el('span', 'stock-name', name), value, sub);
    const note = STOCK_NOTES[cls];
    if (note) {
      row.title = note;
      row.addEventListener('click', () => {
        const again = !stockNote.hidden && stockNote.dataset.stock === cls;
        stockNote.hidden = again;
        stockNote.dataset.stock = cls;
        // The whole rate line too: on a phone with many stocks it is cut short.
        stockNote.textContent = `${name}: ${note} (${sub.textContent})`;
        clearTimeout(noteTimer);
        if (!again) noteTimer = window.setTimeout(() => { stockNote.hidden = true; }, 8000);
      });
    }
    stocks.append(row);
    return { row, value, sub, setSub };
  };
  const calcite = stock('Calcite', 'calcite');
  const glow = stock('Glow', 'glow');
  const plankton = stock('Plankton', 'plankton');
  const murmurs = stock('Murmurs', 'murmurs');
  const silt = stock('Silt', 'silt');
  const sand = stock('Sand', 'sand');
  const bloom = stock('Bloom', 'bloom');
  const spawn = stock('Spawn', 'spawn');
  // A stock that jumps in a frame (a haul, a feast, a gift) brightens and swells for a moment; one a
  // purchase takes a bite out of dims for a blink. Not under reduced motion or the calm setting.
  const lastValue = new Map<HTMLElement, number>();
  /** When each upgrade's button last glowed for becoming affordable. */
  const shimmered = new Map<string, number>();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  function pulse(value: HTMLElement, v: number): void {
    const prev = lastValue.get(value);
    lastValue.set(value, v);
    if (prev === undefined || !(prev > 0) || reducedMotion.matches || hooks.calm.get() || !value.animate) return;
    if (v > prev * 1.05) value.animate([{ transform: 'scale(1.12)', filter: 'brightness(1.7)' }, { transform: 'none', filter: 'none' }], { duration: 650, easing: 'ease-out' });
    else if (v < prev * 0.95) value.animate([{ opacity: 0.45 }, { opacity: 1 }], { duration: 400, easing: 'ease-out' });
  }
  // Stocks whose act is two or more behind the reef step aside into one small line, name and number
  // only (a tap still gives the whole note): by zone, not by rate, so a purchase never moves the grid.
  const minorBox = el('div', 'stocks-minor');
  const homeAct = new Map([[glow, 1], [plankton, 2], [murmurs, 2], [silt, 3], [sand, 3], [bloom, 4], [spawn, 5]]);
  let minorKey = '';
  stocks.append(minorBox);
  const heightRow = el('div', 'stock height');
  const heightLabel = el('span', 'stock-name', UI.reefLabel);
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
  // Tabs and pages as screen readers know them: a tab list, each tab naming the page it shows.
  tabs.setAttribute('role', 'tablist');
  for (const [id, label] of Object.entries(UI.tabs) as [keyof typeof UI.tabs, string][]) {
    tabs.append(button('tab', label, () => showTab(id)));
    const tab = tabs.lastElementChild as HTMLButtonElement;
    tab.id = `tab-${id}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `page-${id}`);
    tabButtons.set(id, tab);
    const page = el('section', `page page-${id}`);
    page.id = `page-${id}`;
    page.setAttribute('role', 'tabpanel');
    page.setAttribute('aria-labelledby', `tab-${id}`);
    pages.append(page);
    tabPages.set(id, page);
  }
  // Left and Right on a focused tab move to the next one, as a tab list does.
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const shown = [...tabButtons].filter(([, b]) => !b.hidden);
    const i = shown.findIndex(([, b]) => b === document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const [id, b] = shown[(i + (e.key === 'ArrowRight' ? 1 : shown.length - 1)) % shown.length]!;
    showTab(id);
    b.focus();
  });
  // A choice opened while another tab was showing: the Grow tab says so until it is looked at.
  const growDot = el('span', 'dot');
  growDot.hidden = true;
  tabButtons.get('grow')!.append(growDot);
  let growSeen = new Set<string>();
  const bandsDot = el('span', 'dot');
  tabButtons.get('bands')!.append(bandsDot);
  const reefDot = el('span', 'dot');
  reefDot.hidden = true;
  tabButtons.get('reef')!.append(reefDot);
  // Lineage to spend on a trait it could not buy before: the Lineage tab says so until looked at
  // (what was already affordable when the page loaded does not call).
  const lineageDot = el('span', 'dot');
  lineageDot.hidden = true;
  tabButtons.get('lineage')!.append(lineageDot);
  let traitsReadySeen = -1;
  let seenStories = 0;
  let storyCount = 0;
  /** A story joined the Bands list: it calls (the tab's dot) only if it came after the page loaded and
   *  was not shown in its card (one shown has been read; one from before the load is old). */
  const listed = (shown: boolean) => { if (primed && !shown) storyCount++; };
  // The tabs share one scroller: each keeps its own place, and the tab already open, tapped again,
  // goes back to its top.
  let currentTab = 'grow';
  const tabScroll = new Map<string, number>();
  /** Set once the quick buys exist (they are built further down): shows or hides them for a tab. */
  let syncQuick = (_tab: string): void => {};
  function showTab(id: string): void {
    const again = id === currentTab;
    if (!again) tabScroll.set(currentTab, pages.scrollTop);
    // Only the open tab is a stop for Tab (Left and Right reach the others), as a tab list is.
    for (const [k, b] of tabButtons) { b.classList.toggle('on', k === id); b.setAttribute('aria-selected', String(k === id)); b.tabIndex = k === id ? 0 : -1; }
    for (const [k, p] of tabPages) p.hidden = k !== id;
    syncQuick(id);
    if (id === 'bands') seenStories = storyCount;
    if (id === 'lineage') { traitsReadySeen = -1; lineageDot.hidden = true; }
    // The weather strip's labels were measured while hidden (no widths): laid out again.
    if (id === 'grow') almanacKey = '';
    if (again) pages.scrollTo({ top: 0, behavior: smoothScroll() });
    else pages.scrollTop = tabScroll.get(id) ?? 0;
    currentTab = id;
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
  truceBox.append(el('p', 'truce-kicker', UI.raspKicker), truceTitle, truceText, truceWords, truceWordsLabel, truceChoices);
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
  raspHead.append(el('h3', '', UI.theRasp), raspCount);
  foldable(raspBox, raspHead, 'rasp');
  const raspRow = el('div', 'rasp-row');
  const raspMinus = button('step', '−', () => hooks.setRasp((lastState?.rasp ?? 0) - 1));
  const raspSlider = el('input', 'rasp-slider');
  raspSlider.type = 'range';
  raspSlider.min = '0';
  raspSlider.step = '1';
  raspSlider.setAttribute('aria-label', UI.raspAria);
  raspSlider.addEventListener('input', () => hooks.setRasp(Number(raspSlider.value)));
  const raspPlus = button('step', '+', () => hooks.setRasp((lastState?.rasp ?? 0) + 1));
  raspMinus.setAttribute('aria-label', UI.raspFewer);
  raspPlus.setAttribute('aria-label', UI.raspMore);
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
  // The head (what is happening, and the next thing) and the rest: a phone hides the rest under the strip.
  const soonHead = el('span'), soonRest = el('span', 'soon-rest');
  waterSoon.append(soonHead, soonRest);
  // The next twenty minutes as a strip: a mark for each thing coming, labels above and below.
  const almanac = el('div', 'almanac');
  // Tapped (phones have no tooltips), a mark says what it is and when.
  const almanacNote = el('span', 'almanac-note');
  let almanacKey = '';
  let ticksPassedKey = '';
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
  waterBox.append(waterName, waterLine, waterNext, waterSoon, almanac, almanacNote, todayLine, heatRow, riseRow);
  grow.prepend(waterBox);
  // The strip can be folded away by its card's name (remembered); the "Soon" line then lists it all.
  {
    const key = 'corallum.fold.almanac';
    const set = (folded: boolean) => { waterBox.classList.toggle('strip-folded', folded); waterName.setAttribute('aria-expanded', String(!folded)); };
    try { set(localStorage.getItem(key) === '1'); } catch { set(false); }
    const toggle = () => {
      if (!waterBox.classList.contains('charted')) return;
      const folded = !waterBox.classList.contains('strip-folded');
      set(folded);
      try { localStorage.setItem(key, folded ? '1' : '0'); } catch { /* no storage */ }
    };
    waterName.addEventListener('click', toggle);
    waterName.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && keyed(waterName)) { e.preventDefault(); toggle(); } });
  }
  let waterShown = '';
  // Ossel's request: one small thing to do, with its progress.
  const askBox = el('div', 'ask');
  askBox.hidden = true;
  const askText = el('span', 'ask-text');
  const askWhen = el('span', 'ask-when');
  const askBar = el('span', 'ask-bar');
  const askFill = el('span', 'ask-fill');
  askBar.append(askFill);
  const askCount = el('span', 'ask-count');
  // While it may not be used yet it stays tappable (a disabled button takes no tap, and a phone shows
  // no tooltip): a tap then says, in place of the ask's timing, how long until it may.
  let skipSaidUntil = 0;
  const askSkip = button('step ask-skip', '↻', () => {
    if (askSkip.getAttribute('aria-disabled') !== 'true') { hooks.skipRequest(); return; }
    askWhen.textContent = askSkip.title;
    askWhen.classList.remove('now');
    skipSaidUntil = performance.now() + 3000;
  });
  askSkip.title = REQUEST.skip;
  askSkip.setAttribute('aria-label', REQUEST.skip);
  const askKicker = el('em', '', REQUEST.kicker);
  askBox.append(askKicker, askText, askBar, askCount, askSkip);
  waterBox.after(askBox);
  // An ask done in the panel (bud, lay bands, read…) takes a tap to where it is done, and lights it.
  let askKind = '';
  const ASK_CARD: Partial<Record<string, UpgradeId>> = { bud: 'polyp', glimmer: 'symbiont', bands: 'skeleton', shoals: 'shoal', sandbar: 'sandbar', pigment: 'pigment', ripen: 'ripen' };
  function askTarget(): { tab: string; at: HTMLElement } | null {
    const id = ASK_CARD[askKind];
    const at = id ? cards.get(id)?.root
      : askKind === 'read' ? readingCard
      : askKind === 'work' ? workCards.find((c) => !c.root.hidden && !c.root.classList.contains('done') && !c.root.closest('details:not([open])'))?.root
      : askKind === 'rising' ? riseRow
      : askKind === 'roam' ? tripCard
      : undefined;
    const tab = askKind === 'read' ? 'bands' : 'grow';
    // Shown on its page (the page itself may be the tab not open).
    for (let e: HTMLElement | null = at ?? null; e && e !== tabPages.get(tab); e = e.parentElement) if (e.hidden) return null;
    return at ? { tab, at } : null;
  }
  askBox.addEventListener('keydown', (e) => {
    if (e.target !== askBox || (e.key !== 'Enter' && e.key !== ' ') || !keyed(askBox)) return;
    e.preventDefault();
    askBox.click();
  });
  askBox.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const go = askTarget();
    if (!go) return;
    if (currentTab !== go.tab) showTab(go.tab);
    go.at.scrollIntoView({ behavior: smoothScroll(), block: 'center' });
    go.at.animate?.([{ boxShadow: '0 0 0 0 rgba(255, 217, 168, 0)' }, { boxShadow: '0 0 22px 3px rgba(255, 217, 168, 0.5)' }, { boxShadow: '0 0 0 0 rgba(255, 217, 168, 0)' }], { duration: 1400, delay: 250, easing: 'ease-in-out' });
  });
  // Before you go: one tap to ready the reef for an absence (shown once there is something to set).
  // What it did, for a few seconds (left there, it would go stale as soon as the Rasp or the shoals change).
  let prepTimer = 0;
  const prepBtn = button('plain prep-away', AWAY_PREP.label, () => {
    prepNote.textContent = hooks.prepareAway();
    clearTimeout(prepTimer);
    prepTimer = window.setTimeout(() => { prepNote.textContent = ''; }, 6000);
  });
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
  const shoalTitle = el('h3', '', UI.shoals);
  const shoalIdle = el('span', 'level');
  shoalHead.append(shoalTitle, shoalIdle);
  foldable(shoalBox, shoalHead, 'shoals');
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
    minus.setAttribute('aria-label', UI.fewerShoals(j.verb));
    plus.setAttribute('aria-label', UI.moreShoals(j.verb));
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
  foldable(homeBox, homeHead, 'residents');
  // What residents are, until the first has moved in.
  const homeIntro = el('p', 'rasp-what', RESIDENT.intro);
  homeBox.append(homeHead, homeIntro);
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
  // With every home taken, the rest wait behind this line (their buttons could only say No room).
  let homesAll = false;
  const homeMore = button('plain home-more', '', () => { homesAll = !homesAll; });
  const pairLine = el('p', 'rasp-what pair-line');
  homeBox.append(homeMore, pairLine);
  grow.append(homeBox);

  // ---------- Expeditions ----------
  const tripCard = el('article', 'card expedition');
  tripCard.hidden = true;
  const tripHead = el('header');
  const tripTitle = el('h3');
  tripHead.append(tripTitle, el('span', 'level', UI.expedition));
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
    const name = head.firstChild as HTMLElement;
    name.title = w.flavour;
    name.addEventListener('click', () => root.classList.toggle('open'));
    root.append(head, el('p', 'flavour', w.flavour), el('p', 'effect', w.effect), stages, foot);
    grow.append(root);
    return { w, root, level, pips, costEl, btn, eta };
  });

  // ---------- Upgrade cards ----------
  const cards = new Map<UpgradeId, Card>();
  const milestoneBars = new Map<UpgradeId, HTMLElement>();
  for (const u of UPGRADES) {
    const root = el('article', 'card upgrade');
    root.hidden = true;
    const head = el('header');
    const level = el('span', 'level');
    const title = el('h3');
    title.append(upgradeIcon(u.id), u.name);
    // The best buy's badge (drawn by CSS from this, when the card is marked best).
    title.dataset.best = UI.bestBuy;
    // A pin: this card's wait shows in the tab title.
    const pin = button('pin', '', () => { pinned = pinned === u.id ? '' : u.id; for (const [id, c] of cards) c.root.classList.toggle('pinned', id === pinned); });
    pin.append(pinIcon());
    pin.title = UI.pinTitle;
    pin.setAttribute('aria-label', UI.pinAria(u.name));
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
    // Once bought, the flavour steps aside (the panel stays quiet); the name brings it back.
    title.title = u.flavour;
    title.addEventListener('click', (e) => { if (!pin.contains(e.target as Node)) root.classList.toggle('open'); });
    grow.append(root);
    cards.set(u.id, { root, cost: costEl, level, effect, eta, btn, max });
  }

  // ---------- Bands and Readings ----------
  const bandsPage = tabPages.get('bands')!;
  const readingCard = el('article', 'card reading');
  readingCard.hidden = true;
  const readingHead = el('header');
  const readingTitle = el('h3');
  readingHead.append(readingTitle, el('span', 'level', UI.reading));
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
  // A long list can be narrowed to one kind (filtered in CSS by data-show); hidden while short.
  const storyFilter = el('div', 'story-filter');
  storyFilter.hidden = true;
  for (const [id, label] of UI.storyFilter) {
    const b = button('wait-chip', label, () => {
      bandList.dataset.show = id;
      for (const c of storyFilter.children) c.classList.toggle('on', c === b);
    });
    if (id === 'all') b.classList.add('on');
    storyFilter.append(b);
  }
  bandList.dataset.show = 'all';
  const codex = el('article', 'card codex');
  const codexList = el('dl', 'codex-list');
  const chart = el('canvas', 'growth-chart') as HTMLCanvasElement;
  const codexHead = el('h3', '', UI.yourReef);
  codex.append(codexHead, codexList, chart);
  // Folded like the cards under it, so the bands' stories come first.
  collapsible(codex, codexHead);
  // Opened, the chart redraws at the card's real width (folded it had none).
  for (const ev of ['click', 'keydown'] as const) codexHead.addEventListener(ev, () => { chartLen = -1; });
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
    // The zones' names over everything, with a dark edge so the line passing behind them does not
    // strike them through.
    // (Quiet by a dim colour, not by transparency: a see-through fill let the edge show through
    // and the letters looked boxed.)
    c.lineJoin = 'round';
    c.lineWidth = 2.5;
    c.strokeStyle = 'rgba(6,10,26,0.7)';
    c.fillStyle = '#8796b0';
    for (const a of ACTS) {
      const my = (y(a.to) + y(a.from)) / 2, name = a.name.replace(/^The /, '');
      c.strokeText(name, 4, my);
      c.fillText(name, 4, my);
    }
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
    journalHead.textContent = UI.journalHead(seen.length, CREATURES.length, touched, Math.round((knownBonus(s) - 1) * 100));
    journalList.innerHTML = '';
    // Grouped by zone, with how many of each zone's creatures have been seen.
    const zones = [...new Set(CREATURES.map((c) => c.zone))];
    for (const zone of zones) {
      const inZone = CREATURES.filter((c) => c.zone === zone);
      const got = inZone.filter((c) => seen.includes(c)).length;
      const head = el('div', 'journal-zone', `${zone} · ${got}\u00a0of\u00a0${inZone.length}`);
      // A small ring: how much of the zone has been seen.
      const f = got / inZone.length, r = 6, c = 2 * Math.PI * r;
      const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ring.setAttribute('viewBox', '0 0 16 16');
      ring.classList.add('zone-ring');
      ring.innerHTML = `<circle cx="8" cy="8" r="${r}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="2.5"/>` +
        `<circle cx="8" cy="8" r="${r}" fill="none" stroke="${f >= 1 ? '#ffd9a8' : '#a8dcff'}" stroke-width="2.5" stroke-dasharray="${(f * c).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 8 8)" stroke-linecap="round"/>`;
      head.prepend(ring);
      journalList.append(head);
      // The unseen ones fold into a single line under the zone: how many, and the hints worth giving.
      const unseen = inZone.filter((c) => !seen.includes(c));
      for (const c of inZone) {
        if (!seen.includes(c)) continue;
        // A portrait (when one was taken), the name and the note.
        const row = el('div', 'journal-entry');
        const pic = hooks.portrait?.(c.id);
        if (pic) {
          const img = el('img', 'portrait');
          img.src = pic;
          img.alt = UI.firstSaw(c.name);
          img.tabIndex = 0;
          const enlarge = () => showPortrait(pic, c.name, c.note, c.zone);
          img.addEventListener('click', enlarge);
          img.addEventListener('keydown', (e) => { if (e.key === 'Enter') enlarge(); });
          row.append(img);
        } else row.append(el('div', 'portrait none'));
        const text = el('div', 'journal-text');
        const name = el('strong', '', c.name);
        const tl = trustLevel(s.meta.trust[c.id] ?? 0);
        if (tl > 0) name.append(el('em', `touched trust-${tl}`, ` · ${TRUST.names[tl]}`));
        if (s.meta.seen.includes(`g:${c.id}`)) {
          const mark = el('em', 'lucky-mark', ' ✦');
          mark.title = LUCKY.seen;
          name.append(mark);
        }
        // A touched creature can be kept close as the line's companion.
        if (s.meta.seen.includes(`t:${c.id}`)) {
          const mine = s.meta.companion === c.id;
          const star = button(`companion${mine ? ' on' : ''}`, mine ? '★' : '☆', () => hooks.companion(mine ? '' : c.id));
          star.title = mine ? `${COMPANION.on} · ${COMPANION.note}` : `${COMPANION.label} (${COMPANION.note})`;
          name.append(star);
        }
        text.append(name, el('span', '', c.note));
        row.append(text);
        journalList.append(row);
      }
      if (unseen.length) {
        // "Only on a vent", "only on a cold seamount"…, then how many are rare.
        const only = [...new Set(unseen.map((c) => /Only (?:on|after) [^.]*/.exec(c.note)?.[0]).filter((h): h is string => !!h))];
        const rare = unseen.filter((c) => c.note.startsWith('Rare.')).length;
        const hints = [...only, ...(rare ? [UI.rareHint(rare)] : [])].map((h, i) => (i ? h[0]!.toLowerCase() : h[0]!.toUpperCase()) + h.slice(1));
        const row = el('div', 'journal-entry unknown');
        row.append(el('div', 'portrait none'));
        const text = el('div', 'journal-text');
        text.append(el('strong', '', UI.notYetSeenCount(unseen.length)),
          el('span', '', hints.length ? `${hints.join(' ·\u00a0')}.` : ''));
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
    tabletHead.textContent = `${SHARD.label} · ${got.length}\u00a0of\u00a0${SHARD_LINES.length}`;
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
  // The rings are drawn at the canvas's size: again when it opens or the panel changes width.
  // Watched, not read each frame: a width read after the frame's writes forces a layout.
  new ResizeObserver(() => {
    const w = ringCanvas.clientWidth;
    if (!w || w === ringW) return;
    ringW = w;
    ringGeo = drawRings(ringCanvas, ringLines, -1);
  }).observe(ringCanvas);
  function renderDiary(s: GameState): void {
    diary.hidden = s.diary.length === 0;
    storyFilter.hidden = bandList.children.length < 20;
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
    shelfHead.textContent = `${SHELL.label} · ${s.meta.shells.length}\u00a0of\u00a0${SHELLS.length} · calcite +${s.meta.shells.length + (s.meta.shells.length >= SHELLS.length ? 5 : 0)}%`;
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
    momentHead.textContent = `${UI.momentsLabel} · ${met.length}\u00a0of\u00a0${MOMENTS.length}`;
    momentList.innerHTML = '';
    // Hard places' moments stay hidden until met; the others show where they wait, a run of
    // unmet ones on a single row of depths.
    let waiting: number[] = [];
    const flush = () => {
      if (waiting.length) momentList.append(el('dt', 'unknown', UI.notYetMet), el('dd', 'unknown', waiting.map(metres).join(' ·\u00a0')));
      waiting = [];
    };
    for (const m of MOMENTS) {
      const ways = (['a', 'b'] as const).filter((c) => s.meta.seen.includes(`m:${m.id}:${c}`)).map((c) => m[c].label);
      if (!ways.length) {
        if (!m.seamount) waiting.push(m.metres);
        continue;
      }
      flush();
      momentList.append(el('dt', '', m.title), el('dd', '', ways.join(' ·\u00a0')));
    }
    flush();
  }
  bandsPage.append(codex, journal, readingCard, tablet, shelf, cityCard, diary, momentCard, bandsIntro, storyFilter, bandList);
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
    if (tr) codexRow(CODEX.trial, `${CODEX.trialGoal(seamountDef(s.seamount).name, metres(tr.goal))}${s.meta.seen.includes(`trial:${s.seamount}`) ? ` · ${TRIAL_TEXT.met}` : ''} · ${tr.reward}`);
    const wrong = s.meta.seen.filter((k) => k.startsWith('o:')).length;
    if (wrong) codexRow(CODEX.ossel, CODEX.mistakes(wrong, OSSEL_MISTAKES.length));
    if (s.race.decided > 0) codexRow(UI.sisterReef, CODEX.marks(s.race.won, s.race.decided) + (s.meta.endings > 0 ? CODEX.cousin(String(s.race.cousin)) : ''));
    const recs = s.meta.records.map((t, i) => t > 0 ? CODEX.record(metres(SISTER.marks[i]!), duration(t)) : '').filter(Boolean);
    if (recs.length) codexRow(CODEX.best, recs.join(' ·\u00a0'));
    const did: string[] = [];
    if (s.feasts) did.push(CODEX.feasts(s.feasts));
    if (s.tally.intruders) did.push(CODEX.intruders(s.tally.intruders));
    if (s.signal.answered) did.push(CODEX.signals(s.signal.answered));
    if (s.relics.length + s.tally.roams) did.push(CODEX.trips(s.relics.length + s.tally.roams));
    if (s.request.done) did.push(CODEX.requests(s.request.done));
    if (s.tally.risings) did.push(CODEX.risings(s.tally.risings));
    if (did.length) codexRow(UI.doneHere, did.join(' ·\u00a0'));
    const strain = STRAINS.find((x) => x.id === s.strain), sport = SPORTS.find((x) => x.id === s.sport);
    if (strain) codexRow(CODEX.glimmerseed, sport ? CODEX.sported(strain.name, sport.name.toLowerCase(), sport.effect) : CODEX.strain(strain.name, strain.effect));
    const grains = GRAINS.map((g) => [g.name, s.grains.filter((x) => x === g.id).length] as const).filter(([, n]) => n > 0);
    if (grains.length) codexRow(UI.theGrain, grains.map(([n, c]) => `${c} ${n.toLowerCase()}`).join(' ·\u00a0'));
    const stars = FIGURES.filter((f) => s.sky[f.id]).map((f) => f.name);
    if (stars.length) codexRow(UI.starsNamed, stars.join(' ·\u00a0'));
    codexRow(CODEX.grown, CODEX.grownText(metres(s.height), Math.round(Math.max(0, SURFACE - s.height)).toLocaleString('en-US')));
    codexRow(UI.bandsRead, CODEX.bandsText(s.bands.length, s.readings.length));
    const truce = MEETINGS.filter((m) => s.truce[m.id]).map((m) => `${m.title}: ${m[s.truce[m.id] as Choice].label}`);
    if (truce.length) codexRow(UI.truceKicker, truce.join(' ·\u00a0'));
    const spoken = TIERS.filter((t) => s.dialects[t.tier]).map((t) => DIALECTS.find((d) => d.id === s.dialects[t.tier])!.name);
    if (spoken.length) codexRow(CODEX.dialects, spoken.join(' ·\u00a0'));
    if (s.meta.name) codexRow(CODEX.name, reefName(s));
    codexRow(UI.thisReef, CODEX.thisReefText(duration(s.t), num(s.earned.calcite)));
    const small = [
      s.tally.pruned ? UI.tallyPruned(s.tally.pruned) : '',
      s.tally.lucky ? UI.tallyLucky(s.tally.lucky) : '',
      s.tally.milky ? UI.tallyMilky(s.tally.milky) : '',
      s.tally.freed ? UI.tallyFreed(s.tally.freed) : '',
      s.lineWishes || s.wished >= 0 ? UI.tallyWished : '',
    ].filter(Boolean);
    if (small.length) codexRow(UI.smallThings, small.join(' ·\u00a0'));
    if (s.nursed) codexRow(GARDEN.nursed, GARDEN.kinds.filter((k) => s.nursed.includes(k.id)).map((k) => `${[...s.nursed].filter((c) => c === k.id).length} × ${k.name.toLowerCase().replace(/^a /, '')} (${k.effect.replace(' on the next reef', '')})`).join(' ·\u00a0'));
    // Haste on its way up says how long is left to keep it.
    const vowState = (id: VowId) => {
      if (!vowKept(s, id)) return VOW.broken;
      return id === 'haste' && s.surfacedAt < 0 ? VOW.left(duration(VOW.hasteHours * 3600 - s.t)) : VOW.kept;
    };
    if (s.vows.length) codexRow(VOW.label, VOWS.filter((v) => s.vows.includes(v.id)).map((v) => `${v.name.toLowerCase()} (${vowState(v.id)})`).join(' ·\u00a0'));
    if (s.meta.endings > 0) codexRow(UI.theSea, CODEX.healing((0.95 ** Math.min(6, s.meta.endings)).toFixed(2)));
    if (s.meta.endings > 0) codexRow(CODEX.endings, CODEX.endingsText(s.meta.endings, s.meta.carriedEver.length, MEMORIES.length));
    if (s.carried.length) codexRow(CODEX.carried, s.carried.map((id) => MEMORIES.find((m) => m.id === id)?.title ?? id).join(' ·\u00a0'));
    if (s.meta.spawnings) codexRow(CODEX.lineage, CODEX.lineageText(s.meta.spawnings, metres(s.meta.best)));
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
  lineageHead.append(el('span', 'stock-name', UI.lineage), lineageCount, lineageSub);
  const spawnCard = el('article', 'card spawn-lesser');
  const spawnTitle = el('h3', '', UI.lesserTitle);
  const spawnGain = el('span', 'spawn-gain');
  let spawnOpened = false;
  const spawnToggle = () => { if (!lastState || ended(lastState)) return; spawnOpened = !spawnOpened; };
  spawnTitle.addEventListener('click', spawnToggle);
  spawnTitle.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && keyed(spawnTitle)) { e.preventDefault(); spawnToggle(); } });
  const spawnText = el('p', 'flavour',
    UI.lesserText);
  const spawnFoot = el('footer');
  const spawnBtn = button('buy lineage', '', () => {
    const s = lastState;
    if (!s) return;
    const msg = ended(s)
      ? UI.beginAgainSure(lineageFor(s))
      : UI.lesserSure(lineageFor(s));
    void ask.confirm({ ...(ended(s) ? UI.askBegin : UI.askLesser), text: `${msg} ${UI.settlesOn(seamountDef(whereNext).name.toLowerCase())}`, danger: true })
      .then((go) => { if (go) hooks.spawnLesser(whereNext, heirNext, [...vowsNext]); });
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
        (m.trial ? UI.trialNote(metres(m.trial.goal), m.trial.reward) : '');
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
        heirNote.textContent = x ? UI.heirEffect(x.relic, x.effect) : EXPEDITION.heirNote;
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
      vowNote.textContent = UI.vowEffect(v.name, v.effect, v.lineage);
    });
    vowBox.append(b);
  }
  spawnCard.append(spawnTitle, spawnText, spawnBuys, el('p', 'stock-name', UI.whereItSettles), whereBox, whereNote, heirLabel, heirBox, heirNote, vowLabel, vowBox, vowNote, spawnFoot);
  // Feats: goals across all runs, one lineage each.
  const featCard = el('article', 'card codex feats');
  const featHead = el('h3', '', UI.feats);
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
    featHead.textContent = UI.featsHead(done.length, FEATS.length);
    featList.innerHTML = '';
    for (const f of FEATS) {
      const got = done.includes(f);
      const pr = !got && f.progress ? f.progress(s) : null;
      const secret = f.hidden && !got;
      featList.append(el('dt', got ? '' : 'unknown', secret ? '???' : f.name), el('dd', got ? '' : 'unknown', secret ? 'A secret.' : pr ? `${f.text} (${Math.min(pr[0], pr[1])}\u00a0of\u00a0${pr[1]})` : f.text));
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
    chronHead.textContent = UI.chronHead(s.meta.chronicle.length);
    chronList.innerHTML = '';
    drawSeaChart(seaChart, s.meta.chronicle);
    s.meta.chronicle.forEach((line, i) => {
      const [sm, ids, hours, flags = ''] = line.split('|');
      const names = (ids ?? '').split(',').map((id) => MEMORIES.find((m) => m.id === id)?.title ?? id).join(', ');
      const li = el('li');
      li.append(el('span', 'diary-when', `${i + 1} · ${seamountDef((sm ?? 'plain') as SeamountId).name.replace(/^A /, '')} · ${hours} h${flags.includes('b') ? ` · ${UI.chronBlue}` : ''}${flags.includes('v') ? ` · ${UI.chronVows}` : ''}`), el('span', 'diary-what', names));
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
    // Owned, the flavour steps aside (as on the Grow tab); the name brings it back.
    const name = head.firstChild as HTMLElement;
    name.title = tr.flavour;
    name.addEventListener('click', () => root.classList.toggle('open'));
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
  // The line in numbers: what every reef of it has gathered together.
  const totalsCard = el('article', 'card codex totals');
  const totalsHead = el('h3', '', UI.totalsLabel);
  const totalsList = el('dl', 'codex-list');
  totalsCard.append(totalsHead, totalsList);
  collapsible(totalsCard, totalsHead);
  lineagePage.append(totalsCard);
  let totalsKey = '';
  function renderTotals(s: GameState): void {
    const m = s.meta;
    const seen = CREATURES.filter((c) => m.seen.includes(`c:${c.id}`)).length;
    const friends = Object.values(m.trust).filter((n) => trustLevel(n) >= 3).length;
    const moments = MOMENTS.filter((x) => m.seen.includes(`m:${x.id}:a`) || m.seen.includes(`m:${x.id}:b`)).length;
    const feats = m.seen.filter((k) => k.startsWith('f:')).length;
    const rows: [string, string][] = [
      [UI.totReefs, String(m.spawnings + 1)], [UI.totEndings, String(m.endings)],
      [UI.totSeen, `${seen}\u00a0of\u00a0${CREATURES.length}`], [UI.totFriends, String(friends)],
      [UI.totShells, `${m.shells.length}\u00a0of\u00a0${SHELLS.length}`], [UI.totShards, `${m.shards.length}\u00a0of\u00a0${SHARD_LINES.length}`],
      [UI.totMoments, `${moments}\u00a0of\u00a0${MOMENTS.length}`], [UI.totFeats, String(feats)],
    ];
    const key = rows.map((r) => r[1]).join('|');
    totalsCard.hidden = m.spawnings === 0 && m.endings === 0;
    if (key === totalsKey) return;
    totalsKey = key;
    totalsList.innerHTML = '';
    for (const [k, v] of rows) totalsList.append(el('dt', '', k), el('dd', '', v));
  }
  let lineKey: string | null = null;
  function renderLine(s: GameState): void {
    const key = s.meta.ancestors.join() + s.meta.name + s.meta.fastest;
    lineCard.hidden = s.meta.ancestors.length === 0 && s.meta.fastest === 0;
    if (key === lineKey) return;
    lineKey = key;
    lineList.innerHTML = '';
    drawLine(s);
    if (s.meta.fastest > 0) lineList.append(el('dt', '', UI.record), el('dd', '', UI.recordText(duration(s.meta.fastest))));
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
  // Finished upgrades and great works, folded into one line at the end of the list.
  const finished = el('details', 'finished') as HTMLDetailsElement;
  const finishedHead = el('summary', '', UI.finished);
  const finishedList = el('div', 'finished-list');
  finished.append(finishedHead, finishedList);
  finished.hidden = true;
  /** Move a card that is done for good into the folded list. */
  function finish(card: HTMLElement): void {
    finishedList.append(card);
    finished.hidden = false;
    finishedHead.textContent = `${UI.finished} · ${finishedList.children.length}`;
  }
  const comingUp = el('p', 'hint coming-up');
  grow.append(finished, comingUp);

  // ---------- Reef (settings) ----------
  const reefPage = tabPages.get('reef')!;
  const exportBtn = button('plain', UI.copySave, async () => {
    const text = hooks.exportSave();
    try {
      await navigator.clipboard.writeText(text);
      exportBtn.textContent = UI.copied;
    } catch {
      await ask.show({ ...UI.askCopy }, text);
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
    if (f && !hooks.importSave(await f.text())) void ask.tell({ ...UI.askBad, text: UI.badSave });
    fileInput.value = '';
  });
  const loadFileBtn = button('plain', UI.loadFile, () => fileInput.click());
  const importBtn = button('plain', UI.loadText, async () => {
    const text = await ask.input({ ...UI.askPaste });
    if (text && !hooks.importSave(text)) void ask.tell({ ...UI.askBad, text: UI.badSave });
  });
  const resetBtn = button('plain danger', UI.reset, () => {
    void ask.confirm({ ...UI.askReset, text: UI.resetSure, danger: true }).then((go) => { if (go) hooks.reset(); });
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
  nameRow.append(el('span', 'stock-name', UI.nameLabel), nameInput);
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
  /** A loudness slider, 0..100 on screen and 0..1 in the setting. */
  const slider = (label: string, value: { get(): number; set(v: number): void }): HTMLElement => {
    const row = el('label', 'toggle');
    const input = el('input') as HTMLInputElement;
    input.type = 'range';
    input.min = '0';
    input.max = '100';
    input.value = String(Math.round(value.get() * 100));
    input.addEventListener('input', () => value.set(Number(input.value) / 100));
    row.append(el('span', 'slider-name', label), input);
    return row;
  };
  const musicRow = slider(UI.musicVolume, hooks.music);
  const volRow = slider(UI.soundsVolume, hooks.volume);
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
  // What shapes this reef: the seamount itself, the reef's own choices, every lasting effect from boons, relics, residents, moments, works,
  // favours and the line's hard places, one line each.
  const shapes = el('article', 'card codex shapes');
  const shapesHead = el('h3', '', UI.shapes);
  const shapesList = el('dl', 'codex-list');
  shapes.append(shapesHead, shapesList);
  collapsible(shapes, shapesHead);
  let shapesKey = '';
  function renderShapes(s: GameState): void {
    const rows: [string, string][] = [];
    // The seamount itself, unless it is a plain one.
    if (s.seamount !== 'plain') { const m = seamountDef(s.seamount); rows.push([m.name, m.effect]); }
    const b = BOONS.find((x) => x.id === s.boon);
    if (b) rows.push([b.name, b.effect]);
    // The reef's own choices: its glimmerseed and their sport, the grain of its bands, its dialects.
    const strain = STRAINS.find((x) => x.id === s.strain), sport = SPORTS.find((x) => x.id === s.sport);
    if (strain) rows.push([`${strain.name} glimmerseed`, strain.effect]);
    if (sport) rows.push([`${sport.name} glimmerseed`, sport.effect]);
    for (const g of GRAINS) { const n = s.grains.filter((x) => x === g.id).length; if (n) rows.push([`${g.name} bands\u00a0×${n}`, g.effect]); }
    for (const id of Object.values(s.dialects)) { const d = DIALECTS.find((x) => x.id === id); if (d) rows.push([d.name, d.effect]); }
    for (const id of s.relics) { const x = site(id); if (x) rows.push([x.relic, x.effect]); }
    if (s.heirloom && !s.relics.includes(s.heirloom)) { const x = site(s.heirloom); if (x) rows.push([UI.heirloom(x.relic), x.effect]); }
    for (const id of s.residents) { const r = RESIDENTS.find((x) => x.id === id); if (r) rows.push([r.name, r.effect]); }
    for (const p of PAIRS) if (s.residents.includes(p.a) && s.residents.includes(p.b)) rows.push([p.name, p.effect]);
    // A moment by its title (choice labels repeat across moments: "Take it in", "Let it go"), the choice beside its effect.
    for (const m of MOMENTS) { const c = s.moments[m.id]; if (c) rows.push([m.title, `${m[c].label} · ${m[c].effect}`]); }
    for (const w of WORKS) if (s.works[w.id] > 0) rows.push([`${w.name} (${s.works[w.id]}/${w.stages.length})`, w.effect]);
    if (s.favours.clear > 0) rows.push([`${FAVOURS[0]!.name}\u00a0×${s.favours.clear}`, FAVOURS[0]!.effect]);
    for (const m of SEAMOUNTS) if (m.trial && s.meta.seen.includes(`trial:${m.id}`)) rows.push([UI.learnedOn(m.name.toLowerCase()), m.trial.reward.split(': ')[1] ?? m.trial.reward]);
    if (s.meta.carriedEver.length) rows.push([UI.memoriesCarried(s.meta.carriedEver.length), UI.memoriesEffect(s.meta.carriedEver.length)]);
    shapes.hidden = rows.length === 0;
    const key = rows.map((r) => r.join(':')).join('|');
    if (key === shapesKey) return;
    shapesKey = key;
    shapesHead.textContent = `${UI.shapes} · ${rows.length}`;
    shapesList.innerHTML = '';
    for (const [k, v] of rows) shapesList.append(el('dt', '', k), el('dd', '', v));
  }
  // A replay started here on a phone: the sheet steps down to its low height, so the reef has the
  // screen (it is a sheet on a phone only; the side panel stays).
  const watchLapse = () => { if (matchMedia('(max-width: 559px), (max-width: 799px) and (min-height: 501px)').matches) setSheet('low', false); };
  // The whole climb replayed (after the Silt Floor: before it, the zone's replay is the whole climb).
  const wholeLapse = button('plain', UI.timelapseWhole + (matchMedia('(pointer: coarse) and (hover: none)').matches ? '' : UI.timelapseWholeKey), () => { watchLapse(); hooks.timelapse(true); });
  reefPage.append(
    nameRow,
    paletteBox,
    shapes,
    guide,
    group(UI.saves),
    el('p', 'hint', UI.autosave), backupNote, pair(exportBtn, fileBtn), pair(loadFileBtn, importBtn), fileInput,
    group(UI.sound), musicRow, volRow, buzzToggle,
    group(UI.display), button('plain', UI.timelapse + (matchMedia('(pointer: coarse) and (hover: none)').matches ? '' : UI.timelapseKey), () => { watchLapse(); hooks.timelapse(); }),
    wholeLapse, glowToggle, sharpToggle, calmToggle, bigToggle, sciToggle, quietToggle, notifyToggle, habitToggle,
    el('p', 'hint keys-hint', UI.keys),
    el('p', 'hint touch-hint sheet-only', UI.touchHint),
    el('p', 'hint touch-hint side-only', UI.touchHintSide),
    group(UI.startOver), resetBtn,
    el('p', 'hint about', UI.about),
  );

  /** Nudge toward copying a save when the reef is worth keeping and no copy is recent. */
  function setBackupDue(due: boolean): void {
    reefDot.hidden = !due;
    backupNote.hidden = !due;
  }

  // On a phone the sheet has a grabber and three heights: low (the stocks' values, the tabs and the
  // quick buys; the reef takes two thirds of the screen), the usual half, and tall (more cards).
  // Drag up or down a step; a tap on the grabber goes between half and tall (from low, to half).
  // Low is remembered: a player who likes the reef big keeps it big.
  const grabber = button('grabber', '', () => setSheet(panel.classList.contains('tall') ? 'half' : panel.classList.contains('low') ? 'half' : 'tall'));
  grabber.setAttribute('aria-label', UI.sheetUp);
  grabber.setAttribute('aria-expanded', 'false');
  type Sheet = 'low' | 'half' | 'tall';
  function sheetNow(): Sheet {
    return panel.classList.contains('tall') ? 'tall' : panel.classList.contains('low') ? 'low' : 'half';
  }
  /** `remember` false: for now only (a replay asks for the screen; the player's own height is kept). */
  function setSheet(to: Sheet, remember = true): void {
    panel.classList.toggle('tall', to === 'tall');
    panel.classList.toggle('low', to === 'low');
    grabber.setAttribute('aria-expanded', String(to === 'tall'));
    grabber.setAttribute('aria-label', to === 'tall' ? UI.sheetDown : UI.sheetUp);
    if (to !== 'tall' && remember) try { localStorage.setItem('corallum.sheet', to); } catch { /* private mode */ }
  }
  /** Tall, or back down from it to where the player keeps the sheet. */
  function setTall(on: boolean): void {
    let kept: string | null = null;
    try { kept = localStorage.getItem('corallum.sheet'); } catch { /* private mode */ }
    setSheet(on ? 'tall' : kept === 'low' ? 'low' : 'half');
  }
  try { if (localStorage.getItem('corallum.sheet') === 'low') panel.classList.add('low'); } catch { /* private mode */ }
  {
    // The grabber and the stocks under it both drag: up draws the sheet up, down lets it fall.
    // A move under 24 px is a tap (a stock's note, the grabber's toggle).
    for (const handle of [grabber, stocks] as HTMLElement[]) {
      let y0 = NaN, dragged = false;
      handle.addEventListener('pointerdown', (e) => {
        if (getComputedStyle(grabber).display === 'none') return;
        y0 = e.clientY;
        dragged = false;
        handle.setPointerCapture(e.pointerId);
      });
      handle.addEventListener('pointermove', (e) => {
        if (Number.isNaN(y0) || dragged) return;
        const dy = e.clientY - y0;
        if (Math.abs(dy) < 24) return;
        dragged = true;
        const now = sheetNow();
        setSheet(dy < 0 ? (now === 'low' ? 'half' : 'tall') : now === 'tall' ? 'half' : 'low');
      });
      handle.addEventListener('pointerup', () => { y0 = NaN; });
      handle.addEventListener('pointercancel', () => { y0 = NaN; });
      // A drag already chose; the click that follows it does not toggle back or open a note.
      handle.addEventListener('click', (e) => { if (dragged) { e.stopImmediatePropagation(); dragged = false; } }, { capture: true });
    }
    // Drawn up, a tap on the strip of scene above it brings the reef back (and is not a sweep).
    // Taps on the buttons over the scene (sound, view) still work.
    let swallow = false;
    window.addEventListener('pointerdown', (e) => {
      swallow = false;
      if (!panel.classList.contains('tall') || !(e.target instanceof HTMLCanvasElement)) return;
      // Hidden (view mode), the sheet just drops back and the tap is a sweep as usual.
      if (panel.getClientRects().length === 0) { setTall(false); return; }
      swallow = true;
      e.stopPropagation();
      setTall(false);
    }, { capture: true });
    for (const type of ['pointerup', 'click'] as const) {
      window.addEventListener(type, (e) => { if (swallow && e.target instanceof HTMLCanvasElement) e.stopPropagation(); if (type === 'click') swallow = false; }, { capture: true });
    }
  }
  panel.append(grabber, stocks, stockNote, tabs, pages);
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
  // A card with a list (the shortcuts): term and meaning, side by side.
  const readerRows = el('dl', 'reader-rows');
  readerRows.hidden = true;
  reader.setAttribute('role', 'dialog');
  reader.setAttribute('aria-modal', 'true');
  reader.setAttribute('aria-labelledby', 'reader-title');
  readerText.id = 'reader-text';
  reader.setAttribute('aria-describedby', 'reader-text');
  // A key press in the first moments after a story opens was meant for something else (Space
  // sweeping as the card came up): it does not close the story unread. A tap or click does.
  let openedAt = 0;
  const readerClose = button('plain', 'Continue', (e) => { if (e.detail === 0 && performance.now() - openedAt < 800) return; closeReader(); });
  readerCard.append(readerKicker, readerTitle, readerRows, readerText, readerClose);
  reader.append(readerCard);
  host.append(reader);
  const queue: Story[] = [];
  let held = false;
  let heldUntil = 0;
  /** The story on screen, so the away summary can put it back in line. */
  let current: Story | null = null;
  function openStory(st: Story): void {
    hooks.storyShown?.();
    current = st;
    readerKicker.textContent = st.kicker;
    readerTitle.textContent = st.title;
    readerText.textContent = st.text;
    readerRows.replaceChildren(...(st.rows ?? []).flatMap(([k, v]) => [el('dt', '', k), el('dd', '', v)]));
    readerRows.hidden = !st.rows;
    readerCard.classList.toggle('has-rows', !!st.rows);
    reader.hidden = false;
    openedAt = performance.now();
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
  // Ossel's gift left untaken (closed in a hurry, or by Escape) is not lost: the first, the haul, is taken.
  let untakenGift: (() => void) | null = null;
  const awayClose = button('plain', UI.awayClose, () => {
    untakenGift?.();
    untakenGift = null;
    away.hidden = true;
    const next = queue.shift();
    if (next) openStory(next);
  });
  // A welcome-back gift after a long time away: two buttons, one to take.
  const welcomeBox = el('div', 'welcome');
  welcomeBox.hidden = true;
  const awayTitle = el('h2', '', UI.awayTitle);
  awayCard.append(awayTitle, awayText, awayList, welcomeBox, awayHint, awayClose);
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
    li.dataset.metres = String(b.metres);
    bandList.prepend(li);
  }
  /** A story met live goes on top; one from a loaded save sits by its height, above the last band laid below it. */
  function addAt(li: HTMLLIElement, metres: number): void {
    const anchor = primed ? null : [...bandList.querySelectorAll<HTMLLIElement>(':scope > li[data-metres]')].find((x) => Number(x.dataset.metres) <= metres);
    if (anchor) anchor.before(li);
    else if (primed || !bandList.querySelector(':scope > li[data-metres]')) bandList.prepend(li);
    else bandList.append(li);
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
    addAt(storyItem('found', x.name, relicStory(x), 'is-relic'), x.metres);
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
  let jobGains: { feed: number; light: number; perLight: number } | null = null;
  let raspBest = -1;
  let raspHold = -1;
  let tickZone = -1;
  // ---------- Choices waiting: a strip of chips at the top of the Grow tab ----------
  // When two or more choice cards are open, each gets a chip named by its kicker; a tap scrolls to it.
  const waitBar = el('div', 'wait-bar');
  waitBar.hidden = true;
  grow.prepend(waitBar);
  // ---------- Quick buys (from the Midnight Water on) ----------
  // The zone's own systems push the three everyday cards far down the panel: a row of three
  // small buttons keeps them in reach (press and hold to keep buying, as on the cards).
  const quick = el('div', 'quick-buy');
  quick.hidden = true;
  const quickBtns = UI.quickBuy.map(([id, label]) => {
    const btn = button(`buy quick ${upgrade(id).currency}`, '', () => { if (!held.repeated) hooks.buy(id); });
    const held = repeatWhileHeld(btn, () => hooks.buy(id));
    const name = el('span', 'quick-name');
    name.append(upgradeIcon(id), label);
    const price = el('span', 'quick-cost');
    btn.append(name, price);
    btn.setAttribute('aria-label', upgrade(id).name);
    const title = `${upgrade(id).name} (${({ polyp: 'P', skeleton: 'B', symbiont: 'G' } as Record<string, string>)[id]})`;
    btn.title = title;
    quick.append(btn);
    return { id, btn, price, title };
  });
  // Above the scrolling list, so nothing passes under it (it would need a backdrop, and no flat
  // colour matches the panel's tint over the blurred scene). A phone on its side has little
  // height: there the row is the list's first line and scrolls away with it.
  const shortScreen = matchMedia('(max-height: 500px)');
  const placeQuick = () => {
    if (shortScreen.matches) { if (quick.parentElement !== grow) grow.prepend(quick); }
    else if (quick.nextElementSibling !== pages) pages.before(quick);
  };
  shortScreen.addEventListener('change', placeQuick);
  placeQuick();
  // Above the list, the quick buys belong to the Grow tab: shown again at once on coming back.
  syncQuick = (tab) => {
    if (quick.parentElement !== grow) quick.hidden = tab !== 'grow' || !lastState || actAt(lastState.height) < 2 || ended(lastState);
  };
  // Scrolled, the list fades out at its top edge instead of being cut there.
  pages.addEventListener('scroll', () => { const on = pages.scrollTop > 4; if (pages.classList.contains('scrolled') !== on) pages.classList.toggle('scrolled', on); }, { passive: true });
  let waitKey = '';
  function renderWaitBar(): void {
    const open = [...grow.querySelectorAll<HTMLElement>(':scope > section:not([hidden])')]
      .map((sec) => ({ sec, label: sec.querySelector('.truce-kicker')?.textContent ?? '' }))
      .filter((x) => x.label);
    // Which choice a box holds: its kicker and title (one box shows many moments under one kicker).
    const choiceKey = (sec: HTMLElement) => `${sec.querySelector('.truce-kicker')?.textContent ?? ''}|${sec.querySelector('h3')?.textContent ?? ''}`;
    const key = open.map((x) => choiceKey(x.sec)).join('||');
    const keys = open.map((x) => choiceKey(x.sec));
    if (currentTab === 'grow' || !keys.length) growSeen = new Set(keys);
    // Only something new calls (answering one leaves the rest as they were seen).
    // A rising to send the feeders into or an upwelling to turn toward (controls in the Grow tab,
    // gone in a minute or two) calls too, while another tab is open.
    const up = lastState ? currentUpwelling(lastState) : null;
    const timed = !!lastState && currentTab !== 'grow' && (canFeedRising(lastState) || (!!up && lastState.upwelled !== up.k));
    const unseen = keys.some((k) => !growSeen.has(k)) || timed;
    if (growDot.hidden === unseen) growDot.hidden = !unseen;
    if (key === waitKey) return;
    waitKey = key;
    // A choice that may wait can be folded to its kicker ("Later"); a new choice in the same box opens unfolded.
    for (const { sec } of open) {
      if (!sec.classList.contains('moment')) continue;
      if (!sec.querySelector(':scope > .later-btn')) {
        const later = button('later-btn', UI.later, () => {
          sec.classList.add('later'); delete sec.dataset.auto; sec.dataset.laterFor = choiceKey(sec);
          if (openChoice === sec) openChoice = null;
          if (picked === sec) picked = null;
          renderChips();
        });
        sec.append(later);
        // Folded, its kicker is a button for the keyboard too.
        const kick = sec.querySelector<HTMLElement>('.truce-kicker');
        kick?.addEventListener('keydown', (e) => {
          if ((e.key === 'Enter' || e.key === ' ') && sec.classList.contains('later') && keyed(kick)) {
            e.preventDefault();
            e.stopPropagation();
            sec.classList.remove('later'); delete sec.dataset.auto; openChoice = picked = sec;
            renderChips();
            sec.querySelector<HTMLElement>('button:not(.later-btn):not([hidden])')?.focus();
          }
        });
        // A tap on a folded choice opens it (and takes the tap); a lamp pressed by key opens it and goes through.
        sec.addEventListener('click', (e) => {
          if (!sec.classList.contains('later') || e.target === later) return;
          if (e.isTrusted) e.stopPropagation();
          sec.classList.remove('later'); delete sec.dataset.auto; openChoice = picked = sec;
          renderChips();
        }, true);
        sec.title = '';
      }
      if (sec.classList.contains('later') && sec.dataset.laterFor !== choiceKey(sec)) { sec.classList.remove('later'); delete sec.dataset.auto; }
      // The newest choice is the one shown open (a wish on falling stars does not wait).
      // A choice that runs out takes the slot even from one the player opened.
      if (shownKey.get(sec) !== choiceKey(sec)) {
        shownKey.set(sec, choiceKey(sec));
        // A new choice opens only when none is open; else it waits folded, its line telling what it is.
        const openNow = !!openChoice && openChoice !== sec && !openChoice.hidden && !openChoice.classList.contains('later');
        if (!sec.classList.contains('later') && !sec.classList.contains('timed') && !openNow) openChoice = sec;
      }
    }
    renderChips();
  }
  // The waiting choice shown open; the others wait folded to their one line until it is answered
  // (a choice the player put off with Later stays folded).
  let openChoice: HTMLElement | null = null, picked: HTMLElement | null = null;
  const shownKey = new WeakMap<HTMLElement, string>();
  function settleChoices(): void {
    const waiting = [...grow.querySelectorAll<HTMLElement>(':scope > section.moment:not([hidden])')]
      .filter((sec) => sec.querySelector(':scope > .later-btn') && sec.querySelector('.truce-kicker')?.textContent)
      .filter((sec) => !sec.classList.contains('later') || sec.dataset.auto === '1');
    // One choice is open: the one the player opened, else the one open first. A choice that runs out (a wish,
    // a signal, a spawning) opens beside it while it lasts, so it never folds what is being read.
    if (picked && !waiting.includes(picked)) picked = null;
    const lasting = waiting.filter((sec) => !sec.classList.contains('timed'));
    const keep = picked ?? (openChoice && lasting.includes(openChoice) ? openChoice : lasting[0] ?? null);
    for (const sec of waiting) {
      const fold = sec !== keep && !sec.classList.contains('timed');
      if (sec.classList.contains('later') !== fold) sec.classList.toggle('later', fold);
      if (fold) { sec.dataset.auto = '1'; sec.dataset.laterFor = `${sec.querySelector('.truce-kicker')?.textContent ?? ''}|${sec.querySelector('h3')?.textContent ?? ''}`; }
      else delete sec.dataset.auto;
    }
    openChoice = keep;
  }
  /** Chips to jump to the open choices; a choice folded for later is a row right there, no chip. */
  function renderChips(): void {
    settleChoices();
    for (const sec of grow.querySelectorAll<HTMLElement>(':scope > section.moment')) {
      const kick = sec.querySelector<HTMLElement>('.truce-kicker');
      if (!kick || !sec.querySelector(':scope > .later-btn')) continue;
      const folded = sec.classList.contains('later');
      if (folded) { kick.tabIndex = 0; kick.setAttribute('role', 'button'); kick.setAttribute('aria-expanded', 'false'); }
      else if (kick.hasAttribute('role')) { kick.removeAttribute('tabindex'); kick.removeAttribute('role'); kick.removeAttribute('aria-expanded'); }
    }
    const open = [...grow.querySelectorAll<HTMLElement>(':scope > section:not([hidden]):not(.later)')]
      .map((sec) => ({ sec, label: sec.querySelector('.truce-kicker')?.textContent ?? '' }))
      .filter((x) => x.label);
    // Only worth a strip when choices the player opened by hand stack up (a timed one beside the open
    // one is right there).
    waitBar.hidden = open.filter((x) => !x.sec.classList.contains('timed')).length < 2;
    waitBar.innerHTML = '';
    for (const x of open) waitBar.append(button('wait-chip', x.label, () => x.sec.scrollIntoView({ behavior: smoothScroll(), block: 'start' })));
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
      calcite.setSub(`${rate(calciteRate(s, r))} · holds ~${num(calciteHold(s, r))}`);
      calcite.row.classList.toggle('falling', calciteNet(s, r) < 0);
      glow.row.hidden = !(s.levels.symbiont > 0 || s.glow > 0.05);
      glow.value.textContent = num(s.glow);
      glow.setSub(`${flow(glowNet(s, r), s.glow, glowHold(s, r))} · holds ~${num(glowHold(s, r))}`);
      plankton.row.hidden = !(s.jobs.feed > 0 || s.plankton > 0.05);
      plankton.value.textContent = num(s.plankton);
      plankton.setSub(`${flow(planktonNet(s, r))} · ×${factor(feeding(s.plankton))} calcite`);
      // Murmurs pay for Readings and the truce's words; once both are done the stock leaves the panel.
      // Murmurs buy Readings (none on a silent seamount) and the truce's words.
      const murmursWanted = (!seamountDef(s.seamount).noReadings && s.readings.length < READINGS.length) || MEETINGS.some((m) => !s.truce[m.id]);
      murmurs.row.hidden = !(s.jobs.scout > 0 || (s.murmurs > 0.05 && murmursWanted));
      const actNow = actAt(s.height);
      const minor = [...homeAct].filter(([st, home]) => actNow >= home + 2 && !st.row.classList.contains('falling')).map(([st]) => st);
      const key = minor.map((st) => st.row.className).join();
      if (key !== minorKey) {
        minorKey = key;
        for (const st of [glow, plankton, murmurs, silt, sand, bloom, spawn]) {
          if (minor.includes(st)) minorBox.append(st.row);
          else stocks.insertBefore(st.row, minorBox);
        }
      }
      minorBox.hidden = !minor.some((st) => !st.row.hidden);
      // Three or more stocks: a tighter grid (one-line rates, up to four to a row on a phone), so the cards keep their room.
      const shown = [...stocks.children].filter((c) => !(c as HTMLElement).hidden && c.classList.contains('stock') && !c.classList.contains('height')).length;
      stocks.classList.toggle('many', shown >= 3);
      if (stocks.dataset.n !== String(shown)) stocks.dataset.n = String(shown);
      // Two to a row with an odd count leaves a cell beside the last stock: the small line takes it.
      minorBox.classList.toggle('fill', shown % 2 === 1);
      murmurs.value.textContent = num(s.murmurs);
      murmurs.setSub(`${flow(murmurNet(s, r), s.murmurs, s.jobs.scout > 0 ? murmurHold(s, r) : Infinity)} · ${s.jobs.scout > 0 ? `holds ~${num(murmurHold(s, r))}` : UI.murmursUnheard}`);
      silt.row.hidden = !(r.siltP > 0 || s.silt > 0.5);
      silt.value.textContent = num(s.silt);
      silt.setSub(`${flow(siltNet(s, r))} · polyps\u00a0×${smother(s.silt).toFixed(2)}`);
      silt.row.classList.toggle('falling', smother(s.silt) < 0.5);
      sand.row.hidden = !(r.sandP > 0 || s.sand > 0.5);
      sand.value.textContent = num(s.sand);
      sand.setSub(`${flow(sandNet(s, r), s.sand, sandHold(s, r))} · holds ~${num(sandHold(s, r))}`);
      bloom.row.hidden = !(r.bloomP > 0 || s.bloom > 0.5);
      bloom.value.textContent = num(s.bloom);
      bloom.setSub(`${flow(bloomNet(s, r))} · ×${factor(photo(s.bloom))} calcite`);
      spawn.row.hidden = !(r.spawnP > 0 || s.spawn > 0.5);
      spawn.value.textContent = num(s.spawn);
      // Toward the spawn the moon needs, or (once there) that it is enough; nothing more after the ending.
      // Once there is enough for the moon, that is all it needs to say.
      spawn.setSub(`${rate(spawnNet(s, r))} · ${ended(s) ? `holds ~${num(spawnHold(s, r))}` : s.spawn >= spawnTarget(s) ? UI.spawnEnough : `of ${num(spawnTarget(s))} · holds ~${num(spawnHold(s, r))}`}`);
      for (const [st, v] of [[calcite, s.calcite], [glow, s.glow], [plankton, s.plankton], [murmurs, s.murmurs], [silt, s.silt], [sand, s.sand], [bloom, s.bloom], [spawn, s.spawn]] as const) {
        if (!st.row.hidden) pulse(st.value, v);
      }

      // Dialects.
      const tier = nextTier(s);
      dialectBox.hidden = !tier;
      if (tier) {
        dialectKicker.textContent = UI.dialectKicker(tier.title);
        dialectIntro.textContent = tier.intro;
        const tc = tierCost(s, tier);
        const ok = s.bloom >= tc;
        dialectCost.textContent = ok
          ? UI.dialectCost(num(tc))
          : UI.dialectSaving(num(tc), num(s.bloom), etaText(timeUntil(s, 'bloom', tc)));
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
        if (raspSlider.max !== String(rmax)) raspSlider.max = String(rmax);
        if (document.activeElement !== raspSlider && raspSlider.value !== String(s.rasp)) raspSlider.value = String(s.rasp);
        const graze = `${s.rasp}\u00a0of\u00a0${rmax} grazing`;
        if (raspCount.textContent !== graze) raspCount.textContent = graze;
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
          ? UI.raspBest(mark(raspBest))
          : UI.raspBoth(mark(raspBest), mark(raspHold));
        currentRow.hidden = actAt(s.height) < 3;
        // An upwelling waiting to be caught takes over the line under the dial, and the steps that
        // would catch it beckon (a tap on one turns the current: already that way, the tap still catches).
        const up = currentUpwelling(s);
        const waiting = !!up && s.upwelled !== up.k;
        for (const x of currentButtons) {
          x.b.classList.toggle('on', x.c === s.current);
          x.b.classList.toggle('toward', waiting && Math.sign(x.c) === up!.side);
        }
        currentWhat.textContent = waiting
          ? (Math.sign(s.current) === up!.side ? UPWELL.already : UPWELL.now)(up!.side, duration(up!.start + UPWELL.life - s.t))
          : CURRENT.what(s.current);
        currentRow.classList.toggle('upwelling', waiting);
        // Folded, the section still shows the current while an upwelling waits (the turn is made there).
        raspBox.classList.toggle('calls', waiting);
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
        ticksPassedKey = '';
        for (const b of BANDS) {
          if (b.metres <= zone.from || b.metres > zone.to) continue;
          const tk = el('i', 'tick');
          tk.style.left = `${frac(b.metres)}%`;
          tk.dataset.band = b.id;
          tk.title = `${metres(b.metres)}: ${b.title}`;
          heightBar.append(tk);
        }
      }
      // Ticks passed: marked again only when a band is read or the ticks were redrawn.
      const passedKey = String(s.bands.length);
      if (passedKey !== ticksPassedKey) {
        ticksPassedKey = passedKey;
        for (const tk of heightBar.querySelectorAll<HTMLElement>('.tick')) tk.classList.toggle('passed', s.bands.includes(tk.dataset.band!));
      }
      heightTarget.style.width = `${frac(r.heightTarget)}%`;
      // Thousands with a comma ("2,149 m down"), without toLocaleString (a formatter made per call: the update's dearest line).
      const depth = UI.metresDown(String(Math.round(Math.max(0, SURFACE - s.height))).replace(/\B(?=(\d{3})+$)/g, ','));
      // The next band still above the reef (one at the reef's own height is being read already).
      const next = BANDS.find((b) => !s.bands.includes(b.id) && b.metres > s.height + 0.05);
      // Reach: what the height itself does (a taller reef catches more water, more calcite).
      // (No-break spaces inside: it wraps as a whole, never leaving "calcite" on a line of its own.)
      const reachText = s.height > 60 ? UI.reachNote(reach(s.height).toFixed(1)) : '';
      if (heightSub.title !== UI.reachTitle) heightSub.title = UI.reachTitle;
      heightSub.textContent = r.heightTarget > s.height + 0.05
        ? UI.risingTo(depth, metres(r.heightTarget))
        : next ? UI.nextBandAt(depth, metres(next.metres)) + reachText : `${depth}${reachText}`;

      // Shoals.
      const shoals = s.levels.shoal;
      setShown(shoalBox, shoals > 0);
      if (shoals > 0) {
        const idle = idleShoals(s);
        const gone = awayShoals(s);
        const sea = seasoned(s);
        shoalIdle.textContent = (sea > 1 ? `${EXPEDITION.seasonedWord}\u00a0×${sea.toFixed(2)} · ` : '') + (idle > 0 ? UI.shoalsIdle(idle) : '') + (gone > 0 ? UI.shoalsAway(gone) : '') + (idle > 0 || gone > 0 ? UI.shoalsOf(shoals) : `${shoals}`);
        shoalBox.classList.toggle('has-idle', idle > 0);
        const perFeed = s.jobs.feed > 0 ? r.planktonP / s.jobs.feed : 0;
        // What one more feeder or light-swimmer is worth in calcite, and the glow each light-swimmer
        // adds (the glow with them against the glow without: every multiplier counted), refreshed a
        // few times a second.
        if (etaTurn === 0 || !jobGains) {
          const noLight = s.jobs.light > 0 ? rates({ ...s, jobs: { ...s.jobs, light: 0 } }).glowP : r.glowP;
          jobGains = { feed: jobGain(s, 'feed'), light: jobGain(s, 'light'), perLight: s.jobs.light > 0 ? (r.glowP - noLight) / s.jobs.light : 0 };
        }
        const perLight = s.jobs.light > 0 ? jobGains.perLight : 0;
        const gainText = (g: number) => g >= 0.0005 ? UI.oneMore((g * 100).toFixed(g < 0.1 ? 1 : 0)) : UI.oneMoreNothing;
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
          row.what.textContent = !open ? (j.id === 'fan' ? FAN.locked : UI.scoutLocked)
            : j.id === 'fan' ? FAN.what(FAN.sweep.toFixed(3))
            : j.id === 'guard' ? GUARD.what(s.jobs.guard, GUARD.need)
            : j.id === 'feed' ? (perFeed ? UI.feedEach(rate(perFeed)) : UI.feedIdle) + gainText(jobGains.feed)
            : j.id === 'light' ? (perLight ? UI.lightEach(rate(perLight)) : UI.lightIdle) + gainText(jobGains.light)
            : perScout ? UI.scoutEach(rate(perScout)) : UI.scoutIdle;
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
        // Flurries and milky seas pay sweeps: nothing to plan for on a reef vowed to stillness.
        const sweeping = !s.vows.includes('still');
        const fl = untilFlurry(s);
        if (fl < 1200 && sweeping) soon.push([fl, FLURRY.word + ' (sweeps ×3)']);
        const mk = untilMilky(s);
        if (mk < 1200 && sweeping) soon.push([mk, MILKY.word]);
        if (th < 1200 && kind) soon.push([th, WATER.intruder[kind]!]);
        const uw = untilUpwelling(s);
        if (uw < 1200) soon.push([uw, UPWELL.word]);
        const day = DAYS.find((d) => d.id === s.meta.today);
        const vis = visitor(s);
        const visName = vis ? CREATURES.find((c) => c.id === vis)?.name.toLowerCase() : '';
        // A first reef's first minutes leave out the day and its visitor (glow, lineage: words not met yet).
        const firstMinutes = s.meta.spawnings === 0 && s.height < 1;
        const today = firstMinutes ? '' : [day ? `${TODAY.label}: ${day.name.toLowerCase()} · ${day.effect}` : '',
          visName ? `${TODAY.visitor}: ${visName} (${visited(s) ? TODAY.visited : TODAY.visitorGift})` : ''].filter(Boolean).join(' ·\u00a0');
        if (todayLine.textContent !== today) todayLine.textContent = today;
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
        const key = `${turning}|` + marks.map(([t, w]) => `${Math.round(t / 12)}${w}`).join('|');
        if (key !== almanacKey) {
          almanacKey = key;
          almanac.innerHTML = '';
          // A new reef has little to plan: the strip waits until the water turns and two things are coming.
          almanac.hidden = !turning || marks.length < 2;
          almanacNote.hidden = almanac.hidden;
          // Each label goes in the first of three rows where it runs into no other. Things that happen
          // (a feast, an intruder, the rising…) are placed first, the water's turns after: when room
          // runs out, a turn of the water loses its label before something to act on does.
          const W = almanac.clientWidth || 300;
          const labelOf = (w: string) => w.replace(/^(a|an|the) /, '').split(' (')[0]!;
          // Dots under 20 px apart (things due within a minute or two of each other) share one
          // centre for their labels, so the labels stacked under them line up instead of each
          // sitting a little off the one above.
          const dotX = marks.map(([t]) => (Math.max(0, t) / 1200) * W);
          const anchor = dotX.slice();
          for (let i = 0; i < marks.length;) {
            let j = i + 1;
            while (j < marks.length && dotX[j]! - dotX[j - 1]! < 20) j++;
            const mid = dotX.slice(i, j).reduce((a, x) => a + x, 0) / (j - i);
            for (let k = i; k < j; k++) anchor[k] = mid;
            i = j;
          }
          // Where a label really sits: centred on its group's centre, kept inside the strip.
          const span = (i: number): [number, number] => {
            const wide = labelOf(marks[i]![1]).length * 5.8 + 8;
            const left = Math.min(Math.max(anchor[i]! - wide / 2, 0), W - wide);
            return [left, left + wide];
          };
          const waterNames = new Set(WATERS.map((x) => x.name.toLowerCase()));
          const order = marks.map((_, i) => i).sort((i, j) => Number(waterNames.has(marks[i]![1])) - Number(waterNames.has(marks[j]![1])) || i - j);
          const rows: [number, number][][] = [[], [], []];
          const rowOf = new Map<number, number>();
          for (const i of order) {
            const [a, b] = span(i);
            // No room in any row: the mark keeps its dot and tooltip, without a label.
            const r = rows.findIndex((row) => row.every(([c, d]) => b < c || a > d));
            if (r >= 0) { rows[r]!.push([a, b]); rowOf.set(i, r); }
          }
          marks.forEach(([t, w], i) => {
            const label = labelOf(w);
            const cx = (Math.max(0, t) / 1200) * W;
            const row = rowOf.get(i) ?? -1;
            const m = el('span', `mark row${row}${t <= 0 ? ' now' : ''}`);
            m.style.left = `${(Math.max(0, t) / 1200) * 100}%`;
            m.title = `${w} ${t > 0 ? `in ${duration(t)}` : WATER.now}`;
            m.addEventListener('click', () => {
              almanacNote.textContent = m.title;
              // A snapshot of the time left: cleared before it goes stale.
              const said = m.title;
              setTimeout(() => { if (almanacNote.textContent === said) almanacNote.textContent = ''; }, 5000);
            });
            m.append(el('i'));
            const lb = row >= 0 ? el('b', '', label) : null;
            if (lb) m.append(lb);
            almanac.append(m);
            // The dot stays on its time; the label moves to its group's centre, and near an end
            // slides inward to keep inside the card.
            if (lb) {
              const bw = lb.offsetWidth, at = anchor[i]!;
              const shift = Math.min(Math.max(at - bw / 2, 0), W - bw) - (cx - bw / 2);
              if (Math.abs(shift) > 0.5) lb.style.transform = `translateX(${shift.toFixed(1)}px)`;
            }
          });
        }
        // What is happening already is told apart from what is coming.
        // Each thing kept whole on its line ("full moon in 3m 24s" never split after "full"); lines
        // break before a "·", between things.
        const whole = (x: string) => x.replace(/ /g, '\u00a0');
        const nowList = soon.filter(([t]) => t <= 0).map(([, w]) => whole(w));
        const later = soon.filter(([t]) => t > 0).map(([t, w]) => whole(`${w} in ${duration(t)}`));
        const head = [
          nowList.length ? `${WATER.happening}: ${nowList.join(' ·\u00a0')}` : '',
          later.length ? `${WATER.soon}: ${later[0]}` : '',
        ].filter(Boolean).join('. ');
        const rest = later.slice(1).map((w) => ` ·\u00a0${w}`).join('');
        if (soonHead.textContent !== head) soonHead.textContent = head;
        if (soonRest.textContent !== rest) soonRest.textContent = rest;
        waterSoon.hidden = !head;
        if (waterBox.classList.contains('charted') !== !almanac.hidden) {
          waterBox.classList.toggle('charted', !almanac.hidden);
          if (almanac.hidden) { waterName.removeAttribute('role'); waterName.removeAttribute('tabindex'); }
          else { waterName.setAttribute('role', 'button'); waterName.tabIndex = 0; }
        }
        if (waterShown && waterShown !== water.id) { waterBox.classList.remove('turned'); void waterBox.offsetWidth; waterBox.classList.add('turned'); }
        waterShown = water.id;
      }

      // Ossel's request.
      const rq = currentRequest(s);
      // Its slot is kept from the start for the same reason; empty until the first request.
      // A reef vowed to quiet hears no requests: no slot for them either.
      askBox.hidden = s.vows.includes('quiet');
      askBox.classList.toggle('waiting', !rq);
      askKind = rq?.def.kind ?? '';
      const goes = !!askTarget();
      if (askBox.classList.contains('goes') !== goes) {
        askBox.classList.toggle('goes', goes);
        // Reachable by Tab too, when it leads somewhere.
        if (goes) { askBox.tabIndex = 0; askBox.setAttribute('role', 'button'); }
        else { askBox.removeAttribute('tabindex'); askBox.removeAttribute('role'); }
      }
      if (rq) {
        // An ask that waits for something in the water says when it comes ("· in 2m 10s", "· now").
        const k = rq.def.kind;
        const when = k === 'feast' ? untilFeast(s) : k === 'intruder' ? untilThorn(s) : k === 'milky' ? untilMilky(s) : k === 'rising' ? untilRising(s) : k === 'signal' ? untilSignal(s)
          : k === 'free' ? untilTangle(s) : k === 'stray' ? untilStray(s) : k === 'fragment' ? untilFragment(s) : k === 'shell' ? untilShell(s) : Infinity;
        const whenText = when <= 0 ? WATER.now : when < 3600 ? REQUEST.comesIn(duration(when)) : '';
        const askLine = rq.n === 1 && rq.def.one ? rq.def.one : rq.def.ask.replace('{n}', String(rq.n));
        if (askText.firstChild?.textContent !== askLine) askText.replaceChildren(askLine, askWhen);
        // (Unless it is saying, for a moment, when another ask may be had.)
        if (performance.now() > skipSaidUntil) {
          if (askWhen.textContent !== whenText) askWhen.textContent = whenText;
          askWhen.classList.toggle('now', when <= 0);
        }
        askFill.style.width = `${(rq.got / rq.n) * 100}%`;
        askCount.textContent = `${rq.got}/${rq.n}`;
        // One-step asks need no bar and no "0/1"; a streak goes up with the kicker, out of the text's way.
        askBar.hidden = rq.n === 1;
        askCount.hidden = rq.n === 1;
        askKicker.textContent = s.request.streak > 1 ? `${REQUEST.kicker} · ${s.request.streak} ${REQUEST.streakWord}` : REQUEST.kicker;
        const skipWaits = !canSkipRequest(s);
        if (askSkip.getAttribute('aria-disabled') !== String(skipWaits)) askSkip.setAttribute('aria-disabled', String(skipWaits));
        // Waiting to be allowed another: the tooltip says how long.
        const skipTitle = skipWaits ? REQUEST.skipAgain(duration(Math.max(1, s.request.skipped + REQUEST.skipEvery - s.t))) : REQUEST.skip;
        if (askSkip.title !== skipTitle) askSkip.title = skipTitle;
      }

      choices.update(s);
      renderWaitBar();
      // Above the list it belongs to the Grow tab only (inside, it hides with its page).
      quick.hidden = actAt(s.height) < 2 || ended(s) || (quick.parentElement !== grow && currentTab !== 'grow');
      if (!quick.hidden) for (const q of quickBtns) {
        const gone = !revealed(s, q.id) || maxed(s, q.id);
        q.btn.hidden = gone;
        if (gone) continue;
        const text = num(cost(s, q.id));
        if (q.price.textContent !== text) q.price.textContent = text;
        q.btn.disabled = !canAfford(s, q.id);
      }

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
        addAt(storyItem('moment', m.title, st, 'is-moment'), m.metres);
        listed(true);
        if (primed) showStory(st);
      }

      prepRow.hidden = !(raspMax(s) > 0 || s.levels.shoal > 0 || s.meta.dreams > 0 || s.height >= FLARE.fromHeight);
      flareBtn.hidden = s.height < FLARE.fromHeight || ended(s);
      flareBtn.disabled = !canFlare(s);
      flareBtn.textContent = canFlare(s) ? FLARE.label : `${FLARE.short} ${Math.ceil(FLARE.cooldown - (s.t - s.lastFlare))}s`;
      prepBtn.hidden = !(raspMax(s) > 0 || s.levels.shoal > 0);
      dreamBtn.hidden = s.meta.dreams <= 0 || ended(s);
      dreamBtn.textContent = DREAM.label(s.meta.dreams);

      // Residents: who may move in, and who has.
      const nHomes = homes(s);
      setShown(homeBox, nHomes > 0);
      if (nHomes > 0) {
        const asking = residentsAsking(s);
        homeCount.textContent = `${s.residents.length}\u00a0of\u00a0${nHomes} home${nHomes === 1 ? '' : 's'}`;
        homeIntro.hidden = s.residents.length > 0;
        // Folded, it still says when someone asks to move in and there is room.
        homeBox.classList.toggle('calls', s.residents.length < nHomes && asking.some((r) => !s.residents.includes(r.id)));
        // Pairings: the ones living now, else a hint at those within reach.
        const live = PAIRS.filter((p) => s.residents.includes(p.a) && s.residents.includes(p.b));
        pairLine.textContent = live.length ? live.map((p) => `${p.name}: ${p.effect}`).join(' ·\u00a0') : nHomes >= 2 ? RESIDENT.pairHint : '';
        const full = s.residents.length >= nHomes;
        const waiting = asking.filter((r) => !s.residents.includes(r.id)).length;
        homeMore.hidden = !full || waiting === 0;
        const moreText = homesAll ? RESIDENT.waitingOpen : RESIDENT.waiting(waiting);
        if (homeMore.textContent !== moreText) homeMore.textContent = moreText;
        for (const r of RESIDENTS) {
          const h = homeRows.get(r.id)!;
          const living = s.residents.includes(r.id);
          h.row.hidden = !asking.includes(r) || (full && !living && !homesAll);
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
          tripEta.textContent = UI.backIn(duration(left));
          tripCard.classList.remove('ready');
        } else {
          tripEffect.textContent = ahead.relic ? `${duration(tripSeconds(s, ahead))} away · a relic: ${ahead.effect}` : `${duration(tripSeconds(s, ahead))} away · ${ahead.effect}`;
          tripCost.textContent = `${ahead.shoals} shoals`;
          const ok = canSend(s);
          tripBtn.disabled = !ok;
          tripCard.classList.toggle('ready', ok);
          tripEta.textContent = ok ? UI.tripStops : UI.youHave(s.levels.shoal);
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
        // Stages built, like an upgrade's levels owned (the pips name the next one).
        x.level.textContent = `${n}/${x.w.stages.length}`;
        if (x.root.classList.contains('known') !== n > 0) x.root.classList.toggle('known', n > 0);
        x.pips.forEach((p, i) => p.classList.toggle('built', i < n));
        const c = workCost(s, x.w.id);
        if (!c) {
          x.costEl.textContent = WORK_TEXT.built;
          x.btn.disabled = true;
          x.eta.textContent = '';
          x.root.classList.add('maxed');
          x.root.classList.remove('ready');
          // Built in full: to the end of the list, one line, like a finished upgrade.
          if (!x.root.classList.contains('done')) {
            x.root.classList.add('done');
            finish(x.root);
          }
          continue;
        }
        const parts = Object.entries(c) as [Currency, number][];
        // Two currencies wrap, if they must, only before the "+" ("200M calcite / + 6.00k glow").
        x.costEl.textContent = parts.map(([k, v]) => `${num(v)}\u00a0${k}`).join(' +\u00a0');
        const ok = canBuild(s, x.w.id);
        x.btn.disabled = !ok;
        x.root.classList.toggle('ready', ok);
        if (ok) setEta(x.eta, 0);
        else if (etaTurn === 0 || !x.eta.textContent) {
          const waits = parts.map(([k, v]) => [k, timeUntil(s, k, v)] as const);
          setEta(x.eta, Math.max(...waits.map(([, w]) => w)), waits.find(([, w]) => !Number.isFinite(w))?.[0]);
        }
      }

      // The best buy: the calcite upgrade that pays back soonest (once per round of eta updates).
      if (etaTurn === 0) {
        let best: UpgradeId | null = null, bestBack = Infinity, rivals = 0;
        const base = steadyCalciteRate(s);
        for (const u of UPGRADES) {
          if (u.currency !== 'calcite' || u.id === 'lattice' || !revealed(s, u.id) || maxed(s, u.id) || !(base > 0)) continue;
          const g = upgradeGain(s, u.id);
          const back = g >= 0.0005 ? cost(s, u.id) / (g * base) : Infinity;
          if (back < Infinity) rivals++;
          if (back < bestBack) { bestBack = back; best = u.id; }
        }
        // With one thing to buy there is nothing to compare: no badge.
        if (rivals < 2) best = null;
        for (const [id, c] of cards) c.root.classList.toggle('best', id === best);
        for (const q of quickBtns) {
          q.btn.classList.toggle('best', q.id === best);
          const tip = `${q.title}${q.id === best ? ` · ${UI.bestBuy}` : ''}`;
          if (q.btn.title !== tip) q.btn.title = tip;
        }
      }

      // Upgrade cards.
      for (const u of UPGRADES) {
        const c = cards.get(u.id)!;
        const show = revealed(s, u.id);
        if (show && c.root.hidden && primed) c.root.classList.add('new');
        c.root.hidden = !show;
        if (!show) continue;
        const lv = s.levels[u.id];
        if (c.root.classList.contains('known') !== lv > 0) c.root.classList.toggle('known', lv > 0);
        c.level.textContent = u.maxLevel === Infinity ? (lv ? `×${lv}` : '') : `${lv}/${u.maxLevel}`;
        if (u.id === 'skeleton') c.effect.textContent = UI.bandRises(metres(bandMetres(lv)));
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
          const pct = g >= 0.0005 ? `+${(g * 100).toFixed(g < 0.1 ? 1 : 0)}%` : UI.noGain;
          c.effect.textContent = UI.nowGain(effectText(u.id), pct, u.id === 'lattice' ? UI.held : g >= 0.0005 ? UI.calciteWord : '');
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
          c.root.classList.remove('ready');
          // Finished for good (not just held back by a story gate): to the end of the list, one line.
          if (u.id !== 'skeleton' && !waiting && !c.root.classList.contains('done')) {
            c.root.classList.add('done');
            finish(c.root);
          }
          continue;
        }
        c.root.classList.remove('maxed');
        const price = cost(s, u.id);
        const watered = water.upgrades.includes(u.id);
        c.root.classList.toggle('watered', watered);
        // The ≈ before the count says why the card is blue.
        const why = watered ? WATER.cheaper : '';
        if (c.level.title !== why) c.level.title = why;
        const cur = upgrade(u.id).currency;
        c.cost.textContent = `${num(price)} ${cur}`;
        const ok = canAfford(s, u.id);
        c.btn.disabled = !ok;
        if (c.max) c.max.hidden = !ok;
        // Just affordable: the button glows once (not on the first frame, and once in 8 s per card,
        // so holding a buy button does not flicker it).
        if (ok && !c.root.classList.contains('ready') && primed && !reducedMotion.matches && !hooks.calm.get() && c.btn.animate) {
          const now = performance.now();
          if (now - (shimmered.get(u.id) ?? -1e9) > 8000) {
            shimmered.set(u.id, now);
            c.btn.animate([{ boxShadow: '0 0 0 0 rgba(150, 240, 255, 0)' }, { boxShadow: '0 0 16px 3px rgba(150, 240, 255, 0.55)' }, { boxShadow: '0 0 0 0 rgba(150, 240, 255, 0)' }], { duration: 900, easing: 'ease-out' });
          }
        }
        c.root.classList.toggle('ready', ok);
        const due = etaSlot++ === etaTurn || !c.eta.textContent;
        if (ok) {
          // Affordable and paid in calcite: how long it takes to earn back its price, once settled.
          if (due && cur === 'calcite' && u.id !== 'lattice') {
            const g = upgradeGain(s, u.id);
            const back = g >= 0.0005 ? price / (g * steadyCalciteRate(s)) : Infinity;
            c.eta.textContent = Number.isFinite(back) ? UI.paysBack(duration(back)) : '';
          } else if (cur !== 'calcite' || u.id === 'lattice') setEta(c.eta, 0);
        } else if (due) setEta(c.eta, timeUntil(s, cur, price), cur);
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
        else if (etaTurn === UPGRADES.length || !readingEta.textContent) setEta(readingEta, timeUntil(s, 'murmurs', rc), 'murmurs');
        if (!ok && s.jobs.scout === 0) readingEta.textContent = UI.scoutHint;
      }

      // New bands and readings open in the reader and join the list.
      if (s.bands.length !== lastBandCount) {
        for (const id of s.bands.slice(lastBandCount)) {
          const b = BANDS.find((x) => x.id === id);
          if (!b) continue;
          appendBand(b);
          const show = (lastBandCount > 0 || id === 'wake') && !s.meta.seen.includes(id);
          listed(show);
          if (show) showStory(bandStory(b, s.truce.wall === 'b'));
        }
        lastBandCount = s.bands.length;
      }
      if (s.readings.length !== lastReadingCount) {
        for (const id of s.readings.slice(lastReadingCount)) {
          const rd = READINGS.find((x) => x.id === id);
          if (!rd) continue;
          appendReading(rd);
          listed(!s.meta.seen.includes(id));
          if (!s.meta.seen.includes(id)) showStory(readingStory(rd));
        }
        lastReadingCount = s.readings.length;
      }
      if (s.relics.length !== lastRelicCount) {
        for (const id of s.relics.slice(lastRelicCount)) {
          const x = site(id);
          if (!x) continue;
          appendRelic(x);
          listed(!s.meta.seen.includes(`x:${id}`));
          if (primed && !s.meta.seen.includes(`x:${id}`)) showStory(relicStory(x));
        }
        lastRelicCount = s.relics.length;
      }
      for (const mt of MEETINGS) {
        const c = s.truce[mt.id];
        if (!c || truceSeen.has(mt.id)) continue;
        truceSeen.add(mt.id);
        addChoice(storyItem('truce', mt.title, truceStory(mt, c), 'is-truce'), mt.after);
        listed(true);
        if (primed) showStory(truceStory(mt, c));
      }
      for (const t of TIERS) {
        const id = s.dialects[t.tier];
        if (!id || dialectSeen.has(id)) continue;
        dialectSeen.add(id);
        const d = DIALECTS.find((x) => x.id === id)!;
        const st = { kicker: UI.dialectKicker(t.title), title: d.name, text: UI.notTheOthers(d.flavour) };
        addChoice(storyItem('dialect', d.name, st, 'is-dialect'), t.band);
        listed(true);
        if (primed) showStory(st);
      }
      // Lineage.
      const lineageOpen = canSpawnLesser(s) || s.meta.spawnings > 0 || s.meta.lineage > 0;
      tabButtons.get('lineage')!.hidden = !lineageOpen;
      // While the tab is hidden nothing is affordable: the first lineage that buys a trait calls.
      if (!lineageOpen) traitsReadySeen = 0;
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
        lineageSub.textContent = (title ? `${title} · ` : '') + (s.meta.endings ? UI.endingsCount(s.meta.endings) : '') + (s.meta.spawnings ? UI.spawningsCount(s.meta.spawnings) : '') + UI.bestReef(metres(Math.max(s.meta.best, s.height))) +
          (s.seamount !== 'plain' ? UI.thisReefOn(seamountDef(s.seamount).name.toLowerCase()) : '');
        const can = canSpawnLesser(s);
        const titleText = ended(s) ? UI.beginAgain : UI.lesserTitle;
        // Mid-run it is an option, not the point: folded to its title and what it would bring, until opened.
        const gainText = !ended(s) && can ? ` · +${lineageFor(s)} lineage` : '';
        if (spawnGain.parentNode !== spawnTitle || spawnTitle.firstChild?.textContent !== titleText) spawnTitle.replaceChildren(titleText, spawnGain);
        if (spawnGain.textContent !== gainText) spawnGain.textContent = gainText;
        const fold = !ended(s) && !spawnOpened;
        if (spawnCard.classList.contains('folded') !== fold) spawnCard.classList.toggle('folded', fold);
        if (spawnCard.classList.contains('foldable-spawn') !== !ended(s)) {
          spawnCard.classList.toggle('foldable-spawn', !ended(s));
          // After the ending it does not fold: no longer a button.
          if (ended(s)) { spawnTitle.removeAttribute('role'); spawnTitle.removeAttribute('tabindex'); }
          else { spawnTitle.setAttribute('role', 'button'); spawnTitle.tabIndex = 0; }
        }
        spawnText.textContent = ended(s) ? UI.beginAgainText : UI.lesserText;
        spawnBtn.disabled = !can;
        spawnBtn.textContent = can ? `+${lineageFor(s)} lineage` : UI.midnightFirst;
        // What that lineage would buy in the next run, cheapest first.
        const buys = can ? affordableTraits(s, s.meta.lineage + lineageFor(s)) : [];
        // The first few by price, and how many more (a long line's lineage buys twenty or so).
        spawnBuys.textContent = buys.length ? UI.enoughFor(buys.slice(0, 6).join(', '), Math.max(0, buys.length - 6)) : '';
        spawnBuys.hidden = !buys.length;
        let traitsReady = 0;
        for (const tr of TRAITS) {
          const c = traitCards.get(tr.id)!;
          const lv = s.meta.traits[tr.id];
          forgetButtons.get(tr.id)!.hidden = lv === 0;
          if (c.root.classList.contains('known') !== lv > 0) c.root.classList.toggle('known', lv > 0);
          c.root.classList.toggle('maxed', traitMaxed(s, tr.id));
          c.level.textContent = tr.max === Infinity ? (lv ? `×${lv}` : '') : `${lv}/${tr.max}`;
          if (traitMaxed(s, tr.id)) {
            c.cost.textContent = UI.traitComplete;
            c.btn.disabled = true;
            c.root.classList.add('maxed');
            c.root.classList.remove('ready');
            continue;
          }
          const price = traitCost(s, tr.id);
          c.cost.textContent = `${price} lineage`;
          c.btn.disabled = s.meta.lineage < price;
          c.root.classList.toggle('ready', s.meta.lineage >= price);
          if (s.meta.lineage >= price) traitsReady++;
        }
        if (traitsReadySeen < 0 || currentTab === 'lineage' || traitsReady < traitsReadySeen) traitsReadySeen = traitsReady;
        const call = traitsReady > traitsReadySeen;
        if (lineageDot.hidden === call) lineageDot.hidden = !call;
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
      renderTotals(s);
      wholeLapse.hidden = actAt(s.height) <= 1;
      habitToggle.hidden = !s.meta.traits['old-habits'] && !s.meta.traits['shoal-sense'] && !s.meta.traits['rasp-sense'] && !s.meta.traits.layering;
      const hidden = UPGRADES.find((u) => !revealed(s, u.id));
      comingUp.textContent = hidden ? UI.comingUp(hidden.name, revealText(s, hidden)) : '';
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
        const titleDue = x.b.disabled !== locked || !x.b.title;
        x.b.disabled = locked;
        x.b.classList.toggle('locked', locked);
        if (titleDue) x.b.title = locked ? `${x.p.name} · ${PALETTE_TEXT.locked} “${FEATS.find((f) => f.id === x.p.feat)?.name ?? ''}”` : x.p.name;
      }
      bandsDot.hidden = seenStories >= storyCount;
      primed = true;
    },
    /** Show the offline summary; any bands read while away are queued behind it. */
    showAway(seconds: number, gained: { calcite: number; glow: number; metres: number; full: boolean; bands: string[]; fullAfter: number | null;
      relics?: string[]; roams?: number; shards?: number; heat?: string; risings?: string; old?: string; dreamt?: boolean }, gifts?: { label: string; note: string; take: () => string }[]): void {
      // One card at a time: a story already open waits, first in line, until the summary is closed.
      if (!reader.hidden && current) {
        queue.unshift(current);
        reader.hidden = true;
      }
      // A headline, then what changed as labelled rows (like the Your reef card).
      awayTitle.textContent = gained.dreamt ? UI.dreamTitle : UI.awayTitle;
      awayText.textContent = (gained.dreamt ? UI.dreamText : UI.awayText)(duration(seconds));
      awayList.innerHTML = '';
      const row = (term: string, value: string) => awayList.append(el('dt', '', term), el('dd', '', value));
      row(AWAY_ROWS.calcite, `+${num(gained.calcite)}`);
      if (gained.glow > 0.5) row(AWAY_ROWS.glow, `+${num(gained.glow)}`);
      if (gained.metres > 0.05) row(AWAY_ROWS.rose, metres(gained.metres));
      const titles = gained.bands.map((id) => BANDS.find((b) => b.id === id)?.title).filter((x): x is string => !!x);
      if (titles.length) row(titles.length === 1 ? UI.newBand : UI.newBands, titles.map((t) => `“${t}”`).join(', '));
      if (gained.relics?.length) row(UI.shoalsBrought, gained.relics.join(', ').toLowerCase());
      if (gained.roams) row(AWAY_ROWS.roamed, gained.roams === 1 ? AWAY_ROWS.roamedOnce : AWAY_ROWS.roamedTimes(gained.roams));
      if (gained.shards) row(AWAY_ROWS.shards, AWAY_ROWS.shardsFound(gained.shards));
      if (gained.heat) row(AWAY_CYCLES.heat, gained.heat);
      if (gained.risings) row(AWAY_CYCLES.rising, gained.risings);
      if (gained.old) row(AWAY_CYCLES.old, gained.old);
      if (gained.full) {
        row(AWAY_ROWS.full, AWAY_ROWS.fullText(gained.fullAfter !== null && gained.fullAfter > 60 ? duration(gained.fullAfter) : ''));
        awayHint.textContent = AWAY_ROWS.latticeHint;
      } else awayHint.textContent = '';
      welcomeBox.innerHTML = '';
      welcomeBox.hidden = !gifts?.length;
      if (gifts?.length) {
        welcomeBox.append(el('p', 'welcome-head', WELCOME.head));
        const buttons = gifts.map((g) => {
          const b = button('choice welcome-gift', '', () => {
            untakenGift = null;
            const said = g.take();
            for (const x of buttons) x.disabled = true;
            b.classList.add('taken');
            b.lastChild!.textContent = `${WELCOME.took} · ${said}`;
          });
          b.append(el('strong', '', g.label), el('span', '', g.note));
          welcomeBox.append(b);
          return b;
        });
        untakenGift = () => buttons[0]!.click();
      } else untakenGift = null;
      away.hidden = false;
    },
    /** List the bands and readings of a loaded save without opening the reader for each. */
    primeStories(s: GameState): void {
      for (const id of s.bands) {
        const b = BANDS.find((x) => x.id === id);
        if (b) appendBand(b);
      }
      // Readings sit above the band that opened them (the Murmurs, or a late one's own), newest first.
      for (const id of [...s.readings].reverse()) {
        const rd = READINGS.find((x) => x.id === id);
        if (!rd) continue;
        const li = storyItem('read', rd.title, readingStory(rd), 'is-reading');
        const anchor = bandList.querySelector(`:scope > li[data-band="${rd.after ?? 'murmur'}"]`);
        if (anchor) anchor.before(li); else bandList.prepend(li);
      }
      lastBandCount = s.bands.length;
      lastReadingCount = s.readings.length;
      storyCount = seenStories = lastBandCount + lastReadingCount;
    },
    /** Keep stories queued for a while (a new reef shows the open water before the first one). */
    holdStories(ms: number): void {
      // Holds overlap: the latest end wins, so an earlier, shorter hold cannot cut a later one short.
      heldUntil = Math.max(heldUntil, performance.now() + ms);
      held = true;
      const release = () => {
        const left = heldUntil - performance.now();
        if (left > 5) { setTimeout(release, left); return; }
        held = false;
        const next = reader.hidden && away.hidden ? queue.shift() : undefined;
        if (next) openStory(next);
      };
      setTimeout(release, ms);
    },
    /** Whether a story is queued to open (held back, or behind the one showing). */
    storiesWaiting(): boolean {
      return queue.length > 0;
    },
    /** Whether a choice waits in the Grow tab that the player has not folded for later. */
    choiceWaiting(): boolean {
      return [...grow.querySelectorAll<HTMLElement>(':scope > section:not([hidden]):not(.later)')].some((sec) => !!sec.querySelector('.truce-kicker'));
    },
    /** The game's own cards for a yes or no, a line of text, a message (in place of the browser's dialogs). */
    ask,
    /** Open a story card (or queue it behind the one showing). */
    story(kicker: string, title: string, text: string, rows?: readonly (readonly [string, string])[]): void {
      showStory({ kicker, title, text, rows });
    },
    /** A story kept in the Bands list too (Ossel's mistakes); `open` shows it now. */
    keepStory(depth: string, kicker: string, title: string, text: string, open: boolean): void {
      const st = { kicker, title, text };
      bandList.prepend(storyItem(depth, title, st, 'is-moment'));
      if (open) showStory(st);
    },
    /** The Grow tab at its top (the ending closed: the garden waits there). */
    growTop(): void {
      showTab('grow');
      pages.scrollTop = 0;
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

/** Two buttons side by side, half the width each. */
function pair(a: HTMLElement, b: HTMLElement): HTMLElement {
  const row = el('div', 'button-pair');
  row.append(a, b);
  return row;
}

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
  head.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && keyed(head)) { e.preventDefault(); toggle(); } });
}

/**
 * A long card that starts folded: tapping its heading opens and closes it.
 * A Grow-tab section the player can fold to its header (title and count stay), remembered per
 * browser under `corallum.fold.<id>`. Open by default, so nothing is hidden from a new player.
 */
function foldable(box: HTMLElement, head: HTMLElement, id: string): void {
  const key = `corallum.fold.${id}`;
  box.classList.add('foldable');
  head.setAttribute('role', 'button');
  head.tabIndex = 0;
  const set = (folded: boolean) => {
    box.classList.toggle('folded', folded);
    head.setAttribute('aria-expanded', String(!folded));
  };
  let start = false;
  try { start = localStorage.getItem(key) === '1'; } catch { /* no storage */ }
  set(start);
  const toggle = (e: Event) => {
    // The header's own buttons (if any) keep their job.
    if ((e.target as HTMLElement).closest('button') && (e.target as HTMLElement).closest('button') !== head) return;
    const folded = !box.classList.contains('folded');
    set(folded);
    try { localStorage.setItem(key, folded ? '1' : '0'); } catch { /* no storage */ }
  };
  head.addEventListener('click', toggle);
  // Keys only when the keyboard put focus here: clicked with the mouse it keeps focus, and Space then sweeps.
  head.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && keyed(head)) { e.preventDefault(); toggle(e); } });
}

/** Scrolls glide, except under reduced motion (the system's, or the Calm setting's class). */
function smoothScroll(): ScrollBehavior {
  return matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('calm') ? 'auto' : 'smooth';
}

/** The role="button" element a pointer last pressed (it keeps focus after a click); a Tab clears it. */
let pointerPressed: Element | null = null;
window.addEventListener('pointerdown', (e) => { pointerPressed = (e.target as Element | null)?.closest?.('[role="button"]') ?? null; }, { capture: true, passive: true });
window.addEventListener('keydown', (e) => { if (e.key === 'Tab') pointerPressed = null; }, { capture: true });
/** Whether Enter or Space on this element is the keyboard's (focus reached by Tab), not a key after a click on it. */
function keyed(el: Element): boolean {
  return pointerPressed !== el;
}

/** What opens a hidden upgrade, in words. */
function revealText(s: GameState, u: (typeof UPGRADES)[number]): string {
  const r = u.reveal;
  if (r.band) {
    const b = BANDS.find((x) => x.id === r.band);
    return b ? UI.whenReaches(metres(b.metres)) : UI.laterInStory;
  }
  if (r.height !== undefined) return UI.whenReaches(metres(r.height));
  if (r.level) {
    const [id, n] = r.level;
    return UI.countOf[id]?.(n) ?? UI.afterCount(n, UPGRADES.find((x) => x.id === id)?.name.toLowerCase() ?? id);
  }
  if (r.earned !== undefined) return UI.afterEarned(num(r.earned));
  return UI.soon;
}

/** Names of traits the given lineage would buy, taking the cheapest step each time (kept until the
 *  lineage or a trait's level changes: worked out afresh it was a tenth of the panel's update). */
let affordableKey = '';
let affordableLast: string[] = [];
function affordableTraits(s: GameState, lineage: number): string[] {
  const key = `${lineage}|${Object.values(s.meta.traits).join(',')}`;
  if (key === affordableKey) return affordableLast;
  affordableKey = key;
  affordableLast = affordableTraitsNow(s, lineage);
  return affordableLast;
}
function affordableTraitsNow(s: GameState, lineage: number): string[] {
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
  return [...bought].map(([name, n]) => (n > 1 ? `${name}\u00a0×${n}` : name));
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

/** A multiplier with the precision its size needs: 1.24, 39.1, 155. */
function factor(x: number): string {
  return x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2);
}

/** A stock's net rate, or what the zero means: "full" at its hold, "steady" where inflow and loss balance. */
function flow(net: number, value = 0, hold = Infinity): string {
  // At its hold (above it, the stock drains back down and the rate says so).
  if (Number.isFinite(hold) && hold > 0 && Math.abs(value - hold) <= hold * 0.005) return UI.stockFull;
  if (Math.abs(net) < 0.005) return UI.stockSteady;
  return rate(net);
}

function etaText(t: number, cur?: string): string {
  return t <= 0 ? '' : !Number.isFinite(t) ? (cur && HOLD_HINT[cur]) || HOLD_HINT_ANY : t < 1 ? UI.anyMoment : UI.inTime(duration(t));
}

/** A countdown; a price no store can reach says what would raise that store (`cur`). */
function setEta(eta: HTMLElement, t: number, cur?: string): void {
  eta.textContent = etaText(t, cur);
  eta.classList.toggle('never', !Number.isFinite(t));
}

export type Panel = ReturnType<typeof createPanel>;
