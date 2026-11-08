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

test('jobs load within the shoals at home: those away on a trip come back into theirs', async () => {
  const { runBot } = await import('../../src/game/sim/bot.ts');
  const { serialize, deserialize } = await import('../../src/game/sim/save.ts');
  const { state } = runBot((s) => s.t >= 11000, 11000);
  const n = state.levels.shoal;
  state.expedition = { site: 'roam', back: state.t + 40, feed: 0, light: 10, scout: 0, fan: 0, guard: 0, n: 10, fork: '' };
  // A damaged save: the jobs at home already count every shoal, and more.
  state.jobs = { feed: n, light: 40, scout: 0, fan: 0, guard: 0 };
  const loaded = deserialize(serialize(state, 0))!.state;
  const home = Object.values(loaded.jobs).reduce((a, b) => a + b, 0);
  assert.ok(home + 10 <= n, `jobs ${home} + 10 away must fit ${n} shoals`);
});

// Saves written by the game of 2026-10-29 (commit 2847364, its own bot at 600, 9000 and 22000 s):
// a player's reef from then must load, keep growing and stay finite through a long time away.
test('saves from an older version load and play on', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const { advance, rates } = await import('../../src/game/sim/economy.ts');
  const dir = new URL('./old-saves/', import.meta.url);
  const nonFinite = (o: unknown, path = ''): string[] =>
    typeof o === 'number' ? (Number.isFinite(o) ? [] : [path])
      : o && typeof o === 'object' ? Object.entries(o).flatMap(([k, v]) => nonFinite(v, `${path}.${k}`)) : [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 3);
  for (const f of files) {
    const loaded = deserialize(readFileSync(new URL(f, dir), 'utf8'));
    assert.ok(loaded, `${f} loads`);
    const s = loaded.state, h0 = s.height, earned0 = s.earned.calcite;
    advance(s, 8 * 3600);
    assert.deepEqual([...nonFinite(s), ...nonFinite(rates(s))], [], `${f}: every number finite`);
    assert.ok(s.height >= h0 && s.earned.calcite > earned0, `${f}: the reef keeps growing`);
  }
});
