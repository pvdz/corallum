// A headless player for balancing and for jumping the browser to later states.
// Plays with time compressed: one decision per `tick` seconds of sim time.

import { UPGRADES } from '../content/act1.ts';
import type { Job } from '../content/act2.ts';
import { assign, BANDS, buy, canAfford, cost, idleShoals, jobOpen, murmurHold, nextReading, read, reassign, sweep, advance } from './economy.ts';
import { newGame, type GameState } from './state.ts';

export type BotOptions = { seed?: number; tick?: number; sweeps?: boolean; split?: Record<Job, number> };
export type BotEvent = { t: number; what: string };

const DEFAULT_SPLIT: Record<Job, number> = { feed: 0.5, light: 0.3, scout: 0.2 };

/** One decision: read if possible, buy the cheapest affordable upgrades, place idle shoals. */
export function botDecide(s: GameState, sweeps: boolean, split = DEFAULT_SPLIT): string[] {
  const bought: string[] = [];
  const next = nextReading(s);
  if (next && read(s, next.id)) bought.push(`read:${next.id}`);
  for (;;) {
    const options = UPGRADES.filter((u) => canAfford(s, u.id)).sort(
      (a, b) => cost(s, a.id) - cost(s, b.id),
    );
    const pick = options[0];
    if (!pick || !buy(s, pick.id)) break;
    bought.push(pick.id);
  }
  // Keep shoals near the target split; scouts are wasted once the Readings run out.
  const want = nextReading(s);
  const scoutShare = !want || !jobOpen(s, 'scout') ? 0 : murmurHold(s) < want.cost * 1.2 ? Math.max(split.scout, 0.5) : split.scout;
  const rest = (1 - scoutShare) / (split.feed + split.light);
  const share = { feed: split.feed * rest, light: split.light * rest, scout: scoutShare };
  const total = s.levels.shoal;
  const gap = (j: Job) => share[j] * total - s.jobs[j];
  while (idleShoals(s) > 0) {
    const best = (['feed', 'light', 'scout'] as const).reduce((a, b) => (gap(b) > gap(a) ? b : a));
    assign(s, best, 1);
  }
  for (let moves = 0; moves < total; moves++) {
    const jobs = ['feed', 'light', 'scout'] as const;
    const over = jobs.reduce((a, b) => (gap(b) < gap(a) ? b : a));
    const under = jobs.reduce((a, b) => (gap(b) > gap(a) ? b : a));
    if (gap(under) < 1 || !reassign(s, over, under)) break;
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
  const { seed = 1, tick = 1, sweeps = true, split } = opts;
  const s = newGame(seed);
  const events: BotEvent[] = [];
  let bandsSeen = 0;
  let readingsSeen = 0;
  while (s.t < maxT && !until(s)) {
    botDecide(s, sweeps, split);
    // Coarser ticks later in the game keep long runs fast; the bot still decides often
    // relative to how fast things change.
    advance(s, s.t < 3600 ? tick : tick * 5);
    while (bandsSeen < s.bands.length) {
      const b = BANDS.find((x) => x.id === s.bands[bandsSeen]);
      events.push({ t: s.t, what: `band ${b?.metres ?? '?'} m — ${b?.title ?? s.bands[bandsSeen]}` });
      bandsSeen++;
    }
    while (readingsSeen < s.readings.length) {
      events.push({ t: s.t, what: `reading — ${s.readings[readingsSeen]}` });
      readingsSeen++;
    }
  }
  return { state: s, events };
}
