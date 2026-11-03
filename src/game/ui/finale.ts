// Act V's UI: the moon card in the panel, the memory choice, and the ending sequence.

import { QUESTIONS } from '../content/ossel.ts';
import { VOWS } from '../content/lineage.ts';
import { memoryCount, UI } from '../content/ui.ts';
import { FIGURES, SKY } from '../content/sky.ts';
import { ACT5, ENDING, MEMORIES, type MemoryId } from '../content/act5.ts';
import { CREATURES, trustLevel } from '../content/creatures.ts';
import { OSSEL_MISTAKES } from '../content/ossel.ts';
import { SHARD_LINES } from '../content/shards.ts';
import { SURFACE } from '../content/acts.ts';
import {
  breachReady, canBreach, ended, memoriesAvailable, moonFull, moonPhase, rates, spawnHold, spawnNet, spawnTarget,
  untilFullMoon, carryAt, greatTide, untilGreatTide, vowKept, blueMoon,
} from '../sim/economy.ts';
import { drawMoon } from '../render/draw.ts';
import type { GameState } from '../sim/state.ts';
import { duration, num, rate } from './format.ts';
import { relax } from '../sim/ode.ts';
import { endingLineage } from '../sim/prestige.ts';

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
  const release = el('button', 'release', UI.release);
  release.type = 'button';
  release.addEventListener('click', () => openChoice());
  // The next few full moons, great tides marked: the wait-or-go choice at a glance.
  const calendar = el('div', 'moon-calendar');
  /** False until the first update: a reef loaded under a full moon does not scroll on load. */
  let primedRelease = false;
  const hostHidden = () => card.hidden || card.offsetParent === null;
  // The release right under what it brings; the calendar of moons after it (it is the detail).
  card.append(head, need, release, calendar);
  panelPage.prepend(card);

  // ---------- The memory choice ----------
  const choice = el('div', 'finale choice-screen');
  choice.hidden = true;
  const choiceInner = el('div', 'finale-inner');
  const choiceText = el('p', 'finale-text', ENDING.choose(ACT5.carry));
  const memoryGrid = el('div', 'memory-grid');
  const choiceFoot = el('div', 'finale-foot');
  const picked = el('span', 'picked');
  const letGo = el('button', 'release', UI.letGo);
  letGo.type = 'button';
  const back = el('button', 'plain', UI.notYet);
  back.type = 'button';
  choiceFoot.append(picked, back, letGo);
  choiceInner.append(el('h2', '', UI.carries), choiceText, memoryGrid, choiceFoot);
  choice.append(choiceInner);
  host.append(choice);
  const chosen = new Set<MemoryId>();
  let state: GameState | null = null;

  function openChoice(): void {
    if (!state || !canBreach(state)) return;
    chosen.clear();
    memoryGrid.innerHTML = '';
    choiceText.textContent = (greatTide(state) ? ENDING.chooseGreat : ENDING.choose)(carryAt(state));
    for (const m of memoriesAvailable(state)) {
      const b = el('button', 'memory');
      b.type = 'button';
      b.append(el('strong', '', m.title), el('span', '', m.hint));
      // Earlier endings: what a spawn has carried before, so a new choice can be a new story.
      if (state.meta.carriedEver.includes(m.id)) b.append(el('em', 'carried-before', 'carried before'));
      b.addEventListener('click', () => {
        if (chosen.has(m.id)) chosen.delete(m.id);
        else if (state && chosen.size < carryAt(state)) chosen.add(m.id);
        b.classList.toggle('on', chosen.has(m.id));
        refreshChoice();
      });
      memoryGrid.append(b);
    }
    refreshChoice();
    choice.hidden = false;
  }
  function refreshChoice(): void {
    const n = state ? carryAt(state) : ACT5.carry;
    picked.textContent = `${chosen.size}\u00a0of\u00a0${n}`;
    letGo.disabled = chosen.size !== n || !state || !moonFull(state.t);
  }
  back.addEventListener('click', () => { choice.hidden = true; });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !choice.hidden) choice.hidden = true; });
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
  const endingNext = el('button', 'plain', UI.continue);
  endingNext.type = 'button';
  endingInner.append(endingText, endingNext);
  ending.append(endingInner);
  host.append(ending);
  let pages: string[] = [];
  let page = 0;

  function endingPages(s: GameState): string[] {
    const out: string[] = [ENDING.release];
    // The neighbours the line knows well (familiar or more) come to watch.
    const known = CREATURES.filter((c) => trustLevel(s.meta.trust[c.id] ?? 0) >= 2).map((c) => c.name.toLowerCase());
    if (known.length) {
      const names = known.length > 1 ? `${known.slice(0, -1).slice(0, 7).join(', ')} and ${known.at(-1)}` : known[0]!;
      out.push(ENDING.friends.replace('{names}', names));
    }
    for (const id of s.carried) {
      const m = MEMORIES.find((x) => x.id === id);
      if (m) out.push(`${m.title}. ${m.epilogue}`);
    }
    // What the reef told Ossel on the way up.
    const told = QUESTIONS.filter((q) => s.asked[q.id]).map((q) => q.answers[Number(s.asked[q.id])]!.ending);
    if (told.length) out.push(told.join(' '));
    // The stars this reef named over the Breach.
    const stars = FIGURES.filter((f) => s.sky[f.id]).map((f) => f.name);
    if (stars.length) out.push(SKY.ending.replace('{names}', stars.length > 1 ? `${stars.slice(0, -1).join(', ')} and ${stars.at(-1)}` : stars[0]!));
    // The vows this reef grew under.
    if (s.vows.length) {
      const names = (ok: boolean) => VOWS.filter((v) => s.vows.includes(v.id) && vowKept(s, v.id) === ok).map((v) => v.name.toLowerCase()).join(' and ');
      out.push(ENDING.vows(names(true), names(false)).trim());
    }
    // The sister reef: ahead of it at the surface, or behind.
    if (s.race.lit) out.push(ENDING.sisterLit);
    else if (s.race.decided >= 5) out.push(s.diary.some((d) => d.includes('|ahead|the surface')) ? ENDING.sisterAhead : ENDING.sisterBehind);
    // The secret page: every mistake of Ossel's found, and the tablet whole.
    if (OSSEL_MISTAKES.every((m) => s.meta.seen.includes(`o:${m.id}`)) && s.meta.shards.length >= SHARD_LINES.length) out.push(ENDING.remembered);
    out.push(s.truce.wall === 'b' ? ENDING.closingKept : ENDING.closingLetGo);
    // The line has carried every memory there is, across its endings.
    if (MEMORIES.every((m) => s.meta.carriedEver.includes(m.id))) out.push(ENDING.everything);
    // This reef in numbers, quietly, before the last line.
    const c = ENDING.counts;
    const nums = [
      c.time(duration(s.breachedAt || s.t)), c.polyps(s.levels.polyp), c.bands(s.levels.skeleton),
      s.feasts ? c.feasts(s.feasts) : '', s.relics.length ? c.relics(s.relics.length) : '',
      s.tally.intruders ? c.intruders(s.tally.intruders) : '', s.residents.length ? c.residents(s.residents.length) : '',
      s.meta.shards.length ? c.shards(s.meta.shards.length) : '', s.tally.pruned ? c.pruned(s.tally.pruned) : '',
      s.tally.freed ? c.freed(s.tally.freed) : '', s.tally.lucky ? c.lucky(s.tally.lucky) : '',
    ].filter(Boolean);
    out.push(`${ENDING.numbers} ${nums.join('. ')}.`);
    out.push(ENDING.last);
    return out;
  }
  function showPage(): void {
    endingText.textContent = pages[page] ?? '';
    endingText.classList.remove('in');
    void endingText.offsetWidth;
    endingText.classList.add('in');
    endingNext.textContent = page < pages.length - 1 ? UI.continue : UI.livesOn;
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

  let calendarKey = -1;
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
      const great = greatTide(s, s.t + wait);
      const blue = blueMoon(s.t + wait);
      status.textContent = (full
        ? (great ? UI.greatFull(carryAt(s, s.t)) : UI.moonFull)
        : `${phase < 0.5 ? UI.waxing : UI.waning} · ${UI.fullIn} ${duration(wait)}${great ? ` · ${UI.aGreatTide}` : ''}`) + (blue ? ` · ${UI.blueMoon}` : '');
      const r = rates(s);
      const target = spawnTarget(s);
      const parts: string[] = [];
      if (s.height < SURFACE) parts.push(`Reach the surface (${Math.ceil(SURFACE - s.height)} m to go).`);
      if (s.spawn < target) {
        const hold = spawnHold(s, r);
        parts.push(`Spawn ${num(s.spawn)} / ${num(target)} (${rate(spawnNet(s, r))}${hold < target ? ' — ripen it more: it will not hold enough' : ''}).`);
      }
      if (!parts.length) {
        parts.push(full ? UI.ready : UI.readyWait);
        // Wait-or-release: a bigger spawn sends more of you out (lineage for beginning again).
        const nextIn = full ? ACT5.moonPeriod : wait;
        const later = relax(s.spawn, r.spawnP, r.spawnK, nextIn);
        const now = endingLineage(s, s.spawn), then = endingLineage(s, later);
        // The next moon is mentioned only when waiting would really be worth it.
        if (full) parts.push(`Released now: +${now} lineage for the next reef${then - now >= 2 ? `; at the next full moon about +${then}` : ''}.`);
        else parts.push(`Released at this moon: about +${then} lineage for the next reef.`);
        // The wait-or-go choice: a great tide carries one more memory into the ending.
        if (!great) { const g = untilGreatTide(s); parts.push(`The next great tide, carrying ${memoryCount(carryAt(s, s.t + g))}, is in ${duration(g)}.`); }
      }
      need.textContent = parts.join(' ');
      const key = Math.floor(s.t / 30);
      if (key !== calendarKey) {
        calendarKey = key;
        calendar.innerHTML = '';
        calendar.append(el('span', 'moon-cal-label', UI.fullMoons));
        let at = s.t + untilFullMoon(s.t);
        for (let i = 0; i < 4; i++) {
          const great = greatTide(s, at);
          const wait = at - s.t;
          const item = el('span', great ? 'moon-day great' : 'moon-day', wait < 1 ? 'now' : duration(wait));
          item.title = great ? UI.greatTide(carryAt(s, at)) : UI.memories(carryAt(s, at));
          calendar.append(item);
          at = (Math.floor(at / ACT5.moonPeriod) + 1 + 0.5 - ACT5.fullWindow) * ACT5.moonPeriod + 1e-6;
        }
      }
      const canGo = canBreach(s);
      // The moment it can be released, the button comes into view once (a phone's sheet shows
      // only the card's top; the panel may be scrolled anywhere).
      if (canGo && release.disabled && primedRelease && !hostHidden()) release.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      primedRelease = true;
      release.disabled = !canGo;
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
