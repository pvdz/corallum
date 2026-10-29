// Moments: small things that happen to the reef on the way up, each a choice between two ways of
// meeting it. They wait until answered and never block anything; each answer has one lasting
// effect for this reef (applied in sim/economy.ts by `chose()`). Told in Ossel's voice.

export type MomentId = 'brittle' | 'lost-shoal' | 'squid' | 'whale-fall' | 'cleaners' | 'storm' | 'turtle' | 'bird';

export type MomentOption = { label: string; effect: string; text: string };
export type Moment = { id: MomentId; metres: number; title: string; text: string; a: MomentOption; b: MomentOption };

export const MOMENT = { kicker: 'A moment', choose: 'What do you do?' } as const;

export const MOMENTS: readonly Moment[] = [
  {
    id: 'brittle', metres: 25, title: 'A brittle star, dying',
    text: 'It drifts against your base with two arms gone, still combing the silt out of habit.',
    a: { label: 'Take it in', effect: 'calcite dissolves ×0.9',
      text: 'Your polyps close over it slowly. Its plates become part of your stone, and the stone holds better for it.' },
    b: { label: 'Let it crawl on', effect: 'feasts feed ×1.5',
      text: 'It drags itself into the dark. Days later there are others like it at your foot, and they know where the food falls.' },
  },
  {
    id: 'lost-shoal', metres: 400, title: 'A lost shoal',
    text: 'Three small shoals, their lamps out of rhythm with yours, circling as if they had forgotten the way.',
    a: { label: 'Teach them your pattern', effect: '+3 shoals now',
      text: 'It takes a long time. Then their lights fall into step with your glow, and they stay.' },
    b: { label: 'Guide them home', effect: 'scouts hear ×1.2',
      text: 'You light the way they came. They go. What they tell the others about you comes back as voices in the silt.' },
  },
  {
    id: 'squid', metres: 1800, title: 'Something enormous',
    text: 'A shape longer than your whole reef slides past in the dark. One eye, the size of a polyp colony, turns toward your light.',
    a: { label: 'Dim your glow', effect: 'glow fades ×0.8',
      text: 'You go almost dark and hold it in. It passes. You learn to keep your light close, and it keeps longer.' },
    b: { label: 'Hold your light', effect: 'glow ×1.2',
      text: 'It stops. It looks at you for a long time, and then it goes on. After that you shine as if someone were watching.' },
  },
  {
    id: 'whale-fall', metres: 2400, title: 'A whale comes down',
    text: 'It settles on the slope below you, slow as a snowfall, and the dark around it fills with eaters.',
    a: { label: 'Grow toward it', effect: 'calcite ×1.1',
      text: 'You lean your lowest branches downslope. For a season the water is thick with what the whale gives.' },
    b: { label: 'Leave it to the others', effect: 'gifts from neighbours ×2',
      text: 'You let the hagfish and the worms have it. They remember who did not crowd them.' },
  },
  {
    id: 'cleaners', metres: 3200, title: 'The cleaners ask for room',
    text: 'A cleaner station has grown up at your edge, and the shrimp want a ledge of your stone to keep it on.',
    a: { label: 'Give them a ledge', effect: '+1 home for residents',
      text: 'You grow them a shelf. Others notice that your reef makes room, and come asking.' },
    b: { label: 'Keep the stone whole', effect: 'calcite dissolves ×0.9',
      text: 'You keep your edges thick and smooth. The cleaners move along the shelf, unhurt and unhelped.' },
  },
  {
    id: 'storm', metres: 3850, title: 'A storm takes a branch',
    text: 'Waves you have never felt reach down and break off one of your tallest branches. It rolls across the sand.',
    a: { label: 'Let it go', effect: '+2 lineage at the next spawning',
      text: 'It settles in a hollow far off and begins to grow. Some of you will go on there, whatever happens here.' },
    b: { label: 'Bind the wound', effect: 'bloom ×1.15',
      text: 'You seal the break in mucus and grow over it. The scar faces the light, and the light is good to it.' },
  },
  {
    id: 'turtle', metres: 3920, title: 'A turtle asleep',
    text: 'A green turtle has wedged itself between your branches to sleep, its shell grazing the polyps.',
    a: { label: 'Let it sleep', effect: 'bloom fades ×0.8',
      text: 'It sleeps through the night and wakes and eats the weed off you, gently, and comes back the next night.' },
    b: { label: 'Close your polyps on it', effect: 'sand ×1.25',
      text: 'It wakes stung and leaves. The Rasp move into the space it kept clear, and grind.' },
  },
  {
    id: 'bird', metres: 3990, title: 'A bird at low tide',
    text: 'The water drains off your crown. Something with a beak walks on you, and pecks.',
    a: { label: 'Close up tight', effect: 'spawn is lost ×0.8 as fast',
      text: 'You pull everything in and wait under your own stone until the sea comes back. What you have ripened, you keep.' },
    b: { label: 'Bear it', effect: 'spawn ×1.1',
      text: 'You stay open. It hurts. Every hour in the air ripens what you carry a little faster.' },
  },
];
