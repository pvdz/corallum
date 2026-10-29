import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, gaugeAt, sisterAt } from '../../src/game/sim/economy.ts';
import { runBot } from '../../src/game/sim/bot.ts';

test('the sister race is judged at the exact crossing: offline and stepped agree, mark by mark', () => {
  for (const [h, lag] of [[50, 0], [2900, 0], [2900, 6000]] as const) {
    const { state: a } = runBot((s) => s.height >= h, 8 * 3600, { ventures: false });
    a.t += lag; // a slower reef: the sister is further along when the mark comes
    a.levels.skeleton += 4;
    const b = structuredClone(a);
    advance(a, 1200);
    for (let i = 0; i < 1200 * 10; i++) advance(b, 1 / 10);
    assert.deepEqual(a.race, b.race, `from ${h} m`);
    assert.equal(a.meta.lineage, b.meta.lineage);
  }
  assert.ok(sisterAt(0) === 0 && sisterAt(1e9) === 1 && gaugeAt(4000) === 1);
});

test('lighting the way: the sister climbs faster from that moment, and only when ahead on the shelf', async () => {
  const { lightOpen, lightSister, sisterNow, sisterAt } = await import('../../src/game/sim/economy.ts');
  const { newGame } = await import('../../src/game/sim/state.ts');
  const s = newGame(1);
  s.t = 9000;
  s.height = 2999;
  assert.equal(lightOpen(s), false, 'not below the shelf');
  s.height = 3500;
  assert.ok(lightOpen(s), 'ahead of her on the shelf');
  assert.ok(lightSister(s, true));
  assert.equal(lightOpen(s), false, 'once');
  assert.equal(sisterNow(s, 9000), sisterAt(9000));
  assert.ok(sisterNow(s, 12000) > sisterAt(12000));
});
