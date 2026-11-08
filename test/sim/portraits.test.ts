// The journal's art versions name creatures by id: a typo would silently keep a stale portrait.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REDRAWN } from '../../src/client/portraits.ts';
import { CREATURES } from '../../src/game/content/creatures.ts';

test('every redrawn creature in the portraits art list is a creature', () => {
  const ids = new Set<string>(CREATURES.map((c) => c.id));
  assert.deepEqual(REDRAWN.flat().filter((id) => !ids.has(id)), []);
  assert.deepEqual(REDRAWN[0], []);
});
