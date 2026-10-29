// Expeditions: from the Midnight Water on, shoals can be sent away to a buried ruin of
// Thousandfold. While away they do no job; they come back at a fixed moment with a relic (a
// piece of the story and a lasting effect for this reef) and what they heard on the way.
// One site at a time, in order, each found once per reef.

export type SiteId = 'gate' | 'terraces' | 'lamp-hall' | 'wells' | 'midden';
/** A ruin, or a roam through the dark (repeatable, no relic). */
export type TripId = SiteId | 'roam' | 'visit';

export type Site = {
  id: SiteId;
  name: string;
  /** Reef height at which the shoals first notice it. */
  metres: number;
  /** Shoals the trip takes, and how long it lasts (sim seconds). */
  shoals: number;
  seconds: number;
  /** One line before going: what is out there. */
  hint: string;
  relic: string;
  effect: string;
  text: string;
};

export const EXPEDITION = {
  /** Shoals come back seasoned: feeding and light ×(1 + this × trips), at most `seasonedMax` trips. */
  seasoned: 0.02,
  seasonedMax: 20,
  seasonedWord: 'seasoned',
  /** Murmurs per shoal-second on the way (half what scouting at home hears). */
  heard: 0.5,
  label: 'Expeditions',
  heirLabel: 'What it carries',
  heirNone: 'Nothing',
  heirNote: 'One relic this reef found may go with the spawn: its effect in play on the next reef from the start.',
  intro: 'Send shoals to a ruin. They stop their work while they are away, and come back with what they find.',
  send: 'Send',
  away: 'away',
  back: 'The shoals are back',
  kicker: 'An expedition returns',
  done: 'Every ruin the shoals can reach has been searched.',
} as const;

export const SITES: readonly Site[] = [
  {
    id: 'gate', name: 'The fallen gate', metres: 150, shoals: 6, seconds: 6 * 60,
    hint: 'A ring of stone out in the black, where the current used to come in.',
    relic: 'A hinge of white stone', effect: 'bands cost ×0.85',
    text: 'The shoals come back slow, scraping their lights against each other. They found the gate ' +
      'Thousandfold kept for the currents: a ring of stone two hundred polyps wide, shut, by the city ' +
      'itself, when it decided the water should come in only where it said. Wedged in the hinge was a ' +
      'knuckle of white stone, worn smooth by opening. Your bands take it in. They remember how to let ' +
      'things through.',
  },
  {
    id: 'terraces', name: 'The nursery terraces', metres: 500, shoals: 10, seconds: 10 * 60,
    hint: 'Steps down a slope, each one lined with little cups.',
    relic: 'A sealed larva cup', effect: 'plankton is eaten ×0.75 as fast',
    text: 'Here Thousandfold raised its young, in rows, each larva given the same memories as the one ' +
      'before it. Some cups are still sealed. Inside is nothing, and the smell of plankton gone bad: ' +
      'food laid by for children who never came. The shoals learned there where plankton gathers and ' +
      'where it spoils. They waste less of it now.',
  },
  {
    id: 'lamp-hall', name: 'The lamp hall', metres: 1200, shoals: 14, seconds: 15 * 60,
    hint: 'A hall without a roof. Something in it still flickers.',
    relic: 'A lamp of the hall', effect: 'lure +1',
    text: 'The walls were studded with the shells of glowing things that lived there by agreement, ' +
      'lighting the city in return for its shelter. One still flickers. The shoals carried it home ' +
      'between them, a lamp passed mouth to mouth across the dark. It hangs in your reef now, and the ' +
      'water around it looks back.',
  },
  {
    id: 'wells', name: 'The listening wells', metres: 2200, shoals: 18, seconds: 20 * 60,
    hint: 'Shafts sunk deep into the city’s stone, ringed with grooves.',
    relic: 'Well-stone', effect: 'scouts hear ×1.25, murmurs fade half as fast',
    text: 'The old polyps hung over these shafts to hear the city remember itself, over and over, ' +
      'until they could not hear anything else. The shoals hung there too. They came back quieter, ' +
      'and better at listening, and what they hear now stays with them longer.',
  },
  {
    id: 'midden', name: 'The beak midden', metres: 3300, shoals: 24, seconds: 30 * 60,
    hint: 'Behind the outer wall, a long pale slope. The Rasp will not go near it.',
    relic: 'One beak', effect: 'the Rasp grind ×1.3 sand',
    text: 'A slope of beaks. Thousands of them, fused teeth every one, heaped where the city threw ' +
      'the Rasp that died at its walls. Ossel says nothing for a long time. Then: I did not know. ' +
      'I was there, and I did not know. The shoals bring back a single beak. The Rasp who see it ' +
      'set into your reef grind harder, as if for someone.',
  },
];

/** Roaming: when no ruin is in reach, a quarter of the shoals can wander for a while. */
/** What the shoals bring back from a roam: a tale and a little of something (seeded per roam). */
export const ROAM_TALES: readonly { text: string; pay: 'calcite' | 'glow' | 'murmurs' | 'shard' }[] = [
  { text: 'They found a wreck full of crabs, and a seam of old stone under it.', pay: 'calcite' },
  { text: 'A whale sang to them for an hour. They hum it now.', pay: 'murmurs' },
  { text: 'They swam through a cloud of glowing larvae and came back brighter.', pay: 'glow' },
  { text: 'In a crack in the silt, they saw writing.', pay: 'shard' },
  { text: 'They chased a squid’s ink cloud for a long way. It was worth it, they say.', pay: 'calcite' },
  { text: 'A dead reef, like Thousandfold but small, still murmuring to itself.', pay: 'murmurs' },
  { text: 'They met another shoal, and traded lights.', pay: 'glow' },
  { text: 'Nothing at all, for a long time, and then the stars of a far vent.', pay: 'calcite' },
];

/** Visiting the sister reef: when it is near your depth, once per zone, a short trip for lineage. */
export const VISIT = {
  near: 0.06, seconds: 8 * 60, lineage: 1,
  name: 'Visit the sister reef', hint: 'The sister reef is near your depth, on the next seamount. The shoals could swim over.',
  effect: '+1 lineage when they come home',
} as const;

export const ROAM = {
  from: 150, minShoals: 4, share: 0.25, seconds: 10 * 60,
  name: 'Roam the dark', hint: 'No ruin in reach. The shoals could wander, and listen, and see what turns up.',
  effect: 'murmurs, and perhaps a shard', back: 'Back from roaming',
} as const;

/** The map of the buried city in the Bands tab: where each ruin lies (0..1 across, 0..1 down). */
export const CITY_MAP = {
  label: 'Thousandfold, as the shoals have seen it',
  where: { gate: [0.18, 0.55], terraces: [0.36, 0.78], 'lamp-hall': [0.55, 0.42], wells: [0.68, 0.66], midden: [0.86, 0.3] } as Record<SiteId, [number, number]>,
  roams: 'roams through the dark',
} as const;

export function site(id: string): Site | undefined {
  return SITES.find((x) => x.id === id);
}
