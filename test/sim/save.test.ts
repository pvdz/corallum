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

test('ids this version does not know (renamed, removed, or from a newer one) load as not chosen', () => {
  const { state } = runBot((s) => s.t > 300, 1000);
  const raw = JSON.parse(serialize(state, 1)) as { state: Record<string, any> };
  const st = raw.state;
  st.seamount = 'gone';
  st.request.kind = 'gone';
  st.dialects.form = 'gone';
  st.grains = ['dense', 'gone'];
  st.readings = ['gone'];
  st.expedition.site = 'gone';
  st.meta.chronicle = ['gone|vent,ossel|7.5'];
  const s = deserialize(JSON.stringify(raw))!.state;
  assert.equal(s.seamount, 'plain');
  assert.equal(s.request.kind, '');
  assert.equal(s.dialects.form, '');
  assert.deepEqual(s.grains, ['dense']);
  assert.deepEqual(s.readings, []);
  assert.equal(s.expedition.site, 'roam');
  assert.deepEqual(s.meta.chronicle, ['plain|vent,ossel|7.5']);
});

test('counts load whole and within bounds (a damaged save cannot ask for 1e30 shoals at work)', () => {
  const { state } = runBot((s) => s.t > 3000, 4000);
  const raw = JSON.parse(serialize(state, 1)) as { state: Record<string, any> };
  raw.state.levels.skeleton = 0.5;
  raw.state.levels.lure = 99;
  raw.state.jobs.scout = 1e30;
  raw.state.fragments = 1e30;
  const s = deserialize(JSON.stringify(raw))!.state;
  assert.equal(s.levels.skeleton, 0);
  assert.equal(s.levels.lure, 6);
  assert.ok(Object.values(s.jobs).reduce((a, b) => a + b, 0) <= s.levels.shoal);
  assert.ok(s.fragments <= 8);
});
