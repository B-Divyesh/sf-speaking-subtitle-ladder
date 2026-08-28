import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

function silentWav(seconds = 20): Buffer {
  const sampleRate = 8_000;
  const dataSize = sampleRate * seconds * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(36 + dataSize, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34); buffer.write('data', 36); buffer.writeUInt32LE(dataSize, 40);
  return buffer;
}

async function openDemo(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/demo/');
  await expect(page.getByLabel('Demo mode')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning reset');
}

test('@claim:sample-demo loads a ready sample lesson in one visit', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText('Today I take ten minutes to listen.')).toBeVisible();
  await expect(page.getByText('20 sec loop')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset demo' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning reset');
});

test('@claim:isolated-demo uses a demo-prefixed IndexedDB database and never opens the real library', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Practise speaking with your own captions.');
  await openDemo(page);
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name));
  expect(names).toContain('subtitle-ladder');
  expect(names).toContain('demo:subtitle-ladder');
  await expect(page.getByText('Demo — sample data, nothing is saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Practise speaking with your own captions.');
  const demoProjects = await page.evaluate(async () => new Promise<number>((resolve, reject) => {
    const request = indexedDB.open('demo:subtitle-ladder');
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction('projects', 'readonly');
      const items = transaction.objectStore('projects').getAll();
      items.onsuccess = () => { database.close(); resolve(items.result.length); };
      items.onerror = () => reject(items.error);
    };
    request.onerror = () => reject(request.error);
  }));
  expect(demoProjects).toBe(0);
});

test('@claim:four-rungs shows each support level in the sample lesson', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Complete & continue' }).click();
  await expect(page.getByRole('heading', { name: 'Target text' })).toBeVisible();
  await page.getByRole('button', { name: 'Complete & continue' }).click();
  await expect(page.getByRole('heading', { name: 'Masked words' })).toBeVisible();
  await page.getByRole('button', { name: 'Complete & continue' }).click();
  await expect(page.getByRole('heading', { name: 'No text' })).toBeVisible();
});

test('@claim:privacy-local sends no third-party request while using the sample lesson', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await openDemo(page);
  await page.getByRole('button', { name: 'Complete & continue' }).click();
  const origins = [...new Set(requests.map((url) => new URL(url).origin))];
  expect(origins).toEqual([new URL(page.url()).origin]);
  const data = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name));
  expect(data).toContain('demo:subtitle-ladder');
});

test('@claim:offline-reload reloads the ready demo lesson after its first visit', async ({ page, context }) => {
  await page.goto('/?demo=1');
  await expect(page.getByLabel('Demo mode')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning reset');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning reset');
  await expect(page.getByText('Offline — your saved practice still works on this device.')).toBeVisible();
});

test('a service-worker update creates a fresh shell cache and keeps the demo usable offline', async ({ page, context }) => {
  await openDemo(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const script = await page.locator('script[src]').getAttribute('src');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register('/sw.js?v=update-regression');
    for (let attempt = 0; attempt < 30 && !registration.waiting; attempt += 1) await new Promise((resolve) => setTimeout(resolve, 100));
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL.includes('update-regression'))).toBe(true);
  await expect.poll(() => page.evaluate(async () => await caches.keys())).toEqual(['subtitle-ladder-shell-update-regression']);
  const cached = await page.evaluate(async () => ({
    keys: await caches.keys(),
    urls: (await Promise.all((await caches.keys()).map(async (key) => (await (await caches.open(key)).keys()).map((request) => request.url)))).flat()
  }));
  expect(cached.keys).toEqual(['subtitle-ladder-shell-update-regression']);
  expect(cached.urls).toContain(new URL(script!, page.url()).href);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning reset');
});

test('@claim:one-time-unlimited states the price and offers the hosted unlock', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.getByRole('button', { name: 'See the one-time unlock' }).click();
  await expect(page.getByText(/12\s*USD\s*·\s*once/)).toBeVisible();
  const checkout = page.getByRole('link', { name: 'Buy the unlimited unlock' });
  await expect(checkout).toHaveAttribute('href', /api\.sociobot\.in\/api\/v1\/products\/speaking-subtitle-ladder\/checkout/);
});

test('@claim:local-recording saves a microphone take in the browser', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.getByRole('button', { name: 'Stop & save' })).toBeVisible();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await expect(page.getByText('Take 1')).toBeVisible();
});

test('@claim:export-backup downloads a JSON copy when requested', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'My clips', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/subtitle-ladder-backup-.*\.json/);
});

test('@claim:timed-loops imports a clip, preserves normal practice behavior, and has no serious axe issues', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await openDemo(page);
  await Promise.all([
    page.waitForURL('http://127.0.0.1:4173/'),
    page.getByRole('button', { name: 'Start for real' }).click()
  ]);
  expect((await new AxeBuilder({ page }).analyze()).violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
  await page.getByRole('button', { name: 'Use my audio' }).click();
  await page.getByLabel('Clip name').fill('German morning greeting');
  await page.getByLabel('Choose audio').setInputFiles({ name: 'greeting.wav', mimeType: 'audio/wav', buffer: silentWav() });
  const target = `1\n00:00:00,000 --> 00:00:08,000\nGuten Morgen!\n\n2\n00:00:08,000 --> 00:00:17,000\nWie geht es dir?`;
  await page.getByLabel(/Target-language captions/).setInputFiles({ name: 'german.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(target) });
  await page.getByLabel(/I own this recording/).check();
  await page.getByRole('button', { name: 'Create my loops' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning greeting');
  await page.getByRole('button', { name: 'Complete & continue' }).click();
  await expect(page.getByText('Guten Morgen!')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('390px mobile has the sample action and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Try it with sample data' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning reset');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('keyboard focus, dark mode, reduced motion, and mobile axe checks pass', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to practice' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'Skip to practice' })).toHaveCSS('outline-width', '3px');
  await page.getByRole('button', { name: 'Change theme' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.setViewportSize({ width: 390, height: 844 });
  expect((await new AxeBuilder({ page }).analyze()).violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
});

test('legal routes are direct and semantic', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page).toHaveTitle('Privacy — Subtitle Ladder');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await page.goto('/terms/');
  await expect(page).toHaveTitle('Terms — Subtitle Ladder');
});
