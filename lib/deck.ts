import type { Card } from './types';

const DECK_COUNTS = { creature: 10, item: 5, action: 4, event: 1 } as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildBalancedDecks(pool: Card[]): { playerDeck: Card[]; opponentDeck: Card[] } {
  const byType = {
    creature: shuffle(pool.filter(c => c.type === 'creature')),
    item: shuffle(pool.filter(c => c.type === 'item')),
    action: shuffle(pool.filter(c => c.type === 'action')),
    event: shuffle(pool.filter(c => c.type === 'event')),
  };

  for (const [type, count] of Object.entries(DECK_COUNTS) as [keyof typeof DECK_COUNTS, number][]) {
    if (byType[type].length < count * 2) {
      throw new Error(`Not enough ${type} cards: need ${count * 2}, have ${byType[type].length}. Select more releases.`);
    }
  }

  return {
    playerDeck: [
      ...byType.creature.slice(0, 10),
      ...byType.item.slice(0, 5),
      ...byType.action.slice(0, 4),
      ...byType.event.slice(0, 1),
    ],
    opponentDeck: [
      ...byType.creature.slice(10, 20),
      ...byType.item.slice(5, 10),
      ...byType.action.slice(4, 8),
      ...byType.event.slice(1, 2),
    ],
  };
}
