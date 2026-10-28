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
  /** Memories the spawn can carry. */
  carry: 3,
} as const;

export const UPGRADES_ACT5: readonly UpgradeDef[] = [
  {
    id: 'ripen', name: 'Ripen the spawn',
    flavour: 'Pink bundles swell under every mouth, waiting for the moon.',
    currency: 'calcite', baseCost: 3e9, growth: 2.5, maxLevel: 8, reveal: { band: 'breach' },
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
  | 'long-animal' | 'colour' | 'rain' | 'fear' | 'silt-truth' | 'dialect';

export type Memory = {
  id: MemoryId;
  title: string;
  /** What has to have happened for this memory to exist. */
  needs: { band?: string; reading?: string };
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
];

export const ENDING = {
  release: 'The moon is full. Every reef in the sea lets go at once — and so do you. Pink bundles ' +
    'rise from every mouth, millions of them, up through the moonlight to the surface, where they ' +
    'break and spread and drift. You cannot keep everything. You never could.',
  choose: 'A reef that keeps everything calcifies and dies. Your spawn can carry three memories. ' +
    'The rest stay here, in your stone, for the Rasp and the sea.',
  closingKept: 'Ossel goes with you to the end of the night, and then, at dawn, says it is tired, ' +
    'and asks you to let the Rasp have it after all. You do. It is the last thing you learn.',
  closingLetGo: 'At dawn the sand that was Ossel washes over your crown in the surf, warm, and for ' +
    'a moment you are sure it is laughing.',
  last: 'Far below, the Long Silt is still falling. It will fall for a long time yet. But it is ' +
    'falling on reefs again.',
} as const;
