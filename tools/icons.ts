// Renders the app icons (PNG) from src/client/favicon.svg with the global Playwright:
// full-bleed squares for the home screen (the OS rounds the corners) and a maskable one with the
// mark inside the central safe zone. Usage: node --no-warnings tools/icons.ts

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const pw = createRequire(process.env.PLAYWRIGHT_GLOBAL_ROOT ?? '/usr/lib/node_modules/')('playwright') as typeof import('playwright');
const svg = readFileSync('src/client/favicon.svg', 'utf8');
// The mark without the rounded tile, so it can sit on a full-bleed square.
const mark = svg.replace(/<rect[^>]*\/>/, '');
const BG = '#06081a';
const OUT = 'src/client/icons';
mkdirSync(OUT, { recursive: true });

const browser = await pw.chromium.launch();
try {
  const page = await browser.newPage();
  const shot = async (size: number, inset: number, file: string) => {
    await page.setViewportSize({ width: size, height: size });
    const pad = Math.round(size * inset);
    await page.setContent(`<html><body style="margin:0;background:${BG}"><div style="width:${size}px;height:${size}px;box-sizing:border-box;padding:${pad}px">${mark.replace('<svg ', `<svg width="${size - 2 * pad}" height="${size - 2 * pad}" `)}</div></body></html>`);
    writeFileSync(`${OUT}/${file}`, await page.screenshot({ type: 'png' }));
    console.log(`${OUT}/${file}`);
  };
  await shot(180, 0.08, 'icon-180.png');
  await shot(192, 0.08, 'icon-192.png');
  await shot(512, 0.08, 'icon-512.png');
  // Maskable: the launcher may crop to a circle of 80% of the side; keep the mark inside it.
  await shot(512, 0.2, 'icon-maskable-512.png');
} finally {
  await browser.close();
}
