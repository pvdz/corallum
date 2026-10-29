// A short guide to how the reef grows, for the Reef tab.

export const GUIDE: readonly [string, string][] = [
  ['Calcite', 'Your polyps make it. Tap the water to sweep for more; buy polyps to make it faster.'],
  ['Bands', 'Each band of stone raises the reef. Rising is the whole journey: four thousand metres to the surface.'],
  ['Holding', 'Stores fill toward what the reef can hold, then stop. A denser lattice holds more while you are away.'],
  ['Neighbours', 'Tap a creature to learn its name; some of them answer a touch. Each one seen feeds the reef a little, and a little more once touched.'],
  ['Zones', 'Each zone of the sea brings a new way to grow: shoals, the Rasp, sunlight, the Spawning Moon.'],
  ['The water', 'Every ten minutes the water turns, and each kind makes one kind of growing cheaper. The line above the shoals says what comes next: buy now, or wait for the right water.'],
  ['Ossel asks', 'One small thing at a time. Do it while you watch, and the reef gets a burst of what it lives by.'],
  ['Moments', 'Now and then something happens to the reef, and you choose how to meet it. Each choice lasts for this reef.'],
  ['Expeditions', 'From the Midnight Water, shoals can go to Thousandfold’s ruins. They stop their work while away and come back with a relic; when no ruin is in reach, they can roam.'],
  ['Shards', 'Sweeping, catching what falls, touching neighbours and the shoals’ journeys sometimes turn up a shard of an old tablet. The whole line keeps them.'],
  ['Residents', 'From the Twilight Shelf, small animals ask for a home in your branches. Homes are few: choose who suits the water you are in.'],
  ['Great works', 'One large thing to build in each middle zone, in stages, each paid in two kinds at once.'],
  ['Intruders', 'Something comes to eat the reef in every zone: a snail, a dragonfish, a thorn star, a gull. Tap it away for a burst.'],
  ['The signal', 'The shoals sometimes flash a pattern of lights. Watch, then press the same lamps (or keys 7–0).'],
  ['The elder', 'Once the truce begins, the Rasp elder asks about what the bands told. Answer rightly for lineage.'],
  ['Shells', 'In the Sunlit Crown a shell washes up now and then. Tap it to keep it on the line’s shelf.'],
  ['Choices', 'The glimmerseed strain at 15 m, the current on the shelf, four tiers of dialects: each shapes the reef.'],
  ['After the end', 'Plant children in the garden at dawn, then begin again. The chronicle remembers every ending.'],
  ['Spawning early', 'A lesser spawning starts again on a new seamount with lineage to spend. Hard seamounts, once offered, teach the whole line something if you grow far enough on them.'],
  ['The goal', 'Reach the surface and release your spawn under the full moon, carrying what you choose to remember.'],
];

/** What each stock is, shown when it is tapped (or hovered) in the panel. */
export const STOCK_NOTES: Record<string, string> = {
  calcite: 'Stone, eaten and laid down. Everything is bought with it. The deep water dissolves what you hold, so stores fill toward a limit.',
  glow: 'Light from the glimmerseed in your tissue. It lures food in, and the lanternfish swim its patterns.',
  plankton: 'Food the feeding shoals herd to the reef. It multiplies your calcite while it lasts.',
  murmurs: 'What the scouting shoals hear in the buried bands. Spend it on readings of Thousandfold.',
  silt: 'The Long Silt settling on your polyps. It smothers them; the Rasp and the currents clear it.',
  sand: 'What the Rasp leave of the stone they eat. Sand bars, channels and meadows are built from it.',
  bloom: 'Sugar from the sunlight your symbionts catch. It multiplies your calcite; dialects and canopy cost it.',
  spawn: 'Eggs and sperm in bundles, ripening for the Spawning Moon. Release it at the surface under a full moon.',
};

/** Shown once (per browser line) after an update with new things to find; `id` changes per update. */
export const NEWS = {
  id: 'news:2026-10-29',
  kicker: 'New in the sea',
  title: 'The reef has neighbours, and plans',
  text: 'The water turns every ten minutes and makes one kind of growing cheaper. Ossel asks for small things, ' +
    'and moments ask how you meet what happens. Shoals can search the ruins of Thousandfold, roam the dark, or ' +
    'visit the sister reef that races you to the surface. Residents move into your branches; each zone has a ' +
    'great work to build; thorn stars and dragonfish come to eat and can be driven off; shards of an old tablet ' +
    'turn up in the silt; the reef keeps its own bands. New seamounts bring boons, heirlooms and hard places, ' +
    'and the line learns new ways. The Reef tab’s guide has a line on each.',
} as const;
