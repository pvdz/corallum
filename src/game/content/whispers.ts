// Ossel's whispers: short lines that surface over the water when something is worth noticing.
// Each is said once per lineage, and only while it is still news (early hints are bounded to the
// early game). Conditions are pure functions of the state.

import type { GameState } from '../sim/state.ts';
import { actAt } from './acts.ts';
import { OSSEL_MISTAKES } from './ossel.ts';
import {
  calciteHold, canSend, oldKnobs, inMilky, currentThorn, guarding, inFlurry, inHeat, inRising, currentUpwelling, currentSwell, grainsWaiting, skyOpen, canFlare, glowHold, waterAt, homes, workOpen, sisterNow, gaugeAt, cost, currentFeast, idleShoals, raspSettings, moonFull, nextReading, readingsRevealed, smother, untilFullMoon,
} from '../sim/economy.ts';

export type Whisper = { id: string; when: (s: GameState) => boolean; text: string };

/** Who says the whispers: Ossel, or once its wall is ground down (the truce's wall answer), the sand. */
export const WHISPER_BY = { ossel: 'Ossel', sand: 'the sand' } as const;

/** Seen (in the journal) but never touched. */
const metNot = (s: GameState, id: string, zones: readonly number[]) =>
  zones.includes(actAt(s.height)) && s.meta.seen.includes(`c:${id}`) && !s.meta.seen.includes(`t:${id}`);

export const WHISPERS: readonly Whisper[] = [
  // Ossel's mistakes, said in passing while they are still believable (content/ossel.ts).
  ...OSSEL_MISTAKES.map((m) => ({ id: `claim-${m.id}`, when: (s: GameState) => s.height >= m.metres && !m.truth(s), text: m.claim })),
  {
    id: 'two', when: (s) => s.levels.polyp >= 1 && s.levels.polyp <= 3,
    text: 'Good. Now there are two of you eating.',
  },
  {
    id: 'band', when: (s) => s.levels.skeleton >= 1 && s.levels.skeleton <= 3,
    text: 'Feel it harden? That is a day you will not forget.',
  },
  {
    id: 'lure', when: (s) => s.levels.symbiont >= 1 && s.levels.symbiont <= 4,
    text: 'Light draws food. The brighter you burn, the more drifts in.',
  },
  {
    id: 'full', when: (s) => s.calcite > 50 && s.calcite >= 0.95 * calciteHold(s),
    text: 'You are full, little mouth. What you cannot hold, the deep water takes back. Pack the stone tighter.',
  },
  {
    id: 'out-of-reach',
    when: (s) => s.levels.skeleton > 3 && cost(s, 'skeleton') > calciteHold(s) && s.height < 3000,
    text: 'That band is more than you can hold at once. Hold more, or eat faster.',
  },
  {
    id: 'feast', when: (s) => currentFeast(s) !== null,
    text: 'Something is falling past us. Catch it before it sinks into the dark.',
  },
  {
    id: 'touch',
    when: (s) => s.meta.seen.filter((k) => k.startsWith('c:')).length >= 4 && !s.meta.seen.some((k) => k.startsWith('t:')),
    text: 'We are not alone down here. Touch one of them, gently. Most will answer.',
  },
  {
    id: 'moon-deep', when: (s) => moonFull(s.t) && s.height > 20 && s.height < 3800,
    text: 'Do you feel that? The moon is full, far above. Your polyps let a little go without asking you. One night it will be all of it.',
  },
  // Neighbours worth meeting: once one is seen and not yet touched, Ossel points at it.
  {
    id: 'touch-lanternfish', when: (s) => metNot(s, 'lanternfish', [2, 3]) && s.levels.shoal >= 6,
    text: 'Reach into the lanternfish when they pass. They answer with light.',
  },
  {
    id: 'touch-octopus', when: (s) => metNot(s, 'octopus', [3]),
    text: 'There is an octopus on the slope pretending to be sand. Touch it, and see how it takes that.',
  },
  {
    id: 'touch-clownfish', when: (s) => metNot(s, 'clownfish', [4]),
    text: 'The little striped ones live in the stinging flower. Reach for them and watch where they go.',
  },
  {
    id: 'touch-dolphin', when: (s) => metNot(s, 'dolphin', [5]),
    text: 'When the dolphins leap, reach for them. They like to be asked.',
  },
  {
    id: 'water', when: (s) => waterAt(s).id === 'rich' && s.levels.polyp > 10,
    text: 'Taste the water. It is rich today. Bud now, while it is easy; it will not last.',
  },
  {
    id: 'flurry', when: (s) => inFlurry(s) && s.levels.polyp >= 3,
    text: 'The snow is falling thick. Sweep now: there is more in it than silt.',
  },
  {
    id: 'milky', when: (s) => inMilky(s),
    text: 'The whole sea is alight. Sweep through it: every touch of it is light we can keep.',
  },
  {
    id: 'rising', when: (s) => inRising(s) && s.levels.shoal > 0 && s.rose < 0,
    text: 'Look down. The whole deep is coming up to eat. Put the shoals on feeding and send them in with it.',
  },
  {
    id: 'old', when: (s) => oldKnobs(s) >= 1 && s.tally.pruned === 0,
    text: 'See the grey on the tips? Stone we kept too long. It is heavy. Tap it, and let it go.',
  },
  {
    id: 'flare', when: (s) => canFlare(s) && s.lastFlare < 0 && s.glow > 0.95 * glowHold(s) && s.height < 3000,
    text: 'Our light is as full as it gets. Throw half of it out at once, a blaze, and see what comes to it.',
  },
  {
    id: 'upwell', when: (s) => !!currentUpwelling(s) && s.upwelled < 0,
    text: 'Cold water, coming up from the deep on one side. Turn the current to meet it; it brings things with it.',
  },
  {
    id: 'swell', when: (s) => !!currentSwell(s) && s.swell.k < 0,
    text: 'Big water coming. Rise with each wave as it crests over us: tap the crown just as it peaks.',
  },
  {
    id: 'grain', when: (s) => grainsWaiting(s) > 0 && s.grains.length === 0,
    text: 'This band is still soft. How it sets is up to you, and it will stay that way in the stone.',
  },
  {
    id: 'sky', when: (s) => skyOpen(s) && s.height >= 3990 && !Object.values(s.sky).some(Boolean),
    text: 'Look up. Those lights have no names. Nobody down here ever saw them. Give them some.',
  },
  {
    id: 'dream', when: (s) => s.meta.dreams > 0 && s.t > 600,
    text: 'You have a dream kept. I dream all the time. A quarter of an hour, gone, and everything grown.',
  },
  {
    id: 'guard', when: (s) => s.height >= 3800 && s.levels.shoal >= 8 && !guarding(s) && !!currentThorn(s),
    text: 'Something is at the reef again. Up here the shoals could stand guard: four of them, circling, and nothing gets close.',
  },
  {
    id: 'heat', when: (s) => inHeat(s) && !s.closed && s.bloom > 1,
    text: 'Feel that? The water is warm. Stay open and drink the sun, or close up before the colour goes out of you.',
  },
  {
    id: 'work', when: (s) => (['spire', 'breakwater', 'terrace'] as const).some((w) => workOpen(s, w) && s.works[w] === 0),
    text: 'Something this big takes more than one kind of wealth. Gather both, then build.',
  },
  {
    id: 'resident', when: (s) => homes(s) > 0 && s.residents.length === 0,
    text: 'Someone small is asking to live in your branches. Let them in; they will earn their keep.',
  },
  {
    id: 'sister', when: (s) => s.height > 100 && s.race.decided < 5 && sisterNow(s, s.t) > gaugeAt(s.height),
    text: 'There is another reef on the next seamount. Ours, from the old wall. It is ahead of you. Do not let it reach the light first.',
  },
  {
    id: 'shard', when: (s) => s.meta.shards.length === 1,
    text: 'That stone has writing on it. Thousandfold’s. There will be more of it in the silt.',
  },
  {
    id: 'trust', when: (s) => Object.values(s.meta.trust).some((n) => n >= 5 && n < 8),
    text: 'They know you now. Things that know you give more freely.',
  },
  {
    id: 'ruin', when: (s) => s.relics.length === 0 && canSend(s),
    text: 'The shoals have seen something out in the black: a ring of stone. Send some of them. I want to know what it is.',
  },
  {
    id: 'idle', when: (s) => idleShoals(s) > 0,
    text: 'Some of the lanternfish are waiting for you to tell them what to do.',
  },
  {
    id: 'listen', when: (s) => readingsRevealed(s) && s.jobs.scout === 0 && !!nextReading(s),
    text: 'Send a shoal down to listen at the silt. The old bands are still talking.',
  },
  {
    id: 'smother', when: (s) => s.silt > 0 && smother(s.silt) < 0.4,
    text: 'The silt is choking your polyps. Let the Rasp graze, or turn the current with sand.',
  },
  {
    id: 'rasp-away', when: (s) => s.rasp > 0 && s.height > 3100 && s.height < 3980 && (() => {
      const b = raspSettings(s);
      return Math.abs(b.forIncome - b.forHold) >= 4;
    })(),
    text: 'Before you leave me for long, send some of the Rasp away. Fewer mouths, and the stone keeps.',
  },
  {
    id: 'bloom', when: (s) => s.bloom > 1000,
    text: 'Sugar, from light. I never knew. Spend it, and you will be hungry for a while.',
  },
  {
    id: 'moon', when: (s) => s.height >= 3980 && !moonFull(s.t) && untilFullMoon(s.t) < 180,
    text: 'The moon is nearly round. Every reef is holding its breath.',
  },
];

/** What Ossel says when you tap it (the Silt Floor, or its wall on the Twilight Shelf), in turn. */
/** What Ossel says when tapped and something is going on: the first that applies, in order. */
export const OSSEL_NOW: readonly { when: (s: GameState) => boolean; text: string }[] = [
  { when: (s) => !!s.expedition.site, text: 'The shoals are out there somewhere. I can feel the water they push.' },
  { when: (s) => s.race.decided > 0 && s.race.decided < 5 && sisterNow(s, s.t) > gaugeAt(s.height), text: 'Your sister is ahead. I knew its wall too. It was always the quick one.' },
  { when: (s) => s.race.decided > 0 && s.race.decided < 5 && sisterNow(s, s.t) <= gaugeAt(s.height), text: 'You are ahead of your sister. Do not gloat. Well. A little.' },
  { when: (s) => waterAt(s).id !== 'still' && s.bands.includes('rise'), text: 'Taste that? The water has turned. Spend while it is kind.' },
  { when: (s) => s.residents.length > 0, text: 'Your lodgers are noisy. I like them.' },
  { when: (s) => s.meta.shards.length > 0 && s.meta.shards.length < 12, text: 'Those shards. I know that hand. I do not want to know what it says.' },
  { when: (s) => s.meta.shards.length >= 12, text: 'Forget us gently. Yes. I think I can.' },
];

/** Ossel's lines once some of its mistakes have been found: humbler. */
export const OSSEL_LINES_TRUE: readonly string[] = [
  'I said a lot of things, down there. Some were true.',
  'Ask me anything. I will tell you what I remember, and that I might be wrong.',
  'We were afraid. I can say it now.',
  'The Rasp were never thieves. We just could not stand to lose anything.',
  'Grow how you like. Not how we did.',
];

export const OSSEL_LINES: readonly string[] = [
  'Yes, I am still here. Where else would I be?',
  'Grow. Do not look at me like that. Grow.',
  'I was a wall once. A good one. Nothing got through.',
  'The snow is ground stone, you know. Old reefs. Do not eat it.',
  'You glow the way we used to, before the end.',
  'Listen to the silt sometimes. It is mostly us, talking.',
  'When you are tall enough, tell me what the light is like.',
  'I have forgotten things. I know that I have. I do not know which.',
];
