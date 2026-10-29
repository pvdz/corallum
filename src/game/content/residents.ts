// Residents: from the Twilight Shelf on, the reef has a few sheltered homes in its branches, and
// small animals that live with corals ask to move in. Each brings one lasting effect while it
// lives here; homes are few, so which to take in is a choice that changes with the zone.
// Taking one in or letting it go is free and immediate.

export type ResidentId = 'guard-crab' | 'goby' | 'feather-duster' | 'pistol-shrimp' | 'sea-cucumber' | 'damselfish' | 'host-anemone' | 'cleaner-wrasse' | 'boxer-crab' | 'decorator-crab' | 'hermit-crab';

export type Resident = {
  id: ResidentId;
  name: string;
  /** Reef height from which it comes asking. */
  metres: number;
  effect: string;
  /** Why it is good to have (the panel's line under the name). */
  text: string;
};

export const RESIDENT = {
  /** Homes open at these heights: one on the shelf, a second up the shelf, a third in the light. */
  homes: [3000, 3400, 3800],
  label: 'Residents',
  intro: 'Small animals that live with corals ask to move in. There is room for only a few.',
  take: 'Take in',
  release: 'Let go',
  full: 'No room',
  moved: '· moved in',
  pairHint: 'Some of them live well together, and the reef feels it.',
} as const;

export const RESIDENTS: readonly Resident[] = [
  {
    id: 'guard-crab', name: 'Guard crabs', metres: 3000, effect: 'the Rasp eat ×0.5 of your stone',
    text: 'Tiny red crabs that live between the branches and pinch anything that bites the living coral.',
  },
  {
    id: 'pistol-shrimp', name: 'Pistol shrimp', metres: 3000, effect: 'silt swept +0.04/s',
    text: 'They dig burrows at the reef’s foot and snap a claw so hard the water flashes. The silt keeps moving.',
  },
  {
    id: 'sea-cucumber', name: 'Sea cucumbers', metres: 3000, effect: 'sand ×1.4',
    text: 'Slow sausages that swallow the silt and leave clean sand behind them in long coils.',
  },
  {
    id: 'goby', name: 'Coral gobies', metres: 3400, effect: 'calcite ×1.15',
    text: 'Little fish that perch on the branches and bite off the weed that would poison the polyps.',
  },
  {
    id: 'cleaner-wrasse', name: 'Cleaner wrasse', metres: 3400, effect: 'neighbours’ gifts ×2, and they come back to give twice as soon',
    text: 'A pair of striped fish keep a cleaning station on your branches. Every big fish on the shelf queues to be picked clean, and lingers.',
  },
  {
    id: 'boxer-crab', name: 'A boxer crab', metres: 3400, effect: 'intruders driven off pay ×1.5',
    text: 'A crab the size of a fingernail with a tiny anemone held in each claw, waved at anything that comes too close. It stings.',
  },
  {
    id: 'decorator-crab', name: 'A decorator crab', metres: 3000, effect: 'lucky neighbours ×1.5',
    text: 'It wears whatever it finds: a scrap of sponge, a curl of weed, once a flake of your own stone. Things come to look at it, and stay.',
  },
  {
    id: 'feather-duster', name: 'Feather dusters', metres: 3400, effect: 'plankton ×1.3',
    text: 'Worms in tubes, each with a crown of feathers combing the water. What they miss, the polyps catch.',
  },
  {
    id: 'hermit-crab', name: 'A hermit crab', metres: 3800, effect: 'shells wash up twice as often',
    text: 'It lives in somebody else’s shell and is always looking for a better one. Wherever it goes, empty shells turn up.',
  },
  {
    id: 'damselfish', name: 'Farmer damselfish', metres: 3800, effect: 'bloom ×1.3',
    text: 'Fierce small fish that tend gardens of algae on the reef and chase off whatever comes near the crown.',
  },
  {
    id: 'host-anemone', name: 'A host anemone', metres: 3980, effect: 'spawn ×1.15',
    text: 'A great soft anemone with a pair of clownfish living in it, who keep the crown clean for the spawning.',
  },
];

/** Pairings: two residents that live well together add something of their own. */
export const PAIRS: readonly { a: ResidentId; b: ResidentId; name: string; effect: string }[] = [
  { a: 'guard-crab', b: 'goby', name: 'Watchful branches', effect: 'the Rasp eat ×0.8 more' },
  { a: 'pistol-shrimp', b: 'sea-cucumber', name: 'The floor kept clean', effect: 'sand ×1.2' },
  { a: 'feather-duster', b: 'damselfish', name: 'A garden in the light', effect: 'bloom ×1.15' },
  { a: 'cleaner-wrasse', b: 'feather-duster', name: 'Clean water', effect: 'plankton ×1.15' },
  { a: 'boxer-crab', b: 'guard-crab', name: 'All claws', effect: 'intruders driven off pay ×1.3 more' },
  { a: 'decorator-crab', b: 'cleaner-wrasse', name: 'A busy station', effect: 'gifts from neighbours ×1.3' },
];

/** Homes the reef has at this height. */
export function homesAt(height: number): number {
  return RESIDENT.homes.filter((m) => height >= m).length;
}
