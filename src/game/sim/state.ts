// The whole game state. Plain JSON-able data so saving is a stringify.

import type { DayId } from '../content/events.ts';
import type { QuestionId } from '../content/ossel.ts';
import type { ForkId } from '../content/expeditions.ts';
import type { GrainId, SportId } from '../content/act1.ts';
import type { FigureId } from '../content/sky.ts';
import type { Job, ReadingId } from '../content/act2.ts';
import type { StrainId } from '../content/act1.ts';
import { CREATURES, type CreatureId } from '../content/creatures.ts';
import type { FavourId, MeetingId, RiddleId } from '../content/act3.ts';
import type { DialectId, DialectTier } from '../content/act4.ts';
import type { MemoryId } from '../content/act5.ts';
import type { RequestKind } from '../content/requests.ts';
import type { WorkId } from '../content/works.ts';
import type { MomentId } from '../content/moments.ts';
import type { ResidentId } from '../content/residents.ts';
import type { SiteId, TripId } from '../content/expeditions.ts';
import type { BoonId, SeamountId, TraitId, VowId } from '../content/lineage.ts';
import type { UpgradeId } from '../content/types.ts';

export const SAVE_VERSION = 1;

/** Seconds of sim time between growth-chart samples; at most HISTORY_MAX are kept (thinned by half). */
export const HISTORY_STEP = 300;
export const HISTORY_MAX = 240;

/** What survives a lesser spawning. */
export type Meta = {
  lineage: number;
  traits: Record<TraitId, number>;
  spawnings: number;
  /** Story ids (bands, readings, truce and dialect choices) seen in earlier runs. */
  seen: string[];
  /** Highest reef ever grown. */
  best: number;
  /** The name the player gave their reef ('' for none); kept across spawnings. */
  name: string;
  /** Earlier reefs of this line, one string each: "height|seamount|form|ended" (oldest first). */
  ancestors: string[];
  /** Fewest sim seconds any reef of this line took to reach the surface (0 for none yet). */
  fastest: number;
  /** Every memory any spawn has carried, and how many times the reef has reached the ending. */
  carriedEver: string[];
  endings: number;
  /** Fewest sim seconds any reef of the line took to reach each sister mark (0 for none yet). */
  records: number[];
  /** How many times the line has touched each creature (content/creatures.ts TRUST). */
  trust: Record<CreatureId, number>;
  /** Shells the line has kept (content/shells.ts). */
  shells: string[];
  /** One entry per ending: "seamount|memory,ids|hours" (oldest first). */
  chronicle: string[];
  /** The last calendar day (days since 1970, from the client) a daily gift was taken. */
  lastDay: number;
  /** The line's companion creature ('' none). */
  companion: string;
  /** The colours the line's reefs wear in the light (content/palettes.ts; '' for the reef's own). */
  palette: string;
  /** Shards of Thousandfold's tablet found by the line (indices into content/shards.ts). */
  shards: number[];
  /** Dreams kept (each sleeps the reef DREAM.seconds forward). */
  dreams: number;
  /** The day's sea (content/events.ts DAYS; '' before the first day is known). */
  today: DayId | '';
};

export function newMeta(): Meta {
  return {
    lineage: 0,
    traits: {
      'deep-memory': 0, 'quick-budding': 0, 'old-bands': 0, 'remembered-shoals': 0, glimmer: 0,
      'kept-readings': 0, settling: 0, 'early-shoals': 0, 'rasp-kin': 0, 'glass-gardeners': 0, 'old-habits': 0, 'tide-reader': 0, 'shared-table': 0, 'shoal-sense': 0, 'rasp-sense': 0, 'old-maps': 0, 'open-house': 0, 'water-wise': 0, 'thorn-wise': 0, 'moon-born': 0, layering: 0, 'shell-finder': 0, 'signal-wise': 0, 'sun-shy': 0, 'deep-larder': 0, 'grain-sense': 0, 'light-boned': 0, 'lucky-line': 0,
    },
    spawnings: 0,
    seen: [],
    best: 0,
    name: '',
    ancestors: [],
    fastest: 0,
    carriedEver: [],
    endings: 0,
    shards: [],
    dreams: 0,
    today: '',
    palette: '',
    companion: '',
    lastDay: 0,
    chronicle: [],
    shells: [],
    records: [0, 0, 0, 0, 0],
    trust: Object.fromEntries(CREATURES.map((c) => [c.id, 0])) as Record<CreatureId, number>,
  };
}

export type GameState = {
  version: number;
  seed: number;
  /** Simulated seconds since the reef settled. */
  t: number;
  calcite: number;
  glow: number;
  plankton: number;
  murmurs: number;
  /** Silt lying on the reef (Act III); smothers the polyps. */
  silt: number;
  sand: number;
  /** Rasp admitted to graze (the Act III dial). */
  rasp: number;
  /** The current, −2 (toward the open water: plankton) … +2 (toward the shelf: silt swept). */
  current: number;
  /** Photosynthetic sugar (Act IV). */
  bloom: number;
  /** Dialects chosen per tier ('' until chosen). */
  dialects: Record<DialectTier, DialectId | ''>;
  /** Spawn bundles ripening for the Breach (Act V). */
  spawn: number;
  /** The memories the spawn carried; non-empty once the game has ended. */
  carried: MemoryId[];
  /** Children planted in the epilogue garden. */
  garden: number;
  /** How much spawn was released at the ending (sets the lineage for beginning again). */
  released: number;
  /** Sim time of the Breach (0 until then). */
  breachedAt: number;
  /** Truce choices: '' until made, then 'a' or 'b'. */
  truce: Record<MeetingId, '' | 'a' | 'b'>;
  /** The glimmerseed strain ('' until chosen at 15 m). */
  strain: StrainId | '';
  /** The strain's sport, chosen at the Twilight Shelf ('' until then). */
  sport: SportId | '';
  /** Figures named in the night sky over the Breach. */
  sky: Record<FigureId, boolean>;
  /** The half-hour cycle whose rising the feeders were last sent into (−1: never). */
  rose: number;
  /** How many times the feeders have gone into that rising. */
  roseN: number;
  /** Grains chosen, in the order the bands set (every tenth band: content/act1.ts GRAIN). */
  grains: GrainId[];
  /** Ossel's questions answered ('' not yet, else the answer's index as '0' or '1'). */
  asked: Record<QuestionId, '' | '0' | '1'>;
  /** The polyps are closed against warm water (Sunlit Crown). */
  closed: boolean;
  /** Reef height up the seamount, metres. */
  height: number;
  levels: Record<UpgradeId, number>;
  /** Shoals per job; shoals bought but not assigned are idle (levels.shoal minus the sum). */
  jobs: Record<Job, number>;
  /** Where newly called shoals go. */
  lastJob: Job;
  readings: ReadingId[];
  /** Band ids read, in order. */
  bands: string[];
  /** Sim time of the last hand sweep. */
  lastSweep: number;
  /** Sim time of the last flare of the lure. */
  lastFlare: number;
  /** Index of the last feast slot eaten (see content/events.ts). */
  feasted: number;
  /** The shoals' signals: last slot tried, and how many answered right. */
  /** `right`: the slot last answered rightly; `streak`: how many slots in a row were. */
  signal: { last: number; answered: number; right: number; streak: number };
  /** Index of the last shell slot picked up. */
  shelled: number;
  /** Vows this reef grows under (content/lineage.ts VOWS), and when it reached the surface (−1 not yet). */
  vows: VowId[];
  /** The shower (content/sky.ts WISH) last wished on, and how many wishes were for the line. */
  wished: number;
  /** The kind of each child planted in the garden (content/act5.ts GARDEN.kinds), and the last garden's, carried into this reef. */
  gardenKinds: string;
  nursed: string;
  lineWishes: number;
  surfacedAt: number;
  /** The span of time (content/creatures.ts LUCKY) in which a lucky neighbour was last touched. */
  luckySpan: number;
  /** Old growth on the tips (content/act1.ts OLD): the stock, the knobs' slot order, and the last one broken off. */
  old: number;
  oldSlots: number[];
  pruned: { t: number; slot: number };
  /** Sweeps in a row, each soon after the last (the combo). */
  combo: number;
  /** The upwelling slot last caught (−1 none). */
  upwelled: number;
  /** The swell set ridden last (its slot) and which of its crests were caught (bits). */
  swell: { k: number; caught: number };
  /** Index of the last thorn-star slot driven off. */
  thorned: number;
  /** Falling feasts caught this run. */
  feasts: number;
  /** The reef's height sampled every HISTORY_STEP sim seconds (for the growth chart). */
  history: number[];
  /** Shoals away at a ruin: the site ('' for none), when they return, and the jobs they left. */
  expedition: { site: TripId | ''; back: number; feed: number; light: number; scout: number; fan: number; guard: number; n: number;
    /** The fork halfway: '' not met yet, 'press' went deeper, 'home' came straight back. */
    fork: '' | ForkId };
  /** Ossel's current request (kind '' for none yet), its count at the start, and how many are done; `paid` is what the last one brought. */
  request: { kind: RequestKind | ''; n: number; base: number; done: number; paid: number; skipped: number; streak: number };
  /** Counters the requests watch, and how many times the silt was searched for a shard. */
  tally: { touches: number; sweeps: number; digs: number; roams: number; intruders: number; carcass: number; shells: number; risings: number; pruned: number; milky: number; lucky: number };
  /** Stages built of each great work (content/works.ts). */
  works: Record<WorkId, number>;
  /** The race with the sister reef: marks decided so far (content/sister.ts), and how many were won. */
  race: { decided: number; won: number; cousin: number; lit: number; declined: boolean };
  /** The elder's riddles: '' not yet asked or answered, then how it went. */
  riddles: Record<RiddleId, '' | 'right' | 'wrong'>;
  /** Favours asked of the Rasp, by kind (content/act3.ts FAVOURS). */
  favours: Record<FavourId, number>;
  /** Other reefs' spawnings met (moon cycle index of the last, and how many times the reef joined). */
  others: { last: number; joined: number };
  /** Your own bands: "t|height|key|arg" for each thing remembered (content/diary.ts). */
  diary: string[];
  /** Moments answered ('' until then): content/moments.ts. */
  moments: Record<MomentId, '' | 'a' | 'b'>;
  /** Animals living in the reef's homes (content/residents.ts). */
  residents: ResidentId[];
  /** Zones in which the shoals have visited the sister reef. */
  visits: number[];
  /** A relic brought from the last reef with the spawn: its effect is in play from the start. */
  heirloom: SiteId | '';
  /** Ruins searched this run (content/expeditions.ts), in order. */
  relics: SiteId[];
  /** Sim time each creature's trust last grew (once a minute at most). */
  trusted: Record<CreatureId, number>;
  /** Sim time each creature last gave a gift when touched (content/creatures.ts GIFT). */
  gifts: Record<CreatureId, number>;
  /** The boon this reef chose ('' none yet; only after the first reef). */
  boon: BoonId | '';
  /** The seamount this run grows on (lesser spawnings choose; the first reef's is plain). */
  seamount: SeamountId;
  /** Lifetime totals. */
  earned: { calcite: number; glow: number; murmurs: number };
  /** Highest act reached. */
  act: number;
  meta: Meta;
};

export function newGame(seed: number, meta: Meta = newMeta()): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    seed,
    t: 0,
    calcite: 0,
    glow: 0,
    plankton: 0,
    murmurs: 0,
    silt: 0,
    sand: 0,
    rasp: 0,
    current: 0,
    truce: { terms: '', story: '', wall: '' },
    bloom: 0,
    spawn: 0,
    carried: [],
    released: 0,
    garden: 0,
    breachedAt: 0,
    dialects: { form: '', craft: '', spawn: '', song: '' },
    height: 0,
    strain: '',
    sport: '',
    closed: false,
    asked: { silt: '', tell: '', keep: '', surface: '', remember: '', grey: '', sister: '' },
    grains: [],
    rose: -1,
    roseN: 0,
    sky: { cup: false, beak: false, sister: false, whale: false, sleeper: false, lamp: false },
    levels: {
      polyp: 0, symbiont: 0, skeleton: 0, lattice: 0, vent: 0, lure: 0, shoal: 0, daughter: 0, net: 0,
      grounds: 0, sandbar: 0, channel: 0, grotto: 0, pigment: 0, canopy: 0, meadow: 0, ripen: 0, cay: 0, sweeten: 0,
    },
    jobs: { feed: 0, light: 0, scout: 0, fan: 0, guard: 0 },
    lastJob: 'feed',
    readings: [],
    bands: [],
    lastSweep: -1e9,
    lastFlare: -1e9,
    feasted: -1,
    thorned: -1,
    shelled: -1,
    luckySpan: -1,
    vows: [],
    wished: -1,
    gardenKinds: '',
    nursed: '',
    lineWishes: 0,
    surfacedAt: -1,
    old: 0,
    oldSlots: [0, 1, 2, 3, 4, 5],
    pruned: { t: -1e9, slot: -1 },
    combo: 0,
    upwelled: -1,
    swell: { k: -1, caught: 0 },
    signal: { last: -1, answered: 0, right: -2, streak: 0 },
    feasts: 0,
    history: [],
    expedition: { site: '', back: 0, feed: 0, light: 0, scout: 0, fan: 0, guard: 0, n: 0, fork: '' },
    relics: [],
    heirloom: '',
    visits: [],
    residents: [],
    diary: [],
    others: { last: -1, joined: 0 },
    favours: { clear: 0, path: 0, carry: 0 },
    riddles: { silt: '', wall: '', walls: '', song: '', beaks: '', shallows: '', rule: '', ripple: '', end: '', children: '', weight: '', burning: '' },
    race: { decided: 0, won: 0, cousin: 0, lit: 0, declined: false },
    works: { garden: 0, spire: 0, dome: 0, breakwater: 0, terrace: 0, pool: 0 },
    request: { kind: '', n: 0, base: 0, done: 0, paid: 0, skipped: -1e9, streak: 0 },
    tally: { touches: 0, sweeps: 0, digs: 0, roams: 0, intruders: 0, carcass: 0, shells: 0, risings: 0, pruned: 0, milky: 0, lucky: 0 },
    moments: {
      brittle: '', 'vent-crack': '', snow: '', 'lost-shoal': '', hunters: '', angler: '', squid: '', 'whale-fall': '', 'old-lamp': '', cleaners: '',
      'young-rasp': '', slope: '', eggs: '', storm: '', turtle: '', 'first-light': '', 'last-night': '', bird: '',
      krill: '', echo: '', 'far-light': '', drifts: '', eyes: '', 'heavy-crown': '', 'cold-slide': '', dust: '', bowed: '', mirror: '',
      'fire-body': '', seep: '', 'rising-stop': '', 'split-shoal': '', heatwave: '', pups: '', 'king-tide': '', outbreak: '',
    },
    gifts: Object.fromEntries(CREATURES.map((c) => [c.id, -1e9])) as Record<CreatureId, number>,
    trusted: Object.fromEntries(CREATURES.map((c) => [c.id, -1e9])) as Record<CreatureId, number>,
    seamount: 'plain',
    boon: '',
    earned: { calcite: 0, glow: 0, murmurs: 0 },
    act: 1,
    meta,
  };
  // What a lineage brings to a new seamount.
  s.levels.skeleton = 5 * meta.traits['old-bands'];
  s.levels.shoal = s.jobs.feed = 3 * meta.traits['remembered-shoals'];
  return s;
}
