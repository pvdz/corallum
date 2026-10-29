import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, canSend, cost, idleShoals, nextSite, send } from '../../src/game/sim/economy.ts';
import { runBot } from '../../src/game/sim/bot.ts';
import type { GameState } from '../../src/game/sim/state.ts';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1, Math.abs(b));

function atGate(): GameState {
  const { state } = runBot((s) => s.height >= 200 && s.jobs.scout > 0, 6 * 3600, { ventures: false });
  state.glow = 0;
  state.plankton = 0;
  state.levels.skeleton += 3;
  return state;
}

test('an expedition home mid-way: offline equals online, and the jobs come back as they were', () => {
  const a = atGate();
  const jobs = { ...a.jobs };
  const idle = idleShoals(a);
  assert.ok(canSend(a));
  assert.ok(send(a));
  assert.equal(idleShoals(a), Math.max(0, idle - nextSite(a)!.shoals));
  assert.ok(a.jobs.feed + a.jobs.light + a.jobs.scout < jobs.feed + jobs.light + jobs.scout);
  const b = structuredClone(a);
  advance(a, 900);
  for (let i = 0; i < 900 * 30; i++) advance(b, 1 / 30);
  for (const k of ['calcite', 'glow', 'plankton', 'murmurs', 'height'] as const)
    assert.ok(rel(a[k], b[k]) < 1e-6, `${k}: ${a[k]} vs ${b[k]}`);
  for (const s of [a, b]) {
    assert.deepEqual(s.jobs, jobs);
    assert.equal(idleShoals(s), idle);
    assert.deepEqual(s.relics, ['gate']);
    assert.equal(s.expedition.site, '');
  }
});

test('the gate’s relic makes bands cheaper, and the next ruin waits for its height', () => {
  const s = atGate();
  send(s);
  advance(s, 3600);
  const without = structuredClone(s);
  without.relics = [];
  assert.ok(cost(s, 'skeleton') < cost(without, 'skeleton'));
  assert.equal(nextSite(s)?.id === 'terraces', s.height >= 500);
});

test('a roam when no ruin is in reach: a quarter of the shoals, home at the same moment offline or not', () => {
  const a = atGate();
  a.relics = ['gate', 'terraces', 'lamp-hall', 'wells', 'midden'];
  a.visits = [1, 2, 3, 4, 5]; // no sister visit on offer: this is about roaming
  const jobs = { ...a.jobs };
  const idle = idleShoals(a);
  assert.equal(nextSite(a)?.id, 'roam');
  assert.ok(send(a));
  assert.equal(a.expedition.n, Math.max(4, Math.floor(a.levels.shoal / 4)));
  const b = structuredClone(a);
  advance(a, 900);
  for (let i = 0; i < 900 * 30; i++) advance(b, 1 / 30);
  for (const s of [a, b]) {
    assert.deepEqual(s.jobs, jobs);
    assert.equal(idleShoals(s), idle);
    assert.equal(s.tally.roams, 1);
  }
  assert.ok(rel(a.murmurs, b.murmurs) < 1e-6 && rel(a.calcite, b.calcite) < 1e-6);
});

test('calling the shoals home early costs glow for the time left and brings them back with the relic', async () => {
  const { callHome, callHomeCost } = await import('../../src/game/sim/economy.ts');
  const s = atGate();
  const jobs = { ...s.jobs };
  send(s);
  advance(s, 60);
  const c = callHomeCost(s);
  assert.ok(c > 0);
  s.glow = c - 1;
  assert.equal(callHome(s), false);
  s.glow = c;
  assert.ok(callHome(s));
  assert.equal(s.glow, 0);
  assert.deepEqual(s.jobs, jobs);
  assert.deepEqual(s.relics, ['gate']);
});

test('the shoals’ signal: one try per slot, the right pattern pays, a wrong one spends the slot', async () => {
  const { currentSignal, answerSignal } = await import('../../src/game/sim/economy.ts');
  const s = atGate();
  let sig = null;
  for (let i = 0; i < 2000 && !sig; i++) { advance(s, 5); sig = currentSignal(s); }
  assert.ok(sig);
  const wrong = sig.pattern.map((x) => (x + 1) % 4);
  assert.equal(answerSignal(s, wrong), 0);
  assert.equal(currentSignal(s), null);
  sig = null;
  for (let i = 0; i < 2000 && !sig; i++) { advance(s, 5); sig = currentSignal(s); }
  assert.ok(answerSignal(s, sig!.pattern) > 0);
  assert.equal(s.signal.answered, 1);
});

test('the fork: pressing on makes the trip half again as long and brings a shard home', async () => {
  const { forkOpen, takeFork } = await import('../../src/game/sim/economy.ts');
  const s = atGate();
  s.meta.shards = [];
  send(s);
  assert.equal(forkOpen(s), false);
  advance(s, 181);
  assert.ok(forkOpen(s));
  const back = s.expedition.back;
  assert.ok(takeFork(s, 'press'));
  assert.equal(s.expedition.back, back + 180);
  advance(s, 1000);
  assert.deepEqual(s.relics, ['gate']);
  assert.ok(s.meta.shards.length >= 1);
});

test('encounters on later trips: following the lost lights brings two shoals home, slipping past hears half', async () => {
  const { currentEncounter, forkOpen, takeFork } = await import('../../src/game/sim/economy.ts');
  const base = atGate();
  send(base);
  advance(base, 1000);
  assert.deepEqual(base.relics, ['gate']);
  // Find reefs (seeds) whose next trip meets the lights, and the squid.
  const tripWith = (id: string) => {
    for (let seed = 1; seed < 400; seed++) {
      const s = structuredClone(base);
      s.seed = seed;
      if (!canSend(s)) s.glow = 1e12;
      if (!send(s)) continue;
      advance(s, (s.expedition.back - s.t) / 2 + 1);
      if (forkOpen(s) && currentEncounter(s).id === id) return s;
    }
    throw new Error(`no trip meets ${id}`);
  };
  const lights = tripWith('lights');
  const shoals = lights.levels.shoal;
  assert.equal(takeFork(lights, 'press'), false, 'only this encounter\'s ways');
  assert.ok(takeFork(lights, 'follow'));
  advance(lights, 5000);
  assert.equal(lights.levels.shoal, shoals + 2);
  const squid = tripWith('squid'), quiet = structuredClone(squid);
  const m0 = squid.earned.murmurs;
  assert.ok(takeFork(squid, 'slip') && takeFork(quiet, 'wait'));
  assert.ok(squid.expedition.back < quiet.expedition.back);
  advance(squid, 5000);
  assert.ok(squid.earned.murmurs > m0);
});

test('shells: one per slot on the Sunlit sand, new kinds first, kept by the line', async () => {
  const { currentShell, pickShell, knownBonus } = await import('../../src/game/sim/economy.ts');
  const { state: s } = runBot((x) => x.height >= 3850, 12 * 3600, { ventures: false });
  s.meta.shells = [];
  const before = knownBonus(s);
  let sh = null;
  for (let i = 0; i < 400 && !sh; i++) { advance(s, 5); sh = currentShell(s); }
  assert.ok(sh);
  assert.equal(pickShell(s), sh!.id);
  assert.equal(currentShell(s), null);
  assert.deepEqual(s.meta.shells, [sh!.id]);
  assert.ok(knownBonus(s) > before);
});
