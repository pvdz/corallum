// The journal of creatures: everything that lives in the scenes, recorded the first time it is
// actually seen on screen (kept across lesser spawnings, in meta.seen as 'c:<id>').

export type CreatureId =
  | 'jelly' | 'tripod-fish' | 'isopod' | 'brittle-star' | 'rattail' | 'sea-pig' | 'brine-pool' | 'smokers' | 'dumbo' | 'squat-lobster' | 'sea-lily' | 'glass-sponge' | 'tube-worm'
  | 'lanternfish' | 'hatchetfish' | 'barreleye' | 'comb-jelly' | 'glass-shrimp' | 'siphonophore' | 'anglerfish' | 'vampire-squid' | 'whale-fall' | 'pyrosome' | 'giant-squid' | 'migration'
  | 'rasp' | 'moray' | 'nautilus' | 'manta' | 'garden-eel' | 'octopus' | 'nudibranch' | 'grouper' | 'whale-shark'
  | 'cuttlefish' | 'reef-shark' | 'reef-fish' | 'whale' | 'turtle' | 'clownfish' | 'seahorse' | 'mola' | 'bait-ball' | 'sea-firefly'
  | 'shore-bird' | 'flying-fish' | 'dolphin' | 'moon-jelly'
  | 'thorn-star' | 'dragonfish' | 'drill-snail' | 'gull' | 'guard-crab' | 'goby' | 'feather-duster' | 'pistol-shrimp' | 'sea-cucumber' | 'damselfish';

export type Creature = { id: CreatureId; name: string; zone: string; note: string };

export const CREATURES: readonly Creature[] = [
  { id: 'jelly', name: 'Deep jellies', zone: 'The Silt Floor', note: 'Bells of violet light, pulsing without hurry.' },
  { id: 'isopod', name: 'Giant isopod', zone: 'The Silt Floor', note: 'A woodlouse as long as your hand, armoured, patient. It can go years between meals.' },
  { id: 'tripod-fish', name: 'Tripod fish', zone: 'The Silt Floor', note: 'It stands on three long fins, facing the current, and waits for food to walk into its mouth.' },
  { id: 'brittle-star', name: 'Brittle stars', zone: 'The Silt Floor', note: 'Five thin arms, combing the silt for crumbs.' },
  { id: 'rattail', name: 'Rattail', zone: 'The Silt Floor', note: 'A big head and a long tail, nosing along the bottom.' },
  { id: 'sea-pig', name: 'Sea pigs', zone: 'The Silt Floor', note: 'A herd of pink loaves on legs, eating their way across the silt.' },
  { id: 'brine-pool', name: 'A brine pool', zone: 'The Silt Floor', note: 'A lake under the sea, ringed with mussels. Only on a cold seamount.' },
  { id: 'smokers', name: 'Black smokers', zone: 'The Silt Floor', note: 'Chimneys breathing hot dark water. Only on a warm seamount.' },
  { id: 'dumbo', name: 'Dumbo octopus', zone: 'The Silt Floor', note: 'Rare. A pale little octopus flying on two ear-fins.' },
  { id: 'squat-lobster', name: 'Squat lobsters', zone: 'The Silt Floor', note: 'Pale little crabs crowding the warm water, claws out.' },
  { id: 'sea-lily', name: 'Sea lilies', zone: 'The Silt Floor', note: 'Feathered arms held open to the current on a stalk.' },
  { id: 'glass-sponge', name: 'Glass sponges', zone: 'The Silt Floor', note: 'Vases of silica lattice, older than anything near them.' },
  { id: 'tube-worm', name: 'Tube worms', zone: 'The Silt Floor', note: 'Red plumes in white tubes, crowding the warm water of the vent.' },
  { id: 'lanternfish', name: 'Lanternfish', zone: 'The Midnight Water', note: 'Rows of lamps along their bellies; they come to the light.' },
  { id: 'barreleye', name: 'Barreleye', zone: 'The Midnight Water', note: 'Its head is a clear dome, and its green eyes look up through it at the faint light above.' },
  { id: 'hatchetfish', name: 'Hatchetfish', zone: 'The Midnight Water', note: 'Thin as a blade, lit along the belly so nothing below can see their shape.' },
  { id: 'comb-jelly', name: 'Comb jellies', zone: 'The Midnight Water', note: 'Rainbows ripple down their combs, made by no light of their own.' },
  { id: 'glass-shrimp', name: 'Glass shrimp', zone: 'The Midnight Water', note: 'You can see straight through them, all but the glowing gut.' },
  { id: 'siphonophore', name: 'The long animal', zone: 'The Midnight Water', note: 'One animal, and also a colony: a chain of bells longer than the reef.' },
  { id: 'anglerfish', name: 'Anglerfish', zone: 'The Midnight Water', note: 'A lure of light on a rod, and a mouth of needles behind it.' },
  { id: 'vampire-squid', name: 'Vampire squid', zone: 'The Midnight Water', note: 'A red cloak of arms, blue eyes, and lights at the tips of its fins.' },
  { id: 'whale-fall', name: 'A whale fall', zone: 'The Midnight Water', note: 'Bones on the flank, and a whole small world living off them.' },
  { id: 'pyrosome', name: 'Pyrosome', zone: 'The Midnight Water', note: 'A tube of thousands of little lights, flashing one after another.' },
  { id: 'giant-squid', name: 'Giant squid', zone: 'The Midnight Water', note: 'Rare. A shape longer than the reef, an eye like a plate, and gone.' },
  { id: 'migration', name: 'The migration', zone: 'The Midnight Water', note: 'Every night the deep rises to feed: the biggest journey any animals make.' },
  { id: 'rasp', name: 'The Rasp', zone: 'The Twilight Shelf', note: 'Blunt beaks that grind dead stone into sand.' },
  { id: 'nautilus', name: 'Nautilus', zone: 'The Twilight Shelf', note: 'A shell of chambers it fills and empties to rise and sink. It has done this for a very long time.' },
  { id: 'moray', name: 'Moray eel', zone: 'The Twilight Shelf', note: 'It gapes all day, not to threaten: it breathes through its mouth. It is shy.' },
  { id: 'manta', name: 'Manta', zone: 'The Twilight Shelf', note: 'Wings as wide as the reef is tall, gliding through the light.' },
  { id: 'garden-eel', name: 'Garden eels', zone: 'The Twilight Shelf', note: 'A colony standing out of the sand, ducking all at once.' },
  { id: 'octopus', name: 'Octopus', zone: 'The Twilight Shelf', note: 'The colour of sand until it moves, and then of fire.' },
  { id: 'nudibranch', name: 'Nudibranchs', zone: 'The Twilight Shelf', note: 'Slugs in colours meant as warnings, creeping along your branches.' },
  { id: 'grouper', name: 'Grouper and cleaners', zone: 'The Twilight Shelf', note: 'A big fish holding still while two small ones pick it clean.' },
  { id: 'whale-shark', name: 'Whale shark', zone: 'The Twilight Shelf', note: 'Rare. The biggest fish in the sea, eating the smallest things in it.' },
  { id: 'reef-fish', name: 'Reef fish', zone: 'The Sunlit Crown', note: 'Colours you had no words for, darting between the branches.' },
  { id: 'whale', name: 'Whale', zone: 'The Sunlit Crown', note: 'A long shadow in the haze, calling as it passes.' },
  { id: 'turtle', name: 'Green turtle', zone: 'The Sunlit Crown', note: 'It comes for the seagrass and stays for the meadows.' },
  { id: 'dolphin', name: 'Dolphins', zone: 'The Breach', note: 'They leap out of the moonlight just to fall back into it.' },
  { id: 'clownfish', name: 'Clownfish', zone: 'The Sunlit Crown', note: 'Two of them, never far from the anemone that stings everything else.' },
  { id: 'moon-jelly', name: 'Moon jellies', zone: 'The Breach', note: 'Saucers of water with four pale rings, drifting just under the light.' },
  { id: 'seahorse', name: 'Seahorses', zone: 'The Sunlit Crown', note: 'They hold on to the seagrass by their tails and let the water do the rest.' },
  { id: 'mola', name: 'Ocean sunfish', zone: 'The Sunlit Crown', note: 'Rare. A silver disc as tall as the reef, sculling along with two fins.' },
  { id: 'reef-shark', name: 'Blacktip shark', zone: 'The Sunlit Crown', note: 'It patrols the edge of the reef on the same loop every day. Everything small watches it go.' },
  { id: 'cuttlefish', name: 'Cuttlefish', zone: 'The Sunlit Crown', note: 'Waves of colour run down its skin like thoughts. Startle it and it goes white.' },
  { id: 'bait-ball', name: 'A bait ball', zone: 'The Sunlit Crown', note: 'Small fish pressed into one turning shape, and hunters going through it.' },
  { id: 'sea-firefly', name: 'Sea fireflies', zone: 'The Sunlit Crown', note: 'Only after dark. Specks that court in light, leaving strings of blue pearls as they rise.' },
  { id: 'flying-fish', name: 'Flying fish', zone: 'The Breach', note: 'They leave the sea entirely, for a few seconds at a time, on fins like wings.' },
  { id: 'shore-bird', name: 'Shore bird', zone: 'The Breach', note: 'It walks on your crown at low tide, as if it owned it.' },
  { id: 'gull', name: 'Gull', zone: 'The Breach', note: 'It has learned that reefs ripen pink before a full moon. Wave it off.' },
  { id: 'drill-snail', name: 'Drill snail', zone: 'The Silt Floor', note: 'A small snail that bores into living coral and eats it from inside. Pick it off.' },
  { id: 'dragonfish', name: 'Dragonfish', zone: 'The Midnight Water', note: 'All teeth and a red light only it can see. It hunts the lanternfish. Drive it off.' },
  { id: 'thorn-star', name: 'Thorn star', zone: 'The Twilight Shelf', note: 'A starfish of spines that eats living coral. Pry it off; the crabs hate it too.' },
  { id: 'guard-crab', name: 'Guard crabs', zone: 'Residents', note: 'Red as a warning, no bigger than a polyp. They pinch for you.' },
  { id: 'pistol-shrimp', name: 'Pistol shrimp', zone: 'Residents', note: 'A snap so loud the water lights for an instant.' },
  { id: 'sea-cucumber', name: 'Sea cucumbers', zone: 'Residents', note: 'They eat the floor and leave it cleaner.' },
  { id: 'goby', name: 'Coral gobies', zone: 'Residents', note: 'Perched on the branches like birds, watching everything.' },
  { id: 'feather-duster', name: 'Feather dusters', zone: 'Residents', note: 'Crowns of feathers that vanish into their tubes at a shadow.' },
  { id: 'damselfish', name: 'Farmer damselfish', zone: 'Residents', note: 'They keep gardens, and will fight a turtle over one.' },
];

/**
 * Gifts: touching a creature now and then brings a little of what it lives by. Each creature gives
 * once per cooldown, `seconds` of the reef's production of that stock (calcite if it makes none),
 * at most `holdShare` of what the reef can hold of it; rare visitors give `rare` times as much.
 */
export const GIFT = { seconds: 30, cooldown: 180, holdShare: 0.3, rare: 3 } as const;
export type GiftStock = 'calcite' | 'glow' | 'plankton' | 'sand' | 'bloom' | 'spawn';
const GLOWING: readonly CreatureId[] = [
  'jelly', 'comb-jelly', 'siphonophore', 'anglerfish', 'vampire-squid', 'pyrosome', 'moon-jelly', 'sea-firefly',
];
export function giftOf(id: CreatureId): GiftStock {
  if (GLOWING.includes(id)) return 'glow';
  if (id === 'rasp') return 'sand';
  if (id === 'lanternfish' || id === 'migration' || id === 'bait-ball') return 'plankton';
  return 'calcite';
}

/** Trust: touches remembered by the line. Levels at 1, 5 and 15 touches; gifts grow with it. */
export const TRUST = {
  at: [1, 5, 15], names: ['', 'known', 'familiar', 'a friend'], gift: [1, 1, 1.5, 2],
  /** Trust grows at most once per this many sim seconds per creature (no tapping it up). */
  every: 60,
  /** Lineage the first time a creature becomes a friend of the line. */
  friendLineage: 1,
  friendNote: 'A friend of the line',
} as const;
export function trustLevel(touches: number): number {
  return TRUST.at.filter((n) => touches >= n).length;
}

/** A companion: one touched creature kept close. Its gifts ×2 and come twice as often. */
export const COMPANION = { label: 'Keep close', on: 'Your companion', note: 'gifts ×2, twice as often' } as const;

/** The float text after a gift's amount. */
export const GIFT_TEXT: Record<GiftStock, string> = {
  calcite: 'calcite · a gift', glow: 'glow · a gift of light', plankton: 'plankton · they share', sand: 'sand · a gift',
  bloom: 'bloom · a gift', spawn: 'spawn · they guard it',
};

/** The creature label's gift line: what a touch brings. */
export const GIFT_WORD: Record<GiftStock, string> = {
  calcite: 'Shares a little food', glow: 'Shares a little light', plankton: 'Shares a little plankton', sand: 'Shares a little sand',
  bloom: 'Shares a little food', spawn: 'Shares a little food',
};

/** The note shown when a rare visitor already in the journal comes by again. */
export const JOURNAL_PASSING = 'Passing now';
