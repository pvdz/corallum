// Act V's UI: the moon card in the panel, the memory choice, and the ending sequence.

import { ACT5, ENDING, MEMORIES, type MemoryId } from '../content/act5.ts';
import { SURFACE } from '../content/acts.ts';
import {
  breachReady, canBreach, ended, memoriesAvailable, moonFull, moonPhase, rates, spawnHold, spawnNet, spawnTarget,
  untilFullMoon,
} from '../sim/economy.ts';
import { drawMoon } from '../render/draw.ts';
import type { GameState } from '../sim/state.ts';
import { duration, num, rate } from './format.ts';

export type FinaleHooks = {
  breach(memories: MemoryId[]): boolean;
  /** Called when the ending has been read through. */
  done(): void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

export function createFinale(host: HTMLElement, panelPage: HTMLElement, hooks: FinaleHooks) {
  // ---------- The moon card ----------
  const card = el('section', 'moon-card');
  card.hidden = true;
  const head = el('div', 'moon-head');
  const icon = el('canvas', 'moon-icon');
  icon.width = icon.height = 68;
  const iconCtx = icon.getContext('2d')!;
  let iconPhase = -1;
  const words = el('div', 'moon-words');
  const title = el('h3', '', 'The Spawning Moon');
  const status = el('p', 'moon-status');
  words.append(title, status);
  head.append(icon, words);
  const need = el('p', 'moon-need');
  const release = el('button', 'release', 'Release the spawn');
  release.type = 'button';
  release.addEventListener('click', () => openChoice());
  card.append(head, need, release);
  panelPage.prepend(card);

  // ---------- The memory choice ----------
  const choice = el('div', 'finale choice-screen');
  choice.hidden = true;
  const choiceInner = el('div', 'finale-inner');
  const choiceText = el('p', 'finale-text', ENDING.choose);
  const memoryGrid = el('div', 'memory-grid');
  const choiceFoot = el('div', 'finale-foot');
  const picked = el('span', 'picked');
  const letGo = el('button', 'release', 'Let go');
  letGo.type = 'button';
  const back = el('button', 'plain', 'Not yet');
  back.type = 'button';
  choiceFoot.append(picked, back, letGo);
  choiceInner.append(el('h2', '', 'What the spawn carries'), choiceText, memoryGrid, choiceFoot);
  choice.append(choiceInner);
  host.append(choice);
  const chosen = new Set<MemoryId>();
  let state: GameState | null = null;

  function openChoice(): void {
    if (!state || !canBreach(state)) return;
    chosen.clear();
    memoryGrid.innerHTML = '';
    for (const m of memoriesAvailable(state)) {
      const b = el('button', 'memory');
      b.type = 'button';
      b.append(el('strong', '', m.title), el('span', '', m.hint));
      // Earlier endings: what a spawn has carried before, so a new choice can be a new story.
      if (state.meta.carriedEver.includes(m.id)) b.append(el('em', 'carried-before', 'carried before'));
      b.addEventListener('click', () => {
        if (chosen.has(m.id)) chosen.delete(m.id);
        else if (chosen.size < ACT5.carry) chosen.add(m.id);
        b.classList.toggle('on', chosen.has(m.id));
        refreshChoice();
      });
      memoryGrid.append(b);
    }
    refreshChoice();
    choice.hidden = false;
  }
  function refreshChoice(): void {
    picked.textContent = `${chosen.size} of ${ACT5.carry}`;
    letGo.disabled = chosen.size !== ACT5.carry || !state || !moonFull(state.t);
  }
  back.addEventListener('click', () => { choice.hidden = true; });
  letGo.addEventListener('click', () => {
    if (!hooks.breach([...chosen])) return;
    choice.hidden = true;
    // Let the spawning play out on its own before any words.
    setTimeout(playEnding, 6500);
  });

  // ---------- The ending ----------
  const ending = el('div', 'finale ending');
  ending.hidden = true;
  const endingInner = el('div', 'finale-inner');
  const endingText = el('p', 'finale-text');
  const endingNext = el('button', 'plain', 'Continue');
  endingNext.type = 'button';
  endingInner.append(endingText, endingNext);
  ending.append(endingInner);
  host.append(ending);
  let pages: string[] = [];
  let page = 0;

  function endingPages(s: GameState): string[] {
    const out: string[] = [ENDING.release];
    for (const id of s.carried) {
      const m = MEMORIES.find((x) => x.id === id);
      if (m) out.push(`${m.title}. ${m.epilogue}`);
    }
    out.push(s.truce.wall === 'b' ? ENDING.closingKept : ENDING.closingLetGo);
    out.push(ENDING.last);
    return out;
  }
  function showPage(): void {
    endingText.textContent = pages[page] ?? '';
    endingText.classList.remove('in');
    void endingText.offsetWidth;
    endingText.classList.add('in');
    endingNext.textContent = page < pages.length - 1 ? 'Continue' : 'The reef lives on';
  }
  function playEnding(): void {
    if (!state) return;
    pages = endingPages(state);
    page = 0;
    ending.hidden = false;
    showPage();
  }
  endingNext.addEventListener('click', () => {
    page++;
    if (page < pages.length) showPage();
    else {
      ending.hidden = true;
      hooks.done();
    }
  });

  return {
    update(s: GameState): void {
      state = s;
      const show = s.height >= ACT5.from && !ended(s);
      card.hidden = !show;
      if (!show) return;
      const phase = moonPhase(s.t);
      if (Math.abs(phase - iconPhase) > 0.002) {
        iconPhase = phase;
        iconCtx.clearRect(0, 0, 68, 68);
        drawMoon(iconCtx, 34, 34, 28, phase);
      }
      const full = moonFull(s.t);
      const wait = untilFullMoon(s.t);
      status.textContent = full ? 'The moon is full.' : `${phase < 0.5 ? 'Waxing' : 'Waning'} · full in ${duration(wait)}`;
      const r = rates(s);
      const target = spawnTarget(s);
      const parts: string[] = [];
      if (s.height < SURFACE) parts.push(`Reach the surface (${Math.ceil(SURFACE - s.height)} m to go).`);
      if (s.spawn < target) {
        const hold = spawnHold(s, r);
        parts.push(`Spawn ${num(s.spawn)} / ${num(target)} (${rate(spawnNet(s, r))}${hold < target ? ' — ripen it more: it will not hold enough' : ''}).`);
      }
      if (!parts.length) parts.push(full ? 'Everything is ready.' : 'Everything is ready. Wait for the moon.');
      need.textContent = parts.join(' ');
      release.disabled = !canBreach(s);
      card.classList.toggle('ready', breachReady(s));
      card.classList.toggle('full', full);
      if (!choice.hidden) refreshChoice();
    },
    /** Replay the ending (for a save that has ended). */
    replay(): void {
      if (state && ended(state)) playEnding();
    },
  };
}
