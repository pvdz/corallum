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

// Ossel's questions: four times on the way up Ossel asks the reef something. The answer changes
// nothing in the numbers; Ossel remembers it, answers back, and the ending carries it.
export type QuestionId = 'silt' | 'tell' | 'keep' | 'surface';
export type Question = {
  id: QuestionId; metres: number; ask: string;
  answers: readonly [{ label: string; reply: string; ending: string }, { label: string; reply: string; ending: string }];
};
export const QUESTION = { kicker: 'Ossel asks you something', endingHead: 'What you told Ossel' } as const;
export const QUESTIONS: readonly Question[] = [
  {
    id: 'silt', metres: 200, ask: '“Do you ever wonder what the silt is for? Everything is for something.”',
    answers: [
      { label: 'It is for nothing. It just falls.', reply: '“That is a very cold thing to say,” Ossel says, “and I think you might be right.”',
        ending: 'You told Ossel the silt was for nothing, and it believed you, and was lighter for it.' },
      { label: 'It is for us to grow out of.', reply: '“Then we had better grow,” says Ossel, pleased.',
        ending: 'You told Ossel the silt was there to be grown out of, and you grew out of it.' },
    ],
  },
  {
    id: 'tell', metres: 1500, ask: '“When you spawn, will you tell them about Thousandfold? All of it?”',
    answers: [
      { label: 'All of it. They should know.', reply: '“All of it,” Ossel repeats, as if tasting the words. “Even the walls.”',
        ending: 'You promised Ossel the spawn would know all of Thousandfold, even the walls.' },
      { label: 'Only what will help them.', reply: '“That is what a wall would say,” Ossel says, and then: “No. It is not. A wall keeps it all.”',
        ending: 'You told Ossel the spawn would carry only what helped, and Ossel said that was what made you not a wall.' },
    ],
  },
  {
    id: 'keep', metres: 3100, ask: '“If you could keep one thing, only one, what would it be?”',
    answers: [
      { label: 'You, Ossel.', reply: 'Ossel says nothing at all, for a whole band.',
        ending: 'Once you told Ossel that it was the one thing you would keep. It never answered that, and never forgot it.' },
      { label: 'Nothing. That is the point.', reply: '“You learn faster than I did,” says Ossel.',
        ending: 'You told Ossel you would keep nothing, and it said you had learned faster than it had.' },
    ],
  },
  {
    id: 'surface', metres: 3850, ask: '“What do you think is up there? Past the light?”',
    answers: [
      { label: 'Air, and the moon.', reply: '“The moon,” says Ossel. “I have seen it from the floor all my life. I wonder if it is far.”',
        ending: 'You told Ossel there was air up there, and the moon, and you were right.' },
      { label: 'More sea, the other way up.', reply: '“A sea of nothing,” Ossel says. “How strange to be so near nothing.”',
        ending: 'You told Ossel that the surface was a sea the other way up. You were not wrong.' },
    ],
  },
];
