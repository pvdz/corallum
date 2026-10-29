// Feats: small goals across all runs. Each is earned once per lineage (meta.seen 'f:<id>') and
// adds one lineage. Creatures touched are kept as 't:<id>'. Conditions are pure functions of the state.

import { MEMORIES } from './act5.ts';
import { SITES } from './expeditions.ts';
import type { GameState } from '../sim/state.ts';
import { CREATURES } from './creatures.ts';
import { FIGURES } from './sky.ts';
import { MOMENTS } from './moments.ts';
import { ended, vowLineage } from '../sim/economy.ts';
import { VOWS } from './lineage.ts';

export type Feat = { id: string; name: string; text: string; when: (s: GameState) => boolean; progress?: (s: GameState) => [number, number];
  /** A secret: shown as ??? until earned. */
  hidden?: boolean };

const seenCount = (s: GameState, prefix: string) => s.meta.seen.filter((k) => k.startsWith(prefix)).length;
const zoneSeen = (s: GameState, zone: string) =>
  CREATURES.filter((c) => c.zone === zone).every((c) => s.meta.seen.includes(`c:${c.id}`));

export const FEATS: readonly Feat[] = [
  { id: 'first-polyp', name: 'Two mouths', text: 'Bud your first polyp.', when: (s) => s.levels.polyp >= 1 },
  { id: 'thicket', name: 'A thicket', text: 'Grow 25 polyps.', when: (s) => s.levels.polyp >= 25 },
  { id: 'grove', name: 'A grove', text: 'Grow 100 polyps.', when: (s) => s.levels.polyp >= 100 },
  { id: 'out-of-silt', name: 'Out of the silt', text: 'Rise 60 m.', when: (s) => s.height >= 60 },
  { id: 'kilometre', name: 'A kilometre of stone', text: 'Rise 1,000 m.', when: (s) => s.height >= 1000 },
  { id: 'grey', name: 'The first grey', text: 'Reach the Twilight Shelf.', when: (s) => s.height >= 3000 },
  { id: 'light', name: 'Into the light', text: 'Reach the Sunlit Crown.', when: (s) => s.height >= 3800 },
  { id: 'air', name: 'Air', text: 'Reach the surface.', when: (s) => s.height >= 4000 },
  { id: 'feast', name: 'Something fell', text: 'Catch a falling feast.', when: (s) => s.feasts >= 1 },
  { id: 'feasts', name: 'Scavenger', text: 'Catch 20 feasts in one reef.', when: (s) => s.feasts >= 20, progress: (s) => [s.feasts, 20] },
  { id: 'shoals', name: 'A city of lamps', text: 'Call 30 lanternfish shoals.', when: (s) => s.levels.shoal >= 30, progress: (s) => [s.levels.shoal, 30] },
  { id: 'ruins', name: 'Out in the black', text: 'Bring back a relic from every ruin.', when: (s) => s.relics.length >= SITES.length },
  { id: 'full-house', name: 'A full house', text: 'Give all three homes in the reef to residents.', when: (s) => s.residents.length >= 3 },
  { id: 'requests', name: 'Asked and done', text: 'Keep 20 of Ossel’s requests in one reef.', when: (s) => s.request.done >= 20, progress: (s) => [s.request.done, 20] },
  { id: 'tablet', name: 'The whole tablet', text: 'Find every shard of Thousandfold’s tablet.', when: (s) => s.meta.shards.length >= 12, progress: (s) => [s.meta.shards.length, 12] },
  { id: 'roamer', name: 'Wanderers', text: 'Send the shoals roaming ten times in one reef.', when: (s) => s.tally.roams >= 10, progress: (s) => [s.tally.roams, 10] },
  { id: 'works', name: 'Builder', text: 'Finish every great work in one reef.', when: (s) => Object.values(s.works).every((n) => n >= 3) },
  { id: 'moments', name: 'Met them all', text: 'Answer every moment in one reef.', when: (s) => Object.values(s.moments).every((c) => c !== '') },
  { id: 'sister', name: 'First to the light', text: 'Reach the surface before the sister reef.', when: (s) => s.race.decided >= 5 && s.race.won >= 1 && s.diary.some((d) => d.includes('|ahead|the surface')) },
  { id: 'trials', name: 'Every hard place', text: 'Meet the trial of every hard seamount.', when: (s) => ['hungry', 'silent', 'lonely', 'buried', 'dark'].every((m) => s.meta.seen.includes(`trial:${m}`)) },
  { id: 'gardener-end', name: 'A garden at dawn', text: 'Plant all twelve children after the release.', when: (s) => s.garden >= 12, progress: (s) => [s.garden, 12] },
  { id: 'riddles', name: 'The elder’s respect', text: 'Answer all six of the elder’s riddles rightly in one reef.', when: (s) => Object.values(s.riddles).every((r) => r === 'right') },
  { id: 'signals', name: 'Fluent', text: 'Answer ten of the shoals’ signals in one reef.', when: (s) => s.signal.answered >= 10, progress: (s) => [s.signal.answered, 10] },
  { id: 'companion', name: 'Kept close', text: 'Keep a creature close as your companion.', when: (s) => s.meta.companion !== '' },
  { id: 'shells', name: 'A full shelf', text: 'Keep all eight kinds of shell.', when: (s) => s.meta.shells.length >= 8, progress: (s) => [s.meta.shells.length, 8] },
  { id: 'readings', name: 'Every band read', text: 'Read every band the scouts can find.', when: (s) => s.readings.length >= 12, progress: (s) => [s.readings.length, 12] },
  { id: 'truce', name: 'Terms', text: 'Settle all three truce meetings.', when: (s) => !!s.truce.wall },
  { id: 'meadows', name: 'Gardener', text: 'Sow 6 seagrass meadows.', when: (s) => s.levels.meadow >= 6 },
  { id: 'deep-known', name: 'Deep things', text: 'See every creature of the Silt Floor.', when: (s) => zoneSeen(s, 'The Silt Floor') },
  { id: 'midnight-known', name: 'Lights in the dark', text: 'See every creature of the Midnight Water.', when: (s) => zoneSeen(s, 'The Midnight Water') },
  { id: 'twilight-known', name: 'Shelf life', text: 'See every creature of the Twilight Shelf.', when: (s) => zoneSeen(s, 'The Twilight Shelf') },
  { id: 'sunlit-known', name: 'Colour', text: 'See every creature of the Sunlit Crown.', when: (s) => zoneSeen(s, 'The Sunlit Crown') },
  { id: 'all-known', name: 'Naturalist', text: 'See every creature.', when: (s) => seenCount(s, 'c:') >= CREATURES.length },
  { id: 'spawned', name: 'Let go', text: 'Release the spawn under the Spawning Moon.', when: (s) => s.carried.length > 0 },
  { id: 'great-tide', name: 'Four memories', text: 'Release under a great tide.', when: (s) => s.carried.length >= 4 },
  { id: 'lesser', name: 'Children', text: 'Release a lesser spawning.', when: (s) => s.meta.spawnings >= 1 },
  { id: 'everything', name: 'Nothing lost, nothing kept', text: 'Across your endings, carry every memory there is.', when: (s) => s.meta.carriedEver.length >= MEMORIES.length },
  { id: 'remembered', name: 'Remembered truly', text: 'Reach the ending knowing all of Ossel’s mistakes and the whole tablet.', hidden: true,
    when: (s) => s.carried.length > 0 && ['fought', 'sky', 'gate', 'killed', 'afraid'].every((m) => s.meta.seen.includes(`o:${m}`)) && s.meta.shards.length >= 12 },
  { id: 'endings', name: 'Many endings', text: 'Reach the ending three times.', when: (s) => s.meta.endings >= 3, progress: (s) => [s.meta.endings, 3] },
  { id: 'seamounts', name: 'Far settled', text: 'Grow a reef on a cold or a warm seamount.', when: (s) => s.seamount === 'cold' || s.seamount === 'warm' },
  { id: 'every-seamount', name: 'Every kind of stone', text: 'Grow reefs on warm, cold and crowded seamounts.',
    when: (s) => ['warm', 'cold', 'crowded'].every((m) => s.seamount === m || s.meta.ancestors.some((a) => a.split('|')[1] === m)) },
  { id: 'named', name: 'A name', text: 'Give your reef a name.', when: (s) => s.meta.name !== '' },
  { id: 'touch', name: 'A light touch', text: 'Touch eight different creatures.', when: (s) => seenCount(s, 't:') >= 8, progress: (s) => [seenCount(s, 't:'), 8] },
  { id: 'friend', name: 'A friend in the deep', text: 'Touch one creature fifteen times.', when: (s) => Object.values(s.meta.trust).some((n) => n >= 15) },
  { id: 'friends', name: 'Old friends', text: 'Be a friend to ten creatures.', when: (s) => Object.values(s.meta.trust).filter((n) => n >= 15).length >= 10, progress: (s) => [Object.values(s.meta.trust).filter((n) => n >= 15).length, 10] },
  { id: 'touch-many', name: 'Known to all', text: 'Touch twenty-five different creatures.', when: (s) => seenCount(s, 't:') >= 25, progress: (s) => [seenCount(s, 't:'), 25] },
  { id: 'closer', name: 'A closer look', text: 'Zoom in close on a creature (view mode).', when: (s) => s.meta.seen.includes('did:closeup') },
  { id: 'talker', name: 'Old friends talking', text: 'Tap Ossel ten times.', hidden: true, when: (s) => s.meta.seen.includes('did:ossel10') },
  { id: 'dark-picture', name: 'A picture in the dark', text: 'Save a picture of your reef in the Midnight Water.', hidden: true, when: (s) => s.meta.seen.includes('did:photo-dark') },
  { id: 'watcher', name: 'Just watching', text: 'Watch the reef in view mode for five minutes.', hidden: true, when: (s) => s.meta.seen.includes('did:watch') },
  { id: 'blessed', name: 'The elder’s blessing', text: 'Answer every one of the elder’s riddles rightly on one reef.', when: (s) => Object.values(s.riddles).every((r) => r === 'right') },
  { id: 'full-sweep', name: 'Eleven in a row', text: 'Sweep fast enough to reach a double combo.', when: (s) => s.combo >= 11 },
  { id: 'every-crest', name: 'Every crest', text: 'Catch all five crests of one set of swells.', when: (s) => s.swell.caught === 0b11111 },
  { id: 'six-in-a-row', name: 'Six in a row', text: 'Answer the shoals’ signal six times in a row.', when: (s) => s.signal.streak >= 6, progress: (s) => [s.signal.streak, 6] },
  { id: 'heard-it-all', name: 'Ossel heard it all', text: 'Answer all of Ossel’s questions on one reef.', when: (s) => Object.values(s.asked).every((a) => a !== '') },
  { id: 'both-ways', name: 'Both ways', text: 'Across the line, meet every moment both ways.', when: (s) => MOMENTS.every((m) => s.meta.seen.includes(`m:${m.id}:a`) && s.meta.seen.includes(`m:${m.id}:b`)), progress: (s) => [s.meta.seen.filter((k) => k.startsWith('m:')).length, MOMENTS.length * 2] },
  { id: 'vowed', name: 'Every vow kept', text: 'Reach the surface and spawn under all three vows, all kept.', hidden: true, when: (s) => ended(s) && s.vows.length === VOWS.length && vowLineage(s) === VOWS.reduce((a, v) => a + v.lineage, 0) },
  { id: 'freed', name: 'Untangler', text: 'Free ten tangled fish in one reef.', when: (s) => s.tally.freed >= 10, progress: (s) => [s.tally.freed, 10] },
  { id: 'visitors', name: 'A week of visitors', text: 'Touch the day’s visitor on seven different days.', when: (s) => seenCount(s, 'v:') >= 7, progress: (s) => [seenCount(s, 'v:'), 7] },
  { id: 'garden-kinds', name: 'Every kind', text: 'Plant a quick, a bright and a deep child in one garden.', when: (s) => ['q', 'b', 'd'].every((k) => s.gardenKinds.includes(k)) },
  { id: 'three-wishes', name: 'Three wishes', text: 'Wish for the line three times on one reef.', when: (s) => s.lineWishes >= 3, progress: (s) => [s.lineWishes, 3] },
  { id: 'lucky', name: 'Touched by luck', text: 'Touch five different lucky neighbours (golden sparks), across all reefs.', when: (s) => seenCount(s, 'g:') >= 5, progress: (s) => [seenCount(s, 'g:'), 5] },
  { id: 'milky', name: 'Wading in light', text: 'Sweep 40 times through a milky sea in one reef.', when: (s) => s.tally.milky >= 40, progress: (s) => [s.tally.milky, 40] },
  { id: 'pruned', name: 'Light stone', text: 'Let 50 knobs of old stone go in one reef.', when: (s) => s.tally.pruned >= 50, progress: (s) => [s.tally.pruned, 50] },
  { id: 'risings', name: 'Into the rising', text: 'Send the feeders into ten risings.', when: (s) => s.tally.risings >= 10, progress: (s) => [s.tally.risings, 10] },
  { id: 'stars', name: 'Every star a name', text: 'Name all six figures in the night sky over one Breach.', when: (s) => FIGURES.every((f) => s.sky[f.id]), progress: (s) => [FIGURES.filter((f) => s.sky[f.id]).length, FIGURES.length] },
  { id: 'picture', name: 'A picture', text: 'Save a picture of your reef.', when: (s) => s.meta.seen.includes('did:photo') },
];

/** Feats newly earned by this state (not yet recorded). */
export function newFeats(s: GameState): Feat[] {
  return FEATS.filter((f) => !s.meta.seen.includes(`f:${f.id}`) && f.when(s));
}
