import test from 'node:test';
import assert from 'node:assert/strict';
import { rate } from '../../src/game/ui/format.ts';

test('rates: signs, and no negative zero', () => {
  assert.equal(rate(1.5), '+1.5/s');
  assert.equal(rate(-0.25), '−0.25/s');
  assert.equal(rate(-0.001), '+0.00/s');
  assert.equal(rate(-0), '+0.00/s');
});
