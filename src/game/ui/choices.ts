// The panel's choice cards that come and go: the glimmerseed strain, a boon, the elder's riddle,
// the fork on a trip, the shoals' signal and the full-moon spawning. Built once; update() shows
// whichever is open now.

import { GRAIN, GRAINS, SPORT, SPORTS, STRAIN, STRAINS } from '../content/act1.ts';
import { RIDDLE } from '../content/act3.ts';
import { OTHERS } from '../content/act4.ts';
import { actAt } from '../content/acts.ts';
import { SIGNAL } from '../content/events.ts';
import { BOON_TEXT } from '../content/lineage.ts';
import { FIGURES, SKY } from '../content/sky.ts';
import { QUESTION, type Question } from '../content/ossel.ts';
import { osselAsks, currentEncounter, grainsWaiting, sportOpen, boonsOffered, figureOpen, skyOpen, currentRiddle, currentSignal, forkOpen, othersCap, othersSpawning, strainOpen } from '../sim/economy.ts';
import type { GameState } from '../sim/state.ts';
import { button, el } from './dom.ts';
import { num } from './format.ts';
import type { PanelHooks } from './panel.ts';

export function createChoices(grow: HTMLElement, hooks: PanelHooks, setShown: (e: HTMLElement, show: boolean) => void) {
  // ---------- The glimmerseed strain (once, at 15 m) ----------
  const strainBox = el('section', 'truce moment strain');
  strainBox.hidden = true;
  const strainChoices = el('div', 'boon-choices');
  for (const st of STRAINS) {
    const b = button('choice', '', () => hooks.chooseStrain(st.id));
    b.style.borderColor = `rgba(${st.rgb},0.5)`;
    b.append(el('strong', '', st.name), el('em', '', st.flavour), el('span', '', st.effect));
    strainChoices.append(b);
  }
  strainBox.append(el('p', 'truce-kicker', STRAIN.kicker), el('p', 'truce-text', STRAIN.text), strainChoices);
  grow.prepend(strainBox);

  // ---------- Ossel's questions ----------
  const askBoxQ = el('section', 'truce moment ossel-asks');
  askBoxQ.hidden = true;
  const askText = el('p', 'truce-text');
  const askChoices = el('div', 'truce-choices');
  let asking: Question | undefined;
  const askButtons = ([0, 1] as const).map((i) => {
    const b = button('choice', '', () => { if (asking) hooks.answerOssel(asking.id, i); });
    const label = el('strong');
    b.append(label);
    askChoices.append(b);
    return label;
  });
  askBoxQ.append(el('p', 'truce-kicker', QUESTION.kicker), askText, askChoices);
  grow.prepend(askBoxQ);

  // ---------- The strain's sport (at the Twilight Shelf) ----------
  const sportBox = el('section', 'truce moment sport');
  sportBox.hidden = true;
  const sportText = el('p', 'truce-text');
  const sportChoices = el('div', 'boon-choices');
  const sportButtons = SPORTS.map((sp) => {
    const b = button('choice', '', () => hooks.chooseSport(sp.id));
    b.style.borderColor = `rgba(${sp.rgb},0.55)`;
    b.append(el('strong', '', sp.name), el('em', '', sp.flavour), el('span', '', sp.effect));
    sportChoices.append(b);
    return { sp, b };
  });
  sportBox.append(el('p', 'truce-kicker', SPORT.kicker), sportText, sportChoices);
  grow.prepend(sportBox);

  // ---------- The grain of the stone (every tenth band) ----------
  const grainBox = el('section', 'truce moment grain');
  grainBox.hidden = true;
  const grainText = el('p', 'truce-text');
  const grainChoices = el('div', 'boon-choices');
  for (const g of GRAINS) {
    const b = button('choice', '', () => hooks.chooseGrain(g.id));
    b.style.borderColor = `rgba(${g.rgb},0.5)`;
    b.append(el('strong', '', g.name), el('em', '', g.flavour), el('span', '', g.effect));
    grainChoices.append(b);
  }
  const grainSoFar = el('p', 'truce-words');
  grainBox.append(el('p', 'truce-kicker', GRAIN.kicker), grainText, grainChoices, grainSoFar);
  grow.prepend(grainBox);

  // ---------- A boon for a new seamount ----------
  const boonBox = el('section', 'truce moment boon');
  boonBox.hidden = true;
  const boonChoices = el('div', 'boon-choices');
  const boonKicker = el('p', 'truce-kicker', BOON_TEXT.kicker), boonHead = el('p', 'truce-text', BOON_TEXT.head);
  boonBox.append(boonKicker, boonHead, boonChoices);
  grow.prepend(boonBox);
  let boonKey = '';

  // ---------- The Rasp elder's riddle ----------
  const riddleBox = el('section', 'truce moment riddle');
  riddleBox.hidden = true;
  const riddleAsk = el('p', 'truce-text');
  const riddleChoices = el('div', 'boon-choices');
  const riddleResult = el('p', 'truce-words');
  riddleBox.append(el('p', 'truce-kicker', RIDDLE.kicker), riddleAsk, riddleChoices, riddleResult);
  grow.prepend(riddleBox);
  let riddleShown = '', riddleLinger = 0;

  // ---------- The fork on a trip ----------
  const forkBox = el('section', 'truce moment fork');
  forkBox.hidden = true;
  const forkChoices = el('div', 'truce-choices');
  const forkKicker = el('p', 'truce-kicker'), forkText = el('p', 'truce-text');
  // The encounter changes per trip: its two ways are filled in when it shows.
  const forkWays = [0, 1].map((i) => {
    const label = el('strong'), effect = el('span');
    const b = button('choice', '', () => { if (lastFork) hooks.takeFork(currentEncounter(lastFork).ways[i]!.id); });
    b.append(label, effect);
    forkChoices.append(b);
    return { label, effect };
  });
  let lastFork: GameState | null = null;
  let forkShown = '';
  forkBox.append(forkKicker, forkText, forkChoices);
  grow.prepend(forkBox);

  // ---------- The shoals' signal (a little memory game) ----------
  const signalBox = el('section', 'truce moment signal');
  signalBox.hidden = true;
  const signalState = el('p', 'truce-words');
  const signalLamps = el('div', 'signal-lamps');
  let sigK = -1, sigDone = -1, sigLinger = 0, sigPattern: number[] = [], sigAnswer: number[] = [], sigPlaying = false;
  const lampButtons = SIGNAL.lamps.map((rgb, i) => {
    const b = button('signal-lamp', '', () => {
      if (sigPlaying || sigK < 0) return;
      flash(i);
      sigAnswer.push(i);
      const wrong = sigAnswer.some((a, j) => a !== sigPattern[j]);
      if (wrong || sigAnswer.length === sigPattern.length) {
        const pay = hooks.answerSignal(sigAnswer);
        const streak = hooks.signalStreak();
        signalState.textContent = pay > 0 ? `${SIGNAL.right} · +${num(pay)}${streak > 1 ? ` · ${streak} ${SIGNAL.streakWord}` : ''}` : SIGNAL.wrong;
        sigDone = sigK;
        sigK = -1;
        sigLinger = performance.now() + 4000;
      }
    });
    b.style.setProperty('--lamp', `rgb(${rgb})`);
    // Each lamp carries its key, so the pattern does not depend on telling the colours apart.
    b.textContent = ['7', '8', '9', '0'][i]!;
    b.setAttribute('aria-label', `Lamp ${i + 1}`);
    signalLamps.append(b);
    return b;
  });
  function flash(i: number): void {
    hooks.lamp?.(i);
    const b = lampButtons[i]!;
    b.classList.remove('lit');
    void b.offsetWidth;
    b.classList.add('lit');
  }
  function playPattern(): void {
    sigPlaying = true;
    signalState.textContent = SIGNAL.watch;
    sigPattern.forEach((i, n) => setTimeout(() => flash(i), 400 + n * 650));
    setTimeout(() => { sigPlaying = false; signalState.textContent = SIGNAL.answer; }, 400 + sigPattern.length * 650 + 300);
  }
  signalBox.append(el('p', 'truce-kicker', SIGNAL.kicker), el('p', 'truce-text', SIGNAL.text), signalLamps, signalState);
  grow.prepend(signalBox);

  // ---------- Other reefs spawning (Sunlit full moon) ----------
  const othersBox = el('section', 'truce moment others');
  othersBox.hidden = true;
  const othersKicker = el('p', 'truce-kicker');
  const othersText = el('p', 'truce-text');
  const othersChoices = el('div', 'truce-choices');
  const othersButtons = (['feed', 'join'] as const).map((how) => {
    const b = button('choice', '', () => hooks.meetOthers(how));
    const label = el('strong'), effect = el('span');
    b.append(label, effect);
    othersChoices.append(b);
    return { how, b, label, effect };
  });
  othersBox.append(othersKicker, othersText, othersChoices);
  grow.prepend(othersBox);

  // ---------- The night sky over the Breach: figures to name ----------
  const skyBox = el('section', 'truce sky');
  skyBox.hidden = true;
  const skyList = el('div', 'sky-list');
  const skyRows = FIGURES.map((f) => {
    const row = el('div', 'sky-row');
    const name = el('strong');
    const note = el('span', 'sky-note');
    const b = button('sky-trace', SKY.trace, () => hooks.trace(f.id));
    row.append(name, note, b);
    skyList.append(row);
    return { f, row, name, note, b };
  });
  skyBox.append(el('p', 'truce-kicker', `${SKY.title} · ${SKY.effect}`), el('p', 'truce-text', SKY.intro), skyList);
  grow.prepend(skyBox);

  return {
    update(s: GameState): void {
      const q = osselAsks(s);
      setShown(askBoxQ, !!q);
      if (q && q !== asking) {
        askText.textContent = q.ask;
        q.answers.forEach((a, i) => { askButtons[i]!.textContent = a.label; });
      }
      asking = q;
      setShown(sportBox, sportOpen(s));
      if (sportOpen(s)) {
        sportText.textContent = SPORT.text(STRAINS.find((x) => x.id === s.strain)?.name ?? '');
        for (const x of sportButtons) x.b.hidden = x.sp.strain !== s.strain;
      }
      const waiting = grainsWaiting(s);
      setShown(grainBox, waiting > 0);
      if (waiting > 0) {
        grainText.textContent = GRAIN.text((s.grains.length + 1) * GRAIN.every) + (waiting > 1 ? ` (${GRAIN.more(waiting - 1)})` : '');
        const counts = GRAINS.map((g) => [g.name, s.grains.filter((x) => x === g.id).length] as const).filter(([, n]) => n > 0);
        grainSoFar.textContent = counts.length ? `${GRAIN.sofar}: ${counts.map(([n, c]) => `${n.toLowerCase()} ${c}`).join(' · ')}` : '';
      }
      setShown(skyBox, skyOpen(s));
      if (skyOpen(s)) {
        const now = hooks.tracing();
        for (const r of skyRows) {
          const named = s.sky[r.f.id], open = figureOpen(s, r.f.id);
          r.row.classList.toggle('named', named);
          r.row.classList.toggle('now', now === r.f.id);
          r.name.textContent = named || open ? r.f.name : SKY.locked;
          r.note.textContent = named ? '✓' : open ? (now === r.f.id ? SKY.tracing : s.meta.seen.includes(`sky:${r.f.id}`) ? SKY.before : '') : r.f.hint;
          r.b.hidden = !open;
          r.b.textContent = now === r.f.id ? SKY.stop : SKY.trace;
        }
      }
      setShown(strainBox, strainOpen(s));
      setShown(forkBox, forkOpen(s));
      if (forkOpen(s)) {
        lastFork = s;
        const enc = currentEncounter(s);
        if (enc.id !== forkShown) {
          forkShown = enc.id;
          forkKicker.textContent = enc.kicker;
          forkText.textContent = enc.text;
          enc.ways.forEach((w, i) => { forkWays[i]!.label.textContent = w.label; forkWays[i]!.effect.textContent = w.effect; });
        }
      }
      const rd = currentRiddle(s);
      if (rd && rd.id !== riddleShown) {
        riddleShown = rd.id;
        riddleAsk.textContent = rd.ask;
        riddleResult.textContent = '';
        riddleChoices.innerHTML = '';
        rd.options.forEach((o, i) => {
          const b = button('choice', '', () => {
            const ok = hooks.answerRiddle(rd.id, i);
            riddleResult.textContent = ok ? `${RIDDLE.right} +${RIDDLE.lineage} lineage${hooks.blessed() ? ` ${RIDDLE.blessing}` : ''}` : RIDDLE.wrong;
            for (const x of riddleChoices.children) (x as HTMLButtonElement).disabled = true;
            riddleLinger = performance.now() + 4000;
          });
          b.append(el('strong', '', o));
          riddleChoices.append(b);
        });
      }
      setShown(riddleBox, !!rd || performance.now() < riddleLinger);

      // A boon for this seamount, while one is still to be chosen.
      const offered = boonsOffered(s);
      setShown(boonBox, offered.length > 0);
      const bk = offered.map((b) => b.id).join();
      if (bk !== boonKey) {
        boonKey = bk;
        const earned = s.meta.spawnings === 0;
        boonKicker.textContent = earned ? BOON_TEXT.earnedKicker : BOON_TEXT.kicker;
        boonHead.textContent = earned ? BOON_TEXT.earnedHead : BOON_TEXT.head;
        boonChoices.innerHTML = '';
        for (const b of offered) {
          const btn = button('choice', '', () => hooks.chooseBoon(b.id));
          btn.append(el('strong', '', b.name), el('span', '', b.effect));
          boonChoices.append(btn);
        }
      }

      // The shoals' signal: a new one plays its pattern when it appears; the card stays a moment after an answer.
      const sig = currentSignal(s);
      if (sig && sig.k !== sigK && sig.k !== sigDone) {
        sigK = sig.k;
        sigPattern = sig.pattern;
        sigAnswer = [];
        playPattern();
      }
      setShown(signalBox, (!!sig && sig.k !== sigDone) || performance.now() < sigLinger);

      // Other reefs spawning: this moon's choice.
      setShown(othersBox, othersSpawning(s));
      if (!othersBox.hidden) {
        const z = OTHERS.zones[actAt(s.height)]!;
        othersKicker.textContent = z.kicker;
        othersText.textContent = z.text;
        for (const x of othersButtons) {
          x.label.textContent = z[x.how].label;
          x.effect.textContent = z[x.how].effect.replace('{n}', String(Math.max(0, othersCap(s) - s.others.joined)));
          x.b.disabled = x.how === 'join' && s.others.joined >= othersCap(s);
        }
      }
    },
    /** Press signal lamp i (keys 7–0), when the signal card is up. */
    pressLamp(i: number): boolean {
      if (signalBox.hidden || sigK < 0) return false;
      lampButtons[i]?.click();
      return true;
    },
  };
}
