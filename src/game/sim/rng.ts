// Seeded PRNG (mulberry32). The sim and procedural generation must never touch Math.random,
// so that a seed fully determines a run and screenshots are reproducible.

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function range(rng: Rng, lo: number, hi: number): number {
  return lo + (hi - lo) * rng();
}
