// Shapes shared by every act's content.

export type UpgradeId =
  | 'polyp' | 'symbiont' | 'skeleton' | 'lattice' | 'vent' | 'lure'
  | 'shoal'
  | 'grounds' | 'sandbar' | 'channel';

export type Currency = 'calcite' | 'glow' | 'sand';

export type UpgradeDef = {
  id: UpgradeId;
  name: string;
  flavour: string;
  currency: Currency;
  baseCost: number;
  growth: number;
  maxLevel: number;
  /** From this level on, cost grows by a gentler factor (later acts' pacing). */
  growthAfter?: [number, number];
  /** Shown once all given conditions hold (levels, lifetime calcite, height, bands read). */
  reveal: { level?: [UpgradeId, number]; earned?: number; height?: number; band?: string };
};

/** Lore bands, read as the reef grows past their height. */
export type Band = { id: string; metres: number; title: string; text: string };
