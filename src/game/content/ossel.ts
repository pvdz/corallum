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
    id: 'strong', metres: 600, truth: (s) => s.readings.includes('kept-stone'),
    claim: 'Strength is keeping. The heavier the stone, the stronger the reef.',
    title: 'Weight is not strength',
    correction: 'The kept stone shows what the weight did: branches bowed to the floor, nothing new able to grow. ' +
      '“I said that to every polyp I ever knew,” says Ossel. “I am sorry. Let it go. Let it all go, if you have to.”',
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

// Ossel's questions: seven times on the way up Ossel asks the reef something. The answer changes
// nothing in the numbers; Ossel remembers it, answers back, and the ending carries it.
export type QuestionId = 'silt' | 'tell' | 'keep' | 'surface' | 'remember' | 'grey' | 'sister';
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
    id: 'grey', metres: 700, ask: '“The grey on your tips. Does it frighten you, to let it go?”',
    answers: [
      { label: 'A little. It was mine.', reply: '“It was,” says Ossel. “And now it is the silt’s. That is not nothing.”',
        ending: 'You told Ossel that letting the old stone go frightened you a little, and Ossel said that was how it should feel.' },
      { label: 'No. It is lighter after.', reply: '“I held on to everything,” Ossel says. “Look where it got me.” It almost laughs.',
        ending: 'You told Ossel you were lighter for letting go, and it almost laughed, for the first time in four hundred years.' },
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
    id: 'sister', metres: 2600, ask: '“The other reef, climbing beside us. Is it a race, do you think?”',
    answers: [
      { label: 'Yes. And we will win.', reply: '“Then grow,” says Ossel, “and do not look back too often. It slows you.”',
        ending: 'You told Ossel the sister reef was a race, and you meant to win it.' },
      { label: 'No. We are going the same way.', reply: '“The same way,” Ossel says slowly. “Thousandfold never had anyone going the same way.”',
        ending: 'You told Ossel the sister reef was not a rival but company, going the same way.' },
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
  {
    id: 'remember', metres: 3990, ask: '“When they ask about me, out there, what will you tell them?”',
    answers: [
      { label: 'That you were a wall, and then you were more.', reply: '“More,” says Ossel. “I would like that to be true.”',
        ending: 'You promised Ossel the spawn would know it had been a wall, and then more than a wall.' },
      { label: 'That you kept me company.', reply: 'Ossel does not answer, but the stone around your foot is warm for a long time.',
        ending: 'You told Ossel the spawn would know only that it kept you company. It was the right thing to say.' },
    ],
  },
];

/** A new reef after the line has reached an ending: Ossel remembers having done this before (one per ending, once). */
export const AGAIN = {
  kicker: 'Again',
  lines: [
    { title: 'Again', text: '“We have done this before,” Ossel says, very quietly, as the first polyp opens. “I remember the surface. I remember the moon. Let us go and see if it is still there.”' },
    { title: 'Twice now', text: '“The second time is easier,” says Ossel. “That is what I would have told you. It is not true. It is only more familiar.”' },
    { title: 'Three times', text: 'Ossel is quiet a long while before it speaks. “Somewhere up there, three of our spawnings are growing. Do you think they know about us?”' },
    { title: 'Four', text: '“I have stopped counting the falling grey,” Ossel says. “There is less of it. I am almost sure there is less of it.”' },
    { title: 'Many times', text: '“Every time you go up, I think it will be the last, and I keep everything ready to say goodbye,” says Ossel. “And then you come back down to me. I am glad. I am a wall. I am glad.”' },
  ],
} as const;

/** Every tenth request kept, Ossel remembers something of its own, and the line gains a little. */
export const OSSEL_PAST = {
  every: 10, lineage: 1, kicker: 'Ossel remembers', gain: '(+1 lineage)',
  lines: [
    { title: 'The first band', text: 'The first band I laid down was crooked. Nobody minded. I minded for a hundred years. I wish I had not.' },
    { title: 'The gatekeepers', text: 'There were polyps whose whole life was the gate: open, shut, open, shut. I was proud not to be one. Now I think they were the only ones who met anybody.' },
    { title: 'A lanternfish', text: 'One lanternfish slept in my stone every day for a whole season. I never told anyone. It is the best thing I remember.' },
    { title: 'The last spawning', text: 'When the city finally let go, I held on. I told myself someone had to keep the wall. Nobody did. The wall was all that was left.' },
    { title: 'Your first polyp', text: 'When you settled on the rock beside me, I thought: another one who will keep everything. I am very glad to have been wrong.' },
  ],
} as const;
