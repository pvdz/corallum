// Feats: small goals across all runs. Each is earned once per lineage (meta.seen 'f:<id>') and
// adds one lineage. Creatures touched are kept as 't:<id>'. Conditions are pure functions of the state.

import { SITES } from './expeditions.ts';
import type { GameState } from '../sim/state.ts';
import { CREATURES } from './creatures.ts';

export type Feat = { id: string; name: string; text: string; when: (s: GameState) => boolean };

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
  { id: 'feasts', name: 'Scavenger', text: 'Catch 20 feasts in one reef.', when: (s) => s.feasts >= 20 },
  { id: 'shoals', name: 'A city of lamps', text: 'Call 30 lanternfish shoals.', when: (s) => s.levels.shoal >= 30 },
  { id: 'ruins', name: 'Out in the black', text: 'Bring back a relic from every ruin.', when: (s) => s.relics.length >= SITES.length },
  { id: 'full-house', name: 'A full house', text: 'Give all three homes in the reef to residents.', when: (s) => s.residents.length >= 3 },
  { id: 'requests', name: 'Asked and done', text: 'Keep 20 of Ossel’s requests in one reef.', when: (s) => s.request.done >= 20 },
  { id: 'tablet', name: 'The whole tablet', text: 'Find every shard of Thousandfold’s tablet.', when: (s) => s.meta.shards.length >= 12 },
  { id: 'readings', name: 'Every band read', text: 'Read all of Thousandfold’s bands.', when: (s) => s.readings.length >= 9 },
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
  { id: 'endings', name: 'Many endings', text: 'Reach the ending three times.', when: (s) => s.meta.endings >= 3 },
  { id: 'seamounts', name: 'Far settled', text: 'Grow a reef on a cold or a warm seamount.', when: (s) => s.seamount === 'cold' || s.seamount === 'warm' },
  { id: 'every-seamount', name: 'Every kind of stone', text: 'Grow reefs on warm, cold and crowded seamounts.',
    when: (s) => ['warm', 'cold', 'crowded'].every((m) => s.seamount === m || s.meta.ancestors.some((a) => a.split('|')[1] === m)) },
  { id: 'named', name: 'A name', text: 'Give your reef a name.', when: (s) => s.meta.name !== '' },
  { id: 'touch', name: 'A light touch', text: 'Touch eight different creatures.', when: (s) => seenCount(s, 't:') >= 8 },
  { id: 'friend', name: 'A friend in the deep', text: 'Touch one creature fifteen times.', when: (s) => Object.values(s.meta.trust).some((n) => n >= 15) },
  { id: 'friends', name: 'Old friends', text: 'Be a friend to ten creatures.', when: (s) => Object.values(s.meta.trust).filter((n) => n >= 15).length >= 10 },
  { id: 'touch-many', name: 'Known to all', text: 'Touch twenty-five different creatures.', when: (s) => seenCount(s, 't:') >= 25 },
  { id: 'closer', name: 'A closer look', text: 'Zoom in close on a creature (view mode).', when: (s) => s.meta.seen.includes('did:closeup') },
  { id: 'picture', name: 'A picture', text: 'Save a picture of your reef.', when: (s) => s.meta.seen.includes('did:photo') },
];

/** Feats newly earned by this state (not yet recorded). */
export function newFeats(s: GameState): Feat[] {
  return FEATS.filter((f) => !s.meta.seen.includes(`f:${f.id}`) && f.when(s));
}
