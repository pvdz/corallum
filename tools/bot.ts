// Balance report: plays Act I headlessly and prints when each milestone lands.
// Usage: node tools/bot.ts [--no-sweep] [--max <seconds>]

import { act1Done, calciteHold, rates } from '../src/game/sim/economy.ts';
import { runBot } from '../src/game/sim/bot.ts';

const sweeps = !process.argv.includes('--no-sweep');
const mi = process.argv.indexOf('--max');
const maxT = mi > 0 ? Number(process.argv[mi + 1]) : 6 * 3600;
const fmt = (t: number) => `${Math.floor(t / 60)}m${String(Math.floor(t % 60)).padStart(2, '0')}s`;

const { state, events } = runBot(act1Done, maxT, { sweeps });
for (const e of events) console.log(`${fmt(e.t).padStart(9)}  ${e.what}`);
const r = rates(state);
console.log(`\nend t=${fmt(state.t)} height=${state.height.toFixed(1)} m calcite=${state.calcite.toFixed(0)} hold=${calciteHold(state, r).toFixed(0)} glow=${state.glow.toFixed(1)}`);
console.log('levels', JSON.stringify(state.levels));
