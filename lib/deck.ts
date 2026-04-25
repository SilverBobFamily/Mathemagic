import type { Card } from './types';

const BASE_COUNTS = { creature: 10, item: 5, action: 4 } as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildBalancedDecks(
  pool: Card[],
  options: { eventCount: number } = { eventCount: 1 }
): { playerDeck: Card[]; opponentDeck: Card[] } {
  const { eventCount } = options;

  const byType = {
    creature: shuffle(pool.filter(c => c.type === 'creature')),
    item: shuffle(pool.filter(c => c.type === 'item')),
    action: shuffle(pool.filter(c => c.type === 'action')),
    event: shuffle(pool.filter(c => c.type === 'event')),
  };

  for (const [type, count] of Object.entries(BASE_COUNTS) as [keyof typeof BASE_COUNTS, number][]) {
    if (byType[type].length < count * 2) {
      throw new Error(`Not enough ${type} cards: need ${count * 2}, have ${byType[type].length}. Select more releases.`);
    }
  }
  if (eventCount > 0 && byType.event.length < eventCount * 2) {
    throw new Error(`Not enough event cards: need ${eventCount * 2}, have ${byType.event.length}. Select more releases.`);
  }

  return {
    playerDeck: [
      ...byType.creature.slice(0, 10),
      ...byType.item.slice(0, 5),
      ...byType.action.slice(0, 4),
      ...byType.event.slice(0, eventCount),
    ],
    opponentDeck: [
      ...byType.creature.slice(10, 20),
      ...byType.item.slice(5, 10),
      ...byType.action.slice(4, 8),
      ...byType.event.slice(eventCount, eventCount * 2),
    ],
  };
}
