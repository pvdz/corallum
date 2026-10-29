// Moments: small things that happen to the reef on the way up, each a choice between two ways of
// meeting it. They wait until answered and never block anything; each answer has one lasting
// effect for this reef (applied in sim/economy.ts by `chose()`). Told in Ossel's voice.

export type MomentId = 'brittle' | 'vent-crack' | 'snow' | 'lost-shoal' | 'hunters' | 'angler' | 'squid' | 'whale-fall' | 'old-lamp' | 'cleaners'
  | 'young-rasp' | 'slope' | 'eggs' | 'storm' | 'turtle' | 'first-light' | 'last-night' | 'bird';

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
    id: 'vent-crack', metres: 45, title: 'The vent cracks',
    text: 'With a shudder the old chimney splits along its side, and hot sour water pours out across your foot.',
    a: { label: 'Grow over the crack', effect: 'calcite dissolves ×0.8',
      text: 'You lay stone over it, band by band, until the sourness only seeps. The warmth stays.' },
    b: { label: 'Leave it open', effect: 'glow ×1.15',
      text: 'The glimmerseed crowd to the new heat and burn brighter for it, and you learn to live with the sting.' },
  },
  {
    id: 'snow', metres: 120, title: 'A blizzard of snow',
    text: 'For a whole day the marine snow comes down thick as smoke, and everything it touches is soft and grey.',
    a: { label: 'Feed on it', effect: 'calcite ×1.05',
      text: 'You open every mouth into it. Most of it is nothing, but not all of it, and you grow fat on the rest.' },
    b: { label: 'Shield your polyps', effect: 'calcite dissolves ×0.95',
      text: 'You close up and let it slide off your stone. Afterwards your skin is a little thicker than before.' },
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
    id: 'hunters', metres: 650, title: 'Hunters in the dark',
    text: 'A swarm of small fast squid falls on the lanternfish, flashing red to each other as they hunt.',
    a: { label: 'Shelter the shoals', effect: 'shoals cost ×0.9',
      text: 'You pull the shoals in among your branches and go still. The squid pass. The lanternfish never forget whose branches they were.' },
    b: { label: 'Light the water', effect: 'light shoals make ×1.2 glow',
      text: 'You flare as bright as you can, and the shoals flare with you. The squid scatter, dazzled. Your shoals learned to shine together.' },
  },
  {
    id: 'angler', metres: 900, title: 'Another light',
    text: 'An anglerfish has hung its lure beside your glow, very still, and the small things come to both of you.',
    a: { label: 'Outshine it', effect: 'lure +0.5',
      text: 'You burn until its little lamp looks like nothing. It drifts off, offended. The food is yours.' },
    b: { label: 'Share the dark', effect: 'plankton is eaten ×0.85 as fast',
      text: 'You let it stay. It eats what strays too close to you, and the rest of the plankton lingers.' },
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
    id: 'old-lamp', metres: 2600, title: 'A lamp drifting',
    text: 'A shell from the old city drifts by, very slowly, still faintly lit after all this time.',
    a: { label: 'Take it in', effect: 'glow ×1.1',
      text: 'You catch it in your branches. Its light goes into your glimmerseed and stays there.' },
    b: { label: 'Let it light the way', effect: 'trips ×0.85 as long',
      text: 'You let it go on. The shoals follow it a little way and learn a quicker path to the ruins.' },
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
    id: 'young-rasp', metres: 3450, title: 'A young Rasp, alone',
    text: 'Small, its beak still soft, it has lost the others and is scraping at your living polyps out of hunger.',
    a: { label: 'Give it dead stone', effect: 'the Rasp eat ×0.8 of your stone',
      text: 'You open a dead branch to it. It eats, and sleeps, and later the others come for it and are gentler with you.' },
    b: { label: 'Send it to its kind', effect: 'sand ×1.15',
      text: 'You close against it until it gives up and swims downslope, where the others are grinding. They grind harder with it back.' },
  },
  {
    id: 'slope', metres: 3500, title: 'The slope gives way',
    text: 'With a long low rumble the shelf above you slumps. A river of silt and old stone pours past your flank.',
    a: { label: 'Root deeper', effect: 'calcite ×1.05',
      text: 'You grip the rock with everything you have. When it is over you are still there, and holding harder than before.' },
    b: { label: 'Let it scour you', effect: 'silt swept +0.03/s',
      text: 'You let it pour over you. It strips the dead silt from your branches, and the channel it cut stays open.' },
  },
  {
    id: 'eggs', metres: 3600, title: 'Eggs in the dead stone',
    text: 'A Rasp has laid a clutch of eggs in a crack of your oldest, deadest stone, and gone.',
    a: { label: 'Keep them safe', effect: 'room for 4 more Rasp',
      text: 'You grow a lip of stone over the crack. Months later the young come out grinding, and stay.' },
    b: { label: 'Let the shrimp have them', effect: 'silt swept +0.02/s',
      text: 'The glass shrimp find them before you decide. Fed, they clean your branches twice as hard.' },
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
    id: 'first-light', metres: 3982, title: 'First light',
    text: 'Above you, through less water than you have ever had over you, the sky is going pale. Ossel has no word for it either.',
    a: { label: 'Turn toward it', effect: 'bloom ×1.15',
      text: 'Every polyp leans east. The symbionts drink the first light like water.' },
    b: { label: 'Wait for the moon', effect: 'spawn is lost ×0.85 as fast',
      text: 'You keep your face to where the moon will rise, and hold what you carry close.' },
  },
  {
    id: 'last-night', metres: 3988, title: 'The last night under water',
    text: 'Tomorrow your crown will be in the air. Tonight there is still water over all of you, the last of it.',
    a: { label: 'Remember the deep', effect: 'calcite dissolves ×0.9',
      text: 'You think of the vent, the dark, the snow. Your old stone hardens, as if to keep them.' },
    b: { label: 'Look only up', effect: 'spawn ×1.05',
      text: 'You turn everything toward the light that is coming. What you carry ripens toward it.' },
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
