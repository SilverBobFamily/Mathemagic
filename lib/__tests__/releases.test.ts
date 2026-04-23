import { getActiveReleaseIds, setActiveReleaseIds } from '../releases';

describe('getActiveReleaseIds', () => {
  beforeEach(() => localStorage.clear());

  it('returns null when nothing is stored', () => {
    expect(getActiveReleaseIds()).toBeNull();
  });

  it('returns stored ids after setActiveReleaseIds', () => {
    setActiveReleaseIds([1, 3, 7]);
    expect(getActiveReleaseIds()).toEqual([1, 3, 7]);
  });

  it('returns null when storage contains invalid JSON', () => {
    localStorage.setItem('activeReleases', 'not-json');
    expect(getActiveReleaseIds()).toBeNull();
  });

  it('returns null when storage contains a non-array', () => {
    localStorage.setItem('activeReleases', JSON.stringify({ ids: [1, 2] }));
    expect(getActiveReleaseIds()).toBeNull();
  });
});
