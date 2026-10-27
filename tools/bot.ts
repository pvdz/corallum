// Balance report: plays headlessly with time compressed and prints when each milestone lands.
// Usage: node tools/bot.ts [--no-sweep] [--max <seconds>] [--to <metres>] [--split feed,light,scout]

import { calciteHold, rates } from '../src/game/sim/economy.ts';
import { runBot } from '../src/game/sim/bot.ts';

const argv = process.argv;
const opt = (name: string) => { const i = argv.indexOf(`--${name}`); return i > 0 ? argv[i + 1] : undefined; };
const sweeps = !argv.includes('--no-sweep');
const maxT = Number(opt('max') ?? 12 * 3600);
const to = Number(opt('to') ?? 3000);
const sp = opt('split')?.split(',').map(Number);
const split = sp ? { feed: sp[0]!, light: sp[1]!, scout: sp[2]! } : undefined;
const fmt = (t: number) => `${Math.floor(t / 3600)}h${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}m${String(Math.floor(t % 60)).padStart(2, '0')}s`;

const { state, events } = runBot((s) => s.height >= to, maxT, { sweeps, split });
for (const e of events) console.log(`${fmt(e.t).padStart(10)}  ${e.what}`);
const r = rates(state);
console.log(`\nend t=${fmt(state.t)} height=${state.height.toFixed(1)} m calcite=${state.calcite.toExponential(2)} hold=${calciteHold(state, r).toExponential(2)} glow=${state.glow.toFixed(0)} plankton=${state.plankton.toFixed(0)} murmurs=${state.murmurs.toFixed(0)}`);
console.log('levels', JSON.stringify(state.levels), 'jobs', JSON.stringify(state.jobs));
