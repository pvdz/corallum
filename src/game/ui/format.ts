// Number and duration formatting for the panel.

const SUFFIXES = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function num(x: number): string {
  if (!Number.isFinite(x)) return '∞';
  const a = Math.abs(x);
  if (a < 10) return x.toFixed(1);
  if (a < 1000) return Math.floor(x).toString();
  const tier = Math.min(SUFFIXES.length - 1, Math.floor(Math.log10(a) / 3));
  const scaled = x / 1000 ** tier;
  return `${scaled.toFixed(scaled < 10 ? 2 : scaled < 100 ? 1 : 0)}${SUFFIXES[tier]}`;
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
  if (sec < 60) return `${Math.ceil(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
}

export function metres(m: number): string {
  return m < 10 ? `${m.toFixed(1)} m` : `${Math.floor(m)} m`;
}
