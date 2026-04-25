import type { GameOptions } from './types';

export const DEFAULT_OPTIONS: GameOptions = {
  handSize: 4,
  guaranteedEvent: true,
  maxPlays: 16,
  eventCount: 1,
  firstPlayer: 'coinFlip',
  setAsideCount: 4,
  aiDifficulty: 'medium',
};

const KEY = 'gameOptions';

export function getGameOptions(): GameOptions {
  if (typeof window === 'undefined') return { ...DEFAULT_OPTIONS };
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return { ...DEFAULT_OPTIONS };
    return { ...DEFAULT_OPTIONS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULT_OPTIONS };
  }
}

export function setGameOptions(options: GameOptions): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(options));
}
