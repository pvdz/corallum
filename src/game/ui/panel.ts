// The DOM panel over the canvas: stocks, shoal jobs, upgrade cards, bands and Readings, the
// reader and the away summary. Built once; `update()` only rewrites text and classes, so it
// is cheap to call every frame.

import { ACT1 } from '../content/act1.ts';
import type { Band, UpgradeId } from '../content/types.ts';
import { GATE_TEXT, UPGRADES, effectText } from '../content/upgrades.ts';
import { JOBS, READINGS, type Job, type Reading, type ReadingId } from '../content/act2.ts';
import { ACT3, MEETINGS, type Choice, type Meeting, type MeetingId } from '../content/act3.ts';
import { DIALECTS, TIERS, type DialectId } from '../content/act4.ts';
import { SEAMOUNTS, TRAIT_GROUPS, TRAITS, type SeamountId, type TraitId } from '../content/lineage.ts';
import { MEMORIES } from '../content/act5.ts';
import { CREATURES } from '../content/creatures.ts';
import { canSpawnLesser, lineageFor, traitCost, traitMaxed } from '../sim/prestige.ts';
import { act, actAt, SURFACE } from '../content/acts.ts';
import {
  BANDS, bandMetres, ended, meetingWords, readingCost, bloomHold, spawnHold, spawnNet, spawnTarget, bloomNet, calciteHold, nextMeeting, nextTier, photo, raspMax, sandHold, sandNet, siltHold, siltNet, smother, calciteNet, calciteRate, canAfford, cost, feeding, glowHold, glowNet, idleShoals,
  jobOpen, maxed, murmurHold, murmurNet, nextReading, planktonHold, planktonNet, rates, reach, readingsRevealed,
  revealed, timeUntil, upgrade, capReason, nextMilestone, milestoneMult, jobGain, upgradeGain, raspSettings, speaks,
} from '../sim/economy.ts';
import type { GameState } from '../sim/state.ts';
import { duration, metres, num, rate } from './format.ts';

export type PanelHooks = {
  buy(id: UpgradeId): void;
  assign(job: Job, delta: 1 | -1): void;
  read(id: ReadingId): void;
  setRasp(n: number): void;
  choose(id: MeetingId, choice: Choice): void;
  speak(id: DialectId): void;
  spawnLesser(where: SeamountId): void;
  buyTrait(id: TraitId): void;
  exportSave(): string;
  importSave(text: string): boolean;
  reset(): void;
  /** The soft glow (bloom) pass: read and set; off helps slow phones. */
  glow: { get(): boolean; set(on: boolean): void };
  /** The reef's name changed. */
  rename(name: string): void;
  /** Calmer motion: the world's ambient animation runs slower. */
  calm: { get(): boolean; set(on: boolean): void };
  /** Old habits (a lineage trait): whether the reef buys cheap polyps and glimmerseed itself. */
  habits: { get(): boolean; set(on: boolean): void };
  /** A story card opened (for its sound). */
  storyShown?(): void;
};

type Card = { root: HTMLElement; cost: HTMLElement; level: HTMLElement; effect: HTMLElement; eta: HTMLElement; btn: HTMLButtonElement };
type Story = { kicker: string; title: string; text: string };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function button(cls: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function bandStory(b: Band, kept = false): Story {
  return { kicker: b.metres === 0 ? 'A seamount, 4,000 m down' : `Band at ${metres(b.metres)}`, title: b.title, text: kept && b.kept ? b.kept : b.text };
}
function readingStory(r: Reading): Story {
  return { kicker: 'A Thousandfold band, read', title: r.title, text: r.text };
}
function truceStory(m: Meeting, c: Choice): Story {
  const o = m[c];
  return { kicker: 'The truce', title: `${m.title}: ${o.label}`, text: o.text };
}

export function createPanel(host: HTMLElement, hooks: PanelHooks) {
  const panel = el('aside', 'panel');
  panel.setAttribute('aria-label', 'Reef');

  // ---------- Stocks ----------
  const stocks = el('div', 'stocks');
  const stock = (name: string, cls: string) => {
    const row = el('div', `stock ${cls}`);
    const value = el('span', 'stock-value', '0');
    const sub = el('span', 'stock-sub', '');
    row.append(el('span', 'stock-name', name), value, sub);
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
  raspSlider.setAttribute('aria-label', 'Rasp admitted to graze');
  raspSlider.addEventListener('input', () => hooks.setRasp(Number(raspSlider.value)));
  const raspPlus = button('step', '+', () => hooks.setRasp((lastState?.rasp ?? 0) + 1));
  raspRow.append(raspMinus, raspSlider, raspPlus);
  const raspWhat = el('p', 'rasp-what');
  raspBox.append(raspHead, raspRow, raspWhat);
  grow.append(raspBox);
  let lastState: GameState | null = null;

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

  // ---------- Upgrade cards ----------
  const cards = new Map<UpgradeId, Card>();
  for (const u of UPGRADES) {
    const root = el('article', 'card');
    root.hidden = true;
    const head = el('header');
    const level = el('span', 'level');
    head.append(el('h3', '', u.name), level);
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
    foot.append(btn, eta);
    root.append(head, flavour, effect, foot);
    flavour.addEventListener('click', () => root.classList.toggle('open'));
    grow.append(root);
    cards.set(u.id, { root, cost: costEl, level, effect, eta, btn });
  }

  // ---------- Bands and Readings ----------
  const bandsPage = tabPages.get('bands')!;
  const readingCard = el('article', 'card reading');
  readingCard.hidden = true;
  const readingHead = el('header');
  const readingTitle = el('h3');
  readingHead.append(readingTitle, el('span', 'level', 'Reading'));
  const readingHint = el('p', 'flavour', 'Scouting shoals listen at buried bands. Enough murmurs, and a band can be read.');
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
  const bandsIntro = el('p', 'hint', 'Each band of stone keeps what the reef saw while laying it down. Newest first.');
  const bandList = el('ol', 'band-list');
  const codex = el('article', 'card codex');
  const codexList = el('dl', 'codex-list');
  codex.append(el('h3', '', 'Your reef'), codexList);
  // The journal of creatures seen (kept across spawnings).
  const journal = el('article', 'card codex journal');
  const journalHead = el('h3', '', 'Creatures seen');
  const journalList = el('dl', 'codex-list');
  journal.append(journalHead, journalList);
  let journalKey = '';
  function renderJournal(s: GameState): void {
    const seen = CREATURES.filter((c) => s.meta.seen.includes(`c:${c.id}`));
    const key = seen.map((c) => c.id).join();
    if (key === journalKey) return;
    journalKey = key;
    journalHead.textContent = `Creatures seen · ${seen.length} of ${CREATURES.length}`;
    journalList.innerHTML = '';
    for (const c of CREATURES) {
      const known = seen.includes(c);
      journalList.append(el('dt', known ? '' : 'unknown', known ? c.name : 'Not yet seen'), el('dd', known ? '' : 'unknown', known ? c.note : c.zone));
    }
  }
  bandsPage.append(codex, journal, readingCard, bandsIntro, bandList);
  let codexKey = '';
  function codexRow(term: string, value: string): void {
    codexList.append(el('dt', '', term), el('dd', '', value));
  }
  function renderCodex(s: GameState): void {
    const key = JSON.stringify([s.meta.name, Math.floor(s.height), Math.floor(s.t / 60), s.feasts, s.truce, s.dialects, s.carried, s.meta.spawnings, s.meta.endings, s.readings.length]);
    if (key === codexKey) return;
    codexKey = key;
    codexList.innerHTML = '';
    codexRow('Grown', `${metres(s.height)} up the seamount, ${Math.round(Math.max(0, SURFACE - s.height)).toLocaleString('en-US')} m down`);
    codexRow('Bands read', `${s.bands.length} of your own, ${s.readings.length} of Thousandfold’s`);
    const truce = MEETINGS.filter((m) => s.truce[m.id]).map((m) => `${m.title}: ${m[s.truce[m.id] as Choice].label}`);
    if (truce.length) codexRow('The truce', truce.join(' · '));
    const spoken = TIERS.filter((t) => s.dialects[t.tier]).map((t) => DIALECTS.find((d) => d.id === s.dialects[t.tier])!.name);
    if (spoken.length) codexRow('Dialects', spoken.join(' · '));
    if (s.meta.name) codexRow('Name', reefName(s));
    codexRow('This reef', `${duration(s.t)} growing · ${num(s.earned.calcite)} calcite gathered${s.feasts ? ` · ${s.feasts} feast${s.feasts === 1 ? '' : 's'} caught` : ''}`);
    if (s.meta.endings > 0) codexRow('Endings', `${s.meta.endings} · ${s.meta.carriedEver.length} of ${MEMORIES.length} memories carried so far`);
    if (s.carried.length) codexRow('Carried', s.carried.map((id) => MEMORIES.find((m) => m.id === id)?.title ?? id).join(' · '));
    if (s.meta.spawnings) codexRow('Lineage', `${s.meta.spawnings} lesser spawning${s.meta.spawnings === 1 ? '' : 's'}, best reef ${metres(s.meta.best)}`);
  }
  let currentReading: Reading | undefined;
  let lastBandCount = 0;
  let lastReadingCount = 0;
  const truceSeen = new Set<MeetingId>();
  const dialectSeen = new Set<DialectId>();

  // ---------- Lineage ----------
  const lineagePage = tabPages.get('lineage')!;
  const lineageHead = el('div', 'lineage-head');
  const lineageCount = el('span', 'stock-value lineage-count');
  const lineageSub = el('span', 'stock-sub');
  lineageHead.append(el('span', 'stock-name', 'Lineage'), lineageCount, lineageSub);
  const spawnCard = el('article', 'card spawn-lesser');
  const spawnTitle = el('h3', '', 'Release a lesser spawning');
  const spawnText = el('p', 'flavour',
    'Let go early. Your spawn drifts off and settles on a new seamount, and the reef begins again ' +
    'from a single polyp, carrying its lineage. What you have read stays read.');
  const spawnFoot = el('footer');
  const spawnBtn = button('buy lineage', '', () => {
    const s = lastState;
    if (!s) return;
    const msg = ended(s)
      ? `Begin again on a new seamount, with +${lineageFor(s)} lineage?`
      : `Release a lesser spawning now for +${lineageFor(s)} lineage? This reef starts over.`;
    if (window.confirm(`${msg}\nIt will settle on ${seamountDef(whereNext).name.toLowerCase()}.`)) hooks.spawnLesser(whereNext);
  });
  // Where the spawn settles: each seamount bends the next run one way.
  let whereNext: SeamountId = 'plain';
  const whereBox = el('div', 'seamounts');
  const whereNote = el('p', 'hint');
  const whereButtons = SEAMOUNTS.map((m) => {
    const b = button('seamount', m.name.replace(/^A /, ''), () => {
      whereNext = m.id;
      for (const x of whereButtons) x.classList.toggle('on', x === b);
      whereNote.textContent = `${m.text} ${m.effect === 'as before' ? '' : `(${m.effect})`}`;
    });
    b.classList.toggle('on', m.id === whereNext);
    return b;
  });
  whereBox.append(...whereButtons);
  whereNote.textContent = SEAMOUNTS[0]!.text;
  spawnFoot.append(spawnBtn);
  const spawnBuys = el('p', 'effect');
  spawnCard.append(spawnTitle, spawnText, spawnBuys, el('p', 'stock-name', 'Where it settles'), whereBox, whereNote, spawnFoot);
  lineagePage.append(lineageHead, spawnCard);
  const traitCards = new Map<TraitId, Card>();
  const groupHead = (g: keyof typeof TRAIT_GROUPS) =>
    lineagePage.append(el('h4', 'trait-group', TRAIT_GROUPS[g].title), el('p', 'hint', TRAIT_GROUPS[g].text));
  const ordered = [...TRAITS.filter((t) => t.kind !== 'way'), ...TRAITS.filter((t) => t.kind === 'way')];
  for (const tr of ordered) {
    if (tr === ordered[0]) groupHead('gift');
    if (tr.kind === 'way' && ordered[ordered.indexOf(tr) - 1]?.kind !== 'way') groupHead('way');
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
    foot.append(btn, eta);
    root.append(head, el('p', 'flavour', tr.flavour), effect, foot);
    lineagePage.append(root);
    traitCards.set(tr.id, { root, cost: costEl, level, effect, eta, btn });
  }

  // ---------- Reef (settings) ----------
  const reefPage = tabPages.get('reef')!;
  const exportBtn = button('plain', 'Copy save to clipboard', async () => {
    const text = hooks.exportSave();
    try {
      await navigator.clipboard.writeText(text);
      exportBtn.textContent = 'Copied ✓';
    } catch {
      window.prompt('Copy this save:', text);
    }
    setTimeout(() => (exportBtn.textContent = 'Copy save to clipboard'), 2000);
  });
  // A file is easier to keep than a clipboard on a phone.
  const fileBtn = button('plain', 'Save to a file', () => {
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
    if (f && !hooks.importSave(await f.text())) window.alert('That save could not be read.');
    fileInput.value = '';
  });
  const loadFileBtn = button('plain', 'Load save from a file…', () => fileInput.click());
  const importBtn = button('plain', 'Load save from text…', () => {
    const text = window.prompt('Paste a save:');
    if (text && !hooks.importSave(text)) window.alert('That save could not be read.');
  });
  const resetBtn = button('plain danger', 'Let the reef go (reset)', () => {
    if (window.confirm('Start over from a single polyp? This erases the reef.')) hooks.reset();
  });
  const backupNote = el('p', 'backup-note',
    'This reef lives only in this browser: clearing site data would wash it away. Save it to a file (or copy it) and keep it somewhere safe.');
  backupNote.hidden = true;
  const glowToggle = el('label', 'toggle');
  const glowBox = el('input') as HTMLInputElement;
  glowBox.type = 'checkbox';
  glowBox.checked = hooks.glow.get();
  glowBox.addEventListener('change', () => hooks.glow.set(glowBox.checked));
  glowToggle.append(glowBox, el('span', '', 'Soft glow (turn off if a phone runs slow or warm)'));
  const nameRow = el('label', 'name-row');
  const nameInput = el('input') as HTMLInputElement;
  nameInput.type = 'text';
  nameInput.maxLength = 24;
  nameInput.placeholder = 'Name your reef';
  nameInput.addEventListener('change', () => hooks.rename(nameInput.value.trim()));
  nameRow.append(el('span', 'stock-name', 'Name'), nameInput);
  const calmToggle = el('label', 'toggle');
  const calmBox = el('input') as HTMLInputElement;
  calmBox.type = 'checkbox';
  calmBox.checked = hooks.calm.get();
  calmBox.addEventListener('change', () => hooks.calm.set(calmBox.checked));
  calmToggle.append(calmBox, el('span', '', 'Calmer motion (everything in the water moves slower)'));
  const habitToggle = el('label', 'toggle');
  const habitBox = el('input') as HTMLInputElement;
  habitBox.type = 'checkbox';
  habitBox.checked = hooks.habits.get();
  habitBox.addEventListener('change', () => hooks.habits.set(habitBox.checked));
  habitToggle.append(habitBox, el('span', '', 'Old habits: bud polyps and host glimmerseed on their own when they are cheap'));
  habitToggle.hidden = true;
  reefPage.append(
    nameRow,
    el('p', 'hint', 'The reef saves itself every few seconds in this browser.'), backupNote, exportBtn, fileBtn, loadFileBtn, fileInput, importBtn, glowToggle, calmToggle, habitToggle, resetBtn,
    el('p', 'hint', 'Hold a buy button to keep buying. Keys: Space sweeps · F catches a falling feast · P buds a polyp · B lays a band · G hosts glimmerseed.'),
  );

  /** Nudge toward copying a save when the reef is worth keeping and no copy is recent. */
  function setBackupDue(due: boolean): void {
    reefDot.hidden = !due;
    backupNote.hidden = !due;
  }

  panel.append(stocks, tabs, pages);
  host.append(panel);
  showTab('grow');

  // ---------- Reader ----------
  const reader = el('div', 'reader');
  reader.hidden = true;
  const readerCard = el('div', 'reader-card');
  const readerKicker = el('p', 'reader-depth');
  const readerTitle = el('h2');
  const readerText = el('p', 'reader-text');
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
  const awayClose = button('plain', 'Return to the reef', () => {
    away.hidden = true;
    const next = queue.shift();
    if (next) openStory(next);
  });
  awayCard.append(el('h2', '', 'While you drifted'), awayText, awayClose);
  away.append(awayCard);
  host.append(away);

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
  function appendReading(r: Reading): void {
    bandList.prepend(storyItem('read', r.title, readingStory(r), 'is-reading'));
  }

  let primed = false;
  let etaTurn = 0;
  let jobGains: { feed: number; light: number } | null = null;
  let raspBest = -1;
  let raspHold = -1;
  let tickZone = -1;
  return {
    setBackupDue,
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
        const ok = s.bloom >= tier.cost;
        dialectCost.textContent = ok
          ? `Costs ${num(tier.cost)} bloom. Choosing is permanent.`
          : `Costs ${num(tier.cost)} bloom · ${num(s.bloom)} gathered · ${etaText(timeUntil(s, 'bloom', tier.cost))}`;
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
          ? 'Your scouts have learned enough of their words.'
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
        const bestNote = raspBest === raspHold
          ? (raspBest === s.rasp ? ' · the best setting' : ` · best: ${raspBest}`)
          : ` · most calcite/s at ${raspBest}${raspBest === s.rasp ? ' (now)' : ''}, most held (for being away) at ${raspHold}${raspHold === s.rasp ? ' (now)' : ''}`;
        raspWhat.textContent = s.rasp === 0
          ? `No Rasp graze. The silt settles where it falls.${raspBest > 0 ? ` Best now: ${raspBest}.` : ''}`
          : `grinding ${rate(r.sandP)} sand · ${eats > 0 ? `eating ${rate(eats).slice(1)} calcite · ` : ''}calcite holds ~${num(calciteHold(s, r))}${bestNote}`;
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
      shoalBox.hidden = shoals === 0;
      if (shoals > 0) {
        const idle = idleShoals(s);
        shoalIdle.textContent = idle > 0 ? `${idle} idle of ${shoals}` : `${shoals}`;
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
          row.count.textContent = String(s.jobs[j.id]);
          row.minus.disabled = s.jobs[j.id] <= 0;
          row.plus.disabled = !open || idle <= 0;
          const perScout = s.jobs.scout > 0 ? r.murmurP / s.jobs.scout : 0;
          row.row.title = j.verb;
          row.what.textContent = !open ? 'they do not yet know how to listen'
            : j.id === 'feed' ? (perFeed ? `${rate(perFeed)} plankton each` : 'herd plankton to the polyps') + gainText(jobGains.feed)
            : j.id === 'light' ? (perLight ? `${rate(perLight)} glow each` : 'swim the glow pattern') + gainText(jobGains.light)
            : perScout ? `${rate(perScout)} murmurs each` : 'listen at buried bands';
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
        c.level.textContent = u.maxLevel === Infinity ? (lv ? `×${lv}` : '') : `${lv}/${u.maxLevel}`;
        if (u.id === 'skeleton') c.effect.textContent = `the reef rises ${metres(bandMetres(lv))}`;
        // What one more would really add, after every multiplier (refreshed on the card's turn).
        if ((u.id === 'polyp' || u.id === 'symbiont') && (etaSlot === etaTurn || !c.effect.dataset.live)) {
          c.effect.textContent = marginalText(s, u.id);
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
          c.cost.textContent = gate === null ? 'Complete' : gate === 'surface' ? GATE_TEXT.surface : 'Held';
          c.btn.disabled = true;
          c.eta.textContent = gate && gate !== 'surface' ? GATE_TEXT[gate] : '';
          c.root.classList.add('maxed');
          // Finished for good (not just held back by a story gate): to the end of the list, one line.
          if (u.id !== 'skeleton' && !c.root.classList.contains('done')) {
            c.root.classList.add('done');
            grow.append(c.root);
          }
          continue;
        }
        const price = cost(s, u.id);
        const cur = upgrade(u.id).currency;
        c.cost.textContent = `${num(price)} ${cur}`;
        const ok = canAfford(s, u.id);
        c.btn.disabled = !ok;
        c.root.classList.toggle('ready', ok);
        const due = etaSlot++ === etaTurn || !c.eta.textContent;
        if (ok) setEta(c.eta, 0);
        else if (due) setEta(c.eta, timeUntil(s, cur, price));
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
        lineageSub.textContent = `${s.meta.spawnings} spawning${s.meta.spawnings === 1 ? '' : 's'} · best reef ${metres(Math.max(s.meta.best, s.height))}` +
          (s.seamount !== 'plain' ? ` · this reef: ${seamountDef(s.seamount).name.toLowerCase()}` : '');
        const can = canSpawnLesser(s);
        spawnTitle.textContent = ended(s) ? 'Begin again' : 'Release a lesser spawning';
        spawnBtn.disabled = !can;
        spawnBtn.textContent = can ? `+${lineageFor(s)} lineage` : 'Reach the Midnight Water first';
        // What that lineage would buy in the next run, cheapest first.
        const buys = can ? affordableTraits(s, s.meta.lineage + lineageFor(s)) : [];
        spawnBuys.textContent = buys.length ? `Enough for: ${buys.join(', ')}` : '';
        spawnBuys.hidden = !buys.length;
        for (const tr of TRAITS) {
          const c = traitCards.get(tr.id)!;
          const lv = s.meta.traits[tr.id];
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
      habitToggle.hidden = !s.meta.traits['old-habits'];
      if (document.activeElement !== nameInput && nameInput.value !== s.meta.name) nameInput.value = s.meta.name;
      bandsDot.hidden = seenStories >= storyCount;
      primed = true;
    },
    /** Show the offline summary; any bands read while away are queued behind it. */
    showAway(seconds: number, gained: { calcite: number; glow: number; metres: number; full: boolean; bands: string[]; fullAfter: number | null }): void {
      const parts = [`You were gone ${duration(seconds)}. The reef kept growing.`];
      parts.push(`+${num(gained.calcite)} calcite gathered${gained.glow > 0.5 ? `, +${num(gained.glow)} glow` : ''}.`);
      if (gained.metres > 0.05) parts.push(`It rose ${metres(gained.metres)}.`);
      const titles = gained.bands.map((id) => BANDS.find((b) => b.id === id)?.title).filter((x): x is string => !!x);
      if (titles.length) {
        parts.push(titles.length === 1
          ? `It laid down a band worth reading: “${titles[0]}”.`
          : `It laid down ${titles.length} bands worth reading: ${titles.map((t) => `“${t}”`).join(', ')}.`);
      }
      if (gained.full) parts.push(`Its stores filled to what the reef can hold${gained.fullAfter !== null && gained.fullAfter > 60 ? ` after about ${duration(gained.fullAfter)}` : ''}, and the rest dissolved back into the sea. A denser lattice holds more.`);
      awayText.textContent = parts.join(' ');
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
