// The panel asks the economy questions every frame (rates, countdowns, what is open). A question
// must never change the reef: a look-ahead writing through a shallow copy multiplies the shoals
// while a trip is out. Every one-argument query (85 of them) is asked here on a reef with a trip
// about to come home, and the reef must be byte-identical after.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as economy from '../../src/game/sim/economy.ts';
import { runBot } from '../../src/game/sim/bot.ts';

const QUERY = /^(current|until|time|can|next|steady|rates|calcite(Rate|Hold)|glowHold|plankton|silt|sand|bloom|spawn|murmur|cost|maxed|revealed|idle|jobOpen|homes|forkOpen|skyOpen|wishOpen|lightOpen|sportOpen|strainOpen|moon|inHeat|inFlurry|inMilky|inRising|feeding|readings|ended|reach|seamount|visitor|visited|lucky|oldKnobs|oldHeld|sisterNow|gaugeAt|heightCap|tripSeconds|currentEncounter)/;

test('the economy\'s queries leave the reef as it was (a trip out and due home)', () => {
  const { state } = runBot((s) => s.t >= 11000, 11000);
  state.expedition = { site: 'roam', back: state.t + 40, feed: 0, light: 6, scout: 0, fan: 0, guard: 0, n: 6, fork: '' };
  const asked: string[] = [];
  for (const [name, fn] of Object.entries(economy)) {
    if (typeof fn !== 'function' || fn.length !== 1 || !QUERY.test(name)) continue;
    const before = JSON.stringify(state);
    try { (fn as (s: unknown) => unknown)(state); } catch { continue; }
    assert.equal(JSON.stringify(state), before, `${name}(state) changed the reef`);
    asked.push(name);
  }
  // timeUntil takes more arguments (and simulates ahead): asked directly.
  const before = JSON.stringify(state);
  economy.timeUntil(state, 'calcite', economy.calciteHold(state) * 0.9);
  assert.equal(JSON.stringify(state), before, 'timeUntil changed the reef');
  assert.ok(asked.length > 20, `only ${asked.length} queries matched`);
});
