import type { Card, FieldCard, PlayerState, GameState, GameOptions, Side } from './types';
import { DEFAULT_OPTIONS } from './options';

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
  if (fc.squared) value = value * value;
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

function makePlayerState(
  deck: Card[],
  opts: Pick<GameOptions, 'handSize' | 'setAsideCount' | 'guaranteedEvent'>
): PlayerState {
  const { handSize, setAsideCount, guaranteedEvent } = opts;
  const hasCreatures = deck.some(c => c.type === 'creature');
  const hasEvents = deck.some(c => c.type === 'event');

  let shuffled = shuffle(deck);
  // Guarantee at least one creature in the opening hand
  if (hasCreatures) {
    while (!shuffled.slice(setAsideCount, setAsideCount + handSize).some(c => c.type === 'creature')) {
      shuffled = shuffle(deck);
    }
  }
  // Guarantee event card is not buried in the aside — swap it into the deck portion
  if (guaranteedEvent && hasEvents) {
    const eventInAsideIdx = shuffled.slice(0, setAsideCount).findIndex(c => c.type === 'event');
    if (eventInAsideIdx !== -1) {
      const deckStart = setAsideCount + handSize;
      const swapInDeck = shuffled.slice(deckStart).findIndex(c => c.type !== 'event');
      if (swapInDeck !== -1) {
        const abs = deckStart + swapInDeck;
        [shuffled[eventInAsideIdx], shuffled[abs]] = [shuffled[abs], shuffled[eventInAsideIdx]];
      }
    }
  }

  return {
    aside: shuffled.slice(0, setAsideCount),
    hand: shuffled.slice(setAsideCount, setAsideCount + handSize),
    deck: shuffled.slice(setAsideCount + handSize),
    field: [],
    playedCount: 0,
  };
}

export function createGame(
  playerDeck: Card[],
  opponentDeck: Card[],
  learningMode = false,
  options: GameOptions = DEFAULT_OPTIONS,
  firstPlayerOverride?: Side
): GameState {
  const firstTurn: Side = firstPlayerOverride
    ?? (options.firstPlayer === 'player' ? 'player'
      : options.firstPlayer === 'opponent' ? 'opponent'
      : Math.random() < 0.5 ? 'player' : 'opponent');

  return {
    phase: 'playing',
    turn: firstTurn,
    firstTurn,
    round: 1,
    player: makePlayerState(playerDeck, options),
    opponent: makePlayerState(opponentDeck, options),
    winner: null,
    pendingCard: null,
    learningMode,
    options,
  };
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
  const newRound = nextTurn === state.firstTurn ? state.round + 1 : state.round;
  if (state.phase === 'sudden_death') {
    return { ...state, turn: nextTurn, round: newRound };
  }
  // Neither player draws on the first turn — the second player starts with their initial hand only
  const shouldDraw = !(state.round === 1 && nextTurn !== state.firstTurn);
  const next = shouldDraw ? drawCard(state, nextTurn) : state;
  return { ...next, turn: nextTurn, round: newRound };
}

// Pass the current turn without playing a card. Counts as using one of the player's turns
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
  if (state.phase === 'sudden_death') {
    return state.player.hand.length === 0 && state.opponent.hand.length === 0;
  }
  return state.player.playedCount >= state.options.maxPlays && state.opponent.playedCount >= state.options.maxPlays;
}

export function shouldEnterSuddenDeath(state: GameState): boolean {
  if (state.phase !== 'playing') return false;
  if (!isGameOver(state)) return false;
  const p = computeScore(state.player.field);
  const o = computeScore(state.opponent.field);
  if (p !== o) return false;
  return state.player.aside.length > 0 || state.opponent.aside.length > 0;
}

export function enterSuddenDeath(state: GameState): GameState {
  return {
    ...state,
    phase: 'sudden_death',
    player: { ...state.player, hand: [...state.player.aside], aside: [], deck: [] },
    opponent: { ...state.opponent, hand: [...state.opponent.aside], aside: [], deck: [] },
  };
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
  } else if (effect === 'square') {
    const tPs = s[targetSide];
    s = {
      ...s,
      [targetSide]: {
        ...tPs,
        field: tPs.field.map(fc =>
          fc.card.id === targetCreatureId ? { ...fc, squared: true } : fc
        ),
      },
    };
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
  } else if (effect === 'reset') {
    // Restore targeted creature to its base value (clear all modifiers, zeroed, squared)
    const tPs = s[targetSide];
    s = {
      ...s,
      [targetSide]: {
        ...tPs,
        field: tPs.field.map(fc =>
          fc.card.id === targetCreatureId
            ? { ...fc, modifiers: [], zeroed: false, squared: false }
            : fc
        ),
      },
    };
  } else if (effect === 'multi_zero') {
    // Zero out ALL creatures on the target side
    const tPs = s[targetSide];
    s = {
      ...s,
      [targetSide]: {
        ...tPs,
        field: tPs.field.map(fc => ({ ...fc, zeroed: true })),
      },
    };
  } else if (effect === 'reverse_all') {
    // Flip signs of ALL creatures on the target side
    const revMod: Card = { ...card, operator_value: -1, type: 'action' };
    const tPs = s[targetSide];
    s = {
      ...s,
      [targetSide]: {
        ...tPs,
        field: tPs.field.map(fc => ({ ...fc, modifiers: [...fc.modifiers, { card: revMod }] })),
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
