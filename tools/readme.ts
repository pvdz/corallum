// Retakes the README's pictures (docs/readme/*.jpg): each zone in view mode (the panel hidden, H)
// at a frozen moment chosen to show something of the zone, plus the panel on desktop and a phone.
// Usage: node --no-warnings tools/readme.ts [name ...]   (default: all)

import { withGame, type Viewport } from './browser.ts';

const DESKTOP: Viewport = { name: 'desktop', width: 1440, height: 900, scale: 1, mobile: false };
const PHONE: Viewport = { name: 'phone', width: 390, height: 844, scale: 3, mobile: true };

type Shot = { name: string; query: string; vp: Viewport; view: boolean };
const SHOTS: Shot[] = [
  // A chimaera crossing the Silt Floor.
  { name: 'silt-floor', query: '?bot=300&t=942', vp: DESKTOP, view: true },
  // The whale far above, whose call carries down.
  { name: 'midnight-water', query: '?bot=1800&t=1930', vp: DESKTOP, view: true },
  // The Rasp grazing the slope, a manta overhead.
  { name: 'twilight-shelf', query: '?bot=12000&t=11979', vp: DESKTOP, view: true },
  { name: 'sunlit-crown', query: '?bot=17000&t=17113', vp: DESKTOP, view: true },
  // A humpback breaching beside the crown, under the moon.
  { name: 'breach', query: '?bot=22000&t=22291', vp: DESKTOP, view: true },
  // The other reefs spawning under the full moon, in the Sunlit Crown.
  { name: 'full-moon', query: '?bot=17340&t=17340', vp: DESKTOP, view: true },
  { name: 'panel', query: '?bot=11000&t=11000', vp: DESKTOP, view: false },
  { name: 'phone', query: '?bot=17000&t=17000', vp: PHONE, view: false },
];

const want = process.argv.slice(2);
await withGame(async (open) => {
  for (const shot of SHOTS.filter((x) => !want.length || want.includes(x.name))) {
    const { page, errors } = await open(shot.vp, shot.query);
    await page.waitForTimeout(4000);
    for (let i = 0; i < 6 && (await page.locator('.reader:not([hidden]), .away:not([hidden])').count()); i++) await page.keyboard.press('Escape');
    if (shot.view) await page.keyboard.press('h');
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `docs/readme/${shot.name}.jpg`, type: 'jpeg', quality: 85 });
    console.log(`${errors.length ? 'ERR ' : 'ok  '} docs/readme/${shot.name}.jpg${errors.length ? ` ${errors[0]}` : ''}`);
    await page.context().close();
  }
});
