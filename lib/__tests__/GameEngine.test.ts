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
