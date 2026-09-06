import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('release configuration', () => {
  it('ships hardening, immutable assets, and a styled 404 override', () => {
    const config = JSON.parse(readFileSync('public/staticwebapp.config.json', 'utf8')) as {
      globalHeaders: Record<string, string>;
      routes: Array<{ route: string; headers?: Record<string, string> }>;
      mimeTypes: Record<string, string>;
      responseOverrides: Record<string, { rewrite: string; statusCode: number }>;
    };
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'");
    expect(config.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(config.globalHeaders['Content-Security-Policy'].match(/connect-src[^;]*/)?.[0]).not.toContain('data:');
    expect(config.globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(config.globalHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(config.routes.find((route) => route.route === '/assets/*')?.headers?.['Cache-Control']).toContain('immutable');
    expect(config.routes.find((route) => route.route === '/manifest.webmanifest')?.headers?.['Content-Type']).toBe('application/manifest+json');
    expect(config.mimeTypes['.webmanifest']).toBe('application/manifest+json');
    expect(config.responseOverrides['404']).toEqual({ rewrite: '/404.html', statusCode: 404 });
  });

  it('versions PWA caches and precaches both demo entry routes', () => {
    const worker = readFileSync('public/sw.js', 'utf8');
    expect(worker).toContain('subtitle-ladder-shell-${buildId}');
    expect(worker).toContain('/?demo=1');
    expect(worker).toContain('freshPath(path)');
    expect(worker).toContain("cache.put(path, response.clone())");
  });

  it('ships complete social and install metadata on every app entry', () => {
    for (const file of ['index.html', 'demo/index.html', 'new/index.html', 'practice/index.html', 'unlimited/index.html', 'privacy/index.html', 'terms/index.html']) {
      const html = readFileSync(file, 'utf8');
      expect(html, file).toContain('property="og:image"');
      expect(html, file).toContain('name="twitter:card"');
      expect(html, file).toContain('rel="apple-touch-icon"');
      expect(html, file).toContain('rel="canonical"');
    }
    expect(statSync('public/social-card.webp').size).toBeLessThan(300_000);
    expect(statSync('public/icons/apple-touch-icon.png').size).toBeGreaterThan(0);
  });

  it('maps every declared claim to exactly one browser test', () => {
    const claims = JSON.parse(readFileSync('.factory/claims.json', 'utf8')) as Array<{ id: string; test: string }>;
    const browserTests = readFileSync('tests/e2e/app.spec.ts', 'utf8');
    expect(claims.length).toBeGreaterThan(0);
    for (const claim of claims) {
      expect(claim.test).toBe(`npm run test:claims -- --grep @claim:${claim.id}`);
      expect(browserTests.split(`@claim:${claim.id}`).length - 1, claim.id).toBe(1);
    }
  });
});
