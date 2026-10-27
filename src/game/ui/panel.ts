// The DOM panel over the canvas: stocks, shoal jobs, upgrade cards, bands and Readings, the
// reader and the away summary. Built once; `update()` only rewrites text and classes, so it
// is cheap to call every frame.

import { ACT1, UPGRADES, effectText, type Band, type UpgradeId } from '../content/act1.ts';
import { JOBS, READINGS, type Job, type Reading, type ReadingId } from '../content/act2.ts';
import { act, actAt, SURFACE } from '../content/acts.ts';
import {
  BANDS, bandMetres, calciteHold, calciteNet, calciteRate, canAfford, cost, feeding, glowHold, glowNet, idleShoals,
  jobOpen, maxed, murmurHold, murmurNet, nextReading, planktonHold, planktonNet, rates, reach, readingsRevealed,
  revealed, timeUntil, upgrade,
} from '../sim/economy.ts';
import type { GameState } from '../sim/state.ts';
import { duration, metres, num, rate } from './format.ts';

export type PanelHooks = {
  buy(id: UpgradeId): void;
  assign(job: Job, delta: 1 | -1): void;
  read(id: ReadingId): void;
  exportSave(): string;
  importSave(text: string): boolean;
  reset(): void;
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

function bandStory(b: Band): Story {
  return { kicker: `Band at ${metres(b.metres)}`, title: b.title, text: b.text };
}
function readingStory(r: Reading): Story {
  return { kicker: 'A Thousandfold band, read', title: r.title, text: r.text };
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
  for (const [id, label] of [['grow', 'Grow'], ['bands', 'Bands'], ['reef', 'Reef']] as const) {
    tabs.append(button('tab', label, () => showTab(id)));
    tabButtons.set(id, tabs.lastElementChild as HTMLButtonElement);
    const page = el('section', `page page-${id}`);
    pages.append(page);
    tabPages.set(id, page);
  }
  const bandsDot = el('span', 'dot');
  tabButtons.get('bands')!.append(bandsDot);
  let seenStories = 0;
  let storyCount = 0;
  function showTab(id: string): void {
    for (const [k, b] of tabButtons) b.classList.toggle('on', k === id);
    for (const [k, p] of tabPages) p.hidden = k !== id;
    if (id === 'bands') seenStories = storyCount;
  }

  // ---------- Shoals ----------
  const grow = tabPages.get('grow')!;
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
    const btn = button(`buy ${u.currency}`, '', () => {
      hooks.buy(u.id);
      root.classList.remove('pop');
      void root.offsetWidth;
      root.classList.add('pop');
    });
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
  const readingCost = el('span', 'cost');
  const readingBtn = button('buy murmurs', '', () => {
    const next = currentReading;
    if (next) hooks.read(next.id);
  });
  readingBtn.append(readingCost);
  const readingEta = el('span', 'eta');
  readingFoot.append(readingBtn, readingEta);
  readingCard.append(readingHead, readingHint, readingEffect, readingFoot);
  const bandsIntro = el('p', 'hint', 'Each band of stone keeps what the reef saw while laying it down.');
  const bandList = el('ol', 'band-list');
  bandsPage.append(readingCard, bandsIntro, bandList);
  let currentReading: Reading | undefined;
  let lastBandCount = 0;
  let lastReadingCount = 0;

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
  const importBtn = button('plain', 'Load save from text…', () => {
    const text = window.prompt('Paste a save:');
    if (text && !hooks.importSave(text)) window.alert('That save could not be read.');
  });
  const resetBtn = button('plain danger', 'Let the reef go (reset)', () => {
    if (window.confirm('Start over from a single polyp? This erases the reef.')) hooks.reset();
  });
  reefPage.append(el('p', 'hint', 'The reef saves itself every few seconds in this browser.'), exportBtn, importBtn, resetBtn);

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
  function openStory(st: Story): void {
    readerKicker.textContent = st.kicker;
    readerTitle.textContent = st.title;
    readerText.textContent = st.text;
    reader.hidden = false;
    readerClose.focus({ preventScroll: true });
  }
  function showStory(st: Story): void {
    if (reader.hidden && away.hidden) openStory(st);
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
    bandList.append(storyItem(metres(b.metres), b.title, bandStory(b)));
  }
  function appendReading(r: Reading): void {
    bandList.append(storyItem('read', r.title, readingStory(r), 'is-reading'));
  }

  let primed = false;
  return {
    update(s: GameState): void {
      const r = rates(s);
      calcite.value.textContent = num(s.calcite);
      calcite.sub.textContent = `${rate(calciteRate(s, r))} · holds ~${num(calciteHold(s, r))}`;
      calcite.row.classList.toggle('falling', calciteNet(s, r) < 0);
      glow.row.hidden = !(s.levels.symbiont > 0 || s.glow > 0.05);
      glow.value.textContent = num(s.glow);
      glow.sub.textContent = `${rate(glowNet(s, r))} · holds ~${num(glowHold(s, r))}`;
      plankton.row.hidden = !(s.jobs.feed > 0 || s.plankton > 0.05);
      plankton.value.textContent = num(s.plankton);
      plankton.sub.textContent = `${rate(planktonNet(s, r))} · ×${feeding(s.plankton).toFixed(2)} calcite`;
      murmurs.row.hidden = !(s.jobs.scout > 0 || s.murmurs > 0.05);
      murmurs.value.textContent = num(s.murmurs);
      murmurs.sub.textContent = `${rate(murmurNet(s, r))} · holds ~${num(murmurHold(s, r))}`;

      // Height: progress within the current act's zone, with depth.
      const zone = act(actAt(s.height));
      heightLabel.textContent = zone.name;
      heightValue.textContent = metres(s.height);
      const span = zone.to - zone.from;
      const frac = (x: number) => Math.max(0, Math.min(100, ((x - zone.from) / span) * 100));
      heightFill.style.width = `${frac(s.height)}%`;
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
        const perLight = s.jobs.light > 0 ? (r.glowP - ACT1.symbiontGlow * s.levels.symbiont) / s.jobs.light : 0;
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
            : j.id === 'feed' ? (perFeed ? `${rate(perFeed)} plankton each` : 'herd plankton to the polyps')
            : j.id === 'light' ? (perLight ? `${rate(perLight)} glow each` : 'swim the glow pattern')
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
        if (maxed(s, u.id)) {
          c.cost.textContent = u.id === 'skeleton' ? 'As high as it goes, for now' : 'Complete';
          c.btn.disabled = true;
          c.eta.textContent = '';
          c.root.classList.add('maxed');
          continue;
        }
        const price = cost(s, u.id);
        const cur = upgrade(u.id).currency;
        c.cost.textContent = `${num(price)} ${cur}`;
        const ok = canAfford(s, u.id);
        c.btn.disabled = !ok;
        c.root.classList.toggle('ready', ok);
        setEta(c.eta, ok ? 0 : timeUntil(s, cur, price));
      }

      // Readings.
      currentReading = nextReading(s);
      readingCard.hidden = !readingsRevealed(s) || !currentReading;
      if (currentReading && !readingCard.hidden) {
        readingTitle.textContent = currentReading.title;
        readingEffect.textContent = currentReading.effect;
        readingCost.textContent = `${num(currentReading.cost)} murmurs`;
        const ok = s.murmurs >= currentReading.cost;
        readingBtn.disabled = !ok;
        readingCard.classList.toggle('ready', ok);
        setEta(readingEta, ok ? 0 : timeUntil(s, 'murmurs', currentReading.cost));
        if (!ok && s.jobs.scout === 0) readingEta.textContent = 'set shoals to scout';
      }

      // New bands and readings open in the reader and join the list.
      if (s.bands.length !== lastBandCount) {
        for (const id of s.bands.slice(lastBandCount)) {
          const b = BANDS.find((x) => x.id === id);
          if (!b) continue;
          appendBand(b);
          storyCount++;
          if (lastBandCount > 0 || id === 'wake') showStory(bandStory(b));
        }
        lastBandCount = s.bands.length;
      }
      if (s.readings.length !== lastReadingCount) {
        for (const id of s.readings.slice(lastReadingCount)) {
          const rd = READINGS.find((x) => x.id === id);
          if (!rd) continue;
          appendReading(rd);
          storyCount++;
          showStory(readingStory(rd));
        }
        lastReadingCount = s.readings.length;
      }
      bandsDot.hidden = seenStories >= storyCount;
      primed = true;
    },
    /** Show the offline summary; any bands read while away are queued behind it. */
    showAway(seconds: number, gained: { calcite: number; glow: number; metres: number }): void {
      const parts = [`You were gone ${duration(seconds)}. The reef kept growing.`];
      parts.push(`+${num(gained.calcite)} calcite gathered${gained.glow > 0.5 ? `, +${num(gained.glow)} glow` : ''}.`);
      if (gained.metres > 0.05) parts.push(`It rose ${metres(gained.metres)}.`);
      awayText.textContent = parts.join(' ');
      away.hidden = false;
    },
    /** List the bands and readings of a loaded save without opening the reader for each. */
    primeStories(s: GameState): void {
      for (const id of s.bands) {
        const b = BANDS.find((x) => x.id === id);
        if (b) appendBand(b);
      }
      for (const id of s.readings) {
        const rd = READINGS.find((x) => x.id === id);
        if (rd) appendReading(rd);
      }
      lastBandCount = s.bands.length;
      lastReadingCount = s.readings.length;
      storyCount = seenStories = lastBandCount + lastReadingCount;
    },
    element: panel,
  };
}

function setEta(eta: HTMLElement, t: number): void {
  eta.textContent = t <= 0 ? '' : !Number.isFinite(t) ? 'beyond what the reef can hold' : t < 1 ? 'any moment' : `in ${duration(t)}`;
  eta.classList.toggle('never', !Number.isFinite(t));
}

export type Panel = ReturnType<typeof createPanel>;
