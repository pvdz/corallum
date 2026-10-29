// Your own bands: what this reef laid down in its stone as it grew, one line per thing worth
// remembering, written in when it happens (sim/economy.ts `remember`). Entries are stored as
// "t|height|key|arg" strings; these are the lines, with {a} for the argument.

export const DIARY: Record<string, string> = {
  feast: 'Something fell, and you caught it.',
  seen: '{a} came by for the first time.',
  relic: 'The shoals came home with {a}.',
  moment: '{a}',
  resident: '{a} moved into your branches.',
  work: 'You raised {a}.',
  shard: 'A shard of the old tablet: “{a}”',
  ahead: 'You reached {a} before the sister reef.',
  behind: 'The sister reef reached {a} before you.',
  trial: 'This hard place taught your line something: {a}.',
  request: 'You had kept {a} of Ossel’s requests.',
  reading: 'Your scouts read “{a}”.',
  roam: 'The shoals came home from roaming. {a}',
  visit: 'Your shoals visited the sister reef, and came home with its colours in their lights.',
};

export const DIARY_TEXT = { label: 'Your own bands', intro: 'What this reef laid down in its stone, newest first.', max: 200 } as const;
