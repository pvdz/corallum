// The water's moods: every `period` seconds of sim time the water around the reef turns, and
// each kind makes one kind of growing cheaper while it lasts. Seeded per reef and known ahead,
// so the verb is timing: buy now, or save for the water that suits it. Prices only: stocks and
// offline progress are untouched.

import type { UpgradeId } from './types.ts';

export type WaterId = 'still' | 'rich' | 'slack' | 'lamp' | 'carrying' | 'gritty' | 'clear' | 'warm';

export type Water = {
  id: WaterId;
  name: string;
  /** What it does, shown beside the name (it says "cost": a bare "polyps ×0.7" reads as weaker polyps). */
  line: string;
  /** Zones (acts) where this water comes; elsewhere that slot is still. */
  zones: readonly number[];
  /** How often it comes, relative to the others. */
  weight: number;
  /** Price factor for these upgrades, and for Readings / truce words / dialects. */
  upgrades: readonly UpgradeId[];
  murmurs?: boolean;
  dialects?: boolean;
  factor: number;
};

export const WATER = {
  /** Sim seconds per slot. */
  period: 600,
  /** The band after which the water's moods are noticed (the first Midnight band). */
  band: 'rise',
  label: 'The water',
  next: 'then',
  same: 'the same',
  /** Before the water starts turning (the reef still in the silt). */
  notYet: 'the deep does not change yet',
  turns: 'turns in',
  soon: 'Soon',
  /** Heads the things already happening. */
  happening: 'Now',
  feast: 'something falls',
  intruder: { 'thorn-star': 'a thorn star', dragonfish: 'a dragonfish', 'drill-snail': 'a drill snail', gull: 'a gull' } as Record<string, string>,
  moon: 'full moon',
  now: 'now',
} as const;

export const WATERS: readonly Water[] = [
  { id: 'still', name: 'Still water', line: 'nothing stirs', zones: [1, 2, 3, 4, 5], weight: 3, upgrades: [], factor: 1 },
  { id: 'rich', name: 'Rich water', line: 'polyps and glimmerseed cost ×0.7', zones: [1, 2, 3, 4, 5], weight: 2, upgrades: ['polyp', 'symbiont'], factor: 0.7 },
  { id: 'slack', name: 'Slack water', line: 'bands cost ×0.8', zones: [1, 2, 3, 4, 5], weight: 2, upgrades: ['skeleton'], factor: 0.8 },
  { id: 'lamp', name: 'Lamp water', line: 'shoals and lure cost ×0.7', zones: [2, 3], weight: 1.5, upgrades: ['shoal', 'lure'], factor: 0.7 },
  { id: 'carrying', name: 'Carrying water', line: 'Readings and truce words cost ×0.7', zones: [2, 3], weight: 1.5, upgrades: [], murmurs: true, factor: 0.7 },
  { id: 'gritty', name: 'A gritty tide', line: 'sand works cost ×0.7', zones: [3, 4], weight: 1.5, upgrades: ['sandbar', 'channel', 'meadow', 'grounds'], factor: 0.7 },
  { id: 'clear', name: 'Clear water', line: 'pigments, canopy and dialects cost ×0.7', zones: [4, 5], weight: 1.5, upgrades: ['pigment', 'canopy'], dialects: true, factor: 0.7 },
  { id: 'warm', name: 'Warm water', line: 'ripening costs ×0.7', zones: [5], weight: 2, upgrades: ['ripen'], factor: 0.7 },
];
