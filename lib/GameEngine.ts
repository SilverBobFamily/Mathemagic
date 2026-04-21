import type { Card, FieldCard, PlayerState, GameState, Side } from './types';

export function computeCardValue(fc: FieldCard): number {
  if (fc.zeroed) return 0;
  let value = fc.card.value ?? 0;
  for (const mod of fc.modifiers) {
    if (mod.card.type === 'item') {
      value += mod.card.operator_value ?? 0;
    } else if (mod.card.type === 'action') {
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
  const hasCreatures = deck.some(c => c.type === 'creature');
  let shuffled = shuffle(deck);
  // Guarantee at least one creature in the opening hand (positions 4–6 after aside)
  if (hasCreatures) {
    while (!shuffled.slice(4, 7).some(c => c.type === 'creature')) {
      shuffled = shuffle(deck);
    }
  }
  return {
    aside: shuffled.slice(0, 4),
    hand: shuffled.slice(4, 7),
    deck: shuffled.slice(7),
    field: [],
    playedCount: 0,
  };
}

export function createGame(playerDeck: Card[], opponentDeck: Card[], learningMode = false): GameState {
  const firstTurn: Side = Math.random() < 0.5 ? 'player' : 'opponent';
  const base: GameState = {
    phase: 'playing',
    turn: firstTurn,
    firstTurn,
    round: 1,
    player: makePlayerState(playerDeck),
    opponent: makePlayerState(opponentDeck),
    winner: null,
    pendingCard: null,
    learningMode,
  };
  return base;
}

export function computeExpectedValue(fc: FieldCard, newModifierCard: Card): number {
  const withMod: FieldCard = {
    ...fc,
    modifiers: [...fc.modifiers, { card: newModifierCard }],
  };
  return computeCardValue(withMod);
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
  // Increment round only when both players have completed a turn
  const newRound = nextTurn === state.firstTurn ? state.round + 1 : state.round;
  return { ...next, turn: nextTurn, round: newRound };
}

// Pass the current turn without playing a card. Counts as using one of the player's 16 turns
// so the game can always progress even when no valid play exists.
export function passTurn(state: GameState): GameState {
  const side = state.turn;
  const ps = state[side];
  const withCount: GameState = {
    ...state,
    [side]: { ...ps, playedCount: ps.playedCount + 1 },
  };
  return endTurn(withCount);
}

export function isGameOver(state: GameState): boolean {
  return state.player.playedCount >= 16 && state.opponent.playedCount >= 16;
}

export function playModifier(
  state: GameState,
  cardId: number,
  targetCreatureId: number,
  targetSide: Side
): GameState {
  const currentSide = state.turn;
  const currentPs = state[currentSide];
  const cardIndex = currentPs.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return state;
  const card = currentPs.hand[cardIndex];
  const newHand = currentPs.hand.filter((_, i) => i !== cardIndex);

  // Build updated player state first (hand removal + playedCount)
  const updatedCurrentPs = { ...currentPs, hand: newHand, playedCount: currentPs.playedCount + 1 };

  // When targeting own side, read field from the already-updated state to avoid spread collision
  const targetPs = currentSide === targetSide ? updatedCurrentPs : state[targetSide];
  const newField = targetPs.field.map(fc =>
    fc.card.id === targetCreatureId
      ? { ...fc, modifiers: [...fc.modifiers, { card }] }
      : fc
  );

  if (currentSide === targetSide) {
    return { ...state, [currentSide]: { ...updatedCurrentPs, field: newField } };
  }
  return {
    ...state,
    [currentSide]: updatedCurrentPs,
    [targetSide]: { ...targetPs, field: newField },
  };
}

export function playEvent(
  state: GameState,
  cardId: number,
  targetCreatureId: number,
  targetSide: Side,
  secondTargetId?: number,
  secondTargetSide?: Side
): GameState {
  const currentPs = state[state.turn];
  const cardIndex = currentPs.hand.findIndex(c => c.id === cardId);
  if (cardIndex === -1) return state;
  const card = currentPs.hand[cardIndex];
  const newHand = currentPs.hand.filter((_, i) => i !== cardIndex);
  let s: GameState = {
    ...state,
    [state.turn]: { ...currentPs, hand: newHand, playedCount: currentPs.playedCount + 1 },
  };

  const effect = card.effect_type;

  if (effect === 'zero_out') {
    const tPs = s[targetSide];
    s = {
      ...s,
      [targetSide]: {
        ...tPs,
        field: tPs.field.map(fc =>
          fc.card.id === targetCreatureId ? { ...fc, zeroed: true } : fc
        ),
      },
    };
  } else if (effect === 'banish') {
    const tPs = s[targetSide];
    s = {
      ...s,
      [targetSide]: {
        ...tPs,
        field: tPs.field.filter(fc => fc.card.id !== targetCreatureId),
      },
    };
  } else if (effect === 'x100') {
    const modCard: Card = { ...card, operator_value: 100 };
    const tPs = s[targetSide];
    s = {
      ...s,
      [targetSide]: {
        ...tPs,
        field: tPs.field.map(fc =>
          fc.card.id === targetCreatureId
            ? { ...fc, modifiers: [...fc.modifiers, { card: modCard }] }
            : fc
        ),
      },
    };
  } else if (effect === 'mirror' && secondTargetId !== undefined && secondTargetSide !== undefined) {
    const srcFc = s[targetSide].field.find(fc => fc.card.id === targetCreatureId);
    if (srcFc) {
      const srcValue = computeCardValue(srcFc);
      const mirrorMod: Card = { ...card, operator_value: srcValue, type: 'item' };
      const tPs = s[secondTargetSide];
      s = {
        ...s,
        [secondTargetSide]: {
          ...tPs,
          field: tPs.field.map(fc =>
            fc.card.id === secondTargetId
              ? { ...fc, modifiers: [...fc.modifiers, { card: mirrorMod }] }
              : fc
          ),
        },
      };
    }
  } else if (effect === 'swap' && secondTargetId !== undefined && secondTargetSide !== undefined) {
    const srcPs = s[targetSide];
    const tgtPs = s[secondTargetSide];
    const srcFc = srcPs.field.find(fc => fc.card.id === targetCreatureId)!;
    const tgtFc = tgtPs.field.find(fc => fc.card.id === secondTargetId)!;
    if (srcFc && tgtFc) {
      if (targetSide === secondTargetSide) {
        // Both creatures on the same side — update in a single pass to avoid spread collision
        s = {
          ...s,
          [targetSide]: {
            ...srcPs,
            field: srcPs.field.map(fc => {
              if (fc.card.id === targetCreatureId) return tgtFc;
              if (fc.card.id === secondTargetId) return srcFc;
              return fc;
            }),
          },
        };
      } else {
        s = {
          ...s,
          [targetSide]: {
            ...srcPs,
            field: srcPs.field.map(fc => fc.card.id === targetCreatureId ? tgtFc : fc),
          },
          [secondTargetSide]: {
            ...tgtPs,
            field: tgtPs.field.map(fc => fc.card.id === secondTargetId ? srcFc : fc),
          },
        };
      }
    }
  } else if (effect === 'reverse') {
    // Reverse the sign of the single targeted creature (×−1 modifier)
    const reverseModCard: Card = { ...card, operator_value: -1, type: 'action' };
    const tPs = s[targetSide];
    s = {
      ...s,
      [targetSide]: {
        ...tPs,
        field: tPs.field.map(fc =>
          fc.card.id === targetCreatureId
            ? { ...fc, modifiers: [...fc.modifiers, { card: reverseModCard }] }
            : fc
        ),
      },
    };
  }

  return s;
}

export function getWinner(state: GameState): Side | 'tie' {
  const p = computeScore(state.player.field);
  const o = computeScore(state.opponent.field);
  if (p > o) return 'player';
  if (o > p) return 'opponent';
  return 'tie';
}
