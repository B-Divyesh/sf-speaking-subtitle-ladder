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

test('creates a loop, climbs stages, records locally, and works offline', async ({ page, context }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Hear it');
  expect((await new AxeBuilder({ page }).analyze()).violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
  await page.getByRole('button', { name: 'Change theme' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);

  await page.getByRole('button', { name: 'Build a practice clip' }).click();
  await page.getByLabel('Clip name').fill('German morning greeting');
  await page.getByLabel('Choose audio').setInputFiles({ name: 'greeting.wav', mimeType: 'audio/wav', buffer: silentWav() });
  const target = `1\n00:00:00,000 --> 00:00:08,000\nGuten Morgen!\n\n2\n00:00:08,000 --> 00:00:17,000\nWie geht es dir?`;
  const translation = `1\n00:00:00,000 --> 00:00:09,000\nGood morning!\n\n2\n00:00:09,000 --> 00:00:18,000\nHow are you?`;
  await page.getByLabel(/Target-language captions/).setInputFiles({ name: 'german.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(target) });
  await page.getByLabel(/Translation captions/).setInputFiles({ name: 'english.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(translation) });
  await page.getByLabel('Target language').fill('de');
  await page.getByLabel(/I own this recording/).check();
  await page.getByRole('button', { name: 'Create my loops' }).click();

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning greeting');
  await expect(page.getByText('Good morning!')).toBeVisible();
  await page.getByRole('button', { name: 'Complete & continue' }).click();
  await expect(page.getByRole('heading', { name: 'Target text' })).toBeVisible();
  await expect(page.getByText('Guten Morgen!')).toBeVisible();

  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.getByRole('button', { name: 'Stop & save' })).toBeVisible();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await expect(page.getByText('Take 1')).toBeVisible();

  expect((await new AxeBuilder({ page }).analyze()).violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
  await page.getByRole('button', { name: 'My clips', exact: true }).click();
  await expect(page.getByText('German morning greeting')).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  const cachedUrls = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (key) => (await (await caches.open(key)).keys()).map((request) => request.url)))).flat());
  expect(cachedUrls.some((url) => /\/assets\/.*\.js$/.test(url))).toBe(true);
  const currentScript = new URL((await page.locator('script[src]').getAttribute('src'))!, page.url()).href;
  expect(cachedUrls, JSON.stringify(cachedUrls)).toContain(currentScript);
  const offlineErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (error) => offlineErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`));
  await context.setOffline(true);
  await page.reload();
  const offlineDiagnostic = await page.evaluate(async () => ({
    online: navigator.onLine,
    controlled: Boolean(navigator.serviceWorker.controller),
    appText: document.querySelector('#app')?.textContent,
    script: document.querySelector<HTMLScriptElement>('script[src]')?.src,
    resources: performance.getEntriesByType('resource').map((entry) => entry.name),
    caches: await caches.keys()
  }));
  expect(offlineDiagnostic, JSON.stringify(offlineDiagnostic)).toMatchObject({ controlled: true });
  expect(offlineErrors, JSON.stringify({ offlineErrors, offlineDiagnostic })).toEqual([]);
  expect(failedRequests, JSON.stringify({ failedRequests, offlineDiagnostic })).toEqual([]);
  expect(offlineDiagnostic.appText, JSON.stringify(offlineDiagnostic)).toBeTruthy();
  await expect(page.getByText(/Offline — your saved practice/)).toBeVisible();
  await expect(page.getByText('German morning greeting')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('legal pages are direct, semantic routes', async ({ page }) => {
  await page.goto('/privacy/');
  await expect(page).toHaveTitle('Privacy — Subtitle Ladder');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await page.goto('/terms/');
  await expect(page).toHaveTitle('Terms — Subtitle Ladder');
  await expect(page.locator('h1')).toHaveCount(1);
});

test('phone layout keeps the primary action and setup usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Build a practice clip' })).toBeVisible();
  await page.getByRole('button', { name: 'Build a practice clip' }).click();
  await expect(page.getByLabel('Clip name')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
