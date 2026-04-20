import { chooseAiMove } from '../ai';
import { createGame, playCreature } from '../GameEngine';
import type { Card, GameState } from '../types';

const makeCard = (id: number, value: number): Card => ({
  id, release_id: 1, name: `C${id}`, type: 'creature',
  value, operator: null, operator_value: null,
  effect_type: null, art_emoji: '⚡', art_url: null,
  flavor_text: '', effect_text: null,
});

const makeDeck = (size: number): Card[] =>
  Array.from({ length: size }, (_, i) => makeCard(i, (i % 11) - 5));

describe('chooseAiMove', () => {
  it('returns a move when opponent has cards', () => {
    const state = createGame(makeDeck(20), makeDeck(20));
    const oppState = { ...state, turn: 'opponent' as const };
    const move = chooseAiMove(oppState);
    expect(move).not.toBeNull();
    expect(move!.cardId).toBeDefined();
    expect(['player', 'opponent']).toContain(move!.targetSide);
  });

  it('plays negative creature on player side', () => {
    const negCard = makeCard(1, -5);
    const base = createGame(makeDeck(20), makeDeck(20));
    const state: GameState = {
      ...base,
      turn: 'opponent',
      opponent: { ...base.opponent, hand: [negCard] },
    };
    const move = chooseAiMove(state)!;
    expect(move.cardId).toBe(negCard.id);
    expect(move.targetSide).toBe('player');
  });

  it('plays positive creature on own side', () => {
    const posCard = makeCard(2, 8);
    const base = createGame(makeDeck(20), makeDeck(20));
    const state: GameState = {
      ...base,
      turn: 'opponent',
      opponent: { ...base.opponent, hand: [posCard] },
    };
    const move = chooseAiMove(state)!;
    expect(move.cardId).toBe(posCard.id);
    expect(move.targetSide).toBe('opponent');
  });

  it('returns null when hand is empty', () => {
    const base = createGame(makeDeck(20), makeDeck(20));
    const state: GameState = {
      ...base,
      turn: 'opponent',
      opponent: { ...base.opponent, hand: [] },
    };
    expect(chooseAiMove(state)).toBeNull();
  });
});
