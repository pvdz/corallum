// Small line icons for the upgrade cards: 24×24 SVG paths in the panel's ink, one per upgrade.

import type { UpgradeId } from '../content/types.ts';

const ICONS: Record<UpgradeId, string> = {
  // A polyp: a stalk and its crown of tentacles.
  polyp: '<path d="M12 21v-9"/><path d="M12 12c-2-2-5-2-6-5M12 12c2-2 5-2 6-5M12 12c-1-3-1-6 0-8M12 12c-2-3-4-4-6-4M12 12c2-3 4-4 6-4"/>',
  // A band of stone: rings stacked into a column.
  skeleton: '<ellipse cx="12" cy="6" rx="6" ry="2"/><path d="M6 6v12c0 1.1 2.7 2 6 2s6-.9 6-2V6"/><path d="M6 10c0 1.1 2.7 2 6 2s6-.9 6-2M6 14c0 1.1 2.7 2 6 2s6-.9 6-2"/>',
  // Glimmerseed: little lights drifting down.
  symbiont: '<circle cx="8" cy="7" r="1.6"/><circle cx="15" cy="11" r="2"/><circle cx="9" cy="16" r="1.4"/><path d="M15 4v2M15 16v2M3.5 11h2M18.5 7l1.5-1"/>',
  // Aragonite lattice: packed hexagons.
  lattice: '<path d="M8 4l4 2.3v4.6L8 13.2 4 10.9V6.3zM16 4l4 2.3v4.6l-4 2.3-4-2.3V6.3zM12 11l4 2.3v4.6L12 20.2 8 17.9v-4.6z"/>',
  // The vent: a chimney and its smoke.
  vent: '<path d="M8 21l1.5-9h5L16 21"/><path d="M12 12c-1-2 1-3 0-5s1-3 0-4"/>',
  // The lure: light spreading from a point.
  lure: '<circle cx="12" cy="12" r="1.8"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
  // A shoal: three small fish.
  shoal: '<path d="M4 8c2-2 5-2 7 0-2 2-5 2-7 0zM11 8l2-1.5v3zM10 16c2-2 5-2 7 0-2 2-5 2-7 0zM17 16l2-1.5v3zM6 12.5c1.4-1.4 3.6-1.4 5 0-1.4 1.4-3.6 1.4-5 0z"/>',
  // A daughter colony: a small branching head beside a larger one.
  daughter: '<path d="M8 21v-6M8 15l-3-4M8 15l3-4M8 11V7"/><path d="M17 21v-3M17 18l-2-2M17 18l2-2"/><path d="M3 21h18"/>',
  // Grazing grounds: a blunt beak over stone.
  grounds: '<path d="M4 11c3-4 9-5 13-2l3 2-3 1c-4 3-10 2-13-1z"/><path d="M3 19h18" /><circle cx="14" cy="10" r=".8"/>',
  // A sand bar: a long low ridge.
  sandbar: '<path d="M2 17c3-5 7-7 10-7s7 2 10 7"/><path d="M5 19h14"/>',
  // A feeding channel: a groove leading in.
  channel: '<path d="M3 8c5 1 7 4 9 9M21 8c-5 1-7 4-9 9"/><path d="M8 20l4-3 4 3"/>',
  // A pigment: three drops of colour.
  pigment: '<path d="M7 5c2 3 3 4.5 3 6a3 3 0 0 1-6 0c0-1.5 1-3 3-6zM17 9c2 3 3 4.5 3 6a3 3 0 0 1-6 0c0-1.5 1-3 3-6zM10 14c1.5 2.2 2.2 3.4 2.2 4.5a2.2 2.2 0 0 1-4.4 0c0-1.1.7-2.3 2.2-4.5z"/>',
  // The canopy: branches leaning open to the light.
  canopy: '<path d="M12 21v-8M12 13l-6-6M12 13l6-6M12 13V5M9 10l-4 1M15 10l4 1"/><path d="M8 3h8"/>',
  // A meadow: blades of seagrass.
  meadow: '<path d="M4 21c0-5 1-9 3-12M9 21c0-6 0-10 2-14M14 21c0-5 1-8 4-11M19 21c0-3 0-6 1-8"/><path d="M2 21h20"/>',
  // Ripening spawn: a bundle of eggs.
  // A cay: a low island above a wavy line.
  cay: '<path d="M3 15c3-4 6-6 9-6s6 2 9 6"/><path d="M2 18c2-1.2 4-1.2 6 0s4 1.2 6 0 4-1.2 6 0"/>',
  ripen: '<circle cx="10" cy="11" r="2.4"/><circle cx="14.5" cy="10" r="2.4"/><circle cx="12" cy="14.5" r="2.4"/><path d="M12 7V3"/>',
};

/** An inline SVG icon for an upgrade card. */
export function upgradeIcon(id: UpgradeId): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('card-icon');
  svg.innerHTML = ICONS[id];
  return svg;
}
