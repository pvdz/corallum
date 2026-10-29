import test from 'node:test';
import assert from 'node:assert/strict';
import { FEAST } from '../../src/game/content/events.ts';
import { LINEAGE } from '../../src/game/content/lineage.ts';
import { advance, calciteRate, currentFeast, feast, tableFeast } from '../../src/game/sim/economy.ts';
import { newGame } from '../../src/game/sim/state.ts';

test('feasts: none before their band, then one per window, eaten once', () => {
  const s = newGame(7);
  for (let t = 0; t < FEAST.period * 3; t += 5) {
    s.t = t;
    assert.equal(currentFeast(s), null);
  }
  s.bands.push(FEAST.band);
  let seen = 0;
  for (let k = 3; k < 13; k++) {
    let found = false;
    for (let t = k * FEAST.period; t < (k + 1) * FEAST.period; t += 1) {
      s.t = t;
      const f = currentFeast(s);
      if (!f) continue;
      assert.equal(f.k, k);
      assert.ok(f.start + FEAST.life <= (k + 1) * FEAST.period, 'a feast ends inside its window');
      if (!found) {
        const want = calciteRate(s) * FEAST.seconds;
        const before = s.calcite;
        assert.ok(Math.abs(feast(s) - want) < 1e-9);
        assert.ok(Math.abs(s.calcite - before - want) < 1e-9);
        assert.equal(currentFeast(s), null, 'eaten');
        assert.equal(feast(s), 0);
        found = true;
        seen++;
      }
    }
    assert.ok(found, `window ${k} had a feast`);
  }
  assert.equal(seen, 10);
  assert.equal(s.feasts, 10, 'each caught feast is counted');
});

test('feasts are deterministic and do not touch offline advance', () => {
  const a = newGame(3), b = newGame(3);
  a.bands.push(FEAST.band);
  b.bands.push(FEAST.band);
  advance(a, 5000);
  advance(b, 5000);
  assert.deepEqual(currentFeast(a), currentFeast(b));
  assert.equal(a.feasted, -1);
});

test('shared table: only with the trait, only in the last second, half the meal', () => {
  const s = newGame(7);
  s.bands.push(FEAST.band);
  let f = null;
  for (let t = FEAST.period; !f; t += 1) { s.t = t; f = currentFeast(s); }
  s.t = f.start + FEAST.life - 0.5;
  assert.equal(tableFeast(s), null, 'not without the trait');
  s.meta.traits['shared-table'] = 1;
  s.t = f.start + FEAST.life - 2;
  assert.equal(tableFeast(s), null, 'still in reach: left for the player');
  s.t = f.start + FEAST.life - 0.5;
  assert.equal(tableFeast(s)?.k, f.k);
  const full = calciteRate(s) * FEAST.seconds;
  assert.ok(Math.abs(feast(s, LINEAGE.tableShare) - full * LINEAGE.tableShare) < 1e-9);
  assert.equal(tableFeast(s), null, 'eaten once');
});
