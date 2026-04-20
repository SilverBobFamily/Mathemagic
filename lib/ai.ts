import type { GameState, Card, Side } from './types';
import { computeCardValue } from './GameEngine';

export interface AiMove {
  cardId: number;
  targetSide: Side;
  targetCreatureId?: number;
  secondTargetId?: number;
  secondTargetSide?: Side;
}

export function chooseAiMove(state: GameState): AiMove | null {
  const hand = state.opponent.hand;
  if (hand.length === 0) return null;

  const creatures = hand.filter(c => c.type === 'creature');
  const actions = hand.filter(c => c.type === 'action');
  const items = hand.filter(c => c.type === 'item');
  const events = hand.filter(c => c.type === 'event');

  // 1. Play creatures first
  if (creatures.length > 0) {
    const sorted = [...creatures].sort(
      (a, b) => Math.abs(b.value ?? 0) - Math.abs(a.value ?? 0)
    );
    const card = sorted[0];
    const targetSide: Side = (card.value ?? 0) < 0 ? 'player' : 'opponent';
    return { cardId: card.id, targetSide };
  }

  const ownField = state.opponent.field;
  const oppField = state.player.field;

  const bestOwn = ownField.length > 0
    ? [...ownField].sort((a, b) => computeCardValue(b) - computeCardValue(a))[0]
    : null;
  const bestOpp = oppField.length > 0
    ? [...oppField].sort((a, b) => computeCardValue(b) - computeCardValue(a))[0]
    : null;

  // 2. Actions on own best creature
  if (actions.length > 0 && bestOwn) {
    return {
      cardId: actions[0].id,
      targetSide: 'opponent',
      targetCreatureId: bestOwn.card.id,
    };
  }

  // 3. Positive items on own best creature
  const posItems = items.filter(i => (i.operator_value ?? 0) > 0);
  if (posItems.length > 0 && bestOwn) {
    return {
      cardId: posItems[0].id,
      targetSide: 'opponent',
      targetCreatureId: bestOwn.card.id,
    };
  }

  // 4. Negative items on opponent's best creature
  const negItems = items.filter(i => (i.operator_value ?? 0) < 0);
  if (negItems.length > 0 && bestOpp) {
    return {
      cardId: negItems[0].id,
      targetSide: 'player',
      targetCreatureId: bestOpp.card.id,
    };
  }

  // 5. Events
  if (events.length > 0) {
    const event = events[0];
    const effect = event.effect_type;
    if ((effect === 'zero_out' || effect === 'banish') && bestOpp) {
      return { cardId: event.id, targetSide: 'player', targetCreatureId: bestOpp.card.id };
    }
    if (effect === 'x100' && bestOwn) {
      return { cardId: event.id, targetSide: 'opponent', targetCreatureId: bestOwn.card.id };
    }
    if (effect === 'reverse') {
      return { cardId: event.id, targetSide: 'player', targetCreatureId: oppField[0]?.card.id };
    }
    if (effect === 'mirror' && bestOwn && bestOpp) {
      return {
        cardId: event.id,
        targetSide: 'opponent',
        targetCreatureId: bestOwn.card.id,
        secondTargetId: bestOpp.card.id,
        secondTargetSide: 'player',
      };
    }
    if (effect === 'swap' && ownField.length > 0 && oppField.length > 0) {
      const worstOwn = [...ownField].sort(
        (a, b) => computeCardValue(a) - computeCardValue(b)
      )[0];
      return {
        cardId: event.id,
        targetSide: 'opponent',
        targetCreatureId: worstOwn.card.id,
        secondTargetId: bestOpp!.card.id,
        secondTargetSide: 'player',
      };
    }
  }

  // 6. Fallback
  return { cardId: hand[0].id, targetSide: 'opponent' };
}
