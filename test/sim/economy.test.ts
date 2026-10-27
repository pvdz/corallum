import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act1Done, advance, assign, buy, calciteHold, choose, cost, glowHold, heightCap, heightForBands, bandMetres, idleShoals, maxed, murmurHold, nextMeeting, planktonHold, raspMax, read, reassign, sandHold, setRasp, siltHold, sweep, timeUntil } from '../../src/game/sim/economy.ts';
import { runBot } from '../../src/game/sim/bot.ts';
import { newGame, type GameState } from '../../src/game/sim/state.ts';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(b));
const clone = (s: GameState): GameState => structuredClone(s);

/** A mid-act state with every kind of upgrade bought, upstream stocks far from settled. */
function midGame(): GameState {
  const { state } = runBot((s) => s.levels.vent >= 1 && s.levels.lure >= 1, 3 * 3600);
  state.glow = 0;
  return state;
}

/** An Act II state with shoals on every job, readings bought, everything off equilibrium. */
function act2Game(): GameState {
  const { state } = runBot((s) => s.readings.length >= 3 && s.jobs.scout > 0, 6 * 3600);
  state.glow = 0;
  state.plankton = 0;
  state.levels.skeleton += 3; // the reef is mid-rise
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

test('Act II: offline equals online with glow, plankton, murmurs and height all moving', () => {
  const a = act2Game();
  const b = clone(a);
  advance(a, 900);
  for (let i = 0; i < 900 * 30; i++) advance(b, 1 / 30);
  for (const k of ['calcite', 'glow', 'plankton', 'murmurs', 'height'] as const)
    assert.ok(rel(a[k], b[k]) < 1e-6, `${k}: ${a[k]} vs ${b[k]}`);
});

test('Act II saturates: every stock settles at its hold', () => {
  const s = act2Game();
  const week = advance(clone(s), 7 * 86400);
  const month = advance(clone(s), 30 * 86400);
  assert.ok(rel(week.plankton, planktonHold(s)) < 1e-9);
  assert.ok(rel(week.calcite, calciteHold(s)) < 1e-9);
  assert.ok(rel(month.murmurs, murmurHold(s)) < 1e-9);
  assert.equal(week.calcite, month.calcite);
});

test('band heights: zones end exactly at their boundaries', () => {
  let sum = 0;
  const tops = new Set<number>();
  for (let l = 0; l < 200; l++) {
    sum += bandMetres(l);
    assert.ok(rel(heightForBands(l + 1), sum) < 1e-12);
    tops.add(heightForBands(l + 1));
  }
  for (const boundary of [60, 3000, 3800, 3980, 4000]) assert.ok(tops.has(boundary), `no band ends at ${boundary}`);
  assert.equal(heightForBands(20), 60);
  assert.equal(heightForBands(400), 4000);
});

/** A Twilight Shelf state: Rasp grazing, sand bars up, silt far from settled. */
function act3Game(): GameState {
  const { state } = runBot((s) => s.height >= 3350, 12 * 3600);
  state.silt = 0;
  state.glow = 0;
  state.levels.skeleton += 1;
  return state;
}

test('Act III: offline equals online with silt, sand and every other stock moving', () => {
  const a = act3Game();
  const b = clone(a);
  advance(a, 600);
  for (let i = 0; i < 600 * 20; i++) advance(b, 1 / 20);
  for (const k of ['calcite', 'glow', 'plankton', 'murmurs', 'height', 'silt', 'sand'] as const)
    assert.ok(rel(a[k], b[k]) < 1e-6, `${k}: ${a[k]} vs ${b[k]}`);
});

test('Act III saturates: silt and sand settle at their holds', () => {
  const s = act3Game();
  const week = advance(clone(s), 7 * 86400);
  assert.ok(rel(week.silt, siltHold(s)) < 1e-9);
  assert.ok(rel(week.sand, sandHold(s)) < 1e-6);
  assert.ok(rel(week.calcite, calciteHold(s)) < 1e-9);
});

test('the Rasp dial clamps to the grazing grounds', () => {
  const s = newGame(1);
  setRasp(s, 5);
  assert.equal(s.rasp, 0);
  s.levels.grounds = 2;
  setRasp(s, 100);
  assert.equal(s.rasp, raspMax(s));
  setRasp(s, -3);
  assert.equal(s.rasp, 0);
});

test('truce: meetings come in order, after their band, paid in murmurs', () => {
  const s = newGame(1);
  s.murmurs = 1e6;
  assert.equal(nextMeeting(s), undefined);
  s.bands.push('grinding', 'sand', 'shelf-edge');
  assert.equal(nextMeeting(s)?.id, 'terms');
  assert.equal(choose(s, 'story', 'a'), false);
  assert.ok(choose(s, 'terms', 'b'));
  assert.equal(raspMax(s), 2);
  assert.ok(choose(s, 'story', 'a'));
  const sand = s.sand;
  assert.ok(choose(s, 'wall', 'a'));
  assert.ok(s.sand > sand);
  assert.equal(nextMeeting(s), undefined);
});

test('story gates hold the reef back', () => {
  const s = newGame(1);
  assert.equal(heightCap(s), 3000);
  s.readings.push('inside-the-wall');
  assert.ok(heightCap(s) < 3800);
  s.truce.wall = 'b';
  assert.equal(heightCap(s), 3800);
  // The band that would cross the cap is not for sale.
  const s2 = newGame(1);
  while (heightForBands(s2.levels.skeleton + 1) <= 3000) s2.levels.skeleton++;
  assert.ok(maxed(s2, 'skeleton'));
});

test('shoals: new ones join the last job; scouting opens with the murmur band', () => {
  const s = newGame(1);
  s.height = 100;
  s.glow = 1e6;
  assert.ok(buy(s, 'shoal'));
  assert.equal(s.jobs.feed, 1);
  assert.equal(reassign(s, 'feed', 'scout'), false);
  s.bands.push('murmur');
  assert.ok(reassign(s, 'feed', 'scout'));
  assert.ok(buy(s, 'shoal'));
  assert.equal(s.jobs.scout, 2);
  assert.ok(assign(s, 'scout', -1));
  assert.equal(idleShoals(s), 1);
  assert.ok(assign(s, 'light', 1));
  assert.equal(idleShoals(s), 0);
  assert.equal(assign(s, 'light', 1), false);
});

test('readings: in order, paid in murmurs, only once the murmur band is read', () => {
  const s = newGame(1);
  s.murmurs = 1e6;
  assert.equal(read(s, 'city'), false);
  s.bands.push('murmur');
  assert.equal(read(s, 'lattice-songs'), false);
  assert.ok(read(s, 'city'));
  assert.equal(read(s, 'city'), false);
  assert.ok(s.murmurs < 1e6);
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
  assert.equal(state.act, 2);
});

test('pacing: the bot finishes Act I in 15–45 minutes of sim time', () => {
  const { state } = runBot(act1Done, 6 * 3600);
  assert.ok(state.t > 15 * 60 && state.t < 45 * 60, `took ${state.t}s`);
});

test('pacing: the bot climbs the Twilight Shelf in 1.5–3.5 h, whatever the truce', () => {
  for (const truce of [{ terms: 'a', story: 'a', wall: 'a' }, { terms: 'b', story: 'b', wall: 'b' }] as const) {
    const start = runBot((s) => s.height >= 3000, 12 * 3600).state.t;
    const { state } = runBot((s) => s.height >= 3800, 16 * 3600, { truce });
    const t = state.t - start;
    assert.ok(state.height >= 3800 && t > 1.5 * 3600 && t < 3.5 * 3600, `${JSON.stringify(truce)} took ${t}s`);
  }
});

test('pacing: the bot finishes Act II 1–2.5 h after Act I', () => {
  const a1 = runBot(act1Done, 6 * 3600).state.t;
  const { state } = runBot((s) => s.height >= 3000, 12 * 3600);
  const t = state.t - a1;
  assert.ok(state.height >= 3000 && t > 3600 && t < 2.5 * 3600, `took ${t}s after Act I`);
});
