// Ossel's mistakes: Ossel is sure of some things that are not so. Each is said in passing as a
// whisper (at a height); later a band, a relic or the city's own words prove it wrong, and the
// correction is told. Kept by the line (meta.seen 'w:claim-<id>' heard, 'o:<id>' corrected).

import type { GameState } from '../sim/state.ts';

export type OsselMistake = { id: string; metres: number; claim: string; truth: (s: GameState) => boolean; title: string; correction: string };

export const OSSEL_MISTAKE = { kicker: 'Ossel misremembered', count: 'Ossel’s mistakes found' } as const;

export const OSSEL_MISTAKES: readonly OsselMistake[] = [
  {
    id: 'fought', metres: 30, truth: (s) => s.readings.includes('beaked'),
    claim: 'Thousandfold never fought anything. We only grew.',
    title: 'Thousandfold fought',
    correction: 'The band of the beaked ones says otherwise: the city called the Rasp thieves and shut them out. ' +
      'Ossel is quiet for a long time. “I was a wall,” it says at last. “Walls do not remember what they keep out.”',
  },
  {
    id: 'sky', metres: 400, truth: (s) => s.bands.includes('truth'),
    claim: 'The silt falls from the sky. It always has. It always will.',
    title: 'The silt is not from the sky',
    correction: 'It never fell from the sky. It is Thousandfold, ground fine, settling. “I knew,” says Ossel. “I think I knew. ' +
      'It was easier to call it weather.”',
  },
  {
    id: 'gate', metres: 900, truth: (s) => s.relics.includes('gate'),
    claim: 'Nobody was ever left outside our gate. We let everyone in.',
    title: 'The gate was shut',
    correction: 'The hinge the shoals brought home was worn smooth by closing, not by opening. Ossel does not argue. ' +
      '“Everyone who mattered,” it says, and then, more quietly, “that is what we said.”',
  },
  {
    id: 'killed', metres: 3100, truth: (s) => s.relics.includes('midden'),
    claim: 'The Rasp killed the city. Everyone knows that.',
    title: 'Who did the killing',
    correction: 'The midden is made of beaks. The Rasp did not kill Thousandfold; Thousandfold killed the Rasp, and then ' +
      'choked without them. Ossel says nothing at all. It does not need to.',
  },
  {
    id: 'afraid', metres: 3850, truth: (s) => s.readings.includes('fear'),
    claim: 'I was never afraid. Walls are not afraid.',
    title: 'The wall was afraid',
    correction: 'The fear bands run all through the outer wall: keep, keep, keep. They are in Ossel’s voice. “Yes,” it says. ' +
      '“Every day. I am still a little afraid now. Of the light.”',
  },
];
