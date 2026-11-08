// The link preview (og:image): the reef at the Breach under the moon, 1200×630, no UI, written to
// src/client/icons/share.jpg. Run: node --no-warnings tools/share.ts
// Frozen at the end of a song cycle (its call ring every 4 s has all but faded): a still caught mid-ring reads as a glass dome.
import { withGame } from './browser.ts';
await withGame(async (open) => {
  const { page } = await open({ name: 'share', width: 1200, height: 630, scale: 1, mobile: false }, '?bot=21500&t=903.85&nohints');
  page.setDefaultTimeout(2000);
  await page.waitForTimeout(3000);
  for (let i = 0; i < 10 && (await page.locator('.reader:not([hidden])').count()); i++) await page.locator('.reader:not([hidden]) button').first().click().catch(() => {});
  // No teaching rings (an intruder never yet driven off, the day's visitor) in the picture.
  await page.evaluate(() => { const s = (window as any).corallum.state; s.tally.intruders = 1; s.meta.seen.push(`v:${s.meta.day}`); });
  await page.locator('#view-mode').click();
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: '#sound,#view-mode,#photo,#depth-gauge,#whisper,#journal-note,#creature-label,.float{display:none!important}' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: new URL('../src/client/icons/share.jpg', import.meta.url).pathname, type: 'jpeg', quality: 82 });
});
