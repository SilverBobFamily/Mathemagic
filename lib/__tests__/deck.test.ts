import { buildBalancedDecks } from '../deck';
import type { Card } from '../types';

let nextId = 1;
beforeEach(() => { nextId = 1; });

function makeCard(type: Card['type']): Card {
  return {
    id: nextId++, release_id: 1, name: `${type}-${nextId}`, type,
    value: type === 'creature' ? 5 : null,
    operator: type === 'item' || type === 'action' ? '+1' : null,
    operator_value: type === 'item' || type === 'action' ? 1 : null,
    effect_type: type === 'event' ? 'zero_out' : null,
    art_emoji: '⚡', art_url: null, flavor_text: '', effect_text: null,
  };
}

function makePool(creatures: number, items: number, actions: number, events: number): Card[] {
  return [
    ...Array.from({ length: creatures }, () => makeCard('creature')),
    ...Array.from({ length: items }, () => makeCard('item')),
    ...Array.from({ length: actions }, () => makeCard('action')),
    ...Array.from({ length: events }, () => makeCard('event')),
  ];
}

describe('buildBalancedDecks', () => {
  it('returns two decks each with 10 creatures, 5 items, 4 actions, 1 event', () => {
    const pool = makePool(28, 16, 12, 4);
    const { playerDeck, opponentDeck } = buildBalancedDecks(pool);

    expect(playerDeck.filter(c => c.type === 'creature')).toHaveLength(10);
    expect(playerDeck.filter(c => c.type === 'item')).toHaveLength(5);
    expect(playerDeck.filter(c => c.type === 'action')).toHaveLength(4);
    expect(playerDeck.filter(c => c.type === 'event')).toHaveLength(1);

    expect(opponentDeck.filter(c => c.type === 'creature')).toHaveLength(10);
    expect(opponentDeck.filter(c => c.type === 'item')).toHaveLength(5);
    expect(opponentDeck.filter(c => c.type === 'action')).toHaveLength(4);
    expect(opponentDeck.filter(c => c.type === 'event')).toHaveLength(1);
  });

  it('gives each player entirely distinct cards', () => {
    const pool = makePool(28, 16, 12, 4);
    const { playerDeck, opponentDeck } = buildBalancedDecks(pool);
    const playerIds = new Set(playerDeck.map(c => c.id));
    const shared = opponentDeck.filter(c => playerIds.has(c.id));
    expect(shared).toHaveLength(0);
  });

  it('throws when not enough creatures (1 release = 14, need 20)', () => {
    const pool = makePool(14, 16, 12, 4);
    expect(() => buildBalancedDecks(pool)).toThrow('Not enough creature cards');
  });

  it('throws when not enough items', () => {
    const pool = makePool(28, 8, 12, 4);
    expect(() => buildBalancedDecks(pool)).toThrow('Not enough item cards');
  });

  it('throws when not enough actions', () => {
    const pool = makePool(28, 16, 6, 4);
    expect(() => buildBalancedDecks(pool)).toThrow('Not enough action cards');
  });

  it('throws when not enough events', () => {
    const pool = makePool(28, 16, 12, 1);
    expect(() => buildBalancedDecks(pool)).toThrow('Not enough event cards');
  });
});
