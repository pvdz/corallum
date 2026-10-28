import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, calciteRate, cost, ended, heightForBands, rates } from '../../src/game/sim/economy.ts';
import { runBot } from '../../src/game/sim/bot.ts';
import { buyTrait, canSpawnLesser, lineageFor, spawnLesser, traitCost } from '../../src/game/sim/prestige.ts';
import { deserialize, serialize } from '../../src/game/sim/save.ts';
import { newGame } from '../../src/game/sim/state.ts';

test('lesser spawning opens in the Midnight Water and pays lineage by height', () => {
  const s = newGame(1);
  assert.equal(canSpawnLesser(s), false);
  assert.equal(spawnLesser(s), null);
  s.bands.push('eyes');
  s.height = 3000;
  assert.ok(canSpawnLesser(s));
  assert.equal(lineageFor(s), Math.floor(4 * Math.sqrt(50)));
  s.dialects.spawn = 'fragmenting';
  assert.equal(lineageFor(s), Math.floor(Math.floor(4 * Math.sqrt(50)) * 1.5));
});

test('a spawning keeps the meta and resets the run', () => {
  const { state } = runBot((s) => s.height >= 1000, 6 * 3600);
  const gain = lineageFor(state);
  const next = spawnLesser(state)!;
  assert.equal(next.meta.lineage, gain);
  assert.equal(next.meta.spawnings, 1);
  assert.equal(next.height, 0);
  assert.equal(next.calcite, 0);
  assert.deepEqual(next.bands, []);
  assert.ok(next.meta.seen.includes('eyes'));
  assert.notEqual(next.seed, state.seed);
  // The old state is untouched.
  assert.equal(state.meta.spawnings, 0);
});

test('traits: cost lineage, take effect, start bonuses apply to the next run', () => {
  const s = newGame(1);
  s.bands.push('eyes');
  s.height = 4000;
  let next = spawnLesser(s)!;
  next.meta.lineage = 1000;
  next.levels.polyp = 20;
  const base = calciteRate(next);
  const polyp = cost(next, 'polyp');
  assert.ok(buyTrait(next, 'deep-memory'));
  assert.ok(buyTrait(next, 'quick-budding'));
  assert.ok(buyTrait(next, 'old-bands'));
  assert.ok(buyTrait(next, 'remembered-shoals'));
  assert.ok(Math.abs(calciteRate(next) / base - 1.5) < 1e-9);
  assert.ok(cost(next, 'polyp') < polyp);
  assert.ok(next.meta.lineage < 1000);
  assert.ok(traitCost(next, 'deep-memory') > 3);
  next.bands.push('eyes');
  next.levels.polyp = 0;
  next = spawnLesser(next)!;
  assert.equal(next.levels.skeleton, 5);
  assert.equal(rates(next).heightTarget, heightForBands(5));
  assert.equal(next.levels.shoal, 3);
  assert.equal(next.jobs.feed, 3);
  assert.ok(buyTrait(next, 'kept-readings'));
  assert.equal(buyTrait(next, 'kept-readings'), false, 'max 1');
});

test('the meta survives a save round trip', () => {
  const s = newGame(1);
  s.bands.push('eyes');
  s.height = 2000;
  const next = spawnLesser(s)!;
  buyTrait(next, 'glimmer');
  const back = deserialize(serialize(next, 5))!.state;
  assert.deepEqual(back.meta, next.meta);
});

test('offline stays exact with traits (settling changes the height rate)', () => {
  const s = newGame(1);
  s.meta.traits.settling = 1;
  s.levels.skeleton = 30;
  s.levels.polyp = 20;
  const a = advance(structuredClone(s), 300);
  const b = structuredClone(s);
  for (let i = 0; i < 300 * 20; i++) advance(b, 1 / 20);
  assert.ok(Math.abs(a.height - b.height) < 1e-6 * a.height);
  assert.ok(Math.abs(a.calcite - b.calcite) < 1e-6 * a.calcite);
});

test('pacing: one lesser spawning at 1000 m finishes the game sooner than none', () => {
  const none = runBot(ended, 14 * 3600).total;
  const one = runBot(ended, 14 * 3600, { spawnAt: 1000 }).total;
  assert.ok(one < none, `${one} vs ${none}`);
});

test('strategy traits open things earlier', async () => {
  const { revealed } = await import('../../src/game/sim/economy.ts');
  const s = newGame(1);
  s.height = 25;
  s.bands.push('eyes');
  assert.equal(revealed(s, 'shoal'), false);
  assert.equal(revealed(s, 'grounds'), false);
  s.meta.traits['early-shoals'] = 1;
  s.meta.traits['rasp-kin'] = 1;
  assert.ok(revealed(s, 'shoal'));
  assert.ok(revealed(s, 'grounds'));
  assert.ok(revealed(s, 'sandbar'));
});

test('glass gardeners: a reef with no Rasp at all beats the best Rasp dial without them', async () => {
  const { calciteHold } = await import('../../src/game/sim/economy.ts');
  const { runBot, bestRasp } = await import('../../src/game/sim/bot.ts');
  const { state: s } = runBot((x) => x.height >= 3400, 6 * 3600);
  s.rasp = bestRasp(s);
  const best = calciteHold(s);
  s.meta.traits['glass-gardeners'] = 1;
  s.rasp = 0;
  assert.ok(calciteHold(s) > best, `${calciteHold(s)} vs ${best}`);
});

test('endings and carried memories survive beginning again', async () => {
  const { spawnLesser } = await import('../../src/game/sim/prestige.ts');
  const s = newGame(5);
  s.bands.push('eyes');
  s.height = 4000;
  s.carried = ['vent', 'ossel', 'rasp'];
  s.meta.carriedEver = ['vent', 'ossel', 'rasp'];
  s.meta.endings = 1;
  const next = spawnLesser(s);
  assert.ok(next);
  assert.equal(next.meta.endings, 1);
  assert.deepEqual(next.meta.carriedEver, ['vent', 'ossel', 'rasp']);
  assert.deepEqual(next.carried, []);
});

test('a bigger release sends more lineage into the next run', async () => {
  const { lineageFor, endingLineage } = await import('../../src/game/sim/prestige.ts');
  const { spawnTarget } = await import('../../src/game/sim/economy.ts');
  const s = newGame(9);
  s.height = 4000;
  s.carried = ['vent', 'ossel', 'rasp'];
  const target = spawnTarget(s);
  assert.equal(endingLineage(s, target), 10);
  assert.equal(endingLineage(s, 4 * target), 18);
  assert.equal(endingLineage(s, 0), 10, 'old saves without a recorded release keep the old bonus');
  s.released = target;
  const small = lineageFor(s);
  s.released = 4 * target;
  assert.equal(lineageFor(s) - small, 8);
});

test('old habits: buys the cheaper of polyp and glimmerseed only when it is cheap', async () => {
  const { habitPurchase } = await import('../../src/game/sim/prestige.ts');
  const { cost } = await import('../../src/game/sim/economy.ts');
  const s = newGame(2);
  s.levels.polyp = 6;
  s.calcite = cost(s, 'polyp') * 20;
  assert.equal(habitPurchase(s), null, 'not without the trait');
  s.meta.traits['old-habits'] = 1;
  assert.equal(habitPurchase(s), 'polyp');
  s.calcite = cost(s, 'polyp') * 5;
  assert.equal(habitPurchase(s), null, 'too dear: more than a tenth of the calcite');
});

test('seamounts: a spawning settles where it was sent, and the place bends the numbers', async () => {
  const { spawnLesser } = await import('../../src/game/sim/prestige.ts');
  const { rates, readingCost } = await import('../../src/game/sim/economy.ts');
  const { READINGS } = await import('../../src/game/content/act2.ts');
  const s = newGame(4);
  s.bands.push('eyes');
  s.height = 200;
  const cold = spawnLesser(s, 'cold')!;
  const plain = spawnLesser(s)!;
  assert.equal(cold.seamount, 'cold');
  assert.equal(plain.seamount, 'plain');
  assert.ok(rates(cold).calciteK < rates(plain).calciteK);
  const crowded = spawnLesser(s, 'crowded')!;
  assert.ok(readingCost(crowded, READINGS[3]!) < readingCost(plain, READINGS[3]!));
  // Offline stays exact on any seamount.
  const { advance } = await import('../../src/game/sim/economy.ts');
  const a = structuredClone(cold), b = structuredClone(cold);
  a.levels.polyp = 20; b.levels.polyp = 20;
  advance(a, 600);
  for (let i = 0; i < 600 * 30; i++) advance(b, 1 / 30);
  assert.ok(Math.abs(a.calcite - b.calcite) / Math.max(1, a.calcite) < 1e-6);
});
