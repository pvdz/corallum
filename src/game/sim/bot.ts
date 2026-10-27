// A headless player for balancing and for jumping the browser to later states.
// Plays with time compressed: one decision per `tick` seconds of sim time.

import { BANDS_ACT1, UPGRADES } from '../content/act1.ts';
import { act1Done, advance, buy, canAfford, cost, sweep } from './economy.ts';
import { newGame, type GameState } from './state.ts';

export type BotOptions = { seed?: number; tick?: number; sweeps?: boolean };
export type BotEvent = { t: number; what: string };

/** One decision: buy the cheapest affordable upgrade, repeatedly, then maybe sweep. */
export function botDecide(s: GameState, sweeps: boolean): string[] {
  const bought: string[] = [];
  for (;;) {
    const options = UPGRADES.filter((u) => canAfford(s, u.id)).sort(
      (a, b) => cost(s, a.id) - cost(s, b.id),
    );
    const pick = options[0];
    if (!pick || !buy(s, pick.id)) break;
    bought.push(pick.id);
  }
  if (sweeps) sweep(s);
  return bought;
}

/** Run the bot until `until(s)` or `maxT` sim seconds. Returns the state and a milestone log. */
export function runBot(
  until: (s: GameState) => boolean,
  maxT: number,
  opts: BotOptions = {},
): { state: GameState; events: BotEvent[] } {
  const { seed = 1, tick = 1, sweeps = true } = opts;
  const s = newGame(seed);
  const events: BotEvent[] = [];
  let bandsSeen = 0;
  while (s.t < maxT && !until(s)) {
    botDecide(s, sweeps);
    advance(s, tick);
    while (bandsSeen < s.bands.length) {
      const b = BANDS_ACT1.find((x) => x.id === s.bands[bandsSeen]);
      events.push({ t: s.t, what: `band ${b?.metres ?? '?'} m — ${b?.title ?? s.bands[bandsSeen]}` });
      bandsSeen++;
    }
  }
  if (act1Done(s)) events.push({ t: s.t, what: 'Act I complete' });
  return { state: s, events };
}
