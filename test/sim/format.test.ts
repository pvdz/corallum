// Panel numbers are cut, never rounded up: a stock never shows more than it holds, and a value
// just under a unit stays in the unit below (999,999 is 999k, not 1000k). Past the last suffix
// they turn scientific.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { num } from '../../src/game/ui/format.ts';

test('numbers are cut at unit edges and turn scientific past the suffixes', () => {
  assert.equal(num(999.9), '999');
  assert.equal(num(999_999), '999k');
  assert.equal(num(9_999), '9.99k');
  assert.equal(num(2_300), '2.30k');
  assert.equal(num(-1e9), '-1.00B');
  assert.equal(num(1.55e15), '1.55Qa');
  assert.equal(num(2e36), '2.00e36');
});
