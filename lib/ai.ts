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

  const ownBestValue  = bestOwn ? computeCardValue(bestOwn)  : 0;
  const oppBestValue  = bestOpp ? computeCardValue(bestOpp)  : 0;

  // Separate modifiers by whether they help or hurt a target
  const boostActions = actions.filter(a => (a.operator_value ?? 0) > 1);   // ×2 ×5 ×10
  const hurtActions  = actions.filter(a => (a.operator_value ?? 0) < 1);   // ÷2 ÷5 ×(−1)
  const posItems     = items.filter(i  => (i.operator_value  ?? 0) > 0);
  const negItems     = items.filter(i  => (i.operator_value  ?? 0) < 0);

  // 2. Boost actions on own best POSITIVE creature
  if (boostActions.length > 0 && bestOwn && ownBestValue > 0) {
    const best = [...boostActions].sort(
      (a, b) => (b.operator_value ?? 0) - (a.operator_value ?? 0)
    )[0];
    return { cardId: best.id, targetSide: 'opponent', targetCreatureId: bestOwn.card.id };
  }

  // 3. Positive items on own best creature
  if (posItems.length > 0 && bestOwn) {
    return { cardId: posItems[0].id, targetSide: 'opponent', targetCreatureId: bestOwn.card.id };
  }

  // 4. Hurt actions (divide / flip-negative) on opponent's best POSITIVE creature
  if (hurtActions.length > 0 && bestOpp && oppBestValue > 0) {
    return { cardId: hurtActions[0].id, targetSide: 'player', targetCreatureId: bestOpp.card.id };
  }

  // 5. Negative items on opponent's best creature
  if (negItems.length > 0 && bestOpp) {
    return { cardId: negItems[0].id, targetSide: 'player', targetCreatureId: bestOpp.card.id };
  }

  // 6. Events
  if (events.length > 0) {
    const event = events[0];
    const effect = event.effect_type;
    if ((effect === 'zero_out' || effect === 'banish') && bestOpp) {
      return { cardId: event.id, targetSide: 'player', targetCreatureId: bestOpp.card.id };
    }
    if ((effect === 'x100' || effect === 'square') && bestOwn && ownBestValue > 1) {
      return { cardId: event.id, targetSide: 'opponent', targetCreatureId: bestOwn.card.id };
    }
    if (effect === 'reverse' && bestOpp) {
      return { cardId: event.id, targetSide: 'player', targetCreatureId: bestOpp.card.id };
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

  // 7. Fallback
  return { cardId: hand[0].id, targetSide: 'opponent' };
}
