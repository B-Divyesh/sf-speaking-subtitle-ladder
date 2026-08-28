const SLUG = 'speaking-subtitle-ladder';
const LICENSE_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const BILLING_BASE = import.meta.env.VITE_BILLING_BASE || 'https://api.sociobot.in';

type Verdict = { valid: boolean; checkedAt: number; reason?: string; expires_at?: string | null };

export function captureLicenseFromUrl(): boolean {
  const url = new URL(location.href);
  const token = url.searchParams.get('license');
  if (!token) return false;
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return true;
}

export function cachedUnlock(): boolean {
  if (!localStorage.getItem(LICENSE_KEY)) return false;
  try {
    const verdict = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as Verdict | null;
    return verdict?.valid === true;
  } catch {
    return false;
  }
}

export function hasLicense(): boolean {
  return Boolean(localStorage.getItem(LICENSE_KEY));
}

export function saveLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export async function verifyLicense(force = false): Promise<Verdict | null> {
  const token = localStorage.getItem(LICENSE_KEY);
  if (!token) return null;
  try {
    const cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || 'null') as Verdict | null;
    if (!force && cached && Date.now() - cached.checkedAt < 86_400_000) return cached;
  } catch { /* re-check malformed cache */ }

  const response = await fetch(`${BILLING_BASE}/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
  if (!response.ok) throw new Error('License verification is temporarily unavailable.');
  const result = await response.json() as { valid: boolean; reason?: string; expires_at?: string | null };
  const verdict = { ...result, checkedAt: Date.now() };
  localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
  return verdict;
}

export const checkoutUrl = `${BILLING_BASE}/api/v1/products/${SLUG}/checkout`;
