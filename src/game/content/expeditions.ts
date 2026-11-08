// Expeditions: from the Midnight Water on, shoals can be sent away to a buried ruin of
// Thousandfold. While away they do no job; they come back at a fixed moment with a relic (a
// piece of the story and a lasting effect for this reef) and what they heard on the way.
// One site at a time, in order, each found once per reef.

export type SiteId = 'gate' | 'terraces' | 'lamp-hall' | 'wells' | 'midden' | 'sun-gate' | 'harbour';
/** A ruin, or a roam through the dark (repeatable, no relic). */
export type TripId = SiteId | 'roam' | 'visit' | 'carcass';

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

/** What the shoals can meet halfway to a ruin: one per trip, seeded (the first trip always finds the passage). */
export type ForkId = 'press' | 'home' | 'wait' | 'slip' | 'follow' | 'carry-on' | 'gather' | 'leave' | 'ride' | 'around' | 'feed' | 'pass' | 'read-wall' | 'pass-by' | 'scatter' | 'dazzle' | 'open' | 'leave-sealed' | 'carry-lamp' | 'leave-lamp' | 'feast-eggs' | 'go-round';
export type Encounter = {
  id: string; kicker: string; text: string;
  /** Each way: what it costs in time (a share of the trip, added; negative is quicker) and what it brings. */
  ways: readonly [{ id: ForkId; label: string; effect: string; time: number }, { id: ForkId; label: string; effect: string; time: number }];
};
export const ENCOUNTERS: readonly Encounter[] = [
  {
    id: 'passage', kicker: 'The shoals have found a passage',
    text: 'Halfway there, a crack in the old wall goes deeper than the shoals have been.',
    ways: [
      { id: 'press', label: 'Press on', effect: 'the trip\u00a0×1.5 ·\u00a0a shard, if any are left', time: 0.5 },
      { id: 'home', label: 'Come straight home', effect: 'as planned', time: 0 },
    ],
  },
  {
    id: 'squid', kicker: 'Something asleep across the way',
    text: 'A giant squid lies coiled across the old street, arms drifting. The shoals hang back, lamps dimmed.',
    ways: [
      { id: 'wait', label: 'Wait for it to wake and go', effect: 'the trip\u00a0×1.3 ·\u00a0they hear\u00a0×1.5 while they wait', time: 0.3 },
      { id: 'slip', label: 'Slip past, lamps out', effect: 'the trip\u00a0×0.75 ·\u00a0they hear\u00a0×0.5', time: -0.25 },
    ],
  },
  {
    id: 'lights', kicker: 'Lights in a side tunnel',
    text: 'Down a side tunnel, a few lamps blink in a rhythm the shoals almost know: stragglers, lost in the ruin.',
    ways: [
      { id: 'follow', label: 'Go after them', effect: 'the trip\u00a0×1.3 ·\u00a0+2 shoals come home', time: 0.3 },
      { id: 'carry-on', label: 'Carry on', effect: 'as planned', time: 0 },
    ],
  },
  {
    id: 'sponges', kicker: 'A garden in the dark',
    text: 'A hall full of glass sponges, grown over the ages into a forest of white lace. Things live in it.',
    ways: [
      { id: 'gather', label: 'Gather what lives there', effect: 'the trip\u00a0×1.2 ·\u00a0a minute of calcite when they are home', time: 0.2 },
      { id: 'leave', label: 'Leave it as it is', effect: 'as planned', time: 0 },
    ],
  },
  {
    id: 'current', kicker: 'A river in the sea',
    text: 'A fast current runs through the old streets the way the shoals are going, cold and strong.',
    ways: [
      { id: 'ride', label: 'Ride it', effect: 'the trip\u00a0×0.7', time: -0.3 },
      { id: 'around', label: 'Swim around it', effect: 'as planned', time: 0 },
    ],
  },
  {
    id: 'larvae', kicker: 'A field of small lights',
    text: 'In an open square, a cloud of glowing larvae hangs in the water, too many to count, drifting nowhere.',
    ways: [
      { id: 'feed', label: 'Stop and feed among them', effect: 'the trip\u00a0×1.2 ·\u00a0a chance of a shard', time: 0.2 },
      { id: 'pass', label: 'Pass through', effect: 'as planned', time: 0 },
    ],
  },
  {
    id: 'wall', kicker: 'A wall of bands',
    text: 'A whole wall of the old city laid bare by some slip of the silt: band over band, all of them still speaking.',
    ways: [
      { id: 'read-wall', label: 'Stop and listen', effect: 'the trip\u00a0×1.4 ·\u00a0they hear\u00a0×2', time: 0.4 },
      { id: 'pass-by', label: 'Pass by', effect: 'as planned', time: 0 },
    ],
  },
  {
    id: 'hunter', kicker: 'Something is hunting them',
    text: 'A long black fish with a red lamp under its eye has fallen in behind the shoals, and keeps pace.',
    ways: [
      { id: 'scatter', label: 'Scatter and regroup', effect: 'the trip\u00a0×1.1 ·\u00a0they hear\u00a0×0.5', time: 0.1 },
      { id: 'dazzle', label: 'Dazzle it with the reef’s light', effect: 'half your glow now ·\u00a0the trip\u00a0×0.8', time: -0.2 },
    ],
  },
  {
    id: 'store', kicker: 'A sealed storehouse',
    text: 'Behind a door of stone grown shut, the shoals can feel the cold of something kept: the old city’s stores, never eaten.',
    ways: [
      { id: 'open', label: 'Break it open', effect: 'the trip\u00a0×1.4 ·\u00a0five minutes of calcite when they are home', time: 0.4 },
      { id: 'leave-sealed', label: 'Leave it sealed', effect: 'as planned', time: 0 },
    ],
  },
  {
    id: 'lamp', kicker: 'A lamp still burning',
    text: 'In a niche of the old wall, one of the city’s lamps is still alight: a knot of glimmerseed nobody has fed for four hundred years.',
    ways: [
      { id: 'carry-lamp', label: 'Carry it home', effect: 'the trip\u00a0×1.25 ·\u00a0a minute of glow when they are home', time: 0.25 },
      { id: 'leave-lamp', label: 'Let it burn where it is', effect: 'as planned', time: 0 },
    ],
  },
  {
    id: 'eggs', kicker: 'A cloud of eggs',
    text: 'Something has spawned in the ruin, and its eggs hang in the old streets like smoke, drifting, uneaten.',
    ways: [
      { id: 'feast-eggs', label: 'Feed among them', effect: 'the trip\u00a0×1.2 ·\u00a0a minute of plankton when they are home', time: 0.2 },
      { id: 'go-round', label: 'Go round them', effect: 'as planned', time: 0 },
    ],
  },
];

export const EXPEDITION = {
  /** Shoals come back seasoned: feeding and light ×(1 + this × trips), at most `seasonedMax` trips. */
  seasoned: 0.02,
  seasonedMax: 20,
  seasonedWord: 'seasoned',
  /** Murmurs per shoal-second on the way (half what scouting at home hears). */
  heard: 0.5,
  label: 'Expeditions',
  heirLabel: 'What it carries',
  /** Calling the shoals home early: glow per second of the trip still to go. */
  callPerSecond: 5,
  call: 'Call them home',
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
    relic: 'A hinge of white stone', effect: 'bands cost\u00a0×0.85',
    text: 'The shoals come back slow, scraping their lights against each other. They found the gate ' +
      'Thousandfold kept for the currents: a ring of stone two hundred polyps wide, shut, by the city ' +
      'itself, when it decided the water should come in only where it said. Wedged in the hinge was a ' +
      'knuckle of white stone, worn smooth by opening. Your bands take it in. They remember how to let ' +
      'things through.',
  },
  {
    id: 'terraces', name: 'The nursery terraces', metres: 500, shoals: 10, seconds: 10 * 60,
    hint: 'Steps down a slope, each one lined with little cups.',
    relic: 'A sealed larva cup', effect: 'plankton is eaten\u00a0×0.75 as fast',
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
    relic: 'Well-stone', effect: 'scouts hear\u00a0×1.25, murmurs fade half as fast',
    text: 'The old polyps hung over these shafts to hear the city remember itself, over and over, ' +
      'until they could not hear anything else. The shoals hung there too. They came back quieter, ' +
      'and better at listening, and what they hear now stays with them longer.',
  },
  {
    id: 'midden', name: 'The beak midden', metres: 3300, shoals: 24, seconds: 30 * 60,
    hint: 'Behind the outer wall, a long pale slope. The Rasp will not go near it.',
    relic: 'One beak', effect: 'the Rasp grind\u00a0×1.3 sand',
    text: 'A slope of beaks. Thousands of them, fused teeth every one, heaped where the city threw ' +
      'the Rasp that died at its walls. Ossel says nothing for a long time. Then: I did not know. ' +
      'I was there, and I did not know. The shoals bring back a single beak. The Rasp who see it ' +
      'set into your reef grind harder, as if for someone.',
  },
  {
    id: 'sun-gate', name: 'The sun gate', metres: 3850, shoals: 28, seconds: 30 * 60,
    hint: 'High on the old city’s flank, a doorway that once stood in the light.',
    relic: 'A sun-bleached lintel', effect: 'bloom\u00a0×1.2',
    text: 'Before the walls, before the dark, Thousandfold grew here in the shallows and kept this door open to the ' +
      'sun. The lintel is bleached white by a light that has not touched it in four hundred years. The shoals bring ' +
      'back a piece of it, and your symbionts turn toward it as if it were still warm.',
  },
  {
    id: 'harbour', name: 'The harbour', metres: 3982, shoals: 30, seconds: 20 * 60,
    hint: 'On the city’s highest edge, where it met the open sea: a ring of worn posts.',
    relic: 'A mooring ring', effect: 'spawn\u00a0×1.15',
    text: 'Once the city sent its own spawn out from here, before it decided to keep everything. The posts are ' +
      'worn smooth on their seaward side by a million larvae brushing past on their way out. The shoals bring ' +
      'back a ring of stone that something was once tied to, and then let go.',
  },
];

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

/** The whale fall: once the whale has come down (a moment), one trip to feed at it. */
export const CARCASS = {
  seconds: 10 * 60, pay: 300,
  name: 'The whale fall', hint: 'The whale that came down is still feeding half the slope. The shoals could go and take their share.',
  effect: 'five minutes of calcite when they return', back: 'Back from the whale fall',
} as const;

/** Visiting the sister reef: when it is near your depth, once per zone, a short trip for lineage. */
export const VISIT = {
  near: 0.06, seconds: 8 * 60, lineage: 1,
  name: 'Visit the sister reef', hint: 'The sister reef is near your depth, on the next seamount. The shoals could swim over.',
  effect: '+1 lineage when they come home',
} as const;

/** Roaming: when no ruin is in reach, a quarter of the shoals can wander for a while. */
export const ROAM = {
  from: 150, minShoals: 4, share: 0.25, seconds: 10 * 60,
  name: 'Roam the dark', hint: 'No ruin in reach. The shoals could wander, and listen, and see what turns up.',
  effect: 'murmurs, and perhaps a shard', back: 'Back from roaming',
} as const;

/** The map of the buried city in the Bands tab: where each ruin lies (0..1 across, 0..1 down). */
export const CITY_MAP = {
  label: 'Thousandfold, as the shoals have seen it',
  where: { gate: [0.18, 0.55], terraces: [0.36, 0.78], 'lamp-hall': [0.55, 0.42], wells: [0.68, 0.66], midden: [0.86, 0.3], 'sun-gate': [0.5, 0.12], harbour: [0.3, 0.1] } as Record<SiteId, [number, number]>,
  roams: 'roams through the dark',
} as const;

export function site(id: string): Site | undefined {
  return SITES.find((x) => x.id === id);
}
