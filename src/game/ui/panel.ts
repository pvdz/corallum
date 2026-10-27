// The DOM panel over the canvas: stocks, upgrade cards, the band reader and the away summary.
// Built once; `update()` only rewrites text and classes, so it is cheap to call every frame.

import { ACT1, BANDS_ACT1, UPGRADES, effectText, type Band, type UpgradeId } from '../content/act1.ts';
import {
  calciteHold, calciteNet, calciteRate, canAfford, cost, glowHold, glowNet, maxed, rates, revealed, timeUntil, upgrade,
} from '../sim/economy.ts';
import type { GameState } from '../sim/state.ts';
import { duration, metres, num, rate } from './format.ts';

export type PanelHooks = {
  buy(id: UpgradeId): void;
  exportSave(): string;
  importSave(text: string): boolean;
  reset(): void;
};

type Card = { root: HTMLElement; cost: HTMLElement; level: HTMLElement; eta: HTMLElement; btn: HTMLButtonElement };

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function createPanel(host: HTMLElement, hooks: PanelHooks) {
  const panel = el('aside', 'panel');
  panel.setAttribute('aria-label', 'Reef');

  // Stocks.
  const stocks = el('div', 'stocks');
  const stock = (name: string, cls: string) => {
    const row = el('div', `stock ${cls}`);
    const label = el('span', 'stock-name', name);
    const value = el('span', 'stock-value', '0');
    const sub = el('span', 'stock-sub', '');
    row.append(label, value, sub);
    stocks.append(row);
    return { row, value, sub };
  };
  const calcite = stock('Calcite', 'calcite');
  const glow = stock('Glow', 'glow');
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

  // Tabs.
  const tabs = el('nav', 'tabs');
  const pages = el('div', 'pages');
  const tabButtons = new Map<string, HTMLButtonElement>();
  const tabPages = new Map<string, HTMLElement>();
  for (const [id, label] of [['grow', 'Grow'], ['bands', 'Bands'], ['reef', 'Reef']] as const) {
    const b = el('button', 'tab', label);
    b.type = 'button';
    b.addEventListener('click', () => showTab(id));
    tabs.append(b);
    tabButtons.set(id, b);
    const page = el('section', `page page-${id}`);
    pages.append(page);
    tabPages.set(id, page);
  }
  const bandsDot = el('span', 'dot');
  tabButtons.get('bands')!.append(bandsDot);
  function showTab(id: string): void {
    for (const [k, b] of tabButtons) b.classList.toggle('on', k === id);
    for (const [k, p] of tabPages) p.hidden = k !== id;
    if (id === 'bands') seenBands = lastBandCount;
  }

  // Upgrade cards.
  const cards = new Map<UpgradeId, Card>();
  const grow = tabPages.get('grow')!;
  for (const u of UPGRADES) {
    const root = el('article', 'card');
    root.hidden = true;
    const head = el('header');
    const name = el('h3', '', u.name);
    const level = el('span', 'level');
    head.append(name, level);
    const flavour = el('p', 'flavour', u.flavour);
    const effect = el('p', 'effect', effectText(u.id));
    const foot = el('footer');
    const btn = el('button', `buy ${u.currency}`);
    btn.type = 'button';
    const costEl = el('span', 'cost');
    btn.append(costEl);
    const eta = el('span', 'eta');
    foot.append(btn, eta);
    root.append(head, flavour, effect, foot);
    btn.addEventListener('click', () => {
      hooks.buy(u.id);
      root.classList.remove('pop');
      void root.offsetWidth;
      root.classList.add('pop');
    });
    grow.append(root);
    cards.set(u.id, { root, cost: costEl, level, eta, btn });
  }

  // Bands list.
  const bandsPage = tabPages.get('bands')!;
  const bandsIntro = el('p', 'hint', 'Each band of stone keeps what the reef saw while laying it down.');
  const bandList = el('ol', 'band-list');
  bandsPage.append(bandsIntro, bandList);
  let lastBandCount = 0;
  let seenBands = 0;

  // Reef (settings).
  const reefPage = tabPages.get('reef')!;
  const exportBtn = el('button', 'plain', 'Copy save to clipboard');
  const importBtn = el('button', 'plain', 'Load save from text…');
  const resetBtn = el('button', 'plain danger', 'Let the reef go (reset)');
  const note = el('p', 'hint', 'The reef saves itself every few seconds in this browser.');
  reefPage.append(note, exportBtn, importBtn, resetBtn);
  exportBtn.addEventListener('click', async () => {
    const text = hooks.exportSave();
    try {
      await navigator.clipboard.writeText(text);
      exportBtn.textContent = 'Copied ✓';
    } catch {
      window.prompt('Copy this save:', text);
    }
    setTimeout(() => (exportBtn.textContent = 'Copy save to clipboard'), 2000);
  });
  importBtn.addEventListener('click', () => {
    const text = window.prompt('Paste a save:');
    if (text && !hooks.importSave(text)) window.alert('That save could not be read.');
  });
  resetBtn.addEventListener('click', () => {
    if (window.confirm('Start over from a single polyp? This erases the reef.')) hooks.reset();
  });

  panel.append(stocks, tabs, pages);
  host.append(panel);
  showTab('grow');

  // Reader: a story card over everything.
  const reader = el('div', 'reader');
  reader.hidden = true;
  const readerCard = el('div', 'reader-card');
  const readerDepth = el('p', 'reader-depth');
  const readerTitle = el('h2');
  const readerText = el('p', 'reader-text');
  const readerClose = el('button', 'plain', 'Continue');
  readerCard.append(readerDepth, readerTitle, readerText, readerClose);
  reader.append(readerCard);
  host.append(reader);
  const queue: Band[] = [];
  function openBand(b: Band): void {
    readerDepth.textContent = `Band at ${b.metres} m`;
    readerTitle.textContent = b.title;
    readerText.textContent = b.text;
    reader.hidden = false;
    readerClose.focus({ preventScroll: true });
  }
  function closeReader(): void {
    reader.hidden = true;
    const next = queue.shift();
    if (next) openBand(next);
  }
  readerClose.addEventListener('click', closeReader);
  reader.addEventListener('click', (e) => { if (e.target === reader) closeReader(); });

  // Away summary.
  const away = el('div', 'reader away');
  away.hidden = true;
  const awayCard = el('div', 'reader-card');
  const awayTitle = el('h2', '', 'While you drifted');
  const awayText = el('p', 'reader-text');
  const awayClose = el('button', 'plain', 'Return to the reef');
  awayCard.append(awayTitle, awayText, awayClose);
  away.append(awayCard);
  host.append(away);
  awayClose.addEventListener('click', () => { away.hidden = true; });

  function bandItem(b: Band): HTMLLIElement {
    const li = el('li');
    const btn = el('button', 'band');
    btn.type = 'button';
    btn.append(el('span', 'band-depth', `${b.metres} m`), el('span', 'band-title', b.title));
    btn.addEventListener('click', () => openBand(b));
    li.append(btn);
    return li;
  }

  let primed = false;
  return {
    update(s: GameState): void {
      const r = rates(s);
      calcite.value.textContent = num(s.calcite);
      const cNet = calciteNet(s, r);
      calcite.sub.textContent = `${rate(calciteRate(s, r))} · holds ~${num(calciteHold(s, r))}`;
      calcite.row.classList.toggle('falling', cNet < 0);
      const showGlow = s.levels.symbiont > 0 || s.glow > 0.05;
      glow.row.hidden = !showGlow;
      glow.value.textContent = num(s.glow);
      glow.sub.textContent = `${rate(glowNet(s, r))} · holds ~${num(glowHold(s, r))}`;

      heightValue.textContent = metres(s.height);
      const goal = ACT1.goalMetres;
      heightFill.style.width = `${Math.min(100, (s.height / goal) * 100)}%`;
      heightTarget.style.width = `${Math.min(100, (r.heightTarget / goal) * 100)}%`;
      const next = BANDS_ACT1.find((b) => !s.bands.includes(b.id));
      heightSub.textContent = r.heightTarget > s.height + 0.05
        ? `rising to ${metres(r.heightTarget)}`
        : next ? `next band at ${next.metres} m` : 'the silt is below you';

      for (const u of UPGRADES) {
        const c = cards.get(u.id)!;
        const show = revealed(s, u.id);
        if (show && c.root.hidden && primed) c.root.classList.add('new');
        c.root.hidden = !show;
        if (!show) continue;
        const lv = s.levels[u.id];
        c.level.textContent = u.maxLevel === Infinity ? (lv ? `×${lv}` : '') : `${lv}/${u.maxLevel}`;
        if (maxed(s, u.id)) {
          c.cost.textContent = 'Complete';
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
        if (ok) c.eta.textContent = '';
        else {
          const t = timeUntil(s, cur, price);
          c.eta.textContent = !Number.isFinite(t) ? 'beyond what the reef can hold' : t < 1 ? 'any moment' : `in ${duration(t)}`;
          c.eta.classList.toggle('never', !Number.isFinite(t));
        }
      }

      if (s.bands.length !== lastBandCount) {
        for (const id of s.bands.slice(lastBandCount)) {
          const b = BANDS_ACT1.find((x) => x.id === id);
          if (!b) continue;
          bandList.append(bandItem(b));
          if (lastBandCount > 0 || id === 'wake') {
            if (reader.hidden && away.hidden) openBand(b);
            else queue.push(b);
          }
        }
        lastBandCount = s.bands.length;
      }
      bandsDot.hidden = seenBands >= lastBandCount;
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
    /** Skip the reader for bands already read in a loaded save. */
    primeBands(s: GameState): void {
      for (const id of s.bands) {
        const b = BANDS_ACT1.find((x) => x.id === id);
        if (b) bandList.append(bandItem(b));
      }
      lastBandCount = seenBands = s.bands.length;
    },
    element: panel,
  };
}

export type Panel = ReturnType<typeof createPanel>;
