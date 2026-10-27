import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act1Done, advance, buy, calciteHold, cost, glowHold, sweep, timeUntil } from '../../src/game/sim/economy.ts';
import { runBot } from '../../src/game/sim/bot.ts';
import { newGame, type GameState } from '../../src/game/sim/state.ts';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(b));
const clone = (s: GameState): GameState => structuredClone(s);

/** A mid-act state with every kind of upgrade bought, glow still far from settled. */
function midGame(): GameState {
  const { state } = runBot((s) => s.levels.vent >= 1 && s.levels.lure >= 1, 3 * 3600);
  state.glow = 0;
  return state;
}

test('offline (one call) equals online (many 1/60 s frames)', () => {
  const a = midGame();
  const b = clone(a);
  advance(a, 600);
  for (let i = 0; i < 600 * 60; i++) advance(b, 1 / 60);
  assert.ok(rel(a.calcite, b.calcite) < 1e-6, `${a.calcite} vs ${b.calcite}`);
  assert.ok(rel(a.glow, b.glow) < 1e-9);
  assert.ok(rel(a.height, b.height) < 1e-9);
  assert.ok(rel(a.earned.calcite, b.earned.calcite) < 1e-6);
});

test('offline saturates at the hold: a week equals a month', () => {
  const s = midGame();
  const week = advance(clone(s), 7 * 86400);
  const month = advance(clone(s), 30 * 86400);
  assert.ok(rel(week.calcite, calciteHold(s)) < 1e-9);
  assert.ok(rel(week.glow, glowHold(s)) < 1e-9);
  assert.equal(week.calcite, month.calcite);
});

test('a month offline is cheap to compute', () => {
  const s = midGame();
  const t0 = performance.now();
  advance(s, 30 * 86400);
  assert.ok(performance.now() - t0 < 50);
});

test('buying spends the right currency and raises cost', () => {
  const s = newGame(1);
  s.calcite = 100;
  const c = cost(s, 'polyp');
  assert.ok(buy(s, 'polyp'));
  assert.equal(s.calcite, 100 - c);
  assert.ok(cost(s, 'polyp') > c);
  s.calcite = 0;
  assert.equal(buy(s, 'polyp'), false);
});

test('hidden upgrades cannot be bought', () => {
  const s = newGame(1);
  s.calcite = 1e9;
  assert.equal(buy(s, 'vent'), false);
});

test('sweep has a cooldown in sim time', () => {
  const s = newGame(1);
  assert.ok(sweep(s) > 0);
  assert.equal(sweep(s), 0);
  advance(s, 1);
  assert.ok(sweep(s) > 0);
});

test('timeUntil is consistent with advance', () => {
  const s = midGame();
  s.calcite = 0;
  const target = calciteHold(s) * 0.5;
  const eta = timeUntil(s, 'calcite', target);
  assert.ok(Number.isFinite(eta));
  const at = advance(clone(s), eta);
  assert.ok(rel(at.calcite, target) < 0.02, `${at.calcite} vs ${target}`);
  assert.equal(timeUntil(s, 'calcite', calciteHold(s) * 2), Infinity);
});

test('bands are read in height order and the act completes', () => {
  const { state } = runBot(act1Done, 6 * 3600);
  assert.ok(act1Done(state));
  assert.deepEqual(state.bands, ['wake', 'silt', 'bands', 'moon', 'thousandfold', 'forgetting', 'beaks', 'rise']);
});

test('pacing: the bot finishes Act I in 15–45 minutes of sim time', () => {
  const { state } = runBot(act1Done, 6 * 3600);
  assert.ok(state.t > 15 * 60 && state.t < 45 * 60, `took ${state.t}s`);
});
