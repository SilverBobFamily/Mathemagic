// components/GameBoard.tsx
'use client';
import { useState, useCallback } from 'react';
import type { GameState, Card, FieldCard as FieldCardType, Side } from '@/lib/types';
import { computeScore, playCreature, playModifier, playEvent, endTurn, isGameOver, getWinner } from '@/lib/GameEngine';
import FieldCardComponent from './FieldCard';
import CardModal from './CardModal';

interface Props {
  state: GameState;
  onStateChange: (s: GameState) => void;
  mode: 'ai' | 'pass-and-play';
}

export default function GameBoard({ state, onStateChange, mode }: Props) {
  const [modalData, setModalData] = useState<{ fieldCard?: FieldCardType; handCard?: Card } | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [firstEventTarget, setFirstEventTarget] = useState<{ creatureId: number; side: Side } | null>(null);

  const playerScore = computeScore(state.player.field);
  const opponentScore = computeScore(state.opponent.field);
  const gameOver = isGameOver(state);
  const winner = gameOver ? getWinner(state) : null;
  const isMyTurn = state.turn === 'player';

  const handleHandCardClick = useCallback((card: Card) => {
    if (!isMyTurn) {
      setModalData({ handCard: card });
      return;
    }
    if (selectedCard?.id === card.id) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
      setFirstEventTarget(null);
    }
  }, [isMyTurn, selectedCard]);

  const handleFieldCardClick = useCallback((fc: FieldCardType, side: Side) => {
    if (!selectedCard) {
      setModalData({ fieldCard: fc });
      return;
    }

    if (selectedCard.type === 'item' || selectedCard.type === 'action') {
      onStateChange(playModifier(state, selectedCard.id, fc.card.id, side));
      setSelectedCard(null);
      return;
    }

    if (selectedCard.type === 'event') {
      const effect = selectedCard.effect_type;
      // Two-target events
      if (effect === 'swap' || effect === 'mirror') {
        if (!firstEventTarget) {
          setFirstEventTarget({ creatureId: fc.card.id, side });
          return;
        }
        onStateChange(playEvent(
          state, selectedCard.id,
          firstEventTarget.creatureId, firstEventTarget.side,
          fc.card.id, side
        ));
        setSelectedCard(null);
        setFirstEventTarget(null);
        return;
      }
      // Single-target events
      onStateChange(playEvent(state, selectedCard.id, fc.card.id, side));
      setSelectedCard(null);
      return;
    }
  }, [selectedCard, firstEventTarget, state, onStateChange]);

  const handleDropZoneClick = useCallback((side: Side) => {
    if (!selectedCard || selectedCard.type !== 'creature') return;
    onStateChange(playCreature(state, selectedCard.id, side));
    setSelectedCard(null);
  }, [selectedCard, state, onStateChange]);

  const handleEndTurn = useCallback(() => {
    setSelectedCard(null);
    setFirstEventTarget(null);
    onStateChange(endTurn(state));
  }, [state, onStateChange]);

  const isCreatureSelected = selectedCard?.type === 'creature';
  const isModifierSelected = selectedCard && (selectedCard.type === 'item' || selectedCard.type === 'action' || selectedCard.type === 'event');

  const instructionText = !selectedCard ? null
    : isCreatureSelected ? 'Click a zone to place creature'
    : selectedCard.type === 'event' && (selectedCard.effect_type === 'swap' || selectedCard.effect_type === 'mirror') && !firstEventTarget ? 'Click first target creature'
    : selectedCard.type === 'event' && (selectedCard.effect_type === 'swap' || selectedCard.effect_type === 'mirror') && firstEventTarget ? 'Click second target creature'
    : 'Click a creature to apply';

  return (
    <div style={{ background: '#0a0a1a', borderRadius: 12, overflow: 'hidden', border: '2px solid #333', fontFamily: 'sans-serif', fontSize: '0.9em', color: '#eee' }}>

      {/* Opponent zone */}
      <div style={{ background: '#1a0a0a', padding: '12px 16px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: '#ef9a9a', fontWeight: 700, fontSize: '1.1em' }}>⚔ Opponent</span>
          <span style={{ color: '#ef9a9a' }}>Score: <strong style={{ fontSize: '1.4em' }}>{opponentScore}</strong> · Cards left: {state.opponent.deck.length}</span>
        </div>
        <div
          onClick={() => handleDropZoneClick('opponent')}
          style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', minHeight: 80,
            padding: 8, borderRadius: 8,
            border: isCreatureSelected ? '2px dashed #ffd54f' : '2px solid transparent',
            cursor: isCreatureSelected ? 'pointer' : 'default',
          }}
        >
          {state.opponent.field.map(fc => (
            <FieldCardComponent
              key={fc.card.id}
              fieldCard={fc}
              onClick={() => handleFieldCardClick(fc, 'opponent')}
              highlighted={!!isModifierSelected || (selectedCard?.effect_type === 'swap' || selectedCard?.effect_type === 'mirror') ? false : false}
            />
          ))}
          {state.opponent.field.length === 0 && isCreatureSelected && (
            <span style={{ color: '#555', alignSelf: 'center', marginLeft: 8 }}>Drop here</span>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div style={{ background: '#111', padding: '6px 16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85em' }}>
        <span style={{ color: '#555' }}>Round {state.round} · {isMyTurn ? 'Your turn' : "Opponent's turn"}</span>
        {gameOver ? (
          <span style={{ color: winner === 'player' ? '#a5d6a7' : winner === 'opponent' ? '#ef9a9a' : '#ffd54f', fontWeight: 700 }}>
            {winner === 'player' ? '🎉 You win!' : winner === 'opponent' ? '💀 Opponent wins' : '🤝 Tie!'}
          </span>
        ) : instructionText ? (
          <span style={{ color: '#ffd54f', fontWeight: 600 }}>{instructionText}</span>
        ) : null}
        {!gameOver && isMyTurn && !selectedCard && (
          <button
            onClick={handleEndTurn}
            style={{ background: '#1a3a1a', color: '#a5d6a7', border: '1px solid #2e7d32', borderRadius: 6, padding: '3px 12px', cursor: 'pointer' }}
          >
            End Turn →
          </button>
        )}
        {selectedCard && isMyTurn && (
          <button
            onClick={() => { setSelectedCard(null); setFirstEventTarget(null); }}
            style={{ background: '#2a1a1a', color: '#ef9a9a', border: '1px solid #7f0000', borderRadius: 6, padding: '3px 12px', cursor: 'pointer' }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Player zone */}
      <div style={{ background: '#0a1a0a', padding: '12px 16px', borderBottom: '1px solid #333' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: '#a5d6a7', fontWeight: 700, fontSize: '1.1em' }}>🧑 You</span>
          <span style={{ color: '#a5d6a7' }}>Score: <strong style={{ fontSize: '1.4em' }}>{playerScore}</strong> · Cards left: {state.player.deck.length}</span>
        </div>
        <div
          onClick={() => handleDropZoneClick('player')}
          style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', minHeight: 80,
            padding: 8, borderRadius: 8,
            border: isCreatureSelected ? '2px dashed #ffd54f' : '2px solid transparent',
            cursor: isCreatureSelected ? 'pointer' : 'default',
          }}
        >
          {state.player.field.map(fc => (
            <FieldCardComponent
              key={fc.card.id}
              fieldCard={fc}
              onClick={() => handleFieldCardClick(fc, 'player')}
            />
          ))}
          {state.player.field.length === 0 && isCreatureSelected && (
            <span style={{ color: '#555', alignSelf: 'center', marginLeft: 8 }}>Drop here</span>
          )}
        </div>
      </div>

      {/* Hand */}
      <div style={{ background: '#0a0a14', padding: '12px 16px' }}>
        <div style={{ color: '#555', fontSize: '0.75em', marginBottom: 10, letterSpacing: 1 }}>
          {isMyTurn ? 'YOUR HAND — Select a card to play' : "OPPONENT'S TURN"}
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {state.player.hand.map(card => {
            const typeColors: Record<string, string> = {
              creature: '#1a237e', item: '#1b5e20', action: '#4a148c', event: '#7f0000',
            };
            const isSelected = selectedCard?.id === card.id;
            return (
              <div
                key={card.id}
                onClick={() => handleHandCardClick(card)}
                style={{
                  width: 100, borderRadius: 8, overflow: 'hidden',
                  border: `3px solid ${isSelected ? '#fff' : '#ffd54f'}`,
                  background: typeColors[card.type] ?? '#1a237e',
                  textAlign: 'center', cursor: 'pointer',
                  boxShadow: isSelected ? '0 0 18px rgba(255,255,255,0.5)' : '0 0 12px rgba(255,213,79,0.4)',
                  opacity: isMyTurn ? 1 : 0.5,
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; }}
              >
                <div style={{ padding: '3px 6px', fontSize: '0.8em', color: '#fff', fontWeight: 700, display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 65 }}>{card.name}</span>
                  <span>{card.value ?? card.operator ?? 'EVT'}</span>
                </div>
                <div style={{ fontSize: '2.4em', padding: '6px 0' }}>{card.art_emoji}</div>
                <div style={{ fontSize: '0.7em', padding: 3, letterSpacing: 1, background: 'rgba(0,0,0,0.3)', color: '#ccc', textTransform: 'uppercase' }}>{card.type}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modalData && (
        <CardModal
          fieldCard={modalData.fieldCard}
          handCard={modalData.handCard}
          releaseNumber={modalData.fieldCard?.card.release?.number ?? modalData.handCard?.release?.number}
          onClose={() => setModalData(null)}
        />
      )}
    </div>
  );
}
