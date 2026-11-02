// Number and duration formatting for the panel.

const SUFFIXES = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

let scientific = false;
/** Show large numbers as 1.23e9 instead of 1.23B (a player setting). */
export function setScientific(on: boolean): void {
  scientific = on;
}

export function num(x: number): string {
  if (!Number.isFinite(x)) return '∞';
  const a = Math.abs(x);
  if (a < 10) return x.toFixed(1);
  if (a < 1000) return Math.floor(x).toString();
  // Past the last suffix, scientific whatever the setting.
  if (scientific || a >= 1e36) return x.toExponential(2).replace('e+', 'e');
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(a) / 3));
  const scaled = Math.abs(x) / 1000 ** tier;
  // Cut, not rounded, like the whole numbers below 1000: 999,999 is 999k, never 1000k.
  const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  const p = 10 ** digits;
  const cut = Math.floor(scaled * p * (1 + 1e-12)) / p;
  return `${x < 0 ? '-' : ''}${cut.toFixed(digits)}${SUFFIXES[tier]}`;
}

export function rate(x: number): string {
  const a = Math.abs(x);
  // Rates that round to zero show as +0.00, never −0.00.
  const sign = x < 0 && a >= 0.005 ? '−' : '+';
  return `${sign}${a < 1 ? a.toFixed(2) : num(a)}/s`;
}

export function duration(sec: number): string {
  if (!Number.isFinite(sec)) return 'never';
  if (sec < 1) return 'now';
  // Whole seconds, rounded up (a countdown never says 0s while time is left), then split:
  // 59.5 s is "1m 0s", not "60s".
  const c = Math.ceil(sec);
  if (c < 60) return `${c}s`;
  if (c < 3600) return `${Math.floor(c / 60)}m ${c % 60}s`;
  // Hours and days show whole minutes and hours, rounded up the same way.
  const m = Math.ceil(sec / 60);
  if (m < 1440) return `${Math.floor(m / 60)}h ${m % 60}m`;
  const h = Math.ceil(sec / 3600);
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function metres(m: number): string {
  return m < 10 ? `${m.toFixed(1)} m` : `${Math.floor(m)} m`;
}
