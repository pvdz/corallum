// The contract between the game loop and a zone scene.

import type { Job } from '../content/act2.ts';
import type { DialectId } from '../content/act4.ts';
import type { SiteId } from '../content/expeditions.ts';
import type { WorkId } from '../content/works.ts';
import type { MomentId } from '../content/moments.ts';
import type { ResidentId } from '../content/residents.ts';
import type { UpgradeId } from '../content/types.ts';

/** What a scene needs from the game state. */
export type ReefView = {
  polyps: number;
  /** Milestones reached by polyps and by glimmerseed (fuller polyps, a brighter reef). */
  polypTier: number;
  glowTier: number;
  symbionts: number;
  /** Metres of reef up the seamount. */
  height: number;
  /** 0..1, how strongly the glow lure is working. */
  glowLevel: number;
  /** Seconds since the last hand sweep, for the tentacle flick. */
  sinceSweep: number;
  /** Vent chimney tier, 0 = none. */
  vent: number;
  shoals: number;
  jobs: Record<Job, number>;
  /** Shoals away at a ruin: how many, sim seconds since they left and until they are back, which side they went. */
  /** A thorn star climbing the reef: how far through its climb (0..1), and on which side. */
  thorn: { u: number; side: number; kind: 'thorn-star' | 'dragonfish' } | null;
  /** The other reefs are spawning (Sunlit full moon). */
  othersSpawn: boolean;
  /** How each moment was met. */
  moments: Readonly<Record<MomentId, '' | 'a' | 'b'>>;
  /** The sister reef's place, 0 (seamount) … 1 (surface). */
  sister: number;
  /** Stages built of each great work. */
  works: Record<WorkId, number>;
  /** Daughter colonies tended into nurseries. */
  nurseries: number;
  /** The line's chosen colours (content/palettes.ts). */
  palette: string;
  /** Relics brought home from the ruins. */
  relics: readonly SiteId[];
  /** Animals living in the reef's homes. */
  residents: readonly ResidentId[];
  trip: { shoals: number; since: number; left: number; side: number; site: string } | null;
  /** 0..1 of plankton's effect, for how thick the plankton motes are. */
  planktonLevel: number;
  bands: readonly string[];
  /** Thousandfold's bands read so far (0..9). */
  readings: number;
  /** 0..1, how smothered the reef is (Act III). */
  siltLevel: number;
  sandBars: number;
  /** Feeding channels cut in the slope (Act III), 0–6. */
  channels: number;
  /** Seagrass meadows sown on the sunlit sand. */
  meadows: number;
  /** Sunlit Crown: pigments grown (colour on the reef) and canopy spread (polyps opened to the light). */
  pigments: number;
  /** Aragonite lattice levels (crystal glints along the branches). */
  lattice: number;
  canopy: number;
  /** Which seamount this run grows on (warm and cold tint the deep). */
  seamount: string;
  rasp: number;
  /** The truce choice about Ossel's wall. */
  wall: '' | 'a' | 'b';
  /** How the Rasp behave: trusting (story told as the bands tell it), polite (silt-only terms). */
  raspTrust: boolean;
  raspPolite: boolean;
  /** Glass gardeners (a lineage trait): shrimp graze the silt on the Twilight Shelf. */
  gardeners: boolean;
  /** The Form dialect, which shapes the sunlit reef. */
  form: DialectId | '';
  /** The Craft dialect: fluorescent polyps, mucus nets or sweeper tentacles. */
  craft: DialectId | '';
  /** The Spawn dialect: broadcast clouds, brooded larvae or breaking fragments. */
  spawnMode: DialectId | '';
  /** Act V: the moon (0..1, full at 0.5), spawn ripeness, seconds since the release (−1 before). */
  moonPhase: number;
  moonFull: boolean;
  /** This cycle's full moon is a great tide (four memories). */
  greatMoon: boolean;
  spawnLevel: number;
  sinceBreach: number;
};

/** Purchases (by upgrade id) and story moments a scene may flourish. */
export type EffectKind = UpgradeId | 'reading' | 'truce' | 'breach';

/** The part of the canvas not covered by the panel, in device pixels. */
export type Focus = { x: number; y: number; w: number; h: number };

/**
 * The view's zoom (view mode): scenes are drawn under a scale transform when it is above 1, so
 * caches made at 1× would look soft; drawers that cache check it and draw directly instead.
 */
export const zoom = { k: 1 };

export type Scene = {
  resize(w: number, h: number, dpr: number, focus: Focus): void;
  draw(ctx: CanvasRenderingContext2D, t: number, view: ReefView): void;
  /** Play a one-off flourish (a purchase) starting at the next drawn frame. */
  effect(kind: EffectKind): void;
  /** 0 disables the bloom pass (quality tier). */
  bloomStrength: number;
  /** Where the reef's crown polyp was last drawn, in device pixels. */
  crownAt: [number, number];
  /** Whether the water at (x, y) is dark enough for a touch to light the plankton (deep zones always). */
  darkAt?(x: number, y: number): boolean;
};

/** Queue of running effects, stamped with scene time when first drawn. */
export function createEffects() {
  const running: { kind: EffectKind; start: number }[] = [];
  const pending: EffectKind[] = [];
  return {
    push(kind: EffectKind): void {
      pending.push(kind);
    },
    /** The live effects at time t with their age in seconds (expired ones are dropped). */
    live(t: number, life = 2.2): { kind: EffectKind; age: number; start: number }[] {
      while (pending.length) running.push({ kind: pending.shift()!, start: t });
      for (let i = running.length - 1; i >= 0; i--) {
        const age = t - running[i]!.start;
        if (age < 0 || age > life) running.splice(i, 1);
      }
      return running.map((e) => ({ kind: e.kind, age: t - e.start, start: e.start }));
    },
  };
}
