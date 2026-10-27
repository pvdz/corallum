// A headless player for balancing and for jumping the browser to later states.
// Plays with time compressed: one decision per `tick` seconds of sim time.

import { UPGRADES } from '../content/upgrades.ts';
import type { Job } from '../content/act2.ts';
import { assign, BANDS, breach, buy, canBreach, memoriesAvailable, nextTier, speak, calciteHold, canAfford, choose, cost, idleShoals, jobOpen, nextMeeting, nextReading, raspMax, read, reassign, setRasp, sweep, advance, timeUntil } from './economy.ts';
import type { Choice, MeetingId } from '../content/act3.ts';
import type { DialectId, DialectTier } from '../content/act4.ts';
import { newGame, type GameState } from './state.ts';

export type BotOptions = {
  seed?: number; tick?: number; sweeps?: boolean; split?: Record<Job, number>;
  truce?: Record<MeetingId, Choice>;
  dialects?: Record<DialectTier, DialectId>;
};
export type BotEvent = { t: number; what: string };

const DEFAULT_SPLIT: Record<Job, number> = { feed: 0.5, light: 0.3, scout: 0.2 };

/** One decision: read if possible, buy the cheapest affordable upgrades, place idle shoals. */
const DEFAULT_TRUCE: Record<MeetingId, Choice> = { terms: 'a', story: 'a', wall: 'a' };
const DEFAULT_DIALECTS: Record<DialectTier, DialectId> = { form: 'branching', craft: 'sweepers', spawn: 'broadcast' };

/** The Rasp dial setting with the best calcite hold (the dial is small, so try them all). */
export function bestRasp(s: GameState): number {
  const keep = s.rasp;
  let best = 0, bestHold = -Infinity;
  for (let n = 0; n <= raspMax(s); n++) {
    s.rasp = n;
    const h = calciteHold(s);
    if (h > bestHold) { bestHold = h; best = n; }
  }
  s.rasp = keep;
  return best;
}

export function botDecide(
  s: GameState, sweeps: boolean, split = DEFAULT_SPLIT, truce = DEFAULT_TRUCE, dialects = DEFAULT_DIALECTS,
): string[] {
  const bought: string[] = [];
  const next = nextReading(s);
  if (next && read(s, next.id)) bought.push(`read:${next.id}`);
  const m = nextMeeting(s);
  if (m && choose(s, m.id, truce[m.id])) bought.push(`truce:${m.id}=${truce[m.id]}`);
  if (canBreach(s)) {
    const carry = memoriesAvailable(s).slice(0, 3).map((m) => m.id);
    if (breach(s, carry)) bought.push(`breach:${carry.join(',')}`);
  }
  const tier = nextTier(s);
  if (tier && speak(s, dialects[tier.tier])) bought.push(`dialect:${dialects[tier.tier]}`);
  // Save bloom for a waiting dialect rather than spending it on canopy.
  const saving = nextTier(s);
  for (;;) {
    const options = UPGRADES.filter((u) => canAfford(s, u.id) && !(saving && u.currency === 'bloom')).sort(
      (a, b) => cost(s, a.id) - cost(s, b.id),
    );
    const pick = options[0];
    if (!pick || !buy(s, pick.id)) break;
    bought.push(pick.id);
  }
  // Keep shoals near the target split; scouts are wasted once the Readings run out.
  const meet = nextMeeting(s);
  const wantCost = nextReading(s)?.cost ?? meet?.words;
  const scoutShare = wantCost === undefined || !jobOpen(s, 'scout') ? 0
    : timeUntil(s, 'murmurs', wantCost) > 900 ? Math.max(split.scout, 0.5) : split.scout;
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
  if (raspMax(s) > 0) setRasp(s, bestRasp(s));
  if (sweeps) sweep(s);
  return bought;
}

/** Run the bot until `until(s)` or `maxT` sim seconds. Returns the state and a milestone log. */
export function runBot(
  until: (s: GameState) => boolean,
  maxT: number,
  opts: BotOptions = {},
): { state: GameState; events: BotEvent[] } {
  const { seed = 1, tick = 1, sweeps = true, split, truce, dialects } = opts;
  const s = newGame(seed);
  const events: BotEvent[] = [];
  let bandsSeen = 0;
  let readingsSeen = 0;
  while (s.t < maxT && !until(s)) {
    const did = botDecide(s, sweeps, split, truce, dialects);
    for (const d of did) if (d.startsWith('truce:') || d.startsWith('dialect:') || d.startsWith('breach:')) events.push({ t: s.t, what: d });
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
