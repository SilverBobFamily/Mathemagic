'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import type { GameState, Card, FieldCard as FieldCardType, Side } from '@/lib/types';
import { computeScore, computeCardValue, playCreature, playModifier, playEvent, endTurn, passTurn, isGameOver, getWinner } from '@/lib/GameEngine';
import FieldCardComponent from './FieldCard';
import CardModal from './CardModal';
import LearningModePrompt from './LearningModePrompt';
import GameOverScreen from './GameOverScreen';
import EventAnnouncement from './EventAnnouncement';
import HandoffScreen from './HandoffScreen';
import { useWindowWidth } from '@/hooks/useWindowWidth';

interface Props {
  state: GameState;
  onStateChange: (s: GameState) => void;
  mode: 'ai' | 'pass-and-play';
  onNewGame: () => void;
  // For AI-played events: game page passes the announcement here
  aiEventAnnouncement?: { card: Card; playedBy: 'opponent' } | null;
  onAiEventDismissed?: () => void;
}

interface ModifierFlash {
  creatureId: number;
  card: Card;
  oldValue: number;
  newValue: number;
}

export default function GameBoard({ state, onStateChange, mode, onNewGame, aiEventAnnouncement, onAiEventDismissed }: Props) {
  const [modalData, setModalData] = useState<{ fieldCard?: FieldCardType; handCard?: Card } | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [firstEventTarget, setFirstEventTarget] = useState<{ creatureId: number; side: Side } | null>(null);
  const [learningCheck, setLearningCheck] = useState<{
    fieldCard: FieldCardType;
    modifierCard: Card;
    onConfirm: () => void;
  } | null>(null);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [eventAnnouncement, setEventAnnouncement] = useState<{ card: Card; applyFn: () => void } | null>(null);
  const [modifierFlash, setModifierFlash] = useState<ModifierFlash | null>(null);
  const modFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draggedCardRef = useRef<Card | null>(null);
  const dropJustFired = useRef(false);

  const windowWidth = useWindowWidth();
  const sizeTier: 'sm' | 'md' | 'lg' = windowWidth >= 1100 ? 'lg' : windowWidth >= 700 ? 'md' : 'sm';
  const handCardWidth = windowWidth >= 1100 ? 160 : windowWidth >= 700 ? 110 : 85;

  const prevTurnRef = useRef<Side>(state.turn);
  const [showHandoff, setShowHandoff] = useState(false);

  useEffect(() => {
    if (mode !== 'pass-and-play') return;
    if (prevTurnRef.current !== state.turn) {
      prevTurnRef.current = state.turn;
      setShowHandoff(true);
    }
  }, [state.turn, mode]);

  const activeSide: Side = mode === 'pass-and-play' ? state.turn : 'player';
  const isMyTurn = mode === 'pass-and-play' ? true : state.turn === 'player';

  const playerScore = computeScore(state.player.field);
  const opponentScore = computeScore(state.opponent.field);
  const gameOver = isGameOver(state);
  const winner = gameOver ? getWinner(state) : null;

  const clearSelection = useCallback(() => {
    setSelectedCard(null);
    setFirstEventTarget(null);
    setModalData(null);
    setLearningCheck(null);
  }, []);

  const playAndEndTurn = useCallback((newState: GameState) => {
    clearSelection();
    onStateChange(endTurn(newState));
  }, [onStateChange, clearSelection]);

  // Play a modifier with flash animation
  const playModifierWithFlash = useCallback((
    currentState: GameState,
    cardId: number,
    creatureId: number,
    side: Side
  ) => {
    const targetFc = currentState[side].field.find(fc => fc.card.id === creatureId);
    const modCard = currentState[currentState.turn].hand.find(c => c.id === cardId);
    const oldValue = targetFc ? computeCardValue(targetFc) : 0;
    const newState = playModifier(currentState, cardId, creatureId, side);
    const newTargetFc = newState[side].field.find(fc => fc.card.id === creatureId);
    const newValue = newTargetFc ? computeCardValue(newTargetFc) : 0;

    if (modCard && targetFc) {
      if (modFlashTimer.current) clearTimeout(modFlashTimer.current);
      setModifierFlash({ creatureId, card: modCard, oldValue, newValue });
      modFlashTimer.current = setTimeout(() => setModifierFlash(null), 1700);
    }
    clearSelection();
    onStateChange(endTurn(newState));
  }, [onStateChange, clearSelection]);

  const handleHandCardClick = useCallback((card: Card) => {
    if (gameOver) return;
    setModalData({ handCard: card });
  }, [gameOver]);

  const handlePlayFromModal = useCallback((card: Card) => {
    setModalData(null);
    setSelectedCard(card);
    setFirstEventTarget(null);
  }, []);

  const handleDragStart = useCallback((card: Card) => {
    draggedCardRef.current = card;
    setDraggedCard(card);
    setSelectedCard(card);
  }, []);

  const handleDragEnd = useCallback(() => {
    draggedCardRef.current = null;
    setDraggedCard(null);
  }, []);

  const handleDropOnZone = useCallback((side: Side) => {
    const card = draggedCardRef.current ?? selectedCard;
    if (!card || card.type !== 'creature') return;
    dropJustFired.current = true;
    requestAnimationFrame(() => { dropJustFired.current = false; });
    draggedCardRef.current = null;
    setDraggedCard(null);
    playAndEndTurn(playCreature(state, card.id, side));
  }, [selectedCard, state, playAndEndTurn]);

  const handleFieldZoneClick = useCallback((side: Side) => {
    if (dropJustFired.current) return;
    if (gameOver || !selectedCard || selectedCard.type !== 'creature') return;
    playAndEndTurn(playCreature(state, selectedCard.id, side));
  }, [gameOver, selectedCard, state, playAndEndTurn]);

  const handleFieldCardClick = useCallback((fc: FieldCardType, side: Side) => {
    if (gameOver) {
      setModalData({ fieldCard: fc });
      return;
    }
    if (selectedCard && !isMyTurn) {
      setSelectedCard(null);
      setFirstEventTarget(null);
      setModalData({ fieldCard: fc });
      return;
    }
    if (!selectedCard) {
      setModalData({ fieldCard: fc });
      return;
    }

    if (selectedCard.type === 'item' || selectedCard.type === 'action') {
      const doPlay = () => playModifierWithFlash(state, selectedCard.id, fc.card.id, side);
      if (state.learningMode) {
        setModalData(null);
        setLearningCheck({ fieldCard: fc, modifierCard: selectedCard, onConfirm: doPlay });
        return;
      }
      doPlay();
      return;
    }

    if (selectedCard.type === 'event') {
      const effect = selectedCard.effect_type;
      if (effect === 'swap' || effect === 'mirror') {
        if (!firstEventTarget) {
          setFirstEventTarget({ creatureId: fc.card.id, side });
          return;
        }
        const doPlay = () => {
          const newState = playEvent(state, selectedCard.id, firstEventTarget.creatureId, firstEventTarget.side, fc.card.id, side);
          setEventAnnouncement({ card: selectedCard, applyFn: () => playAndEndTurn(newState) });
          clearSelection();
        };
        if (state.learningMode && effect === 'mirror') {
          setLearningCheck({ fieldCard: fc, modifierCard: selectedCard, onConfirm: doPlay });
          return;
        }
        doPlay();
        return;
      }
      const doPlay = () => {
        const newState = playEvent(state, selectedCard.id, fc.card.id, side);
        setEventAnnouncement({ card: selectedCard, applyFn: () => playAndEndTurn(newState) });
        clearSelection();
      };
      if (state.learningMode && (effect === 'x100' || effect === 'reverse' || effect === 'square')) {
        const currentVal = state[side].field.find(f => f.card.id === fc.card.id);
        const baseForLearning = currentVal ? computeCardValue(currentVal) : 0;
        const syntheticMod: Card = {
          ...selectedCard,
          operator_value: effect === 'x100' ? 100 : effect === 'square' ? baseForLearning : -1,
          type: 'action',
        };
        setLearningCheck({ fieldCard: fc, modifierCard: syntheticMod, onConfirm: doPlay });
        return;
      }
      doPlay();
      return;
    }
  }, [gameOver, isMyTurn, selectedCard, firstEventTarget, state, playAndEndTurn, playModifierWithFlash, clearSelection]);

  const handleDropOnFieldCard = useCallback((fc: FieldCardType, side: Side) => {
    const card = draggedCardRef.current;
    if (!card) return;
    dropJustFired.current = true;
    requestAnimationFrame(() => { dropJustFired.current = false; });
    draggedCardRef.current = null;
    setDraggedCard(null);
    setSelectedCard(null);

    if (card.type === 'item' || card.type === 'action') {
      const doPlay = () => playModifierWithFlash(state, card.id, fc.card.id, side);
      if (state.learningMode) {
        setLearningCheck({ fieldCard: fc, modifierCard: card, onConfirm: doPlay });
      } else {
        doPlay();
      }
    } else if (card.type === 'event') {
      setSelectedCard(card);
    }
  }, [state, playModifierWithFlash]);

  const isCreatureSelected = selectedCard?.type === 'creature';
  const isTargeting = !!selectedCard && selectedCard.type !== 'creature';

  const instructionText = !selectedCard ? null
    : isCreatureSelected ? 'Click a zone to place creature'
    : selectedCard.type === 'event' && (selectedCard.effect_type === 'swap' || selectedCard.effect_type === 'mirror') && !firstEventTarget ? 'Click first target creature'
    : selectedCard.type === 'event' && firstEventTarget ? 'Click second target creature'
    : 'Click a creature to apply';

  const zoneStyle = (side: Side) => ({
    display: 'flex' as const,
    gap: 12,
    flexWrap: sizeTier === 'sm' ? 'nowrap' as const : 'wrap' as const,
    overflowX: sizeTier === 'sm' ? 'auto' as const : 'visible' as const,
    minHeight: sizeTier === 'lg' ? 120 : 90,
    padding: 10,
    borderRadius: 8,
    border: isCreatureSelected ? '2px dashed #ffd54f' : '2px solid transparent',
    cursor: isCreatureSelected ? 'pointer' : 'default',
  });

  const showEventModal = eventAnnouncement || (aiEventAnnouncement ?? null);
  const eventCard = eventAnnouncement?.card ?? aiEventAnnouncement?.card ?? null;
  const eventPlayedBy = eventAnnouncement ? 'player' : 'opponent';
  const dismissEvent = () => {
    if (eventAnnouncement) {
      const fn = eventAnnouncement.applyFn;
      setEventAnnouncement(null);
      fn();
    } else {
      onAiEventDismissed?.();
    }
  };

  return (
    <div style={{ background: '#0a0a1a', borderRadius: 12, overflow: 'hidden', border: '2px solid #333', fontFamily: "'Crimson Text', serif", fontSize: sizeTier === 'lg' ? '1.05em' : '0.95em', color: '#eee' }}>

      {/* Opponent zone */}
      <div style={{ background: '#1a0a0a', padding: '14px 18px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: '#ef9a9a', fontWeight: 700, fontSize: '1.1em', fontFamily: "'Cinzel', serif" }}>{mode === 'pass-and-play' ? '👥 Player 2' : '⚔ Opponent'}</span>
          <span style={{ color: '#ef9a9a' }}>Score: <strong style={{ fontSize: '1.4em' }}>{opponentScore}</strong> · Cards left: {state.opponent.deck.length}</span>
        </div>
        <div
          onClick={() => handleFieldZoneClick('opponent')}
          onDragOver={e => { if (isCreatureSelected || draggedCard?.type === 'creature') e.preventDefault(); }}
          onDrop={() => handleDropOnZone('opponent')}
          style={zoneStyle('opponent')}
        >
          {state.opponent.field.map(fc => (
            <div
              key={fc.card.id}
              onDragOver={e => { if (isTargeting || (draggedCard && draggedCard.type !== 'creature')) e.preventDefault(); }}
              onDrop={() => handleDropOnFieldCard(fc, 'opponent')}
            >
              <FieldCardComponent
                fieldCard={fc}
                onClick={() => handleFieldCardClick(fc, 'opponent')}
                highlighted={isTargeting || !!firstEventTarget}
                size={sizeTier}
                flashModifier={modifierFlash?.creatureId === fc.card.id ? modifierFlash : null}
              />
            </div>
          ))}
          {state.opponent.field.length === 0 && isCreatureSelected && (
            <span style={{ color: '#555', alignSelf: 'center', marginLeft: 8 }}>Drop creature here</span>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div style={{ background: '#111', padding: '7px 18px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85em', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ color: '#555' }}>Round {state.round} · {isMyTurn ? 'Your turn' : "Opponent's turn"}</span>
        {!gameOver && instructionText && (
          <span style={{ color: '#ffd54f', fontWeight: 600 }}>{instructionText}</span>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
          {selectedCard && isMyTurn && (
            <button
              onClick={() => { setSelectedCard(null); setFirstEventTarget(null); }}
              style={{ background: '#2a1a1a', color: '#ef9a9a', border: '1px solid #7f0000', borderRadius: 6, padding: '3px 12px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
          {isMyTurn && !gameOver && (
            <button
              onClick={() => {
                setSelectedCard(null);
                setFirstEventTarget(null);
                onStateChange(passTurn(state));
              }}
              style={{ background: '#1a1a1a', color: '#888', border: '1px solid #444', borderRadius: 6, padding: '3px 12px', cursor: 'pointer', fontSize: '0.8em' }}
            >
              Pass →
            </button>
          )}
        </div>
      </div>

      {/* Player zone */}
      <div style={{ background: '#0a1a0a', padding: '14px 18px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: '#a5d6a7', fontWeight: 700, fontSize: '1.1em', fontFamily: "'Cinzel', serif" }}>{mode === 'pass-and-play' ? '👥 Player 1' : '🧑 You'}</span>
          <span style={{ color: '#a5d6a7' }}>Score: <strong style={{ fontSize: '1.4em' }}>{playerScore}</strong> · Cards left: {state.player.deck.length}</span>
        </div>
        <div
          onClick={() => handleFieldZoneClick('player')}
          onDragOver={e => { if (isCreatureSelected || draggedCard?.type === 'creature') e.preventDefault(); }}
          onDrop={() => handleDropOnZone('player')}
          style={zoneStyle('player')}
        >
          {state.player.field.map(fc => (
            <div
              key={fc.card.id}
              onDragOver={e => { if (isTargeting || (draggedCard && draggedCard.type !== 'creature')) e.preventDefault(); }}
              onDrop={() => handleDropOnFieldCard(fc, 'player')}
            >
              <FieldCardComponent
                fieldCard={fc}
                onClick={() => handleFieldCardClick(fc, 'player')}
                highlighted={isTargeting || !!firstEventTarget}
                size={sizeTier}
                flashModifier={modifierFlash?.creatureId === fc.card.id ? modifierFlash : null}
              />
            </div>
          ))}
          {state.player.field.length === 0 && isCreatureSelected && (
            <span style={{ color: '#555', alignSelf: 'center', marginLeft: 8 }}>Drop creature here</span>
          )}
        </div>
      </div>

      {/* Hand */}
      <div style={{ background: '#0a0a14', padding: '14px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: '#555', fontSize: '0.75em', letterSpacing: 1 }}>
            {mode === 'pass-and-play'
              ? `${activeSide === 'player' ? 'PLAYER 1' : 'PLAYER 2'}'S HAND — Click to view · Drag to play`
              : isMyTurn ? 'YOUR HAND — Click to view · Drag to play' : "OPPONENT'S TURN"}
          </span>
          <button
            onClick={() => onStateChange({ ...state, learningMode: !state.learningMode })}
            style={{
              background: state.learningMode ? '#1a3a1a' : 'transparent',
              color: state.learningMode ? '#a5d6a7' : '#555',
              border: `1px solid ${state.learningMode ? '#2e7d32' : '#444'}`,
              borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontSize: '0.75em',
              fontFamily: 'sans-serif',
            }}
          >
            🧮 Learning Mode {state.learningMode ? 'ON' : 'OFF'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {state[activeSide].hand.map(card => {
            const typeColors: Record<string, string> = {
              creature: '#1a237e', item: '#1b5e20', action: '#4a148c', event: '#7f0000',
            };
            const isSelected = selectedCard?.id === card.id;
            return (
              <div
                key={card.id}
                draggable={isMyTurn}
                onDragStart={() => handleDragStart(card)}
                onDragEnd={handleDragEnd}
                onClick={() => handleHandCardClick(card)}
                style={{
                  width: handCardWidth, borderRadius: 8, overflow: 'hidden',
                  border: `3px solid ${isSelected ? '#fff' : '#ffd54f'}`,
                  background: typeColors[card.type] ?? '#1a237e',
                  textAlign: 'center', cursor: isMyTurn ? 'grab' : 'pointer',
                  boxShadow: isSelected ? '0 0 18px rgba(255,255,255,0.5)' : '0 0 12px rgba(255,213,79,0.4)',
                  opacity: 1,
                  transition: 'transform 0.1s',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
              >
                <div style={{ padding: '3px 6px', fontSize: '0.8em', color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', fontFamily: "'Cinzel', serif" }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: handCardWidth - 30 }}>{card.name}</span>
                  <span>{card.value ?? (card.operator ?? '').replace('÷', '/') ?? 'EVT'}</span>
                </div>
                <div style={{ height: sizeTier === 'lg' ? 80 : 56, overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {card.art_url
                    ? <img src={card.art_url} alt={card.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <span style={{ fontSize: sizeTier === 'lg' ? '3.6em' : '2.4em' }}>{card.art_emoji}</span>}
                </div>
                <div style={{ fontSize: '0.7em', padding: 3, letterSpacing: 1, background: 'rgba(0,0,0,0.3)', color: '#ccc', textTransform: 'uppercase' }}>{card.type}</div>
              </div>
            );
          })}
        </div>
      </div>

      {modalData && (
        <CardModal
          fieldCard={modalData.fieldCard}
          handCard={modalData.handCard}
          releaseNumber={modalData.fieldCard?.card.release?.number ?? modalData.handCard?.release?.number}
          onClose={() => setModalData(null)}
          onPlay={modalData.handCard && isMyTurn ? () => handlePlayFromModal(modalData.handCard!) : undefined}
        />
      )}

      {learningCheck && (
        <LearningModePrompt
          fieldCard={learningCheck.fieldCard}
          modifierCard={learningCheck.modifierCard}
          onCorrect={learningCheck.onConfirm}
          onDismiss={() => setLearningCheck(null)}
        />
      )}

      {gameOver && winner && (
        <GameOverScreen
          winner={winner}
          playerScore={playerScore}
          opponentScore={opponentScore}
          onNewGame={onNewGame}
        />
      )}

      {showEventModal && eventCard && (
        <EventAnnouncement
          card={eventCard}
          playedBy={eventPlayedBy as 'player' | 'opponent'}
          onDismiss={dismissEvent}
        />
      )}

      {showHandoff && mode === 'pass-and-play' && !gameOver && (
        <HandoffScreen
          playerName={state.turn === 'player' ? 'Player 1' : 'Player 2'}
          onReady={() => setShowHandoff(false)}
        />
      )}
    </div>
  );
}
