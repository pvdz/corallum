// A headless player for balancing and for jumping the browser to later states.
// Plays with time compressed: one decision per `tick` seconds of sim time.

import { UPGRADES } from '../content/upgrades.ts';
import type { Job } from '../content/act2.ts';
import { assign, BANDS, breach, buy, canBreach, memoriesAvailable, nextTier, speak, calciteHold, canAfford, choose, cost, idleShoals, jobOpen, nextMeeting, nextReading, raspMax, read, reassign, setRasp, sweep, advance, timeUntil, readingCost, meetingWords, jobGain, steadyCalciteRate, bestRasp } from './economy.ts';
import type { Choice, MeetingId } from '../content/act3.ts';
import type { DialectId, DialectTier } from '../content/act4.ts';
import { newGame, type GameState } from './state.ts';
import { buyTrait, spawnLesser, traitCost, traitMaxed } from './prestige.ts';
import { TRAITS } from '../content/lineage.ts';

export type BotOptions = {
  seed?: number; tick?: number; sweeps?: boolean; split?: Record<Job, number>;
  truce?: Record<MeetingId, Choice>;
  dialects?: Record<DialectTier, DialectId>;
  /** Release one lesser spawning when the reef first reaches this height. */
  spawnAt?: number;
};
export type BotEvent = { t: number; what: string };

const DEFAULT_SPLIT: Record<Job, number> = { feed: 0.5, light: 0.3, scout: 0.2 };

/** One decision: read if possible, buy the cheapest affordable upgrades, place idle shoals. */
const DEFAULT_TRUCE: Record<MeetingId, Choice> = { terms: 'a', story: 'a', wall: 'a' };
const DEFAULT_DIALECTS: Record<DialectTier, DialectId> = { form: 'branching', craft: 'sweepers', spawn: 'broadcast' };

/** The Rasp dial setting with the best calcite hold (the dial is small, so try them all). */
export { bestRasp };

export function botDecide(
  s: GameState, sweeps: boolean, fixed?: Record<Job, number>, truce = DEFAULT_TRUCE, dialects = DEFAULT_DIALECTS,
): string[] {
  // Without a fixed split, feeders and light-swimmers go wherever they are worth most.
  const fixedSplit = fixed !== undefined;
  const split = fixed ?? DEFAULT_SPLIT;
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
  const nr = nextReading(s);
  const wantCost = nr ? readingCost(s, nr) : meet ? meetingWords(s, meet) : undefined;
  const scoutShare = wantCost === undefined || !jobOpen(s, 'scout') ? 0
    : timeUntil(s, 'murmurs', wantCost) > 900 ? Math.max(split.scout, 0.5) : split.scout;
  const total = s.levels.shoal;
  if (!fixedSplit) {
    // Scouts by share; feeders and light-swimmers wherever one more is worth more calcite.
    const scouts = Math.round(scoutShare * total);
    while (s.jobs.scout > scouts && reassign(s, 'scout', jobGain(s, 'feed') >= jobGain(s, 'light') ? 'feed' : 'light'));
    while (idleShoals(s) > 0) {
      if (s.jobs.scout < scouts && jobOpen(s, 'scout')) assign(s, 'scout', 1);
      else assign(s, jobGain(s, 'feed') >= jobGain(s, 'light') ? 'feed' : 'light', 1);
    }
    while (s.jobs.scout < scouts && (s.jobs.feed > 0 || s.jobs.light > 0))
      reassign(s, s.jobs.feed >= s.jobs.light ? 'feed' : 'light', 'scout');
    if (s.t % 30 < 1) balanceFeedLight(s);
  } else {
    const rest = (1 - scoutShare) / (split.feed + split.light);
    const share = { feed: split.feed * rest, light: split.light * rest, scout: scoutShare };
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
  }
  if (raspMax(s) > 0) setRasp(s, bestRasp(s));
  if (sweeps) sweep(s);
  return bought;
}

/** Move shoals one at a time between feeding and light while that raises settled calcite. */
function balanceFeedLight(s: GameState): void {
  for (let moves = 0; moves < 6; moves++) {
    const base = steadyCalciteRate(s);
    let best: ['feed' | 'light', 'feed' | 'light'] | null = null;
    let bestRate = base * 1.0005;
    for (const [from, to] of [['feed', 'light'], ['light', 'feed']] as const) {
      if (s.jobs[from] === 0) continue;
      const r = steadyCalciteRate({ ...s, jobs: { ...s.jobs, [from]: s.jobs[from] - 1, [to]: s.jobs[to] + 1 } });
      if (r > bestRate) { bestRate = r; best = [from, to]; }
    }
    if (!best || !reassign(s, best[0], best[1])) return;
  }
}

/** Run the bot until `until(s)` or `maxT` sim seconds. Returns the state and a milestone log. */
export function runBot(
  until: (s: GameState) => boolean,
  maxT: number,
  opts: BotOptions = {},
): { state: GameState; events: BotEvent[]; total: number } {
  const { seed = 1, tick = 1, sweeps = true, split, truce, dialects, spawnAt } = opts;
  let s = newGame(seed);
  let t0 = 0;
  const events: BotEvent[] = [];
  let bandsSeen = 0;
  let readingsSeen = 0;
  while (t0 + s.t < maxT && !until(s)) {
    if (spawnAt !== undefined && s.meta.spawnings === 0 && s.height >= spawnAt) {
      t0 += s.t;
      s = spawnLesser(s)!;
      bandsSeen = readingsSeen = 0;
      // Spend the lineage, cheapest trait first.
      for (;;) {
        const t = TRAITS.filter((x) => !traitMaxed(s, x.id)).sort((a, b) => traitCost(s, a.id) - traitCost(s, b.id))[0];
        if (!t || !buyTrait(s, t.id)) break;
      }
      events.push({ t: t0, what: `lesser spawning → ${JSON.stringify(s.meta.traits)}` });
    }
    const did = botDecide(s, sweeps, split, truce, dialects);
    for (const d of did) if (d.startsWith('truce:') || d.startsWith('dialect:') || d.startsWith('breach:')) events.push({ t: t0 + s.t, what: d });
    // Coarser ticks later in the game keep long runs fast; the bot still decides often
    // relative to how fast things change.
    advance(s, s.t < 3600 ? tick : tick * 5);
    const T = t0 + s.t;
    while (bandsSeen < s.bands.length) {
      const b = BANDS.find((x) => x.id === s.bands[bandsSeen]);
      events.push({ t: T, what: `band ${b?.metres ?? '?'} m — ${b?.title ?? s.bands[bandsSeen]}` });
      bandsSeen++;
    }
    while (readingsSeen < s.readings.length) {
      events.push({ t: T, what: `reading — ${s.readings[readingsSeen]}` });
      readingsSeen++;
    }
  }
  return { state: s, events, total: t0 + s.t };
}
