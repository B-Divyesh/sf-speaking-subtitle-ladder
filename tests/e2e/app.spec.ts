import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const targetSrt = `1\n00:00:00,000 --> 00:00:08,000\nGuten Morgen!\n\n2\n00:00:08,000 --> 00:00:17,000\nWie geht es dir?`;

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

async function openDemo(page: Page): Promise<void> {
  await page.goto('/demo/');
  await expect(page.getByLabel('Demo mode')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning reset');
}

async function createClip(page: Page, title: string, options: { seconds?: number; captions?: string; captionName?: string; direction?: 'auto' | 'ltr' | 'rtl'; language?: string } = {}): Promise<void> {
  const seconds = options.seconds ?? 20;
  await page.getByRole('button', { name: /Use my audio|New clip/ }).first().click();
  await expect(page).toHaveURL(/\/new\/$/);
  await page.getByLabel('Clip name').fill(title);
  await page.getByLabel('Choose audio').setInputFiles({ name: `${title}.wav`, mimeType: 'audio/wav', buffer: silentWav(seconds) });
  await page.getByLabel(/Target-language captions/).setInputFiles({
    name: options.captionName ?? 'captions.srt',
    mimeType: options.captionName?.endsWith('.vtt') ? 'text/vtt' : 'application/x-subrip',
    buffer: Buffer.from(options.captions ?? targetSrt)
  });
  if (options.direction) await page.getByLabel('Text direction').selectOption(options.direction);
  if (options.language) await page.getByLabel('Target language').fill(options.language);
  await page.getByLabel(/I own this recording/).check();
  await page.getByRole('button', { name: 'Create my loops' }).click();
}

async function seriousAxeViolations(page: Page) {
  return (await new AxeBuilder({ page }).analyze()).violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''));
}

async function seedFreeLimits(page: Page): Promise<void> {
  await expect(page.locator('h1')).toBeVisible();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('subtitle-ladder', 1);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    const transaction = database.transaction(['projects', 'recordings'], 'readwrite');
    const projectStore = transaction.objectStore('projects');
    const recordingStore = transaction.objectStore('recordings');
    const base = {
      createdAt: '2026-09-06T00:00:00.000Z', updatedAt: '2026-09-06T00:00:00.000Z', mediaName: 'sample.wav',
      mediaType: 'audio/wav', mediaBlob: new Blob(['sample'], { type: 'audio/wav' }), duration: 20,
      targetLanguage: 'de', textDirection: 'auto', targetCues: [{ id: 'cue-1', start: 0, end: 20, text: 'Guten Morgen' }],
      translationCues: [], loops: [{ id: 'loop-1', start: 0, end: 20, cueIds: ['cue-1'] }], progress: {}
    };
    projectStore.put({ ...base, id: 'limit-project-1', title: 'Limit project one' });
    projectStore.put({ ...base, id: 'limit-project-2', title: 'Limit project two' });
    for (let index = 0; index < 10; index += 1) {
      recordingStore.put({ id: `limit-take-${index}`, projectId: 'limit-project-1', loopId: 'loop-1', stage: 0, createdAt: `2026-09-06T00:00:${String(index).padStart(2, '0')}.000Z`, mimeType: 'audio/webm', blob: new Blob(['take'], { type: 'audio/webm' }) });
    }
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
}

test('@claim:sample-demo loads and resets a ready sample lesson in one visit', async ({ page }) => {
  await openDemo(page);
  await expect(page.getByText('Today I take ten minutes to listen.')).toBeVisible();
  await expect(page.getByText('20 sec loop')).toBeVisible();
  await page.getByRole('button', { name: 'Complete & continue' }).click();
  await expect(page.getByRole('heading', { name: 'Target text' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByRole('heading', { name: 'Translation' })).toBeVisible();
});

test('@claim:isolated-demo never reads or changes the real library', async ({ page }) => {
  await page.goto('/');
  await seedFreeLimits(page);
  await openDemo(page);
  await expect(page.getByText('Demo — sample data, nothing is saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await expect(page.getByText('Limit project one')).toBeVisible();
  const counts = await page.evaluate(async () => Promise.all(['subtitle-ladder', 'demo:subtitle-ladder'].map((name) => new Promise<number>((resolve, reject) => {
    const open = indexedDB.open(name);
    open.onsuccess = () => {
      const database = open.result;
      const request = database.transaction('projects', 'readonly').objectStore('projects').count();
      request.onsuccess = () => { database.close(); resolve(request.result); };
      request.onerror = () => reject(request.error);
    };
    open.onerror = () => reject(open.error);
  }))));
  expect(counts).toEqual([2, 0]);
});

test('@claim:four-rungs completes translation, target text, masked words, and no text', async ({ page }) => {
  await openDemo(page);
  for (const heading of ['Target text', 'Masked words', 'No text']) {
    await page.getByRole('button', { name: 'Complete & continue' }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Complete this level' }).click();
  await expect(page.getByRole('button', { name: /No text Completed/ })).toBeVisible();
});

test('@claim:timed-loops creates 15–60 second loops from SRT and RTL WebVTT captions', async ({ page }) => {
  await page.goto('/');
  await createClip(page, 'SRT practice');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('SRT practice');
  await expect(page.getByText(/\d+ sec loop/)).toHaveText(/(?:1[5-9]|[2-5]\d|60) sec loop/);
  await page.getByRole('button', { name: 'My clips', exact: true }).click();
  const arabicVtt = `WEBVTT\n\n00:00.000 --> 00:08.000\nمرحبا بالعالم\n\n00:08.000 --> 00:17.000\nكيف حالك اليوم`;
  await createClip(page, 'Arabic WebVTT', { captions: arabicVtt, captionName: 'arabic.vtt', direction: 'rtl', language: 'ar' });
  await page.getByRole('button', { name: 'Complete & continue' }).click();
  await expect(page.getByText('مرحبا بالعالم')).toBeVisible();
  await expect(page.locator('.caption-stage')).toHaveAttribute('dir', 'rtl');
});

test('@claim:privacy-local keeps imported audio and a microphone take in IndexedDB without third-party requests', async ({ page }) => {
  const requests: Array<{ url: string; method: string }> = [];
  page.on('request', (request) => requests.push({ url: request.url(), method: request.method() }));
  await page.goto('/');
  await createClip(page, 'Private practice');
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await expect(page.getByText('Take 1')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Private practice');
  const stored = await page.evaluate(async () => new Promise<{ media: number; recordings: number; take: number }>((resolve, reject) => {
    const open = indexedDB.open('subtitle-ladder');
    open.onsuccess = () => {
      const database = open.result;
      const transaction = database.transaction(['projects', 'recordings'], 'readonly');
      const projects = transaction.objectStore('projects').getAll();
      const recordings = transaction.objectStore('recordings').getAll();
      transaction.oncomplete = () => {
        database.close();
        resolve({ media: projects.result[0].mediaBlob.size, recordings: recordings.result.length, take: recordings.result[0].blob.size });
      };
      transaction.onerror = () => reject(transaction.error);
    };
    open.onerror = () => reject(open.error);
  }));
  expect(stored.media).toBeGreaterThan(44);
  expect(stored.recordings).toBe(1);
  expect(stored.take).toBeGreaterThan(0);
  expect([...new Set(requests.map((request) => new URL(request.url).origin))]).toEqual([new URL(page.url()).origin]);
  expect([...new Set(requests.map((request) => request.method))]).toEqual(['GET']);
});

test('@claim:offline-reload reloads the ready demo lesson after its first visit', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/?demo=1');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning reset');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning reset');
  await expect(page.getByText('Offline — your saved practice still works on this device.')).toBeVisible();
  await context.close();
});

test('@claim:local-recording saves and reopens a microphone take for the current rung', async ({ page }) => {
  await openDemo(page);
  await page.getByRole('button', { name: 'Complete & continue' }).click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await expect(page.getByText('Take 1')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Target text/ }).click();
  await expect(page.getByText('Take 1')).toBeVisible();
});

test('@claim:backup-roundtrip exports and restores a project and take when data fetches are blocked', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('data:')) return Promise.reject(new TypeError('Blocked by test CSP'));
      return originalFetch(input, init);
    }) as typeof window.fetch;
  });
  const consoleErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await openDemo(page);
  await page.getByRole('button', { name: 'Complete & continue' }).click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Stop & save' }).click();
  await page.getByRole('button', { name: 'My clips', exact: true }).click();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^subtitle-ladder-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  await page.getByRole('button', { name: 'Start for real' }).click();
  await page.getByLabel('Import a backup').setInputFiles(path!);
  await expect(page.getByText('1 clip imported.')).toBeVisible();
  await page.getByRole('button', { name: /^01 German morning reset/ }).click();
  await expect(page.getByRole('button', { name: /Translation Completed/ })).toBeVisible();
  await page.getByRole('button', { name: /Target text/ }).click();
  await expect(page.getByText('Take 1')).toBeVisible();
  await expect(page.locator('#source-audio')).toHaveAttribute('src', /^blob:/);
  expect(consoleErrors).toEqual([]);
});

test('@claim:free-limits keeps the free version at two clips and ten takes', async ({ page }) => {
  await page.goto('/');
  await seedFreeLimits(page);
  await page.reload();
  await page.getByRole('button', { name: 'New clip' }).click();
  await expect(page).toHaveURL(/\/unlimited\/$/);
  await expect(page.getByText('Free: two local practice clips')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: /^01 Limit project one/ }).click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page).toHaveURL(/\/unlimited\/$/);
  await expect(page.getByText('Free: ten local microphone takes')).toBeVisible();
});

test('@claim:one-time-unlimited verifies a license and removes both app count limits', async ({ page }) => {
  let verifications = 0;
  await page.route('https://api.sociobot.in/api/v1/products/speaking-subtitle-ladder/verify?*', async (route) => {
    verifications += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) });
  });
  await page.goto('/unlimited/');
  await expect(page.getByRole('link', { name: 'Buy the unlimited version' })).toHaveAttribute('href', 'https://api.sociobot.in/api/v1/products/speaking-subtitle-ladder/checkout');
  await page.goto('/?license=fixture-active-license');
  await expect(page).toHaveURL(/\/unlimited\/$/);
  await expect(page.getByText('Unlimited is active on this device.')).toBeVisible();
  await expect(page.getByText(/12\s*USD\s*·\s*once/)).toBeVisible();
  await seedFreeLimits(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Unlimited is active' })).toBeVisible();
  await page.getByRole('button', { name: 'New clip' }).click();
  await expect(page).toHaveURL(/\/new\/$/);
  await page.getByRole('button', { name: 'My clips', exact: true }).click();
  await page.getByRole('button', { name: /^01 Limit project one/ }).click();
  await page.getByRole('button', { name: 'Start recording' }).click();
  await expect(page.getByRole('button', { name: 'Stop & save' })).toBeVisible();
  expect(verifications).toBe(1);
});

test('@claim:daily-license-check sends a saved license for verification at most once in 24 hours', async ({ page }) => {
  let verifications = 0;
  await page.route('https://api.sociobot.in/api/v1/products/speaking-subtitle-ladder/verify?*', async (route) => {
    verifications += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) });
  });
  await page.goto('/?license=fixture-daily-license');
  await expect(page.getByText('Unlimited is active on this device.')).toBeVisible();
  expect(verifications).toBe(1);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Unlimited is active' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Unlimited is active' })).toBeVisible();
  expect(verifications).toBe(1);
});

test('@claim:delete-local-data clears every saved project and take after confirmation', async ({ page }) => {
  await page.goto('/');
  await seedFreeLimits(page);
  await page.goto('/privacy/');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Clear all local practice data' }).click();
  await expect(page.getByText('All local practice data was cleared.')).toBeVisible();
  const counts = await page.evaluate(async () => new Promise<number[]>((resolve, reject) => {
    const open = indexedDB.open('subtitle-ladder');
    open.onsuccess = () => {
      const database = open.result;
      const transaction = database.transaction(['projects', 'recordings'], 'readonly');
      const projects = transaction.objectStore('projects').count();
      const recordings = transaction.objectStore('recordings').count();
      transaction.oncomplete = () => { database.close(); resolve([projects.result, recordings.result]); };
      transaction.onerror = () => reject(transaction.error);
    };
    open.onerror = () => reject(open.error);
  }));
  expect(counts).toEqual([0, 0]);
});

test('@claim:installable-pwa exposes an install manifest and active offline worker', async ({ page }) => {
  await openDemo(page);
  const result = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const manifest = await fetch(link!.href).then((response) => response.json());
    const registration = await navigator.serviceWorker.ready;
    return { display: manifest.display, icons: manifest.icons.map((item: { sizes: string }) => item.sizes), scope: registration.scope };
  });
  expect(result.display).toBe('standalone');
  expect(result.icons).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(result.scope).toBe('http://127.0.0.1:4173/');
});

test('a service-worker update creates a fresh shell cache and keeps the demo usable offline', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
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
  const cachedUrls = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async (key) => (await (await caches.open(key)).keys()).map((request) => request.url)))).flat());
  expect(cachedUrls).toContain(new URL(script!, page.url()).href);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('German morning reset');
  await context.close();
});

test('invalid audio, captions, and loop boundaries explain recovery', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Use my audio' }).click();
  await page.getByLabel('Clip name').fill('Recovery practice');
  await page.getByLabel('Choose audio').setInputFiles({ name: 'short.wav', mimeType: 'audio/wav', buffer: silentWav(14) });
  await page.getByLabel(/Target-language captions/).setInputFiles({ name: 'valid.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(targetSrt) });
  await page.getByLabel(/I own this recording/).check();
  await page.getByRole('button', { name: 'Create my loops' }).click();
  await expect(page.getByRole('alert')).toContainText('audio that is at least 15 seconds');
  await page.getByLabel('Choose audio').setInputFiles({ name: 'exact.wav', mimeType: 'audio/wav', buffer: silentWav(15) });
  await page.getByLabel(/Target-language captions/).setInputFiles({ name: 'broken.srt', mimeType: 'application/x-subrip', buffer: Buffer.from('words without timing') });
  await page.getByRole('button', { name: 'Create my loops' }).click();
  await expect(page.getByRole('alert')).toContainText('No timed captions were found');
  await page.getByLabel(/Target-language captions/).setInputFiles({ name: 'fixed.srt', mimeType: 'application/x-subrip', buffer: Buffer.from(`1\n00:00:00,000 --> 00:00:14,500\nGuten Morgen`) });
  await page.getByRole('button', { name: 'Create my loops' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Recovery practice');
  await page.getByText('Adjust loop boundaries').click();
  await page.getByLabel('End (seconds)').fill('14');
  await page.getByRole('button', { name: 'Save boundaries' }).click();
  await expect(page.getByText('Use a loop between 15 and 60 seconds within the audio.')).toBeVisible();
  await page.getByLabel('End (seconds)').fill('15');
  await page.getByRole('button', { name: 'Save boundaries' }).click();
  await expect(page.getByText('Loop boundaries saved.')).toBeVisible();
});

test('demo rung hover contrast passes Axe in light and dark themes', async ({ page }) => {
  await openDemo(page);
  const current = page.getByRole('button', { name: /Translation/ });
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    await current.hover();
    expect(await seriousAxeViolations(page)).toEqual([]);
  }
});

test('skip focus, view focus, browser history, reduced motion, and mobile touch targets work', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to practice' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.getByRole('button', { name: 'Use my audio' }).click();
  await expect(page).toHaveURL(/\/new\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.goBack();
  expect(new URL(page.url()).pathname).toBe('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Practise speaking with your own captions.');
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/', '/demo/', '/unlimited/']) {
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    const smallTargets = await page.locator('a:visible, button:visible').evaluateAll((items) => items.map((item) => {
      const box = item.getBoundingClientRect();
      return { name: item.getAttribute('aria-label') || item.textContent?.trim(), width: box.width, height: box.height };
    }).filter((item) => item.width < 44 || item.height < 44));
    expect(smallTargets, route).toEqual([]);
  }
});

test('route titles, social metadata, legal pages, and one-h1 structure are complete', async ({ page }) => {
  const routes = [
    ['/', 'Subtitle Ladder — practise speaking with captions'],
    ['/demo/', 'Demo — Subtitle Ladder'],
    ['/new/', 'New practice clip — Subtitle Ladder'],
    ['/unlimited/', 'Remove practice limits — Subtitle Ladder'],
    ['/privacy/', 'Privacy — Subtitle Ladder'],
    ['/terms/', 'Terms — Subtitle Ladder']
  ];
  for (const [route, title] of routes) {
    await page.goto(route);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /social-card\.webp$/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/icons/apple-touch-icon.png');
  }
});
