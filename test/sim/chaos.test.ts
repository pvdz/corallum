import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askFavour, build, house, meet, meetOthers, nextMoment, othersSpawning, pryThorn, residentsAsking, send, skipRequest, rates, advance, calciteHold,
  currentRiddle, answerRiddle, forkOpen, takeFork, currentSignal, answerSignal, pickShell, strainOpen, chooseStrain, setCurrent, plant, callHome } from '../../src/game/sim/economy.ts';
import { botDecide } from '../../src/game/sim/bot.ts';
import { newGame, type GameState } from '../../src/game/sim/state.ts';
import { mulberry32 } from '../../src/game/sim/rng.ts';
import { WORKS } from '../../src/game/content/works.ts';
import { FAVOURS } from '../../src/game/content/act3.ts';

const STOCKS = ['calcite', 'glow', 'plankton', 'murmurs', 'silt', 'sand', 'bloom', 'spawn', 'height'] as const;

function sane(s: GameState, when: string): void {
  for (const k of STOCKS) assert.ok(Number.isFinite(s[k]) && s[k] >= -1e-9, `${k} = ${s[k]} ${when}`);
  for (const [k, v] of Object.entries(rates(s))) if (typeof v === 'number') assert.ok(Number.isFinite(v), `rate ${k} = ${v} ${when}`);
  assert.ok(Number.isFinite(calciteHold(s)));
}

test('a whole game of random choices keeps every stock finite and non-negative', () => {
  const r = mulberry32(7);
  const s = newGame(3);
  for (let i = 0; i < 9000 && s.carried.length === 0; i++) {
    botDecide(s, true);
    // Random meddling on top of the bot.
    const mo = nextMoment(s);
    if (mo) meet(s, mo.id, r() < 0.5 ? 'a' : 'b');
    const ask = residentsAsking(s);
    if (ask.length && r() < 0.05) house(s, ask[Math.floor(r() * ask.length)]!.id);
    if (r() < 0.05) askFavour(s, FAVOURS[Math.floor(r() * FAVOURS.length)]!.id);
    if (r() < 0.05) build(s, WORKS[Math.floor(r() * WORKS.length)]!.id);
    if (r() < 0.02) skipRequest(s);
    if (r() < 0.05) send(s);
    if (othersSpawning(s)) meetOthers(s, r() < 0.5 ? 'feed' : 'join');
    if (r() < 0.1) pryThorn(s);
    const rd = currentRiddle(s);
    if (rd) answerRiddle(s, rd.id, Math.floor(r() * 3));
    if (forkOpen(s)) takeFork(s, r() < 0.5 ? 'press' : 'home');
    const sig = currentSignal(s);
    if (sig) answerSignal(s, r() < 0.5 ? sig.pattern : [0]);
    if (r() < 0.2) pickShell(s);
    if (strainOpen(s)) chooseStrain(s, (['blue', 'gold', 'violet'] as const)[Math.floor(r() * 3)]!);
    if (r() < 0.02) setCurrent(s, Math.floor(r() * 5) - 2);
    if (r() < 0.01) callHome(s);
    if (r() < 0.05) plant(s);
    advance(s, 4);
    if (i % 500 === 0) sane(s, `at step ${i}`);
  }
  sane(s, 'at the end');
  advance(s, 30 * 86400);
  sane(s, 'after a month away');
});
