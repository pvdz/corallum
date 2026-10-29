// The journal of creatures: everything that lives in the scenes, recorded the first time it is
// actually seen on screen (kept across lesser spawnings, in meta.seen as 'c:<id>').

export type CreatureId =
  | 'jelly' | 'brittle-star' | 'rattail' | 'sea-pig' | 'brine-pool' | 'smokers' | 'dumbo' | 'squat-lobster' | 'sea-lily' | 'glass-sponge' | 'tube-worm'
  | 'lanternfish' | 'comb-jelly' | 'glass-shrimp' | 'siphonophore' | 'anglerfish' | 'vampire-squid' | 'whale-fall' | 'pyrosome' | 'giant-squid' | 'migration'
  | 'rasp' | 'manta' | 'garden-eel' | 'octopus' | 'nudibranch' | 'grouper' | 'whale-shark'
  | 'reef-fish' | 'whale' | 'turtle' | 'clownfish' | 'seahorse' | 'mola' | 'bait-ball'
  | 'shore-bird' | 'dolphin' | 'moon-jelly';

export type Creature = { id: CreatureId; name: string; zone: string; note: string };

export const CREATURES: readonly Creature[] = [
  { id: 'jelly', name: 'Deep jellies', zone: 'The Silt Floor', note: 'Bells of violet light, pulsing without hurry.' },
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
  { id: 'bait-ball', name: 'A bait ball', zone: 'The Sunlit Crown', note: 'Small fish pressed into one turning shape, and hunters going through it.' },
  { id: 'shore-bird', name: 'Shore bird', zone: 'The Breach', note: 'It walks on your crown at low tide, as if it owned it.' },
];
