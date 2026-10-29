import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sweep, advance, calciteRate, carryAt, cost, ended, heightForBands, homes, rates, vowLineage } from '../../src/game/sim/economy.ts';
import { LINEAGE } from '../../src/game/content/lineage.ts';
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
  assert.equal(next.meta.lineage, state.meta.lineage + gain);
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
  const { state: s } = runBot((x) => x.height >= 3400, 6 * 3600, { ventures: false });
  s.rasp = bestRasp(s);
  const best = calciteHold(s);
  s.meta.traits['glass-gardeners'] = 1;
  s.rasp = 0;
  assert.ok(calciteHold(s) > best, `${calciteHold(s)} vs ${best}`);
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

test('the record for reaching the surface is the exact crossing time, offline or not', async () => {
  const { runBot } = await import('../../src/game/sim/bot.ts');
  const { advance, heightForBands } = await import('../../src/game/sim/economy.ts');
  const { state } = runBot((s) => s.height >= 3990, 16 * 3600);
  // Lay the bands up to the surface; the reef then settles up to it.
  while (heightForBands(state.levels.skeleton) < 4000) state.levels.skeleton++;
  state.dialects.spawn ||= 'broadcast';
  const a = structuredClone(state), b = structuredClone(state);
  advance(a, 3 * 3600);
  for (let i = 0; i < 3 * 3600; i++) advance(b, 1);
  assert.ok(a.meta.fastest > state.t && a.meta.fastest < state.t + 3 * 3600, `${a.meta.fastest}`);
  assert.ok(Math.abs(a.meta.fastest - b.meta.fastest) < 1e-6, `${a.meta.fastest} vs ${b.meta.fastest}`);
});

test('hard seamounts: the rule holds, the trial is met mid-advance, and the line keeps the reward', async () => {
  const { canAfford, maxed, nextReading, passed } = await import('../../src/game/sim/economy.ts');
  const { state: first } = runBot((x) => x.height >= 200, 3 * 3600, { ventures: false });
  const lonely = spawnLesser(first, 'lonely')!;
  lonely.levels.shoal = 8;
  lonely.glow = 1e9;
  assert.ok(maxed(lonely, 'shoal') && !canAfford(lonely, 'shoal'));
  const silent = spawnLesser(first, 'silent')!;
  silent.bands.push('murmur');
  assert.equal(nextReading(silent), undefined);
  // Grown to the goal inside one long offline step: met, and kept by the next reef.
  lonely.levels.skeleton = 200;
  advance(lonely, 30 * 86400);
  assert.ok(lonely.height >= 3000 && passed(lonely, 'lonely'));
  const next = spawnLesser(lonely, 'plain')!;
  assert.ok(passed(next, 'lonely'));
  const was = structuredClone(next);
  was.meta.seen = was.meta.seen.filter((k) => k !== 'trial:lonely');
  next.levels.shoal = was.levels.shoal = 5;
  assert.ok(cost(next, 'shoal') < cost(was, 'shoal'));
});

test('an heirloom relic carries its effect to the next reef, which still has the ruin to find', async () => {
  const { nextSite } = await import('../../src/game/sim/economy.ts');
  const { state: s } = runBot((x) => x.height >= 300, 3 * 3600, { ventures: false });
  s.relics = ['gate'];
  const plain = spawnLesser(s, 'plain')!;
  const heir = spawnLesser(s, 'plain', 'gate')!;
  assert.equal(heir.heirloom, 'gate');
  assert.ok(cost(heir, 'skeleton') < cost(plain, 'skeleton'));
  heir.height = plain.height = 200;
  heir.levels.shoal = 10;
  assert.equal(nextSite(heir)?.id, 'gate');
  // Only a relic actually found can go along.
  assert.equal(spawnLesser(s, 'plain', 'midden')!.heirloom, '');
});

test('forgetting a trait gives back most of its last level, and only what was bought', async () => {
  const { buyTrait, forgetTrait, traitCost } = await import('../../src/game/sim/prestige.ts');
  const s = newGame(1);
  s.meta.lineage = 1000;
  const c = traitCost(s, 'deep-memory');
  assert.ok(buyTrait(s, 'deep-memory'));
  assert.equal(forgetTrait(s, 'deep-memory'), Math.floor(0.8 * c));
  assert.equal(s.meta.traits['deep-memory'], 0);
  assert.equal(s.meta.lineage, 1000 - c + Math.floor(0.8 * c));
  assert.equal(forgetTrait(s, 'deep-memory'), 0);
});

test('vows: taken only after an ending; kept ones pay at the next ending; lightness carries one fewer; solitude has no homes', () => {
  const first = newGame(11);
  first.bands.push(LINEAGE.unlockBand);
  const early = spawnLesser(first, 'plain', '', ['light'])!;
  assert.deepEqual(early.vows, [], 'no vows before the line has an ending');
  const ended0 = newGame(12);
  ended0.meta.endings = 1;
  ended0.bands.push(LINEAGE.unlockBand);
  const s = spawnLesser(ended0, 'plain', '', ['light', 'alone', 'haste'])!;
  assert.deepEqual([...s.vows].sort(), ['alone', 'haste', 'light']);
  assert.equal(carryAt(s), carryAt({ ...s, vows: [] }) - 1);
  s.height = 3900;
  assert.equal(homes(s), 0);
  s.surfacedAt = 6 * 3600;
  assert.equal(vowLineage(s), 14);
  s.surfacedAt = 8 * 3600;
  assert.equal(vowLineage(s), 8, 'haste broken');
  s.vows.push('still');
  assert.equal(sweep(s), 0, 'a still reef does not sweep');
});
