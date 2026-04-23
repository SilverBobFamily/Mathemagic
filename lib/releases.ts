const STORAGE_KEY = 'activeReleases';

export function getActiveReleaseIds(): number[] | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(x => typeof x === 'number')) return parsed;
  } catch {}
  return null;
}

export function setActiveReleaseIds(ids: number[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}
