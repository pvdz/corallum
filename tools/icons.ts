// Renders the app icons (PNG) from src/client/favicon.svg with the global Playwright:
// full-bleed squares for the home screen (the OS rounds the corners) and a maskable one with the
// mark inside the central safe zone. Usage: node --no-warnings tools/icons.ts

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const pw = createRequire(process.env.PLAYWRIGHT_GLOBAL_ROOT ?? '/usr/lib/node_modules/')('playwright') as typeof import('playwright');
const svg = readFileSync('src/client/favicon.svg', 'utf8');
// Full-bleed squares (the OS rounds the corners): the tile without its rounding. Maskable: the
// same sea carried past the edges and the mark drawn smaller, inside the central safe circle.
const full = svg.replace(' rx="7"', '');
const maskable = svg.replace(' rx="7"', '').replace('viewBox="0 0 32 32"', 'viewBox="-6 -6 44 44"')
  .replace('<rect width="32" height="32"', '<rect x="-6" y="-6" width="44" height="44"');
const BG = '#06081a';
const OUT = 'src/client/icons';
mkdirSync(OUT, { recursive: true });

const browser = await pw.chromium.launch();
try {
  const page = await browser.newPage();
  const shot = async (size: number, art: string, file: string) => {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<html><body style="margin:0;background:${BG}">${art.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
    writeFileSync(`${OUT}/${file}`, await page.screenshot({ type: 'png' }));
    console.log(`${OUT}/${file}`);
  };
  await shot(180, full, 'icon-180.png');
  await shot(192, full, 'icon-192.png');
  await shot(512, full, 'icon-512.png');
  // Maskable: the launcher may crop to a circle of 80% of the side; the mark stays inside it.
  await shot(512, maskable, 'icon-maskable-512.png');
} finally {
  await browser.close();
}
