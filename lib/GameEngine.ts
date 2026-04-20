import type { Card, FieldCard, PlayerState, GameState, Side } from './types';

export function computeCardValue(fc: FieldCard): number {
  if (fc.zeroed) return 0;

  let value = fc.card.value ?? 0;

  // Items add/subtract (applied first)
  for (const mod of fc.modifiers) {
    if (mod.card.type === 'item') {
      value += mod.card.operator_value ?? 0;
    }
  }

  // Actions multiply, events with operator_value act as multipliers
  for (const mod of fc.modifiers) {
    if (mod.card.type === 'action') {
      value *= mod.card.operator_value ?? 1;
    } else if (mod.card.type === 'event' && mod.card.operator_value !== null) {
      value *= mod.card.operator_value;
    }
  }

  return value;
}

export function computeScore(field: FieldCard[]): number {
  return field.reduce((sum, fc) => sum + computeCardValue(fc), 0);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makePlayerState(deck: Card[]): PlayerState {
  const shuffled = shuffle(deck);
  return {
    aside: shuffled.slice(0, 4),
    hand: shuffled.slice(4, 7),
    deck: shuffled.slice(7),
    field: [],
    playedCount: 0,
  };
}

export function createGame(playerDeck: Card[], opponentDeck: Card[]): GameState {
  return {
    phase: 'playing',
    turn: 'player',
    round: 1,
    player: makePlayerState(playerDeck),
    opponent: makePlayerState(opponentDeck),
    winner: null,
    pendingCard: null,
  };
}

export function drawCard(state: GameState, side: Side): GameState {
  const ps = state[side];
  if (ps.deck.length === 0) return state;
  const [drawn, ...rest] = ps.deck;
  return {
    ...state,
    [side]: { ...ps, hand: [...ps.hand, drawn], deck: rest },
  };
}

export function playCreature(state: GameState, cardId: number, targetSide: Side): GameState {
  const activeSide = state.turn;
  const ps = state[activeSide];
  const cardIndex = ps.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return state;
  const card = ps.hand[cardIndex];
  const newHand = ps.hand.filter((_, i) => i !== cardIndex);
  const newFieldCard: FieldCard = { card, modifiers: [], zeroed: false };

  if (activeSide === targetSide) {
    return {
      ...state,
      [activeSide]: {
        ...ps,
        hand: newHand,
        playedCount: ps.playedCount + 1,
        field: [...ps.field, newFieldCard],
      },
    };
  }

  const targetPs = state[targetSide];
  return {
    ...state,
    [activeSide]: { ...ps, hand: newHand, playedCount: ps.playedCount + 1 },
    [targetSide]: { ...targetPs, field: [...targetPs.field, newFieldCard] },
  };
}

export function endTurn(state: GameState): GameState {
  const nextTurn: Side = state.turn === 'player' ? 'opponent' : 'player';
  const next = drawCard(state, nextTurn);
  return { ...next, turn: nextTurn, round: state.round + 1 };
}

export function isGameOver(state: GameState): boolean {
  return state.player.playedCount >= 16 && state.opponent.playedCount >= 16;
}
