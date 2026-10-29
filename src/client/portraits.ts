// Portraits for the journal: the first good look at each creature, cropped from the world canvas
// as it was drawn, kept small (JPEG) in localStorage. A closer look in zoomed view mode replaces
// it once with a sharper close-up. Kept in memory only for ephemeral sessions (?bot, ?t, ?fresh),
// so debugging never overwrites a player's album.

const KEY = 'corallum.portraits';
const CLOSE_KEY = 'corallum.portraits.close';
const SIZE = 160;

export function createPortraits(persist: boolean) {
  let album: Record<string, string> = {};
  let close = new Set<string>();
  try {
    const raw = persist ? localStorage.getItem(KEY) : null;
    if (raw) album = JSON.parse(raw) as Record<string, string>;
    const rawClose = persist ? localStorage.getItem(CLOSE_KEY) : null;
    if (rawClose) close = new Set(JSON.parse(rawClose) as string[]);
  } catch { album = {}; }
  let count = Object.keys(album).length + close.size;

  function store(): void {
    if (!persist) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(album));
      localStorage.setItem(CLOSE_KEY, JSON.stringify([...close]));
    } catch { /* storage full: keep in memory */ }
  }

  return {
    get(id: string): string | null {
      return album[id] ?? null;
    },
    /** Whether a portrait is still wanted: any at all, or (zoomed in) a close-up. */
    wants(id: string, closeUp: boolean): boolean {
      return closeUp ? !close.has(id) : !(id in album);
    },
    /** Changes whenever a portrait is taken (the journal redraws). */
    get count() {
      return count;
    },
    /**
     * Crop a square of side `side` centred on (x, y) from `src` (device pixels). The caller makes
     * sure it lies inside the visible scene.
     */
    capture(id: string, src: HTMLCanvasElement, x: number, y: number, side: number, closeUp = false): void {
      const c = document.createElement('canvas');
      c.width = c.height = SIZE;
      const g = c.getContext('2d')!;
      g.drawImage(src, x - side / 2, y - side / 2, side, side, 0, 0, SIZE, SIZE);
      album[id] = c.toDataURL('image/jpeg', 0.78);
      if (closeUp) close.add(id);
      count++;
      store();
    },
    /** Forget them all (a full reset). */
    clear(): void {
      album = {};
      close = new Set();
      count = 0;
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem(CLOSE_KEY);
      } catch { /* ignore */ }
    },
  };
}
