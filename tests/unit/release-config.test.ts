import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('release configuration', () => {
  it('ships hardening, immutable assets, and a styled 404 override', () => {
    const config = JSON.parse(readFileSync('public/staticwebapp.config.json', 'utf8')) as {
      globalHeaders: Record<string, string>;
      routes: Array<{ route: string; headers?: Record<string, string> }>;
      responseOverrides: Record<string, { rewrite: string; statusCode: number }>;
    };
    expect(config.globalHeaders['Content-Security-Policy']).toContain("default-src 'self'");
    expect(config.globalHeaders['Permissions-Policy']).toContain('camera=()');
    expect(config.globalHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(config.routes.find((route) => route.route === '/assets/*')?.headers?.['Cache-Control']).toContain('immutable');
    expect(config.routes.find((route) => route.route === '/manifest.webmanifest')?.headers?.['Content-Type']).toBe('application/manifest+json');
    expect(config.responseOverrides['404']).toEqual({ rewrite: '/404.html', statusCode: 404 });
  });

  it('versions PWA caches and precaches both demo entry routes', () => {
    const worker = readFileSync('public/sw.js', 'utf8');
    expect(worker).toContain('subtitle-ladder-shell-${buildId}');
    expect(worker).toContain('/?demo=1');
    expect(worker).toContain('freshPath(path)');
    expect(worker).toContain("cache.put(path, response.clone())");
  });
});
