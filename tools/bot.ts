// Balance report: plays headlessly with time compressed and prints when each milestone lands.
// Usage: node tools/bot.ts [--spawn-at <metres>] [--no-sweep] [--max <seconds>] [--to <metres>] [--split feed,light,scout] [--truce aab]

import { calciteHold, ended, rates } from '../src/game/sim/economy.ts';
import { runBot } from '../src/game/sim/bot.ts';

const argv = process.argv;
const opt = (name: string) => { const i = argv.indexOf(`--${name}`); return i > 0 ? argv[i + 1] : undefined; };
const sweeps = !argv.includes('--no-sweep');
const maxT = Number(opt('max') ?? 16 * 3600);
const to = Number(opt('to') ?? Infinity);
const sp = opt('split')?.split(',').map(Number);
const split = sp ? { feed: sp[0]!, light: sp[1]!, scout: sp[2]! } : undefined;
const fmt = (t: number) => `${Math.floor(t / 3600)}h${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}m${String(Math.floor(t % 60)).padStart(2, '0')}s`;

const tr = opt('truce');
const truce = tr ? { terms: tr[0] as 'a' | 'b', story: tr[1] as 'a' | 'b', wall: tr[2] as 'a' | 'b' } : undefined;
const dl = opt('dialects')?.split(',') as [string, string, string] | undefined;
const dialects = dl ? { form: dl[0], craft: dl[1], spawn: dl[2] } as never : undefined;
const sa = opt('spawn-at');
const { state, events, total } = runBot((s) => s.height >= to || ended(s), maxT, { sweeps, split, truce, dialects, spawnAt: sa ? Number(sa) : undefined });
for (const e of events) console.log(`${fmt(e.t).padStart(10)}  ${e.what}`);
const r = rates(state);
console.log(`\nend total=${fmt(total)} t=${fmt(state.t)} height=${state.height.toFixed(1)} m calcite=${state.calcite.toExponential(2)} hold=${calciteHold(state, r).toExponential(2)} glow=${state.glow.toFixed(0)} plankton=${state.plankton.toFixed(0)} murmurs=${state.murmurs.toFixed(0)} silt=${state.silt.toFixed(0)} sand=${state.sand.toFixed(0)} rasp=${state.rasp} bloom=${state.bloom.toFixed(0)} spawn=${state.spawn.toFixed(0)}`);
console.log('levels', JSON.stringify(state.levels), 'jobs', JSON.stringify(state.jobs));
