// A short guide to how the reef grows, for the Reef tab.

export const GUIDE: readonly [string, string][] = [
  ['Calcite', 'Your polyps make it. Tap the water to sweep for more; buy polyps to make it faster.'],
  ['Bands', 'Each band of stone raises the reef. Rising is the whole journey: four thousand metres to the surface.'],
  ['Holding', 'Stores fill toward what the reef can hold, then stop. A denser lattice holds more while you are away.'],
  ['Neighbours', 'Tap a creature to learn its name; some of them answer a touch. Each one seen feeds the reef a little, and a little more once touched.'],
  ['Zones', 'Each zone of the sea brings a new way to grow: shoals, the Rasp, sunlight, the Spawning Moon.'],
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
