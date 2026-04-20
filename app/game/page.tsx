'use client';
import { useEffect, useState, useCallback } from 'react';
import { fetchAllCards } from '@/lib/supabase';
import { createGame, endTurn, isGameOver, playCreature, playModifier, playEvent } from '@/lib/GameEngine';
import { chooseAiMove } from '@/lib/ai';
import GameBoard from '@/components/GameBoard';
import type { Card, GameState } from '@/lib/types';

type Mode = 'ai' | 'pass-and-play';

export default function GamePage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [state, setState] = useState<GameState | null>(null);
  const [mode, setMode] = useState<Mode>('ai');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllCards().then(c => { setCards(c); setLoading(false); });
  }, []);

  const startGame = useCallback((m: Mode) => {
    if (cards.length < 40) return;
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    const playerDeck = shuffled.slice(0, 20);
    const opponentDeck = shuffled.slice(20, 40);
    setMode(m);
    setState(createGame(playerDeck, opponentDeck));
  }, [cards]);

  // AI auto-play
  useEffect(() => {
    if (!state || mode !== 'ai' || state.turn !== 'opponent' || isGameOver(state)) return;
    const timer = setTimeout(() => {
      const move = chooseAiMove(state);
      if (!move) { setState(s => s && endTurn(s)); return; }
      const card = state.opponent.hand.find(c => c.id === move.cardId);
      if (!card) { setState(s => s && endTurn(s)); return; }
      let next = state;
      if (card.type === 'creature') {
        next = playCreature(state, move.cardId, move.targetSide);
      } else if (card.type === 'item' || card.type === 'action') {
        if (move.targetCreatureId !== undefined) {
          next = playModifier(state, move.cardId, move.targetCreatureId, move.targetSide);
        }
      } else if (card.type === 'event' && move.targetCreatureId !== undefined) {
        next = playEvent(
          state, move.cardId,
          move.targetCreatureId, move.targetSide,
          (move as any).secondTargetId, (move as any).secondTargetSide
        );
      }
      setState(endTurn(next));
    }, 900);
    return () => clearTimeout(timer);
  }, [state, mode]);

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
        Loading cards...
      </div>
    );
  }

  if (!state) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <h1 style={{ color: '#fff', fontSize: '2em', margin: 0 }}>Choose Game Mode</h1>
        <div style={{ display: 'flex', gap: 16 }}>
          <button
            onClick={() => startGame('ai')}
            style={{ background: '#1a237e', color: '#fff', border: '2px solid #5c6bc0', borderRadius: 10, padding: '14px 32px', fontSize: '1.1em', cursor: 'pointer' }}
          >
            ⚔ vs AI
          </button>
          <button
            onClick={() => startGame('pass-and-play')}
            style={{ background: '#1b5e20', color: '#fff', border: '2px solid #81c784', borderRadius: 10, padding: '14px 32px', fontSize: '1.1em', cursor: 'pointer' }}
          >
            👥 Pass & Play
          </button>
        </div>
        <button
          onClick={() => setState(null)}
          style={{ background: 'none', color: '#555', border: 'none', cursor: 'pointer', fontSize: '0.9em', marginTop: 8 }}
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#555', fontSize: '0.85em' }}>
          Mode: {mode === 'ai' ? '⚔ vs AI' : '👥 Pass & Play'}
        </span>
        <button
          onClick={() => setState(null)}
          style={{ background: '#111', color: '#888', border: '1px solid #333', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontSize: '0.85em' }}
        >
          ← New Game
        </button>
      </div>
      <GameBoard state={state} onStateChange={setState} mode={mode} />
    </div>
  );
}
