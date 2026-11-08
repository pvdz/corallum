// Portraits for the journal: the first good look at each creature, cropped from the world canvas
// as it was drawn, kept small (JPEG) in localStorage. A closer look in zoomed view mode replaces
// it once with a sharper close-up. Kept in memory only for ephemeral sessions (?bot, ?t, ?fresh),
// so debugging never overwrites a player's album.

const KEY = 'corallum.portraits';
const CLOSE_KEY = 'corallum.portraits.close';
const ART_KEY = 'corallum.portraits.art';
const SIZE = 160;
/**
 * Creatures whose look changed, by art version: an album kept from before a version forgets their
 * portraits (and close-ups), so the journal takes them again at the next good look.
 */
export const REDRAWN: readonly (readonly string[])[] = [
  [],
  // 1 (2026-11-07/08: the day's and the night's close-up passes)
  ['anglerfish', 'gulper', 'barreleye', 'hatchetfish', 'grouper', 'nautilus', 'clownfish', 'shore-bird', 'garden-eel', 'whale',
    'tree-worms', 'sea-star', 'hermit-crab', 'squat-lobster', 'sailors', 'mola', 'barracuda', 'pyrosome', 'cuttlefish', 'vent-shrimp',
    'sea-snake', 'octopus', 'giant-clam', 'moray', 'frogfish', 'nudibranch', 'sea-cucumber', 'decorator-crab', 'boxer-crab', 'rasp',
    'rasp-herd', 'oarfish', 'manta', 'eagle-rays', 'trumpetfish', 'turtle', 'damselfish', 'chimaera', 'rattail', 'larvacean',
    'giant-squid', 'breaching', 'sardine-run', 'bait-ball', 'moon-jelly', 'hatchlings', 'flashlight-fish', 'man-o-war', 'vampire-squid',
    'reef-shark', 'petrel', 'dumbo', 'brine-pool', 'smokers'],
  // 2 (2026-11-08: the Silt Floor's first close-up pass, the lantern shark)
  ['tripod-fish', 'sea-lily', 'brittle-star', 'sea-pig', 'lantern-shark'],
];
const ART_VERSION = REDRAWN.length - 1;

export function createPortraits(persist: boolean) {
  let album: Record<string, string> = {};
  let close = new Set<string>();
  try {
    const raw = persist ? localStorage.getItem(KEY) : null;
    if (raw) album = JSON.parse(raw) as Record<string, string>;
    const rawClose = persist ? localStorage.getItem(CLOSE_KEY) : null;
    if (rawClose) close = new Set(JSON.parse(rawClose) as string[]);
  } catch { album = {}; }
  // Portraits of creatures drawn anew since this album was kept are let go.
  try {
    const art = persist ? Number(localStorage.getItem(ART_KEY) ?? 0) : ART_VERSION;
    if (art < ART_VERSION) {
      for (let v = Math.max(0, art) + 1; v <= ART_VERSION; v++) for (const id of REDRAWN[v]!) { delete album[id]; close.delete(id); }
      localStorage.setItem(KEY, JSON.stringify(album));
      localStorage.setItem(CLOSE_KEY, JSON.stringify([...close]));
      localStorage.setItem(ART_KEY, String(ART_VERSION));
    }
  } catch { /* no storage */ }
  let count = Object.keys(album).length + close.size;

  function store(): void {
    if (!persist) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(album));
      localStorage.setItem(CLOSE_KEY, JSON.stringify([...close]));
    } catch { /* storage full: keep in memory */ }
  }
  // The album is written a little after the last capture: one write for a burst of sightings.
  let storeTimer = 0;
  function storeSoon(): void {
    clearTimeout(storeTimer);
    storeTimer = window.setTimeout(store, 2000);
  }
  if (persist) window.addEventListener('pagehide', () => { if (storeTimer) store(); });
  /** Crops being encoded (not wanted again meanwhile); a reset bumps the generation and drops them. */
  const pending = new Set<string>();
  let generation = 0;

  return {
    get(id: string): string | null {
      return album[id] ?? null;
    },
    /** Whether a portrait is still wanted: any at all, or (zoomed in) a close-up. */
    wants(id: string, closeUp: boolean): boolean {
      if (pending.has(`${id}|${closeUp}`)) return false;
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
      // The crop is taken without waiting for the frame (createImageBitmap) and the JPEG is
      // encoded off the frame (toBlob): a first sighting does not stall the frame it happens in.
      const key = `${id}|${closeUp}`, gen = generation;
      pending.add(key);
      const encode = (c: HTMLCanvasElement) => c.toBlob((blob) => {
        if (!blob) { pending.delete(key); return; }
        const read = new FileReader();
        read.onloadend = () => {
          pending.delete(key);
          if (gen !== generation || typeof read.result !== 'string') return;
          album[id] = read.result;
          if (closeUp) close.add(id);
          count++;
          storeSoon();
        };
        read.readAsDataURL(blob);
      }, 'image/jpeg', 0.78);
      createImageBitmap(src, Math.round(x - side / 2), Math.round(y - side / 2), Math.round(side), Math.round(side), { resizeWidth: SIZE, resizeHeight: SIZE, resizeQuality: 'medium' })
        .then((bmp) => {
          const c = document.createElement('canvas');
          c.width = c.height = SIZE;
          // Sized here too: a browser that ignores the resize options hands back the full crop.
          c.getContext('2d')!.drawImage(bmp, 0, 0, SIZE, SIZE);
          bmp.close();
          encode(c);
        }, () => pending.delete(key));
    },
    /** Forget them all (a full reset). */
    clear(): void {
      generation++;
      pending.clear();
      clearTimeout(storeTimer);
      storeTimer = 0;
      album = {};
      close = new Set();
      count = 0;
      try {
        localStorage.removeItem(KEY);
        localStorage.removeItem(CLOSE_KEY);
        localStorage.setItem(ART_KEY, String(ART_VERSION));
      } catch { /* ignore */ }
    },
  };
}
