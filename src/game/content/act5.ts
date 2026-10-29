// Act V — The Breach. Spawn, the Spawning Moon, the memories the spawn carries, the ending.

import type { Band, UpgradeDef } from './types.ts';

export const ACT5 = {
  from: 3980,
  /** Spawn per polyp per second, times the bloom multiplier; bundles are slowly reabsorbed. */
  spawnRate: 0.4,
  spawnFade: 1 / 3600,
  ripenSpawn: 1.5,
  /** Spawn needed for the Breach. */
  target: 1e6,
  /** The moon: a cycle of `moonPeriod` sim seconds, full within ±fullWindow of phase 0.5. */
  moonPeriod: 1200,
  fullWindow: 0.08,
  /** Memories the spawn can carry; under a great tide moon (every `greatEvery`-th cycle), more. */
  carry: 3,
  greatCarry: 4,
  greatEvery: 3,
} as const;

export const UPGRADES_ACT5: readonly UpgradeDef[] = [
  {
    id: 'ripen', name: 'Ripen the spawn',
    flavour: 'Pink bundles swell under every mouth, waiting for the moon.',
    currency: 'calcite', baseCost: 3e9, growth: 2.5, maxLevel: 8, reveal: { band: 'breach' },
  },
  {
    id: 'cay', name: 'Raise a sand cay',
    flavour: 'Heap the Rasp’s sand where the waves slow down, until it breaks the surface and stays.',
    currency: 'sand', baseCost: 40000, growth: 1.6, maxLevel: 6, reveal: { band: 'breach' },
  },
  {
    id: 'sweeten', name: 'Sweeten the spawn',
    flavour: 'Pour the symbionts’ sugar into the bundles, so the young go out fed.',
    currency: 'bloom', baseCost: 2e7, growth: 3, maxLevel: 6, reveal: { band: 'breach' },
  },
];

export const BANDS_ACT5: readonly Band[] = [
  {
    id: 'describe', metres: 3985, title: 'Describe it',
    text: 'At night you can see the moon itself now, not its ripple: a white stone with no reef on ' +
      'it. You find yourself describing it out loud, to no one. Far below, in the sand bars, a few ' +
      'grains that were once a wall are perhaps listening.',
    kept: 'At night you can see the moon itself now, not its ripple. “Describe it,” Ossel says. You ' +
      'try. Halfway through, Ossel says, “Yes. Yes, that is how I remember it,” and you both know ' +
      'it has never seen it.',
  },
  {
    id: 'air', metres: 3990, title: 'Air',
    text: 'At low tide your crown stands in the air, and it hurts, and you hold on. Birds walk on ' +
      'you. The sky is a second sea, upside down, with its own lights in it.',
  },
  {
    id: 'waiting-fish', metres: 3995, title: 'The waiting fish',
    text: 'At dawn, bright reef fish you have no names for crowd your crown, patient, watching. ' +
      'They know what a reef this close to the moon means. Spawn is food; many of your children ' +
      'will be eaten before they lay a single band. You decide that is not a reason to hold on.',
  },
  {
    id: 'surface', metres: 4000, title: 'The surface',
    text: 'Four thousand metres. You have climbed the whole sea. Every night now you watch the moon ' +
      'swell, and every polyp on the reef watches with you, holding its spawn.',
    kept: 'Four thousand metres. Ossel, carried up inside your stone, is quiet in a new way: ' +
      'listening. “I never saw the moon,” it says. “Thousandfold would not spawn. We were afraid of ' +
      'losing what we were.”',
  },
];

export type MemoryId =
  | 'vent' | 'ossel' | 'thousandfold' | 'slow-water' | 'lanternfish' | 'rasp'
  | 'long-animal' | 'colour' | 'rain' | 'fear' | 'silt-truth' | 'dialect'
  | 'gate' | 'midden' | 'tablet' | 'eye' | 'turtle' | 'harbour';

export type Memory = {
  id: MemoryId;
  title: string;
  /** What has to have happened for this memory to exist. */
  needs: { band?: string; reading?: string; relic?: string; moment?: string; momentChoice?: 'a' | 'b'; shards?: number };
  /** One line in the choosing screen. */
  hint: string;
  /** The epilogue paragraph if carried. */
  epilogue: string;
};

export const MEMORIES: readonly Memory[] = [
  {
    id: 'vent', title: 'The warm vent', needs: { band: 'bands' },
    hint: 'The first warmth you ever felt.',
    epilogue: 'Your children settle near warm water, always, and do not know why. It feels like ' +
      'being held.',
  },
  {
    id: 'ossel', title: 'Ossel’s voice', needs: { band: 'wake' },
    hint: '“Hold on, little mouth.”',
    epilogue: 'In every new reef, somewhere deep in the first band, there is a voice that says hold ' +
      'on. It is kind, and it is certain, and it is wrong about a few things, and they love it anyway.',
  },
  {
    id: 'thousandfold', title: 'Thousandfold’s glory', needs: { band: 'thousandfold' },
    hint: 'A city of walls, the greatest reef that ever lived.',
    epilogue: 'They dream of a city of walls, wall upon wall, so wide the fish take days to swim ' +
      'around it. Some of them will try to build it. You hope the other memories are enough to stop them.',
  },
  {
    id: 'slow-water', title: 'The slow water', needs: { reading: 'slow-currents' },
    hint: 'How Thousandfold choked inside its own walls.',
    epilogue: 'They never wall in their own currents. When the water slows, they notice, and they ' +
      'do not build another wall: they let something go.',
  },
  {
    id: 'lanternfish', title: 'The shoal pact', needs: { reading: 'shoal-pact' },
    hint: 'A slow spiral, with a flicker at each turn.',
    epilogue: 'Lanternfish sleep in their branches by day and swim the old spiral for them by night, ' +
      'a flicker at every turn, and neither side remembers who taught it to whom.',
  },
  {
    id: 'rasp', title: 'The Rasp’s beaks', needs: { band: 'grinding' },
    hint: 'Dead stone is food. The truce.',
    epilogue: 'When the Rasp come grinding, your children open their dead stone to them like a ' +
      'gift. Dead stone is food. The reef stays young.',
  },
  {
    id: 'long-animal', title: 'The long animal', needs: { band: 'siphon' },
    hint: 'Small, and part of something.',
    epilogue: 'On dark nights they feel very small, and also part of something enormous and slow ' +
      'and glassy, and it makes them gentle.',
  },
  {
    id: 'colour', title: 'Colour', needs: { band: 'colour' },
    hint: 'Rose, gold, and a green you had no word for.',
    epilogue: 'They are bright. Every one of them, rose and gold and that green, as if they had ' +
      'always known the sun was coming.',
  },
  {
    id: 'rain', title: 'Rain', needs: { band: 'rain' },
    hint: 'Millions of small somethings, falling on the sea.',
    epilogue: 'They listen for rain. When it comes they open every mouth at once, for no reason ' +
      'they could tell you.',
  },
  {
    id: 'fear', title: 'The fear bands', needs: { reading: 'fear' },
    hint: 'Keep, keep, keep.',
    epilogue: 'They know what fear does to a reef. When they are afraid, they spawn anyway.',
  },
  {
    id: 'silt-truth', title: 'What the silt is', needs: { band: 'truth' },
    hint: 'Every grain a crumb of a band.',
    epilogue: 'They know what the falling grey is. They do not hate it. They grow faster than it ' +
      'falls, and now and then, quietly, they thank it.',
  },
  {
    id: 'dialect', title: 'Your dialect', needs: { band: 'form' },
    hint: 'The shape you chose to be.',
    epilogue: 'They grow as you grew, in the shape you chose, and they never wonder about the others.',
  },
  {
    id: 'gate', title: 'The fallen gate', needs: { relic: 'gate' },
    hint: 'A door the city shut on itself.',
    epilogue: 'They never build gates. Where the water wants to come in, they let it, and they grow around the way it goes.',
  },
  {
    id: 'harbour', title: 'The harbour', needs: { relic: 'harbour' },
    hint: 'Where the city once let its own children go.',
    epilogue: 'When they spawn, they spawn all at once, and they do not hold anything back to keep. They learned it from a ring of stone.',
  },
  {
    id: 'midden', title: 'The beak midden', needs: { relic: 'midden' },
    hint: '“I was there, and I did not know.”',
    epilogue: 'In the oldest stone of every reef there is one beak, set low. None of them could tell you why. ' +
      'The Rasp who find it graze more gently there.',
  },
  {
    id: 'tablet', title: 'Forget us gently', needs: { shards: 12 },
    hint: 'The city’s last words, whole.',
    epilogue: 'In the first band of every reef, carved very small: forget us gently, and live. They do both, ' +
      'and they are not sorry.',
  },
  {
    id: 'eye', title: 'The eye in the dark', needs: { moment: 'squid' },
    hint: 'Something enormous looked at you.',
    epilogue: 'When something vast passes in the dark, they neither hide nor flare. They let it look, and look back.',
  },
  {
    id: 'turtle', title: 'The sleeping turtle', needs: { moment: 'turtle', momentChoice: 'a' },
    hint: 'It slept in your branches, and kept you clean.',
    epilogue: 'Turtles sleep in their branches, and they let them. In the morning the weed is gone and nobody says thank you.',
  },
];

export const ENDING = {
  release: 'The moon is full. Every reef in the sea lets go at once — and so do you. Pink bundles ' +
    'rise from every mouth, millions of them, up through the moonlight to the surface, where they ' +
    'break and spread and drift. You cannot keep everything. You never could.',
  choose: 'A reef that keeps everything calcifies and dies. Your spawn can carry three memories. ' +
    'The rest stay here, in your stone, for the Rasp and the sea.',
  chooseGreat: 'A reef that keeps everything calcifies and dies. Tonight is a great tide, and the ' +
    'water will lift more than usual: your spawn can carry four memories. The rest stay here.',
  closingKept: 'Ossel goes with you to the end of the night, and then, at dawn, says it is tired, ' +
    'and asks you to let the Rasp have it after all. You do. It is the last thing you learn.',
  closingLetGo: 'At dawn the sand that was Ossel washes over your crown in the surf, warm, and for ' +
    'a moment you are sure it is laughing.',
  /** Before the last line: this reef in numbers. */
  numbers: 'Your own bands keep a count, because that is what bands do.',
  /** The creatures that know you, come to see the spawn off ({names}). */
  friends: 'They came to watch, the ones who knew you: {names}. They stay until the last bundle is out of sight.',
  /** Once every mistake of Ossel's has been found and the tablet is whole. */
  remembered: 'Before dawn Ossel speaks once more, and for the first time without being sure. “We fought them. We shut ' +
    'the gate. We were afraid every day, and we kept everything, and it was too much to carry. That is what we were.” ' +
    'It sounds lighter for saying it. “Tell them that. Tell them all of it, and then let them forget it gently.”',
  /** The sister reef, when the reef lit the way for her. */
  sisterLit: 'On the next seamount, under the same moon, the sister reef spawns too: you lit its way, and it came up in time. ' +
    'The two clouds of spawn drift toward each other in the dark, and mix, and go on together.',
  /** The sister reef, by who reached the surface first. */
  sisterAhead: 'On the next seamount the sister reef is still climbing, a few metres under the light. ' +
    'Some of your spawn drifts over it on the way out. It will be there next moon. It will not be alone.',
  sisterBehind: 'The sister reef spawned before you, a moon ago, on the next seamount. Its children are ' +
    'out there already. When yours settle, some of them will settle beside its, and they will know each other.',
  /** Once the line has carried every memory there is, across all its endings. */
  everything: 'Over all your spawnings, every memory has gone somewhere: the vent and the city, the ' +
    'Rasp and the rain, the eye in the dark, the turtle, the tablet. Not one of your children carries ' +
    'all of it. Together they carry everything, and none of them is heavy.',
  last: 'Far below, the Long Silt is still falling. It will fall for a long time yet. But it is ' +
    'falling on reefs again.',
} as const;

/** The epilogue garden: after the release, children planted in the dawn shallows. */
export const GARDEN = {
  max: 12,
  /** Seconds of calcite production the first costs; each next ×growth. */
  seconds: 300, growth: 1.6,
  label: 'The garden',
  text: 'The spawn is gone, and the morning is very quiet. Some of your children did not drift far. Help them take hold here, in the shallows around you.',
  plant: 'Plant a child',
  effect: '+1 lineage when you begin again',
} as const;

/** The line's title, from the memory its endings carried most often. */
export const LINE_TITLES: Partial<Record<MemoryId, string>> = {
  vent: 'the line of the warm vent', ossel: 'the line of the old wall', thousandfold: 'the line of the city',
  'slow-water': 'the line of open currents', lanternfish: 'the line of lamps', rasp: 'the friends of the Rasp',
  'long-animal': 'the line of the long animal', colour: 'the bright line', rain: 'the line of rain', fear: 'the brave line',
  'silt-truth': 'the line of the grey', dialect: 'the line of many shapes', gate: 'the line of open gates',
  midden: 'the line of the beak', tablet: 'the line that forgets gently', eye: 'the line that looks back', turtle: 'the line of the turtle',
};

/** The little moon above the depth gauge: its tooltip. */
export const GAUGE_MOON = { full: 'The Spawning Moon is full', until: 'Full moon in' } as const;
