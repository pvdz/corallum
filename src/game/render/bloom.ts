// Cheap portable bloom: downsample the frame twice (bilinear filtering does the blurring),
// square it to keep only the bright parts, and add it back over the frame.
// Uses no ctx.filter, so it behaves the same in every browser.

export type Bloom = { apply(ctx: CanvasRenderingContext2D, strength: number): void };

export function createBloom(): Bloom {
  const a = document.createElement('canvas');
  const b = document.createElement('canvas');
  const actx = a.getContext('2d')!;
  const bctx = b.getContext('2d')!;
  return {
    apply(ctx, strength) {
      if (strength <= 0) return;
      const src = ctx.canvas;
      const aw = Math.max(1, src.width >> 2), ah = Math.max(1, src.height >> 2);
      const bw = Math.max(1, src.width >> 4), bh = Math.max(1, src.height >> 4);
      if (a.width !== aw || a.height !== ah) { a.width = aw; a.height = ah; }
      if (b.width !== bw || b.height !== bh) { b.width = bw; b.height = bh; }
      actx.globalCompositeOperation = 'copy';
      actx.imageSmoothingEnabled = true;
      actx.drawImage(src, 0, 0, aw, ah);
      // Squaring (multiply by itself) suppresses the dim water and keeps the glows.
      actx.globalCompositeOperation = 'multiply';
      actx.drawImage(a, 0, 0);
      bctx.globalCompositeOperation = 'copy';
      bctx.imageSmoothingEnabled = true;
      bctx.drawImage(a, 0, 0, bw, bh);
      ctx.save();
      // In screen space, whatever transform the scene was drawn under (view-mode zoom).
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = strength;
      ctx.drawImage(b, 0, 0, src.width, src.height);
      ctx.globalAlpha = strength * 0.6;
      ctx.drawImage(a, 0, 0, src.width, src.height);
      ctx.restore();
    },
  };
}
