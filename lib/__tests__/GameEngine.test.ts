import { computeCardValue, computeScore } from '../GameEngine';
import type { FieldCard, Card } from '../types';

const makeCreature = (value: number): Card => ({
  id: 1, release_id: 1, name: 'Test', type: 'creature',
  value, operator: null, operator_value: null,
  effect_type: null, art_emoji: '⚡', art_url: null,
  flavor_text: '', effect_text: null,
});

const makeModCard = (operator_value: number, type: 'item' | 'action'): Card => ({
  id: 2, release_id: 1, name: 'Mod', type,
  value: null, operator: '+1', operator_value,
  effect_type: null, art_emoji: '🔨', art_url: null,
  flavor_text: '', effect_text: null,
});

describe('computeCardValue', () => {
  it('returns base value when no modifiers', () => {
    const fc: FieldCard = { card: makeCreature(5), modifiers: [], zeroed: false };
    expect(computeCardValue(fc)).toBe(5);
  });

  it('applies item addition', () => {
    const fc: FieldCard = {
      card: makeCreature(4),
      modifiers: [{ card: makeModCard(3, 'item') }],
      zeroed: false,
    };
    expect(computeCardValue(fc)).toBe(7);
  });

  it('applies item first, then action', () => {
    const fc: FieldCard = {
      card: makeCreature(4),
      modifiers: [
        { card: makeModCard(3, 'item') },   // 4 + 3 = 7
        { card: makeModCard(2, 'action') }, // 7 × 2 = 14
      ],
      zeroed: false,
    };
    expect(computeCardValue(fc)).toBe(14);
  });

  it('returns 0 when zeroed', () => {
    const fc: FieldCard = { card: makeCreature(8), modifiers: [], zeroed: true };
    expect(computeCardValue(fc)).toBe(0);
  });

  it('handles negative multiplier (flip)', () => {
    const fc: FieldCard = {
      card: makeCreature(5),
      modifiers: [{ card: makeModCard(-1, 'action') }],
      zeroed: false,
    };
    expect(computeCardValue(fc)).toBe(-5);
  });

  it('handles negative base value with item', () => {
    const fc: FieldCard = {
      card: makeCreature(-3),
      modifiers: [{ card: makeModCard(3, 'item') }],
      zeroed: false,
    };
    expect(computeCardValue(fc)).toBe(0);
  });

  it('handles x100 event modifier', () => {
    const eventCard: Card = {
      id: 3, release_id: 1, name: 'Mount Olympus', type: 'event',
      value: null, operator: null, operator_value: 100,
      effect_type: 'x100', art_emoji: '🏔️', art_url: null,
      flavor_text: '', effect_text: null,
    };
    const fc: FieldCard = {
      card: makeCreature(3),
      modifiers: [{ card: eventCard }],
      zeroed: false,
    };
    expect(computeCardValue(fc)).toBe(300);
  });
});

describe('computeScore', () => {
  it('sums all field card values', () => {
    const cards: FieldCard[] = [
      { card: makeCreature(5), modifiers: [], zeroed: false },
      { card: makeCreature(3), modifiers: [], zeroed: false },
    ];
    expect(computeScore(cards)).toBe(8);
  });

  it('includes modified values in sum', () => {
    const cards: FieldCard[] = [
      { card: makeCreature(4), modifiers: [{ card: makeModCard(2, 'action') }], zeroed: false },
      { card: makeCreature(3), modifiers: [], zeroed: false },
    ];
    expect(computeScore(cards)).toBe(11); // 4×2 + 3
  });
});

import { createGame, drawCard, endTurn, playCreature, isGameOver } from '../GameEngine';
import type { Card } from '../types';

const makeDeck = (size: number): Card[] =>
  Array.from({ length: size }, (_, i) => ({
    id: 100 + i,
    release_id: 1,
    name: `Card${i}`,
    type: 'creature' as const,
    value: (i % 11) - 5,
    operator: null,
    operator_value: null,
    effect_type: null,
    art_emoji: '⚡',
    art_url: null,
    flavor_text: '',
    effect_text: null,
  }));

describe('createGame', () => {
  it('deals 3 cards to each hand', () => {
    const state = createGame(makeDeck(20), makeDeck(20));
    expect(state.player.hand).toHaveLength(3);
    expect(state.opponent.hand).toHaveLength(3);
  });

  it('sets aside 4 cards, leaving 13 in deck', () => {
    const state = createGame(makeDeck(20), makeDeck(20));
    expect(state.player.aside).toHaveLength(4);
    expect(state.player.deck).toHaveLength(13);
  });

  it('starts on player turn, round 1, phase playing', () => {
    const state = createGame(makeDeck(20), makeDeck(20));
    expect(state.turn).toBe('player');
    expect(state.round).toBe(1);
    expect(state.phase).toBe('playing');
  });
});

describe('playCreature', () => {
  it('moves card from player hand to player field', () => {
    let state = createGame(makeDeck(20), makeDeck(20));
    const cardId = state.player.hand[0].id;
    state = playCreature(state, cardId, 'player');
    expect(state.player.field).toHaveLength(1);
    expect(state.player.field[0].card.id).toBe(cardId);
    expect(state.player.hand).toHaveLength(2);
    expect(state.player.playedCount).toBe(1);
  });

  it('can play a creature on the opponent side', () => {
    let state = createGame(makeDeck(20), makeDeck(20));
    const cardId = state.player.hand[0].id;
    state = playCreature(state, cardId, 'opponent');
    expect(state.opponent.field).toHaveLength(1);
    expect(state.player.hand).toHaveLength(2);
  });
});

describe('endTurn', () => {
  it('switches turn from player to opponent', () => {
    const state = createGame(makeDeck(20), makeDeck(20));
    expect(endTurn(state).turn).toBe('opponent');
  });

  it('draws a card for the next player', () => {
    const state = createGame(makeDeck(20), makeDeck(20));
    const before = state.opponent.hand.length;
    const next = endTurn(state);
    expect(next.opponent.hand).toHaveLength(before + 1);
  });

  it('increments round', () => {
    const state = createGame(makeDeck(20), makeDeck(20));
    expect(endTurn(state).round).toBe(2);
  });
});

describe('isGameOver', () => {
  it('returns false while cards remain', () => {
    expect(isGameOver(createGame(makeDeck(20), makeDeck(20)))).toBe(false);
  });

  it('returns true when both players have played 16 cards', () => {
    const state = createGame(makeDeck(20), makeDeck(20));
    const over = {
      ...state,
      player: { ...state.player, playedCount: 16 },
      opponent: { ...state.opponent, playedCount: 16 },
    };
    expect(isGameOver(over)).toBe(true);
  });
});
