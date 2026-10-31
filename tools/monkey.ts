// Button monkey: loads the game at bot times from the Silt Floor to past the ending and, inside the
// page, clicks every visible enabled button on every tab four times over (with a sweep between
// rounds), skipping the ones that reset, load, release or begin again; reports console errors.
// Usage: node --no-warnings tools/monkey.ts [desktop|mobile|landscape] [t1,t2,...]   (~3 min)

import { VIEWPORTS, withGame } from './browser.ts';
const vp = VIEWPORTS.find((v) => v.name === (process.argv[2] ?? 'desktop'))!;
const times = (process.argv[3] ?? '300,1500,3000,6000,9000,13000,17000,21000,25000,28000').split(',');
await withGame(async (open) => {
  for (const at of times) {
    const { page, errors } = await open(vp, `?bot=${at}`);
    page.on('dialog', (d) => d.dismiss());
    try {
      await page.waitForFunction(() => (window as any).corallum, null, { timeout: 90000 });
      await page.waitForTimeout(1500);
      let total = 0;
      for (let round = 0; round < 4; round++) {
        total += await page.evaluate(async () => {
          const SKIP = /reset|forget|load|release|begin again|wipe|delete|start over|let go early|clear|copy save|save to a file|import|lesser spawning|notif/i;
          const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
          let n = 0;
          const tabs = [...document.querySelectorAll<HTMLButtonElement>('.tab')];
          for (const tab of tabs) {
            tab.click();
            await sleep(60);
            const buttons = [...document.querySelectorAll<HTMLButtonElement>('button')].filter((b) => !b.disabled && b.offsetParent !== null);
            for (const b of buttons) {
              const label = `${b.textContent ?? ''} ${b.getAttribute('aria-label') ?? ''} ${b.title}`;
              if (SKIP.test(label) || b.id === 'photo') continue;
              b.click();
              n++;
              await sleep(15);
            }
          }
          return n;
        });
        await page.mouse.click(vp.width * 0.3, vp.height * 0.35);
        await page.keyboard.press('Space');
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(1000);
      const h = await page.evaluate(() => (window as any).corallum.state.height);
      console.log(vp.name, at, Math.round(h), `${total} clicks`, errors.length ? 'ERR ' + errors.join(' | ').slice(0, 800) : 'ok');
    } catch (e) { console.log(vp.name, at, 'FAIL', String(e).slice(0, 300), errors.join(' | ').slice(0, 500)); }
    await page.context().close();
  }
});
