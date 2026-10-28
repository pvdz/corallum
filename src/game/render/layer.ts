// A cache for slow-moving full-frame layers (water, light shafts): painted at reduced resolution
// at most every `interval` seconds of scene time, then stretched over the frame each frame.
// Painting uses scene time snapped to the interval, so a frozen frame (?t) is still exact.

export function createLayerCache(resolution = 0.5) {
  let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  let paintedAt = NaN;
  let paintedKey = '';
  return {
    draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, interval: number, key: string,
      paint: (c: CanvasRenderingContext2D, t: number) => void): void {
      const cw = Math.max(1, Math.round(w * resolution)), ch = Math.max(1, Math.round(h * resolution));
      if (!canvas || canvas.width !== cw || canvas.height !== ch) {
        canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(cw, ch) : document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        paintedAt = NaN;
      }
      const tq = Math.floor(t / interval) * interval;
      if (tq !== paintedAt || key !== paintedKey) {
        const c = canvas.getContext('2d') as CanvasRenderingContext2D;
        c.setTransform(cw / w, 0, 0, ch / h, 0, 0);
        c.clearRect(0, 0, w, h);
        paint(c, tq);
        paintedAt = tq;
        paintedKey = key;
      }
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(canvas, 0, 0, w, h);
      ctx.restore();
    },
  };
}
