// Closed-form integrators for the two growth laws the whole economy is built from.
// Both are exact for any dt, which is what makes offline progress computable: a stock that
// obeys dx/dt = P - k*x converges to P/k, so long absences saturate on their own.

/** Exact solution of dx/dt = p - k*x after dt seconds, starting at x0. k > 0. */
export function relax(x0: number, p: number, k: number, dt: number): number {
  if (k <= 0) return x0 + p * dt;
  const eq = p / k;
  return eq + (x0 - eq) * Math.exp(-k * dt);
}

/** Equilibrium of dx/dt = p - k*x. */
export function equilibrium(p: number, k: number): number {
  return k > 0 ? p / k : Infinity;
}

/** Exact logistic growth toward cap at rate r: dx/dt = r*x*(1 - x/cap). x0 > 0. */
export function logistic(x0: number, cap: number, r: number, dt: number): number {
  if (cap <= 0) return 0;
  if (x0 <= 0) return 0;
  const e = Math.exp(-r * dt);
  return cap / (1 + (cap / x0 - 1) * e);
}

/** Seconds until relax() reaches `fraction` of the way from x0 to equilibrium. */
export function timeToFraction(k: number, fraction: number): number {
  return -Math.log(1 - fraction) / k;
}
