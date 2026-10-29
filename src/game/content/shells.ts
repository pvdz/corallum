// Shells: now and then one washes up on the Sunlit sand while you watch. Tap to keep it. Eight
// kinds; the line keeps them (meta.shells), each a little calcite, all eight a little more.

export type ShellId = 'cowrie' | 'conch' | 'scallop' | 'cone' | 'auger' | 'moon-snail' | 'sand-dollar' | 'olive';

export const SHELLS: readonly { id: ShellId; name: string; colour: string }[] = [
  { id: 'cowrie', name: 'Cowrie', colour: '#c89a6a' },
  { id: 'conch', name: 'Conch', colour: '#f0b8a0' },
  { id: 'scallop', name: 'Scallop', colour: '#e88a5a' },
  { id: 'cone', name: 'Cone', colour: '#d8b070' },
  { id: 'auger', name: 'Auger', colour: '#c8b8a0' },
  { id: 'moon-snail', name: 'Moon snail', colour: '#e8dcc8' },
  { id: 'sand-dollar', name: 'Sand dollar', colour: '#e8e0c0' },
  { id: 'olive', name: 'Olive', colour: '#a89060' },
];

export const SHELL = {
  period: 240, life: 40, zone: 4,
  each: 0.01, whole: 0.05,
  label: 'Shells', found: 'A shell', float: '· a shell for the shelf',
} as const;
