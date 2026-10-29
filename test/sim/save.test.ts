import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deserialize, exportString, importString, serialize } from '../../src/game/sim/save.ts';
import { runBot } from '../../src/game/sim/bot.ts';
import { newGame } from '../../src/game/sim/state.ts';

test('round trip preserves state exactly', () => {
  const { state } = runBot((s) => s.t > 300, 1000);
  const back = deserialize(serialize(state, 12345));
  assert.deepEqual(back, { state, savedAt: 12345 });
});

test('garbage and partial saves are handled', () => {
  assert.equal(deserialize('not json'), null);
  assert.equal(deserialize('42'), null);
  assert.equal(importString('%%%'), null);
  const partial = deserialize(JSON.stringify({ state: { seed: 9, calcite: 50, levels: { polyp: 3 } }, savedAt: 1 }));
  const fresh = newGame(9);
  assert.equal(partial?.state.calcite, 50);
  assert.equal(partial?.state.levels.polyp, 3);
  assert.equal(partial?.state.levels.symbiont, 0);
  assert.deepEqual(partial?.state.earned, fresh.earned);
});

test('non-finite numbers are rejected field by field', () => {
  const back = deserialize('{"state":{"calcite":"lots","glow":null},"savedAt":"x"}');
  assert.equal(back?.state.calcite, 0);
  assert.equal(back?.state.glow, 0);
  assert.equal(back?.savedAt, 0);
});
