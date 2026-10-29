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
