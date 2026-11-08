import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endFrameSpots, sight, spot, takeSightings } from '../../src/game/render/sightings.ts';

const view = { x: 0, y: 0, w: 1000, h: 800 };

test('a creature counts as seen only once one of its spots is in the open scene', () => {
  takeSightings();
  // Entering from behind a side panel: drawn, but not yet seen.
  sight('chimaera');
  spot('chimaera', 1100, 400, 30);
  endFrameSpots(view);
  assert.deepEqual(takeSightings(), []);
  // A school with one fish in view is seen.
  sight('lanternfish');
  spot('lanternfish', -50, 300, 10);
  spot('lanternfish', 20, 300, 10);
  endFrameSpots(view);
  assert.deepEqual(takeSightings(), ['lanternfish']);
  // Drawn without any spot: counts as drawn.
  sight('jelly');
  endFrameSpots(view);
  assert.deepEqual(takeSightings(), ['jelly']);
  // Without a view (no frame size known yet), everything drawn counts.
  sight('chimaera');
  spot('chimaera', 1100, 400, 30);
  endFrameSpots();
  assert.deepEqual(takeSightings(), ['chimaera']);
});
